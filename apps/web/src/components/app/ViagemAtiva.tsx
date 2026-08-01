'use client';

import { useActionState } from 'react';
import { CHECKIN_PRESETS, STATE_META, type SafetyState } from '@sentinela/shared';
import { encerrarViagem, ajustarIntervalo, type ActionState } from '@/app/(app)/viagens/actions';
import { intervalToHours, relativeTime, formatDateTime } from '@/lib/format';

export type ViagemRow = {
  id: string;
  title: string;
  destination_label: string | null;
  state: SafetyState;
  checkin_interval: string;
  grace_period: string;
  alert_delay: string;
  last_signal_at: string;
  expected_checkin_at: string;
  starts_at: string;
};

export function ViagemAtiva({ viagem }: { viagem: ViagemRow }) {
  const [fim, encerrar, encerrando] = useActionState<ActionState, FormData>(encerrarViagem, null);
  const [ajuste, ajustar, ajustando] = useActionState<ActionState, FormData>(ajustarIntervalo, null);

  const horas = intervalToHours(viagem.checkin_interval);
  const grace = intervalToHours(viagem.grace_period);
  const alerta = intervalToHours(viagem.alert_delay);
  const meta = STATE_META[viagem.state];

  const atrasada = new Date(viagem.expected_checkin_at).getTime() < Date.now();

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{viagem.title}</h2>
          {viagem.destination_label && (
            <p className="text-sm text-slate-500">{viagem.destination_label}</p>
          )}
          <p className="mt-1 text-xs text-slate-600">
            Começou em {formatDateTime(viagem.starts_at)}
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
            meta.light === 'red'
              ? 'border-red-800 bg-red-950/60 text-red-300'
              : meta.light === 'amber'
                ? 'border-amber-800 bg-amber-950/60 text-amber-300'
                : 'border-emerald-800 bg-emerald-950/60 text-emerald-300'
          }`}
        >
          {meta.label}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-400">{meta.description}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
          <p className="text-xs text-slate-500">Último sinal de vida</p>
          <p className="mt-0.5 text-sm font-semibold text-white">
            {relativeTime(viagem.last_signal_at)}
          </p>
        </div>
        <div
          className={`rounded-xl border px-4 py-3 ${
            atrasada ? 'border-amber-900 bg-amber-950/30' : 'border-slate-800 bg-slate-950'
          }`}
        >
          <p className="text-xs text-slate-500">Check-in esperado até</p>
          <p
            className={`mt-0.5 text-sm font-semibold ${atrasada ? 'text-amber-300' : 'text-white'}`}
          >
            {formatDateTime(viagem.expected_checkin_at)}
            {atrasada ? ' · vencido' : ''}
          </p>
        </div>
      </div>

      {/* Tradução das regras para linguagem natural. Se o usuário não entende
          exatamente o que vai acontecer, ele não confia — e não paga. */}
      <div className="mt-4 rounded-xl border-l-2 border-teal-500 bg-slate-800/40 px-4 py-3">
        <p className="text-sm leading-relaxed text-slate-300">
          Se você ficar <strong className="text-teal-400">{horas}h</strong> sem dar sinal de vida,
          avisamos <strong className="text-teal-400">só você</strong>. Passadas mais{' '}
          <strong className="text-teal-400">{grace}h</strong> sem resposta, insistimos por push e
          SMS. Se ainda assim nada acontecer em{' '}
          <strong className="text-teal-400">{alerta}h</strong>, seus contatos de emergência recebem
          o Dossiê.
        </p>
      </div>

      <form action={ajustar} className="mt-6">
        <input type="hidden" name="session_id" value={viagem.id} />
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Ajustar intervalo
        </p>
        <div className="flex flex-wrap gap-2">
          {CHECKIN_PRESETS.map((p) => (
            <button
              key={p.hours}
              type="submit"
              name="checkin_hours"
              value={p.hours}
              disabled={ajustando}
              className={`rounded-lg border px-3.5 py-2 text-sm transition disabled:opacity-50 ${
                p.hours === horas
                  ? 'border-teal-600 bg-slate-800 font-semibold text-white'
                  : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {ajuste && (
          <p className={`mt-2 text-xs ${ajuste.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {ajuste.message}
          </p>
        )}
      </form>

      <form action={encerrar} className="mt-7 border-t border-slate-800 pt-5">
        <input type="hidden" name="session_id" value={viagem.id} />
        <button
          type="submit"
          disabled={encerrando}
          className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-red-800 hover:text-red-300 disabled:opacity-50"
        >
          {encerrando ? 'Encerrando…' : 'Encerrar viagem'}
        </button>
        <p className="mt-2 text-xs text-slate-600">
          O cronômetro para e nenhum alerta é disparado. Seu histórico e os quilômetros continuam
          no diário.
        </p>
        {fim && !fim.ok && <p className="mt-2 text-xs text-red-400">{fim.message}</p>}
      </form>
    </div>
  );
}
