'use client';

import Link from 'next/link';
import { audiences } from '@/content/landing';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function AudienceSplit() {
  const { b2c, b2b, b2bPitch } = audiences;

  const cards = [
    { data: b2c, gradient: 'from-teal-500/20 to-cyan-500/20', borderHover: 'hover:border-teal-600/50' },
    { data: b2b, gradient: 'from-violet-500/20 to-blue-500/20', borderHover: 'hover:border-violet-600/50' },
  ];

  return (
    <section id="publico" className="relative border-b border-slate-800/50 py-28">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <h2 className="text-balance text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {audiences.title}
          </h2>
        </ScrollReveal>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          {cards.map(({ data: a, gradient, borderHover }, i) => (
            <ScrollReveal key={a.tag} delay={i * 150}>
              <div className={`glass-card group relative flex h-full flex-col rounded-2xl p-8 transition-all duration-300 ${borderHover} hover:-translate-y-1`}>
                {/* Gradient background glow */}
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                />

                <div className="relative">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white">{a.label}</h3>
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-bold tracking-wide ${
                      a.tag === 'B2C'
                        ? 'bg-teal-500/15 text-teal-300'
                        : 'bg-violet-500/15 text-violet-300'
                    }`}>
                      {a.tag}
                    </span>
                  </div>

                  <ul className="mt-7 flex-1 space-y-3">
                    {a.items.map((item) => (
                      <li key={item} className="flex gap-3 text-[15px] text-slate-300">
                        <span className={a.tag === 'B2C' ? 'text-teal-400' : 'text-violet-400'}>›</span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7 border-t border-slate-700/50 pt-6">
                    <p className={`text-[15px] font-semibold ${
                      a.tag === 'B2C' ? 'text-teal-400' : 'text-violet-400'
                    }`}>
                      → {a.outcome}
                    </p>
                  </div>

                  <Link
                    href={a.cta.href}
                    className={`glow-btn mt-6 block rounded-xl px-6 py-3.5 text-center text-sm font-semibold text-white transition-all ${
                      a.tag === 'B2C'
                        ? 'bg-teal-600/80 hover:bg-teal-500'
                        : 'bg-violet-600/80 hover:bg-violet-500'
                    }`}
                  >
                    {a.cta.label}
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* B2B Pitch — glassmorphism premium */}
        <ScrollReveal delay={100}>
          <div className="mt-8 glass-card rounded-2xl border-teal-800/30 bg-teal-950/20 p-8 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="hidden shrink-0 rounded-xl bg-teal-500/10 p-3 sm:block">
                <svg className="h-6 w-6 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-balance text-lg font-bold text-white">{b2bPitch.title}</h3>
                <p className="mt-3 text-pretty text-[15px] leading-relaxed text-slate-400">
                  {b2bPitch.body}
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
