import { PLATFORM_LABEL, SURFACE_CAPABILITIES } from '@sentinela/shared';
import type { AdminDeviceStat, AdminUserWithoutMobile } from '@sentinela/shared';
import { requireAdmin } from '@/lib/admin/guard';
import { Card, Kpi, Table, Empty } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

export default async function DispositivosPage() {
  const { supabase } = await requireAdmin();

  const [{ data: statsRaw }, { data: orphansRaw }] = await Promise.all([
    supabase.rpc('admin_device_stats'),
    supabase.rpc('admin_users_without_mobile', { p_limit: 200 }),
  ]);

  const stats = (statsRaw ?? []) as AdminDeviceStat[];
  const orphans = (orphansRaw ?? []) as AdminUserWithoutMobile[];

  const mobile = stats.filter((s) => s.platform !== 'web');
  const web = stats.find((s) => s.platform === 'web');

  const mobileTotal = mobile.reduce((n, s) => n + s.total, 0);
  const mobileActive = mobile.reduce((n, s) => n + s.active_7d, 0);
  const mobileNoPush = mobile.reduce((n, s) => n + (s.total - s.with_push), 0);

  const orphansWithSession = orphans.filter((o) => o.active_session).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dispositivos</h1>
        <p className="mt-1 text-sm text-slate-500">
          A divisão que sustenta o produto: só iOS e Android produzem sinal de vida. Sessão de
          navegador é acesso administrativo e nunca reseta o Dead Man&apos;s Switch — a regra é
          aplicada no banco, em <code className="text-slate-400">record_signal</code>.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Aparelhos com o app"
          value={mobileTotal}
          hint={`${mobileActive} ativos em 7 dias`}
          tone={mobileTotal === 0 ? 'warn' : 'neutral'}
        />
        <Kpi label="Sessões de navegador" value={web?.total ?? 0} hint="não monitoram" />
        <Kpi
          label="App sem push"
          value={mobileNoPush}
          tone={mobileNoPush > 0 ? 'warn' : 'ok'}
          hint="não recebem o aviso antes do alerta"
        />
        <Kpi
          label="Contas sem app"
          value={orphans.length}
          tone={orphansWithSession > 0 ? 'bad' : orphans.length > 0 ? 'warn' : 'ok'}
          hint={`${orphansWithSession} com viagem ativa`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Por plataforma">
          {stats.length === 0 ? (
            <Empty>Nenhum dispositivo registrado ainda.</Empty>
          ) : (
            <Table head={['Plataforma', 'Total', 'Ativos 24h', 'Ativos 7d', 'Parados 30d', 'Com push', 'Sinal 24h']}>
              {stats.map((s) => (
                <tr key={s.platform}>
                  <td className="px-3 py-2.5 font-semibold text-white">
                    {PLATFORM_LABEL[s.platform]}
                    {s.platform === 'web' && (
                      <span className="ml-2 rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-500">
                        não monitora
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-300">{s.total}</td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-300">{s.active_24h}</td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-300">{s.active_7d}</td>
                  <td
                    className={`px-3 py-2.5 tabular-nums ${s.stale_30d > 0 ? 'text-amber-400' : 'text-slate-300'}`}
                  >
                    {s.stale_30d}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-300">
                    {s.platform === 'web' ? '—' : s.with_push}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-300">
                    {s.platform === 'web' ? '—' : s.signalled_24h}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card title="O que roda onde">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                App (iOS / Android)
              </p>
              <ul className="mt-3 space-y-1.5">
                {SURFACE_CAPABILITIES.mobile.map((c) => (
                  <li key={c} className="text-xs leading-relaxed text-slate-400">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Web (navegador)
              </p>
              <ul className="mt-3 space-y-1.5">
                {SURFACE_CAPABILITIES.web.map((c) => (
                  <li key={c} className="text-xs leading-relaxed text-slate-400">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* O furo mais caro do produto: conta ativa, cobrança rodando e nenhum
          aparelho capaz de disparar o alerta que a pessoa está pagando. */}
      <Card title="Contas sem nenhum celular com o app">
        {orphans.length === 0 ? (
          <Empty>Todos os usuários têm ao menos um aparelho móvel registrado.</Empty>
        ) : (
          <Table head={['Usuário', 'E-mail', 'Criada em', 'Viagem ativa']}>
            {orphans.map((u) => (
              <tr key={u.user_id}>
                <td className="px-3 py-2.5 font-semibold text-white">{u.full_name}</td>
                <td className="px-3 py-2.5 text-slate-400">{u.email ?? '—'}</td>
                <td className="px-3 py-2.5 text-slate-400">
                  {new Date(u.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-3 py-2.5">
                  {u.active_session ? (
                    <span className="font-semibold text-red-400">
                      sim — sem cobertura real
                    </span>
                  ) : (
                    <span className="text-slate-600">não</span>
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
