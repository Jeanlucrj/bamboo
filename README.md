# Sentinela

Micro SaaS (B2C + B2B) de segurança para nômades digitais, influenciadores e viajantes solo.
**Dead Man's Switch** baseado na localização do celular (GPS em background + check-in passivo por
deslocamento) e **Diário de Bordo** automatizado.

> `Sentinela` é um nome-código. Troque em `packages/shared`, no `app.json` e no `content/landing.ts`.

---

## O que o sistema faz

Todo viajante ativo tem uma **sessão de viagem** com uma regra: *"se eu ficar N horas sem dar sinal
de vida, algo está errado"*. Um cron de 5 em 5 minutos varre as sessões vencidas e escala.

### O que conta como sinal de vida

| Sinal | Origem | Reseta o cronômetro? |
|---|---|---|
| `manual_checkin` | usuário tocou em "Estou bem" | sim |
| `device_movement` | GPS acusou deslocamento > `movement_threshold_m` (padrão 150 m) | sim |
| `app_open` | app voltou ao foreground | sim |
| `gps_ping` | posição registrada **sem** deslocamento | **não** |
| `sos` | botão de pânico | vai direto para `alert` |

A separação entre `device_movement` e `gps_ping` é o que sustenta o produto. O heartbeat de 4 h
dispara mesmo com o aparelho parado; se qualquer ping resetasse o cronômetro, **um celular
esquecido na mesinha do hostel faria check-in para sempre** e o alarme jamais tocaria. Um ping
estático vai para o histórico e para o diário de bordo, mas não é prova de vida.

A regra é implementada em dois lugares: `ingest_location_batch` mede o deslocamento contra a última
posição conhecida *antes* do lote e classifica o sinal; `record_signal` recusa `gps_ping` como
gatilho de reset mesmo se chamada diretamente.

### Escalonamento

| Estado | Quando | O que acontece |
|---|---|---|
| `safe` | sinal recebido | cronômetro zerado |
| `grace` | passou do check-in | push silencioso. **Ninguém externo é avisado** |
| `warning` | + grace_period (2h) | push crítico + SMS para o próprio usuário. Card amarelo no B2B |
| `alert` | + alert_delay (6h) | abre incidente e libera o **Dossiê de Emergência** aos contatos |
| `sos` | botão de pânico | pula tudo, aciona todos os canais imediatamente |
| `resolved` | alguém confirma | encerra, revoga links e avisa quem foi acionado |

Os dois degraus antes de `alert` não são burocracia: **falso positivo é o maior risco deste
produto**. Acionar a família de alguém que só ficou sem sinal destrói a confiança de forma
irreversível.

---

## Duas superfícies, responsabilidades diferentes

O app e o site não são a mesma coisa em telas diferentes. O critério da divisão não é
preferência de UX — é **o que cada ambiente consegue provar**.

| | App (iOS / Android) | Web (navegador) |
|---|---|---|
| GPS em background | sim | não existe |
| Executa com a tela bloqueada | sim | não |
| Notificação crítica | sim (com entitlement) | não |
| Coordenada confiável | do SO | forjável pelo devtools |
| **Pode dar sinal de vida** | **sim** | **só check-in explícito** |

Cada aparelho é uma linha em `devices`, com `platform ∈ (ios, android, web)`. A regra é
aplicada no banco, não na UI: `record_signal` recusa `device_movement` e `gps_ping` vindos de
um device `web`. Sem essa guarda, um navegador aberto numa aba mantém o Dead Man's Switch
desarmado para sempre — que é exatamente o cenário que o produto existe para cobrir.

O `install_id` é um UUID gerado no cliente, nunca IMEI ou advertising id: identificador de
hardware é dado pessoal regulado e a Apple rejeita o app por coletá-lo sem finalidade
declarada.

Quando o site é aberto no celular, uma faixa explica que o monitoramento roda no app — exceto
em `/d/[token]`, o dossiê, que é aberto por um contato de emergência no meio de um incidente e
onde vender instalação de app seria hostil.

---

## Painel de administração — `/admin`

Interno, para a operação do produto. Não confundir com o painel B2B (`/[orgSlug]`), que é o
cliente administrando a própria organização.

