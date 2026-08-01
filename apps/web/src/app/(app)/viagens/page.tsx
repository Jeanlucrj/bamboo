import type { Metadata } from 'next';
import type { SafetyState } from '@sentinela/shared';
import { requireUser } from '@/lib/auth/requireUser';
import { NovaViagemForm } from '@/components/app/NovaViagemForm';
import { ViagemAtiva, type ViagemRow } from '@/components/app/ViagemAtiva';
import { formatDate, intervalToHours } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Viagens',
  robots: { index: false, follow: false },
};

const COLUNAS =
  'id, title, destination_label, state, status, checkin_interval, grace_period, alert_delay, last_signal_at, expected_checkin_at, starts_at, ends_at';

export default async function ViagensPage() {
  const { supabase, user } = await requireUser('/viagens');

  const { data } = await supabase
    .from('travel_sessions')
    .select(COLUNAS)
    .eq('user_id', user.id)
    .order('starts_at', { ascending: false });

  const todas = data ?? [];
  const ativa = todas.find((t) => t.status === 'active');
  const passadas = todas.filter((t) => t.status !== 'active');

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
          <ul className="mt-5 space-y-2">
            {passadas.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4"
              >
                <div>
                  <p className="font-semibold text-white">{t.title}</p>
                  <p className="text-xs text-slate-500">
                    {t.destination_label ? `${t.destination_label} · ` : ''}
                    {formatDate(t.starts_at)}
                    {t.ends_at ? ` — ${formatDate(t.ends_at)}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    check-in de {intervalToHours(t.checkin_interval)}h
                  </p>
                  <p className="text-xs font-semibold text-slate-400">
                    {rotuloStatus(t.status, t.state as SafetyState)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function rotuloStatus(status: string, state: SafetyState): string {
  if (state === 'resolved') return 'encerrada após incidente';
  return (
    {
      completed: 'concluída',
      cancelled: 'cancelada',
      paused: 'pausada',
      draft: 'rascunho',
    }[status] ?? status
  );
}
