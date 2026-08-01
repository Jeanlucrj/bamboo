import Link from 'next/link';

export type Tone = 'ok' | 'warn' | 'bad' | 'neutral';

const TONE_STYLES: Record<Tone, { card: string; dot: string; glow: string }> = {
  ok: {
    card: 'border-emerald-800/40 bg-emerald-950/20 text-emerald-300',
    dot: 'bg-emerald-500',
    glow: '0 0 12px rgba(16,185,129,0.2)',
  },
  warn: {
    card: 'border-amber-800/40 bg-amber-950/20 text-amber-300',
    dot: 'bg-amber-500',
    glow: '0 0 12px rgba(245,158,11,0.2)',
  },
  bad: {
    card: 'border-red-800/40 bg-red-950/20 text-red-300',
    dot: 'bg-red-500',
    glow: '0 0 12px rgba(239,68,68,0.2)',
  },
  neutral: {
    card: 'border-slate-700/30 bg-slate-900/40 text-slate-300',
    dot: 'bg-slate-600',
    glow: 'none',
  },
};

export function Card({
  title, children, action,
}: {
  title: string;
  children: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <section className="glass-card rounded-2xl p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
        {action && (
          <Link href={action.href} className="text-xs text-teal-400 transition-colors hover:text-teal-300">
            {action.label}
          </Link>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/**
 * KPI com tom semântico, glassmorphism e ícone.
 */
export function Kpi({
  label, value, hint, tone = 'neutral', icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
  icon?: string;
}) {
  const t = TONE_STYLES[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border px-5 py-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 ${t.card}`}
      style={{ boxShadow: t.glow }}
    >
      {/* Decorative gradient corner */}
      {tone !== 'neutral' && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20 blur-xl"
          style={{
            backgroundColor: tone === 'ok' ? '#10B981' : tone === 'warn' ? '#F59E0B' : '#EF4444',
          }}
        />
      )}

      <div className="relative flex items-start justify-between gap-2">
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="mt-1 text-xs font-semibold">{label}</p>
          {hint && <p className="mt-1.5 text-[11px] leading-snug opacity-70">{hint}</p>}
        </div>
        {icon && <span className="text-xl opacity-60">{icon}</span>}
      </div>
    </div>
  );
}

export function Row({
  label, value, tone = 'neutral', hint,
}: {
  label: string;
  value: string | number;
  tone?: Tone;
  hint?: string;
}) {
  const t = TONE_STYLES[tone];

  return (
    <li className="flex items-start justify-between gap-4 border-b border-slate-800/40 py-3 transition-colors duration-200 last:border-0 hover:bg-slate-800/10">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${t.dot} ${tone !== 'neutral' ? 'animate-dot-pulse' : ''}`} />
        <div className="min-w-0">
          <p className="text-sm text-slate-300">{label}</p>
          {hint && <p className="text-xs text-slate-600">{hint}</p>}
        </div>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-200">{value}</span>
    </li>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="glass-card rounded-xl px-4 py-6 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}

export function Table({
  head, children,
}: {
  head: readonly string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800/40 bg-slate-900/30 backdrop-blur-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-700/50">
            {head.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40">{children}</tbody>
      </table>
    </div>
  );
}

export function ago(iso: string | null | undefined): string {
  if (!iso) return '—';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}min`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}
