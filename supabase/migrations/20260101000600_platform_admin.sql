-- =====================================================================
-- 06 · ADMINISTRAÇÃO DA PLATAFORMA
-- =====================================================================
-- Papel de admin do PRODUTO (nós), que é coisa diferente de public.org_role
-- (o cliente B2B administrando a própria organização). Os dois já se chamam
-- "admin" no sistema; misturar os conceitos numa coluna só seria a origem de
-- uma escalada de privilégio silenciosa.
-- =====================================================================

do $$ begin
  -- Ordem da declaração é a ordem de comparação do enum no Postgres:
  -- 'support' < 'admin' < 'superadmin'. É isso que faz `role >= p_min`
  -- funcionar como hierarquia sem tabela de permissões.
  create type public.platform_role as enum ('support','admin','superadmin');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- POR QUE UMA TABELA E NÃO UMA COLUNA EM profiles
-- ---------------------------------------------------------------------
-- profiles tem a policy `own profile FOR ALL using (id = auth.uid())`.
-- Uma coluna `is_admin` ali seria escrita pelo próprio dono da linha: qualquer
-- usuário faria `update profiles set is_admin = true where id = auth.uid()`
-- pelo PostgREST e viraria administrador da plataforma inteira. Não é hipótese
-- remota — é uma requisição HTTP.
--
-- Aqui a RLS nega tudo e nenhuma policy é criada. Só service_role e as funções
-- SECURITY DEFINER abaixo enxergam a tabela.
-- ---------------------------------------------------------------------
create table public.platform_admins (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  role       public.platform_role not null default 'support',
  granted_by uuid references public.profiles(id),
  granted_at timestamptz not null default now(),
  note       text
);

alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;

comment on table public.platform_admins is
  'Deny-all por RLS e sem policies, de propósito. Conceder acesso: '
  'insert into platform_admins (user_id, role) values (...) rodando como '
  'service_role (SQL Editor do Supabase).';

-- ---------------------------------------------------------------------
-- AUDITORIA
-- ---------------------------------------------------------------------
-- Painel de admin sem log de auditoria é um backdoor com CSS. Toda leitura de
-- dado de usuário e toda escrita passam por aqui.
create table public.admin_audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid not null references public.profiles(id) on delete restrict,
  action      text not null,
  target_type text,
  target_id   text,
  detail      jsonb not null default '{}'::jsonb,
  at          timestamptz not null default now()
);

create index admin_audit_at_idx    on public.admin_audit_log (at desc);
create index admin_audit_actor_idx on public.admin_audit_log (actor_id, at desc);
create index admin_audit_target_idx on public.admin_audit_log (target_type, target_id, at desc);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

-- `on delete restrict` no actor_id: apagar o profile de um admin não pode
-- levar o rastro das ações dele junto.

-- ---------------------------------------------------------------------
-- GUARDA
-- ---------------------------------------------------------------------
create or replace function public.is_platform_admin(
  p_min public.platform_role default 'support'
) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = auth.uid() and role >= p_min
  );
$$;

create or replace function public.require_platform_admin(
  p_min public.platform_role default 'support'
) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin(p_min) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;

-- O painel precisa saber QUAL papel o usuário tem para decidir o que renderiza.
-- Um select em platform_admins voltaria vazio (deny-all é o ponto da tabela),
-- então a leitura do próprio papel passa por aqui.
create or replace function public.admin_my_role()
returns public.platform_role
language sql stable security definer set search_path = public as $$
  select role from public.platform_admins where user_id = auth.uid();
$$;

create or replace function public.log_admin_action(
  p_action      text,
  p_target_type text default null,
  p_target_id   text default null,
  p_detail      jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, detail)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_detail);
end $$;

revoke execute on function public.log_admin_action(text, text, text, jsonb)
  from public, anon, authenticated;
