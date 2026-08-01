-- =====================================================================
-- 01 · SCHEMA PRINCIPAL
-- =====================================================================

-- PostGIS foi instalado em `extensions` (migration 00), não em `public`. O
-- runner de migrations conecta com search_path = public, então `geography(...)`
-- não resolve e o CREATE TABLE falha com "type geography does not exist".
--
-- No dia a dia isso não aparece: o Supabase põe `extensions` no search_path dos
-- papéis anon/authenticated, então a aplicação nunca vê o problema — só o
-- deploy vê. Incluir o schema aqui resolve de uma vez; as colunas guardam o
-- tipo por OID, então o search_path não precisa persistir depois.
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- IDENTIDADE
-- ---------------------------------------------------------------------
create table public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  full_name            text not null,
  phone                text,
  avatar_url           text,
  locale               text not null default 'pt-BR',
  timezone             text not null default 'UTC',
  home_country         char(2),
  current_country      char(2),
  date_of_birth        date,
  onboarding_completed boolean not null default false,
  push_token           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger touch_profiles before update on public.profiles
  for each row execute function public.tg_touch_updated_at();

-- Cria o profile automaticamente no signup do Supabase Auth.
create or replace function public.tg_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.tg_handle_new_user();

-- ---------------------------------------------------------------------
-- ORGANIZAÇÕES (B2B)
-- ---------------------------------------------------------------------
create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  plan       text not null default 'trial',
  seats      int  not null default 5,
  logo_url   text,
  -- políticas: intervalo máximo permitido, países de alto risco, escalonamento custom
  settings   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger touch_orgs before update on public.organizations
  for each row execute function public.tg_touch_updated_at();

create table public.org_members (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references public.profiles(id)      on delete cascade,
  role       public.org_role not null default 'member',
  invited_at timestamptz not null default now(),
  joined_at  timestamptz,
  primary key (org_id, user_id)
);
create index org_members_user_idx on public.org_members (user_id);

-- Helpers SECURITY DEFINER. Sem eles, uma policy de org_members que consulta
-- org_members entra em recursão infinita de RLS.
create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org and user_id = auth.uid() and joined_at is not null
  );
$$;

create or replace function public.is_org_manager(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org and user_id = auth.uid()
      and role in ('owner','admin','manager') and joined_at is not null
  );
$$;

-- ---------------------------------------------------------------------
-- DOSSIÊ E CONTATOS DE EMERGÊNCIA
-- ---------------------------------------------------------------------
-- Dado pessoal sensível (LGPD art. 11 / GDPR art. 9). Fica em tabela
-- separada, com RLS estrita, e só é exposto ao mundo via get_dossier().
create table public.emergency_dossiers (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  blood_type         text,
  allergies          text,
  medications        text,
  medical_conditions text,
  passport_masked    text,  -- apenas os 4 últimos dígitos
  insurance_provider text,
  insurance_policy   text,
  additional_notes   text,
  updated_at         timestamptz not null default now()
);

create trigger touch_dossiers before update on public.emergency_dossiers
  for each row execute function public.tg_touch_updated_at();

create table public.emergency_contacts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  full_name          text not null,
  relationship       text,
  email              text,
  phone              text,
  preferred_channel  public.contact_channel not null default 'email',
  locale             text not null default 'pt-BR',
  priority           smallint not null default 1,
  is_verified        boolean not null default false,
  verified_at        timestamptz,
  verification_token text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint contact_needs_a_channel check (email is not null or phone is not null)
);
create index emergency_contacts_user_idx on public.emergency_contacts (user_id, priority);

create trigger touch_contacts before update on public.emergency_contacts
  for each row execute function public.tg_touch_updated_at();

create table public.country_emergency_numbers (
  country_code   char(2) primary key,
  country_name   text not null,
  police         text,
  ambulance      text,
  fire           text,
  universal      text,
  tourist_police text,
  embassy_br_url text,
  notes          text
);

-- ---------------------------------------------------------------------
-- SESSÕES DE VIAGEM — o Dead Man's Switch
-- ---------------------------------------------------------------------
create table public.travel_sessions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  org_id                  uuid references public.organizations(id) on delete set null,
  title                   text not null,
  destination_label       text,
  status                  public.session_status not null default 'active',
  state                   public.safety_state   not null default 'safe',
  starts_at               timestamptz not null default now(),
  ends_at                 timestamptz,
  checkin_interval        interval not null default '24 hours',
  grace_period            interval not null default '2 hours',
  alert_delay             interval not null default '6 hours',
  escalation_step         smallint not null default 0,
  -- Deslocamento detectado pelo GPS conta como sinal de vida automático.
  -- Desligado, só check-in manual e abertura do app resetam o cronômetro.
  passive_checkin_enabled boolean not null default true,
  gps_tracking_enabled    boolean not null default true,
  -- Distância mínima, em metros, para um novo ponto ser considerado
  -- deslocamento real e não ruído de GPS parado.
  movement_threshold_m    int not null default 150,
  quiet_hours_start       time,
  quiet_hours_end         time,
  last_signal_at          timestamptz not null default now(),
  last_signal_kind        public.signal_kind not null default 'manual_checkin',
  expected_checkin_at     timestamptz not null default now() + interval '24 hours',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint sane_interval check (checkin_interval between interval '1 hour' and interval '30 days'),
  constraint sane_grace    check (grace_period    between interval '0 minutes' and interval '24 hours'),
  constraint sane_movement check (movement_threshold_m between 50 and 10000)
);

