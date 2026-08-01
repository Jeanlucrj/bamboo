# PENDÊNCIAS — Relatório para o Agente Finalizar o Sistema

> **Data da auditoria:** 2026-07-30
> **Projeto:** Sentinela — Sistema de Segurança para Nômade Digital
> **Diretório raiz:** `c:\Users\User\.gemini\antigravity\scratch\Sistema Seguranca Nomade Digital`
> **Build status:** ✅ Next.js 15.5.22 compila sem erros, TypeScript validado

---

## STATUS — atualizado em 2026-07-30

| Tarefa | Situação |
|---|---|
| 1 · `/precos` | ✅ feito — `apps/web/src/app/(marketing)/precos/page.tsx`, sai como `○ (Static)` |
| 2 · `/para-empresas` | ✅ feito — `apps/web/src/app/(marketing)/para-empresas/page.tsx`, `○ (Static)` |
| 3 · `sos/ativo.tsx` | ✅ feito — o disparo do SOS migrou da home para a tela (ver nota abaixo) |
| 4 · `viagem/nova.tsx` | ✅ feito — bloqueia criar 2ª viagem ativa |
| 5 · `contatos/novo.tsx` | ✅ feito |
| 6 · Diretórios de apoio | ⏭️ deliberadamente não feito — ver nota |

**Desvio na tarefa 3.** O relatório descrevia o fluxo `PanicButton → router.push → triggerSos`,
mas o código em `(tabs)/index.tsx` fazia o inverso: `await triggerSos()` e só então navegava. Na
prática o usuário encarava a home por vários segundos (corrida de 3 s pela posição + ida à rede +
eventual fallback para SMS) sem nenhuma confirmação — e em pânico isso vira toque repetido. O
disparo foi movido para dentro de `sos/ativo.tsx`, que agora abre instantaneamente e mostra o
progresso. `index.tsx` só navega.

**Tarefa 6 não foi feita, de propósito.** Criar `Button.tsx`, `Input.tsx`, `queries/` e `utils/`
sem nenhum chamador produz código morto que a próxima pessoa vai encontrar e tratar como padrão do
projeto. Componente base se extrai na terceira repetição, não antes. Os diretórios vazios podem ser
apagados.

**Não é pendência de código, mas bloqueia o uso:** `apps/web/.env.local` tem credenciais
placeholder (`https://placeholder.supabase.co`). Enquanto não apontar para um projeto Supabase real,
login, cadastro e todo o painel falham na rede. Ver "Configuração do Supabase" no README.

---

## Resumo

O sistema está ~85% implementado. Faltam **2 páginas web** e **3 telas mobile** que já têm
diretórios criados e referências no código, mas estão vazios (sem arquivo de rota/tela).
Há também **3 diretórios de apoio vazios** na web que precisam de atenção.

---

## TAREFA 1: Página `/precos` (Web)

### O que falta
Criar `apps/web/src/app/(marketing)/precos/page.tsx`

### Contexto
- O diretório `apps/web/src/app/(marketing)/precos/` já existe mas está **vazio**
- O layout de marketing já está em `apps/web/src/app/(marketing)/layout.tsx` — a página herda o header com nav, footer e o `<AppHandoff />`
- O componente `PricingTable` já existe em `apps/web/src/components/marketing/PricingTable.tsx` — ele puxa os dados de `apps/web/src/content/landing.ts` (export `pricing`)
- O nav do layout já linka para `/precos`
- Os planos estão definidos em `packages/shared/src/constants.ts` (export `PLANS`)

### Padrão a seguir
- Copiar a estrutura de `apps/web/src/app/(marketing)/page.tsx` (a landing)
- A página deve ser SSG estática (`export const metadata: Metadata = { ... }`)
- Reutilizar o componente `<PricingTable />` como seção principal
- Adicionar uma seção de FAQ de preços (reutilizar `<Faq />` ou filtrar perguntas relevantes)
- Adicionar seção de comparação detalhada dos 3 planos (Explorador grátis, Nômade R$19/mês, Organização R$24/viajante/mês)
- Incluir o `<FinalCta />` no fim
- Não usar `force-dynamic` — esta página é marketing estático

### Dados dos planos (já em `content/landing.ts`)
```
Explorador (grátis): 1 contato, check-in manual, GPS 24h, Analytics básico, alertas e-mail, botão de pânico
Nômade (R$19/mês): contatos ilimitados, check-in passivo, GPS ilimitado, Analytics completo, SMS/WhatsApp, botão de pânico
Organização (R$24/viajante/mês): tudo do Nômade + painel equipe, relatórios compliance, protocolos customizados, SSO, SLA
```

