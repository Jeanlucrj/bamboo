/**
 * Esqueleto de carregamento.
 *
 * Existe porque nenhuma rota tinha `loading.tsx`. No App Router, sem esse
 * arquivo o navegador não pinta NADA entre o clique e a resposta do servidor:
 * a tela anterior fica parada, sem cursor de carregamento, sem barra, sem
 * nada. Medido aqui, isso era entre 0,65 s e 2 s de tela congelada por
 * navegação — e tela congelada não parece lenta, parece quebrada.
 *
 * O esqueleto não deixa a resposta chegar mais rápido. Ele troca "travou" por
 * "está vindo", que é a diferença entre o usuário esperar e o usuário clicar
 * de novo.
 *
 * Os blocos imitam a forma da página que vem depois — cabeçalho, faixa de
 * cartões, conteúdo — para o layout não pular quando o conteúdo real entra.
 */
export function Esqueleto({ cartoes = 3 }: { cartoes?: number }) {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="space-y-3">
        <div className="h-7 w-56 rounded-lg bg-slate-800/70" />
        <div className="h-4 w-80 max-w-full rounded bg-slate-800/50" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cartoes }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-slate-800/70 bg-slate-900/50" />
        ))}
      </div>

      <div className="h-56 rounded-2xl border border-slate-800/70 bg-slate-900/50" />
      <div className="h-40 rounded-2xl border border-slate-800/70 bg-slate-900/50" />
    </div>
  );
}

/** Versão enxuta para páginas de texto corrido, sem faixa de cartões. */
export function EsqueletoTexto() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-4 px-6 py-16" aria-hidden>
      <div className="h-9 w-2/3 rounded-lg bg-slate-800/70" />
      <div className="h-4 w-full rounded bg-slate-800/50" />
      <div className="h-4 w-11/12 rounded bg-slate-800/50" />
      <div className="h-4 w-4/5 rounded bg-slate-800/50" />
      <div className="mt-8 h-64 rounded-2xl border border-slate-800/70 bg-slate-900/50" />
    </div>
  );
}
