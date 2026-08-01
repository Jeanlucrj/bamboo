'use client';

import { testimonial, trustBadges } from '@/content/landing';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

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
          {/* Quote marks decorativas */}
          <div className="mb-6 flex justify-center">
            <span className="gradient-text text-6xl font-serif leading-none opacity-40">"</span>
          </div>

          <blockquote className="text-balance text-xl font-medium leading-relaxed text-white sm:text-2xl">
            {testimonial.quote}
          </blockquote>

          {/* Autor com gradient ring */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-sm font-bold text-white shadow-glow-teal">
              {testimonial.author[0]}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">{testimonial.author}</p>
              <p className="text-xs text-slate-500">{testimonial.detail}</p>
            </div>
          </div>
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
