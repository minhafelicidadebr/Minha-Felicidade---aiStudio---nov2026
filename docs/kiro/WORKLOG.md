# WORKLOG (curto)

## 2026-07 · P0.0 — Guardrails marca/PI/conteúdos externos
- Inventário por buscas direcionadas: `Yale`, `Coursera|Laurie Santos|Science of Well-Being`,
  `oficial|parceria|licenciad|endossad|certificad`.
- Ocorrências públicas críticas corrigidas (P0):
  - `index.html`: description/keywords/schema/og/twitter → linguagem independente, sem "baseado
    em Yale"; keyword "Yale" removida.
  - `src/components/landing/CourseStructure.tsx`: "Da Dra. Laurie Santos para você" → framing
    independente.
  - `src/pages/ConstellationPage.tsx`: "Da sala de Yale para sua tela" / "O conteúdo vem de Yale"
    / "o que alunos de Yale fazem" → material autoral com referência, sem alegação de origem/endosso.
  - `src/components/Footer.tsx`: adicionado aviso de independência institucional (site-wide);
    removido badge "WCAG 2.2".
- Docs criados: `P0_0_GUARDRAILS_MARCA_PI_CONTEUDOS_EXTERNOS.md`, `CONTENT_PROVENANCE.md`,
  `PROJECT_TRUTH.md`, `COMMERCIAL_GATES.md`, `DECISIONS.md`, `WORKLOG.md`, `NEXT_ACTION.md`.
- NÃO tocado: prompts de IA, protocolo de crise, consentimento, planos, edge functions.
- Gate: `npm run quality` (resultado registrado na entrega).

## 2026-07 · Fechamento do P0.0 — rótulo "Recurso externo"
- Criado `src/components/learning/ExternalResourceNotice.tsx`.
- Aplicado em `src/pages/ModulePage.tsx`: painel persistente de vídeo + modal de fallback.
- `CONTENT_PROVENANCE.md` e `COMMERCIAL_GATES.md` atualizados: pendência resolvida, gate P0.0 → **aprovado**.
- `npm run quality`: 80 testes, lint, typecheck, build, security gate — verde.

## 2026-07 · ONDA 1 Corte 1.1 — Entitlement canônico
- Criado `src/components/routing/RequireFeature.tsx` + teste (3 casos).
- `src/App.tsx`: campo `feature` em `PrivateRoute`; 9 rotas de ferramenta premium passam a exigir
  a feature canônica (evidence, simulator, debate, poetry, codesign, mindmap, challenge21,
  hypothesis, missions) antes de renderizar.
- `src/components/FeatureGate.tsx`: corrigido fail-open durante loading (mostrava conteúdo antes
  de resolver o plano).
- Ajuste de segurança: primeira versão do App.tsx quebrou `scripts/security-gate.mjs` (checa
  literal de `RequireRole`); corrigido preservando o literal exato.
- `npm run quality`: 83 testes, lint, typecheck, build, security gate — verde.

## 2026-07 · ONDA 1 Corte 1.2 — Integridade da assinatura
- Auditoria por buscas direcionadas: `user_subscriptions` ok (sem policy de INSERT/UPDATE para
  authenticated). `organization_subscriptions` **tinha** policy de UPDATE para `authenticated`
  (owner_id podia alterar plan/status/seats/vigência pelo client).
- Migration `20260722190000_drop_org_subscriptions_update_policy.sql`: remove essa policy.
- Runbook atualizado (item 21).
- `npm run quality`: 83 testes, lint, typecheck, build, security gate — verde.

## 2026-07 · ONDA 1 Corte 1.3 — Limites de IA centralizados
- Achado: `enforce_ai_usage_limit` aplicava 80/dia pra TODOS (hardcoded), independente do plano.
  Plano gratuito promete 9/dia; premium promete ilimitado. Inconsistência.
- Migration `20260722200000_ai_limits_from_plan.sql`: aledria-chat agora lê
  `get_my_plan()->'limits'->'alegria_daily'`. Se -1 = ilimitado (sem contar). Fallback = 9.
- Runbook atualizado (item 22).
- `npm run quality`: verificar.

## 2026-07 · ONDA 1 Corte 1.4 — Idade e consentimento
- `set_my_birth_date`: confirmada single-fill (ok).
- `guardian_consent_events`: ledger imutável confirmado (ok).
- `get_my_guardian_consent_status`: SECURITY DEFINER, self-scoped (ok).
- **GAP:** policy "Users can update own profile" permitia alterar `birth_date` diretamente.
- Migration `20260722210000_protect_birth_date_immutable.sql`: trigger que impede alteração de
  `birth_date` uma vez preenchida. Runbook item 23.
- `npm run quality`: verificar.

## 2026-07 · ONDA 2 (início) — Mapeamento do estado atual de multitenancy
- **organization_subscriptions** (existente): funciona como "a organização" de fato — tem
  `organization_name`, `owner_id`, `plan_id`, `max_seats`, status. É a tabela "contrato escolar".
- **organization_members** (existente): membros (user_id, invited_email, status), referenciados à
  assinatura. Policy "Org owners can manage members" (FOR ALL) permite ao owner CRUD.
- **NÃO existe** (precisa ser criado para piloto): `organizations` (entidade independente da
  assinatura), `schools`, `classes`, `invitations` (convites com token/expiração/papel),
  `enrollments` (matrícula aluno↔turma), papéis formais (platform_admin, org_admin,
  school_admin, educator, student, guardian).
