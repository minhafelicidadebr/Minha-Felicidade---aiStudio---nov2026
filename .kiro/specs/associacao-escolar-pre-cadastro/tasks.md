# Implementation Plan: Associação escolar pré-cadastro (abordagem A)

## Overview

Branch `feat/escolar-claim-association`, nunca direto na `main`. `npm run quality`
verde a cada tarefa. Abordagem A: match por e-mail **confirmado** do próprio
chamador, segura por construção (não depende da config global de confirmação).

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1], "description": "Migration: RPC claim_escolar_subscription" },
    { "wave": 2, "tasks": [2, 3], "description": "Cliente claim-escolar + UI na SubscriptionPage" },
    { "wave": 3, "tasks": [4], "description": "Gate final e docs" }
  ]
}
```

## Tasks

- [x] 1. Migration: RPC `claim_escolar_subscription`
  - `SECURITY DEFINER`, `SET search_path = public`. auth.uid() obrigatório; lê
    email + email_confirmed_at de auth.users; exige email confirmado; acha intent
    escolar `approved`/`user_id NULL`/`lower(contact_email)=lower(email)`; cria
    `organization_subscriptions` (owner=uid, max_seats=seats_students, intervalo);
    concede `manager` via `ON CONFLICT (user_id, role) DO NOTHING`; marca
    `purchase_intents.user_id`; loga em `data_access_logs`. Idempotente.
  - `REVOKE EXECUTE ... FROM PUBLIC, anon` + `GRANT ... TO authenticated`, com a
    query de verificação (`has_function_privilege`) comentada.
  - Adicionar ao fim de `docs/security-invariants-runbook.md`.
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.2a, 2.3, 2.4, 2.5, 3.1, 3.2, 4.1, 4.3_
  - _Properties: 1, 2, 3, 4, 5_

- [x] 2. Cliente `src/lib/claim-escolar.ts` (+ teste)
  - `claimEscolarSubscription()` invoca a RPC (cast `as never`), mapeia a
    resposta para `{ ok, reason, org_name? }`, nunca lança.
  - Teste com mock do client: ok/associated, no_claimable_intent, erro.
  - _Requirements: 1.3, 2.1 · Properties 2_

- [x] 3. UI na `SubscriptionPage.tsx`
  - Card "Assinatura escolar paga antes do cadastro?" com botão "Associar agora"
    → chama `claimEscolarSubscription`, ao ok faz `refetch()` + toast; trata
    `no_claimable_intent` e `email_unconfirmed` com mensagens claras.
  - _Requirements: 1.1, 1.3, 3.1_

- [x] 4. Gate final e docs
  - `npm run quality` completo verde.
  - PENDENTE (humano): aplicar a migration no Supabase `ctjwyybmlwhynherikqy` +
    `NOTIFY pgrst, 'reload schema';` e validar o fluxo em sandbox.
  - _Requirements: 4.4_

## Notes

- Não altera `activate_subscription_from_intent`, `_shared/crisis.ts`,
  `guardian_consent_events`, `ai_usage_limits` nem o preço (Requirement 4.2).
- `organization_subscriptions` continua sem policy de escrita para o cliente;
  criação só pela RPC (Requirement 4.3).
- Follow-up: abordagem B (token) para claim com e-mail diferente.

