import type { TripHistoryItem } from '@sentinela/shared';
import { flagEmoji, formatKm, formatDate } from '@/lib/format';

/**
 * Histórico por viagem.
 *
 * A listagem anterior em /viagens mostrava nome, datas e status — e nada do
 * que a viagem rendeu. Os quilômetros, países e cidades existiam só somados no
 * Diário, para a vida inteira do usuário: dava para saber "12 países" e nunca
 * quais foram os da viagem ao Vietnã.
 *
 * `<details>` em vez de estado no cliente: a expansão é a única interação da
 * tela, o navegador já a implementa, e assim isto continua sendo um Server
 * Component — sem JavaScript enviado e sem um segundo carregamento.
 */
export function HistoricoViagens({ viagens }: { viagens: TripHistoryItem[] }) {
  if (viagens.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <p className="text-sm text-slate-400">
          Nenhuma viagem ainda. Quando você criar a primeira, ela aparece aqui com as datas, os
          quilômetros e as cidades por onde passou.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {viagens.map((v) => (
        <LinhaViagem key={v.id} v={v} />
      ))}
    </ul>
  );
}

function LinhaViagem({ v }: { v: TripHistoryItem }) {
  const paises = v.countries ?? [];
  const cidades = v.cities ?? [];
  const emAndamento = v.status === 'active';
  const km = Number(v.km ?? 0);

  return (
    <li>
      <details
        className={`group overflow-hidden rounded-xl border bg-slate-900/60 ${
          emAndamento ? 'border-teal-800/70' : 'border-slate-800'
        }`}
      >
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-slate-800/40">
          <span className="text-2xl leading-none" aria-hidden>
            {paises.length ? flagEmoji(paises[0]!) : '🧭'}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">{v.title}</p>
            <p className="text-xs text-slate-500">
              {v.destination_label ? `${v.destination_label} · ` : ''}
              {periodo(v.starts_at, v.ends_at)}
            </p>
          </div>

          {/* Os três números que resumem a viagem ficam fora do details: se
              dependessem do clique, a lista viraria uma pilha de títulos. */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Selo>{v.days ?? 0} {v.days === 1 ? 'dia' : 'dias'}</Selo>
            <Selo>{formatKm(km)} km</Selo>
            <Selo>{cidades.length} {cidades.length === 1 ? 'cidade' : 'cidades'}</Selo>
            {emAndamento && (
              <span className="rounded-lg border border-teal-800 bg-teal-950/60 px-2 py-1 text-[11px] font-bold text-teal-300">
                em andamento
              </span>
            )}
          </div>

          <span
            className="shrink-0 text-lg text-slate-600 transition-transform group-open:rotate-90"
            aria-hidden
          >
            ›
          </span>
        </summary>

        <dl className="grid gap-4 border-t border-slate-800 px-5 py-5 sm:grid-cols-2">
          <Detalhe rotulo="Países">
            {paises.length ? (
              <span className="flex flex-wrap gap-2">
                {paises.map((p) => (
                  <span
                    key={p}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1"
                  >
                    <span aria-hidden>{flagEmoji(p!)}</span>
                    <span className="text-xs font-semibold text-slate-300">{p}</span>
                  </span>
                ))}
              </span>
            ) : (
              'nenhum registrado'
            )}
          </Detalhe>

          <Detalhe rotulo="Cidades">{cidades.length ? cidades.join(' · ') : 'nenhuma registrada'}</Detalhe>
          <Detalhe rotulo="Check-ins manuais">{v.checkins ?? 0}</Detalhe>
          <Detalhe rotulo="Pontos de GPS">{v.pings ?? 0}</Detalhe>
          <Detalhe rotulo="Situação">{rotuloStatus(v.status, v.state)}</Detalhe>
        </dl>
      </details>
    </li>
  );
}

function Selo({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] font-semibold text-slate-400 tabular-nums">
      {children}
    </span>
  );
}

function Detalhe({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">{rotulo}</dt>
      <dd className="mt-1.5 text-sm leading-relaxed text-slate-300">{children}</dd>
    </div>
  );
}

function periodo(inicio: string | null, fim: string | null): string {
  if (!inicio) return '—';
  return fim ? `${formatDate(inicio)} — ${formatDate(fim)}` : `desde ${formatDate(inicio)}`;
}

function rotuloStatus(status: string | null, state: string | null): string {
  if (status === 'active') {
    return (
      {
        safe: 'em andamento, tudo certo',
        grace: 'em andamento, check-in atrasado',
        warning: 'em andamento, sem sinal há horas',
        alert: 'em andamento, contatos acionados',
        sos: 'em andamento, SOS acionado',
        resolved: 'em andamento, alarme encerrado',
      }[state ?? ''] ?? 'em andamento'
    );
  }
  if (state === 'resolved') return 'encerrada após incidente';
  return (
    { completed: 'concluída', cancelled: 'cancelada', paused: 'pausada', draft: 'rascunho' }[
      status ?? ''
    ] ?? (status ?? '—')
  );
}
