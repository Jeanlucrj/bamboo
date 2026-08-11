import type { Metadata } from 'next';
import Link from 'next/link';
import type { TravelStats, PlaceVisit, TripHistoryItem } from '@sentinela/shared';
import { requireUser } from '@/lib/auth/requireUser';
import { HistoricoViagens } from '@/components/app/HistoricoViagens';
import { flagEmoji, formatKm, formatDate, humanDuration } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Diário de bordo',
  robots: { index: false, follow: false },
};

/**
 * Visita com os campos que a tela exige já garantidos.
 *
 * Interseção com CountryVisit, não um tipo solto: um type predicate precisa
 * devolver algo atribuível ao parâmetro, e a view expõe todas as colunas como
 * nuláveis — inclusive as que nem selecionamos. Redigitar só as cinco quebraria
 * o `v is Visit`.
 */
type Visit = PlaceVisit & {
  country_code: string;
  entered_at: string;
  left_at: string;
};

export default async function DiarioPage() {
  const { supabase } = await requireUser('/diario');

  const [{ data: statsRows }, { data: visitRows }, { data: tripRows }] = await Promise.all([
    // Pela RPC, não pela MV: mv_user_travel_stats não suporta RLS e teve o
    // acesso direto revogado na migration 07. get_my_travel_stats() é
    // SECURITY DEFINER e filtra por auth.uid().
    supabase.rpc('get_my_travel_stats'),
    // Por cidade, não por país: sem sair do próprio país a timeline de país
    // vira um bloco só, e três dias de deslocamento entre cidades aparecem
    // como uma linha parada com a data de entrada no topo.
    supabase
      .from('v_user_place_visits')
      .select('country_code, city, trip_title, entered_at, left_at, duration, ping_count')
      .order('entered_at', { ascending: false })
      .limit(200),
    supabase.rpc('get_my_trip_history'),
  ]);

  const viagens = (tripRows ?? []) as TripHistoryItem[];

  const raw = (statsRows ?? [])[0] as TravelStats | undefined;

  // Toda coluna da MV é nulável (ela agrega sobre LEFT JOINs). Aqui "sem dado"
  // e "zero" são a mesma coisa, então normalizamos uma vez.
  const s = {
    total_km: raw?.total_km ?? 0,
    km_last_365d: raw?.km_last_365d ?? 0,
    km_by_air_or_rail: raw?.km_by_air_or_rail ?? 0,
    countries_count: raw?.countries_count ?? 0,
    countries: raw?.countries ?? [],
    cities_count: raw?.cities_count ?? 0,
    days_tracked: raw?.days_tracked ?? 0,
    world_percent: raw?.world_percent ?? 0,
    earth_laps: raw?.earth_laps ?? 0,
    trips_completed: raw?.trips_completed ?? 0,
    manual_checkins: raw?.manual_checkins ?? 0,
    passive_checkins: raw?.passive_checkins ?? 0,
    first_ping_at: raw?.first_ping_at ?? null,
    refreshed_at: raw?.refreshed_at ?? null,
  };

  const visits = ((visitRows ?? []) as PlaceVisit[]).filter(
    (v): v is Visit =>
      v.country_code !== null && v.entered_at !== null && v.left_at !== null,
  );

  const hasData = s.days_tracked > 0 || visits.length > 0;

  // As viagens aparecem mesmo sem GPS: uma viagem com o rastreamento desligado
  // tem 0 km e nenhuma cidade, e isso é um fato sobre ela — não motivo para a
  // página inteira virar estado vazio. Antes, quem tivesse viajado assim lia
  // "seu diário começa no primeiro quilômetro" tendo feito várias viagens.
  const secaoViagens = viagens.length > 0 && (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-7">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        Suas viagens
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Datas, quilômetros, países e cidades de cada uma. Toque para abrir.
      </p>
      <div className="mt-5">
        <HistoricoViagens viagens={viagens} />
      </div>
    </section>
  );

  if (!hasData) {
    return (
      <>
        <Header refreshedAt={s.refreshed_at} />
        {secaoViagens}
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">
          <p className="text-5xl">🗺️</p>
          <h2 className="mt-5 text-xl font-bold text-white">
            Seu diário começa no primeiro quilômetro
          </h2>
          <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed text-slate-400">
            Cada país, cidade e quilômetro aparece aqui sozinho, a partir do GPS do celular. Você
            não digita nada — é o único diário de viagem que não depende da sua disciplina.
          </p>
          <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-slate-600">
            Precisa do app instalado e de uma viagem ativa. Os números são recalculados de hora em
            hora, então o primeiro registro pode levar até 60 minutos para aparecer.
          </p>
          <Link
            href="/viagens"
            className="mt-7 inline-block rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-500"
          >
            Ver minhas viagens
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Header refreshedAt={s.refreshed_at} />

      {/* Herói: o número que a pessoa quer postar. */}
      <section className="mt-8 overflow-hidden rounded-2xl border border-teal-900/60 bg-gradient-to-br from-teal-950/50 to-slate-900 p-8 text-center sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
          Distância percorrida
        </p>
        <p className="mt-3 text-6xl font-extrabold tracking-tight text-white tabular-nums sm:text-7xl">
          {formatKm(s.total_km)}
          <span className="ml-2 text-2xl font-bold text-teal-400">km</span>
        </p>
        <p className="mt-3 text-sm text-slate-400">
          {s.earth_laps >= 0.01
            ? `${s.earth_laps.toLocaleString('pt-BR')} ${s.earth_laps === 1 ? 'volta' : 'voltas'} ao mundo`
            : 'a caminho da primeira volta ao mundo'}
          {s.first_ping_at ? ` · desde ${formatDate(s.first_ping_at)}` : ''}
        </p>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat value={s.countries_count} label="países" accent="teal" />
        <Stat value={s.cities_count} label="cidades" accent="violet" />
        <Stat value={s.days_tracked} label="dias na estrada" accent="amber" />
        <Stat value={`${s.world_percent}%`} label="do mundo" hint="de 195 países" accent="sky" />
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat value={`${formatKm(s.km_last_365d)} km`} label="nos últimos 12 meses" />
        <Stat
          value={`${formatKm(s.km_by_air_or_rail)} km`}
          label="de avião ou trem"
          hint="trechos acima de 288 km/h médios"
        />
        <Stat value={s.trips_completed} label="viagens concluídas" />
      </section>

      {secaoViagens}

      {/* O passaporte. É o que a pessoa manda print para os amigos. */}
      {s.countries.length > 0 && (
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-7">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Seu passaporte
          </h2>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {s.countries.map((c) => (
              <span
                key={c}
                title={c}
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2"
              >
                <span className="text-2xl leading-none">{flagEmoji(c)}</span>
                <span className="text-xs font-semibold text-slate-300">{c}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {visits.length > 0 && (
        <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-7">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Linha do tempo
          </h2>

          <ol className="mt-6 space-y-0">
            {visits.map((v, i) => (
              <li key={`${v.country_code}-${v.entered_at}-${i}`} className="flex gap-4">
                {/* Trilho contínuo: o último item não desenha a linha para
                    baixo, senão ela fica pendurada no vazio. */}
                <div className="flex flex-col items-center">
                  <span className="text-2xl leading-none">{flagEmoji(v.country_code)}</span>
                  {i < visits.length - 1 && (
                    <span className="my-1 w-px flex-1 bg-slate-800" aria-hidden />
                  )}
                </div>

                <div className="flex-1 pb-6">
                  <p className="text-sm font-semibold text-white">
                    {v.city ?? 'Em trânsito'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(v.entered_at)} — {formatDate(v.left_at)} ·{' '}
                    {humanDuration(v.duration)}
                  </p>
                  {/* Sem o nome da viagem, duas estadas na mesma cidade em
                      viagens diferentes ficam visualmente idênticas. */}
                  {v.trip_title && (
                    <p className="mt-0.5 text-xs font-semibold text-teal-400">{v.trip_title}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-7">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Como você provou que estava bem
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Stat value={s.passive_checkins} label="check-ins passivos" hint="sem você fazer nada" accent="teal" />
          <Stat value={s.manual_checkins} label="check-ins manuais" hint="você tocou no botão" />
        </div>
        <p className="mt-5 text-xs leading-relaxed text-slate-600">
          Check-in passivo é deslocamento detectado pelo GPS ou abertura do app. Quanto maior essa
          proporção, menos o Sentinela precisou da sua atenção — que é exatamente o objetivo dele.
        </p>
      </section>
    </>
  );
}

function Header({ refreshedAt }: { refreshedAt: string | null }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Diário de bordo</h1>
      <p className="mt-2 text-sm text-slate-400">
        Escrito sozinho a partir do seu GPS e dos seus check-ins.
      </p>
      {refreshedAt && (
        // Sem isto o usuário acha que o número travou. A MV é recalculada de
        // hora em hora porque somar ST_Distance a cada abertura de tela seria
        // O(n) na tabela que mais cresce do sistema.
        <p className="mt-1 text-xs text-slate-600">
          Números atualizados {formatDate(refreshedAt)} · recalculados a cada hora
        </p>
      )}
    </div>
  );
}

const ACCENTS = {
  teal: 'border-teal-900/70 text-teal-300',
  violet: 'border-violet-900/70 text-violet-300',
  amber: 'border-amber-900/70 text-amber-300',
  sky: 'border-sky-900/70 text-sky-300',
  slate: 'border-slate-800 text-white',
} as const;

function Stat({
  value, label, hint, accent = 'slate',
}: {
  value: string | number;
  label: string;
  hint?: string;
  accent?: keyof typeof ACCENTS;
}) {
  return (
    <div className={`rounded-xl border bg-slate-900/60 px-5 py-4 ${ACCENTS[accent]}`}>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-300">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-600">{hint}</p>}
    </div>
  );
}
