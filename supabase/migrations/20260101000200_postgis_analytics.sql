-- =====================================================================
-- 02 · GEO-ANALYTICS (PostGIS) E RPCs DE NEGÓCIO
-- =====================================================================
--
-- Por que geography e não geometry:
--   geography(Point,4326) faz ST_Distance devolver METROS geodésicos direto.
--   Com geometry seria preciso reprojetar para UTM por zona — inviável para
--   quem cruza hemisférios numa mesma viagem.
-- =====================================================================

-- Mesma razão da migration 01: as VIEWS abaixo chamam st_distance, st_x e st_y
-- sem qualificar, e views não têm `set search_path` próprio como as funções.
-- A referência é resolvida por OID no momento do CREATE, então basta o schema
-- estar no caminho aqui.
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- 2.1 Segmentos: liga cada ponto ao anterior do MESMO usuário
-- ---------------------------------------------------------------------
create or replace view public.v_location_segments as
with pts as (
  select
    id, user_id, session_id, geom, recorded_at, country_code, city,
    lag(geom)        over w as prev_geom,
    lag(recorded_at) over w as prev_recorded_at
  from public.location_logs
  where coalesce(accuracy_m, 0) <= 150       -- descarta pontos imprecisos
  window w as (partition by user_id order by recorded_at)
)
select
  user_id,
  session_id,
  id as to_log_id,
  prev_recorded_at,
  recorded_at,
  country_code,
  city,
  st_distance(prev_geom, geom) as distance_m,
  extract(epoch from (recorded_at - prev_recorded_at)) as duration_s,
  st_distance(prev_geom, geom)
    / nullif(extract(epoch from (recorded_at - prev_recorded_at)), 0) as speed_mps
from pts
where prev_geom is not null
  and recorded_at > prev_recorded_at;

-- ---------------------------------------------------------------------
-- 2.2 Segmentos válidos: remove ruído de GPS e teletransporte impossível
-- ---------------------------------------------------------------------
create or replace view public.v_valid_segments as
select *
from public.v_location_segments
where distance_m >= 50               -- < 50 m parado = jitter de GPS
  and distance_m <= 20000000         -- meio globo: teto de sanidade
  and coalesce(speed_mps, 0) <= 350; -- ~1260 km/h. Acima disso é erro, não avião.
                                     -- Voos reais passam: a velocidade média
                                     -- inclui todo o tempo de voo entre pings.

comment on view public.v_valid_segments is
  'Filtra o salto clássico de milhares de km quando o SO resolve a posição por '
  'um MAC de roteador cadastrado no lugar errado.';

-- ---------------------------------------------------------------------
-- 2.3 Timeline de países: agrupa pings consecutivos no mesmo país
-- ---------------------------------------------------------------------
create or replace view public.v_user_country_visits as
with ordered as (
  select
    user_id, country_code, recorded_at,
    lag(country_code) over (partition by user_id order by recorded_at) as prev_country
  from public.location_logs
  where country_code is not null
),
marked as (
  select *,
    count(*) filter (where prev_country is distinct from country_code)
      over (partition by user_id order by recorded_at rows unbounded preceding) as visit_seq
  from ordered
)
select
  user_id,
  country_code,
  visit_seq,
  min(recorded_at)                    as entered_at,
  max(recorded_at)                    as left_at,
  max(recorded_at) - min(recorded_at) as duration,
  count(*)                            as ping_count
from marked
group by user_id, country_code, visit_seq;

