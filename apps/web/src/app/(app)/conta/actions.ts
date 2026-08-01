'use server';

import { revalidatePath } from 'next/cache';
import { dossierInput } from '@sentinela/shared';
import { requireUser } from '@/lib/auth/requireUser';

export type ActionState = { ok: boolean; message: string } | null;

export async function salvarPerfil(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fullName = String(formData.get('full_name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const homeCountry = String(formData.get('home_country') ?? '').trim().toUpperCase();

  if (fullName.length < 2) return { ok: false, message: 'Informe seu nome completo.' };
  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
    return { ok: false, message: 'Telefone precisa do formato internacional: +5511999999999' };
  }
  if (homeCountry && !/^[A-Z]{2}$/.test(homeCountry)) {
    return { ok: false, message: 'País de origem usa 2 letras: BR, PT, US…' };
  }

  const { supabase, user } = await requireUser('/conta');

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone: phone || null,
      home_country: homeCountry || null,
    })
    .eq('id', user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath('/conta');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Perfil atualizado.' };
}

/**
 * Dossiê médico.
 *
 * `upsert` e não `update`: a linha em emergency_dossiers só nasce quando o
 * usuário preenche algo. Um `update` num usuário novo afetaria zero linhas e
 * devolveria sucesso — o pior tipo de bug, porque o dado sensível parece salvo
 * e não está, e a descoberta seria numa emergência.
 */
export async function salvarDossie(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    blood_type: String(formData.get('blood_type') ?? '') || undefined,
    allergies: String(formData.get('allergies') ?? '').trim() || undefined,
    medications: String(formData.get('medications') ?? '').trim() || undefined,
    medical_conditions: String(formData.get('medical_conditions') ?? '').trim() || undefined,
    passport_masked: String(formData.get('passport_masked') ?? '').trim() || undefined,
    insurance_provider: String(formData.get('insurance_provider') ?? '').trim() || undefined,
    insurance_policy: String(formData.get('insurance_policy') ?? '').trim() || undefined,
    additional_notes: String(formData.get('additional_notes') ?? '').trim() || undefined,
  };

  const parsed = dossierInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const { supabase, user } = await requireUser('/conta');

  const { error } = await supabase.from('emergency_dossiers').upsert({
    user_id: user.id,
    blood_type: parsed.data.blood_type ?? null,
    allergies: parsed.data.allergies ?? null,
    medications: parsed.data.medications ?? null,
    medical_conditions: parsed.data.medical_conditions ?? null,
    passport_masked: parsed.data.passport_masked ?? null,
    insurance_provider: parsed.data.insurance_provider ?? null,
    insurance_policy: parsed.data.insurance_policy ?? null,
    additional_notes: parsed.data.additional_notes ?? null,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath('/conta');
  return { ok: true, message: 'Dossiê salvo. Só você o vê — nem gestor, nem nós.' };
}

/**
 * Exclusão de dados a pedido (LGPD art. 18 / GDPR art. 17).
 *
 * Apaga a linha de `profiles`, e o ON DELETE CASCADE leva junto sessões,
 * localizações, sinais, contatos, dossiê e alertas.
 *
 * LIMITE HONESTO: a conta em `auth.users` NÃO é removida aqui. Apagá-la exige
 * a service_role, e essa chave não pode existir num caminho acionável pelo
 * navegador — seria a chave mestra do banco atrás de um clique. Sem os dados a
 * conta fica vazia; a remoção definitiva é feita pelo suporte.
 */
export async function apagarMeusDados(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (String(formData.get('confirmacao') ?? '').trim().toUpperCase() !== 'APAGAR') {
    return { ok: false, message: 'Digite APAGAR para confirmar.' };
  }

  const { supabase, user } = await requireUser('/conta');

  const { error } = await supabase.from('profiles').delete().eq('id', user.id);
  if (error) return { ok: false, message: error.message };

  return {
    ok: true,
    message:
      'Seus dados foram apagados: viagens, localizações, contatos e dossiê. Saia da conta para encerrar a sessão.',
  };
}
