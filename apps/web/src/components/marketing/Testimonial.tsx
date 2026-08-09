'use client';

import { cenario, trustBadges } from '@/content/landing';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

/**
 * Era um depoimento com nome, avatar e aspas — de uma cliente que não existe.
 * Virou a descrição do cenário que o produto cobre.
 *
 * A mudança visual acompanha a mudança de natureza: sem aspas decorativas e
 * sem avatar. Manter a moldura de citação com texto que não é citação seria
 * trocar uma mentira explícita por uma implícita.
 */
export function Testimonial() {
  return (
    <section className="relative border-b border-slate-800/50 bg-slate-900/30 py-24">
      {/* Gradiente radial sutil atrás do quote */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.06),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <ScrollReveal>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">
            {cenario.titulo}
          </p>

          <p className="mt-6 text-balance text-xl font-medium leading-relaxed text-white sm:text-2xl">
            {cenario.corpo}
          </p>

          <p className="mt-6 text-sm font-semibold text-slate-400">{cenario.rodape}</p>
        </ScrollReveal>

        {/* Trust badges com hover glow */}
        <ScrollReveal delay={200}>
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
            {trustBadges.map((b) => (
              <span
                key={b.label}
                className="group flex items-center gap-2.5 rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-2.5 text-sm text-slate-400 backdrop-blur-sm transition-all duration-300 hover:border-teal-800/50 hover:text-slate-300"
              >
                <span className="transition-transform duration-300 group-hover:scale-110">{b.icon}</span>
                {b.label}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
