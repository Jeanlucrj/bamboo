-- =====================================================================
-- 00 · EXTENSÕES E TIPOS
-- =====================================================================

create extension if not exists postgis  with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net   with schema extensions;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------
-- Tipos de domínio
-- ---------------------------------------------------------------------
do $$ begin
  create type public.org_role as enum ('owner','admin','manager','member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.session_status as enum ('draft','active','paused','completed','cancelled');
exception when duplicate_object then null; end $$;

-- Máquina de estados do Dead Man's Switch:
--   safe -> grace -> warning -> alert  (escalonamento por tempo)
--   qualquer -> sos                     (botão de pânico, ignora grace)
--   qualquer -> resolved                (usuário/gestor confirma que está tudo bem)
do $$ begin
  create type public.safety_state as enum ('safe','grace','warning','alert','sos','resolved');
exception when duplicate_object then null; end $$;

-- Todo sinal de vida entra pelo mesmo barramento.
--
-- Distinção crítica entre 'device_movement' e 'gps_ping':
--   device_movement -> o aparelho SE DESLOCOU de verdade. Conta como sinal de vida.
--   gps_ping        -> posição registrada sem deslocamento (heartbeat de 4h com o
--                      celular parado). Vai para o histórico e para o diário de
--                      bordo, mas NÃO reseta o Dead Man's Switch.
--
-- Sem essa separação, um celular esquecido na mesinha do hostel continuaria
-- "fazendo check-in" indefinidamente e o alarme jamais dispararia.
do $$ begin
  create type public.signal_kind as enum
    ('manual_checkin','device_movement','app_open','gps_ping','sos','admin_override');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.contact_channel as enum ('email','sms','whatsapp','push');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notif_status as enum ('queued','sent','delivered','failed','read');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Utilitário compartilhado
-- ---------------------------------------------------------------------
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