- Decisão: o plano master pede essas tabelas na ONDA 2. Preparar uma migration única (CREATE
  TABLE IF NOT EXISTS) com RLS, policies e grants mínimos para piloto.

## 2026-07 · ONDA 2 — RPCs institucionais (criação/convite/aceite)
- Migration `20260722230000_institutional_rpcs.sql`:
  - `create_organization(name, slug)`: cria org + membership org_admin, idempotente.
  - `invite_member(org_id, email, role, school_id, class_id)`: cria convite com token, valida
    is_org_admin, enfileira notificação (best-effort), idempotente.
  - `accept_invitation(token)`: valida token + email confirmado + expiração, cria membership
    ON CONFLICT, marca convite aceito.
- Todas: SECURITY DEFINER, search_path=public, auditadas, REVOKE/GRANT corretos.
- Estende notification_outbox kind CHECK.
- Runbook item 25.

## 2026-07 · Vender pilotos — #7 tenant demo, #6 relatório, aprimoramento /escolas
- **#7 Tenant demonstrativo** (`supabase/migrations/20260722250000_demo_tenant_seed.sql`):
  org "Rede Exemplo de Bem-Estar (DEMONSTRAÇÃO)" (id `...d0`), 2 escolas, 3 turmas, 27 membros
  (1 org_admin = conta demo + 2 educadores + 24 alunos fictícios) + 3 convites pendentes. Tudo
  `metadata.is_demo=true`, IDs fixos, idempotente. Permite demonstrar o painel `/org` cheio sem
  piloto real e sem PII verdadeira. **PENDENTE: aplicar no SQL Editor do Lovable.**
- **#6 Relatório do piloto** (`src/pages/OrgDashboardPage.tsx`): botão "Relatório" no header gera
  .txt client-side com estrutura (escolas/turmas), adesão AGREGADA (membros por papel, taxa de
  ativação) e nota de privacidade. Sem PII, sem conversas de IA, sem relatos individuais. Fecha o
  ciclo comercial (demonstração → proposta → devolutiva). Commit `30ce2a3`.
- **/escolas aprimorada** (`src/pages/EscolasLandingPage.tsx`, commit `80471fb`): hero com foto
  real (`hero-youth-2026.jpg`), headline de conversão, trust row honesto, seção problema com
  `teacher-exhausted.jpg`, banda de transformação com `youth-connection.jpg`. Marca própria na nav.
- Honestidade: NÃO gero imagens; usei fotos hiperrealistas já existentes em `src/assets/`.
- `npm run quality`: 83 testes, lint, typecheck, build, security gate — verde (Exit 0).

## 2026-07 · ONDA UX-1 — App Shell adaptativo e Design System

Escopo executado (só infraestrutura; nenhum dashboard redesenhado):

- **Papel → home (puro/testável):** `src/lib/role-home.ts` unifica `profiles.roles` +
  `institutional_memberships.role` em `DashboardRole` com precedência explícita; dois mapas de
  destino (`CANONICAL_ROLE_HOME` do contrato e `IMPLEMENTED_ROLE_HOME` navegável hoje).
- **Navegação por papel (fonte única):** `src/config/dashboard-navigation.ts` — itens agrupados,
  bottom nav limitada a 5 destinos sem duplicar href, e flag `future` para a arquitetura-alvo que
  ainda não tem rota (não renderiza link morto).
- **Contexto compartilhado:** `src/hooks/useDashboardContext.ts` (React Query) resolve papéis,
  organizações visíveis, organização ativa (persistida e validada contra o que a pessoa pode ver),
  e `fetchedAt` para freshness. Resolve o `.limit(1)` que impedia context switcher.
- **Shell:** `RoleAwareAppShell` + `RoleSidebar` + `RoleNavigation` + `MobileRoleNavigation` +
  `DashboardHeader` + `ContextSwitcher` + `GlobalFilterBar`.
- **Componentes-base:** `MetricCard` (contrato de métrica completo), `InsightCard`, `DecisionQueue`,
  `ChartFrame` (com tabela alternativa real), `DashboardSkeleton`, `DashboardEmptyState`
  (empty/denied/demo), `DashboardErrorState`, `PrivacyIndicator`.
- **Rota canônica:** `/inicio` → `RoleHomeRedirect`. `/dashboard` preservado.
- **Modificados:** `App.tsx` (rota `/inicio`), `redirect.ts` (fallback role-aware validado),
  `RequireRole.tsx` (negação coerente com o papel), `index.css` + `tailwind.config.ts` (tokens),
  `Navbar.tsx` (só cabeçalho de STATUS).
- **Zero dependência nova.**

Testes reais adicionados: **83** (`npm run quality`: 83 → **166** testes, 15 → 18 arquivos).
- `role-home.test.ts` (12) · `dashboard-navigation.test.ts` (9) · `dashboard-states.test.tsx` (23)
- `RoleAwareAppShell.test.tsx` (15) · `shell-viewports.test.tsx` (20) · `redirect.test.ts` (+4)

Três defeitos encontrados pelos próprios testes e corrigidos na causa: landmark `main` duplicado
(SidebarInset já é `main`), `ContextSwitcher` duplicado por breakpoint (dois tab stops para a mesma
ação) e retry silencioso mascarando o estado de erro do contexto.

Gate UX-1: `npm run quality` verde — audit, lint (0 warnings), typecheck, 146 testes, build,
security gate.

**Não homologado visualmente:** o shell ainda não está montado em nenhuma página (instrução da
onda). A verificação de pixel/screenshot acontece quando a UX-2 montar `/org` sobre o shell.
