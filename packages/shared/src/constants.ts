/**
 * Constantes de domínio compartilhadas entre web e mobile.
 * Espelham os ENUMs do Postgres — se mudar aqui, mude a migration junto.
 */

export const SAFETY_STATES = ['safe', 'grace', 'warning', 'alert', 'sos', 'resolved'] as const;
export type SafetyState = (typeof SAFETY_STATES)[number];

export const SIGNAL_KINDS = [
  'manual_checkin',
  'device_movement',
  'app_open',
  'gps_ping',
  'sos',
  'admin_override',
] as const;
export type SignalKind = (typeof SIGNAL_KINDS)[number];

/**
 * Sinais que provam vida e resetam o Dead Man's Switch.
 *
 * `gps_ping` está deliberadamente FORA: é posição sem deslocamento. Um celular
 * esquecido na mesinha emite heartbeat a cada 4 h para sempre — se isso
 * contasse, o alarme nunca dispararia.
 */
export const LIFE_SIGNALS: readonly SignalKind[] = [
  'manual_checkin',
  'device_movement',
  'app_open',
  'sos',
  'admin_override',
];

export const SESSION_STATUSES = ['draft', 'active', 'paused', 'completed', 'cancelled'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export type TrafficLight = 'green' | 'amber' | 'red' | 'grey';

/**
 * Normaliza o `traffic_light` de `v_org_traveler_status`.
 *
 * O Postgres tipa a coluna como texto nulável: ele não consegue provar que o
 * CASE da view cobre todos os caminhos, nem mesmo com o ELSE. Em vez de
 * espalhar `as TrafficLight` pelos componentes — que esconderia um valor
 * inesperado até virar `undefined` em runtime —, a conversão e o fallback ficam
 * aqui.
 *
 * 'grey' é o default correto: significa "sem viagem ativa", que é exatamente o
 * que sabemos quando o valor não veio.
 */
export function toTrafficLight(value: string | null | undefined): TrafficLight {
  return value === 'red' || value === 'amber' || value === 'green' ? value : 'grey';
}

/** Ordem de exibição do painel B2B: o que exige ação humana vem primeiro. */
export const TRAFFIC_LIGHT_ORDER: Record<TrafficLight, number> = {
  red: 0,
  amber: 1,
  grey: 2,
  green: 3,
};

// ---------------------------------------------------------------------
// Apresentação dos estados
// ---------------------------------------------------------------------
export const STATE_META: Record<
  SafetyState,
  { label: string; short: string; light: TrafficLight; description: string }
> = {
  safe: {
    label: 'Tudo certo',
    short: 'Seguro',
    light: 'green',
    description: 'Recebemos seu sinal de vida dentro do combinado.',
  },
  grace: {
    label: 'Aguardando você',
    short: 'Atrasado',
    light: 'amber',
    description: 'Passou do horário do check-in. Só você foi avisado — ninguém mais.',
  },
  warning: {
    label: 'Precisamos de um sinal',
    short: 'Atenção',
    light: 'amber',
    description: 'Último aviso antes de acionarmos seus contatos de emergência.',
  },
  alert: {
    label: 'Contatos acionados',
    short: 'Alerta',
    light: 'red',
    description: 'Seus contatos de emergência receberam o Dossiê.',
  },
  sos: {
    label: 'Emergência ativa',
    short: 'SOS',
    light: 'red',
    description: 'Você acionou o botão de pânico. Todos os contatos foram avisados.',
  },
  resolved: {
    label: 'Alarme encerrado',
    short: 'Resolvido',
    light: 'green',
    description: 'O incidente foi encerrado e os links de dossiê foram desativados.',
  },
};

export const SIGNAL_LABEL: Record<SignalKind, string> = {
  manual_checkin: 'Check-in manual',
  device_movement: 'Deslocamento detectado',
  app_open: 'App aberto',
  gps_ping: 'Localização registrada',
  sos: 'Botão de pânico',
  admin_override: 'Ajuste manual',
};

/** Texto curto para explicar ao usuário por que o cronômetro zerou. */
export const SIGNAL_EXPLAINER: Record<SignalKind, string> = {
  manual_checkin: 'Você confirmou que está bem.',
  device_movement: 'Seu celular se deslocou — contamos como sinal de vida.',
  app_open: 'Você abriu o app.',
  gps_ping: 'Posição registrada, sem deslocamento. Não conta como sinal de vida.',
  sos: 'Você acionou o botão de emergência.',
  admin_override: 'Ajuste feito manualmente.',
};

// ---------------------------------------------------------------------
// Presets de intervalo de check-in
// ---------------------------------------------------------------------
export const CHECKIN_PRESETS = [
  { hours: 6, label: '6 horas', hint: 'Trilha, escalada, trecho de risco' },
  { hours: 12, label: '12 horas', hint: 'Deslocamento longo, região isolada' },
  { hours: 24, label: '24 horas', hint: 'Padrão recomendado' },
  { hours: 48, label: '48 horas', hint: 'Estadia longa, rotina estável' },
  { hours: 72, label: '72 horas', hint: 'Base fixa, risco baixo' },
] as const;

// ---------------------------------------------------------------------
// Tracking / bateria
// ---------------------------------------------------------------------
export const TRACKING = {
  /** Alvo de ping. O iOS não garante timer em background — é meta, não contrato. */
  PING_INTERVAL_MS: 4 * 60 * 60 * 1000,
  DISTANCE_INTERVAL_M: 500,
  DEFERRED_DISTANCE_M: 2000,
  /** Abaixo disso o app reduz precisão e frequência sozinho. */
  LOW_BATTERY_THRESHOLD: 0.15,
  LOW_BATTERY_DISTANCE_M: 5000,
  /**
   * Deslocamento mínimo, em metros, para o ping contar como sinal de vida.
   * Acima do ruído típico de GPS parado (~100 m de precisão em modo Balanced).
   */
  MOVEMENT_THRESHOLD_M: 150,
  /** Teto da fila offline. Acima disso descartamos os pings mais antigos. */
  MAX_QUEUE_SIZE: 600,
  BATCH_SIZE: 100,
  /** Pings acima disso são descartados nas views de analytics. */
  MAX_ACCURACY_M: 150,
} as const;

// ---------------------------------------------------------------------
// Superfícies: o que é app de celular e o que é navegador
// ---------------------------------------------------------------------
export const DEVICE_PLATFORMS = ['ios', 'android', 'web'] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

/** Plataformas que rodam GPS em background e podem provar presença física. */
export const MOBILE_PLATFORMS: readonly DevicePlatform[] = ['ios', 'android'];

export const PLATFORM_LABEL: Record<DevicePlatform, string> = {
  ios: 'iPhone / iPad',
  android: 'Android',
  web: 'Navegador',
};

/**
 * Divisão de responsabilidade entre as duas superfícies.
 *
 * O critério não é preferência de UX: é o que cada ambiente consegue provar.
 * O navegador não executa em background, não sobrevive à tela bloqueada e sua
 * Geolocation API aceita coordenada forjada pelo devtools. Nada que dependa de
 * "esta pessoa está fisicamente aqui" pode morar nele.
 */
export const SURFACE_CAPABILITIES = {
  mobile: [
    'GPS em background e check-in passivo por deslocamento',
    'Botão de pânico (SOS)',
    'Check-in manual e diário de bordo',
    'Notificação crítica que atravessa o Modo Foco',
  ],
  web: [
    'Landing, cadastro e assinatura',
    'Painel B2B de dever de cuidado',
    'Dossiê de emergência aberto por token',
    'Conta, contatos de emergência e exportação LGPD',
    'Administração da plataforma',
  ],
} as const;

/**
 * Rotas estáticas na raiz. `/[orgSlug]` é dinâmico e no mesmo nível: sem esta
 * lista, uma organização com slug "admin" sequestraria o painel interno.
 */
export const RESERVED_SLUGS: readonly string[] = [
  'admin', 'api', 'auth', 'app', 'cadastro', 'conta', 'contatos', 'd', 'dashboard',
  'diario', 'integracoes', 'login', 'analytics', 'para-empresas', 'precos', 'privacidade',
  'seguranca', 'sobre', 'suporte', 'termos', 'viagens', 'www',
];

// ---------------------------------------------------------------------
// Papéis de administração da plataforma
// ---------------------------------------------------------------------
export const PLATFORM_ROLES = ['support', 'admin', 'superadmin'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const PLATFORM_ROLE_META: Record<
  PlatformRole,
  { label: string; description: string }
> = {
  support: {
    label: 'Suporte',
    description: 'Leitura do painel e busca de usuário. Nenhuma escrita.',
  },
  admin: {
    label: 'Administrador',
    description: 'Tudo do suporte + encerrar incidente com justificativa.',
  },
  superadmin: {
    label: 'Superadministrador',
    description: 'Tudo do administrador + conceder e revogar papéis.',
  },
};

// ---------------------------------------------------------------------
// Limiares de saúde do sistema
// ---------------------------------------------------------------------
// Valores de alarme do painel de admin. Ficam aqui, e não espalhados na UI,
// porque são decisão de operação: quem ajusta é quem está de plantão.
export const HEALTH_THRESHOLDS = {
  /** O sweep roda de 5 em 5 min. Acima disso o motor do produto está parado. */
  SWEEP_MAX_SILENCE_S: 15 * 60,
  /** A MV é recalculada de hora em hora. */
  MV_MAX_AGE_MIN: 90,
  /** Ping sem país há mais de 30 min = reverse-geocode caiu. */
  GEOCODE_BACKLOG_WARN: 500,
  /** Notificação presa na fila. O canal de alerta é o produto. */
  NOTIF_STUCK_WARN: 1,
  /** Aparelho móvel sem sinal há tanto tempo provavelmente desinstalou. */
  DEVICE_STALE_DAYS: 30,
} as const;

// ---------------------------------------------------------------------
// Planos
// ---------------------------------------------------------------------
export const PLANS = {
  explorador: { name: 'Explorador', price: 0, currency: 'BRL', interval: 'month' },
  nomade: { name: 'Nômade', price: 19, currency: 'BRL', interval: 'month' },
  organizacao: { name: 'Organização', price: 24, currency: 'BRL', interval: 'month', perSeat: true },
} as const;
export type PlanId = keyof typeof PLANS;
