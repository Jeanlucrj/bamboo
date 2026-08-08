-- =====================================================================
-- 09 · A GUARDA DE record_signal NÃO BLOQUEAVA CHAMADOR ANÔNIMO
-- =====================================================================
-- A guarda anterior era:
--
--   if v_s.user_id <> auth.uid()
--      and not public.is_org_manager(v_s.org_id)
--      and auth.role() <> 'service_role' then
--     raise exception 'forbidden';
--   end if;
--
-- Para um chamador anônimo `auth.uid()` é NULL, e em SQL `x <> NULL` não é
-- FALSE — é NULL. A expressão inteira vira `NULL and true and true` = NULL, e
-- `IF NULL THEN` não executa o ramo. Ou seja: o único caso que a guarda
-- precisava barrar era exatamente o que ela deixava passar.
--
-- Verificado no banco:
--   select ('1111...'::uuid <> null::uuid) and true and true;  -->  NULL
--
-- Quem está autenticado como outra pessoa era barrado normalmente (os dois
-- lados não-nulos, comparação dá TRUE). O buraco era só para quem não
-- apresentava identidade nenhuma.
--
-- Por que isso importa mais aqui do que em qualquer outra função:
-- `record_signal` é a ÚNICA porta que reseta o cronômetro do Dead Man's
-- Switch. Um `manual_checkin` forjado marca como "em segurança" alguém que não
-- está — e adia indefinidamente o alarme que existe para essa pessoa.
--
-- Explorar exige conhecer o UUID da sessão, o que não se adivinha por força
-- bruta. Mas UUID não é credencial: ele vaza em log, print, ticket de suporte
-- e deep link. Quem autoriza tem que ser a identidade do chamador.
--
-- Duas mudanças:
--
-- 1. A identidade é verificada ANTES de olhar a sessão. Além de fechar o
--    buraco, tira o oráculo: sem isso um anônimo distinguia UUID existente
--    (forbidden) de inexistente (session_not_found), e passava a enumerar.
--
-- 2. `is distinct from` no lugar de `<>`, para que a comparação nunca mais
--    possa produzir NULL mesmo que alguma coluna venha nula no futuro.
--
-- `coalesce(auth.role(),'')`: em contexto sem GUC de request `auth.role()`
-- também devolve NULL, e `NULL <> 'service_role'` cairia no mesmo problema.
-- =====================================================================

create or replace function public.record_signal(
  p_session_id   uuid,
  p_kind         public.signal_kind,
  p_occurred_at  timestamptz default now(),
  p_metadata     jsonb default '{}'::jsonb,
  p_external_ref text default null,
  p_source       text default null,
  p_device_id    uuid default null
) returns public.travel_sessions
language plpgsql security definer set search_path = public as $$
declare
  v_s        public.travel_sessions;
  v_platform public.device_platform;
  v_uid      uuid  := auth.uid();
  v_role     text  := coalesce(auth.role(), '');
begin
  -- Identidade primeiro. O cron e as Edge Functions continuam entrando por
  -- service_role; todo o resto precisa de um usuário autenticado.
  if v_role <> 'service_role' and v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select * into v_s from public.travel_sessions where id = p_session_id for update;
  if not found then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;

  if v_role <> 'service_role'
     and v_s.user_id is distinct from v_uid
     and not public.is_org_manager(v_s.org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_device_id is not null then
    select platform into v_platform
      from public.devices
     where id = p_device_id and user_id = v_s.user_id and revoked_at is null;

    if v_platform is null then
      raise exception 'unknown_device' using errcode = '42501';
    end if;

    -- Navegador não faz prova de presença física. Não roda GPS em background,
    -- a Geolocation API aceita coordenada forjada com duas linhas de devtools,
    -- e um laptop ligado na mesa emitiria "deslocamento" para sempre — o que
    -- desarma o Dead Man's Switch exatamente no cenário que ele existe para
    -- cobrir. Check-in explícito e abertura de app continuam valendo: ali há
    -- um humano deliberadamente afirmando que está bem.
    if v_platform = 'web' and p_kind in ('device_movement','gps_ping') then
      raise exception 'web_device_cannot_emit_location_signal' using errcode = '42501';
    end if;

    update public.devices
       set last_seen_at = now(),
           last_signal_at = case when p_kind = 'gps_ping' then last_signal_at else now() end
     where id = p_device_id;
  end if;

  -- Clamp temporal: nunca aceitar sinal no futuro, nunca retroceder o relógio.
  -- Sem isso um ping bufferado offline por 20 h chega e "reseta" o timer como
  -- se fosse agora — e o alarme nunca dispararia.
  p_occurred_at := least(greatest(p_occurred_at, v_s.last_signal_at), now());

  insert into public.signals
    (user_id, session_id, kind, occurred_at, metadata, external_ref, source, device_id)
  values
    (v_s.user_id, p_session_id, p_kind, p_occurred_at, p_metadata, p_external_ref, p_source, p_device_id)
  on conflict (kind, external_ref) do nothing;

  -- gps_ping é posição sem deslocamento: histórico e diário de bordo sim,
  -- prova de vida não.
  if p_kind = 'gps_ping' then
    return v_s;
  end if;

  if p_kind = 'device_movement' and not v_s.passive_checkin_enabled then
    return v_s;
  end if;

  update public.travel_sessions set
    last_signal_at   = p_occurred_at,
    last_signal_kind = p_kind,
    state            = case when state = 'sos' then state else 'safe'::public.safety_state end,
    escalation_step  = case when state = 'sos' then escalation_step else 0 end
  where id = p_session_id
  returning * into v_s;

  return v_s;
end $$;

revoke execute on function public.record_signal(
  uuid, public.signal_kind, timestamptz, jsonb, text, text, uuid
) from anon;

-- ---------------------------------------------------------------------
-- search_path fixo nos dois gatilhos
-- ---------------------------------------------------------------------
-- Os dois são SECURITY INVOKER, então não há escalada de privilégio aqui — mas
-- rodam em todo insert/update de travel_sessions, e sem search_path fixo o
-- `now()` que eles chamam depende do search_path de quem disparou o gatilho.
-- Fixar é de graça e zera o aviso do linter.
alter function public.tg_set_expected_checkin() set search_path = public;
alter function public.tg_touch_updated_at()     set search_path = public;