-- ---------------------------------------------------------------------
-- 2.4 VIEW MATERIALIZADA do Travel Analytics
--     Somar ST_Distance sobre location_logs inteira é O(n) na tabela que
--     mais cresce. O app lê daqui (1 linha por usuário, leitura instantânea)
--     e o cron faz REFRESH CONCURRENTLY de hora em hora.
-- ---------------------------------------------------------------------
create materialized view public.mv_user_travel_stats as
with dist as (
  select
    user_id,
    round((sum(distance_m) / 1000.0)::numeric, 1) as total_km,
    round((sum(distance_m) filter (where recorded_at >= now() - interval '365 days')
           / 1000.0)::numeric, 1) as km_last_365d,
    round((sum(distance_m) filter (where coalesce(speed_mps, 0) > 80)
           / 1000.0)::numeric, 1) as km_by_air_or_rail,
    count(*) as segment_count
  from public.v_valid_segments
  group by user_id
),
geo as (
  select
    user_id,
    count(distinct country_code) filter (where country_code is not null) as countries_count,
    count(distinct (country_code || '|' || city)) filter (where city is not null) as cities_count,
    count(distinct date_trunc('day', recorded_at)) as days_tracked,
    min(recorded_at) as first_ping_at,
    max(recorded_at) as last_ping_at,
    array_agg(distinct country_code) filter (where country_code is not null) as countries
  from public.location_logs
  group by user_id
),
trips as (
  select
    user_id,
    count(*) filter (where status = 'completed') as trips_completed,
    count(*) filter (where status = 'active')    as trips_active
  from public.travel_sessions
  group by user_id
),
checkins as (
  select
    user_id,
    count(*) filter (where kind = 'manual_checkin') as manual_checkins,
    -- "Passivo" = provou que estava vivo sem tocar no app.
    count(*) filter (where kind in ('device_movement','app_open')) as passive_checkins
  from public.signals
  group by user_id
)
select
  p.id                                as user_id,
  coalesce(d.total_km, 0)             as total_km,
  coalesce(d.km_last_365d, 0)         as km_last_365d,
  coalesce(d.km_by_air_or_rail, 0)    as km_by_air_or_rail,
  coalesce(g.countries_count, 0)      as countries_count,
  coalesce(g.cities_count, 0)         as cities_count,
  coalesce(g.days_tracked, 0)         as days_tracked,
  coalesce(g.countries, '{}')         as countries,
  round((coalesce(g.countries_count, 0) / 195.0 * 100)::numeric, 1) as world_percent,
  round((coalesce(d.total_km, 0) / 40075.0)::numeric, 2)            as earth_laps,
  g.first_ping_at,
  g.last_ping_at,
  coalesce(t.trips_completed, 0)      as trips_completed,
  coalesce(t.trips_active, 0)         as trips_active,
  coalesce(c.manual_checkins, 0)      as manual_checkins,
  coalesce(c.passive_checkins, 0)     as passive_checkins,
  now()                               as refreshed_at
from public.profiles p
left join dist     d on d.user_id = p.id
left join geo      g on g.user_id = p.id
left join trips    t on t.user_id = p.id
left join checkins c on c.user_id = p.id;

-- Índice único é OBRIGATÓRIO para REFRESH MATERIALIZED VIEW CONCURRENTLY.
create unique index mv_user_travel_stats_pk on public.mv_user_travel_stats (user_id);

-- Leitura da MV filtrada pelo próprio usuário (MV não suporta RLS).
create or replace function public.get_my_travel_stats()
returns setof public.mv_user_travel_stats
language sql stable security definer set search_path = public as $$
  select * from public.mv_user_travel_stats where user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- 2.5 Trajeto de uma viagem em GeoJSON, pronto para o Mapbox
-- ---------------------------------------------------------------------
create or replace function public.get_session_track(
  p_session_id  uuid,
  p_tolerance_m double precision default 50
) returns jsonb
language sql stable security invoker set search_path = public, extensions as $$
  select st_asgeojson(
    st_simplify(
      st_makeline(geom::geometry order by recorded_at),
      p_tolerance_m / 111320.0        -- metros -> graus (aproximação suficiente)
    )
  )::jsonb
  from public.location_logs
  where session_id = p_session_id;
$$;

-- ---------------------------------------------------------------------
-- 2.6 Semáforo do painel B2B
-- ---------------------------------------------------------------------
create or replace view public.v_org_traveler_status as
select
  m.org_id,
  p.id as user_id,
  p.full_name,
  p.avatar_url,
  s.id as session_id,
  s.title,
  s.destination_label,
  s.state,
  s.last_signal_at,
  s.last_signal_kind,
  s.expected_checkin_at,
  case
    when s.state in ('alert','sos')     then 'red'
    when s.state in ('grace','warning') then 'amber'
    when s.id is null                   then 'grey'
    else 'green'
  end as traffic_light,
  l.country_code,
  l.city,
  st_y(l.geom::geometry) as last_lat,
  st_x(l.geom::geometry) as last_lng,
  l.recorded_at as last_location_at
from public.org_members m
join public.profiles p on p.id = m.user_id
left join lateral (
  select * from public.travel_sessions ts
  where ts.user_id = p.id and ts.status = 'active'
  order by ts.starts_at desc
  limit 1
) s on true
left join lateral (
  select * from public.location_logs ll
  where ll.user_id = p.id
  order by ll.recorded_at desc
  limit 1
) l on true;

-- =====================================================================
-- 2.7 RPCs DE NEGÓCIO
-- =====================================================================

