/**
 * Casca das páginas legais.
 *
 * Estes documentos descrevem o que o sistema REALMENTE faz — as regras de RLS,
 * os prazos de retenção e os subprocessadores foram lidos do schema e das
 * migrations, não copiados de um modelo. O que falta é revisão jurídica, e o
 * aviso no topo diz isso em vez de fingir que já houve.
 */
export function LegalPage({
  titulo, atualizado, resumo, children,
}: {
  titulo: string;
  atualizado: string;
  resumo: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
        Documento
      </p>
      <h1 className="mt-4 text-balance text-4xl font-extrabold tracking-tight text-white">
        {titulo}
      </h1>
      <p className="mt-4 text-pretty text-lg leading-relaxed text-slate-400">{resumo}</p>
      <p className="mt-4 text-sm text-slate-600">Última atualização: {atualizado}</p>

      <div className="mt-8 rounded-xl border border-amber-900/50 bg-amber-950/20 px-5 py-4">
        <p className="text-sm leading-relaxed text-amber-200/80">
          <strong className="font-semibold text-amber-200">Rascunho técnico.</strong> Este texto
          descreve com precisão o funcionamento do sistema, mas ainda não passou por revisão
          jurídica. Antes de operar comercialmente, ele precisa ser revisado por advogado —
          especialmente as seções de responsabilidade e de tratamento de dado sensível.
        </p>
      </div>

      <div className="mt-12 space-y-10">{children}</div>
    </article>
  );
}

export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-white">{titulo}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-slate-400">{children}</div>
    </section>
  );
}

export function Lista({ itens }: { itens: string[] }) {
  return (
    <ul className="space-y-2.5">
      {itens.map((i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal-500" aria-hidden />
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}
