/**
 * send-dossier — reenvio manual do Dossiê.
 * Casos de uso: o contato apagou o e-mail, o SMS não chegou, ou o gestor B2B
 * precisa acionar um contato adicional durante um incidente aberto.
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
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: 'unauthenticated' }, 401, cors);

    const { alert_id, contact_id } = (await req.json()) as {
      alert_id: string;
      contact_id: string;
    };

    const db = admin();

    // Só o dono do alerta ou um gestor da org pode reenviar.
    const { data: alert } = await db
      .from('alerts')
      .select('id, user_id, org_id, level, reason, resolved_at')
      .eq('id', alert_id)
      .single();
    if (!alert) return json({ ok: false, error: 'alert_not_found' }, 404, cors);

    let allowed = alert.user_id === user.id;
    if (!allowed && alert.org_id) {
      const { data: m } = await db
        .from('org_members')
        .select('role')
        .eq('org_id', alert.org_id)
        .eq('user_id', user.id)
        .maybeSingle();
      allowed = !!m && ['owner', 'admin', 'manager'].includes(m.role);
    }
    if (!allowed) return json({ ok: false, error: 'forbidden' }, 403, cors);
    if (alert.resolved_at) return json({ ok: false, error: 'alert_already_resolved' }, 409, cors);

    const [{ data: contact }, { data: traveler }, { data: lastLoc }] = await Promise.all([
      db.from('emergency_contacts')
        .select('id, full_name, email, phone, preferred_channel')
        .eq('id', contact_id).eq('user_id', alert.user_id).single(),
      db.from('profiles').select('full_name').eq('id', alert.user_id).single(),
      db.from('location_logs').select('city, country_code, recorded_at')
        .eq('user_id', alert.user_id)
        .order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (!contact) return json({ ok: false, error: 'contact_not_found' }, 404, cors);

    const { data: token } = await db.rpc('issue_dossier_token', {
      p_alert_id: alert_id,
      p_contact_id: contact.id,
      p_ttl: '7 days',
    });

    const payload = {
      contactName: contact.full_name,
      travelerName: traveler?.full_name ?? 'Seu contato',
      reason: alert.reason,
      lastSeenLabel: lastLoc
        ? [lastLoc.city, lastLoc.country_code].filter(Boolean).join(', ')
        : 'Nenhuma localização registrada',
      lastSeenAt: lastLoc?.recorded_at
        ? new Date(lastLoc.recorded_at).toLocaleString('pt-BR')
        : 'desconhecido',
      dossierUrl: `${SITE_URL}/d/${token}`,
      isSos: alert.level === 'sos',
    };

    const sent: string[] = [];
    if (contact.email) {
      const r = await sendEmail(
        contact.email,
        `[Sentinela] Dossiê de emergência — ${payload.travelerName}`,
        dossierEmailHtml(payload),
      );
      if (r.ok) sent.push('email');
      await db.from('alert_notifications').insert({
        alert_id, contact_id: contact.id, channel: 'email',
        status: r.ok ? 'sent' : 'failed', provider_ref: r.ref, error: r.error,
        sent_at: r.ok ? new Date().toISOString() : null,
      });
    }
    if (contact.phone) {
      const r = await sendSms(contact.phone, dossierSmsText(payload));
      if (r.ok) sent.push('sms');
      await db.from('alert_notifications').insert({
        alert_id, contact_id: contact.id, channel: 'sms',
        status: r.ok ? 'sent' : 'failed', provider_ref: r.ref, error: r.error,
        sent_at: r.ok ? new Date().toISOString() : null,
      });
    }

    return json({ ok: true, sent }, 200, cors);
  } catch (e) {
    console.error('[send-dossier]', e);
    return json({ ok: false, error: String(e) }, 500, cors);
  }
});
