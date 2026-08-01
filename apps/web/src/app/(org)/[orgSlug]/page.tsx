import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { TrafficLightGrid } from '@/components/dashboard/TrafficLightGrid';
import {
  RESERVED_SLUGS,
  TRAFFIC_LIGHT_ORDER,
  toTrafficLight,
  type OrgTravelerStatus,
} from '@sentinela/shared';

export const dynamic = 'force-dynamic';

/**
 * Painel B2B — visão de dever de cuidado.
 *
 * Ordenação por severidade, não alfabética: quem está em vermelho aparece
 * primeiro, sempre. Um gestor com 80 viajantes não pode precisar procurar
 * pelo que está errado.
 */
export default async function OrgDashboard({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  // `/[orgSlug]` mora na raiz e captura tudo que não for rota estática. Sem
  // esta guarda, /precos e /termos entram aqui, não acham organização e caem
  // no redirect para /login — o usuário deslogado que clica em "Preços" vai
  // parar numa tela de login sem entender por quê.
  if (RESERVED_SLUGS.includes(orgSlug)) notFound();

  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/${orgSlug}`)}`);

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', orgSlug)
    .single();
  if (!org) redirect('/dashboard');

  // RLS já limita a organizações onde o usuário é gestor.
  const { data: travelers } = await supabase
    .from('v_org_traveler_status')
    .select('*')
    .eq('org_id', org.id);

  const rows = (travelers ?? []) as OrgTravelerStatus[];

  // A view devolve traffic_light como texto nulável — o Postgres não prova que
  // o CASE cobre tudo. toTrafficLight() estreita e dá o fallback num lugar só.
  const light = (r: OrgTravelerStatus) => toTrafficLight(r.traffic_light);

  rows.sort((a, b) => TRAFFIC_LIGHT_ORDER[light(a)] - TRAFFIC_LIGHT_ORDER[light(b)]);

  const counts = {
    red: rows.filter((r) => light(r) === 'red').length,
    amber: rows.filter((r) => light(r) === 'amber').length,
    green: rows.filter((r) => light(r) === 'green').length,
    grey: rows.filter((r) => light(r) === 'grey').length,
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Dever de cuidado
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">{org.name}</h1>
          </div>

          <div className="flex gap-3">
            <Counter label="Em alerta" value={counts.red} tone="red" />
            <Counter label="Atenção" value={counts.amber} tone="amber" />
            <Counter label="Seguros" value={counts.green} tone="green" />
            <Counter label="Sem viagem" value={counts.grey} tone="grey" />
          </div>
        </header>

        {counts.red > 0 && (
          <div className="mt-6 rounded-xl border border-red-800 bg-red-950/60 p-4">
            <p className="text-sm font-semibold text-red-200">
              {counts.red} {counts.red === 1 ? 'viajante precisa' : 'viajantes precisam'} de
              atenção imediata. Os contatos de emergência já foram acionados automaticamente.
            </p>
          </div>
        )}

        <div className="mt-8">
          <TrafficLightGrid travelers={rows} orgSlug={orgSlug} />
        </div>

        <p className="mt-10 text-xs leading-relaxed text-slate-600">
          A localização precisa de cada viajante só fica visível durante um incidente aberto.
          Fora disso, o painel mostra apenas o status do check-in — rastreamento contínuo de
          colaborador fora de emergência não é permitido pela política do sistema.
        </p>
      </div>
    </div>
  );
}

function Counter({
  label, value, tone,
}: { label: string; value: number; tone: 'red' | 'amber' | 'green' | 'grey' }) {
  const tones = {
    red: 'border-red-800 bg-red-950/60 text-red-300',
    amber: 'border-amber-800 bg-amber-950/60 text-amber-300',
    green: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
    grey: 'border-slate-800 bg-slate-900 text-slate-400',
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-2.5 ${tones}`}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}
