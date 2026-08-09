import Link from 'next/link';
import { LogoCompleta } from '@/components/ui/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <header className="border-b border-slate-800/80">
        <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
          <Link href="/" className="transition-opacity hover:opacity-90">
            <LogoCompleta size={26} />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      <footer className="px-6 pb-8">
        <p className="mx-auto max-w-sm text-center text-xs leading-relaxed text-slate-600">
          O Sentinela é uma ferramenta de apoio e não substitui serviços oficiais de emergência.
        </p>
      </footer>
    </div>
  );
}
