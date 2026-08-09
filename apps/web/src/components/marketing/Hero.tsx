'use client';

import Link from 'next/link';
import { hero } from '@/content/landing';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';

/**
 * Hero premium com gradientes animados, partículas CSS, glow e shimmer.
 *
 * 'use client' aqui é pelo AnimatedCounter e pelas partículas decorativas —
 * o conteúdo todo vem de content/landing.ts, não de fetch, então não há
 * penalidade real de mover para o cliente.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-800/50 bg-slate-950">
      {/* Gradiente radial premium — mais forte e com múltiplas camadas */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(15,118,110,0.3),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.12),transparent_50%)]"
      />

      {/* Grid animado — se move lentamente para cima */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12] animate-grid-move [background-image:linear-gradient(rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.18)_1px,transparent_1px)] [background-size:56px_56px]"
      />

      {/* Orbs decorativos flutuantes */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-teal-500/5 blur-3xl animate-float-slow"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl animate-float"
      />

      {/* Noise texture sutil */}
      <div aria-hidden className="pointer-events-none absolute inset-0 noise-overlay" />

      <div className="relative mx-auto max-w-5xl px-6 py-28 text-center sm:py-36">
        {/* Badge com shimmer */}
        <p className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-teal-700/50 bg-teal-950/60 px-5 py-2 text-sm text-teal-300 backdrop-blur-sm animate-fade-in-up">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-400" />
          </span>
          {/* Aqui rodava um contador animado de "+2.400 viajantes em 78
              países". O número era inventado — e estava escrito no componente,
              ignorando o `hero.eyebrow` do arquivo de conteúdo, o que fez ele
              sobreviver à primeira limpeza. Copy fora do content é copy que
              ninguém encontra quando precisa corrigir. */}
          <span className="shimmer rounded-full font-medium">{hero.eyebrow}</span>
        </p>

        {/* Headline com gradient text */}
        <h1
          className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl animate-fade-in-up"
          style={{ animationDelay: '100ms' }}
        >
          <span className="text-white">Se algo acontecer com você lá fora, </span>
          <span className="gradient-text-hero">alguém vai saber.</span>
          <br />
          <span className="text-white">Automaticamente.</span>
        </h1>

        <p
          className="mx-auto mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-slate-400 animate-fade-in-up"
          style={{ animationDelay: '200ms' }}
        >
          {hero.subheadline}
        </p>

        {/* CTA buttons com glow */}
        <div
          className="mt-11 flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in-up"
          style={{ animationDelay: '300ms' }}
        >
          <Link
            href={hero.ctaPrimary.href}
            className="glow-btn w-full rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 px-9 py-4 text-base font-semibold text-white transition-all hover:from-teal-500 hover:to-teal-400 sm:w-auto pulse-glow"
          >
            {hero.ctaPrimary.label}
          </Link>
          <Link
            href={hero.ctaSecondary.href}
            className="group w-full rounded-2xl border border-slate-700/80 bg-slate-900/50 px-9 py-4 text-base font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-teal-700/60 hover:bg-slate-800/50 hover:text-white sm:w-auto"
          >
            {hero.ctaSecondary.label}
            <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        {/* Social proof com ícones */}
        <div
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500 animate-fade-in-up"
          style={{ animationDelay: '400ms' }}
        >
          {/* Sem estrelas e sem contagem de usuários: não há avaliação nem
              base para citar. O que ficou são compromissos verificáveis — e
              num produto que vende confiança eles convencem mais do que uma
              nota que o visitante não consegue conferir em lugar nenhum. */}
          {hero.socialProof.split(' · ').map((item, i) => (
            <span key={item} className="flex items-center gap-x-6">
              {i > 0 ? <span className="h-3 w-px bg-slate-700" /> : null}
              <span>{item}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
