import type { Metadata } from 'next';
import Link from 'next/link';
import { PricingTable } from '@/components/marketing/PricingTable';
import { FinalCta } from '@/components/marketing/FinalCta';
import { b2bPage, audiences } from '@/content/landing';

export const metadata: Metadata = {
  title: 'Para Empresas',
  description:
    'Dever de cuidado documentado: painel com semáforo em tempo real, alertas automáticos e relatórios de conformidade.',
  openGraph: {
    title: 'Sentinela para empresas — dever de cuidado auditável',
    description:
      'Semáforo de equipe em tempo real, escalonamento automático e relatório de conformidade exportável.',
    type: 'website',
  },
};

/** Página B2B — SSG puro, mesma justificativa de /precos. */
export default function ParaEmpresasPage() {
  const { hero, dutyOfCare, features, managerFlow, cta } = b2bPage;

  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-800 py-20 sm:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(15,118,110,0.22),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
            {hero.eyebrow}
          </p>
          <h1 className="mt-4 text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            {hero.headline}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-slate-400">
            {hero.subheadline}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a
              href={hero.ctaPrimary.href}
              className="rounded-xl bg-teal-600 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-500"
            >
              {hero.ctaPrimary.label}
            </a>
            <Link
              href={hero.ctaSecondary.href}
              className="rounded-xl border border-slate-700 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-900"
            >
              {hero.ctaSecondary.label}
            </Link>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            {audiences.b2b.items.join(' · ')}
          </p>
        </div>
      </section>

      <section className="border-b border-slate-800 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-balance text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {dutyOfCare.title}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-center text-[17px] leading-relaxed text-slate-400">
            {dutyOfCare.body}
          </p>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {dutyOfCare.points.map((p, i) => (
              <div
                key={p.title}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-7"
              >
                <span className="text-sm font-bold text-teal-400">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-bold text-white">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-400">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-800 bg-slate-900/40 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            O que vem no plano Organização
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-800 bg-slate-950 p-7">
                <h3 className="text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* A seção que fecha venda B2B não é a lista de features — é esta.
          O bloqueio da adesão nunca vem do gestor, vem da equipe achando que
          é rastreamento de funcionário. Dizer o que o gestor NÃO vê, com a
          mesma ênfase do que ele vê, é o argumento. */}
      <section className="border-b border-slate-800 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {managerFlow.title}
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-teal-900/60 bg-teal-950/20 p-7">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-400">
                O gestor vê
              </h3>
              <ul className="mt-5 space-y-3">
                {managerFlow.sees.map((s) => (
                  <li key={s} className="flex gap-3 text-[15px] leading-relaxed text-slate-300">
                    <span className="mt-0.5 shrink-0 text-teal-400">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-7">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                O gestor não vê
              </h3>
              <ul className="mt-5 space-y-3">
                {managerFlow.doesNotSee.map((s) => (
                  <li key={s} className="flex gap-3 text-[15px] leading-relaxed text-slate-400">
                    <span className="mt-0.5 shrink-0 text-slate-600">✕</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-8 text-pretty text-[15px] leading-relaxed text-slate-500">
            {managerFlow.note}
          </p>
        </div>
      </section>

      <section className="border-b border-slate-800 py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {cta.title}
          </h2>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-slate-400">{cta.body}</p>

          <a
            href={`mailto:${cta.email}?subject=${encodeURIComponent('Sentinela para empresas')}`}
            className="mt-10 inline-block rounded-xl bg-teal-600 px-10 py-4 text-base font-semibold text-white transition hover:bg-teal-500"
          >
            {cta.label}
          </a>

          <p className="mt-4 text-sm text-slate-500">{cta.email}</p>
        </div>
      </section>

      <PricingTable />
      <FinalCta />
    </>
  );
}
