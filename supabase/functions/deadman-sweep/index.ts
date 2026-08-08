/**
 * deadman-sweep — o motor do produto. Roda a cada 5 minutos via pg_cron.
 *
 * Escada de escalonamento (deliberadamente lenta no começo):
 *   grace   -> só o usuário é cutucado. Ninguém externo sabe de nada.
 *   warning -> push agressivo + SMS para o próprio usuário. Card amarelo no B2B.
 *   alert   -> abre incidente, gera token e libera o Dossiê aos contatos.
 *
 * O falso positivo é o maior risco deste produto: acionar a família de alguém
 * que só ficou sem sinal destrói a confiança de forma irreversível. Por isso
 * existem dois degraus antes de qualquer terceiro ser notificado.
 */
import { admin, assertServiceRole, json, HttpError } from '../_shared/supabaseAdmin.ts';
import { sendEmail, sendPush, sendSms } from '../_shared/notify.ts';
import { dossierEmailHtml, dossierSmsText } from '../_shared/templates/dossierEmail.ts';

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://sentinela.app';

Deno.serve(async (req) => {
  try {
    assertServiceRole(req);
    const db = admin();

    // Reivindica em lote com FOR UPDATE SKIP LOCKED — duas execuções
    // simultâneas do cron não processam a mesma sessão.
    const { data: claimed, error } = await db.rpc('claim_overdue_sessions', { p_limit: 200 });
    if (error) throw new HttpError(500, error.message);

    const results = { grace: 0, warning: 0, alert: 0, failed: 0 };

    for (const row of claimed ?? []) {
      try {
        switch (row.new_state) {
          case 'grace':
            await handleGrace(db, row);
            results.grace++;
            break;
          case 'warning':
            await handleWarning(db, row);
            results.warning++;
            break;
          case 'alert':
            await handleAlert(db, row);
            results.alert++;
            break;
        }
      } catch (e) {
        // Uma sessão que falha não pode derrubar o lote inteiro.
        console.error(`[sweep] sessão ${row.session_id} falhou:`, e);
        results.failed++;
      }
    }

    console.log('[sweep]', JSON.stringify(results));
    return json({ ok: true, processed: claimed?.length ?? 0, ...results });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    console.error('[sweep] erro fatal:', e);
    return json({ ok: false, error: String(e) }, status);
  }
});

// ---------------------------------------------------------------- GRACE
async function handleGrace(db: ReturnType<typeof admin>, row: Row) {
  const { data: p } = await db
    .from('profiles')
    .select('push_token, full_name')
    .eq('id', row.user_id)
    .single();

  if (!p?.push_token) return;

  await sendPush(
    p.push_token,
    'Tudo bem por aí?',
    'Passou do horário do seu check-in. Toque para confirmar que está tudo certo.',
    { type: 'grace', session_id: row.session_id },
  );
}

// -------------------------------------------------------------- WARNING
async function handleWarning(db: ReturnType<typeof admin>, row: Row) {
  const { data: p } = await db
    .from('profiles')
    .select('push_token, phone, full_name')
    .eq('id', row.user_id)
    .single();

  if (p?.push_token) {
    await sendPush(
      p.push_token,
      'Precisamos de um sinal seu',
      'Se você não confirmar em algumas horas, vamos avisar seus contatos de emergência.',
      { type: 'warning', session_id: row.session_id },
      true,
    );
  }

  // SMS para o PRÓPRIO usuário: funciona onde o push não chega
  // (sem internet, mas com sinal de celular). Último degrau antes de escalar.
  if (p?.phone) {
    await sendSms(
      p.phone,
      'Sentinela: nao recebemos sinal seu. Abra o app e confirme que esta tudo bem, ou avisaremos seus contatos de emergencia em breve.',
    );
  }
}

