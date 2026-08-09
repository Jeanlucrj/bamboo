'use client';

import { useState } from 'react';
import { LogoCompleta } from '@/components/ui/Logo';
import { BotaoWhatsApp } from '@/components/marketing/BotaoWhatsApp';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppHandoff } from '@/components/device/AppHandoff';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

/**
 * Layout de marketing — header glassmorphism com mobile menu,
 * footer com gradient divider.
 */
export default function MarketingShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? '';

  const navLinks = [
    { href: '/#como-funciona', label: 'Como funciona' },
    { href: '/#recursos', label: 'Recursos' },
    { href: '/precos', label: 'Preços' },
    { href: '/para-empresas', label: 'Para empresas' },
  ];

  return (
    <div className="ambient-bg min-h-screen bg-[#070b14] text-slate-100 antialiased transition-colors duration-300">
      <AppHandoff />

      {/* Header glassmorphism */}
      <header className="sticky top-0 z-50 border-b border-slate-800/40 bg-[#070b14]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="transition-opacity hover:opacity-90">
            <LogoCompleta size={26} />
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map(({ href, label }) => {
              const active = href === pathname || (href.startsWith('/') && !href.startsWith('/#') && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`group relative text-sm transition-colors duration-300 ${
                    active ? 'text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                  <span className={`absolute -bottom-1 left-0 h-0.5 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300 ${
                    active ? 'w-full' : 'w-0 group-hover:w-full'
                  }`} />
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <Link href="/login" className="hidden text-sm text-slate-300 transition-colors hover:text-white sm:block">
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="glow-btn rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:from-teal-500 hover:to-teal-400"
            >
              Começar grátis
            </Link>

            {/* Hamburger button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="relative z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/50 text-slate-300 backdrop-blur-sm transition-colors hover:border-slate-600/50 hover:text-white md:hidden"
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileOpen}
            >
              <div className="flex h-4 w-4 flex-col items-center justify-center gap-[5px]">
                <span className={`h-[1.5px] w-4 rounded-full bg-current transition-all duration-300 ${mobileOpen ? 'translate-y-[3.25px] rotate-45' : ''}`} />
                <span className={`h-[1.5px] w-4 rounded-full bg-current transition-all duration-300 ${mobileOpen ? '-translate-y-[3.25px] -rotate-45' : ''}`} />
              </div>
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        <div className={`overflow-hidden border-t border-slate-800/40 bg-[#070b14]/95 backdrop-blur-xl transition-all duration-300 md:hidden ${
          mobileOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="space-y-1 px-6 py-4">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-slate-800/50 hover:text-white"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      {/* Fica no layout, não em cada página: assim acompanha o visitante por
          Home, Preços e Para empresas sem repetição — e some sozinho dentro do
          painel, que usa outro layout. */}
      <BotaoWhatsApp />

      <footer className="relative border-t border-slate-800/40 bg-[#070b14] pt-1">
        {/* Gradient divider */}
        <div className="gradient-divider" />

        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-14 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <LogoCompleta size={26} />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
              Segurança e memórias para quem viaja sozinho.
            </p>
          </div>

          <FooterCol
            title="Produto"
            links={[
              ['Como funciona', '/#como-funciona'],
              ['Preços', '/precos'],
              ['Para empresas', '/para-empresas'],
            ]}
          />
          <FooterCol
            title="Confiança"
            links={[
              ['Segurança e LGPD', '/seguranca'],
              ['Política de Privacidade', '/privacidade'],
              ['Termos de Uso', '/termos'],
            ]}
          />
          <FooterCol
            title="Contato"
            links={[
              ['Suporte', 'mailto:suporte@sentinela.app'],
              ['Vendas B2B', 'mailto:vendas@sentinela.app'],
            ]}
          />
        </div>

        <p className="mx-auto mt-2 max-w-6xl border-t border-slate-800/30 px-6 py-6 text-xs leading-relaxed text-slate-600">
          O Sentinela é uma ferramenta de apoio e não substitui serviços oficiais de emergência.
          Em caso de risco imediato, acione as autoridades locais.
        </p>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-sm text-slate-500 transition-colors duration-200 hover:text-slate-300">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