| Página | Para quê |
|---|---|
| Visão geral | KPIs de negócio + saúde do motor: cron, MV, backlog de geocoding, fila de notificação |
| Incidentes | Todos os alertas abertos, cross-org, ordenados por severidade. Encerrar com justificativa |
| Dispositivos | App vs navegador, aparelhos parados, **contas sem nenhum celular com o app** |
| Usuários | Busca de suporte por nome/e-mail/UUID |
| Auditoria | Toda busca e toda escrita, com autor e horário |

### Papéis

`support` < `admin` < `superadmin` (a ordem do ENUM *é* a hierarquia — é o que faz
`role >= p_min` funcionar). Suporte só lê; `admin` encerra incidente; `superadmin` concede
papéis.

### Como conceder o primeiro acesso

Não existe tela para isso, de propósito. Rode como `service_role` (SQL Editor do Supabase):

```sql
insert into public.platform_admins (user_id, role)
select id, 'superadmin' from auth.users where email = 'voce@empresa.com';
```

### Três decisões que não são óbvias

**O papel não é uma coluna em `profiles`.** `profiles` tem a policy
`own profile FOR ALL using (id = auth.uid())`. Uma coluna `is_admin` ali seria escrita pelo
próprio dono da linha — qualquer usuário faria `update profiles set is_admin = true` pelo
PostgREST e viraria administrador da plataforma. Não é hipótese remota, é uma requisição HTTP.
Por isso `platform_admins` é tabela separada, com RLS deny-all e **sem nenhuma policy**: só
`service_role` e as funções `SECURITY DEFINER` a enxergam.

**O painel roda com o JWT do admin, não com `service_role`.** Toda RPC chama
`require_platform_admin()` por dentro. `service_role` no navegador seria a chave mestra num
bundle público.

**O dossiê médico não é acessível pelo painel — nem por superadmin.** Tipo sanguíneo, alergias
e medicação são art. 11 da LGPD e nenhum caso de suporte precisa deles. Quem precisa é o
socorrista, e para ele existe `get_dossier(token)`, que audita cada acesso.

**Rota `/admin` devolve 404 para não-admin, não 403.** Um 403 confirma que o painel existe.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Banco / Auth / Realtime | Supabase (Postgres 15 + **PostGIS** + pg_cron + pg_net + Vault) |
| Backend de regras | Supabase Edge Functions (Deno) |
| Web (landing, B2C, B2B, dossiê) | Next.js 15 App Router + Tailwind |
| Mobile | React Native + Expo SDK 52 (expo-router) |
| Notificações | Resend (e-mail) · Twilio (SMS/WhatsApp) · Expo Push |
| Billing | Stripe |
| Geocoding | Mapbox (fallback Nominatim em dev) |

---

## Estrutura

```
sentinela/
├── apps/
│   ├── web/        Next.js — landing, auth, conta, painel B2B, dossiê, /admin
│   └── mobile/     Expo — GPS background, SOS, diário de bordo
├── packages/
│   └── shared/     tipos do DB, schemas zod, constantes de domínio
└── supabase/
    ├── migrations/ schema, PostGIS analytics, RLS, cron, devices, admin
    └── functions/  deadman-sweep, trigger-sos, reverse-geocode, ...
```

Rotas da web:

```
/                      landing (estática)
/login  /cadastro      link mágico, sem senha
/auth/callback         troca do código pela sessão (PKCE)
/dashboard             conta, aparelhos, atalho para painéis de org
/[orgSlug]             painel B2B — dinâmico, protegido por RESERVED_SLUGS
/d/[token]             dossiê de emergência (público por token)
/admin/*               painel interno da plataforma
```

---

## Setup

### 1. Dependências

```bash
pnpm install
cp .env.example apps/web/.env.local   # web
cp .env.example apps/mobile/.env      # mobile
```

### 1.1 Projeto Supabase

O projeto **`mewxuybwxdznszkcpdcy`** ("Protetor") já está sincronizado: as 7 migrations aplicadas,
o seed de telefones de emergência carregado e a config de auth publicada a partir do `config.toml`.
Para reaplicar depois de mexer no schema:

```bash
pnpm dlx supabase@latest db push --linked          # migrations
pnpm dlx supabase@latest db push --linked --include-seed
pnpm dlx supabase@latest config push --project-ref mewxuybwxdznszkcpdcy
```

