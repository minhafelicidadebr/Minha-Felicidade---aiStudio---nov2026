# Security Invariants Runbook

## Current State

The Supabase hardening path is versioned as migrations. Apply them in timestamp order:

1. `supabase/migrations/20260613143000_security_invariants_foundation.sql`
2. `supabase/migrations/20260613144818_23ed9044-2366-4ed2-9e72-c6382bbae4bb.sql`
3. `supabase/migrations/20260613170000_rpc_execute_grants_hardening.sql`
4. `supabase/migrations/20260613173000_function_default_privileges_hardening.sql`
5. `supabase/migrations/20260613190000_ai_usage_rate_limits.sql`
6. `supabase/migrations/20260706194000_guardian_consent_ledger.sql`
7. `supabase/migrations/20260708120000_purchase_intents.sql`
8. `supabase/migrations/20260708120500_activate_subscription_from_intent.sql`
9. `supabase/migrations/20260710120000_notification_outbox.sql`
10. `supabase/migrations/20260710130000_get_my_payment_history.sql`
11. `supabase/migrations/20260710140000_request_subscription_cancellation.sql`
12. `supabase/migrations/20260710150000_activation_enqueue_welcome.sql`
13. `supabase/migrations/20260710160000_subscription_lifecycle.sql`
14. `supabase/migrations/20260713140000_payment_history_filter.sql`
15. `supabase/migrations/20260718120000_set_my_birth_date.sql` — self-scoped, single-fill RPC to let legacy accounts (NULL `birth_date`) supply their birth date once, unblocking the fail-closed consent gate without reopening fail-open.
16. `supabase/migrations/20260718130000_landing_events.sql` — write-only funnel events table (client can INSERT only; no SELECT/UPDATE/DELETE).
17. `supabase/migrations/20260718131000_get_funnel_overview.sql` — aggregate funnel RPC (`SECURITY DEFINER`, teacher/manager only, audited).
18. `supabase/migrations/20260718132000_upgrade_event_on_activation.sql` — reproduces `activate_subscription_from_intent` adding a server-side `upgrade` funnel event.
19. `supabase/migrations/20260718140000_claim_escolar_subscription.sql` — self-scoped RPC that lets a manager claim a paid pre-signup escolar subscription by their **confirmed** email (creates `organization_subscriptions`, grants `manager`, marks the intent).
20. `supabase/migrations/20260718150000_escolar_claim_token.sql` — adds `purchase_intents.claim_token`, RPC `claim_escolar_with_token(uuid)` (claim by code, different email allowed), and extends `notification_outbox.kind` with `escolar_claim`.

The `20260613144818...` migration was generated remotely after the first foundation migration. It is mostly idempotent duplication. The later `20260613170000...` migration is still required because it removes explicit `anon`/`authenticated` EXECUTE grants that are not removed by revoking from `PUBLIC`.

## Manual Validation

When Lovable or local Docker is unavailable, use the Supabase Dashboard SQL Editor:

1. Apply `20260613170000_rpc_execute_grants_hardening.sql` if it is not already applied.
2. Apply `20260613173000_function_default_privileges_hardening.sql`.
3. Apply `20260613190000_ai_usage_rate_limits.sql`.
4. Redeploy the AI Edge Functions: `aledria-chat`, `cognitive-mirror`, `future-self`, and `signature-strengths`.
5. Run `supabase/verification/security_invariants_manual.sql`.
6. Treat any `FAIL` row as a release blocker.

## Expected Invariants

- Legacy user-id RPCs are executable only by `service_role`.
- New self-scoped RPCs are executable by `authenticated`, not `anon` or `PUBLIC`.
- `data_access_logs` exists, has RLS enabled, and has no client grants.
- `user_progress` exposes only self-scoped policies.
- Subscription tables expose no client write policies.
- The aggregate dashboard RPC avoids direct PII fields.
- Safe RPCs are `SECURITY DEFINER` with fixed `search_path=public`.
- Individual progress reports are self-only. Cross-user reporting must use a future tenant-scoped, audited RPC, not direct table reads.
- AI Edge Functions require a valid user JWT and call `enforce_ai_usage_limit()` before the AI gateway.
- `ai_usage_limits` is RLS-locked, has no direct client grants, and is mutated only through the authenticated quota RPC.

### Guardian consent route gate is fail-closed (LGPD art. 14)

`RequireGuardianConsent` (`src/components/routing/RequireGuardianConsent.tsx`) is
a client-side safety net over private routes. Its release decision is delegated
to the pure function `decideGuardianConsentGate`
(`src/lib/guardian-consent.ts`), which only returns `clear` for an explicit,
well-formed, trustworthy `get_my_guardian_consent_status` response. Any
uncertainty fails closed and never renders private content:

- RPC error, invalid/expired session, timeout, or rejected promise → `error_locked`.
- Null/malformed payload (missing `requires_consent`) → `error_locked`.
- Age indeterminate (`reason = unknown_birth_date`) → `error_locked` (age cannot
  be established, so the user is not treated as a released adult).
- Minor without consent, or consent under a superseded `policy_version` → `blocked`
  (redirect to `/consentimento-responsavel`).
- Adult with a known birth date, or minor consented under the current policy → `clear`.

`error_locked` shows an accessible, non-alarmist recovery screen (retry + safe
exit to `/`, focused heading, no private content beneath). This gate is
defense-in-depth on top of RLS.

Legacy accounts created before `birth_date` capture return `reason =
unknown_birth_date`. The decision maps this identifiable, resolvable case to a
distinct state `needs_birth_date` (not the terminal `error_locked`), and the
guard redirects it to `/completar-cadastro`, where the user supplies their birth
date once through the self-scoped RPC `set_my_birth_date`. The guard then
re-evaluates via `get_my_guardian_consent_status` (adult → clear; minor →
`/consentimento-responsavel`). Genuine uncertainty (RPC error, timeout, rejected
promise, malformed payload) still fails closed to `error_locked`.

`set_my_birth_date` (migration `20260718120000_set_my_birth_date.sql`):
`SECURITY DEFINER`, `search_path=public`, self-scoped (`auth.uid()` only),
single-fill (writes only when `profiles.birth_date` is NULL — never overwrites,
so it cannot be used to bypass the gate), server-side plausibility validation,
audited in `data_access_logs`. `REVOKE EXECUTE FROM PUBLIC, anon` +
`GRANT EXECUTE TO authenticated`. It does not touch `guardian_consent_events`
(still INSERT-only). Out of scope: editing an already-set birth date, strong age
assurance, bulk admin backfill.

## Onda 1 — Monetização (Mercado Pago)

### Secrets (configurar no painel do Supabase/Lovable Cloud — NUNCA commitar)

- `MERCADO_PAGO_ACCESS_TOKEN` — token de acesso do MP. Use `TEST-...` em
  sandbox e `APP_USR-...` em produção.
- `MERCADO_PAGO_WEBHOOK_SECRET` — segredo de assinatura do webhook; a
  `mp-webhook` rejeita (401) qualquer notificação sem HMAC válida.
- `PUBLIC_SITE_URL` — URL pública do app (ex.: `https://felicidade.lab`),
  usada para montar as `back_urls` do checkout (`/assinatura/sucesso`,
  `/assinatura/pendente`). Sem ela, `mp-create-preference` falha de forma
  explícita em vez de gerar links quebrados.

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetados pela plataforma nas
edge functions.

### Invariantes de pagamento

- `purchase_intents` é service_role-only (RLS ligada, sem policy de cliente,
  `REVOKE ALL FROM PUBLIC, anon, authenticated`).
- `user_subscriptions`/`organization_subscriptions` continuam sem policy de
  `INSERT`/`UPDATE` para `authenticated`. A ÚNICA escritora do estado de
  assinatura é a RPC `activate_subscription_from_intent`
  (`SECURITY DEFINER`, `EXECUTE` só para `service_role`), chamada apenas pela
  `mp-webhook` após a verificação HMAC e a consulta do pagamento na API do MP.
- Idempotência: índice único parcial em `purchase_intents.mp_payment_id` +
  `SELECT ... FOR UPDATE` na intent. Reentrega da mesma notificação não ativa
  a assinatura duas vezes (Requirement 3.3).
- Exceção auditável de service role: `security-gate.mjs` proíbe referência à
  service role key em TODA fonte de runtime, EXCETO
  `supabase/functions/_shared/mercadopago.ts` (allow-list explícito). Esse
  módulo é obrigado, pelo próprio gate, a colocar junto a verificação HMAC
  (`verifyWebhookSignature`) que justifica o privilégio — privilégio e
  proteção ficam amarrados no mesmo teste. Qualquer novo arquivo que precise
  de service role deve ser adicionado explicitamente ao allow-list e
  justificado.
- Preço nunca vem do cliente: individual lê `subscription_plans` no servidor;
  escolar recalcula com `calculateSchoolPricing` (tabela espelhada 1:1 entre
  `src/lib/school-pricing.ts` e `supabase/functions/_shared/school-pricing.ts`).