### Metadata sugerida
```tsx
export const metadata: Metadata = {
  title: 'Preços',
  description: 'Planos do Sentinela: do gratuito ao enterprise. Comece sem cartão de crédito.',
};
```

---

## TAREFA 2: Página `/para-empresas` (Web)

### O que falta
Criar `apps/web/src/app/(marketing)/para-empresas/page.tsx`

### Contexto
- O diretório `apps/web/src/app/(marketing)/para-empresas/` já existe mas está **vazio**
- O layout de marketing é herdado automaticamente
- O nav linka para `/para-empresas`
- O componente `AudienceSplit` em `apps/web/src/components/marketing/AudienceSplit.tsx` já tem conteúdo B2B (seção `audiences.b2b` e `audiences.b2bPitch` em `content/landing.ts`)
- O botão "Falar com vendas" do plano Organização na `PricingTable` linka para `/para-empresas`

### Padrão a seguir
- Página SSG estática
- Hero específico para B2B: "Dever de cuidado documentado e auditável"
- Seção de funcionalidades B2B:
  - Painel com semáforo de equipe em tempo real
  - Protocolos de escalonamento configuráveis
  - Relatórios de conformidade exportáveis
  - SSO e gestão de permissões
  - SLA com suporte dedicado
- Seção "Como funciona para gestores" (o gestor NÃO vê localização fora de incidente — `state in ('warning','alert','sos')`)
- Seção de "Duty of Care" explicando a obrigação legal
- CTA de formulário de contato ou botão `mailto:vendas@sentinela.app`
- Incluir `<PricingTable />` focando no plano Organização
- Incluir `<FinalCta />`

### Conteúdo B2B já disponível (em `content/landing.ts`)
```
audiences.b2b.items: [
  'Agências de intercâmbio e turismo de aventura',
  'ONGs e jornalistas em campo', 
  'Empresas com colaboradores em viagem',
  'Produtoras e equipes de filmagem'
]
audiences.b2bPitch.title: 'Duty of care deixou de ser gentileza — virou exigência de seguradora e de contrato.'
audiences.b2bPitch.body: 'O painel Sentinela mostra todos os seus viajantes em um semáforo...'
```

### Metadata sugerida
```tsx
export const metadata: Metadata = {
  title: 'Para Empresas',
  description: 'Dever de cuidado documentado: painel com semáforo em tempo real, alertas automáticos e relatórios de conformidade.',
};
```

---

## TAREFA 3: Tela `sos/ativo.tsx` (Mobile)

### O que falta
Criar `apps/mobile/app/sos/ativo.tsx`

### Contexto
- O diretório `apps/mobile/app/sos/` já existe mas está **vazio**
- O root layout (`apps/mobile/app/_layout.tsx`) já registra a rota:
  ```tsx
  <Stack.Screen name="sos/ativo" options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }} />
  ```
- O serviço SOS completo já existe em `apps/mobile/src/services/sos.ts` com `triggerSos()` e `cancelSos()`
- O `PanicButton` componente existe em `apps/mobile/src/components/PanicButton.tsx` (press-and-hold 3s com haptic feedback)
- A sessão ativa vem de `useSessionStore` em `apps/mobile/src/stores/session.ts`

### O que esta tela deve fazer
1. Mostrar confirmação de que o SOS foi acionado
2. Mostrar estado em tempo real: "Contatos sendo avisados..." → "X contatos notificados"
3. Mostrar coordenadas sendo transmitidas
4. Permitir CANCELAR o SOS (o `cancelSos(alertId, note)` já existe)
5. `gestureEnabled: false` — o usuário não pode dismiss por gesture, precisa de ação explícita
6. Fundo vermelho escuro agressivo, tudo grande e legível (pessoa em pânico)

### Padrão de estilo
- Usar tema de `apps/mobile/src/theme/index.ts` (colors.alert = '#DC2626', colors.sos = '#DC2626')
- Estilo semelhante ao PanicButton: fundo escuro, texto grande, mínimo de elementos visuais
- StyleSheet.create, React Native puro, expo-router para navegação

### Fluxo
```
PanicButton.onTrigger() → router.push('/sos/ativo') → triggerSos(sessionId)
  ↳ sucesso via server → mostra "X contatos notificados"
  ↳ fallback SMS → mostra "SMS nativo enviado para X contatos"
  ↳ falha → mostra erro + botão "Tentar de novo"
Botão "Estou bem, cancelar" → cancelSos(alertId) → router.back()
```

