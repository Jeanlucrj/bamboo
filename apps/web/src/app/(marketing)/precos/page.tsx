import type { Metadata } from 'next';
import Link from 'next/link';
import { PricingTable } from '@/components/marketing/PricingTable';
import { PricingComparison } from '@/components/marketing/PricingComparison';
import { FinalCta } from '@/components/marketing/FinalCta';
import { pricingFaq, trustBadges } from '@/content/landing';

export const metadata: Metadata = {
  title: 'Preços',
  description:
    'Planos do Sentinela: do gratuito ao enterprise. Comece sem cartão de crédito.',
  openGraph: {
    title: 'Preços — Sentinela',
    description: 'Do plano gratuito ao enterprise. 30 dias sem cartão de crédito.',
    type: 'website',
  },
};

/**
 * Página de preços — SSG puro, sem `force-dynamic`.
 *
 * Nada aqui depende de sessão: os planos são os mesmos para quem está logado e
 * para quem não está. Tornar esta página dinâmica só para mudar o rótulo de um
 * botão custaria o cache de CDN na rota que mais converte.
 */
export default function PrecosPage() {
  return (
    <>
      <section className="border-b border-slate-800 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
            Planos
          </p>
          <h1 className="mt-4 text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Um seguro que você espera nunca precisar usar.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-slate-400">
            Comece grátis e sem cartão. Se em 30 dias o Sentinela não tiver desaparecido da sua
            rotina — que é exatamente o objetivo dele — não assine.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3">
            {trustBadges.map((b) => (
              <span key={b.label} className="text-sm text-slate-500">
                {b.icon} {b.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <PricingTable />
      <PricingComparison />

      {/* Objeção real de quem vende software de segurança para viajante:
          o plano grátis parece bom o suficiente. Melhor dizer onde ele falha
          do que deixar a pessoa descobrir num alarme que não disparou. */}
      <section className="border-b border-slate-800 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-2xl border border-amber-900/60 bg-amber-950/20 p-8">
            <h2 className="text-lg font-bold text-white">
              Onde o plano gratuito não protege
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
              No Explorador, o cronômetro só zera quando você toca no botão. Se você esquecer, o
              alarme dispara e sua família é acionada sem motivo — e falso positivo é o que faz
              alguém desinstalar o app. O check-in passivo por deslocamento existe justamente para
              você não precisar lembrar de nada, e ele é o divisor entre os planos.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-800 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Dúvidas sobre cobrança
          </h2>

          <div className="mt-12 divide-y divide-slate-800 border-y border-slate-800">
            {pricingFaq.map((item) => (
              // <details> nativo: acessível por padrão e sem 1 byte de JS.
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold text-white marker:hidden">
                  {item.q}
                  <span className="shrink-0 text-slate-500 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-400">{item.a}</p>
              </details>
            ))}
          </div>

          <p className="mt-10 text-center text-[15px] text-slate-500">
            Precisa de mais de 10 assentos ou de nota fiscal com condições específicas?{' '}
            <Link href="/para-empresas" className="font-semibold text-teal-400 hover:text-teal-300">
              Fale com vendas
            </Link>
            .
          </p>
        </div>

        {/* Rich snippet: o Google mostra o FAQ direto na busca por
            "sentinela preço", que é consulta de fundo de funil. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: pricingFaq.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            }),
          }}
        />
      </section>

      <FinalCta />
    </>
  );
}
