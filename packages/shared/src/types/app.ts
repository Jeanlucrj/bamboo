/**
 * Tipos de aplicação — ESCRITO À MÃO. Sobrevive ao `pnpm db:types`.
 *
 * Duas responsabilidades:
 *
 *   1. Apelidos curtos sobre o schema gerado. `Profile` lê melhor que
 *      `Database['public']['Tables']['profiles']['Row']` em 40 arquivos, e
 *      derivar em vez de redigitar significa que uma coluna nova na migration
 *      aparece aqui sozinha — e uma coluna removida vira erro de compilação no
 *      lugar certo, em vez de `undefined` em runtime.
 *
 *   2. O formato do `jsonb` que o gerador não consegue inferir. Para o Postgres
 *      o retorno de `admin_overview()` é só `jsonb`; o gerador emite `Json` e
 *      perde toda a estrutura. Estes tipos são um CONTRATO com o corpo da
 *      função SQL: mudou o `jsonb_build_object` lá, muda aqui.
 */

import type { Database, Json } from './database';

type Tables = Database['public']['Tables'];
type Views = Database['public']['Views'];
type Fns = Database['public']['Functions'];

type Row<T extends keyof Tables> = Tables[T]['Row'];
type ViewRow<T extends keyof Views> = Views[T]['Row'];
/** Linha de uma função que devolve SETOF / TABLE. */
type FnRow<T extends keyof Fns> = Fns[T]['Returns'] extends readonly (infer E)[] ? E : never;

// ---------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------
export type SafetyStateDb = Database['public']['Enums']['safety_state'];
export type SignalKindDb = Database['public']['Enums']['signal_kind'];
export type SessionStatusDb = Database['public']['Enums']['session_status'];
export type ContactChannelDb = Database['public']['Enums']['contact_channel'];
export type OrgRoleDb = Database['public']['Enums']['org_role'];
export type NotifStatusDb = Database['public']['Enums']['notif_status'];
export type DevicePlatformDb = Database['public']['Enums']['device_platform'];
/** Papel na PLATAFORMA (nós). Não confundir com OrgRoleDb, que é do cliente B2B. */
export type PlatformRoleDb = Database['public']['Enums']['platform_role'];

// ---------------------------------------------------------------------
// Tabelas
// ---------------------------------------------------------------------
export type Profile = Row<'profiles'>;
export type Organization = Row<'organizations'>;
export type OrgMember = Row<'org_members'>;
export type EmergencyContact = Row<'emergency_contacts'>;
export type EmergencyDossier = Row<'emergency_dossiers'>;
export type TravelSession = Row<'travel_sessions'>;
export type Signal = Row<'signals'>;
export type LocationLog = Row<'location_logs'>;
export type Alert = Row<'alerts'>;
export type Device = Row<'devices'>;
export type PlatformAdmin = Row<'platform_admins'>;
export type AdminAuditEntry = Row<'admin_audit_log'>;
export type Subscription = Row<'subscriptions'>;
export type CountryEmergencyNumbers = Row<'country_emergency_numbers'>;

// ---------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------
/** Semáforo do painel B2B. */
export type OrgTravelerStatus = ViewRow<'v_org_traveler_status'>;
/** Uma passagem contínua por um país — alimenta a timeline do diário. */
export type CountryVisit = ViewRow<'v_user_country_visits'>;

/**
 * Saúde dos aparelhos de uma organização.
 *
 * Veio de uma view e virou função: como view, precisava ser SECURITY DEFINER
 * para atravessar a RLS own-devices-only de `devices`, e ficava sem nenhuma
 * guarda no caminho. `get_org_device_health(org)` checa `is_org_manager()` no
 * corpo antes de devolver qualquer linha.
 */
export type OrgDeviceHealth = FnRow<'get_org_device_health'>;

/**
 * Travel Analytics.
 *
 * Vem da RPC, não da view materializada: `mv_user_travel_stats` não suporta RLS,
 * então o acesso passa por `get_my_travel_stats()`, que filtra por `auth.uid()`.
 * Tipar pela função é tipar o que o app realmente chama.
 */
export type TravelStats = FnRow<'get_my_travel_stats'>;

// ---------------------------------------------------------------------
// Retornos tabulares do painel de administração
// ---------------------------------------------------------------------
export type AdminIncident = FnRow<'admin_open_incidents'>;
export type AdminDeviceStat = FnRow<'admin_device_stats'>;
export type AdminUserWithoutMobile = FnRow<'admin_users_without_mobile'>;
export type AdminUserSearchRow = FnRow<'admin_search_users'>;
export type AdminAuditRow = FnRow<'admin_recent_audit'>;

// =====================================================================
// Formas de jsonb — contrato com o corpo das funções SQL
// =====================================================================

/** Retorno de `admin_overview()`. */
export type AdminOverview = {
  users: { total: number; new_24h: number; new_7d: number; onboarded: number };
  sessions: { active: number; by_state: Partial<Record<SafetyStateDb, number>> };
  alerts: {
    open: number;
    open_sos: number;
    last_24h: number;
    false_alarm_rate_30d: number | null;
  };
  signals: { last_1h: number; life_last_1h: number; by_source_24h: Record<string, number> };
  locations: { pings_1h: number; pings_24h: number };
  devices: { total: number; mobile: number; web: number; without_push: number };
  billing: { active: number; past_due: number };
  generated_at: string;
};

export type CronJobHealth = {
  jobname: string;
  schedule: string;
  active: boolean;
  last_run: string | null;
  last_status: string | null;
  last_error: string | null;
  seconds_since_run: number | null;
};

/** Retorno de `admin_system_health()`. */
export type AdminSystemHealth = {
  /** Vazio quando pg_cron não está acessível — a função degrada em vez de falhar. */
  cron: CronJobHealth[];
  /** `null` quando pg_net não está instalado. */
  http: { responses_1h: number; errors_1h: number } | null;
  analytics: { mv_refreshed_at: string | null; mv_age_minutes: number | null };
  geocoding: { pending: number; oldest_pending_at: string | null };
  notifications: { queued: number; failed_24h: number; sent_24h: number; stuck_queued: number };
  dossier_tokens: { active: number; accessed_24h: number };
  sweep: { overdue_unescalated: number };
  generated_at: string;
};

/** Retorno de `get_dossier(token)` — a única porta de saída do dado médico. */
export type DossierPayload = {
  traveler: { name: string; avatar_url: string | null; phone: string | null };
  alert: {
    id: string;
    level: SafetyStateDb;
    reason: string;
    triggered_at: string;
    resolved_at: string | null;
  };
  last_known: {
    lat: number;
    lng: number;
    accuracy_m: number | null;
    city: string | null;
    country_code: string | null;
    recorded_at: string;
  } | null;
  medical: {
    blood_type: string | null;
    allergies: string | null;
    medications: string | null;
    conditions: string | null;
    insurance_provider: string | null;
    insurance_policy: string | null;
    notes: string | null;
  };
  local_emergency: {
    country_code: string;
    country_name: string;
    police: string | null;
    ambulance: string | null;
    fire: string | null;
    universal: string | null;
    tourist_police: string | null;
    embassy_br_url: string | null;
  } | null;
  recent_track: Array<{ lat: number; lng: number; at: string; city: string | null }>;
  token_expires_at: string;
};

export type { Json };
