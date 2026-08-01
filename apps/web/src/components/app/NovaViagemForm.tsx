'use client';

import { useActionState, useState } from 'react';
import { CHECKIN_PRESETS } from '@sentinela/shared';
import { criarViagem, type ActionState } from '@/app/(app)/viagens/actions';

export function NovaViagemForm({ bloqueada }: { bloqueada: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [horas, setHoras] = useState(24);
  const [state, action, pending] = useActionState<ActionState, FormData>(criarViagem, null);

  if (bloqueada) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4 text-sm text-slate-500">
        Encerre a viagem atual para começar outra. Duas viagens ativas ao mesmo tempo criariam dois
        cronômetros independentes — e dois alarmes.
      </p>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-500"
      >
        Nova viagem
      </button>
    );
  }

  return (
    <form action={action} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7">
      <h2 className="text-lg font-bold text-white">Nova viagem</h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Nome da viagem
          </span>
          <input
            name="title"
            required
            minLength={2}
            maxLength={120}
            placeholder="Sudeste asiático"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Destino (opcional)
          </span>
          <input
            name="destination_label"
            maxLength={160}
            placeholder="Vietnã e Camboja"
            className={inputClass}
          />
        </label>
      </div>

      <fieldset className="mt-6">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Se eu ficar sem dar sinal por
        </legend>
        <input type="hidden" name="checkin_hours" value={horas} />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CHECKIN_PRESETS.map((p) => (
            <button
              key={p.hours}
              type="button"
              onClick={() => setHoras(p.hours)}
              aria-pressed={p.hours === horas}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                p.hours === horas
                  ? 'border-teal-600 bg-slate-800'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              }`}
            >
              <span className="block text-sm font-semibold text-white">{p.label}</span>
              <span className="block text-xs text-slate-500">{p.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 space-y-3">
        <Toggle
          name="gps_tracking_enabled"
          defaultChecked
          title="GPS em segundo plano"
          hint="Ping discreto por deslocamento ou a cada 4 h. Menos de 2% de bateria por dia."
        />
        <Toggle
          name="passive_checkin_enabled"
          defaultChecked
          title="Check-in passivo por deslocamento"
          hint="Se o celular se afastar mais de 150 m, o cronômetro zera sozinho."
        />
      </div>

      <div className="mt-6 rounded-xl border border-amber-900/60 bg-amber-950/30 px-4 py-3">
        <p className="text-sm font-semibold text-amber-200">O monitoramento começa no celular</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-200/70">
          A viagem é criada agora, mas nenhum sinal de vida existe até você abrir o app no celular.
          Até lá o cronômetro corre e o alarme pode disparar sem que nada esteja errado.
        </p>
      </div>

      {state && (
        <p
          role="alert"
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            state.ok
              ? 'border-emerald-900 bg-emerald-950/50 text-emerald-300'
              : 'border-red-900 bg-red-950/50 text-red-300'
          }`}
        >
          {state.message}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:opacity-50"
        >
          {pending ? 'Criando…' : 'Iniciar viagem'}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-sm text-slate-500 transition hover:text-slate-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-teal-600';

function Toggle({
  name, title, hint, defaultChecked,
}: { name: string; title: string; hint: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-700 bg-slate-900 accent-teal-500"
      />
      <span>
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="block text-xs leading-relaxed text-slate-500">{hint}</span>
      </span>
    </label>
  );
}