---

## TAREFA 4: Tela `viagem/nova.tsx` (Mobile)

### O que falta
Criar `apps/mobile/app/viagem/nova.tsx`

### Contexto
- O diretório `apps/mobile/app/viagem/` já existe mas está **vazio**
- O root layout já registra a rota:
  ```tsx
  <Stack.Screen name="viagem/nova" options={{ title: 'Nova viagem', presentation: 'modal' }} />
  ```
- O schema de validação já existe: `travelSessionInput` em `packages/shared/src/schemas.ts`
- Os presets de intervalo estão em `packages/shared/src/constants.ts` (export `CHECKIN_PRESETS`)
- A tab de viagem (`apps/mobile/app/(tabs)/viagem.tsx`) já mostra a sessão ativa e configurações

### O que esta tela deve fazer
1. Formulário de criação de nova sessão de viagem
2. Campos:
   - Título da viagem (obrigatório, min 2 chars)
   - Destino (label descritivo, opcional)
   - Intervalo de check-in (usar `CHECKIN_PRESETS` como seletor visual, igual à tab viagem)
   - Check-in passivo habilitado (toggle, default true)
   - GPS tracking habilitado (toggle, default true)
3. Validar com `travelSessionInput` do Zod
4. Criar sessão via `supabase.from('travel_sessions').insert(...)`
5. Após criar, recarregar `useSessionStore.getState().load()`
6. Ativar tracking se habilitado: `startBackgroundTracking(sessionId)` de `apps/mobile/src/services/location/backgroundLocation.ts`
7. Fechar modal: `router.back()`

### Padrão de estilo
- Modal com fundo `colors.bg`, inputs com `colors.surface` e borda `colors.border`
- Presets de intervalo idênticos à tab viagem (ver `apps/mobile/app/(tabs)/viagem.tsx` linhas 80-95)
- Botão "Iniciar viagem" em `colors.brand`

---

## TAREFA 5: Tela `contatos/novo.tsx` (Mobile)

### O que falta
Criar `apps/mobile/app/contatos/novo.tsx`

### Contexto
- O diretório `apps/mobile/app/contatos/` já existe mas está **vazio**
- O root layout já registra a rota:
  ```tsx
  <Stack.Screen name="contatos/novo" options={{ title: 'Novo contato', presentation: 'modal' }} />
  ```
- O schema de validação já existe: `emergencyContactInput` em `packages/shared/src/schemas.ts`
- Regras de validação:
  - Pelo menos e-mail OU telefone obrigatório
  - Telefone em formato E.164 (`+5511999999999`)
  - Canal SMS/WhatsApp exige telefone
  - Prioridade 1-10 (default 1)

### O que esta tela deve fazer
1. Formulário de cadastro de contato de emergência
2. Campos:
   - Nome completo (obrigatório, min 2 chars)
   - Parentesco/relação (opcional)
   - E-mail (opcional se tiver telefone)
   - Telefone formato internacional (opcional se tiver e-mail)
   - Canal preferido: e-mail | SMS | WhatsApp (dropdown/segmented)
   - Prioridade (numérica, quem é avisado primeiro)
3. Validar com `emergencyContactInput` do Zod
4. Salvar: `supabase.from('emergency_contacts').insert(...)`
5. Fechar modal: `router.back()`

### Padrão de estilo
- Mesmo padrão de modal das outras telas
- Inputs com `colors.surface`, labels com `colors.textMuted`
- Botão "Salvar contato" em `colors.brand`

---

## TAREFA 6: Diretórios de apoio web (menor prioridade)

### 6a. `apps/web/src/components/ui/` — Componentes base

Diretório vazio. Os componentes existentes (marketing, admin, dossier, device, auth, dashboard)
usam classes Tailwind diretamente. Se quiser, pode criar componentes base reutilizáveis:
- `Button.tsx` — botão primário/secundário/outline
- `Input.tsx` — input de formulário
- `Badge.tsx` — badge de status
- `Card.tsx` — card genérico

Estes NÃO são bloqueantes — o sistema funciona sem eles.

### 6b. `apps/web/src/lib/queries/` — Queries encapsuladas

Diretório vazio. As queries estão inline nos componentes de página (Server Components).
Não é bloqueante — o padrão do Next.js 15 é fazer queries diretamente no Server Component.

