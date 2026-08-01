'use client';

import { features } from '@/content/landing';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function Features() {
  return (
    <section id="recursos" className="relative border-b border-slate-800/50 bg-slate-900/30 py-28">
      {/* Gradiente de fundo sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(15,118,110,0.08),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 130}>
              <article className="glass-card gradient-accent-top group relative flex h-full flex-col rounded-2xl p-8 transition-all duration-300 hover:border-teal-700/40 hover:-translate-y-1 hover:shadow-glow-teal">
                {/* Ícone com float */}
                <div className="text-4xl transition-transform duration-500 group-hover:animate-float">
                  {f.icon}
                </div>

                <h3 className="mt-6 text-xl font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-[15px] font-semibold text-teal-400">{f.tagline}</p>
                <p className="mt-4 flex-1 text-[15px] leading-relaxed text-slate-400">{f.body}</p>

                {/* Glow decorativo no canto */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-teal-500/5 blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
