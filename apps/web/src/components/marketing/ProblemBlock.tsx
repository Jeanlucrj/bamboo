'use client';

import { problem } from '@/content/landing';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function ProblemBlock() {
  return (
    <section className="relative border-b border-slate-800/50 bg-slate-900/30 py-24">
      {/* Fundo gradiente sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.5),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <ScrollReveal>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {problem.title}
          </h2>
          <p className="mt-6 text-pretty text-lg leading-relaxed text-slate-400">
            {problem.body}
          </p>
        </ScrollReveal>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {problem.icons.map((it, i) => (
            <ScrollReveal key={it.label} delay={i * 120}>
              <div className="glass-card glass-card-interactive group rounded-2xl px-6 py-8 text-center">
                <div className="text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:animate-[shake_0.5s_ease-in-out]">
                  {it.icon}
                </div>
                <div className="mt-4 text-sm font-semibold text-slate-300">{it.label}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
