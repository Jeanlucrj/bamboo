import type { Metadata } from 'next';
import Link from 'next/link';
import { MagicLinkForm } from '@/components/auth/MagicLinkForm';
import { safeNextPath } from '@/lib/auth/nextPath';

export const metadata: Metadata = {
  title: 'Entrar',
  robots: { index: false, follow: false },
};

const CALLBACK_ERRORS: Record<string, string> = {
  link_invalido: 'Esse link não é válido. Peça um novo abaixo.',
  link_expirado: 'O link expirou ou já foi usado. Peça um novo abaixo.',
  falha: 'Não conseguimos concluir o login. Tente novamente.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const { next, erro } = await searchParams;
  const target = safeNextPath(next);
  const message = erro ? (CALLBACK_ERRORS[erro] ?? CALLBACK_ERRORS.falha) : null;

  return (
    <>
      <h1 className="text-2xl font-bold text-white">Entrar</h1>
      <p className="mt-2 text-sm text-slate-400">
        Enviamos um link de acesso para o seu e-mail. Sem senha.
      </p>

      {message && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-amber-900 bg-amber-950/60 px-3 py-2 text-sm text-amber-200"
        >
          {message}
        </p>
      )}

      <div className="mt-6">
        <MagicLinkForm mode="login" next={target} />
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Ainda não tem conta?{' '}
        <Link
          href={`/cadastro?next=${encodeURIComponent(target)}`}
          className="font-semibold text-teal-400 transition hover:text-teal-300"
        >
          Criar conta grátis
        </Link>
      </p>
    </>
  );
}
