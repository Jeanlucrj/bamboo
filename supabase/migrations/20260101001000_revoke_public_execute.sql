-- =====================================================================
-- 10 · TIRAR O EXECUTE QUE O POSTGRES DÁ A "PUBLIC" SOZINHO
-- =====================================================================
-- Ao criar uma função, o Postgres concede EXECUTE a PUBLIC automaticamente.
-- Na ACL isso aparece como `=X/postgres` (grantee vazio = PUBLIC). Como `anon`
-- herda de PUBLIC, todo RPC do schema `public` nasce chamável por quem não fez
-- login — inclusive `admin_set_platform_role`.
--
-- Foi por isso que o `revoke ... from anon` da migration 09 não mudou nada no
-- linter: revogar de um papel não remove a concessão a PUBLIC, e o papel
-- continua entrando pela porta de PUBLIC.
--
-- As guardas internas seguram (verificado: todas as `admin_*` devolvem
-- `forbidden` para chamador anônimo). Mas guarda interna é a segunda linha. A
-- primeira é não deixar a função ser invocável — assim uma guarda esquecida no
-- futuro não vira brecha aberta na internet, como aconteceu em `record_signal`.
--
-- Não mexo em `authenticated` nem em `service_role`: as duas têm concessão
-- explícita própria (`authenticated=X`, `service_role=X`), que sobrevive à
-- revogação de PUBLIC. O app e as Edge Functions continuam iguais.
--
-- FICAM DE FORA, de propósito:
--
--   get_dossier / resolve_alert_by_token
--     São a página pública do link de SOS. Quem abre é o contato de
--     emergência, que por definição não tem conta. A autorização ali é o token
--     de uso único, não a sessão.
--
--   tg_handle_new_user
--     É função de gatilho: devolve `trigger`, e o PostgREST nem a publica no
--     schema cache (verificado: a chamada por RPC responde PGRST202). Quem
--     insere em auth.users é o `supabase_auth_admin`, que chega por PUBLIC —
--     revogar aqui quebraria o cadastro para fechar uma porta que não existe.
-- =====================================================================

do $$
declare
  r record;
  alvos text[] := array[
    -- painel de administração da plataforma
    'admin_device_stats', 'admin_my_role', 'admin_open_incidents',
    'admin_overview', 'admin_recent_audit', 'admin_resolve_alert',
    'admin_revoke_platform_role', 'admin_search_users',
    'admin_set_platform_role', 'admin_system_health',
    'admin_users_without_mobile',
    -- app e web, sempre com usuário logado
    'get_my_travel_stats', 'get_org_device_health', 'ingest_location_batch',
    'record_signal', 'register_device', 'revoke_device', 'resolve_alert',
    -- auxiliares de autorização: ninguém precisa chamar de fora
    'is_org_manager', 'is_org_member', 'is_platform_admin'
  ];
begin
  for r in
    select p.oid::regprocedure as assinatura
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = any(alvos)
  loop
    -- PUBLIC primeiro (é ele que dá acesso ao anon), depois o anon explícito
    -- para o caso de alguma migration antiga ter concedido direto.
    execute format('revoke execute on function %s from public', r.assinatura);
    execute format('revoke execute on function %s from anon',   r.assinatura);
  end loop;
end $$;

-- Defesa em profundidade para o que vier depois: novas funções criadas por
-- estes papéis já nascem sem o EXECUTE para PUBLIC, em vez de depender de
-- alguém lembrar de revogar.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from public;
