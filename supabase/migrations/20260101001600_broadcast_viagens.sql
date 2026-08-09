-- =====================================================================
-- 16 · SINCRONIZAÇÃO POR BROADCAST, NÃO POR POSTGRES CHANGES
-- =====================================================================
-- A migration 15 publicou `travel_sessions` em `supabase_realtime`, que é o
-- caminho clássico do Supabase (`postgres_changes`). Não funcionou, e não foi
-- por configuração faltando. Verificado, um a um, contra o projeto real:
--
--   tabela publicada ................... sim
--   inscrição registrada no banco ...... sim, papel `authenticated`, sub certo
--   GRANT SELECT para authenticated .... sim
--   política RLS (user_id = auth.uid()) . sim
--   slot de replicação ................. ativo, consumindo WAL
--   REPLICA IDENTITY ................... FULL
--   desligar/religar a tabela no painel . feito
--
-- Com tudo isso, o canal responde SUBSCRIBED e NENHUM evento chega. Três
-- execuções, mesmo resultado.
--
-- O teste que isolou a camada: um broadcast no MESMO canal, com o MESMO token,
-- volta na hora. Ou seja, WebSocket, serviço de Realtime e autenticação estão
-- inteiros — o que não entrega é especificamente a leitura do WAL do
-- `postgres_changes`.
--
-- Em vez de continuar depurando infraestrutura gerenciada que não podemos
-- reiniciar, trocamos o mecanismo pelo que o Supabase hoje recomenda:
-- `realtime.broadcast_changes()` disparado por gatilho. A mudança sai do
-- gatilho, dentro da transação, e vai pelo caminho que já provamos funcionar.
--
-- Ganho de brinde: o tópico é POR USUÁRIO (`viagens:<user_id>`), então o
-- servidor entrega só a quem interessa, em vez de espalhar toda alteração da
-- tabela e filtrar depois.
-- =====================================================================

create or replace function public.tg_broadcast_viagem()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
begin
  -- `level => 'ROW'` envia uma mensagem por linha alterada.
  -- Envelopado em exception: falha de entrega NÃO pode derrubar a transação.
  -- Encerrar uma viagem tem que funcionar mesmo com o Realtime fora do ar —
  -- o app tem recarga por foco de tela como rede de segurança, a notificação
  -- é a conveniência.
  begin
    perform realtime.broadcast_changes(
      'viagens:' || v_user::text,  -- tópico
      tg_op,                       -- evento: INSERT / UPDATE / DELETE
      tg_op,                       -- operação
      tg_table_name,
      tg_table_schema,
      new,
      old,
      'ROW'
    );
  exception when others then
    raise warning 'broadcast de viagem falhou: %', sqlerrm;
  end;

  return coalesce(new, old);
end $$;

drop trigger if exists broadcast_viagem on public.travel_sessions;

create trigger broadcast_viagem
  after insert or update or delete on public.travel_sessions
  for each row execute function public.tg_broadcast_viagem();

-- ---------------------------------------------------------------------
-- Autorização do canal privado
-- ---------------------------------------------------------------------
-- Canal privado exige política em `realtime.messages`. Sem ela o cliente
-- recebe CHANNEL_ERROR ao entrar — falha barulhenta, e é o que queremos:
-- melhor um erro visível do que o silêncio que o postgres_changes produzia.
--
-- A regra é a mesma da tabela: cada um só escuta o próprio tópico. O nome do
-- tópico carrega o uuid do dono, então comparar com auth.uid() basta.
--
-- Sem `alter table ... enable row level security` aqui: a tabela pertence a
-- `supabase_realtime_admin` e já vem com RLS ligada de fábrica. Tentar ligar de
-- novo estoura por falta de propriedade e derruba a migration inteira.
drop policy if exists "usuario escuta as proprias viagens" on realtime.messages;

create policy "usuario escuta as proprias viagens"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.topic() = 'viagens:' || auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- Desfaz a migration 15
-- ---------------------------------------------------------------------
-- Sair da publicação agora que nada escuta por ali. Manter custaria decodificar
-- WAL para ninguém — e `signals` é pior: uma linha por ping de GPS.
do $$
begin
  alter publication supabase_realtime drop table public.travel_sessions;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime drop table public.signals;
exception when others then null;
end $$;
