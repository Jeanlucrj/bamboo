import type { Metadata } from 'next';
import Link from 'next/link';
import { PLATFORM_ROLE_META } from '@sentinela/shared';
import { requireAdmin } from '@/lib/admin/guard';

export const metadata: Metadata = {
  title: 'Administração',
  // Painel interno nunca entra em índice de busca.
  robots: { index: false, follow: false, nocache: true },
};

const NAV = [
  ['/admin', 'Visão geral'],
  ['/admin/incidentes', 'Incidentes'],
  ['/admin/dispositivos', 'Dispositivos'],
  ['/admin/usuarios', 'Usuários'],
  ['/admin/auditoria', 'Auditoria'],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, user } = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800/40 bg-slate-900/30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm font-extrabold tracking-[0.2em]">
              <span className="gradient-text">SENTINELA</span>
            </Link>
            <span className="rounded-full border border-red-800/40 bg-red-950/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300 animate-pulse">
              Interno
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span title={PLATFORM_ROLE_META[role].description}>
              {user.email} · {PLATFORM_ROLE_META[role].label}
            </span>
            <form action="/auth/sair" method="post">
              <button type="submit" className="transition hover:text-white">
                Sair
              </button>
            </form>
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-6">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="whitespace-nowrap border-b-2 border-transparent py-3 text-sm text-slate-400 transition-all duration-300 hover:border-teal-500/50 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>

      <footer className="mx-auto max-w-7xl px-6 pb-10">
        <p className="text-xs leading-relaxed text-slate-600">
          Toda busca de usuário e toda ação de escrita ficam registradas em{' '}
          <Link href="/admin/auditoria" className="text-slate-500 underline">
            Auditoria
          </Link>
          , com seu e-mail. O dossiê médico não é acessível por este painel — nem por
          superadministrador.
        </p>
      </footer>
    </div>
  );
}
