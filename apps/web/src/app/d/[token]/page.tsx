import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAnonClient } from '@/lib/supabase/server';
import type { DossierPayload, SafetyState } from '@sentinela/shared';
import { ResolveButton } from '@/components/dossier/ResolveButton';
import { STATUS_TOKENS } from '@/lib/statusTokens';

/**
 * DOSSIÊ DE EMERGÊNCIA — página pública, acessada por token assinado.
 *
 * Quem abre isto está com a mão tremendo. Cada decisão de layout serve a uma
 * pessoa em pânico: informação acionável primeiro, nada de navegação, nada de
 * login, telefones clicáveis.
 *
 * Segurança:
 *   · o token nunca vira credencial de banco — vai como argumento da RPC
 *     get_dossier(), que é SECURITY DEFINER e valida hash + expiração;
 *   · noindex para nunca cair em buscador;
 *   · cada acesso é logado e visível para o dono depois.
 */

export const metadata: Metadata = {
  title: 'Dossiê de Emergência · Sentinela',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

export default async function DossierPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAnonClient();

  const { data, error } = await supabase.rpc('get_dossier', { p_token: token });
  if (error || !data) notFound();

  const d = data as unknown as DossierPayload;
  const isSos = d.alert.level === 'sos';
  const resolved = !!d.alert.resolved_at;

  const token_ = STATUS_TOKENS[d.alert.level as SafetyState] ?? STATUS_TOKENS.alert;

  return (
    <main className="ambient-bg min-h-screen pb-20 text-slate-100 antialiased">
      {/* Marca. Esta página chega por link em WhatsApp ou e-mail, para alguém
          que muitas vezes nem sabe que o Sentinela existe. Sem assinatura
          visual ela parece phishing — e um link sem procedência conhecida,
          pedindo para abrir dado médico de um parente, é exatamente o que as
          pessoas foram treinadas a não clicar. */}
      <div className="border-b border-slate-800/60 bg-[#070b14]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
          <span className="gradient-text text-sm font-extrabold tracking-[0.2em]">SENTINELA</span>
          <span className="text-[11px] font-medium text-slate-500">Dossiê de Emergência</span>
        </div>
      </div>

      {/* Faixa de status: a primeira coisa que a pessoa lê.
          As cores vêm de STATUS_TOKENS, as mesmas do painel e do app — antes
          eram bg-amber-600 / bg-red-700 escritas à mão aqui, então o mesmo
          estado tinha uma cor na tela do viajante e outra na do contato. */}
      <header
        className="border-b"
        style={{ backgroundColor: token_.surface, borderColor: token_.border }}
      >
        <div className="mx-auto max-w-2xl px-5 py-7">
          <p
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]"
            style={{ color: token_.ink }}
          >
            <span aria-hidden>{token_.icon}</span>
            {resolved ? 'Alerta encerrado' : isSos ? 'Emergência acionada' : 'Alerta de segurança'}
          </p>
          <h1 className="mt-2.5 text-2xl font-bold leading-tight text-white sm:text-3xl">
            {resolved
              ? `${d.traveler.name} está bem`
              : isSos
                ? `${d.traveler.name} acionou o botão de emergência`
                : `${d.traveler.name} não dá sinal de vida`}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{d.alert.reason}</p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-5 py-6">
        {resolved && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Este alerta foi encerrado em {fmt(d.alert.resolved_at!)}. As informações abaixo estão
            mantidas apenas para referência.
          </div>
        )}

        {/* 1 · ONDE */}
        <Card title="Última localização conhecida">
          {d.last_known ? (
            <>
              {/* O rótulo era `[city, country_code].join(', ')`. Quando o ping
                  mais recente vem sem cidade — acontece em área rural, e foi
                  exatamente o caso numa simulação em Pai, na Tailândia — o
                  título virava a sigla crua: "TH".

                  Quem lê esta página está com a mão tremendo tentando
                  descobrir para onde ir. "TH" não é um lugar: não dá para
                  pesquisar, repetir ao telefone nem dizer a um despachante.
                  `local_emergency.country_name` já traz "Tailândia" e estava
                  ali ao lado, usado só no bloco de telefones. */}
              <p className="text-xl font-bold">
                {[d.last_known.city, d.local_emergency?.country_name ?? d.last_known.country_code]
                  .filter(Boolean)
                  .join(', ') || 'Coordenadas registradas'}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {fmt(d.last_known.recorded_at)}
                {d.last_known.accuracy_m
                  ? ` · precisão de ~${Math.round(d.last_known.accuracy_m)} m`
                  : ''}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={`https://www.google.com/maps?q=${d.last_known.lat},${d.last_known.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:from-teal-500 hover:to-teal-400"
                >
                  Abrir no mapa
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${d.last_known.lat},${d.last_known.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800/60"
                >
                  Traçar rota
                </a>
              </div>

              <p className="mt-3 font-mono text-xs text-slate-500">
                {d.last_known.lat.toFixed(5)}, {d.last_known.lng.toFixed(5)}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Nenhuma localização foi registrada. O rastreamento pode estar desativado ou o
              aparelho sem sinal desde o início da viagem.
            </p>
          )}
        </Card>

        {/* 2 · PARA QUEM LIGAR — ação imediata, telefones do país correto */}
        {d.local_emergency && (
          <Card title={`Emergência em ${d.local_emergency.country_name}`}>
            <div className="grid grid-cols-2 gap-2">
              <PhoneTile label="Polícia" number={d.local_emergency.police} />
              <PhoneTile label="Ambulância" number={d.local_emergency.ambulance} />
              <PhoneTile label="Bombeiros" number={d.local_emergency.fire} />
              <PhoneTile label="Número único" number={d.local_emergency.universal} />
              {d.local_emergency.tourist_police && (
                <PhoneTile label="Polícia turística" number={d.local_emergency.tourist_police} />
              )}
            </div>
            {d.local_emergency.embassy_br_url && (
              <a
                href={d.local_emergency.embassy_br_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block rounded-xl border border-teal-800/70 bg-teal-950/40 px-4 py-3 text-sm font-semibold text-teal-300 transition hover:border-teal-600 hover:bg-teal-900/40"
              >
                Consulado do Brasil em {d.local_emergency.country_name} →
              </a>
            )}
          </Card>
        )}

        {/* 3 · DADOS MÉDICOS */}
        {hasMedical(d.medical) && (
          <Card title="Informações médicas">
            <dl className="space-y-3">
              <Field label="Tipo sanguíneo" value={d.medical.blood_type} strong />
              <Field label="Alergias" value={d.medical.allergies} />
              <Field label="Medicamentos em uso" value={d.medical.medications} />
              <Field label="Condições de saúde" value={d.medical.conditions} />
              <Field label="Seguro viagem" value={d.medical.insurance_provider} />
              <Field label="Apólice" value={d.medical.insurance_policy} />
              <Field label="Observações" value={d.medical.notes} />
            </dl>
          </Card>
        )}

        {/* 4 · POR ONDE ANDOU */}
        {d.recent_track.length > 0 && (
          <Card title="Onde esteve nos últimos 7 dias">
            <ol className="space-y-3">
              {d.recent_track.slice(0, 20).map((p, i) => (
                <li key={`${p.at}-${i}`} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                  <div>
                    <p className="font-medium text-slate-200">{p.city ?? 'Ponto registrado'}</p>
                    <p className="text-xs text-slate-500">{fmt(p.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {/* 5 · ENCERRAR — reduz o custo de falso positivo a um clique */}
        {!resolved && (
          <div className="rounded-2xl border border-emerald-800/70 bg-emerald-950/40 p-5">
            <p className="text-sm font-semibold text-emerald-200">
              Já falou com {d.traveler.name} e está tudo bem?
            </p>
            <p className="mt-1 text-sm text-emerald-300/80">
              Encerre o alerta. Todos os outros contatos serão avisados e este link será desativado.
            </p>
            <ResolveButton token={token} travelerName={d.traveler.name} />
          </div>
        )}

        <p className="px-1 pt-2 text-xs leading-relaxed text-slate-500">
          Este link é pessoal e expira em {fmt(d.token_expires_at)}. Não encaminhe. Todos os
          acessos são registrados. Falta de sinal nem sempre significa emergência — pode ser apenas
          ausência de internet.
        </p>

        {/* Rodapé com a marca: fecha a página com a mesma assinatura do topo e
            diz de onde veio o e-mail/WhatsApp que trouxe a pessoa até aqui. */}
        <footer className="border-t border-slate-800/60 pt-5 text-center">
          <span className="gradient-text text-xs font-extrabold tracking-[0.2em]">SENTINELA</span>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
            Você recebeu este link porque {d.traveler.name} cadastrou você como contato de
            emergência.
          </p>
        </footer>
      </div>
    </main>
  );
}

/** Mesma anatomia dos cartões do painel: raio grande, borda de 1px, superfície
 *  levemente acima do fundo. */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/20">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * O número fica grande e branco porque é o elemento mais acionável da página:
 * o rótulo é contexto, o número é o que a pessoa vai discar. Continua sendo um
 * link `tel:` — no celular, um toque liga.
 */
function PhoneTile({ label, number }: { label: string; number: string | null }) {
  if (!number) return null;
  return (
    <a
      href={`tel:${number.replace(/\s/g, '')}`}
      className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 transition hover:border-teal-700 hover:bg-slate-900 active:bg-slate-800"
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold tabular-nums text-white">{number}</p>
    </a>
  );
}

function Field({
  label, value, strong,
}: { label: string; value: string | null; strong?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={strong ? 'text-lg font-bold text-white' : 'text-sm text-slate-200'}>
        {value}
      </dd>
    </div>
  );
}

function hasMedical(m: DossierPayload['medical']): boolean {
  return Object.values(m).some(Boolean);
}

function fmt(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
}
