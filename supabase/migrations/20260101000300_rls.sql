-- =====================================================================
-- 03 · ROW LEVEL SECURITY
-- Padrão: negar tudo, liberar por exceção. Toda tabela com dado de usuário
-- tem RLS ligada; o que precisa de acesso privilegiado passa por RPC
-- SECURITY DEFINER auditada, nunca por acesso direto.
-- =====================================================================

alter table public.profiles                  enable row level security;
alter table public.organizations             enable row level security;
alter table public.org_members               enable row level security;
alter table public.emergency_dossiers        enable row level security;
alter table public.emergency_contacts        enable row level security;
alter table public.country_emergency_numbers enable row level security;
alter table public.travel_sessions           enable row level security;
alter table public.signals                   enable row level security;
alter table public.location_logs             enable row level security;
alter table public.alerts                    enable row level security;
alter table public.alert_notifications       enable row level security;
alter table public.dossier_tokens            enable row level security;
alter table public.dossier_access_log        enable row level security;
alter table public.subscriptions             enable row level security;

-- ---------------------------------------------------------------------
-- PERFIS
-- ---------------------------------------------------------------------
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "org managers read member profiles" on public.profiles
  for select using (exists (
    select 1 from public.org_members m
    where m.user_id = profiles.id and public.is_org_manager(m.org_id)
  ));

-- ---------------------------------------------------------------------
-- ORGANIZAÇÕES
-- ---------------------------------------------------------------------
create policy "members read org" on public.organizations
  for select using (public.is_org_member(id));

create policy "managers update org" on public.organizations
  for update using (public.is_org_manager(id)) with check (public.is_org_manager(id));

create policy "read own membership" on public.org_members
  for select using (user_id = auth.uid() or public.is_org_manager(org_id));

create policy "managers manage members" on public.org_members
  for all using (public.is_org_manager(org_id)) with check (public.is_org_manager(org_id));

-- ---------------------------------------------------------------------
-- DOSSIÊ MÉDICO — só o dono, ponto final.
-- Nem gestor de organização lê direto. O acesso externo passa
-- obrigatoriamente por get_dossier(), que exige token válido e é auditado.
-- ---------------------------------------------------------------------
create policy "own dossier only" on public.emergency_dossiers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own contacts" on public.emergency_contacts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tabela de referência pública (telefones 190/192 por país).
create policy "emergency numbers are public" on public.country_emergency_numbers
  for select using (true);

-- ---------------------------------------------------------------------
-- SESSÕES E SINAIS
-- ---------------------------------------------------------------------
create policy "own sessions" on public.travel_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "org managers read sessions" on public.travel_sessions
  for select using (org_id is not null and public.is_org_manager(org_id));

create policy "own signals" on public.signals
  for select using (user_id = auth.uid());

create policy "insert own signals" on public.signals
  for insert with check (user_id = auth.uid());

create policy "org managers read signals" on public.signals
  for select using (exists (
    select 1 from public.travel_sessions s
    where s.id = signals.session_id
      and s.org_id is not null
      and public.is_org_manager(s.org_id)
  ));

-- ---------------------------------------------------------------------
-- LOCALIZAÇÃO
-- O gestor B2B vê a posição do viajante APENAS quando a sessão está
-- vinculada à organização E em estado de alerta. Rastreio contínuo de
-- funcionário fora de incidente é passivo jurídico, não funcionalidade.
-- ---------------------------------------------------------------------
create policy "own locations" on public.location_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "org reads location during incident" on public.location_logs
  for select using (exists (
    select 1 from public.travel_sessions s
    where s.id = location_logs.session_id
      and s.org_id is not null
      and public.is_org_manager(s.org_id)
      and s.state in ('warning','alert','sos')
  ));

-- ---------------------------------------------------------------------
-- ALERTAS E NOTIFICAÇÕES
-- ---------------------------------------------------------------------
create policy "own alerts" on public.alerts
  for select using (user_id = auth.uid());

create policy "own alerts resolve" on public.alerts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "org alerts" on public.alerts
  for all using (org_id is not null and public.is_org_manager(org_id))
  with check (org_id is not null and public.is_org_manager(org_id));

create policy "own notifications" on public.alert_notifications
  for select using (exists (
    select 1 from public.alerts a where a.id = alert_id and a.user_id = auth.uid()
  ));

-- Tokens e log de acesso: nenhum acesso direto por cliente.
-- Só service_role (que ignora RLS) e as RPCs SECURITY DEFINER.
create policy "no direct token access" on public.dossier_tokens
  for select using (false);

-- O usuário PODE ver quem abriu o dossiê dele — transparência é feature.
create policy "own dossier access log" on public.dossier_access_log
  for select using (exists (
    select 1 from public.dossier_tokens t
    join public.alerts a on a.id = t.alert_id
    where t.id = dossier_access_log.token_id and a.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------
-- BILLING
-- ---------------------------------------------------------------------
create policy "read own subscription" on public.subscriptions
  for select using (
    user_id = auth.uid() or (org_id is not null and public.is_org_member(org_id))
  );

-- ---------------------------------------------------------------------
-- GRANTS
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.country_emergency_numbers to anon, authenticated;

grant execute on function public.record_signal(uuid, public.signal_kind, timestamptz, jsonb, text, text) to authenticated;
grant execute on function public.ingest_location_batch(jsonb)                                            to authenticated;
grant execute on function public.get_session_track(uuid, double precision)                               to authenticated;
grant execute on function public.get_my_travel_stats()                                                   to authenticated;

-- Funções privilegiadas: apenas service_role (e ainda assim com guarda interna).
revoke execute on function public.claim_overdue_sessions(int)                        from public, anon, authenticated;
revoke execute on function public.open_alert(uuid, public.safety_state, text)        from public, anon, authenticated;
revoke execute on function public.issue_dossier_token(uuid, uuid, interval)          from public, anon, authenticated;
grant  execute on function public.claim_overdue_sessions(int)                        to service_role;
grant  execute on function public.open_alert(uuid, public.safety_state, text)        to service_role;
grant  execute on function public.issue_dossier_token(uuid, uuid, interval)          to service_role;
