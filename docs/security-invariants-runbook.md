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

## Quality Gate

Run locally before shipping:

```bash
npm run quality
```

Database tests remain in `supabase/tests/security_invariants.sql` for environments with pgTAP/Supabase CLI and Docker available.
