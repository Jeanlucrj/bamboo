/**
 * trigger-sos — botão de pânico. Pula toda a escada de escalonamento.
 *
 * Diferenças em relação ao alerta automático:
 *   · não há grace period nem confirmação;
 *   · TODOS os contatos são acionados em todos os canais disponíveis,
 *     inclusive os não verificados (numa emergência declarada pela própria
 *     pessoa, o risco de não avisar supera o de avisar o número errado);
 *   · o app entra em tracking de 30 em 30 segundos.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { admin, json } from '../_shared/supabaseAdmin.ts';
import { handlePreflight, corsHeaders } from '../_shared/cors.ts';
import { sendEmail, sendSms } from '../_shared/notify.ts';
import { dossierEmailHtml, dossierSmsText } from '../_shared/templates/dossierEmail.ts';

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://sentinela.app';

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  const cors = corsHeaders(req.headers.get('Origin'));

  try {
    // Esta função é chamada pelo APP com o JWT do usuário, não pelo cron.
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ ok: false, error: 'unauthenticated' }, 401, cors);

    const body = await req.json().catch(() => ({}));
    const { session_id, lat, lng, accuracy_m, note } = body as {
      session_id: string;
      lat?: number;
      lng?: number;
      accuracy_m?: number;
      note?: string;
    };
    if (!session_id) return json({ ok: false, error: 'session_id obrigatório' }, 400, cors);

    const db = admin();

    // A sessão precisa ser mesmo do usuário autenticado.
    const { data: session } = await db
      .from('travel_sessions')
      .select('id, user_id, org_id')
      .eq('id', session_id)
      .single();
    if (!session || session.user_id !== user.id) {
      return json({ ok: false, error: 'forbidden' }, 403, cors);
    }

    // 1. Grava a posição do momento do acionamento, se veio junto.
    if (typeof lat === 'number' && typeof lng === 'number') {
      await db.rpc('ingest_location_batch', {
        p_pings: [
          {
            session_id,
            client_ping_id: crypto.randomUUID(),
            lat,
            lng,
            accuracy_m: accuracy_m ?? null,
            recorded_at: new Date().toISOString(),
          },
        ],
      });
    }

    // 2. Estado terminal: só o próprio usuário (ou gestor) tira daqui.
    await db.from('travel_sessions').update({ state: 'sos' }).eq('id', session_id);

    await db.from('signals').insert({
      user_id: user.id,
      session_id,
      kind: 'sos',
      source: 'app',
      metadata: { note: note ?? null },
    });

    // 3. Incidente + dossiês.
    const reason = note
      ? `Botão de emergência acionado. Mensagem deixada: "${note}"`
      : 'Botão de emergência acionado manualmente no aplicativo.';

    const { data: alertId, error: alertErr } = await db.rpc('open_alert', {
      p_session_id: session_id,
      p_level: 'sos',
      p_reason: reason,
    });
    if (alertErr) throw new Error(alertErr.message);

    const [{ data: traveler }, { data: lastLoc }, { data: contacts }] = await Promise.all([
      db.from('profiles').select('full_name').eq('id', user.id).single(),
      db.from('location_logs').select('city, country_code, recorded_at')
        .eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('emergency_contacts').select('id, full_name, email, phone, preferred_channel')
        .eq('user_id', user.id).order('priority', { ascending: true }),
    ]);

    const lastSeenLabel = lastLoc
      ? [lastLoc.city, lastLoc.country_code].filter(Boolean).join(', ') || 'Posição registrada'
      : 'Nenhuma localização registrada';

    let notified = 0;
    for (const c of contacts ?? []) {
      const { data: token } = await db.rpc('issue_dossier_token', {
        p_alert_id: alertId,
        p_contact_id: c.id,
        p_ttl: '7 days',
      });
      if (!token) continue;

      const payload = {
        contactName: c.full_name,
        travelerName: traveler?.full_name ?? 'Seu contato',
        reason,
        lastSeenLabel,
        lastSeenAt: new Date().toLocaleString('pt-BR'),
        dossierUrl: `${SITE_URL}/d/${token}`,
        isSos: true,
      };

      // SOS dispara em TODOS os canais disponíveis, em paralelo.
      const jobs: Promise<unknown>[] = [];
      if (c.email) {
        jobs.push(
          sendEmail(c.email, `🚨 [Sentinela] ${payload.travelerName} acionou o SOS`,
            dossierEmailHtml(payload))
            .then((r) => db.from('alert_notifications').insert({
              alert_id: alertId, contact_id: c.id, channel: 'email',
              status: r.ok ? 'sent' : 'failed', provider_ref: r.ref, error: r.error,
              sent_at: r.ok ? new Date().toISOString() : null,
            })),
        );
      }
      if (c.phone) {
        jobs.push(
          sendSms(c.phone, dossierSmsText(payload))
            .then((r) => db.from('alert_notifications').insert({
              alert_id: alertId, contact_id: c.id, channel: 'sms',
              status: r.ok ? 'sent' : 'failed', provider_ref: r.ref, error: r.error,
              sent_at: r.ok ? new Date().toISOString() : null,
            })),
        );
      }
      await Promise.allSettled(jobs);
      notified++;
    }

    return json({ ok: true, alert_id: alertId, contacts_notified: notified }, 200, cors);
  } catch (e) {
    console.error('[sos]', e);
    return json({ ok: false, error: String(e) }, 500, cors);
  }
});