Não é preciso Docker para nenhum dos três — só para `db start` / `db reset` / `db diff` locais.

### 1.2 Variáveis de ambiente — faça isto antes de abrir o app

`apps/web/.env.local` e `apps/mobile/.env` já apontam para o projeto real. As chaves usam o formato
novo do Supabase (`sb_publishable_*`), que substituiu a antiga `anon key`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://mewxuybwxdznszkcpdcy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

A variável continua se chamando `ANON_KEY` de propósito: é o nome que o `supabase-js` e o
`@supabase/ssr` esperam. Eles só repassam o valor no header `apikey` — não interpretam o formato.

**A porta importa.** `additional_redirect_urls` no `config.toml` autoriza
`http://localhost:3000/auth/callback`. Se o Next subir em outra porta (acontece quando a 3000 está
ocupada — ele avisa e usa a 3002), o link mágico é recusado pelo GoTrue. Libere a porta ou
acrescente a nova URL ao `config.toml` e rode `config push`.

> Rodando Supabase local (`pnpm db:start`), a URL é `http://127.0.0.1:54321`, a chave aparece no
> output do comando, e os e-mails de link mágico não são enviados de verdade — eles caem no
> Inbucket, em `http://localhost:54324`.

O Next só lê `.env.local` na inicialização: **reinicie o `pnpm dev:web`** depois de editar.

### 2. Banco

```bash
pnpm db:start        # Supabase local (Docker)
pnpm db:reset        # aplica migrations + seed
pnpm db:types        # regenera packages/shared/src/types/database.ts
```

Contra o projeto remoto, sem Docker:

```bash
pnpm dlx supabase@latest gen types typescript --linked \
  > packages/shared/src/types/database.ts
```

### Os tipos são dois arquivos, e a divisão importa

| Arquivo | Origem | O que tem |
|---|---|---|
| `types/database.ts` | **gerado** — sobrescrito por `db:types` | tabelas, views, enums, assinaturas de RPC |
| `types/app.ts` | **manual** — sobrevive à regeneração | formatos de `jsonb` e apelidos curtos |

O gerador não consegue inferir a estrutura do `jsonb` devolvido por `admin_overview()`,
`admin_system_health()` e `get_dossier()` — para ele é só `Json`. Esses três tipos são um
**contrato com o corpo da função SQL**: mudou o `jsonb_build_object` lá, mude o tipo aqui, porque
nada vai avisar.

Todo o resto do `app.ts` é derivado, não redigitado: `Profile` é
`Tables['profiles']['Row']`, `AdminIncident` é a linha de `admin_open_incidents`. Coluna nova na
migration aparece sozinha; coluna removida vira erro de compilação no lugar certo.

Em produção, **antes** de aplicar `20260101000400_cron.sql`, grave os segredos no Vault —
a migration precisa deles e nenhum deles pode ir para o Git:

```sql
select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
select vault.create_secret('<PROJECT_REF>',      'project_ref');
```

### 3. Edge Functions

```bash
pnpm fn:serve                                   # local
supabase secrets set RESEND_API_KEY=... TWILIO_ACCOUNT_SID=... SITE_URL=...
pnpm fn:deploy                                  # todas
```

### 4. Rodar

```bash
pnpm dev:web       # http://localhost:3000
pnpm dev:mobile    # Expo Dev Client
```

> O rastreamento em background **não funciona no Expo Go**. É preciso um development build
> (`eas build --profile development`) porque `expo-location` em modo background exige código nativo.

---

## Armadilhas já resolvidas (não reintroduza)

**`pnpm-workspace.yaml` é obrigatório.** O pnpm ignora o campo `workspaces` do `package.json` —
aquilo é convenção npm/yarn. Sem o YAML, o `workspace:*` de `@sentinela/shared` não resolve.

**Os Row types precisam ser `type`, nunca `interface`.** O supabase-js exige
`Row extends Record<string, unknown>`, e em TypeScript só type aliases ganham index signature
implícita. Com `interface`, o schema é rejeitado em silêncio e **toda query passa a retornar
`never`** — sem nenhuma mensagem de erro apontando para a causa.

