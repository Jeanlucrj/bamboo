'use client';

import { useActionState, useState } from 'react';
import { PAISES } from '@sentinela/shared';
import {
  salvarPerfil, salvarDossie, apagarMeusDados, type ActionState,
} from '@/app/(app)/conta/actions';

const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export type PerfilRow = {
  full_name: string;
  phone: string | null;
  home_country: string | null;
};

export type DossieRow = {
  blood_type: string | null;
  allergies: string | null;
  medications: string | null;
  medical_conditions: string | null;
  passport_masked: string | null;
  insurance_provider: string | null;
  insurance_policy: string | null;
  additional_notes: string | null;
} | null;

export function PerfilForm({ perfil }: { perfil: PerfilRow }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(salvarPerfil, null);

  return (
    <form action={action} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7">
      <h2 className="text-lg font-bold text-white">Seus dados</h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo">
          <input name="full_name" required defaultValue={perfil.full_name} className={input} />
        </Field>
        <Field label="Telefone" hint="Usado para o SMS de aviso antes do alerta">
          <input name="phone" defaultValue={perfil.phone ?? ''} placeholder="+5511999999999" className={input} />
        </Field>
        {/* Era um campo de texto de duas letras com a dica "BR, PT, US…".
            Isso obriga a pessoa a saber o código ISO do próprio país, e aceita
            qualquer coisa: "Brasil" digitado por extenso passava e virava
            bandeira em branco na tela. A lista resolve os dois. */}
        <Field label="País de origem">
          <select
            name="home_country"
            defaultValue={perfil.home_country ?? ''}
            className={input}
          >
            <option value="">Não informado</option>
            {PAISES.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.nome}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Feedback state={state} />

      <button type="submit" disabled={pending} className={primary}>
        {pending ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  );
}

export function DossieForm({ dossie }: { dossie: DossieRow }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(salvarDossie, null);

  return (
    <form action={action} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7">
      <h2 className="text-lg font-bold text-white">Dossiê de emergência</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        O que o socorrista precisa saber se você não puder falar. Fica invisível para todo mundo —
        inclusive para nós e para o gestor da sua organização — até um alerta abrir.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Tipo sanguíneo">
          <select name="blood_type" defaultValue={dossie?.blood_type ?? ''} className={input}>
            <option value="">Não informado</option>
            {TIPOS_SANGUINEOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Passaporte" hint="Só os 4 últimos dígitos — nunca o número inteiro">
          <input
            name="passport_masked"
            maxLength={8}
            defaultValue={dossie?.passport_masked ?? ''}
            placeholder="••••1234"
            className={input}
          />
        </Field>
      </div>

      <Field label="Alergias">
        <textarea name="allergies" rows={2} maxLength={500} defaultValue={dossie?.allergies ?? ''}
          placeholder="Penicilina, frutos do mar…" className={input} />
      </Field>

      <Field label="Medicamentos em uso">
        <textarea name="medications" rows={2} maxLength={500} defaultValue={dossie?.medications ?? ''}
          placeholder="Nome, dose e frequência" className={input} />
      </Field>

      <Field label="Condições médicas">
        <textarea name="medical_conditions" rows={2} maxLength={1000}
          defaultValue={dossie?.medical_conditions ?? ''}
          placeholder="Diabetes, epilepsia, marca-passo…" className={input} />
      </Field>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Seguro viagem">
          <input name="insurance_provider" maxLength={120}
            defaultValue={dossie?.insurance_provider ?? ''} className={input} />
        </Field>
        <Field label="Número da apólice">
          <input name="insurance_policy" maxLength={80}
            defaultValue={dossie?.insurance_policy ?? ''} className={input} />
        </Field>
      </div>

      <Field label="Observações">
        <textarea name="additional_notes" rows={2} maxLength={1000}
          defaultValue={dossie?.additional_notes ?? ''}
          placeholder="Idiomas que fala, contato do seu médico…" className={input} />
      </Field>

      <Feedback state={state} />

      <button type="submit" disabled={pending} className={primary}>
        {pending ? 'Salvando…' : 'Salvar dossiê'}
      </button>
    </form>
  );
}

export function ZonaDePerigo() {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(apagarMeusDados, null);

  return (
    <div className="rounded-2xl border border-red-900/60 bg-red-950/20 p-7">
      <h2 className="text-lg font-bold text-white">Apagar meus dados</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Remove viagens, histórico de localização, sinais, contatos e dossiê médico. É imediato e
        não tem desfazer.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        A conta de acesso em si não é removida por aqui: apagá-la exige uma chave de administração
        que não pode existir num caminho acionável pelo navegador. Sem os dados ela fica vazia; para
        a remoção definitiva, fale com o suporte.
      </p>

      {!aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="mt-5 rounded-xl border border-red-800 px-5 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-950/50"
        >
          Quero apagar
        </button>
      ) : state?.ok ? (
        <p className="mt-5 rounded-lg border border-emerald-900 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
          {state.message}
        </p>
      ) : (
        <form action={action} className="mt-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Digite APAGAR para confirmar
            </span>
            <input name="confirmacao" required placeholder="APAGAR" className={`${input} max-w-56`} />
          </label>

          {state && !state.ok && <p className="mt-3 text-sm text-red-400">{state.message}</p>}

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {pending ? 'Apagando…' : 'Apagar definitivamente'}
            </button>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="text-sm text-slate-500 hover:text-slate-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const input =
  'w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-teal-600';

const primary =
  'mt-6 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:opacity-50';

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

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
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
  );
}