// ---------------------------------------------------------------- ALERT
async function handleAlert(db: ReturnType<typeof admin>, row: Row) {
  const { data: session } = await db
    .from('travel_sessions')
    .select('id, title, last_signal_at, checkin_interval')
    .eq('id', row.session_id)
    .single();

  const { data: traveler } = await db
    .from('profiles')
    .select('full_name')
    .eq('id', row.user_id)
    .single();

  const reason =
    `O último sinal de vida foi registrado em ` +
    `${fmtDate(session?.last_signal_at)}, e o combinado era um check-in a cada ` +
    `${session?.checkin_interval ?? 'período definido'}.`;

  const { data: alertId, error: alertErr } = await db.rpc('open_alert', {
    p_session_id: row.session_id,
    p_level: 'alert',
    p_reason: reason,
  });
  if (alertErr) throw new Error(`open_alert: ${alertErr.message}`);

  const { data: lastLoc } = await db
    .from('location_logs')
    .select('city, country_code, recorded_at')
    .eq('user_id', row.user_id)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Nome do país, não a sigla. O rótulo era `[city, country_code].join(', ')`,
  // e quando o ping mais recente vinha sem cidade — área rural, e foi o caso
  // real de um ping em Pai, na Tailândia — a mensagem que chegava ao contato
  // dizia "Ultima posicao: TH".
  //
  // Isso vai por WhatsApp para alguém que acabou de descobrir que um parente
  // sumiu. "TH" não é um lugar: não dá para pesquisar, repetir ao telefone,
  // nem passar para quem vai socorrer.
  let paisLabel = lastLoc?.country_code ?? null;
  if (lastLoc?.country_code) {
    const { data: pais } = await db
      .from('country_emergency_numbers')
      .select('country_name')
      .eq('country_code', lastLoc.country_code)
      .maybeSingle();
    if (pais?.country_name) paisLabel = pais.country_name;
  }

  const lastSeenLabel = lastLoc
    ? [lastLoc.city, paisLabel].filter(Boolean).join(', ') || 'Posição registrada'
    : 'Nenhuma localização registrada';

  const { data: contacts } = await db
    .from('emergency_contacts')
    .select('id, full_name, email, phone, preferred_channel, is_verified')
    .eq('user_id', row.user_id)
    .order('priority', { ascending: true });

  for (const c of contacts ?? []) {
    // Contato não verificado nunca recebe dossiê: o risco de mandar dado
    // médico para um número digitado errado é maior que o de não avisar.
    if (!c.is_verified) {
      console.warn(`[sweep] contato ${c.id} não verificado, ignorado`);
      continue;
    }

    const { data: token, error: tokErr } = await db.rpc('issue_dossier_token', {
      p_alert_id: alertId,
      p_contact_id: c.id,
      p_ttl: '7 days',
    });
    if (tokErr) {
      console.error(`[sweep] token para contato ${c.id}:`, tokErr.message);
      continue;
    }

    const payload = {
      contactName: c.full_name,
      travelerName: traveler?.full_name ?? 'Seu contato',
      reason,
      lastSeenLabel,
      lastSeenAt: fmtDate(lastLoc?.recorded_at),
      dossierUrl: `${SITE_URL}/d/${token}`,
      isSos: false,
    };

    const channels = new Set<string>([c.preferred_channel]);
    // Em alerta real, redundância vale mais que elegância: e-mail sempre sai.
    if (c.email) channels.add('email');

    for (const ch of channels) {
      let res;
      if (ch === 'email' && c.email) {
        res = await sendEmail(
          c.email,
          `[Sentinela] ${payload.travelerName} não deu sinal de vida`,
          dossierEmailHtml(payload),
        );
      } else if ((ch === 'sms' || ch === 'whatsapp') && c.phone) {
        res = await sendSms(c.phone, dossierSmsText(payload), ch as 'sms' | 'whatsapp');
      } else {
        continue;
      }

      await db.from('alert_notifications').insert({
        alert_id: alertId,
        contact_id: c.id,
        channel: ch,
        status: res.ok ? 'sent' : 'failed',
        provider_ref: res.ref,
        error: res.error,
        sent_at: res.ok ? new Date().toISOString() : null,
      });
    }
  }
}

type Row = {
  session_id: string;
  user_id: string;
  org_id: string | null;
  new_state: 'grace' | 'warning' | 'alert';
  escalation_step: number;
};

function fmtDate(iso?: string | null): string {
  if (!iso) return 'data desconhecida';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
}