-- expected_checkin_at é sempre derivado. Não use GENERATED: `timestamptz + interval`
-- é STABLE (depende de TimeZone), não IMMUTABLE, e o Postgres rejeita.
create or replace function public.tg_set_expected_checkin()
returns trigger language plpgsql as $$
begin
  new.expected_checkin_at := new.last_signal_at + new.checkin_interval;
  return new;
end $$;

create trigger set_expected_checkin
  before insert or update of last_signal_at, checkin_interval
  on public.travel_sessions
  for each row execute function public.tg_set_expected_checkin();

create trigger touch_sessions before update on public.travel_sessions
  for each row execute function public.tg_touch_updated_at();

-- Índice parcial: o cron de 5 em 5 minutos varre só o que pode estar vencido.
create index sessions_due_idx on public.travel_sessions (expected_checkin_at)
  where status = 'active' and state <> 'resolved';
create index sessions_user_idx on public.travel_sessions (user_id, status);
create index sessions_org_idx  on public.travel_sessions (org_id) where org_id is not null;

-- Barramento unificado de sinais de vida.
create table public.signals (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  session_id   uuid references public.travel_sessions(id) on delete cascade,
  kind         public.signal_kind not null,
  occurred_at  timestamptz not null default now(),
  received_at  timestamptz not null default now(),
  source       text,          -- 'ios' | 'android' | 'web' | 'device'
  external_ref text,          -- chave de idempotência para reenvios
  metadata     jsonb not null default '{}'::jsonb,
  unique (kind, external_ref)
);
create index signals_session_idx on public.signals (session_id, occurred_at desc);
create index signals_user_idx    on public.signals (user_id, occurred_at desc);

-- ---------------------------------------------------------------------
-- LOCALIZAÇÃO (PostGIS)
-- ---------------------------------------------------------------------
create table public.location_logs (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  session_id     uuid references public.travel_sessions(id) on delete set null,
  client_ping_id uuid not null,                      -- gerado no device -> dedupe de reenvio
  geom           geography(Point,4326) not null,
  accuracy_m     real,
  altitude_m     real,
  speed_mps      real,
  heading        real,
  battery_level  real,
  is_moving      boolean,
  country_code   char(2),
  region         text,
  city           text,
  geocoded_at    timestamptz,
  recorded_at    timestamptz not null,               -- relógio do DEVICE
  received_at    timestamptz not null default now(), -- relógio do SERVIDOR
  unique (user_id, client_ping_id)
);

create index location_user_time_idx   on public.location_logs (user_id, recorded_at desc);
create index location_geom_idx        on public.location_logs using gist (geom);
create index location_session_idx     on public.location_logs (session_id, recorded_at);
create index location_pending_geo_idx on public.location_logs (recorded_at)
  where country_code is null;

comment on table public.location_logs is
  'Tabela de maior crescimento do sistema. Em escala, particionar por RANGE(recorded_at) mensal.';

-- ---------------------------------------------------------------------
-- ALERTAS, DOSSIÊS TEMPORÁRIOS E NOTIFICAÇÕES
-- ---------------------------------------------------------------------
create table public.alerts (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.travel_sessions(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  org_id          uuid references public.organizations(id) on delete set null,
  level           public.safety_state not null,
  reason          text not null,
  triggered_at    timestamptz not null default now(),
  last_known_geom geography(Point,4326),
  last_known_at   timestamptz,
  resolved_at     timestamptz,
  resolved_by     uuid references public.profiles(id),
  resolution_note text,
  was_false_alarm boolean,
  created_at      timestamptz not null default now()
);
create index alerts_open_idx on public.alerts (org_id, triggered_at desc) where resolved_at is null;
create index alerts_user_idx on public.alerts (user_id, triggered_at desc);
-- Um alerta aberto por sessão. Evita spam se o cron rodar duas vezes.
create unique index alerts_one_open_per_session on public.alerts (session_id)
  where resolved_at is null;

create table public.dossier_tokens (
  id               uuid primary key default gen_random_uuid(),
  alert_id         uuid not null references public.alerts(id) on delete cascade,
  contact_id       uuid references public.emergency_contacts(id) on delete set null,
  token_hash       text not null unique,   -- sha256; o token em claro só existe no link
  expires_at       timestamptz not null default now() + interval '7 days',
  revoked_at       timestamptz,
  access_count     int not null default 0,
  last_accessed_at timestamptz,
  created_at       timestamptz not null default now()
);
create index dossier_tokens_alert_idx on public.dossier_tokens (alert_id);

create table public.alert_notifications (
  id           uuid primary key default gen_random_uuid(),
  alert_id     uuid not null references public.alerts(id) on delete cascade,
  contact_id   uuid references public.emergency_contacts(id) on delete set null,
  channel      public.contact_channel not null,
  status       public.notif_status not null default 'queued',
  provider_ref text,
  error        text,
  sent_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index alert_notifications_alert_idx on public.alert_notifications (alert_id);

create table public.dossier_access_log (
  id          bigint generated always as identity primary key,
  token_id    uuid not null references public.dossier_tokens(id) on delete cascade,
  ip          inet,
  user_agent  text,
  accessed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- BILLING
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references public.profiles(id) on delete cascade,
  org_id             uuid references public.organizations(id) on delete cascade,
  stripe_customer_id text,
  stripe_sub_id      text unique,
  plan               text not null,
  status             text not null,
  seats              int  not null default 1,
  current_period_end timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint owner_is_user_xor_org check (num_nonnulls(user_id, org_id) = 1)
);

create trigger touch_subs before update on public.subscriptions
  for each row execute function public.tg_touch_updated_at();
