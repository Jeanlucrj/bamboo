'use client';

import { pricing, pricingComparison, type ComparisonValue } from '@/content/landing';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

const NAMES: Record<string, string> = Object.fromEntries(
  pricing.plans.map((p) => [p.id, p.name]),
);

/**
 * Comparação linha a linha dos três planos.
 *
 * O cabeçalho é `sticky` com glassmorphism: numa tabela de 20 linhas, quem rola
 * até "SSO" precisa dos nomes à vista.
 */
export function PricingComparison() {
  return (
    <section className="border-b border-slate-800/50 py-28">
      <div className="mx-auto max-w-4xl px-6">
        <ScrollReveal>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Comparação completa
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[15px] text-slate-500">
            O que muda de verdade entre os planos. Nada aqui é pegadinha de letra miúda.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="mt-14 overflow-x-auto rounded-2xl border border-slate-800/60 bg-slate-900/30 backdrop-blur-sm">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md">
                <tr className="border-b border-slate-700/50">
                  <th className="py-4 pl-6 pr-4 text-sm font-semibold text-slate-400">Recurso</th>
                  {pricingComparison.columns.map((id) => (
                    <th
                      key={id}
                      className={`w-32 px-3 py-4 text-center text-sm font-bold ${
                        id === 'nomade' ? 'gradient-text' : 'text-white'
                      }`}
                    >
                      {NAMES[id] ?? id}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {pricingComparison.groups.flatMap((group) => [
                  <tr key={`grupo:${group.title}`}>
                    <td
                      colSpan={1 + pricingComparison.columns.length}
                      className="pb-2 pl-6 pt-8 text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {group.title}
                    </td>
                  </tr>,

                  ...group.rows.map((row) => (
                    <tr
                      key={`${group.title}:${row.label}`}
                      className="border-b border-slate-800/40 transition-colors duration-200 hover:bg-slate-800/20"
                    >
                      <td className="py-3.5 pl-6 pr-4 text-[15px] text-slate-300">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td
                          key={pricingComparison.columns[i]}
                          className={`px-3 py-3.5 text-center ${
                            pricingComparison.columns[i] === 'nomade'
                              ? 'bg-teal-950/10'
                              : ''
                          }`}
                        >
                          <Cell value={v} />
                        </td>
                      ))}
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function Cell({ value }: { value: ComparisonValue }) {
  if (value === true) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/15 text-xs text-teal-400" aria-label="incluído">
        ✓
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/50 text-xs text-slate-600" aria-label="não incluído">
        —
      </span>
    );
  }
  return <span className="text-[13px] text-slate-400">{value}</span>;
}
