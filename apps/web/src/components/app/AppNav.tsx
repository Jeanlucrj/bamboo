'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/dashboard', label: 'Início', icon: '🏠' },
  { href: '/viagens', label: 'Viagens', icon: '🧭' },
  { href: '/diario', label: 'Diário de Bordo', icon: '📖' },
  { href: '/contatos', label: 'Contatos', icon: '👥' },
  { href: '/conta', label: 'Conta & Dossiê', icon: '⚙️' },
] as const;

export function AppNav() {
  const pathname = usePathname() ?? '';

  return (
    <nav className="mx-auto flex max-w-6xl items-center gap-1.5 overflow-x-auto px-6 pb-2 pt-1">
      {ITEMS.map(({ href, label, icon }) => {
        const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 ${
              active
                ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-300 border border-teal-500/40 shadow-lg shadow-teal-500/10'
                : 'border border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900/60 hover:text-slate-200'
            }`}
          >
            <span className="text-sm transition-transform duration-200 group-hover:scale-110">{icon}</span>
            <span>{label}</span>
            {active && (
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shadow-sm shadow-teal-400" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