revoke execute on function public.require_platform_admin(public.platform_role)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 1 · VISÃO GERAL
-- ---------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v jsonb;
begin
  perform public.require_platform_admin();

  select jsonb_build_object(
    'users', (select jsonb_build_object(
        'total',   count(*),
        'new_24h', count(*) filter (where created_at > now() - interval '24 hours'),
        'new_7d',  count(*) filter (where created_at > now() - interval '7 days'),
        'onboarded', count(*) filter (where onboarding_completed)
      ) from public.profiles),

    'sessions', jsonb_build_object(
        'active', (select count(*) from public.travel_sessions where status = 'active'),
        'by_state', coalesce((
          select jsonb_object_agg(t.state, t.n)
          from (
            select state, count(*) as n
            from public.travel_sessions
            where status = 'active'
            group by state
          ) t
        ), '{}'::jsonb)
      ),

    'alerts', (select jsonb_build_object(
        'open',        count(*) filter (where resolved_at is null),
        'open_sos',    count(*) filter (where resolved_at is null and level = 'sos'),
        'last_24h',    count(*) filter (where triggered_at > now() - interval '24 hours'),
        -- Falso positivo é o maior risco do produto. Se esta taxa sobe, o
        -- desenho do escalonamento está errado, não o usuário.
        'false_alarm_rate_30d', round(
          100.0 * count(*) filter (where was_false_alarm and triggered_at > now() - interval '30 days')
          / nullif(count(*) filter (where resolved_at is not null and triggered_at > now() - interval '30 days'), 0)
        , 1)
      ) from public.alerts),

    'signals', jsonb_build_object(
        'last_1h', (select count(*) from public.signals
                     where received_at > now() - interval '1 hour'),
        -- gps_ping fora da conta de propósito: ele não é prova de vida, e
        -- inflar este número com heartbeat de aparelho parado esconderia
        -- exatamente a queda que a operação precisa enxergar.
        'life_last_1h', (select count(*) from public.signals
                          where received_at > now() - interval '1 hour'
                            and kind <> 'gps_ping'),
        'by_source_24h', coalesce((
          select jsonb_object_agg(g.src, g.n)
          from (
            select coalesce(source, 'desconhecido') as src, count(*) as n
            from public.signals
            where received_at > now() - interval '24 hours'
            group by 1
          ) g
        ), '{}'::jsonb)
      ),

    'locations', (select jsonb_build_object(
        'pings_1h', count(*) filter (where received_at > now() - interval '1 hour'),
        'pings_24h', count(*) filter (where received_at > now() - interval '24 hours')
      ) from public.location_logs where received_at > now() - interval '24 hours'),

    'devices', (select jsonb_build_object(
        'total', count(*) filter (where revoked_at is null),
        'mobile', count(*) filter (where revoked_at is null and platform <> 'web'),
        'web',    count(*) filter (where revoked_at is null and platform = 'web'),
        'without_push', count(*) filter (
          where revoked_at is null and platform <> 'web' and push_token is null)
      ) from public.devices),

    'billing', (select jsonb_build_object(
        'active', count(*) filter (where status in ('active','trialing')),
        'past_due', count(*) filter (where status = 'past_due')
      ) from public.subscriptions),

    'generated_at', now()
  ) into v;

  return v;
end $$;

-- ---------------------------------------------------------------------
-- 2 · SAÚDE DO SISTEMA
-- ---------------------------------------------------------------------
-- O que quebra em produção não é a UI: é o cron parar, o pg_net engasgar, a
-- MV envelhecer ou o provedor de SMS recusar. Nada disso aparece num painel
-- de métricas de produto.
create or replace function public.admin_system_health()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_cron jsonb := '[]'::jsonb;
  v_net  jsonb := null;
