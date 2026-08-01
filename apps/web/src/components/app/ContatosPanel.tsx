'use client';

import { useActionState, useState } from 'react';
import { salvarContato, removerContato, type ActionState } from '@/app/(app)/contatos/actions';

export type ContatoRow = {
  id: string;
  full_name: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  preferred_channel: 'email' | 'sms' | 'whatsapp' | 'push';
  priority: number;
  is_verified: boolean;
};

const CANAIS = [
  { id: 'email', label: 'E-mail' },
  { id: 'sms', label: 'SMS' },
  { id: 'whatsapp', label: 'WhatsApp' },
] as const;

export function ContatosPanel({ contatos }: { contatos: ContatoRow[] }) {
  const [aberto, setAberto] = useState(contatos.length === 0);
  const [canal, setCanal] = useState<string>('email');
  const [state, action, pending] = useActionState<ActionState, FormData>(salvarContato, null);
  const [rmState, remover] = useActionState<ActionState, FormData>(removerContato, null);

  return (
    <div className="space-y-6">
      {contatos.length > 0 ? (
        <ul className="space-y-2">
          {[...contatos]
            .sort((a, b) => a.priority - b.priority)
            .map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
                    {c.full_name}
                    <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                      {c.priority === 1 ? 'avisado primeiro' : `${c.priority}º`}
                    </span>
                    {!c.is_verified && (
                      <span
                        className="rounded-full border border-amber-800 bg-amber-950/50 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
                        title="O contato ainda não confirmou o canal"
                      >
                        não verificado
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {c.relationship ? `${c.relationship} · ` : ''}
                    {[c.email, c.phone].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-xs text-slate-600">
                    Acionado por {CANAIS.find((x) => x.id === c.preferred_channel)?.label ?? c.preferred_channel}
                  </p>
                </div>

                <form action={remover}>
                  <input type="hidden" name="contact_id" value={c.id} />
                  <button
                    type="submit"
                    className="text-xs font-semibold text-slate-500 transition hover:text-red-400"
                  >
                    Remover
                  </button>
                </form>
              </li>
            ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 px-5 py-4">
          <p className="text-sm font-semibold text-amber-200">Nenhum contato de emergência</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-200/70">
            Sem contato cadastrado, o alarme dispara e não há para quem avisar. O Dossiê de
            Emergência não tem destinatário.
          </p>
        </div>
      )}

      {rmState && !rmState.ok && <p className="text-sm text-red-400">{rmState.message}</p>}

      {aberto ? (
        <form action={action} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7">
          <h2 className="text-lg font-bold text-white">Novo contato</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo">
              <input name="full_name" required minLength={2} maxLength={120} className={input} />
            </Field>
            <Field label="Relação (opcional)">
              <input name="relationship" maxLength={60} placeholder="Mãe, irmão, amiga…" className={input} />
            </Field>
            <Field label="E-mail">
              <input name="email" type="email" placeholder="ana@email.com" className={input} />
            </Field>
            <Field
              label="Telefone"
              hint="Formato internacional com código do país: +5511999999999"
            >
              <input name="phone" placeholder="+5511999999999" className={input} />
            </Field>
          </div>

          <fieldset className="mt-6">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Como avisar esta pessoa
            </legend>
            <input type="hidden" name="preferred_channel" value={canal} />
            <div className="flex flex-wrap gap-2">
              {CANAIS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCanal(c.id)}
                  aria-pressed={canal === c.id}
                  className={`rounded-lg border px-4 py-2 text-sm transition ${
                    canal === c.id
                      ? 'border-teal-600 bg-slate-800 font-semibold text-white'
                      : 'border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-600">
              SMS e WhatsApp exigem telefone preenchido.
            </p>
          </fieldset>

          <Field label="Ordem de acionamento" hint="1 é avisado primeiro">
            <input
              name="priority"
              type="number"
              min={1}
              max={10}
              defaultValue={contatos.length + 1}
              className={`${input} max-w-28`}
            />
          </Field>

          {/* Sem isso o contato descobre que é contato de emergência no pior
              momento possível: recebendo um alerta de que alguém sumiu. */}
          <div className="mt-6 rounded-xl border-l-2 border-teal-500 bg-slate-800/40 px-4 py-3">
            <p className="text-sm font-semibold text-white">Avise essa pessoa</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Ela só será acionada se você ficar sem dar sinal de vida além do combinado. Vale
              mandar uma mensagem contando — quem não sabe que é contato de emergência costuma
              ignorar a notificação achando que é golpe.
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
              {pending ? 'Salvando…' : 'Salvar contato'}
            </button>
            {contatos.length > 0 && (
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="text-sm text-slate-500 hover:text-slate-300"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-500"
        >
          Adicionar contato
        </button>
      )}
    </div>
  );
}

const input =
  'w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-teal-600';

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-600">{hint}</span>}
    </label>
  );
}
