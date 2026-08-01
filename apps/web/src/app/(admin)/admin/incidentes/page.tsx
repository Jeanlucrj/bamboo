import { STATE_META, PLATFORM_LABEL } from '@sentinela/shared';
import type { AdminIncident } from '@sentinela/shared';
import { requireAdmin, atLeast } from '@/lib/admin/guard';
import { Card, Table, Empty, ago } from '@/components/admin/ui';
import { ResolveIncidentForm } from '@/components/admin/ResolveIncidentForm';

export const dynamic = 'force-dynamic';

const HEAD = [
  'Viajante', 'Nível', 'Aberto há', 'Motivo', 'Última posição', 'Aparelho', 'Notificações', '',
] as const;

export default async function IncidentesPage() {
  const { supabase, role } = await requireAdmin();
  const canWrite = atLeast(role, 'admin');

  const { data, error } = await supabase.rpc('admin_open_incidents', { p_limit: 100 });
  const rows = (data ?? []) as AdminIncident[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Incidentes abertos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Todas as organizações e todos os usuários B2C. Ordenado por severidade, nunca por data —
          um SOS de 2 minutos vem antes de um alerta de 6 horas.
        </p>
      </div>

      <Card title={`${rows.length} em aberto`}>
        {error ? (
          <Empty>Falha ao carregar: {error.message}</Empty>
        ) : rows.length === 0 ? (
          <Empty>Nenhum incidente aberto.</Empty>
        ) : (
          <Table head={HEAD}>
            {rows.map((r) => {
              const meta = STATE_META[r.level];
              const deviceSilent =
                r.device_seen_at === null ||
                Date.now() - new Date(r.device_seen_at).getTime() > 6 * 3600_000;

              return (
                <tr key={r.alert_id} className="align-top">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-white">{r.full_name}</p>
                    <p className="text-xs text-slate-500">{r.email ?? '—'}</p>
                    {r.org_name && <p className="text-xs text-slate-600">{r.org_name}</p>}
                  </td>

                  <td className="px-3 py-3">
                    <span
                      className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        meta.light === 'red'
                          ? 'border-red-800 bg-red-950/60 text-red-300'
                          : 'border-amber-800 bg-amber-950/60 text-amber-300'
                      }`}
                    >
                      {meta.short}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-300">
                    {r.minutes_open < 60
                      ? `${r.minutes_open} min`
                      : `${Math.floor(r.minutes_open / 60)} h`}
                  </td>

                  <td className="max-w-[220px] px-3 py-3 text-xs leading-relaxed text-slate-400">
                    {r.reason}
                  </td>

                  <td className="px-3 py-3 text-xs text-slate-400">
                    {r.city ?? '—'}
                    {r.country_code ? ` · ${r.country_code}` : ''}
                    <span className="block text-slate-600">
                      {r.last_known_at ? `há ${ago(r.last_known_at)}` : 'sem posição'}
                    </span>
                  </td>

                  {/* A coluna que responde "o celular está com a pessoa?".
                      Aparelho sem contato há horas muda completamente a
                      leitura do incidente. */}
                  <td className="px-3 py-3 text-xs">
                    {r.device_platform ? (
                      <>
                        <span className="text-slate-400">
                          {PLATFORM_LABEL[r.device_platform]}
                        </span>
                        <span
                          className={`block ${deviceSilent ? 'text-red-400' : 'text-slate-600'}`}
                        >
                          visto há {ago(r.device_seen_at)}
                        </span>
                      </>
                    ) : (
                      <span className="text-red-400">sem app instalado</span>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-xs">
                    <span className="text-emerald-400">{r.notif_sent} enviadas</span>
                    {r.notif_failed > 0 && (
                      <span className="block text-red-400">{r.notif_failed} falharam</span>
                    )}
                  </td>

                  <td className="px-3 py-3">
                    <ResolveIncidentForm
                      alertId={r.alert_id}
                      travelerName={r.full_name}
                      canWrite={canWrite}
                    />
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}
