import type { Metadata } from 'next';
import Link from 'next/link';
import type { SafetyState } from '@sentinela/shared';
import { requireUser } from '@/lib/auth/requireUser';
import { RegisterWebDevice } from '@/components/device/RegisterWebDevice';
import { CheckinRing } from '@/components/app/CheckinRing';
import { StatTile } from '@/components/app/StatTile';
import { SetupChecklist, type Passo } from '@/components/app/SetupChecklist';
import { STATUS_TOKENS } from '@/lib/statusTokens';
import { flagEmoji, formatKm, relativeTime, formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Início',
  robots: { index: false, follow: false },
};

const MANAGER_ROLES = new Set(['owner', 'admin', 'manager']);

export default async function DashboardPage() {
  const { supabase, user } = await requireUser('/dashboard');

  const [
    { data: profile },
    { data: memberships },
    { data: session },
    { data: devices },
    { data: contatos },
    { data: dossie },
    { data: statsRows },
    { data: sinais },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('org_members').select('org_id, role, joined_at').eq('user_id', user.id),
    supabase
      .from('travel_sessions')
      .select('id, title, destination_label, state, expected_checkin_at, last_signal_at, last_signal_kind')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('devices').select('id, platform').eq('user_id', user.id).is('revoked_at', null),
    supabase.from('emergency_contacts').select('id').eq('user_id', user.id),
    supabase.from('emergency_dossiers').select('blood_type, allergies').eq('user_id', user.id).maybeSingle(),
    supabase.rpc('get_my_travel_stats'),
    supabase
      .from('signals')
      .select('occurred_at')
      .eq('user_id', user.id)
      .gte('occurred_at', new Date(Date.now() - 12 * 86400_000).toISOString())
      .order('occurred_at', { ascending: true }),
  ]);

  const gestorEm = (memberships ?? []).filter(
    (m) => m.joined_at !== null && MANAGER_ROLES.has(m.role),
  );
  const { data: orgs } = gestorEm.length
    ? await supabase
        .from('organizations')
        .select('id, name, slug')
        .in('id', gestorEm.map((m) => m.org_id))
    : { data: [] };

  const stats = (statsRows ?? [])[0];
  const temCelular = (devices ?? []).some((d) => d.platform !== 'web');
  const totalContatos = (contatos ?? []).length;
  const temDossie = Boolean(dossie?.blood_type || dossie?.allergies);
  const primeiroNome = (profile?.full_name ?? '').split(' ')[0];

  const passos: Passo[] = [
    {
      feito: temCelular,
      titulo: 'Instalar o app no celular',
      descricao: 'É o GPS do aparelho que gera o sinal de vida. Sem ele, nada dispara.',
      href: '/conta',
      cta: 'Ver aparelhos',
    },
    {
      feito: totalContatos > 0,
      titulo: 'Cadastrar contato de emergência',
      descricao: 'Sem contato, o alarme dispara e não há para quem avisar.',
      href: '/contatos',
      cta: 'Adicionar',
    },
    {
      feito: temDossie,
      titulo: 'Preencher o dossiê médico',
      descricao: 'Tipo sanguíneo e alergias, para quem socorrer chegar sabendo.',
      href: '/conta',
      cta: 'Preencher',
    },
    {
      feito: Boolean(session),
      titulo: 'Iniciar uma viagem',
      descricao: 'O monitoramento só roda durante uma viagem ativa.',
      href: '/viagens',
      cta: 'Criar',
    },
  ];

  const estado = (session?.state ?? 'safe') as SafetyState;
  const token = STATUS_TOKENS[estado];
  const spark = agruparPorDia(((sinais ?? []) as { occurred_at: string }[]).map((s) => s.occurred_at));

  return (
    <div className="space-y-6">
      <RegisterWebDevice />

      {/* Top Welcome Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="gradient-heading text-2xl font-black tracking-tight sm:text-3xl">
              {primeiroNome ? `Olá, ${primeiroNome}` : 'Sua Conta'}
            </h1>
            <span className="animate-wave text-xl">👋</span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-400">
            {user.email} · Painel de Proteção Solo
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/viagens"
            className="btn-primary-gradient flex items-center gap-2 px-4 py-2 text-xs"
          >
            <span>🚀 Nova Viagem</span>
          </Link>
        </div>
      </div>

      {/* Herói: Estado da Viagem ou Radar Command Center */}
      <section
        className="modern-card relative overflow-hidden p-6 sm:p-8"
        style={{
          borderColor: session ? token.border : 'rgba(51, 65, 85, 0.7)',
        }}
      >
        {/* Subtle accent glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{ background: session ? token.mark : 'rgba(20, 184, 166, 0.4)' }}
        />

        {session ? (
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
            <CheckinRing
              state={estado}
              lastSignalAt={session.last_signal_at}
              expectedCheckinAt={session.expected_checkin_at}
            />

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-bold shadow-sm"
                  style={{ borderColor: token.border, color: token.ink, backgroundColor: token.surface }}
                >
                  <span aria-hidden>{token.icon}</span>
                  {token.label}
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-300">
                  Sessão Ativa
                </span>
              </div>

              <h2 className="mt-3.5 truncate text-2xl font-black text-white sm:text-3xl">
                {session.title}
              </h2>
              {session.destination_label && (
                <p className="mt-1 text-sm font-medium text-teal-400">
                  📍 {session.destination_label}
                </p>
              )}

              <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-800/80 bg-slate-900/50 p-4 text-left backdrop-blur-sm">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Último sinal</dt>
                  <dd className="mt-1 text-sm font-bold text-white">
                    {relativeTime(session.last_signal_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Check-in limite até</dt>
                  <dd className="mt-1 text-sm font-bold text-white">
                    {formatDateTime(session.expected_checkin_at)}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <Link
                  href="/viagens"
                  className="btn-primary-gradient inline-flex items-center gap-2 px-5 py-2.5 text-xs"
                >
                  <span>⚙️ Gerenciar Viagem</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8 py-2 md:flex-row md:items-center">
            {/* SVG Interactive Radar Animation */}
            <div className="relative flex h-48 w-48 shrink-0 items-center justify-center">
              <svg className="h-full w-full" viewBox="0 0 200 200">
                {/* Radar Circles */}
                <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(51, 65, 85, 0.4)" strokeWidth="1" strokeDasharray="4 4" />
                <circle cx="100" cy="100" r="65" fill="none" stroke="rgba(20, 184, 166, 0.2)" strokeWidth="1.5" />
                <circle cx="100" cy="100" r="40" fill="none" stroke="rgba(20, 184, 166, 0.3)" strokeWidth="1.5" />
                <circle cx="100" cy="100" r="15" fill="rgba(20, 184, 166, 0.15)" stroke="rgba(20, 184, 166, 0.5)" strokeWidth="1.5" />

                {/* Radar Grid Lines */}
                <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(51, 65, 85, 0.3)" strokeWidth="1" />
                <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(51, 65, 85, 0.3)" strokeWidth="1" />

                {/* Radar Scanning Line */}
                <g className="animate-radar-sweep">
                  <path d="M100,100 L100,10 A90,90 0 0,1 190,100 Z" fill="url(#radarSweepGrad)" opacity="0.6" />
                  <line x1="100" y1="100" x2="190" y2="100" stroke="#2dd4bf" strokeWidth="2" />
                </g>

                {/* Center Node */}
                <circle cx="100" cy="100" r="5" fill="#2dd4bf" className="pulse-glow" />

                <defs>
                  <radialGradient id="radarSweepGrad" cx="0%" cy="100%" r="100%">
                    <stop offset="0%" stopColor="rgba(45, 212, 191, 0.4)" />
                    <stop offset="100%" stopColor="rgba(45, 212, 191, 0)" />
                  </radialGradient>
                </defs>
              </svg>

              <div className="absolute flex items-center justify-center rounded-full bg-[#070b14]/90 p-2 shadow-lg shadow-teal-500/20 border border-teal-500/40">
                <span className="text-xl">🛡️</span>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-300">
                <span className="h-2 w-2 rounded-full bg-slate-500" />
                NENHUMA VIAGEM EM MONITORAMENTO
              </div>

              <h2 className="mt-3 text-xl font-black text-white sm:text-2xl">
                Pronto para sua próxima aventura solo?
              </h2>

              <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-400">
                O Dead Man’s Switch e o GPS passivo estão pausados em modo de descanso. Inicie uma nova viagem para ativar os check-ins automáticos e manter seus contatos protegidos.
              </p>

              {/* Feature Pills */}
              <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
                <span className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                  📡 Check-in Passivo GPS
                </span>
                <span className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                  🚨 Dossiê de Emergência
                </span>
                <span className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                  💬 Alerta SMS & WhatsApp
                </span>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                <Link
                  href="/viagens"
                  className="btn-primary-gradient flex items-center gap-2 px-6 py-3 text-xs font-bold"
                >
                  <span>🚀 Iniciar Nova Viagem</span>
                </Link>
                <Link
                  href="/conta"
                  className="rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-3 text-xs font-semibold text-slate-300 transition-all hover:border-slate-600 hover:text-white"
                >
                  📱 Sincronizar App
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Grade Principal de Métricas e Checklist */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatTile
              value={`${formatKm(stats?.total_km)}`}
              label="Quilômetros percorridos"
              hint={
                (stats?.earth_laps ?? 0) >= 0.01
                  ? `${stats?.earth_laps} ${stats?.earth_laps === 1 ? 'volta' : 'voltas'} ao mundo`
                  : 'A caminho da 1ª volta ao mundo'
              }
            />
            <StatTile
              value={stats?.countries_count ?? 0}
              label="Países visitados"
              hint={`${stats?.world_percent ?? 0}% do planeta explorado`}
            />
            <StatTile
              value={stats?.cities_count ?? 0}
              label="Cidades"
              hint="Locais rastreados em rota"
            />
            <StatTile
              value={stats?.days_tracked ?? 0}
              label="Dias na estrada"
              hint={spark.some((v) => v > 0) ? 'Sinais de vida nos últimos 12 dias' : 'Sinais ativos em viagens'}
              spark={spark.some((v) => v > 0) ? spark : undefined}
            />
          </div>

          {/* Seção Passaporte / Diário de Bordo */}
          <div className="modern-card p-6">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🎒</span>
                <div>
                  <h3 className="text-sm font-bold text-white">Seu Passaporte & Diário de Bordo</h3>
                  <p className="text-xs text-slate-400">Carimbos e memórias de viagens gravadas</p>
                </div>
              </div>
              <Link href="/diario" className="text-xs font-bold text-teal-400 transition-colors hover:text-teal-300">
                Ver Diário Completo →
              </Link>
            </div>

            {(stats?.countries ?? []).length > 0 ? (
              <p className="mt-4 text-3xl leading-relaxed">
                {(stats?.countries ?? []).slice(0, 18).map(flagEmoji).join(' ')}
                {(stats?.countries ?? []).length > 18 && (
                  <span className="ml-2 align-middle text-xs font-semibold text-slate-400">
                    +{(stats?.countries ?? []).length - 18} mais
                  </span>
                )}
              </p>
            ) : (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🗺️</span>
                  <span>Nenhum carimbo gravado ainda. Inicie sua primeira viagem para desbloquear o passaporte!</span>
                </div>
                <Link href="/viagens" className="shrink-0 font-bold text-teal-400 hover:underline">
                  Começar →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Setup Checklist & Organizações */}
        <div className="space-y-6">
          <SetupChecklist passos={passos} />

          {(orgs ?? []).length > 0 && (
            <section className="modern-card p-6">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                <span className="text-base">🏢</span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Organizações B2B</h2>
              </div>
              <ul className="mt-4 space-y-2">
                {(orgs ?? []).map((org) => (
                  <li key={org.id}>
                    <Link
                      href={`/${org.slug}`}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs font-semibold text-white transition-all hover:border-teal-500/40 hover:bg-slate-800"
                    >
                      <span className="font-medium">{org.name}</span>
                      <span className="text-teal-400">Painel →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function agruparPorDia(datas: string[]): number[] {
  const baldes = new Array(12).fill(0);
  const hoje = new Date().setHours(0, 0, 0, 0);

  for (const iso of datas) {
    const dia = new Date(iso).setHours(0, 0, 0, 0);
    const idx = 11 - Math.round((hoje - dia) / 86400_000);
    if (idx >= 0 && idx < 12) baldes[idx] += 1;
  }
  return baldes;
}
