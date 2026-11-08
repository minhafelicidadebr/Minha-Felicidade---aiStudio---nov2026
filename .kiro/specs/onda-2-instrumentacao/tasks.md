# Implementation Plan: Onda 2 — Instrumentação (Funil de Conversão)

## Overview

Branch nova (`feat/onda-2-instrumentacao`), nunca direto na `main`. Gate verde
a cada tarefa. Tabela write-only para o cliente; leitura agregada só via RPC
restrita a teacher/manager.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1], "description": "Fundação: tabela landing_events" },
    { "wave": 2, "tasks": [2, 3], "description": "Cliente de captura + RPC agregada" },
    { "wave": 3, "tasks": [4, 5, 6, 7], "description": "Instrumentar os 6 eventos nos pontos do funil" },
    { "wave": 4, "tasks": [8], "description": "Painel no /admin" },
    { "wave": 5, "tasks": [9], "description": "Gate final e docs" }
  ]
}
```

## Tasks

- [x] 1. Migration: tabela `landing_events`
  - Schema do `design.md` (RLS on, policy de INSERT apenas para anon/authenticated,
    sem SELECT/UPDATE/DELETE para cliente, índices em kind+created_at e session_id).
  - Adicionar ao `docs/security-invariants-runbook.md`.
  - _Requirements: 2.1, 2.2_

- [x] 2. Cliente: `src/lib/analytics.ts`
  - `trackEvent(kind, metadata?)`: gera/persiste `session_id` em localStorage,
    resolve `user_id` se logado, valida `metadata` contra allowlist por `kind`,
    insere em `landing_events` (best-effort, nunca lança).
  - Testes da função pura de validação de allowlist.
  - _Requirements: 1.1, 1.3, 2.3_

- [x] 3. Migration: RPC `get_funnel_overview`
  - `SECURITY DEFINER`, valida papel via `has_my_role` internamente, agrega
    contagens por kind no intervalo, aplica N mínimo, loga em `data_access_logs`.
  - _Requirements: 2.4, 3.1, 3.3, 3.4_

- [x] 4. Instrumentar `signup` e `checkout_started`
  - `signup`: após `supabase.auth.signUp` bem-sucedido em `AuthPage.tsx`.
  - `checkout_started`: em `startIndividualCheckout`/`startEscolarCheckout`
    (`src/lib/checkout.ts`), antes do redirect.
  - _Requirements: 1.1, 1.3_

- [x] 5. Instrumentar `activation` e `lesson_completed`
  - `activation`: primeira atividade concluída (mesmo ponto onde hoje se decide
    mostrar o banner de boas-vindas em `DashboardPage.tsx`).
  - `lesson_completed`: quando uma atividade é marcada completa em `user_progress`.
  - _Requirements: 1.1, 1.3_

- [x] 6. Instrumentar `paywall_hit`
  - Dentro de `FeatureGate.tsx`, quando o gate bloqueia por falta de plano.
  - _Requirements: 1.1, 1.3_

- [x] 7. Instrumentar `upgrade` (server-side)
  - Alterar `activate_subscription_from_intent`: no caminho de ativação,
    INSERT em `landing_events` (kind='upgrade', metadata com plan_slug/kind).
  - _Requirements: 1.1, 1.2_

- [x] 8. Painel "Funil de Conversão" no `/admin`
  - Estender a edge function `admin-dashboard` para incluir `get_funnel_overview`
    na resposta (reaproveita autenticação/autorização existente).
  - Nova seção em `AdminPage.tsx`: contagens por etapa + taxa de conversão entre
    etapas consecutivas; "amostra insuficiente" quando abaixo do N mínimo.
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 9. Gate final e docs
  - `npm run quality` completo.
  - Documentar `landing_events` e `get_funnel_overview` no runbook.
  - Teste manual: inserir eventos, ver painel, confirmar que `anon` não lê a
    tabela direto.
  - _Requirements: todas_

## Notes

- Fora de escopo: correlação por fingerprinting, BI externo (Amplitude/PostHog),
  UTM avançado — podem vir depois como extensão de `metadata`.
- Não altera `purchase_intents`, `notification_outbox`, `guardian_consent_events`,
  `_shared/crisis.ts` (Requirement 4.1).