begin
  perform public.require_platform_admin();

  -- pg_cron pode não estar instalado no ambiente local. Degradar, não explodir.
  if to_regclass('cron.job') is not null then
    select coalesce(jsonb_agg(x order by x->>'jobname'), '[]'::jsonb) into v_cron
    from (
      select jsonb_build_object(
               'jobname',    j.jobname,
               'schedule',   j.schedule,
               'active',     j.active,
               'last_run',   r.start_time,
               'last_status', r.status,
               'last_error', left(r.return_message, 300),
               'seconds_since_run', round(extract(epoch from (now() - r.start_time)))
             ) as x
      from cron.job j
      left join lateral (
        select * from cron.job_run_details d
        where d.jobid = j.jobid
        order by d.start_time desc
        limit 1
      ) r on true
    ) t;
  end if;

  if to_regclass('net._http_response') is not null then
    select jsonb_build_object(
             'responses_1h', count(*),
             'errors_1h', count(*) filter (where status_code is null or status_code >= 400)
           ) into v_net
    from net._http_response
    where created > now() - interval '1 hour';
  end if;

  return jsonb_build_object(
    'cron', v_cron,
    'http', v_net,

    'analytics', jsonb_build_object(
      'mv_refreshed_at', (select max(refreshed_at) from public.mv_user_travel_stats),
      'mv_age_minutes', (
        select round(extract(epoch from (now() - max(refreshed_at))) / 60)
        from public.mv_user_travel_stats)
    ),

    -- Backlog de geocoding sem teto é o sintoma de que a Edge Function morreu
    -- ou de que o Mapbox está recusando a chave. O sintoma visível pro usuário
    -- é o diário de bordo parar de nomear cidades.
    'geocoding', (select jsonb_build_object(
        'pending', count(*),
        'oldest_pending_at', min(recorded_at)
      ) from public.location_logs
      where country_code is null and recorded_at > now() - interval '30 days'),

    'notifications', (select jsonb_build_object(
        'queued', count(*) filter (where status = 'queued'),
        'failed_24h', count(*) filter (
          where status = 'failed' and created_at > now() - interval '24 hours'),
        'sent_24h', count(*) filter (
          where status in ('sent','delivered') and created_at > now() - interval '24 hours'),
        'stuck_queued', count(*) filter (
          where status = 'queued' and created_at < now() - interval '15 minutes')
      ) from public.alert_notifications),

    'dossier_tokens', (select jsonb_build_object(
        'active', count(*) filter (where revoked_at is null and expires_at > now()),
        'accessed_24h', count(*) filter (where last_accessed_at > now() - interval '24 hours')
      ) from public.dossier_tokens),

    -- Sessões que já passaram do check-in e continuam 'safe' significam que o
    -- deadman-sweep não rodou. É o alarme sobre o alarme.
    'sweep', (select jsonb_build_object(
        'overdue_unescalated', count(*)
      ) from public.travel_sessions
      where status = 'active' and state = 'safe' and now() > expected_checkin_at + interval '10 minutes'),

    'generated_at', now()
  );
end $$;

