-- =====================================================================
-- 07 · FECHAMENTO DAS VIEWS
-- =====================================================================
-- O linter do Supabase apontou 5 views como SECURITY DEFINER. Não é falso
-- positivo: no Postgres 15+ uma view roda com as permissões do DONO, e o dono
-- aqui é `postgres`, que ignora RLS. Somado às default privileges do Supabase
-- (que concedem SELECT em `public` para anon e authenticated), o resultado é
-- que QUALQUER portador da chave publicável — que por definição está no bundle
-- do navegador — lia, sem login:
--
--   v_location_segments / v_valid_segments  -> trajeto de GPS de todos
--   v_user_country_visits                   -> timeline de países de todos
--   v_org_traveler_status                   -> nome, estado e última posição
--                                              de todo viajante, de toda org
--   mv_user_travel_stats                    -> estatísticas de todos
--
-- Verificado por requisição: as seis devolviam 200 com a anon key. Não houve
-- vazamento porque o banco ainda não tem dado — a falha é estrutural.
--
-- Três remédios diferentes, porque os casos são diferentes:
--   1. encanamento interno  -> sai do schema exposto
--   2. view de leitura      -> security_invoker, a RLS do chamador volta a valer
--   3. leitura privilegiada -> vira função SECURITY DEFINER com guarda explícita
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 · ENCANAMENTO: para fora do schema exposto
-- ---------------------------------------------------------------------
-- v_location_segments e v_valid_segments existem só para alimentar a MV.
-- Nenhum cliente as consulta. Em vez de discutir permissão, tiramos do alcance
-- do PostgREST: ele expõe apenas os schemas de `api.schemas` no config.toml
-- (public e graphql_public).
--
-- Continuam SECURITY DEFINER de propósito: o REFRESH da MV roda como dono e
-- precisa enxergar as linhas de todos os usuários. É exatamente o caso em que
-- definer é a resposta certa — o que estava errado era estarem alcançáveis.
create schema if not exists analytics;
comment on schema analytics is
  'Encanamento do Travel Analytics. NÃO exponha no PostgREST: as views daqui '
  'atravessam RLS por desenho, para o REFRESH da materialized view funcionar.';

-- SET SCHEMA preserva o OID, então a MV — que referencia por OID, não por nome
-- — continua válida sem precisar ser recriada.
alter view public.v_location_segments set schema analytics;
alter view public.v_valid_segments    set schema analytics;

revoke all on schema analytics from anon, authenticated;
revoke all on all tables in schema analytics from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2 · VIEWS DE LEITURA: a RLS do chamador volta a valer
-- ---------------------------------------------------------------------

-- Diário de bordo. Com invoker, a policy "own locations" (user_id = auth.uid())
-- passa a filtrar: cada um vê a própria timeline, e mais nada.
alter view public.v_user_country_visits set (security_invoker = on);

-- Semáforo do painel B2B.
--
-- Esta linha corrige uma promessa que o produto fazia e não cumpria. O README
-- afirma que "o gestor não vê localização fora de incidente", e a policy de
-- location_logs implementa isso — mas a view, sendo definer, passava por cima
-- dela e entregava a última posição SEMPRE.
--
-- Com security_invoker, o LEFT JOIN LATERAL em location_logs volta a respeitar
-- a policy: fora de warning/alert/sos ele não encontra linha e city, last_lat e
-- last_lng chegam nulos. É a mudança de comportamento pretendida, não um efeito
-- colateral — e a UI já trata esses campos como opcionais.
--
-- Efeito secundário esperado: viagem pessoal (org_id nulo) deixa de aparecer
-- com título e estado para o gestor, porque "org managers read sessions" exige
-- org_id não nulo. Também é o comportamento correto.
alter view public.v_org_traveler_status set (security_invoker = on);

-- ---------------------------------------------------------------------
-- 3 · LEITURA PRIVILEGIADA: view vira função com guarda
-- ---------------------------------------------------------------------
-- v_org_device_health precisava atravessar a RLS de `devices` (own-devices-only)
-- para o gestor ver se o aparelho do viajante está vivo. Como view, a única
-- forma de fazer isso era ser definer — sem guarda nenhuma no caminho.
--
-- A alternativa de criar uma policy de leitura em `devices` para gestores foi
-- descartada: exporia push_token e modelo do aparelho no acesso direto à
-- tabela, e o ponto da view era justamente não expor essas colunas.
--
-- Função SECURITY DEFINER com `is_org_manager()` no corpo é o padrão que o
-- resto do sistema já usa (get_dossier, admin_*): privilégio elevado, mas com
-- a autorização escrita e auditável no mesmo lugar.
drop view if exists public.v_org_device_health;

create or replace function public.get_org_device_health(p_org uuid)
returns table (
  user_id        uuid,
  platform       public.device_platform,
  last_seen_at   timestamptz,
  last_signal_at timestamptz,
  has_push       boolean
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_org_manager(p_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select d.user_id, d.platform, d.last_seen_at, d.last_signal_at,
         d.push_token is not null
  from public.devices d
  join public.org_members m on m.user_id = d.user_id and m.org_id = p_org
  where d.revoked_at is null
    and d.platform <> 'web'   -- navegador não monitora; não é sinal de saúde
  order by d.last_seen_at desc;
end $$;

grant execute on function public.get_org_device_health(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4 · MATERIALIZED VIEW: fora da API
-- ---------------------------------------------------------------------
-- MV não aceita RLS nem security_invoker — é uma tabela congelada. A única
-- defesa é ninguém poder lê-la direto.
--
-- Fica em `public` (movê-la quebraria o tipo de retorno de get_my_travel_stats
-- e o corpo de admin_system_health) mas com a permissão revogada. O acesso
-- legítimo continua por get_my_travel_stats(), que é SECURITY DEFINER e filtra
-- por auth.uid() — e por admin_system_health(), que exige papel de plataforma.
revoke all on public.mv_user_travel_stats from anon, authenticated;

-- ---------------------------------------------------------------------
-- 5 · TRINCO PARA O FUTURO
-- ---------------------------------------------------------------------
-- As default privileges do Supabase concedem SELECT em tudo que nascer em
-- `public` para anon e authenticated. Isso significa que a PRÓXIMA view criada
-- aqui já nasce legível por anônimo — foi assim que este problema apareceu.
-- Não dá para desligar sem quebrar o resto do produto, então fica o aviso:
comment on schema public is
  'ATENÇÃO: toda view nova nasce SECURITY DEFINER (padrão do PG15) e já vem '
  'com SELECT para anon/authenticated (default privileges do Supabase). Ao '
  'criar view aqui, decida explicitamente: security_invoker = on para leitura '
  'de usuário, ou mova para o schema analytics se for encanamento interno.';
