'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';

type Mode = 'login' | 'cadastro';

/**
 * Autenticação por link mágico — mesmo método do app mobile.
 *
 * Sem senha por decisão de produto: o Sentinela guarda dado médico e histórico
 * de localização. Senha reusada de outro site é o vetor mais provável de
 * vazamento desse conjunto, e um fluxo de "esqueci minha senha" por e-mail tem
 * exatamente a mesma superfície de ataque do link mágico — só que com um hash
 * a mais para vazar.
 */
export function MagicLinkForm({ mode, next }: { mode: Mode; next: string }) {
  const isSignup = mode === 'cadastro';

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createBrowserClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        // No /login isto PRECISA ser false. Com true, um e-mail digitado errado
        // cria uma conta órfã silenciosamente e o dono do endereço nunca entra.
        shouldCreateUser: isSignup,
        // Vai para raw_user_meta_data e é lido pelo trigger tg_handle_new_user
        // ao criar a linha em public.profiles.
        data: isSignup ? { full_name: fullName.trim() } : undefined,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setBusy(false);
    if (authError) setError(translateAuthError(authError.message, isSignup));
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-white">Link enviado</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Abra o e-mail em <span className="font-semibold text-slate-200">{email}</span> e clique no
          link para entrar. Ele expira em 1 hora e só funciona uma vez.
        </p>
        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          Abra o link neste mesmo navegador — a validação usa uma chave temporária guardada aqui.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-5 text-sm font-semibold text-teal-400 transition hover:text-teal-300"
        >
          Usar outro e-mail
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isSignup && (
        <Field label="Nome completo">
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            placeholder="Como devemos te chamar"
            className={inputClass}
          />
        </Field>
      )}

      <Field label="E-mail">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          placeholder="voce@email.com"
          className={inputClass}
        />
      </Field>

      {isSignup && (
        <label className="flex items-start gap-3 text-xs leading-relaxed text-slate-400">
          <input
            type="checkbox"
            required
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-700 bg-slate-900 accent-teal-500"
          />
          <span>
            Li e aceito os{' '}
            <Link href="/termos" className="text-teal-400 hover:text-teal-300">
              Termos de Uso
            </Link>{' '}
            e a{' '}
            <Link href="/privacidade" className="text-teal-400 hover:text-teal-300">
              Política de Privacidade
            </Link>
            . O app coleta localização em segundo plano — você pode desativar e apagar tudo a
            qualquer momento.
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !email || (isSignup && (!fullName || !accepted))}
        className="w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Enviando…' : isSignup ? 'Criar conta' : 'Receber link de acesso'}
      </button>
    </form>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * O supabase-js devolve mensagem em inglês e sem contexto de produto.
 * O caso de `shouldCreateUser: false` é o mais importante: "Signups not allowed
 * for otp" na verdade significa "esse e-mail não tem conta".
 *
 * O fallback NÃO engole mais a mensagem original. A primeira versão devolvia só
 * "tente novamente em instantes" para qualquer erro desconhecido — e o erro
 * desconhecido mais comum é justamente o mais fácil de corrigir: falha de rede
 * porque `NEXT_PUBLIC_SUPABASE_URL` ainda está com o valor placeholder. Uma
 * mensagem genérica ali transforma um problema de configuração de 30 segundos
 * numa sessão inteira de depuração às cegas.
 */
function translateAuthError(message: string, isSignup: boolean): string {
  const m = message.toLowerCase();

  if (m.includes('signups not allowed')) {
    return 'Não encontramos uma conta com esse e-mail. Confira a digitação ou crie sua conta.';
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Esse e-mail já tem conta. Use a página de entrar.';
  }
  if (m.includes('rate limit') || m.includes('for security purposes')) {
    return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
  }
  if (m.includes('invalid') && m.includes('email')) {
    return 'E-mail inválido.';
  }

  // "Failed to fetch" / "Load failed": o navegador nem chegou ao Supabase.
  // Não adianta pedir para tentar de novo — a URL ou a chave estão erradas.
  if (m.includes('failed to fetch') || m.includes('load failed') || m.includes('networkerror')) {
    return `Não conseguimos falar com o servidor de autenticação (${supabaseHost() ?? 'URL não configurada'}). Confira NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local.`;
  }

  const base = isSignup
    ? 'Não foi possível criar a conta agora.'
    : 'Não foi possível enviar o link agora.';
  return `${base} (${message})`;
}

function supabaseHost(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
  } catch {
    return null;
  }
}