-- ---------------------------------------------------------------------
-- 3 · INCIDENTES ABERTOS (visão global, cross-org)
-- ---------------------------------------------------------------------
create or replace function public.admin_open_incidents(p_limit int default 50)
returns table (
  alert_id        uuid,
  user_id         uuid,
  full_name       text,
  email           text,
  org_name        text,
  level           public.safety_state,
  reason          text,
  triggered_at    timestamptz,
  minutes_open    int,
  last_known_at   timestamptz,
  city            text,
  country_code    char(2),
  notif_sent      bigint,
  notif_failed    bigint,
  device_platform public.device_platform,
  device_seen_at  timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_platform_admin();

  return query
  select
    a.id, a.user_id, p.full_name, u.email::text, o.name,
    a.level, a.reason, a.triggered_at,
    round(extract(epoch from (now() - a.triggered_at)) / 60)::int,
    a.last_known_at, l.city, l.country_code,
    (select count(*) from public.alert_notifications n
      where n.alert_id = a.id and n.status in ('sent','delivered')),
    (select count(*) from public.alert_notifications n
      where n.alert_id = a.id and n.status = 'failed'),
    d.platform, d.last_seen_at
  from public.alerts a
  join public.profiles p on p.id = a.user_id
  left join auth.users u on u.id = a.user_id
  left join public.organizations o on o.id = a.org_id
  left join lateral (
    select ll.city, ll.country_code from public.location_logs ll
    where ll.user_id = a.user_id order by ll.recorded_at desc limit 1
  ) l on true
  left join lateral (
    select dv.platform, dv.last_seen_at from public.devices dv
    where dv.user_id = a.user_id and dv.revoked_at is null and dv.platform <> 'web'
    order by dv.last_seen_at desc limit 1
  ) d on true
  where a.resolved_at is null
  order by
    case a.level when 'sos' then 0 when 'alert' then 1 when 'warning' then 2 else 3 end,
    a.triggered_at
  limit greatest(p_limit, 1);
end $$;

-- ---------------------------------------------------------------------
-- 4 · DISPOSITIVOS POR PLATAFORMA
-- ---------------------------------------------------------------------
-- É aqui que a separação app / navegador fica auditável: quantos usuários
-- realmente têm o app instalado e vivo, e quantos só criaram conta pela web
-- (esses estão pagando por um Dead Man's Switch que não pode disparar).
create or replace function public.admin_device_stats()
returns table (
  platform      public.device_platform,
  total         bigint,
  active_24h    bigint,
  active_7d     bigint,
  stale_30d     bigint,
  with_push     bigint,
  signalled_24h bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_platform_admin();

  return query
  select
    d.platform,
    count(*),
    count(*) filter (where d.last_seen_at > now() - interval '24 hours'),
    count(*) filter (where d.last_seen_at > now() - interval '7 days'),
    count(*) filter (where d.last_seen_at < now() - interval '30 days'),
    count(*) filter (where d.push_token is not null),
    count(*) filter (where d.last_signal_at > now() - interval '24 hours')
  from public.devices d
  where d.revoked_at is null
  group by d.platform
  order by d.platform;
end $$;

-- Usuários sem nenhum aparelho móvel: o furo de produto mais caro que existe
-- aqui. A conta está ativa, a cobrança roda, e o switch nunca vai disparar.
create or replace function public.admin_users_without_mobile(p_limit int default 100)
returns table (
  user_id        uuid,
  full_name      text,
  email          text,
  created_at     timestamptz,
  active_session boolean
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_platform_admin();

  return query
  select p.id, p.full_name, u.email::text, p.created_at,
         exists (select 1 from public.travel_sessions s
                 where s.user_id = p.id and s.status = 'active')
  from public.profiles p
  left join auth.users u on u.id = p.id
  where not exists (
    select 1 from public.devices d
    where d.user_id = p.id and d.platform <> 'web' and d.revoked_at is null
  )
  order by p.created_at desc
  limit greatest(p_limit, 1);
end $$;

-- ---------------------------------------------------------------------
-- 5 · BUSCA DE USUÁRIO (suporte)
-- ---------------------------------------------------------------------
-- LIMITE DELIBERADO: esta função NÃO devolve emergency_dossiers. Tipo
-- sanguíneo, alergias e medicação são dado sensível de art. 11 da LGPD e não
-- existe caso de suporte que precise disso — quem precisa é o socorrista, e
-- para ele existe get_dossier(token), que é auditado por acesso.
-- VOLATILE de propósito (ausência de `stable`): esta função grava o log de
-- auditoria, e o Postgres recusa INSERT dentro de função não-volátil com
-- "INSERT is not allowed in a non-volatile function". Uma busca que registra
-- quem buscou não é read-only.
create or replace function public.admin_search_users(p_q text, p_limit int default 25)
returns table (
  user_id        uuid,
  full_name      text,
  email          text,
  created_at     timestamptz,
  last_sign_in_at timestamptz,
  session_state  public.safety_state,
  last_signal_at timestamptz,
  device_count   bigint,
  platforms      text[],
  open_alerts    bigint
)
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_platform_admin();

  if coalesce(trim(p_q), '') = '' then
    return;
  end if;

  perform public.log_admin_action('search_users', 'query', left(p_q, 120));

  return query
  select
    p.id, p.full_name, u.email::text, p.created_at, u.last_sign_in_at,
    s.state, s.last_signal_at,
    (select count(*) from public.devices d where d.user_id = p.id and d.revoked_at is null),
    (select coalesce(array_agg(distinct d.platform::text), '{}')
       from public.devices d where d.user_id = p.id and d.revoked_at is null),
    (select count(*) from public.alerts a where a.user_id = p.id and a.resolved_at is null)
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join lateral (
    select ts.state, ts.last_signal_at from public.travel_sessions ts
    where ts.user_id = p.id and ts.status = 'active'
    order by ts.starts_at desc limit 1
  ) s on true
  where p.full_name ilike '%' || p_q || '%'
     or u.email      ilike '%' || p_q || '%'
     or p.id::text = p_q
  order by p.created_at desc
  limit greatest(p_limit, 1);
end $$;

-- ---------------------------------------------------------------------
-- 6 · LOG DE AUDITORIA
-- ---------------------------------------------------------------------
create or replace function public.admin_recent_audit(p_limit int default 100)
returns table (
  id          bigint,
  actor_id    uuid,
  actor_name  text,
  action      text,
  target_type text,
  target_id   text,
  detail      jsonb,
  at          timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_platform_admin();

  return query
  select a.id, a.actor_id, p.full_name, a.action, a.target_type, a.target_id, a.detail, a.at
  from public.admin_audit_log a
  join public.profiles p on p.id = a.actor_id
  order by a.at desc
  limit greatest(p_limit, 1);
end $$;

-- ---------------------------------------------------------------------
-- 7 · AÇÕES (escrita, auditada, exige role >= 'admin')
-- ---------------------------------------------------------------------
-- Encerrar incidente pela operação. Existe para o caso real de "falamos com a
-- pessoa por telefone, está tudo bem" — sem isso a saída é o suporte editar a
-- tabela na mão pelo SQL Editor, que é onde erro de operação vira incidente.
create or replace function public.admin_resolve_alert(p_alert_id uuid, p_note text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_session uuid;
begin
  perform public.require_platform_admin('admin');

  if coalesce(trim(p_note), '') = '' then
    raise exception 'note_required' using errcode = '22023';
  end if;

  update public.alerts
     set resolved_at = now(),
         resolved_by = auth.uid(),
         resolution_note = p_note,
         was_false_alarm = true
   where id = p_alert_id and resolved_at is null
  returning session_id into v_session;

  if v_session is null then
    return false;
  end if;

  update public.travel_sessions set state = 'resolved' where id = v_session;

  -- Revoga os links de dossiê do incidente. Encerrar o alerta sem revogar
  -- deixaria o dado médico acessível por mais 7 dias a quem tiver o link.
  update public.dossier_tokens
     set revoked_at = now()
   where alert_id = p_alert_id and revoked_at is null;

  perform public.log_admin_action(
    'resolve_alert', 'alert', p_alert_id::text,
    jsonb_build_object('note', p_note, 'session_id', v_session)
  );

  return true;
end $$;

-- Conceder/remover papel de plataforma. Só superadmin, sempre auditado, e
-- ninguém muda o próprio papel — inclusive para cima.
create or replace function public.admin_set_platform_role(
  p_user_id uuid,
  p_role    public.platform_role,
  p_note    text default null
) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_platform_admin('superadmin');

  if p_user_id = auth.uid() then
    raise exception 'cannot_change_own_role' using errcode = '42501';
  end if;

  insert into public.platform_admins (user_id, role, granted_by, note)
  values (p_user_id, p_role, auth.uid(), p_note)
  on conflict (user_id) do update
    set role = excluded.role, granted_by = excluded.granted_by,
        granted_at = now(), note = excluded.note;

  perform public.log_admin_action(
    'set_platform_role', 'user', p_user_id::text,
    jsonb_build_object('role', p_role, 'note', p_note)
  );

  return true;
end $$;

create or replace function public.admin_revoke_platform_role(p_user_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_platform_admin('superadmin');

  if p_user_id = auth.uid() then
    raise exception 'cannot_change_own_role' using errcode = '42501';
  end if;

  delete from public.platform_admins where user_id = p_user_id;
  perform public.log_admin_action('revoke_platform_role', 'user', p_user_id::text);
  return found;
end $$;

-- ---------------------------------------------------------------------
-- GRANTS
-- ---------------------------------------------------------------------
-- Todas checam is_platform_admin() por dentro. O grant para `authenticated` é
-- necessário porque o painel roda com o JWT do admin, não com service_role —
-- service_role no navegador seria a chave mestra num bundle público.
grant execute on function public.is_platform_admin(public.platform_role)      to authenticated;
grant execute on function public.admin_my_role()                              to authenticated;
grant execute on function public.admin_overview()                             to authenticated;
grant execute on function public.admin_system_health()                        to authenticated;
grant execute on function public.admin_open_incidents(int)                    to authenticated;
grant execute on function public.admin_device_stats()                         to authenticated;
grant execute on function public.admin_users_without_mobile(int)              to authenticated;
grant execute on function public.admin_search_users(text, int)                to authenticated;
grant execute on function public.admin_recent_audit(int)                      to authenticated;
grant execute on function public.admin_resolve_alert(uuid, text)              to authenticated;
grant execute on function public.admin_set_platform_role(uuid, public.platform_role, text) to authenticated;
grant execute on function public.admin_revoke_platform_role(uuid)             to authenticated;
