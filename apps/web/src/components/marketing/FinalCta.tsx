'use client';

import Link from 'next/link';
import { finalCta } from '@/content/landing';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function FinalCta() {
  return (
    <section className="relative overflow-hidden py-32">
      {/* Multi-layer animated gradient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(15,118,110,0.3),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.1),transparent_50%)]"
      />

      {/* Floating decorative elements */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-10 left-[15%] h-2 w-2 rounded-full bg-teal-400/30 animate-float-slow"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-20 right-[20%] h-3 w-3 rounded-full bg-cyan-400/20 animate-float"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 right-[10%] h-1.5 w-1.5 rounded-full bg-teal-300/25 animate-float-slow"
        style={{ animationDelay: '1s' }}
      />

      <div className="relative mx-auto max-w-2xl px-6 text-center">
        <ScrollReveal>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            <span className="gradient-text-hero">{finalCta.title}</span>
          </h2>
          <p className="mt-6 text-lg text-slate-400">{finalCta.body}</p>

          <Link
            href={finalCta.cta.href}
            className="glow-btn mt-11 inline-block rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 px-12 py-4.5 text-base font-semibold text-white transition-all hover:from-teal-500 hover:to-teal-400 pulse-glow"
          >
            {finalCta.cta.label}
          </Link>

          <p className="mt-5 text-sm text-slate-500">{finalCta.footnote}</p>
        </ScrollReveal>
      </div>
    </section>
  );
}
