'use server';

import { revalidatePath } from 'next/cache';
import { emergencyContactInput } from '@sentinela/shared';
import { requireUser } from '@/lib/auth/requireUser';

export type ActionState = { ok: boolean; message: string } | null;

export async function salvarContato(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = emergencyContactInput.safeParse({
    full_name: String(formData.get('full_name') ?? '').trim(),
    relationship: String(formData.get('relationship') ?? '').trim() || undefined,
    email: String(formData.get('email') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    preferred_channel: String(formData.get('preferred_channel') ?? 'email'),
    priority: Number(formData.get('priority') ?? 1),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const { supabase, user } = await requireUser('/contatos');

  const { error } = await supabase.from('emergency_contacts').insert({
    user_id: user.id,
    full_name: parsed.data.full_name,
    relationship: parsed.data.relationship ?? null,
    // String vazia vira null: a constraint contact_needs_a_channel exige que
    // pelo menos um dos dois não seja nulo, e '' passaria pela checagem sem ser
    // um canal utilizável.
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    preferred_channel: parsed.data.preferred_channel,
    locale: parsed.data.locale,
    priority: parsed.data.priority,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath('/contatos');
  return { ok: true, message: 'Contato salvo.' };
}

export async function removerContato(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get('contact_id') ?? '');
  if (!id) return { ok: false, message: 'Contato não informado.' };

  const { supabase, user } = await requireUser('/contatos');

  const { error } = await supabase
    .from('emergency_contacts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath('/contatos');
  return { ok: true, message: 'Contato removido.' };
}
