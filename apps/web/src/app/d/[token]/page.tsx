import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAnonClient } from '@/lib/supabase/server';
import type { DossierPayload } from '@sentinela/shared';
import { ResolveButton } from '@/components/dossier/ResolveButton';

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

  return (
    <main className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      {/* Faixa de status: a primeira coisa que a pessoa lê. */}
      <header className={resolved ? 'bg-emerald-600' : isSos ? 'bg-red-700' : 'bg-amber-600'}>
        <div className="mx-auto max-w-2xl px-5 py-7 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-90">
            {resolved ? 'Alerta encerrado' : isSos ? 'Emergência acionada' : 'Alerta de segurança'}
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-tight">
            {resolved
              ? `${d.traveler.name} está bem`
              : isSos
                ? `${d.traveler.name} acionou o botão de emergência`
                : `${d.traveler.name} não dá sinal de vida`}
          </h1>
          <p className="mt-3 text-sm leading-relaxed opacity-95">{d.alert.reason}</p>
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
              <p className="text-xl font-bold">
                {[d.last_known.city, d.last_known.country_code].filter(Boolean).join(', ') ||
                  'Coordenadas registradas'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
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
                  className="rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  Abrir no mapa
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${d.last_known.lat},${d.last_known.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-300 px-4 py-3 text-center text-sm font-semibold"
                >
                  Traçar rota
                </a>
              </div>

              <p className="mt-3 font-mono text-xs text-slate-400">
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
                className="mt-3 block text-sm font-semibold text-teal-700 underline"
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
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                  <div>
                    <p className="font-medium">{p.city ?? 'Ponto registrado'}</p>
                    <p className="text-xs text-slate-500">{fmt(p.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {/* 5 · ENCERRAR — reduz o custo de falso positivo a um clique */}
        {!resolved && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-900">
              Já falou com {d.traveler.name} e está tudo bem?
            </p>
            <p className="mt-1 text-sm text-emerald-800">
              Encerre o alerta. Todos os outros contatos serão avisados e este link será desativado.
            </p>
            <ResolveButton token={token} travelerName={d.traveler.name} />
          </div>
        )}

        <p className="px-1 pt-2 text-xs leading-relaxed text-slate-400">
          Este link é pessoal e expira em {fmt(d.token_expires_at)}. Não encaminhe. Todos os
          acessos são registrados. Falta de sinal nem sempre significa emergência — pode ser apenas
          ausência de internet.
        </p>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PhoneTile({ label, number }: { label: string; number: string | null }) {
  if (!number) return null;
  return (
    <a
      href={`tel:${number.replace(/\s/g, '')}`}
      className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition active:bg-slate-100"
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900">{number}</p>
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
      <dd className={strong ? 'text-lg font-bold' : 'text-sm'}>{value}</dd>
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
