-- =====================================================================
-- 11 · HISTÓRICO POR VIAGEM
-- =====================================================================
-- O Diário de Bordo só existia como agregado do usuário inteiro:
-- `mv_user_travel_stats` diz 12 países e 8.400 km somando TUDO que a pessoa
-- já andou. "viagens concluídas" era um número sem nada por trás — não havia
-- como abrir e ver quais foram, quando, para onde, nem quanto rendeu cada uma.
--
-- E os dados sempre estiveram lá: `v_valid_segments` já carrega `session_id`,
-- `distance_m`, `country_code` e `city`. Faltava agrupar por viagem em vez de
-- por usuário.
--
-- A view mora em `analytics`, não em `public`: a migration 07 a tirou do schema
-- exposto pelo PostgREST justamente porque trajeto de GPS cru não pode ser
-- consultável pela API. Só funções SECURITY DEFINER como esta a alcançam, e é
-- por isso que o nome vem qualificado apesar do `search_path = public`.
--
-- Uma decisão importante aqui: as viagens aparecem MESMO SEM PING DE GPS.
-- A tela do Diário escondia tudo atrás de `days_tracked > 0`, então quem
-- viajou com o rastreamento desligado — ou antes de o reverse-geocode rodar —
-- via "seus números aparecem depois da primeira viagem" tendo feito várias. O
-- LEFT JOIN abaixo garante a linha da viagem com quilometragem zero, que é
-- diferente de viagem inexistente.
-- =====================================================================

create or replace function public.get_my_trip_history()
returns table (
  id                uuid,
  title             text,
  destination_label text,
  status            text,
  state             text,
  starts_at         timestamptz,
  ends_at           timestamptz,
  /** Dias corridos entre a saída e a volta (ou até agora, se em andamento). */
  days              int,
  km                numeric,
  countries         text[],
  cities            text[],
  pings             bigint,
  checkins          bigint
)
language sql stable security definer set search_path = public as $$
  with minhas as (
    select t.*
      from public.travel_sessions t
     where t.user_id = auth.uid()
  ),
  dist as (
    select s.session_id,
           round((sum(s.distance_m) / 1000.0)::numeric, 1) as km
      from analytics.v_valid_segments s
     where s.user_id = auth.uid()
       and s.session_id is not null
     group by s.session_id
  ),
  geo as (
    select l.session_id,
           array_agg(distinct l.country_code)
             filter (where l.country_code is not null) as countries,
           array_agg(distinct l.city)
             filter (where l.city is not null)         as cities,
           count(*)                                    as pings
      from public.location_logs l
     where l.user_id = auth.uid()
       and l.session_id is not null
     group by l.session_id
  ),
  sig as (
    select g.session_id, count(*) as checkins
      from public.signals g
     where g.user_id = auth.uid()
       and g.kind = 'manual_checkin'
     group by g.session_id
  )
  select
    m.id,
    m.title,
    m.destination_label,
    m.status::text,
    m.state::text,
    m.starts_at,
    m.ends_at,
    -- +1 porque uma viagem que começa e termina no mesmo dia é 1 dia de
    -- viagem, não zero. `coalesce(ends_at, now())` mantém a contagem viva
    -- enquanto a viagem está em andamento.
    (extract(day from (coalesce(m.ends_at, now()) - m.starts_at))::int + 1) as days,
    coalesce(d.km, 0)          as km,
    coalesce(g.countries, '{}') as countries,
    coalesce(g.cities, '{}')    as cities,
    coalesce(g.pings, 0)        as pings,
    coalesce(s.checkins, 0)     as checkins
  from minhas m
  left join dist d on d.session_id = m.id
  left join geo  g on g.session_id = m.id
  left join sig  s on s.session_id = m.id
  order by m.starts_at desc;
$$;

-- Mesma política da migration 10: nada de EXECUTE para PUBLIC/anon. O
-- histórico é filtrado por auth.uid() dentro da função, então sem usuário
-- autenticado ela não teria o que devolver de qualquer forma — mas a porta
-- fica fechada antes disso.
revoke execute on function public.get_my_trip_history() from public, anon;
grant  execute on function public.get_my_trip_history() to authenticated;

comment on function public.get_my_trip_history() is
  'Histórico de viagens do usuário: datas, km, países e cidades de cada uma. '
  'Devolve a viagem mesmo sem ping de GPS — km 0 é diferente de não existir.';
