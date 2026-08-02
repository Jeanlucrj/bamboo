-- =====================================================================
-- 08 · CREDENCIAL DEDICADA PARA O CRON
-- =====================================================================
-- O desenho da migration 04 fazia o cron autenticar nas Edge Functions com a
-- service_role — a chave mestra do banco. Para disparar uma varredura de
-- 5 em 5 minutos, ele carregava uma credencial capaz de ler e apagar o dossiê
-- médico de qualquer usuário.
--
-- Isso é privilégio muito além da tarefa, e na prática também é o que travava
-- a configuração: colocar a service_role no Vault exige transportá-la por
-- canais onde ela não deveria passar.
--
-- `cron_secret` faz uma coisa só: provar para a Edge Function que a chamada
-- veio do cron. Vazando, o estrago máximo é alguém rodar a varredura fora de
-- hora — e a troca é um comando, sem tocar em mais nada do projeto.
--
-- `service_role_key` continua sendo aceito como segunda opção para não quebrar
-- quem já tinha configurado daquele jeito.
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
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'cron_secret';
  if v_key is null then
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key';
  end if;

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
-- Limpeza do placeholder
-- ---------------------------------------------------------------------
-- A primeira tentativa de configuração gravou o texto literal
-- 'COLE_AQUI_A_SERVICE_ROLE_KEY' como se fosse a chave. Deixá-lo ali faria o
-- invoke_edge preferir um valor inválido a cair no cron_secret — e o sintoma
-- seria 401 silencioso a cada 5 minutos, sem nada apontando para a causa.
do $$
declare
  v_id uuid;
begin
  select id into v_id
    from vault.decrypted_secrets
   where name = 'service_role_key'
     and decrypted_secret like 'COLE_AQUI%';

  if v_id is not null then
    perform vault.update_secret(v_id, null, 'service_role_key_invalido');
    raise notice 'placeholder removido de service_role_key';
  end if;
exception when others then
  raise notice 'nao foi possivel limpar o placeholder: %', sqlerrm;
end $$;
