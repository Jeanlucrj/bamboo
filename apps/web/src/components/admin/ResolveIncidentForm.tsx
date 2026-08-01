'use client';

import { useActionState, useState } from 'react';
import { resolveIncident, type ResolveState } from '@/app/(admin)/admin/incidentes/actions';

export function ResolveIncidentForm({
  alertId, travelerName, canWrite,
}: {
  alertId: string;
  travelerName: string;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ResolveState, FormData>(resolveIncident, null);

  if (!canWrite) {
    return (
      <span className="text-xs text-slate-600" title="Requer papel de administrador">
        somente leitura
      </span>
    );
  }

  if (state?.ok) {
    return <span className="text-xs font-semibold text-emerald-400">encerrado</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="whitespace-nowrap rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
      >
        Encerrar
      </button>
    );
  }

  return (
    <form action={action} className="w-64 space-y-2">
      <input type="hidden" name="alert_id" value={alertId} />
      <textarea
        name="note"
        required
        minLength={10}
        rows={3}
        placeholder={`Por que o incidente de ${travelerName} está sendo encerrado?`}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-teal-600"
      />
      {state && !state.ok && <p className="text-xs text-red-400">{state.message}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? 'Encerrando…' : 'Confirmar'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
