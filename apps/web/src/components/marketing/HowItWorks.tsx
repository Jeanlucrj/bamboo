'use client';

import { howItWorks } from '@/content/landing';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function HowItWorks() {
  return (
    <section id="como-funciona" className="relative border-b border-slate-800/50 py-28">
      <div className="mx-auto max-w-5xl px-6">
        <ScrollReveal>
          <h2 className="text-balance text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {howItWorks.title}
          </h2>
        </ScrollReveal>

        {/* Timeline visual */}
        <div className="relative mt-20">
          {/* Linha conectora — visível em desktop */}
          <div
            aria-hidden
            className="absolute left-1/2 top-6 hidden h-0.5 w-[calc(66.66%-3rem)] -translate-x-1/2 md:block"
            style={{
              background: 'linear-gradient(90deg, rgba(20,184,166,0.05) 0%, rgba(20,184,166,0.3) 50%, rgba(20,184,166,0.05) 100%)',
            }}
          />

          <ol className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
            {howItWorks.steps.map((s, i) => (
              <ScrollReveal key={s.n} delay={i * 150}>
                <article className="glass-card group relative rounded-2xl p-8 transition-all duration-300 hover:border-teal-700/40 hover:-translate-y-1 hover:shadow-glow-teal">
                  {/* Gradient accent bar */}
                  <div
                    className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-0 transition-opacity duration-400 group-hover:opacity-100"
                    style={{ background: 'var(--gradient-teal)' }}
                  />

                  {/* Número com glow */}
                  <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-teal-500 text-lg font-bold text-white shadow-glow-teal transition-shadow duration-300 group-hover:shadow-glow-teal-lg">
                    {s.n}
                    {/* Pulse ring */}
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:animate-ring-pulse group-hover:opacity-100"
                    />
                  </div>

                  <h3 className="mt-6 text-lg font-semibold text-white">{s.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-slate-400">{s.body}</p>
                </article>
              </ScrollReveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