**Argumento opcional de RPC é `undefined`, não `null`.** Os tipos gerados marcam `p_device_id?:
string`. Passar `null` explícito coloca a chave no corpo JSON e sobrescreve o DEFAULT declarado na
função; passar `undefined` faz o supabase-js omitir a chave e o default valer. Nos parâmetros
atuais dá no mesmo, mas em qualquer um com default não-nulo seria um bug silencioso.

**Toda view nova nasce atravessando a RLS.** No PG15+ uma view roda com as permissões do dono
(`postgres`, que ignora RLS), e as default privileges do Supabase já dão `SELECT` em `public` para
`anon` e `authenticated`. Ou seja: view criada sem pensar = tabela inteira legível por qualquer
portador da chave publicável, que está no bundle do navegador. Foi assim que cinco views vazaram
GPS, timeline de países e o semáforo B2B inteiro. Ao criar view em `public`, decida explicitamente:

- leitura de usuário final → `alter view ... set (security_invoker = on)`
- encanamento interno → schema `analytics`, que o PostgREST não expõe
- leitura privilegiada → não é view, é função `SECURITY DEFINER` com guarda no corpo

**Materialized view não aceita RLS nem `security_invoker`.** É tabela congelada. A única defesa é
`revoke all ... from anon, authenticated` e acesso exclusivo por função definer — no caso da
`mv_user_travel_stats`, por `get_my_travel_stats()`, que filtra por `auth.uid()`.

**Quase toda coluna de view e de MV é nulável.** O Postgres não prova que um `CASE` com `ELSE`
sempre retorna, nem que um `group by` preenche as colunas — então `traffic_light` sai como
`string | null` e as métricas de `mv_user_travel_stats` saem como `number | null`. Não silencie com
`as`: use `toTrafficLight()` para estreitar o semáforo e normalize as métricas uma vez por tela.

**`@supabase/ssr` precisa acompanhar o `supabase-js`.** A 0.5.2 passa 3 genéricos para um
`SupabaseClient` que hoje tem 5; o resultado é o mesmo `never` silencioso. Está em ^0.12.4.

**`outputFileTracingRoot` fixado no `next.config.ts`.** Sem isso o Next sobe a árvore procurando
lockfile e pode eleger a home do usuário como raiz do workspace, quebrando o trace no deploy.

**Função plpgsql que grava não pode ser `STABLE`.** `admin_search_users` registra a busca na
auditoria; marcada como `stable`, o Postgres recusa com
`INSERT is not allowed in a non-volatile function`. A ausência do marcador ali é intencional.

**`ON CONFLICT DO UPDATE` referencia a tabela sem o schema.** `public.devices.model` dentro do
`do update set` vira `missing FROM-clause entry for table "public"`. O correto é `devices.model`.

**A rota `/[orgSlug]` mora na raiz e captura tudo.** Qualquer página estática nova precisa entrar
em `RESERVED_SLUGS` (`packages/shared/src/constants.ts`), senão uma organização com slug `admin`
sequestra o painel interno — e `/precos` cai no painel B2B, não acha org e redireciona para login.

**Migration que usa tipo do PostGIS precisa de `set search_path = public, extensions`.** O PostGIS
é instalado em `extensions` (migration 00), mas o runner do `supabase db push` conecta com
`search_path = public` — `geography(Point,4326)` não resolve e o `create table` morre com *type
does not exist*. Isso **não aparece em runtime**: o Supabase põe `extensions` no search_path dos
papéis `anon`/`authenticated`, então só o deploy vê o problema. Já resolvido no topo das migrations
01 e 02; vale para qualquer migration nova que declare coluna geográfica ou chame `st_*` fora de
uma função (views não têm `set search_path` próprio).

**`supabase config push` sobrescreve, não faz merge.** Ele envia o bloco de config inteiro, e tudo
que o `config.toml` não declarar vai com o **default do CLI** — não com o valor que está no painel.
Na primeira execução isso desligou MFA TOTP e derrubou `max_frequency` de 1 min para 1 s, o que
transformaria o formulário de login numa máquina de spam apontada para terceiros. Toda config de
auth que importa está escrita explicitamente no `config.toml`, inclusive quando coincide com o
default. **Omitir não é "manter".**

## Decisões de arquitetura que não são óbvias

**`geography` e não `geometry`.** `ST_Distance` sobre `geography(Point,4326)` devolve metros
geodésicos direto. Com `geometry` seria preciso reprojetar para UTM por zona — inviável para quem
cruza hemisférios na mesma viagem.

