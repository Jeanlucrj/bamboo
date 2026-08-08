'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

/**
 * "Está tudo bem" — encerra o alerta a partir do link público.
 *
 * Confirmação em dois passos de propósito: encerrar por engano faria os
 * outros contatos pararem de procurar. Custa um clique a mais e evita um
 * erro irreversível.
 */
export function ResolveButton({
  token,
  travelerName,
}: {
  token: string;
  travelerName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve() {
    setBusy(true);
    setError(null);
    const supabase = createBrowserClient();
    const { error } = await supabase.rpc('resolve_alert_by_token', {
      p_token: token,
      p_note: note || `Contato confirmou que ${travelerName} está bem.`,
    });
    setBusy(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
      >
        Está tudo bem — encerrar alerta
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={`Ex.: falei com ${travelerName} por telefone, ficou sem sinal na trilha.`}
        rows={3}
        className="w-full rounded-xl border border-emerald-800/70 bg-slate-950/60 p-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-600"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800/60"
        >
          Cancelar
        </button>
        <button
          onClick={resolve}
          disabled={busy}
          className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
        >
          {busy ? 'Encerrando…' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
}
