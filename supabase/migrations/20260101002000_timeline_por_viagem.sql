-- =====================================================================
-- 20 · A TIMELINE TAMBÉM QUEBRA QUANDO COMEÇA UMA VIAGEM NOVA
-- =====================================================================
-- A migration 19 fez a timeline quebrar por cidade, o que resolveu o caso de
-- quem se move dentro do próprio país. Faltou o outro caso, e é o mais comum
-- de todos: COMEÇAR UMA VIAGEM sem sair do lugar.
--
-- Situação real que expôs isso: viagem criada hoje, 65 pings hoje, todos em São
-- José dos Campos. A timeline mostrava um bloco só, "São José dos Campos,
-- 08/08 → 11/08" — tecnicamente correto e inútil. A viagem de hoje não
-- aparecia em lugar nenhum, porque a cidade não mudou.
--
-- Num diário de viagem, viagem nova é capítulo novo. Mesmo que você saia de
-- casa e volte para a mesma cidade, são duas histórias diferentes — e é isso
-- que a pessoa espera ver listado.
--
-- A correção é uma linha na chave de agrupamento: `session_id` entra junto com
-- cidade e país. O resto da mecânica é a mesma.
--
-- O título da viagem vem junto, por LEFT JOIN: pings anteriores à primeira
-- viagem (ou órfãos de sessão apagada) continuam aparecendo, sem título. Um
-- INNER JOIN os apagaria da linha do tempo, e um buraco no histórico é pior
-- que uma linha sem rótulo.
-- =====================================================================

-- `drop` antes de `create`, e não `create or replace`: o replace só aceita
-- acrescentar colunas no FIM da lista. Aqui `session_id` e `trip_title` entram
-- no meio, então o Postgres recusa com "cannot change name of view column".
drop view if exists public.v_user_place_visits;

create view public.v_user_place_visits as
with ordenado as (
  select
    l.user_id,
    l.country_code,
    l.city,
    l.session_id,
    l.recorded_at,
    -- Cidade nula precisa virar um valor, não ficar como desconhecido:
    -- `null <> null` é null, e a troca nunca seria detectada.
    coalesce(l.city, '~') || '|' || coalesce(l.country_code, '~')
      || '|' || coalesce(l.session_id::text, '~')                       as lugar,
    lag(
      coalesce(l.city, '~') || '|' || coalesce(l.country_code, '~')
        || '|' || coalesce(l.session_id::text, '~')
    ) over (partition by l.user_id order by l.recorded_at)              as lugar_anterior
  from public.location_logs l
  where l.country_code is not null
),
marcado as (
  select *,
    count(*) filter (where lugar_anterior is distinct from lugar)
      over (partition by user_id order by recorded_at rows unbounded preceding) as bloco
  from ordenado
),
agrupado as (
  select
    user_id,
    country_code,
    city,
    session_id,
    bloco                               as visit_seq,
    min(recorded_at)                    as entered_at,
    max(recorded_at)                    as left_at,
    max(recorded_at) - min(recorded_at) as duration,
    count(*)                            as ping_count
  from marcado
  group by user_id, country_code, city, session_id, bloco
)
select
  a.user_id,
  a.country_code,
  a.city,
  a.session_id,
  t.title as trip_title,
  a.visit_seq,
  a.entered_at,
  a.left_at,
  a.duration,
  a.ping_count
from agrupado a
left join public.travel_sessions t on t.id = a.session_id;

alter view public.v_user_place_visits set (security_invoker = on);

revoke all on public.v_user_place_visits from public, anon;
grant select on public.v_user_place_visits to authenticated;

comment on view public.v_user_place_visits is
  'Timeline por cidade E por viagem. Sem o session_id na chave, uma viagem '
  'iniciada na mesma cidade some dentro do bloco anterior.';
