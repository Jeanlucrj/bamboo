import * as SMS from 'expo-sms';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import { getCurrentPosition } from './location/backgroundLocation';

/**
 * Botão de pânico.
 *
 * Regra de ouro: o SOS não pode depender de internet. Se a Edge Function
 * falhar, caímos para SMS nativo — que atravessa em rede 2G de estrada onde
 * nenhum HTTPS completa handshake.
 */

export type SosResult =
  | { ok: true; via: 'server'; alertId: string; contactsNotified: number }
  | { ok: true; via: 'native-sms'; recipients: number }
  | { ok: false; error: string };

export async function triggerSos(sessionId: string, note?: string): Promise<SosResult> {
  // Posição primeiro: 3 s de teto. Melhor mandar sem coordenada do que travar.
  const coords = await Promise.race([
    getCurrentPosition().then((p) => p.coords).catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), 3000)),
  ]);

  try {
    const { data, error } = await supabase.functions.invoke('trigger-sos', {
      body: {
        session_id: sessionId,
        lat: coords?.latitude,
        lng: coords?.longitude,
        accuracy_m: coords?.accuracy,
        note,
      },
    });
    if (error) throw error;

    return {
      ok: true,
      via: 'server',
      alertId: data.alert_id,
      contactsNotified: data.contacts_notified,
    };
  } catch (e) {
    console.warn('[sos] servidor indisponível, tentando SMS nativo:', e);
    return fallbackNativeSms(coords, note);
  }
}

/**
 * Plano B: abre o app de SMS do sistema já preenchido.
 * Exige um toque do usuário para enviar — limitação intransponível do SO,
 * nenhum app pode disparar SMS silencioso.
 */
async function fallbackNativeSms(
  coords: { latitude: number; longitude: number } | null,
  note?: string,
): Promise<SosResult> {
  try {
    const { data: contacts } = await supabase
      .from('emergency_contacts')
      .select('phone')
      .not('phone', 'is', null)
      .order('priority', { ascending: true });

    const numbers = (contacts ?? []).map((c) => c.phone!).filter(Boolean);
    if (!numbers.length) return { ok: false, error: 'Nenhum contato com telefone cadastrado' };

    const mapLink = coords
      ? `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`
      : 'localizacao indisponivel';
    const body = `EMERGENCIA (Sentinela). Preciso de ajuda.${note ? ` ${note}` : ''} Minha localizacao: ${mapLink}`;

    if (await SMS.isAvailableAsync()) {
      await SMS.sendSMSAsync(numbers, body);
      return { ok: true, via: 'native-sms', recipients: numbers.length };
    }

    await Linking.openURL(`sms:${numbers[0]}?body=${encodeURIComponent(body)}`);
    return { ok: true, via: 'native-sms', recipients: 1 };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Cancela um SOS acionado por engano. */
export async function cancelSos(alertId: string, note?: string) {
  return supabase.functions.invoke('resolve-alert', {
    body: { alert_id: alertId, note: note ?? 'Cancelado pelo usuário', false_alarm: true },
  });
}
