-- =====================================================================
-- 12 · O REVERSE-GEOCODE NUNCA GEOCODIFICOU NADA
-- =====================================================================
-- A função lia `location_logs.geom` pelo PostgREST e passava o valor para um
-- parser que só entendia GeoJSON:
--
--   if ('coordinates' in geom) return { lng: c[0], lat: c[1] };
--   return null;
--
-- Mas o PostgREST serializa `geography` como EWKB em hexadecimal:
--
--   0101000020E6100000B1BC5065BDF146C04B1641ADB33737C0
--
-- Ou seja: `parseGeoJSONPoint` devolvia null para TODO ping, o laço fazia
-- `continue` antes de consultar o serviço de geocodificação, e a função
-- terminava com `processed: 0` e status 200. Um sucesso silencioso — a
-- resposta era idêntica à de "não havia nada pendente".
--
-- Efeito no produto: `country_code` e `city` ficavam nulos para sempre. Some
-- daí o Diário de Bordo sem países nem cidades, a timeline vazia, e o Dossiê
-- de Emergência mostrando o telefone de emergência errado — ele escolhe o
-- número pelo país do último ping, e sem país cai no padrão.
--
-- A correção de fundo é não depender da serialização de tipo espacial pela
-- API. Esta função devolve lat/lng como números, que atravessam qualquer
-- camada sem ambiguidade.
-- =====================================================================

create or replace function public.pending_geocode(p_limit int default 15)
returns table (
  id          bigint,
  user_id     uuid,
  lat         double precision,
  lng         double precision,
  recorded_at timestamptz
)
language sql stable security definer set search_path = public, extensions as $$
  select
    l.id,
    l.user_id,
    st_y(l.geom::geometry) as lat,
    st_x(l.geom::geometry) as lng,
    l.recorded_at
  from public.location_logs l
  where l.country_code is null
    and l.geom is not null
  -- Mais recente primeiro: é o ping que decide o país atual do usuário, e é
  -- ele que o Dossiê consulta se um alerta disparar nos próximos minutos.
  order by l.recorded_at desc
  limit greatest(1, least(p_limit, 100));
$$;

-- Só o service_role das Edge Functions chama isto. Devolve posição bruta de
-- qualquer usuário, então não passa nem perto de anon/authenticated.
revoke execute on function public.pending_geocode(int) from public, anon, authenticated;
grant  execute on function public.pending_geocode(int) to service_role;

comment on function public.pending_geocode(int) is
  'Pings sem país, com lat/lng já em números. Existe porque o PostgREST '
  'serializa geography como EWKB hex, e não como GeoJSON.';
