import type { Metadata } from 'next';
import type { TripHistoryItem } from '@sentinela/shared';
import { requireUser } from '@/lib/auth/requireUser';
import { NovaViagemForm } from '@/components/app/NovaViagemForm';
import { ViagemAtiva, type ViagemRow } from '@/components/app/ViagemAtiva';
import { HistoricoViagens } from '@/components/app/HistoricoViagens';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Viagens',
  robots: { index: false, follow: false },
};

const COLUNAS =
  'id, title, destination_label, state, status, checkin_interval, grace_period, alert_delay, last_signal_at, expected_checkin_at, starts_at, ends_at';

export default async function ViagensPage() {
  const { supabase, user } = await requireUser('/viagens');

  const [{ data }, { data: historico }] = await Promise.all([
    supabase
      .from('travel_sessions')
      .select(COLUNAS)
      .eq('user_id', user.id)
      .order('starts_at', { ascending: false }),
    // A tabela sozinha não tem km, países nem cidades — isso mora em
    // location_logs e em analytics.v_valid_segments, que a API não expõe. A
    // RPC agrega por viagem e é a mesma que o app consome.
    supabase.rpc('get_my_trip_history'),
  ]);

  const todas = data ?? [];
  const ativa = todas.find((t) => t.status === 'active');
  const passadas = ((historico ?? []) as TripHistoryItem[]).filter((t) => t.status !== 'active');

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Viagens</h1>
          <p className="mt-2 text-sm text-slate-400">
            Cada viagem carrega uma regra: quanto tempo de silêncio significa que algo está errado.
          </p>
        </div>
      </div>

      <div className="mt-8">
        {ativa ? (
          <ViagemAtiva viagem={ativa as unknown as ViagemRow} />
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
            <p className="text-lg font-semibold text-white">Nenhuma viagem ativa</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
              Sem viagem ativa nada é monitorado — nem o GPS roda, nem o cronômetro anda. É o
              estado certo para quando você está em casa.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <NovaViagemForm bloqueada={Boolean(ativa)} />
      </div>

      {passadas.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Histórico
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Toque numa viagem para ver países, cidades e check-ins.
          </p>
          <div className="mt-5">
            <HistoricoViagens viagens={passadas} />
          </div>
        </section>
      )}
    </>
  );
}
