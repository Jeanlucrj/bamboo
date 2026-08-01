import { HEALTH_THRESHOLDS, STATE_META, type SafetyState } from '@sentinela/shared';
import type { AdminOverview, AdminSystemHealth } from '@sentinela/shared';
import { requireAdmin } from '@/lib/admin/guard';
import { Card, Kpi, Row, Empty, ago, type Tone } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const { supabase } = await requireAdmin();

  const [{ data: overviewRaw, error: ovErr }, { data: healthRaw, error: hErr }] = await Promise.all([
    supabase.rpc('admin_overview'),
    supabase.rpc('admin_system_health'),
  ]);

  if (ovErr || hErr) {
    return (
      <Empty>
        Falha ao carregar as métricas: {ovErr?.message ?? hErr?.message}. Se a mensagem for
        <code className="px-1">forbidden</code>, o papel foi revogado durante a sessão.
      </Empty>
    );
  }

  const o = overviewRaw as unknown as AdminOverview;
  const h = healthRaw as unknown as AdminSystemHealth;

  // ---- Semáforos operacionais -------------------------------------------
  const sweepTone: Tone = h.sweep.overdue_unescalated > 0 ? 'bad' : 'ok';
  const notifTone: Tone =
    h.notifications.stuck_queued >= HEALTH_THRESHOLDS.NOTIF_STUCK_WARN
      ? 'bad'
      : h.notifications.failed_24h > 0
        ? 'warn'
        : 'ok';
  const mvTone: Tone =
    (h.analytics.mv_age_minutes ?? Infinity) > HEALTH_THRESHOLDS.MV_MAX_AGE_MIN ? 'warn' : 'ok';
  const geoTone: Tone =
    h.geocoding.pending > HEALTH_THRESHOLDS.GEOCODE_BACKLOG_WARN ? 'warn' : 'ok';

  const states = Object.entries(o.sessions.by_state) as [SafetyState, number][];

  // Preparar dados para o donut chart de estados
  const stateColors: Record<string, string> = {
    safe: '#10B981',
    grace: '#F59E0B',
    warning: '#F97316',
    alert: '#DC2626',
    sos: '#DC2626',
    resolved: '#10B981',
  };

  const totalSessions = states.reduce((sum, [, n]) => sum + n, 0);

  // Preparar dados para o bar chart de sinais
  const signalEntries = Object.entries(o.signals.by_source_24h);
  const maxSignal = Math.max(...signalEntries.map(([, n]) => n), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          <span className="gradient-text">Visão geral</span>
        </h1>
        <p className="mt-1.5 text-xs text-slate-500">
          Gerado em {new Date(o.generated_at).toLocaleString('pt-BR')}
        </p>
      </div>

      {/* Linha 1: o que exige ação humana agora. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Incidentes abertos"
          value={o.alerts.open}
          tone={o.alerts.open > 0 ? 'bad' : 'ok'}
          hint={o.alerts.open_sos > 0 ? `${o.alerts.open_sos} são SOS` : 'nenhum SOS ativo'}
          icon="🚨"
        />
        <Kpi
          label="Sessões vencidas sem escalonar"
          value={h.sweep.overdue_unescalated}
          tone={sweepTone}
          hint={sweepTone === 'bad' ? 'o deadman-sweep não está rodando' : 'sweep em dia'}
          icon="⏰"
        />
        <Kpi
          label="Notificações presas"
          value={h.notifications.stuck_queued}
          tone={notifTone}
          hint={`${h.notifications.failed_24h} falharam em 24h`}
          icon="📬"
        />
        <Kpi
          label="Sinais de vida (1h)"
          value={o.signals.life_last_1h}
          tone="neutral"
          hint={`${o.signals.last_1h} sinais no total, gps_ping incluído`}
          icon="💓"
        />
      </div>

      {/* Linha 2: negócio. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Usuários" value={o.users.total} hint={`+${o.users.new_7d} em 7 dias`} icon="👤" />
        <Kpi label="Viagens ativas" value={o.sessions.active} icon="✈️" />
        <Kpi
          label="Assinaturas ativas"
          value={o.billing.active}
          tone={o.billing.past_due > 0 ? 'warn' : 'neutral'}
          hint={`${o.billing.past_due} em atraso`}
          icon="💳"
        />
        <Kpi
          label="Falso positivo (30d)"
          value={o.alerts.false_alarm_rate_30d === null ? '—' : `${o.alerts.false_alarm_rate_30d}%`}
          tone={(o.alerts.false_alarm_rate_30d ?? 0) > 30 ? 'warn' : 'neutral'}
          hint="alertas encerrados como alarme falso"
          icon="📊"
        />
      </div>

      {/* Linha de gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Donut chart: distribuição de estados */}
        <Card title="Estados das sessões ativas">
          {totalSessions === 0 ? (
            <div className="flex flex-col items-center py-8">
              <DonutEmpty />
              <p className="mt-4 text-sm text-slate-500">Nenhuma sessão ativa</p>
            </div>
          ) : (
            <div className="flex items-center gap-8">
              <DonutChart states={states} colors={stateColors} total={totalSessions} />
              <div className="flex-1 space-y-2">
                {states.map(([state, n]) => {
                  const meta = STATE_META[state];
                  const pct = Math.round((n / totalSessions) * 100);
                  return (
                    <div key={state} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: stateColors[state] ?? '#64748b' }}
                        />
                        <span className="text-sm text-slate-300">{meta?.label ?? state}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums text-white">{n}</span>
                        <span className="text-xs text-slate-500">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Bar chart: origem dos sinais */}
        <Card title="Origem dos sinais (24h)">
          {signalEntries.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <svg width="64" height="64" viewBox="0 0 64 64" className="text-slate-700">
                <rect x="8" y="32" width="10" height="24" rx="2" fill="currentColor" opacity="0.3" />
                <rect x="22" y="20" width="10" height="36" rx="2" fill="currentColor" opacity="0.4" />
                <rect x="36" y="12" width="10" height="44" rx="2" fill="currentColor" opacity="0.5" />
                <rect x="50" y="24" width="10" height="32" rx="2" fill="currentColor" opacity="0.3" />
              </svg>
              <p className="mt-4 text-sm text-slate-500">Nenhum sinal nas últimas 24h</p>
            </div>
          ) : (
            <div className="space-y-3">
              {signalEntries.map(([src, n]) => {
                const pct = (n / maxSignal) * 100;
                return (
                  <div key={src}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="text-sm text-slate-300">{src}</span>
                      <span className="text-sm font-semibold tabular-nums text-white">{n}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/60">
                      <div
                        className="h-full rounded-full transition-[width] duration-700"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #14B8A6, #06B6D4)',
                          boxShadow: '0 0 8px rgba(20,184,166,0.3)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Motor do Dead Man's Switch" action={{ href: '/admin/incidentes', label: 'Ver incidentes' }}>
          <ul>
            <Row
              label="Sessões vencidas ainda em safe"
              value={h.sweep.overdue_unescalated}
              tone={sweepTone}
              hint="deveria ser sempre 0 — o cron roda de 5 em 5 min"
            />
            {states.length === 0 ? (
              <Row label="Nenhuma viagem ativa" value="—" />
            ) : (
              states.map(([state, n]) => (
                <Row
                  key={state}
                  label={STATE_META[state]?.label ?? state}
                  value={n}
                  tone={
                    state === 'alert' || state === 'sos'
                      ? 'bad'
                      : state === 'warning' || state === 'grace'
                        ? 'warn'
                        : 'ok'
                  }
                />
              ))
            )}
          </ul>
        </Card>

        <Card title="Jobs agendados">
          {h.cron.length === 0 ? (
            <Empty>
              pg_cron não está acessível neste ambiente. Em produção esta lista precisa mostrar
              deadman-sweep a cada 5 min.
            </Empty>
          ) : (
            <ul>
              {h.cron.map((job) => {
                const failed = job.last_status !== null && job.last_status !== 'succeeded';
                const silent =
                  job.jobname === 'deadman-sweep' &&
                  (job.seconds_since_run ?? Infinity) > HEALTH_THRESHOLDS.SWEEP_MAX_SILENCE_S;

                return (
                  <Row
                    key={job.jobname}
                    label={job.jobname}
                    hint={
                      job.last_error
                        ? job.last_error
                        : `${job.schedule}${job.active ? '' : ' · DESATIVADO'}`
                    }
                    value={job.last_run ? `há ${ago(job.last_run)}` : 'nunca'}
                    tone={!job.active || failed || silent ? 'bad' : 'ok'}
                  />
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Entrega de alertas">
          <ul>
            <Row label="Na fila" value={h.notifications.queued} />
            <Row
              label="Presas há mais de 15 min"
              value={h.notifications.stuck_queued}
              tone={notifTone}
              hint="Resend ou Twilio recusando"
            />
            <Row label="Falharam (24h)" value={h.notifications.failed_24h} tone={h.notifications.failed_24h > 0 ? 'warn' : 'ok'} />
            <Row label="Entregues (24h)" value={h.notifications.sent_24h} tone="ok" />
            <Row label="Links de dossiê ativos" value={h.dossier_tokens.active} />
            <Row
              label="Dossiês abertos (24h)"
              value={h.dossier_tokens.accessed_24h}
              hint="cada acesso fica no log do usuário"
            />
          </ul>
        </Card>

        <Card title="Pipeline de dados" action={{ href: '/admin/dispositivos', label: 'Ver dispositivos' }}>
          <ul>
            <Row label="Pings recebidos (1h)" value={o.locations.pings_1h} />
            <Row
              label="Pings sem país"
              value={h.geocoding.pending}
              tone={geoTone}
              hint={
                h.geocoding.oldest_pending_at
                  ? `mais antigo há ${ago(h.geocoding.oldest_pending_at)}`
                  : 'reverse-geocode em dia'
              }
            />
            <Row
              label="Idade do Travel Analytics"
              value={h.analytics.mv_age_minutes === null ? '—' : `${h.analytics.mv_age_minutes} min`}
              tone={mvTone}
              hint="mv_user_travel_stats, refresh de hora em hora"
            />
            {h.http && (
              <Row
                label="Chamadas HTTP do banco (1h)"
                value={`${h.http.responses_1h - h.http.errors_1h}/${h.http.responses_1h}`}
                tone={h.http.errors_1h > 0 ? 'warn' : 'ok'}
                hint="pg_net → Edge Functions"
              />
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/* ================================================================
   SVG CHARTS — inline, zero dependências
   ================================================================ */

function DonutChart({
  states,
  colors,
  total,
}: {
  states: [SafetyState, number][];
  colors: Record<string, string>;
  total: number;
}) {
  const size = 120;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#1e293b" strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {states.map(([state, n]) => {
          const fraction = n / total;
          const dashLength = fraction * circ;
          const gap = circ - dashLength;
          const segment = (
            <circle
              key={state}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={colors[state] ?? '#64748b'}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${gap}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              style={{ filter: `drop-shadow(0 0 4px ${colors[state]}40)` }}
            />
          );
          offset += dashLength;
          return segment;
        })}
      </svg>
      {/* Center number */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{total}</span>
        <span className="text-[10px] text-slate-500">sessões</span>
      </div>
    </div>
  );
}

function DonutEmpty() {
  const size = 100;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;

  return (
    <svg width={size} height={size} className="text-slate-800">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" className="fill-slate-600 text-xs">
        0
      </text>
    </svg>
  );
}
