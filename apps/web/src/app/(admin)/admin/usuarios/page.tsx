import { STATE_META } from '@sentinela/shared';
import type { AdminUserSearchRow } from '@sentinela/shared';
import { requireAdmin } from '@/lib/admin/guard';
import { Card, Table, Empty, ago } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { supabase } = await requireAdmin();

  const term = (q ?? '').trim();
  const { data, error } = term
    ? await supabase.rpc('admin_search_users', { p_q: term, p_limit: 50 })
    : { data: [], error: null };

  const rows = (data ?? []) as AdminUserSearchRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Usuários</h1>
        <p className="mt-1 text-sm text-slate-500">
          Busca por nome, e-mail ou UUID. Cada consulta é registrada na auditoria com o seu e-mail.
        </p>
      </div>

      {/* GET, não POST: o termo fica na URL e é compartilhável entre a equipe
          durante um atendimento — e some do estado do componente. */}
      <form method="get" className="flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={term}
          placeholder="nome, e-mail ou uuid"
          className="min-w-64 flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-teal-600"
        />
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-500"
        >
          Buscar
        </button>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
        <p className="text-xs leading-relaxed text-slate-500">
          <span className="font-semibold text-slate-400">Limite deliberado:</span> esta busca não
          devolve o dossiê médico. Tipo sanguíneo, alergias e medicação são dado sensível do art.
          11 da LGPD e nenhum caso de suporte precisa deles — quem precisa é o socorrista, e para
          ele existe o link por token, que registra cada acesso.
        </p>
      </div>

      <Card title={term ? `Resultados para “${term}”` : 'Busca'}>
        {error ? (
          <Empty>Falha na busca: {error.message}</Empty>
        ) : !term ? (
          <Empty>Digite um termo para buscar.</Empty>
        ) : rows.length === 0 ? (
          <Empty>Nenhum usuário encontrado.</Empty>
        ) : (
          <Table
            head={['Usuário', 'Cadastro', 'Último acesso', 'Viagem', 'Último sinal', 'Aparelhos', 'Alertas']}
          >
            {rows.map((u) => (
              <tr key={u.user_id}>
                <td className="px-3 py-3">
                  <p className="font-semibold text-white">{u.full_name}</p>
                  <p className="text-xs text-slate-500">{u.email ?? '—'}</p>
                  <p className="font-mono text-[10px] text-slate-700">{u.user_id}</p>
                </td>
                <td className="px-3 py-3 text-xs text-slate-400">
                  {new Date(u.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-3 py-3 text-xs text-slate-400">
                  {u.last_sign_in_at ? `há ${ago(u.last_sign_in_at)}` : 'nunca'}
                </td>
                <td className="px-3 py-3 text-xs">
                  {u.session_state ? (
                    <span
                      className={
                        u.session_state === 'alert' || u.session_state === 'sos'
                          ? 'font-semibold text-red-400'
                          : u.session_state === 'safe'
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                      }
                    >
                      {STATE_META[u.session_state].short}
                    </span>
                  ) : (
                    <span className="text-slate-600">sem viagem</span>
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-slate-400">
                  {u.last_signal_at ? `há ${ago(u.last_signal_at)}` : '—'}
                </td>
                <td className="px-3 py-3 text-xs">
                  {u.platforms.length === 0 ? (
                    <span className="text-red-400">nenhum</span>
                  ) : (
                    <span
                      className={
                        u.platforms.every((p) => p === 'web') ? 'text-amber-400' : 'text-slate-400'
                      }
                    >
                      {u.platforms.join(', ')}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-xs">
                  {u.open_alerts > 0 ? (
                    <span className="font-semibold text-red-400">{u.open_alerts} aberto(s)</span>
                  ) : (
                    <span className="text-slate-600">0</span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
