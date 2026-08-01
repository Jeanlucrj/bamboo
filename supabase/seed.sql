-- =====================================================================
-- SEED · Telefones de emergência por país
-- Alimenta o Dossiê de Emergência: quando o alerta dispara, a família vê
-- o número certo do país onde a pessoa está, não o 190 brasileiro.
-- Lista inicial: destinos mais frequentes de mochileiros e nômades.
-- =====================================================================

insert into public.country_emergency_numbers
  (country_code, country_name, police, ambulance, fire, universal, tourist_police, embassy_br_url) values
  ('BR','Brasil',                 '190','192','193','112', '(11) 3120-4447', null),
  ('PT','Portugal',               '112','112','112','112', null, 'https://lisboa.itamaraty.gov.br'),
  ('ES','Espanha',                '091','061','080','112', '902 102 112', 'https://madri.itamaraty.gov.br'),
  ('FR','França',                 '17', '15', '18', '112', null, 'https://paris.itamaraty.gov.br'),
  ('IT','Itália',                 '113','118','115','112', null, 'https://roma.itamaraty.gov.br'),
  ('DE','Alemanha',               '110','112','112','112', null, 'https://berlim.itamaraty.gov.br'),
  ('GB','Reino Unido',            '999','999','999','112', null, 'https://londres.itamaraty.gov.br'),
  ('NL','Países Baixos',          '112','112','112','112', null, 'https://haia.itamaraty.gov.br'),
  ('GR','Grécia',                 '100','166','199','112', '171', 'https://atenas.itamaraty.gov.br'),
  ('US','Estados Unidos',         '911','911','911','911', null, 'https://washington.itamaraty.gov.br'),
  ('CA','Canadá',                 '911','911','911','911', null, 'https://otawa.itamaraty.gov.br'),
  ('MX','México',                 '911','911','911','911', '078', 'https://cidadedomexico.itamaraty.gov.br'),
  ('AR','Argentina',              '911','107','100','911', null, 'https://buenosaires.itamaraty.gov.br'),
  ('CL','Chile',                  '133','131','132','133', null, 'https://santiago.itamaraty.gov.br'),
  ('PE','Peru',                   '105','106','116','911', '(01) 460-1060', 'https://lima.itamaraty.gov.br'),
  ('BO','Bolívia',                '110','118','119','911', '800-140081', 'https://lapaz.itamaraty.gov.br'),
  ('CO','Colômbia',               '123','125','119','123', null, 'https://bogota.itamaraty.gov.br'),
  ('UY','Uruguai',                '911','105','104','911', null, 'https://montevideu.itamaraty.gov.br'),
  ('TH','Tailândia',              '191','1669','199','191','1155', 'https://banguecoque.itamaraty.gov.br'),
  ('VN','Vietnã',                 '113','115','114','112', null, 'https://hanoi.itamaraty.gov.br'),
  ('ID','Indonésia',              '110','118','113','112', null, 'https://jacarta.itamaraty.gov.br'),
  ('IN','Índia',                  '100','102','101','112', '1363', 'https://novadelhi.itamaraty.gov.br'),
  ('NP','Nepal',                  '100','102','101','100', '1144', null),
  ('JP','Japão',                  '110','119','119','110', null, 'https://toquio.itamaraty.gov.br'),
  ('AU','Austrália',              '000','000','000','112', null, 'https://camberra.itamaraty.gov.br'),
  ('NZ','Nova Zelândia',          '111','111','111','111', null, null),
  ('ZA','África do Sul',          '10111','10177','10177','112', null, 'https://pretoria.itamaraty.gov.br'),
  ('MA','Marrocos',               '190','150','150','112', null, 'https://rabat.itamaraty.gov.br'),
  ('TR','Turquia',                '155','112','110','112', null, 'https://ancara.itamaraty.gov.br'),
  ('AE','Emirados Árabes Unidos', '999','998','997','999', '901', 'https://abudhabi.itamaraty.gov.br')
on conflict (country_code) do update set
  country_name   = excluded.country_name,
  police         = excluded.police,
  ambulance      = excluded.ambulance,
  fire           = excluded.fire,
  universal      = excluded.universal,
  tourist_police = excluded.tourist_police,
  embassy_br_url = excluded.embassy_br_url;