-- Única porta de entrada para resetar o cronômetro do Dead Man's Switch.
create or replace function public.record_signal(
  p_session_id   uuid,
  p_kind         public.signal_kind,
  p_occurred_at  timestamptz default now(),
  p_metadata     jsonb default '{}'::jsonb,
  p_external_ref text default null,
  p_source       text default null
) returns public.travel_sessions
language plpgsql security definer set search_path = public as $$
declare
  v_s public.travel_sessions;
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

  -- Clamp temporal, e este é o detalhe que faz o produto funcionar:
  -- nunca aceitar sinal no futuro, nunca retroceder o relógio.
  -- Sem isso, um ping bufferado offline por 20 h chega e "reseta" o timer
  -- como se fosse agora — e o alarme nunca dispararia.
  p_occurred_at := least(greatest(p_occurred_at, v_s.last_signal_at), now());

  insert into public.signals (user_id, session_id, kind, occurred_at, metadata, external_ref, source)
  values (v_s.user_id, p_session_id, p_kind, p_occurred_at, p_metadata, p_external_ref, p_source)
  on conflict (kind, external_ref) do nothing;

  -- gps_ping é posição sem deslocamento: entra no histórico e no diário de
  -- bordo, mas NÃO é prova de vida. Um celular parado numa gaveta emite
  -- heartbeat para sempre; se isso resetasse o cronômetro, o Dead Man's
  -- Switch nunca dispararia.
  if p_kind = 'gps_ping' then
    return v_s;
  end if;

  -- Deslocamento só conta como sinal automático se a sessão permitir.
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

-- Ingestão em lote de pings de GPS. Idempotente por (user_id, client_ping_id):
-- reenviar o mesmo lote após timeout de rede não duplica nada.
create or replace function public.ingest_location_batch(p_pings jsonb)
returns int
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid        uuid := auth.uid();
  v_inserted   int;
  v_session    uuid;
  v_latest     timestamptz;
  v_anchor     geography;   -- posição de referência antes deste lote
  v_threshold  int;
  v_moved_m    double precision;
  v_moved_at   timestamptz;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if jsonb_typeof(p_pings) <> 'array' or jsonb_array_length(p_pings) = 0 then
    return 0;
  end if;

  -- Guarda a última posição conhecida ANTES de inserir o lote: é contra ela
  -- que mediremos se houve deslocamento real.
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
      -- clamp: relógio do device adiantado não pode virar sinal no futuro
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

  -- Houve deslocamento real em algum ponto do lote?
  -- Mede contra a âncora (posição anterior ao lote); se não havia âncora,
  -- o primeiro ping do usuário conta como deslocamento.
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
      'batch_size', jsonb_array_length(p_pings),
      'inserted',   v_inserted,
      'moved_m',    round(coalesce(v_moved_m, 0)::numeric, 1),
      'threshold_m', v_threshold
    ),
    null, 'device'
  );

  return v_inserted;
end $$;

-- Motor de escalonamento. Chamado pela Edge Function deadman-sweep (cron */5min).
create or replace function public.claim_overdue_sessions(p_limit int default 200)
returns table (
  session_id      uuid,
  user_id         uuid,
  org_id          uuid,
  new_state       public.safety_state,
  escalation_step smallint
)
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_only' using errcode = '42501';
  end if;

  return query
  with due as (
    select
      s.id,
      case
        when now() >= s.expected_checkin_at + s.grace_period + s.alert_delay
          then 'alert'::public.safety_state
        when now() >= s.expected_checkin_at + s.grace_period
          then 'warning'::public.safety_state
        else 'grace'::public.safety_state
      end as next_state
    from public.travel_sessions s
    where s.status = 'active'
      and s.state <> 'sos'
      and now() >= s.expected_checkin_at
    order by s.expected_checkin_at
    limit p_limit
    for update skip locked      -- duas execuções do cron não se atropelam
  )
  update public.travel_sessions t
     set state = due.next_state,
         escalation_step = t.escalation_step + 1
    from due
   where t.id = due.id
     and t.state is distinct from due.next_state
  returning t.id, t.user_id, t.org_id, t.state, t.escalation_step;
end $$;

