-- =====================================================================
-- 05 · REGISTRO DE DISPOSITIVOS
-- =====================================================================
-- Até aqui o sistema sabia QUEM mandou sinal, nunca DE ONDE. Isso é um furo
-- em três frentes:
--
--   1. Produto  — "o celular ficou no hostel" é o principal falso positivo do
--                 desenho. Sem registro de aparelho não dá para diferenciar
--                 "usuário com dois telefones" de "aparelho esquecido".
--   2. Segurança— o navegador pode chamar record_signal com qualquer kind. Um
--                 laptop mandando 'device_movement' mantém o Dead Man's Switch
--                 desarmado para sempre, e hoje nada impede isso.
--   3. Operação — push falha silenciosamente quando o token morre; sem
--                 last_seen_at por aparelho ninguém descobre.
-- =====================================================================

do $$ begin
  create type public.device_platform as enum ('ios','android','web');
exception when duplicate_object then null; end $$;

create table public.devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  platform      public.device_platform not null,

  -- Gerado no cliente e persistido no storage local. NÃO é IMEI nem
  -- advertising id: identificador desses é dado pessoal regulado e a Apple
  -- rejeita o app por coletá-lo sem finalidade declarada.
  install_id    text not null,

  label         text,           -- "iPhone da Ana", editável pelo usuário
  model         text,
  os_version    text,
  app_version   text,
  push_token    text,

  -- Aparelho que o usuário considera o principal. Se um alerta dispara e só
  -- o secundário está vivo, o painel de admin precisa dizer isso.
  is_primary    boolean not null default false,

  last_seen_at  timestamptz not null default now(),
  last_signal_at timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (user_id, install_id)
);

create index devices_user_idx   on public.devices (user_id) where revoked_at is null;
create index devices_stale_idx  on public.devices (last_seen_at) where revoked_at is null;
create index devices_push_idx   on public.devices (user_id) where push_token is not null and revoked_at is null;

create trigger touch_devices before update on public.devices
  for each row execute function public.tg_touch_updated_at();

comment on table public.devices is
  'Aparelhos de um usuário. platform=web é sessão de navegador e NUNCA produz '
  'sinal de vida automático — só ios/android rodam GPS em background.';

-- Só um principal por usuário. Índice parcial em vez de constraint porque o
-- usuário pode não ter escolhido nenhum ainda.
create unique index devices_one_primary on public.devices (user_id)
  where is_primary and revoked_at is null;

-- ---------------------------------------------------------------------
-- Vínculo do sinal com o aparelho
-- ---------------------------------------------------------------------
-- Só em `signals`, não em `location_logs`. location_logs é a tabela que mais
-- cresce e o ping já chega associado à sessão; o que a operação precisa saber
-- ("qual aparelho provou vida") vive no barramento de sinais, que é ordens de
-- grandeza menor e é onde a auditoria olha.
alter table public.signals
  add column if not exists device_id uuid references public.devices(id) on delete set null;

create index if not exists signals_device_idx on public.signals (device_id, occurred_at desc)
  where device_id is not null;

-- ---------------------------------------------------------------------
-- Registro / heartbeat do aparelho
-- ---------------------------------------------------------------------
-- Idempotente por (user_id, install_id): reabrir o app não cria linha nova.
create or replace function public.register_device(
  p_install_id  text,
  p_platform    public.device_platform,
  p_model       text default null,
  p_os_version  text default null,
  p_app_version text default null,
  p_push_token  text default null,
  p_label       text default null
) returns public.devices
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_dev public.devices;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if coalesce(trim(p_install_id), '') = '' then
    raise exception 'install_id_required' using errcode = '22023';
  end if;

  insert into public.devices (
    user_id, install_id, platform, model, os_version, app_version, push_token, label,
    is_primary
  )
  values (
    v_uid, p_install_id, p_platform, p_model, p_os_version, p_app_version, p_push_token, p_label,
    -- Primeiro aparelho móvel do usuário vira o principal automaticamente.
    p_platform <> 'web' and not exists (
      select 1 from public.devices d
      where d.user_id = v_uid and d.platform <> 'web' and d.revoked_at is null
    )
  )
  -- `devices.coluna` sem o schema: é o nome da relação como escrito no INSERT
  -- que o ON CONFLICT aceita. `public.devices.model` aqui vira erro de
  -- "missing FROM-clause entry".
  on conflict (user_id, install_id) do update set
    platform     = excluded.platform,
    model        = coalesce(excluded.model,       devices.model),
    os_version   = coalesce(excluded.os_version,  devices.os_version),
    app_version  = coalesce(excluded.app_version, devices.app_version),
    -- Token nulo no payload significa "não consegui o token agora", não
    -- "revogue o meu". Sobrescrever com null aqui apagaria o push do usuário.
    push_token   = coalesce(excluded.push_token,  devices.push_token),
    label        = coalesce(excluded.label,       devices.label),
    last_seen_at = now(),
    revoked_at   = null
  returning * into v_dev;

  -- Espelha no profile para não quebrar quem já lê profiles.push_token.
  -- A coluna fica como legado: a fonte de verdade passa a ser devices.
  if v_dev.push_token is not null and v_dev.platform <> 'web' then
    update public.profiles set push_token = v_dev.push_token where id = v_uid;
  end if;

  return v_dev;