**O sinal de vida usa o relógio do device, não o do servidor.** `record_signal` faz
`least(greatest(occurred_at, last_signal_at), now())`. Sem esse clamp, um ping bufferado offline
por 20h chegaria e resetaria o timer como se fosse agora — e o alarme nunca dispararia. É o detalhe
mais importante do backend inteiro.

**Materialized view para o Travel Analytics.** Somar `ST_Distance` sobre `location_logs` é O(n) na
tabela que mais cresce. `mv_user_travel_stats` é recalculada de hora em hora
(`REFRESH ... CONCURRENTLY`, que exige o índice único já criado) e o app lê uma linha.

**`country_code` denormalizado no ping.** Uma tabela de polígonos de países pesa dezenas de MB e o
`ST_Contains` por ping sai caro. O reverse geocoding preenche a coluna em batch. Se depois quiser
precisão offline, a coluna já existe — basta o join espacial.

**Gestor B2B não vê localização fora de incidente.** A policy de `location_logs` só libera leitura
para a org quando `state in ('warning','alert','sos')`. Rastreio contínuo de colaborador é passivo
jurídico, não funcionalidade.

> A policy existia desde o início, mas **não era aplicada**: `v_org_traveler_status` era uma view
> `SECURITY DEFINER` e passava por cima dela, entregando a última posição sempre. Corrigido na
> migration 07 com `security_invoker = on`. Fora de incidente, `city`, `last_lat` e `last_lng`
> agora chegam nulos — como a documentação sempre prometeu.

**O dossiê médico não é lido por ninguém direto.** `emergency_dossiers` tem RLS de dono-apenas. O
acesso externo passa só por `get_dossier(token)` — SECURITY DEFINER, valida hash sha256, checa
expiração e registra cada acesso.

---

## Riscos conhecidos (leia antes de prometer na landing)

1. **Celular parado dispara alarme — e isso é correto, mas precisa ser comunicado.** Quem deixa o
   telefone no quarto e passa o dia na praia vai acionar a família. A tela de Viagem avisa isso em
   destaque, e `app_open` cobre o caso de quem está no mesmo lugar mas usando o aparelho. Ainda
   assim, é a principal fonte de falso positivo do desenho atual — acompanhe de perto no piloto.
2. **iOS não garante ping de 4 em 4 horas.** Não existe timer confiável em background. Há
   *significant location change*, *region monitoring* e `BackgroundFetch` oportunista. O intervalo
   é um alvo; a redundância de três fontes é o que faz o produto funcionar.
3. **Alertas críticos no iOS exigem entitlement da Apple.** Solicite cedo — sem ele, o push do
   estado `warning` não atravessa o Modo Foco.
4. **Review da App Store para background location** costuma pedir vídeo demonstrando o uso. Grave
   o fluxo de alerta antes de submeter.
5. **LGPD/GDPR.** Localização contínua + dado médico = dado sensível. Já implementados: consentimento
   explícito no onboarding, retenção de 24 meses com purga automática, log de acesso ao dossiê e
   exclusão sob demanda. Falta: DPA com Twilio/Resend e registro do encarregado de dados.

---

## Roadmap do MVP (~8 semanas)

| Fase | Escopo | Entrega |
|---|---|---|
| 1–2 | Schema + RLS + Auth + boilerplate Expo | login e sessão de viagem |
| 3–4 | GPS background + fila offline + ingestão | pings chegando no Postgres |
| 5 | `deadman-sweep` + escalonamento + dossiê | **núcleo funcionando** |
| 6 | Travel Analytics | retenção |
| 7 | Landing + Stripe + painel B2C | monetização |
| 8 | Painel B2B + relatórios | ticket alto |

### Melhoria natural pós-MVP: pedômetro

O sinal passivo mais forte que o celular oferece não é o GPS — é o **contador de passos**
(`expo-sensors` / Pedometer). Passos detectados provam que alguém está carregando o aparelho, o
que resolve os dois furos do desenho atual: o celular esquecido (não acumula passos) e a pessoa
que ficou dois dias no mesmo lugar (anda dentro do hostel e continua "viva"). Custa pouco: um
`signal_kind` novo e uma leitura periódica no heartbeat que já existe.
