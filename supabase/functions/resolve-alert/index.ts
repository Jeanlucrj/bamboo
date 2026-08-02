/**
 * resolve-alert — encerra um incidente e avisa quem foi acionado.
 *
 * O segundo aviso ("foi alarme falso, está tudo bem") é tão importante quanto
 * o primeiro. Sem ele, a família fica em pânico até conseguir falar por conta
 * própria — e o usuário desinstala o app no dia seguinte.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { admin, json, HttpError } from '../_shared/supabaseAdmin.ts';
import { handlePreflight, corsHeaders } from '../_shared/cors.ts';
import { sendEmail, sendSms } from '../_shared/notify.ts';

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  const cors = corsHeaders(req.headers.get('Origin'));

  try {
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: 'unauthenticated' }, 401, cors);

    const { alert_id, note, false_alarm = true } = (await req.json()) as {
      alert_id: string;
      note?: string;
      false_alarm?: boolean;
    };

    const db = admin();

    const { data: alert } = await db
      .from('alerts')
      .select('id, user_id, org_id, session_id, resolved_at')
      .eq('id', alert_id)
      .single();
    if (!alert) return json({ ok: false, error: 'alert_not_found' }, 404, cors);

    let allowed = alert.user_id === user.id;
    if (!allowed && alert.org_id) {
      const { data: m } = await db
        .from('org_members').select('role')
        .eq('org_id', alert.org_id).eq('user_id', user.id).maybeSingle();
      allowed = !!m && ['owner', 'admin', 'manager'].includes(m.role);
    }
    if (!allowed) return json({ ok: false, error: 'forbidden' }, 403, cors);
    if (alert.resolved_at) return json({ ok: true, already_resolved: true }, 200, cors);

    const now = new Date().toISOString();

    await db.from('alerts').update({
      resolved_at: now,
      resolved_by: user.id,
      resolution_note: note ?? null,
      was_false_alarm: false_alarm,
    }).eq('id', alert_id);

    // Sessão volta a 'safe' e o cronômetro é reiniciado pelo record_signal.
    await db.from('travel_sessions')
      .update({ state: 'safe', escalation_step: 0 })
      .eq('id', alert.session_id);

    await db.rpc('record_signal', {
      p_session_id: alert.session_id,
      p_kind: 'manual_checkin',
      p_occurred_at: now,
      p_metadata: { resolved_alert: alert_id },
      p_external_ref: null,
      p_source: 'resolve-alert',
    });

    // Revoga todos os links de dossiê deste incidente.
    await db.from('dossier_tokens')
      .update({ revoked_at: now })
      .eq('alert_id', alert_id)
      .is('revoked_at', null);

    // Avisa quem recebeu o alerta.
    const { data: traveler } = await db
      .from('profiles').select('full_name').eq('id', alert.user_id).single();

    const { data: notified } = await db
      .from('alert_notifications')
      .select('contact_id')
      .eq('alert_id', alert_id)
      .eq('status', 'sent');

    const contactIds = [...new Set((notified ?? []).map((n) => n.contact_id).filter(Boolean))];
    if (contactIds.length) {
      const { data: contacts } = await db
        .from('emergency_contacts')
        .select('id, full_name, email, phone')
        .in('id', contactIds as string[]);

      const name = traveler?.full_name ?? 'Seu contato';
      for (const c of contacts ?? []) {
        if (c.email) {
          await sendEmail(
            c.email,
            `[Sentinela] Alarme encerrado — ${name} está bem`,
            `<div style="font-family:sans-serif;font-size:16px;line-height:1.6;color:#0F172A">
               <p>Olá, ${c.full_name}.</p>
               <p><strong>${name} está bem.</strong> O alerta enviado anteriormente foi encerrado
               ${false_alarm ? 'e registrado como alarme falso' : ''}.</p>
               ${note ? `<p style="background:#F1F5F9;padding:12px;border-radius:8px">${note}</p>` : ''}
               <p>O link do dossiê que você recebeu foi desativado.</p>
               <p style="color:#64748B;font-size:14px">Obrigado por estar disponível.</p>
             </div>`,
          );
        } else if (c.phone) {
          await sendSms(c.phone, `Sentinela: alarme encerrado. ${name} esta bem. O link do dossie foi desativado.`);
        }
      }
    }

    return json({ ok: true, contacts_notified: contactIds.length }, 200, cors);
  } catch (e) {
    // Status real do erro em vez de 500 fixo: uma falha de permissao devolvia
    // "servidor quebrado", que manda quem depura procurar no lugar errado.
    const status = e instanceof HttpError ? e.status : 500;
    console.error('[resolve]', e);
    return json({ ok: false, error: String(e) }, status, cors);
  }
});
