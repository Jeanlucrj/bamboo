-- =====================================================================
-- 13 · TRÊS LINKS DE CONSULADO APONTAVAM PARA DOMÍNIO INEXISTENTE
-- =====================================================================
-- O dossiê de emergência mostra "Consulado do Brasil em <país>" com link para
-- `<cidade>.itamaraty.gov.br`. O padrão é real e 23 dos 26 endereços
-- respondiam — mas três tinham o nome da cidade aportuguesado onde o Itamaraty
-- usa o nome local, e davam DNS_PROBE_FINISHED_NXDOMAIN:
--
--   banguecoque -> bangkok      (Tailândia)
--   otawa       -> ottawa       (Canadá)
--   cidadedomexico -> mexico    (México)
--
-- Um link morto aqui é pior que link nenhum. Quem abre esta página acabou de
-- ser avisado de que alguém sumiu; clicar, esperar e cair numa tela de erro
-- custa tempo e, principalmente, custa a confiança de que o resto da página
-- também não é inventado.
--
-- Os 26 endereços foram testados um a um antes desta migration; só estes três
-- falhavam. Nepal e Nova Zelândia estavam vazios e foram preenchidos, também
-- verificados.
--
-- Todos redirecionam para gov.br/mre/pt-br/embaixada-<cidade>. Mantemos o
-- domínio curto por ser o canônico divulgado pelo próprio Itamaraty — se ele
-- mudar, o redirecionamento é responsabilidade deles e não some sem aviso.
-- =====================================================================

update public.country_emergency_numbers
   set embassy_br_url = 'https://bangkok.itamaraty.gov.br'
 where country_code = 'TH';

update public.country_emergency_numbers
   set embassy_br_url = 'https://ottawa.itamaraty.gov.br'
 where country_code = 'CA';

update public.country_emergency_numbers
   set embassy_br_url = 'https://mexico.itamaraty.gov.br'
 where country_code = 'MX';

update public.country_emergency_numbers
   set embassy_br_url = 'https://katmandu.itamaraty.gov.br'
 where country_code = 'NP' and embassy_br_url is null;

update public.country_emergency_numbers
   set embassy_br_url = 'https://wellington.itamaraty.gov.br'
 where country_code = 'NZ' and embassy_br_url is null;

-- Barra o formato errado antes de virar link morto na tela. Não garante que o
-- host exista — isso só a rede responde —, mas impede o erro de digitação e o
-- caminho relativo, que foram a origem deste problema.
alter table public.country_emergency_numbers
  drop constraint if exists embassy_url_plausivel;

alter table public.country_emergency_numbers
  add constraint embassy_url_plausivel
  check (embassy_br_url is null or embassy_br_url ~ '^https://[a-z0-9.-]+\.gov\.br(/|$)');
