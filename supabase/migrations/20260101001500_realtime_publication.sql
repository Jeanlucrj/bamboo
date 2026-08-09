-- =====================================================================
-- 15 · ATIVAR SUPABASE REALTIME EM travel_sessions E signals
-- =====================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.travel_sessions;
    alter publication supabase_realtime add table public.signals;
  end if;
exception
  when others then
    null;
end $$;
