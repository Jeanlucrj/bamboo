-- =====================================================================
-- 17 · NOVO MODELO DE COBRANÇA: 2 VIAGENS GRÁTIS, DEPOIS R$ 49,90/MÊS
-- =====================================================================
-- Sai a escada de três planos (Explorador grátis / Nômade R$19 / Organização
-- R$24) e entra um degrau só: as duas primeiras viagens são de graça, a
-- terceira exige assinatura.
--
-- A regra mora AQUI, não na tela. Limite validado só no cliente é decoração:
-- a chave publicável está no bundle do app e no JavaScript do site, e qualquer
-- um pode chamar a API direto. Um gatilho BEFORE INSERT é a única barreira que
-- vale.
--
-- CONTAGEM VITALÍCIA, e por viagem CRIADA — não por mês, não por viagem
-- concluída. "Testar em 2 viagens" é sobre experimentar o produto, e uma
-- viagem criada já dá acesso a tudo: rastreamento, dossiê, contatos, alerta.
-- Contar só as concluídas deixaria o teste infinito para quem nunca encerra.
--
-- Sobre apagar viagens para recuperar cota: é possível, e é aceitável. O preço
-- de fazer isso é perder o histórico — quilômetros, países, diário de bordo —
-- que é justamente o que prende quem usa. Um contador separado em `profiles`
-- seria pior: a RLS deixa o usuário atualizar o próprio perfil, então ele
-- poderia zerar o número sem perder nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Assinatura desamarrada do Stripe
-- ---------------------------------------------------------------------
-- As colunas nasceram com nome de Stripe e a cobrança vai ser pelo Abacate
-- Pay. Renomear agora, com a tabela vazia, custa nada; depois de ter assinante
-- custaria migração de dados.
alter table public.subscriptions rename column stripe_customer_id to provider_customer_id;
alter table public.subscriptions rename column stripe_sub_id      to provider_sub_id;

alter table public.subscriptions
  add column if not exists provider text not null default 'abacatepay';

comment on column public.subscriptions.provider is
  'Gateway de pagamento. Coluna existe para o próximo não ser um rename.';

-- ---------------------------------------------------------------------
-- Quem está pagando
-- ---------------------------------------------------------------------
create or replace function public.tem_assinatura_ativa(p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.subscriptions s
     where s.user_id = p_user
       and s.status in ('active', 'trialing')
       -- Sem data de fim = assinatura sem vencimento conhecido; vale.
       -- Com data, precisa estar no futuro: assinatura vencida não é ativa
       -- por mais que o status tenha ficado desatualizado por webhook perdido.
       and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

revoke execute on function public.tem_assinatura_ativa(uuid) from public, anon;
grant  execute on function public.tem_assinatura_ativa(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- A trava
-- ---------------------------------------------------------------------
create or replace function public.tg_limite_viagens_gratis()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usadas int;
begin
  -- service_role passa direto: é o cron, o suporte e os testes. Bloquear a
  -- própria infraestrutura por causa de cota seria absurdo.
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  -- Viagem de organização é cobrada por contrato B2B, não por esta cota.
  if new.org_id is not null then
    return new;
  end if;

  if public.tem_assinatura_ativa(new.user_id) then
    return new;
  end if;

  select count(*) into v_usadas
    from public.travel_sessions
   where user_id = new.user_id;

  if v_usadas >= 2 then
    -- Mensagem legível: ela sobe até a tela por `error.message`, e "violação
    -- de constraint" não diz nada a quem está tentando viajar.
    raise exception 'limite_gratuito_atingido'
      using hint = 'As 2 viagens gratuitas foram usadas. Assine para continuar.',
            errcode = 'P0001';
  end if;

  return new;
end $$;

drop trigger if exists limite_viagens_gratis on public.travel_sessions;

create trigger limite_viagens_gratis
  before insert on public.travel_sessions
  for each row execute function public.tg_limite_viagens_gratis();

-- ---------------------------------------------------------------------
-- O que a tela precisa saber
-- ---------------------------------------------------------------------
-- Uma chamada só, para o app e o site mostrarem a mesma coisa. Se cada tela
-- montasse a própria conta, uma diria "resta 1 viagem" e a outra "pode criar",
-- e a divergência apareceria justo na hora de cobrar.
create or replace function public.meu_plano()
returns table (
  viagens_usadas   int,
  viagens_gratis   int,
  assinante        boolean,
  pode_criar       boolean,
  plano            text,
  status           text,
  renova_em        timestamptz
)
language sql stable security definer set search_path = public as $$
  with usadas as (
    select count(*)::int as n from public.travel_sessions where user_id = auth.uid()
  ),
  assin as (
    select s.plan, s.status, s.current_period_end
      from public.subscriptions s
     where s.user_id = auth.uid()
     order by s.created_at desc
     limit 1
  )
  select
    u.n,
    2,
    public.tem_assinatura_ativa(),
    public.tem_assinatura_ativa() or u.n < 2,
    coalesce((select plan from assin), 'gratuito'),
    coalesce((select status from assin), 'sem_assinatura'),
    (select current_period_end from assin)
  from usadas u;
$$;

revoke execute on function public.meu_plano() from public, anon;
grant  execute on function public.meu_plano() to authenticated;

comment on function public.meu_plano() is
  '2 viagens grátis por conta, depois assinatura. Fonte única para app e web.';
