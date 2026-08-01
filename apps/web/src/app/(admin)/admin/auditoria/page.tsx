import type { AdminAuditRow } from '@sentinela/shared';
import { requireAdmin } from '@/lib/admin/guard';
import { Card, Table, Empty, ago } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

const ACTION_LABEL: Record<string, string> = {
  search_users: 'Buscou usuários',
  resolve_alert: 'Encerrou incidente',
  set_platform_role: 'Concedeu papel de plataforma',
  revoke_platform_role: 'Revogou papel de plataforma',
};

export default async function AuditoriaPage() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase.rpc('admin_recent_audit', { p_limit: 200 });
  const rows = (data ?? []) as AdminAuditRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Auditoria</h1>
        <p className="mt-1 text-sm text-slate-500">
          Painel de administração sem log de auditoria é um backdoor com CSS. Toda busca por
          usuário e toda escrita passam por aqui, com autor e horário.
        </p>
      </div>

      <Card title={`${rows.length} eventos recentes`}>
        {error ? (
          <Empty>Falha ao carregar: {error.message}</Empty>
        ) : rows.length === 0 ? (
          <Empty>Nenhuma ação administrativa registrada ainda.</Empty>
        ) : (
          <Table head={['Quando', 'Quem', 'Ação', 'Alvo', 'Detalhe']}>
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-400">
                  há {ago(r.at)}
                  <span className="block text-slate-600">
                    {new Date(r.at).toLocaleString('pt-BR')}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-sm text-slate-300">{r.actor_name}</td>
                <td className="px-3 py-2.5 text-sm text-white">
                  {ACTION_LABEL[r.action] ?? r.action}
                </td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                  {r.target_type ? `${r.target_type}:${r.target_id ?? ''}` : '—'}
                </td>
                <td className="max-w-[320px] px-3 py-2.5">
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-500">
                    {JSON.stringify(r.detail)}
                  </pre>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
