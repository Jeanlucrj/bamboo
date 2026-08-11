-- =====================================================================
-- 19 · TIMELINE POR CIDADE, NÃO POR PAÍS
-- =====================================================================
-- A timeline do Diário lia `v_user_country_visits`, que agrupa pings
-- consecutivos no mesmo PAÍS. Para quem viaja entre países isso conta uma
-- história; para quem se move dentro do próprio país, não conta nenhuma.
--
-- O sintoma relatado: "a timeline não atualiza, último dia 8". Ela estava
-- atualizando — a entrada do Brasil ia de 08/08 até hoje. Só que, sem sair do
-- país, tudo virou UM bloco só, e a data que salta aos olhos é a de entrada.
-- Três dias de deslocamento entre cidades apareciam como uma linha parada.
--
-- Esta view faz o mesmo agrupamento um nível abaixo: quebra quando muda a
-- CIDADE, não só o país. Mesma técnica — `lag` para detectar a troca e uma
-- soma corrida para numerar os blocos.
--
-- Pings sem cidade não são descartados: viram um bloco próprio, e a tela
-- resolve como "em trânsito". Descartá-los abriria buracos na linha do tempo
-- justamente nos trechos de estrada, que são os mais interessantes de ver.
--
-- `v_user_country_visits` continua existindo: o passaporte de países e a
-- contagem do Diário dependem dela.
-- =====================================================================

create or replace view public.v_user_place_visits as
with ordenado as (
  select
    user_id,
    country_code,
    city,
    recorded_at,
    -- A chave do lugar precisa tratar cidade nula como valor, não como
    -- desconhecido: `null <> null` é null, e a troca nunca seria detectada.
    coalesce(city, '~') || '|' || coalesce(country_code, '~') as lugar,
    lag(coalesce(city, '~') || '|' || coalesce(country_code, '~'))
      over (partition by user_id order by recorded_at) as lugar_anterior
  from public.location_logs
  where country_code is not null
),
marcado as (
  select *,
    count(*) filter (where lugar_anterior is distinct from lugar)
      over (partition by user_id order by recorded_at rows unbounded preceding) as bloco
  from ordenado
)
select
  user_id,
  country_code,
  city,
  bloco                               as visit_seq,
  min(recorded_at)                    as entered_at,
  max(recorded_at)                    as left_at,
  max(recorded_at) - min(recorded_at) as duration,
  count(*)                            as ping_count
from marcado
group by user_id, country_code, city, bloco;

-- security_invoker: sem ele a view roda com os privilégios de quem a criou e
-- devolveria o trajeto de TODO MUNDO. Com ele, a RLS de location_logs vale
-- normalmente e cada um vê só o próprio.
alter view public.v_user_place_visits set (security_invoker = on);

revoke all on public.v_user_place_visits from public, anon;
grant select on public.v_user_place_visits to authenticated;

comment on view public.v_user_place_visits is
  'Timeline por cidade. A de país (v_user_country_visits) não mostra '
  'deslocamento dentro do mesmo país, que é a maior parte das viagens.';