- Rate limiting: `mp-create-preference` (pública no fluxo escolar sem JWT) chama
  `assertCheckoutRateLimit` (`_shared/checkout-rate-limit.ts`) antes de criar a
  intent — conta intents recentes do mesmo requisitante (user_id/contact_email)
  numa janela curta e responde 429 ao exceder. O `security-gate.mjs` exige essa
  chamada. É fail-open (erro do contador não bloqueia) e mitiga RUÍDO, não risco
  financeiro (preço sempre resolvido no servidor). Limitação honesta: um abusador
  variando `contact_email` contorna a chave de e-mail — endurecimento por IP/
  captcha fica como follow-up.

### Escopo da v1 (honestidade, não overclaim)

- **Cobrança ÚNICA por ciclo contratado**, não recorrência automática. Não há
  integração com a API de `preapproval` do Mercado Pago nesta onda; a
  renovação é um novo checkout. Não prometer débito automático na UI.
- **Fluxo escolar pré-cadastro (Requirement 2.3):** quando o gestor inicia o
  checkout sem conta, a `activate_subscription_from_intent` marca a intent como
  `approved` mas NÃO cria `organization_subscriptions` (não há `owner_id`
  ainda). A associação organização↔conta após o cadastro do gestor é um passo
  de follow-up ainda NÃO implementado — está registrado como pendência, não
  como recurso completo. O pagamento aprovado fica rastreável em
  `purchase_intents` (status `approved`, `user_id` nulo) para reconciliação.

### Teste em sandbox (pendente de credenciais)

Requer `MERCADO_PAGO_ACCESS_TOKEN` de teste (`TEST-...`) configurado no
ambiente — não é verificável só com `npm run quality`. Roteiro passo-a-passo
(secrets, deploy, cenários e queries de verificação) em
`docs/mercadopago-sandbox-runbook.md`; resumo dos cenários na Task 10 de
`.kiro/specs/onda-1-monetizacao/tasks.md`.

## Onda 1.5 — Pós-compra, E-mail Transacional & Gestão de Assinatura

### Secrets novos (configurar no painel — NUNCA commitar)

- `RESEND_API_KEY` — chave do provedor de e-mail (Resend), usada só pela edge
  function `process-notifications`.
- `RESEND_FROM_EMAIL` — remetente verificado (ex.: `Felicidade.lab <nao-responda@dominio>`).
  Opcional; há um default.
- `NOTIFICATIONS_TRIGGER_SECRET` — segredo que autoriza o acionamento das
  functions worker (`process-notifications`, `subscription-lifecycle`). Elas
  rejeitam (401 "Forbidden") sem o header `x-trigger-secret` correto.
- `RENEWAL_REMINDER_DAYS` — dias de antecedência do lembrete (default 3). Opcional.

### Agendamento (cron)

Configurar no Lovable/Supabase dois disparos agendados, enviando o header
`x-trigger-secret: <NOTIFICATIONS_TRIGGER_SECRET>`:
- `subscription-lifecycle` — 1x/dia (lembretes de renovação + expiração).
- `process-notifications` — frequente (ex.: a cada 5–15 min) para esvaziar a
  fila `notification_outbox`.

### Invariantes (pós-compra)

- `notification_outbox` é service_role-only; idempotência por `dedupe_key UNIQUE`.
- A ativação apenas ENFILEIRA o e-mail de boas-vindas (não envia) — falha de
  e-mail nunca reverte a ativação.
- Cancelamento self-service via RPC `request_subscription_cancellation`
  (`SECURITY DEFINER`, self-scoped, só a assinatura do `auth.uid()`).
- Histórico via RPC `get_my_payment_history` (`SECURITY DEFINER`, self-scoped);
  o cliente nunca lê `purchase_intents` direto.
- **Allow-list de service role ampliado** (mudança de invariante, auditável):
  além de `_shared/mercadopago.ts` (amarrado a HMAC), agora
  `_shared/service-client.ts` está no allow-list — amarrado ao guard
  `assertTriggerSecret` (o gate exige a colocação). As functions worker
  `process-notifications` e `subscription-lifecycle` são obrigadas pelo gate a
  chamar `assertTriggerSecret` (não são públicas).

### Associação escolar pré-cadastro (Req 2.3 da Onda 1)