### 6c. `apps/web/src/lib/utils/` — Utilitários

Diretório vazio. Funções de utilidade estão locais nos arquivos que as usam.
Pode-se extrair utilitários comuns (formatação de data, etc.).

---

## Referências de Arquivos para Contexto

### Stack
- **Web:** Next.js 15 App Router + Tailwind
- **Mobile:** React Native + Expo SDK 52 (expo-router)
- **Banco:** Supabase (Postgres + PostGIS + pg_cron)
- **Shared:** TypeScript, Zod

### Arquivos de referência essenciais (ler antes de implementar)
| O quê | Caminho |
|-------|---------|
| README completo | `README.md` |
| Constantes de domínio | `packages/shared/src/constants.ts` |
| Schemas Zod | `packages/shared/src/schemas.ts` |
| Tipos do banco | `packages/shared/src/types/database.ts` |
| Content da landing | `apps/web/src/content/landing.ts` |
| Layout marketing (web) | `apps/web/src/app/(marketing)/layout.tsx` |
| Landing page (web) | `apps/web/src/app/(marketing)/page.tsx` |
| PricingTable comp | `apps/web/src/components/marketing/PricingTable.tsx` |
| AudienceSplit comp | `apps/web/src/components/marketing/AudienceSplit.tsx` |
| Root layout mobile | `apps/mobile/app/_layout.tsx` |
| Tab viagem (mobile) | `apps/mobile/app/(tabs)/viagem.tsx` |
| Serviço SOS (mobile) | `apps/mobile/src/services/sos.ts` |
| Session store (mobile) | `apps/mobile/src/stores/session.ts` |
| Theme mobile | `apps/mobile/src/theme/index.ts` |
| PanicButton comp | `apps/mobile/src/components/PanicButton.tsx` |

### Rotas já registradas no root layout mobile que esperam arquivo
```tsx
// _layout.tsx linhas 104-108:
<Stack.Screen name="sos/ativo" options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }} />
<Stack.Screen name="viagem/nova" options={{ title: 'Nova viagem', presentation: 'modal' }} />
<Stack.Screen name="contatos/novo" options={{ title: 'Novo contato', presentation: 'modal' }} />
```

### Build da web (resultado da auditoria)
```
Route (app)                                 Size  First Load JS
┌ ○ /                                      162 B         106 kB
├ ƒ /[orgSlug]                           2.77 kB         188 kB
├ ƒ /admin                                 174 B         106 kB
├ ƒ /admin/auditoria                       174 B         106 kB
├ ƒ /admin/dispositivos                    174 B         106 kB
├ ƒ /admin/incidentes                     1.1 kB         107 kB
├ ƒ /admin/usuarios                        174 B         106 kB
├ ƒ /auth/callback                         126 B         103 kB
├ ƒ /auth/sair                             126 B         103 kB
├ ƒ /cadastro                            1.98 kB         175 kB
├ ƒ /d/[token]                             981 B         170 kB
├ ƒ /dashboard                           3.38 kB         189 kB
└ ƒ /login                               1.98 kB         175 kB
```
Após implementar, devem aparecer `/precos` e `/para-empresas` como `○ (Static)`.

---

## Prioridade de implementação

1. **`/precos`** (web) — página de conversão, crítica para monetização
2. **`/para-empresas`** (web) — ticket alto, B2B
3. **`sos/ativo.tsx`** (mobile) — funcionalidade core de segurança
4. **`viagem/nova.tsx`** (mobile) — necessário para criar viagens
5. **`contatos/novo.tsx`** (mobile) — necessário para cadastrar contatos
6. Componentes UI base (web) — nice to have

---

## Verificação pós-implementação

### Web
```bash
cd apps/web && npx next build
```
Confirmar que `/precos` e `/para-empresas` aparecem na lista de rotas como `○ (Static)`.

### Mobile
```bash
cd apps/mobile && npx expo start
```
Verificar que as rotas `sos/ativo`, `viagem/nova` e `contatos/novo` abrem como modais sem crash.

### Lembrete IMPORTANTE
- Toda página estática nova precisa ter seu slug em `RESERVED_SLUGS` em `packages/shared/src/constants.ts`. **`para-empresas` e `precos` JÁ ESTÃO lá** (verificado).
- Os Row types do Supabase devem ser `type`, nunca `interface`.
- Mobile: usar expo-router `router.push()` / `router.back()`, não `navigation.navigate()`.
