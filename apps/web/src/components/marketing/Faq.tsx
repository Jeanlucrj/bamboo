'use client';

import { faq } from '@/content/landing';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function Faq() {
  return (
    <section id="faq" className="border-b border-slate-800/50 py-28">
      <div className="mx-auto max-w-3xl px-6">
        <ScrollReveal>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Perguntas que todo mundo faz
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="mt-14 space-y-3">
            {faq.map((item) => (
              <details
                key={item.q}
                className="group glass-card rounded-xl transition-all duration-300 open:border-teal-800/30 hover:border-slate-600/50"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[17px] font-semibold text-white marker:hidden">
                  {item.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700/50 text-sm text-slate-400 transition-all duration-300 group-open:rotate-45 group-open:border-teal-700/50 group-open:text-teal-400">
                    +
                  </span>
                </summary>
                {/* Animação de altura via grid — sem JS, sem fixed height */}
                <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 group-open:grid-rows-[1fr]">
                  <div className="overflow-hidden">
                    <div className="border-t border-slate-800/50 px-6 pb-6 pt-4">
                      <p className="text-[15px] leading-relaxed text-slate-400">{item.a}</p>
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </ScrollReveal>
      </div>

      {/* Rich snippet de FAQ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
    </section>
  );
}
