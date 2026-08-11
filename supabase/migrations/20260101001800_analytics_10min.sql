-- =====================================================================
-- 18 · DIÁRIO DE BORDO RECALCULADO A CADA 10 MINUTOS
-- =====================================================================
-- Os números do Diário (países, cidades, quilômetros, dias) vêm de
-- `mv_user_travel_stats`, uma view materializada que o cron atualizava uma vez
-- por hora. A tela "Minhas viagens", ao lado, lê ao vivo.
--
-- Resultado: duas telas do mesmo app discordando por até 59 minutos. E o
-- usuário não tem como saber qual está certa — as duas parecem igualmente
-- definitivas.
--
-- 10 minutos encurta a janela para algo que se explica ("acabou de acontecer")
-- em vez de algo que parece defeito.
--
-- Por que não em tempo real: os quilômetros saem de somar ST_Distance sobre
-- location_logs, a tabela que mais cresce do sistema — milhares de linhas por
-- viagem. Calcular a cada abertura de tela é O(n) no maior volume que temos, e
-- a tela do Diário é justamente a que a pessoa abre por curiosidade, não por
-- necessidade.
--
-- CONCURRENTLY não bloqueia leitura durante o refresh (exige o índice único,
-- que já existe). Sem ele, quem abrisse o Diário no instante do recálculo
-- ficaria esperando.
-- =====================================================================

select cron.unschedule('refresh-analytics');

select cron.schedule(
  'refresh-analytics', '*/10 * * * *',
  $$ refresh materialized view concurrently public.mv_user_travel_stats; $$
);