- `claim_escolar_subscription()` — `SECURITY DEFINER`, `search_path=public`,
  self-scoped, `EXECUTE` só `authenticated`. Resolve e-mail do `auth.uid()` de
  `auth.users` (nunca do cliente) e **exige `email_confirmed_at IS NOT NULL`**
  (segurança por construção — independe da config global de confirmação).
  Associa apenas intents `kind='escolar'`/`status='approved'`/`user_id IS NULL`
  cujo `contact_email` casa (case-insensitive) com o e-mail do chamador. Cria a
  `organization_subscriptions` (idempotente: só se o dono ainda não tiver uma),
  concede `manager` (`ON CONFLICT DO NOTHING`), marca `purchase_intents.user_id`,
  audita em `data_access_logs`. `organization_subscriptions` continua sem policy
  de escrita para o cliente.
- Abordagem B (token) — migration `20260718150000_escolar_claim_token.sql`:
  coluna `purchase_intents.claim_token` (uuid), RPC `claim_escolar_with_token(uuid)`
  (self-scoped, associa por CÓDIGO, permitindo e-mail diferente do checkout — o
  token é a prova de compra), e ampliação do CHECK de `notification_outbox.kind`
  para `escolar_claim`. O `mp-webhook` enfileira o e-mail com o token após a
  ativação pré-cadastro (`reason='approved_pending_association'`), idempotente
  por `dedupe_key='escolar_claim:<mp_payment_id>'`. **Entrega depende do Resend**
  (`RESEND_API_KEY`, pendente): sem ele, o e-mail fica enfileirado (degradação
  graciosa), mas o código de associação pode ser usado assim que entregue.

### Truth & Evidence Registry (claims públicos auditáveis)

- Claims regulados (métricas de efeito, prova social, depoimentos, badges de
  conformidade, licença/afiliação) vivem em `src/content/claims-registry.ts`
  (`ClaimEntry[]`). `src/lib/claims.ts` expõe `validateRegistry` (puro),
  `getClaim` e `getApprovedClaim` — que só trata como aprovado um claim
  `status='approved'` com `source.url|document` e `expiresAt` futuro.
- **Enforcement**: um teste Vitest valida o registro real (`validateRegistry(CLAIMS)`
  = zero erros) e roda no `npm run quality` — um claim aprovado sem prova quebra
  o gate. `security-gate.mjs` exige a presença dos arquivos do registro.
- Fase 1 (esta): inventário dos claims da landing entra como `draft`/`rejected`
  (nenhum `approved`), então nenhum número não comprovado é exibido como fato.
  A landing foi limpa: badge "WCAG 2.2" removido (sem auditoria), "Baseado em
  Yale" → "Inspirado em Yale" (sem endosso), métricas fabricadas ("58%", "87%",
  "23%", "3.401 alunos", "47 instituições") removidas/qualificadas, depoimentos
  rotulados "exemplos ilustrativos".
- Aprovar um claim = trabalho humano de curadoria: mudar `status` para `approved`
  e preencher `source` (+ `expiresAt`). Follow-up: scanner de JSX, CMS governado.

## Onda 2 — Instrumentação (funil de conversão)

- `landing_events` é **write-only para o cliente**: policy de `INSERT` para
  `anon`/`authenticated`, `REVOKE SELECT/UPDATE/DELETE`. Nenhuma leitura direta
  pelo cliente. Sem PII: só `kind` (lista fechada via CHECK), `session_id`
  anônimo, `user_id` opcional e `metadata` jsonb limitado. A allowlist de chaves
  por `kind` é reforçada no cliente (`src/lib/analytics.ts`,
  `sanitizeEventMetadata`, testada).
- Leitura agregada só via `get_funnel_overview(integer)` — `SECURITY DEFINER`,
  `search_path=public`, valida `has_my_role('teacher'|'manager')` internamente
  (lança `insufficient_permissions`/42501 caso contrário), conta sessões
  distintas por `kind`, registra acesso em `data_access_logs`. `REVOKE EXECUTE
  FROM PUBLIC, anon, authenticated` + `GRANT ... TO authenticated`.
- N mínimo (k-anon) aplicado na UI (`AdminPage`): etapas abaixo de `min_sample`
  (5) mostram "amostra insuficiente" em vez do número.
- O evento `upgrade` é emitido **no servidor** (`activate_subscription_from_intent`),
  nunca pelo cliente — a idempotência da ativação garante no máximo um evento.
- `admin-dashboard` inclui `funnel` na resposta (best-effort: se a RPC/tabela
  ainda não existirem, retorna `null` e o painel não quebra).

## Quality Gate

Run locally before shipping:

```bash
npm run quality
```

Database tests remain in `supabase/tests/security_invariants.sql` for environments with pgTAP/Supabase CLI and Docker available.
