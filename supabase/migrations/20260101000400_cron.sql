-- =====================================================================
-- 04 · CRON JOBS
-- =====================================================================
-- PRÉ-REQUISITO — guarde a service_role key no Vault antes de aplicar:
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
--   select vault.create_secret('<PROJECT_REF>',      'project_ref');
-- Nunca escreva a chave em migration versionada.
-- =====================================================================

create or replace function public.invoke_edge(
  p_fn   text,
  p_body jsonb default '{}'::jsonb
) returns bigint
language plpgsql security definer set search_path = public, vault as $$
declare
  v_key text;
  v_ref text;
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key';
  select decrypted_secret into v_ref from vault.decrypted_secrets where name = 'project_ref';

  if v_key is null or v_ref is null then
    raise warning 'invoke_edge: segredos ausentes no Vault, pulando %', p_fn;
    return null;
  end if;

  return net.http_post(
    url     := format('https://%s.supabase.co/functions/v1/%s', v_ref, p_fn),
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || v_key
               ),
    body    := p_body,
    timeout_milliseconds := 25000
  );
end $$;

revoke execute on function public.invoke_edge(text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Motor do Dead Man's Switch — a cada 5 minutos.
-- ---------------------------------------------------------------------
select cron.schedule(
  'deadman-sweep', '*/5 * * * *',
  $$ select public.invoke_edge('deadman-sweep'); $$
);

-- Reverse geocoding dos pings pendentes (preenche country_code / city).
select cron.schedule(
  'reverse-geocode', '*/10 * * * *',
  $$ select public.invoke_edge('reverse-geocode'); $$
);

-- Travel Analytics: CONCURRENTLY não bloqueia leitura (exige índice único).
select cron.schedule(
  'refresh-analytics', '7 * * * *',
  $$ refresh materialized view concurrently public.mv_user_travel_stats; $$
);

-- Retenção LGPD: apaga GPS bruto com mais de 24 meses.
-- Os agregados da MV permanecem — o diário de bordo não se perde.
select cron.schedule(
  'purge-old-locations', '0 4 * * 0',
  $$ delete from public.location_logs where recorded_at < now() - interval '24 months'; $$
);

-- Revoga tokens de dossiê vencidos.
select cron.schedule(
  'revoke-expired-tokens', '0 * * * *',
  $$ update public.dossier_tokens
        set revoked_at = now()
      where revoked_at is null and expires_at < now(); $$
);

-- Encerra sessões cuja data de retorno já passou há mais de 7 dias
-- sem que o usuário tenha finalizado manualmente.
select cron.schedule(
  'autoclose-stale-sessions', '30 3 * * *',
  $$ update public.travel_sessions
        set status = 'completed'
      where status = 'active'
        and ends_at is not null
        and ends_at < now() - interval '7 days'
        and state in ('safe','resolved'); $$
);
