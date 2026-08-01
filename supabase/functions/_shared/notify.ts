/**
 * Camada de entrega multicanal.
 * Cada função devolve { ok, ref, error } e NUNCA lança: numa emergência,
 * a falha de um canal não pode impedir os outros de saírem.
 */

export type DeliveryResult = { ok: boolean; ref?: string; error?: string };

// ---------------------------------------------------------------- e-mail
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<DeliveryResult> {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') ?? 'Sentinela <alerta@sentinela.app>';
  if (!key) return { ok: false, error: 'RESEND_API_KEY ausente' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    });
    const data = await res.json();
    return res.ok
      ? { ok: true, ref: data.id }
      : { ok: false, error: data.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ------------------------------------------------------------ sms/whatsapp
export async function sendSms(
  to: string,
  body: string,
  channel: 'sms' | 'whatsapp' = 'sms',
): Promise<DeliveryResult> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from =
    channel === 'whatsapp'
      ? Deno.env.get('TWILIO_WHATSAPP_FROM')
      : Deno.env.get('TWILIO_SMS_FROM');
  if (!sid || !token || !from) return { ok: false, error: 'Credenciais Twilio ausentes' };

  const dest = channel === 'whatsapp' ? `whatsapp:${to}` : to;

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: dest, From: from, Body: body }),
    });
    const data = await res.json();
    return res.ok
      ? { ok: true, ref: data.sid }
      : { ok: false, error: data.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ------------------------------------------------------------------- push
export async function sendPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  critical = false,
): Promise<DeliveryResult> {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(Deno.env.get('EXPO_ACCESS_TOKEN')
          ? { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` }
          : {}),
      },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data,
        sound: critical ? 'default' : null,
        priority: critical ? 'high' : 'normal',
        // Atravessa o Modo Foco / Não Perturbe. Exige entitlement da Apple —
        // solicite cedo, a aprovação demora.
        _contentAvailable: !critical,
        channelId: critical ? 'alerts-critical' : 'default',
      }),
    });
    const data_ = await res.json();
    return res.ok ? { ok: true, ref: data_?.data?.id } : { ok: false, error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
