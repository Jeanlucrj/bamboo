'use server';

import { revalidatePath } from 'next/cache';
import { travelSessionInput } from '@sentinela/shared';
import { requireUser } from '@/lib/auth/requireUser';

export type ActionState = { ok: boolean; message: string } | null;

/**
 * Cria uma sessão de viagem pelo navegador.
 *
 * Sim, pelo navegador. A sessão é uma linha no banco com uma regra de tempo —
 * quem não pode nascer aqui é o SINAL DE VIDA, que depende do GPS do aparelho.
 * Uma versão anterior desta tela confundia as duas coisas e se recusava a criar
 * viagem sem o app, o que não protegia ninguém e só escondia uma função que o
 * sistema já sabia fazer. O aviso de que nada monitora até o app abrir está na
 * tela; a decisão é do usuário.
 */
export async function criarViagem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = travelSessionInput.safeParse({
    title: String(formData.get('title') ?? '').trim(),
    destination_label: String(formData.get('destination_label') ?? '').trim() || undefined,
    checkin_hours: Number(formData.get('checkin_hours') ?? 24),
    passive_checkin_enabled: formData.get('passive_checkin_enabled') === 'on',
    gps_tracking_enabled: formData.get('gps_tracking_enabled') === 'on',
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const { supabase, user } = await requireUser('/viagens');

  // Duas sessões ativas seriam dois cronômetros concorrentes para a mesma
  // pessoa: dois alertas, e o painel B2B mostrando o viajante duas vezes com
  // estados diferentes. O banco não impede — a regra mora aqui.
  const { data: ativa } = await supabase
    .from('travel_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (ativa) {
    return { ok: false, message: 'Você já tem uma viagem ativa. Encerre-a antes de criar outra.' };
  }

  const { error } = await supabase.from('travel_sessions').insert({
    user_id: user.id,
    title: parsed.data.title,
    destination_label: parsed.data.destination_label ?? null,
    // Forma textual: o trigger set_expected_checkin recalcula
    // expected_checkin_at a partir dela.
    checkin_interval: `${parsed.data.checkin_hours} hours`,
    passive_checkin_enabled: parsed.data.passive_checkin_enabled,
    gps_tracking_enabled: parsed.data.gps_tracking_enabled,
    status: 'active',
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath('/viagens');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Viagem criada. Abra o app no celular para o monitoramento começar.' };
}

export async function encerrarViagem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get('session_id') ?? '');
  if (!id) return { ok: false, message: 'Viagem não informada.' };

  const { supabase, user } = await requireUser('/viagens');

  const { error } = await supabase
    .from('travel_sessions')
    .update({ status: 'completed', ends_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);   // cinto e suspensório: a RLS já garante isto

  if (error) return { ok: false, message: error.message };

  revalidatePath('/viagens');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Viagem encerrada. O cronômetro parou.' };
}

/** Ajuste do intervalo de check-in numa viagem em andamento. */
export async function ajustarIntervalo(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get('session_id') ?? '');
  const hours = Number(formData.get('checkin_hours') ?? 0);

  if (!id) return { ok: false, message: 'Viagem não informada.' };
  if (!Number.isInteger(hours) || hours < 1 || hours > 720) {
    return { ok: false, message: 'Intervalo deve ficar entre 1 hora e 30 dias.' };
  }

  const { supabase, user } = await requireUser('/viagens');

  const { error } = await supabase
    .from('travel_sessions')
    .update({ checkin_interval: `${hours} hours` })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath('/viagens');
  revalidatePath('/dashboard');
  return { ok: true, message: `Agora o alarme dispara após ${hours}h sem sinal de vida.` };
}
