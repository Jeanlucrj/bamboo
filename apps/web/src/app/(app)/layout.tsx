import Link from 'next/link';
import { AppHandoff } from '@/components/device/AppHandoff';
import { AppNav } from '@/components/app/AppNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ambient-bg relative min-h-screen bg-[#070b14] text-slate-100 antialiased selection:bg-teal-500/30 selection:text-teal-200">
      {/* Background grid overlay */}
      <div className="bg-grid-pattern pointer-events-none fixed inset-0 opacity-40 z-0" />

      <div className="relative z-10">
        <AppHandoff />

        <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#070b14]/80 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="group flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 p-0.5 shadow-lg shadow-teal-500/20 transition-transform group-hover:scale-105">
                  <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#070b14] text-teal-400 font-bold text-base">
                    🛡️
                  </div>
                </div>
                <div>
                  <span className="gradient-heading text-lg font-black tracking-widest">SENTINELA</span>
                  <span className="block text-[10px] font-semibold tracking-wider text-teal-400/80 uppercase">Solo Travel Guardian</span>
                </div>
              </Link>

              <span className="hidden items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-950/40 px-2.5 py-0.5 text-[11px] font-semibold text-teal-300 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
                SISTEMA OPERACIONAL
              </span>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />

              <form action="/auth/sair" method="post">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3.5 py-1.5 text-xs font-semibold text-slate-400 transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25" />
                  </svg>
                  Sair
                </button>
              </form>
            </div>
          </div>

          <AppNav />
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