-- Abre (ou reaproveita) o alerta de uma sessão e devolve o id.
create or replace function public.open_alert(
  p_session_id uuid,
  p_level      public.safety_state,
  p_reason     text
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_alert_id uuid;
  v_s        public.travel_sessions;
  v_last     public.location_logs;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_only' using errcode = '42501';
  end if;

  select * into v_s from public.travel_sessions where id = p_session_id;
  select * into v_last from public.location_logs
    where user_id = v_s.user_id order by recorded_at desc limit 1;

  insert into public.alerts (session_id, user_id, org_id, level, reason,
                             last_known_geom, last_known_at)
  values (p_session_id, v_s.user_id, v_s.org_id, p_level, p_reason,
          v_last.geom, v_last.recorded_at)
  on conflict (session_id) where resolved_at is null
  do update set level = excluded.level, reason = excluded.reason
  returning id into v_alert_id;

  return v_alert_id;
end $$;

-- Gera um token de dossiê. Devolve o token EM CLARO uma única vez;
-- o banco guarda apenas o sha256.
create or replace function public.issue_dossier_token(
  p_alert_id   uuid,
  p_contact_id uuid default null,
  p_ttl        interval default '7 days'
) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_token text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_only' using errcode = '42501';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.dossier_tokens (alert_id, contact_id, token_hash, expires_at)
  values (p_alert_id, p_contact_id,
          encode(digest(v_token, 'sha256'), 'hex'),
          now() + p_ttl);

  return v_token;
end $$;

-- Acesso público ao dossiê. Única forma de ler emergency_dossiers de fora.
create or replace function public.get_dossier(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_tok   public.dossier_tokens;
  v_alert public.alerts;
  v_out   jsonb;
begin
  select * into v_tok
  from public.dossier_tokens
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and revoked_at is null
    and expires_at > now();

  if not found then
    raise exception 'invalid_or_expired_token' using errcode = '42501';
  end if;

  update public.dossier_tokens
     set access_count = access_count + 1, last_accessed_at = now()
   where id = v_tok.id;

  select * into v_alert from public.alerts where id = v_tok.alert_id;

  select jsonb_build_object(
    'traveler', jsonb_build_object(
      'name', p.full_name, 'avatar_url', p.avatar_url, 'phone', p.phone
    ),
    'alert', jsonb_build_object(
      'id', v_alert.id, 'level', v_alert.level, 'reason', v_alert.reason,
      'triggered_at', v_alert.triggered_at, 'resolved_at', v_alert.resolved_at
    ),
    'last_known', case when l.id is null then null else jsonb_build_object(
      'lat', st_y(l.geom::geometry), 'lng', st_x(l.geom::geometry),
      'accuracy_m', l.accuracy_m, 'city', l.city,
      'country_code', l.country_code, 'recorded_at', l.recorded_at
    ) end,
    'medical', jsonb_build_object(
      'blood_type', d.blood_type, 'allergies', d.allergies,
      'medications', d.medications, 'conditions', d.medical_conditions,
      'insurance_provider', d.insurance_provider,
      'insurance_policy', d.insurance_policy, 'notes', d.additional_notes
    ),
    'local_emergency', to_jsonb(cen.*),
    'recent_track', coalesce((
      select jsonb_agg(jsonb_build_object(
               'lat', st_y(geom::geometry), 'lng', st_x(geom::geometry),
               'at', recorded_at, 'city', city) order by recorded_at desc)
      from public.location_logs
      where user_id = v_alert.user_id and recorded_at > now() - interval '7 days'
    ), '[]'::jsonb),
    'token_expires_at', v_tok.expires_at
  ) into v_out
  from public.profiles p
  left join public.emergency_dossiers d on d.user_id = p.id
  left join lateral (
    select * from public.location_logs ll
    where ll.user_id = p.id order by ll.recorded_at desc limit 1
  ) l on true
  left join public.country_emergency_numbers cen on cen.country_code = l.country_code
  where p.id = v_alert.user_id;

  return v_out;
end $$;

revoke all on function public.get_dossier(text) from public;
grant execute on function public.get_dossier(text) to anon, authenticated;

-- Contato de emergência marca "falei com ela, está tudo bem".
create or replace function public.resolve_alert_by_token(
  p_token text,
  p_note  text default null
) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_tok public.dossier_tokens;
begin
  select * into v_tok from public.dossier_tokens
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and revoked_at is null and expires_at > now();

  if not found then
    raise exception 'invalid_or_expired_token' using errcode = '42501';
  end if;

  update public.alerts
     set resolved_at = now(), resolution_note = p_note, was_false_alarm = true
   where id = v_tok.alert_id and resolved_at is null;

  update public.travel_sessions t
     set state = 'resolved'
    from public.alerts a
   where a.id = v_tok.alert_id and t.id = a.session_id;

  return true;
end $$;

grant execute on function public.resolve_alert_by_token(text, text) to anon, authenticated;