end $$;

comment on function public.register_device is
  'Chamada no login e a cada abertura do app. A coluna profiles.push_token '
  'vira legado a partir daqui — leia de devices.';

create or replace function public.revoke_device(p_device_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.devices
     set revoked_at = now(), push_token = null, is_primary = false
   where id = p_device_id and user_id = auth.uid() and revoked_at is null;
  return found;
end $$;

-- ---------------------------------------------------------------------
-- A regra que separa app de navegador
-- ---------------------------------------------------------------------
-- record_signal já existia; esta versão adiciona p_device_id e a guarda de
-- plataforma. O corpo restante é idêntico ao da migration 02 — inclusive o
-- clamp temporal, que continua sendo o detalhe mais importante do backend.
create or replace function public.record_signal(
  p_session_id   uuid,
  p_kind         public.signal_kind,
  p_occurred_at  timestamptz default now(),
  p_metadata     jsonb default '{}'::jsonb,
  p_external_ref text default null,
  p_source       text default null,
  p_device_id    uuid default null
) returns public.travel_sessions
language plpgsql security definer set search_path = public as $$
declare
  v_s        public.travel_sessions;
  v_platform public.device_platform;
begin
  select * into v_s from public.travel_sessions where id = p_session_id for update;
  if not found then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;

  if v_s.user_id <> auth.uid()
     and not public.is_org_manager(v_s.org_id)
     and auth.role() <> 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_device_id is not null then
    select platform into v_platform
      from public.devices
     where id = p_device_id and user_id = v_s.user_id and revoked_at is null;

    if v_platform is null then
      raise exception 'unknown_device' using errcode = '42501';
    end if;

    -- Navegador não faz prova de presença física. Não roda GPS em background,
    -- a Geolocation API aceita coordenada forjada com duas linhas de devtools,
    -- e um laptop ligado na mesa emitiria "deslocamento" para sempre — o que
    -- desarma o Dead Man's Switch exatamente no cenário que ele existe para
    -- cobrir. Check-in explícito e abertura de app continuam valendo: ali há
    -- um humano deliberadamente afirmando que está bem.
    if v_platform = 'web' and p_kind in ('device_movement','gps_ping') then
      raise exception 'web_device_cannot_emit_location_signal' using errcode = '42501';
    end if;

    update public.devices
       set last_seen_at = now(),
           last_signal_at = case when p_kind = 'gps_ping' then last_signal_at else now() end
     where id = p_device_id;
  end if;

  -- Clamp temporal: nunca aceitar sinal no futuro, nunca retroceder o relógio.
  -- Sem isso um ping bufferado offline por 20 h chega e "reseta" o timer como
  -- se fosse agora — e o alarme nunca dispararia.
  p_occurred_at := least(greatest(p_occurred_at, v_s.last_signal_at), now());

  insert into public.signals
    (user_id, session_id, kind, occurred_at, metadata, external_ref, source, device_id)
  values
    (v_s.user_id, p_session_id, p_kind, p_occurred_at, p_metadata, p_external_ref, p_source, p_device_id)
  on conflict (kind, external_ref) do nothing;

  -- gps_ping é posição sem deslocamento: histórico e diário de bordo sim,
  -- prova de vida não.
  if p_kind = 'gps_ping' then
    return v_s;
  end if;

  if p_kind = 'device_movement' and not v_s.passive_checkin_enabled then
    return v_s;
  end if;

  update public.travel_sessions set
    last_signal_at   = p_occurred_at,
    last_signal_kind = p_kind,
    state            = case when state = 'sos' then state else 'safe'::public.safety_state end,
    escalation_step  = case when state = 'sos' then escalation_step else 0 end
  where id = p_session_id
  returning * into v_s;

  return v_s;
end $$;

-- A assinatura de 6 argumentos vira ambígua com a nova de 7 (todos os extras
-- têm default). Removida para o PostgREST não errar na resolução por nome.
drop function if exists public.record_signal(
  uuid, public.signal_kind, timestamptz, jsonb, text, text
);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.devices enable row level security;

create policy "own devices" on public.devices
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Gestor B2B vê SE o aparelho está vivo, nunca o push_token nem o modelo.
-- Por isso é uma view com colunas selecionadas, não policy na tabela.
--
-- Deliberadamente SEM security_invoker: com ele a RLS de devices ("own
-- devices") se aplicaria ao gestor e a view voltaria vazia. Quem autoriza aqui
-- é o is_org_manager() no WHERE — auth.uid() continua sendo o do chamador.
create or replace view public.v_org_device_health as
select
  m.org_id,
  d.user_id,
  d.platform,
  d.last_seen_at,
  d.last_signal_at,
  d.push_token is not null as has_push
from public.devices d
join public.org_members m on m.user_id = d.user_id
where d.revoked_at is null
  and d.platform <> 'web'
  and public.is_org_manager(m.org_id);

grant select on public.v_org_device_health to authenticated;

-- ---------------------------------------------------------------------
-- Ingestão de GPS carimbada com o aparelho
-- ---------------------------------------------------------------------
-- Mesmo corpo da migration 02; muda só o repasse de p_device_id ao
-- record_signal, para o lote de pings ficar atribuído ao aparelho que o
-- produziu. Sem isso o carimbo de dispositivo só existiria no check-in manual
-- — justamente o sinal que o usuário sempre pode dar de qualquer lugar.
create or replace function public.ingest_location_batch(
  p_pings     jsonb,
  p_device_id uuid default null
) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid       uuid := auth.uid();
  v_inserted  int;
  v_session   uuid;
  v_latest    timestamptz;
  v_anchor    geography;
  v_threshold int;
  v_moved_m   double precision;
  v_moved_at  timestamptz;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if jsonb_typeof(p_pings) <> 'array' or jsonb_array_length(p_pings) = 0 then
    return 0;
  end if;

  select geom into v_anchor
    from public.location_logs
   where user_id = v_uid
   order by recorded_at desc
   limit 1;

  with rows as (
    select
      v_uid                                                     as user_id,
      nullif(x->>'session_id','')::uuid                         as session_id,
      (x->>'client_ping_id')::uuid                              as client_ping_id,
      st_setsrid(st_makepoint((x->>'lng')::float8,
                              (x->>'lat')::float8), 4326)::geography as geom,
      nullif(x->>'accuracy_m','')::real                         as accuracy_m,
      nullif(x->>'altitude_m','')::real                         as altitude_m,
      nullif(x->>'speed_mps','')::real                          as speed_mps,
      nullif(x->>'battery_level','')::real                      as battery_level,
      nullif(x->>'is_moving','')::boolean                       as is_moving,
      least((x->>'recorded_at')::timestamptz, now())            as recorded_at
    from jsonb_array_elements(p_pings) as x
  ),
  ins as (
    insert into public.location_logs
      (user_id, session_id, client_ping_id, geom, accuracy_m, altitude_m,
       speed_mps, battery_level, is_moving, recorded_at)
    select user_id, session_id, client_ping_id, geom, accuracy_m, altitude_m,
           speed_mps, battery_level, is_moving, recorded_at
    from rows
    on conflict (user_id, client_ping_id) do nothing
    returning 1
  )
  select count(*) into v_inserted from ins;

  select nullif(p_pings->0->>'session_id','')::uuid into v_session;
  if v_session is null then
    return v_inserted;
  end if;

  select movement_threshold_m into v_threshold
    from public.travel_sessions where id = v_session;
  v_threshold := coalesce(v_threshold, 150);

  select max(least((x->>'recorded_at')::timestamptz, now()))
    into v_latest
    from jsonb_array_elements(p_pings) as x;

  if v_anchor is null then
    v_moved_m  := v_threshold + 1;
    v_moved_at := v_latest;
  else
    select max(st_distance(v_anchor, geom)),
           max(recorded_at) filter (where st_distance(v_anchor, geom) >= v_threshold)
      into v_moved_m, v_moved_at
      from public.location_logs
     where user_id = v_uid
       and client_ping_id in (
         select (x->>'client_ping_id')::uuid from jsonb_array_elements(p_pings) x
       );
  end if;

  perform public.record_signal(
    v_session,
    case when coalesce(v_moved_m, 0) >= v_threshold
         then 'device_movement'::public.signal_kind
         else 'gps_ping'::public.signal_kind
    end,
    coalesce(v_moved_at, v_latest),
    jsonb_build_object(
      'batch_size',  jsonb_array_length(p_pings),
      'inserted',    v_inserted,
      'moved_m',     round(coalesce(v_moved_m, 0)::numeric, 1),
      'threshold_m', v_threshold
    ),
    null,
    'device',
    p_device_id
  );

  return v_inserted;
end $$;

drop function if exists public.ingest_location_batch(jsonb);

grant execute on function public.register_device(text, public.device_platform, text, text, text, text, text) to authenticated;
grant execute on function public.revoke_device(uuid) to authenticated;
grant execute on function public.record_signal(uuid, public.signal_kind, timestamptz, jsonb, text, text, uuid) to authenticated;
grant execute on function public.ingest_location_batch(jsonb, uuid) to authenticated;
