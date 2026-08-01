'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';

export type ResolveState = { ok: boolean; message: string } | null;

/**
 * Encerra um incidente pela operação.
 *
 * Exige papel >= 'admin' e nota obrigatória. A nota não é burocracia: ela é o
 * que separa "falamos com a pessoa, está bem" de "o alerta estava incomodando".
 * Vai para o log de auditoria junto com quem apertou o botão.
 *
 * A checagem aqui é conveniência de UX — quem realmente autoriza é
 * require_platform_admin('admin') dentro da função no Postgres. Server Action é
 * um endpoint HTTP público como outro qualquer; confiar só nesta linha seria o
 * mesmo erro de esconder o botão no CSS.
 */
export async function resolveIncident(
  _prev: ResolveState,
  formData: FormData,
): Promise<ResolveState> {
  const alertId = String(formData.get('alert_id') ?? '');
  const note = String(formData.get('note') ?? '').trim();

  if (!alertId) return { ok: false, message: 'Incidente não informado.' };
  if (note.length < 10) {
    return { ok: false, message: 'Descreva em pelo menos 10 caracteres por que está encerrando.' };
  }

  const { supabase } = await requireAdmin('admin');

  const { data, error } = await supabase.rpc('admin_resolve_alert', {
    p_alert_id: alertId,
    p_note: note,
  });

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: 'O incidente já estava encerrado.' };

  revalidatePath('/admin/incidentes');
  revalidatePath('/admin');
  return { ok: true, message: 'Incidente encerrado e links de dossiê revogados.' };
}
