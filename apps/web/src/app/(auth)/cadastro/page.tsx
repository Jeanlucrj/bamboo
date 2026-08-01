import type { Metadata } from 'next';
import Link from 'next/link';
import { MagicLinkForm } from '@/components/auth/MagicLinkForm';
import { safeNextPath } from '@/lib/auth/nextPath';

export const metadata: Metadata = {
  title: 'Criar conta',
  robots: { index: false, follow: false },
};

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = safeNextPath(next);

  return (
    <>
      <h1 className="text-2xl font-bold text-white">Criar conta</h1>
      <p className="mt-2 text-sm text-slate-400">
        30 dias grátis. Sem cartão de crédito.
      </p>

      <div className="mt-6">
        <MagicLinkForm mode="cadastro" next={target} />
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Já tem conta?{' '}
        <Link
          href={`/login?next=${encodeURIComponent(target)}`}
          className="font-semibold text-teal-400 transition hover:text-teal-300"
        >
          Entrar
        </Link>
      </p>
    </>
  );
}
