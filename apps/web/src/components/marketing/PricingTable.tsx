'use client';

import Link from 'next/link';
import { pricing } from '@/content/landing';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function PricingTable() {
  return (
    <section id="precos" className="relative border-b border-slate-800/50 bg-slate-900/20 py-28">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {pricing.title}
          </h2>
        </ScrollReveal>

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {pricing.plans.map((p, i) => (
            <ScrollReveal key={p.id} delay={i * 120}>
              <div
                className={[
                  'group relative flex h-full flex-col rounded-2xl p-8 transition-all duration-300',
                  p.highlight
                    ? 'glass-card border-teal-500/40 bg-slate-950/80 shadow-glow-teal hover:shadow-glow-teal-lg hover:-translate-y-2'
                    : 'glass-card hover:border-slate-600/50 hover:-translate-y-1',
                ].join(' ')}
              >
                {/* Gradient top accent for highlighted */}
                {p.highlight && (
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl"
                    style={{ background: 'var(--gradient-teal)' }}
                  />
                )}

                {/* Badge com shimmer */}
                {'badge' in p && p.badge ? (
                  <span className="absolute -top-3.5 left-8 rounded-full bg-gradient-to-r from-teal-600 to-teal-400 px-4 py-1.5 text-xs font-bold text-white shadow-glow-teal shimmer">
                    {p.badge}
                  </span>
                ) : null}

                <h3 className="text-lg font-bold text-white">{p.name}</h3>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className={`text-4xl font-extrabold tracking-tight ${p.highlight ? 'gradient-text' : 'text-white'}`}>
                    {p.price}
                  </span>
                  <span className="text-sm text-slate-500">{p.period}</span>
                </div>

                <ul className="mt-9 flex-1 space-y-3.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-3 text-[15px] text-slate-300">
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                        p.highlight
                          ? 'bg-teal-500/20 text-teal-400'
                          : 'bg-slate-700/50 text-slate-400'
                      }`}>
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={p.id === 'organizacao' ? '/para-empresas' : '/cadastro'}
                  className={[
                    'glow-btn mt-9 rounded-xl px-6 py-3.5 text-center text-sm font-semibold transition-all',
                    p.highlight
                      ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white hover:from-teal-500 hover:to-teal-400'
                      : 'border border-slate-700/80 text-white hover:border-teal-700/50 hover:bg-slate-800/50',
                  ].join(' ')}
                >
                  {p.cta}
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={200}>
          <p className="mx-auto mt-12 max-w-2xl text-balance text-center text-[15px] text-slate-500">
            {pricing.anchor}
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
