import Link from 'next/link';

export type Passo = {
  feito: boolean;
  titulo: string;
  descricao: string;
  href: string;
  cta: string;
};

export function SetupChecklist({ passos }: { passos: Passo[] }) {
  const prontos = passos.filter((p) => p.feito).length;
  const pct = Math.round((prontos / passos.length) * 100);
  const completo = prontos === passos.length;

  return (
    <section className="modern-card p-6">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            {completo ? '🎉 Configuração Concluída' : '⚡ Checklist de Segurança'}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {completo ? 'Sua conta está 100% pronta para viagem.' : 'Complete os passos para ativar o monitoramento.'}
          </p>
        </div>
        <span className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-xs font-extrabold text-teal-300">
          {prontos}/{passos.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Progresso do Setup</span>
          <span className="font-semibold text-teal-400">{pct}%</span>
        </div>
        <div
          className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #14B8A6 0%, #06B6D4 100%)',
              boxShadow: '0 0 12px rgba(20, 184, 166, 0.6)',
            }}
          />
        </div>
      </div>

      <ul className="mt-5 divide-y divide-slate-800/60">
        {passos.map((p) => (
          <li key={p.titulo} className="py-2.5 first:pt-0 last:pb-0">
            {p.feito ? (
              <div className="flex items-start gap-3 rounded-xl px-2 py-1.5 opacity-80">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs text-teal-400 font-bold border border-teal-500/40">
                  ✓
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-400 line-through">
                    {p.titulo}
                  </p>
                </div>
              </div>
            ) : (
              <Link
                href={p.href}
                className="group flex items-start gap-3 rounded-xl px-2.5 py-2 transition-all hover:bg-slate-800/50"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-amber-500/60 bg-amber-500/10 text-xs font-bold text-amber-400 group-hover:border-teal-400 group-hover:text-teal-400">
                  !
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-teal-300">{p.titulo}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{p.descricao}</p>
                </div>
                <span className="shrink-0 rounded-lg bg-teal-500/10 border border-teal-500/30 px-2 py-1 text-[11px] font-bold text-teal-300 transition-all group-hover:bg-teal-500 group-hover:text-slate-950">
                  {p.cta} →
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
