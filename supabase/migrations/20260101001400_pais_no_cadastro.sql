-- =====================================================================
-- 14 · PAÍS DE ORIGEM VINDO DO CADASTRO
-- =====================================================================
-- `tg_handle_new_user` só lia `full_name` de raw_user_meta_data. O país nunca
-- entrava, e não havia de onde tirá-lo: e-mail não carrega país — @gmail.com
-- não diz nada, e deduzir do .br do domínio seria chute, já que a maioria dos
-- brasileiros usa provedor internacional.
--
-- Resultado prático: `home_country` nascia nulo para todo mundo, e o único
-- lugar do sistema inteiro onde dava para preenchê-lo era um campo de texto de
-- duas letras em /conta, na web. Quem só usava o app nunca conseguia — e a
-- bandeira ao lado do nome ficava vazia para sempre.
--
-- Agora o formulário de cadastro manda `home_country` junto, e este gatilho
-- grava. `upper` + o CHECK garantem o formato mesmo que o cliente mande minúsculo.
-- =====================================================================

create or replace function public.tg_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, home_country)
  values (
    new.id,
    -- Sem nome no cadastro, usa o que vem antes do @. Não é bonito, mas é
    -- melhor que uma coluna NOT NULL estourando o signup.
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    nullif(upper(trim(new.raw_user_meta_data->>'home_country')), '')
  );
  return new;
end $$;

-- Só aceita alpha-2. Barra o "Brasil" digitado por extenso e o "br" minúsculo
-- antes de virarem uma bandeira em branco na tela.
alter table public.profiles drop constraint if exists home_country_alpha2;
alter table public.profiles
  add constraint home_country_alpha2
  check (home_country is null or home_country ~ '^[A-Z]{2}$');
