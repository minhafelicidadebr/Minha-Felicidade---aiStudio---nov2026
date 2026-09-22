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

### Incidente 2026-07-20: trigger `on_auth_user_created` ausente

Descoberto durante a validação pós-deploy: o projeto `ctjwyybmlwhynherikqy` tinha
a função `handle_new_user()` atualizada, mas **sem o trigger** que a conecta a
`auth.users` (`CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`, definido em
`20260308005342_d6791b55-...sql`). Sem o trigger, todo cadastro novo criava a
conta em `auth.users` mas **nenhuma linha em `profiles`** — o que causava um
loop infinito na tela `/completar-cadastro` (o gate de consentimento nunca
conseguia estabelecer a idade, porque não havia perfil para ler).

Causa provável: esse projeto Supabase recebeu apenas as migrations mais
recentes aplicadas manualmente (a partir de `20260613...`), sem o histórico
completo desde o início do projeto — o trigger é definido na primeira migration
do repositório e nunca foi reaplicado isoladamente.

Correção aplicada manualmente (idempotente, sem migration nova pois só recria
uma peça já especificada em migration existente):

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

Verificação: `SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname =
'on_auth_user_created';` deve retornar 1 linha (`auth.users`). Se este projeto
for recriado do zero, confirmar que **todas** as migrations de
`supabase/migrations/` foram aplicadas em ordem, não apenas as mais recentes —
esse foi o gap real.

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

## Onda UX-3 — Painel escolar, limiar canônico e governança

Migration: `supabase/migrations/20260727120000_ux3_school_metrics_and_governance.sql`
(aplicar por último, após todas as anteriores).

Contrato: `docs/kiro/DASHBOARD_PRODUCT_CONTRACT.md` §D2, §D5–§D8 ·
Privacidade: `docs/kiro/METRIC_PRIVACY_POLICY.md` · Decisões: D50, D53–D56.

- **`metric_minimum_group_size()`** — limiar mínimo canônico (N = 5). Fonte
  **única** do número. Antes desta onda o 5 estava repetido dentro de
  `get_learning_progress_overview` e `get_funnel_overview`; repetir a constante é
  como o limiar se degrada em silêncio. O cliente nunca define nem aplica o
  limiar: só exibe o que a resposta informou.
  Verificação: `SELECT has_function_privilege('anon', 'public.metric_minimum_group_size()', 'EXECUTE');`
  → esperado `false`.
- **`institutional_decision_events`** — ledger append-only de governança
  (§D2/D50). Sem policy de `UPDATE`/`DELETE` para `authenticated`, `REVOKE
  UPDATE, DELETE` explícito e **triggers** `trg_decision_events_no_update` /
  `trg_decision_events_no_delete` que barram mutação até para `service_role`
  (defesa em profundidade — `REVOKE` não alcança `service_role` nem função
  `SECURITY DEFINER` com bug). `reason` é vocabulário fechado por CHECK, não
  texto livre, e o destinatário de convite entra como **hash sha256**, nunca em
  claro: o ledger é lido por qualquer `org_admin`.
  Verificação:
  `SELECT has_table_privilege('authenticated', 'public.institutional_decision_events', 'UPDATE');`
  → esperado `false` (idem para `DELETE`).
- **`can_read_school(uuid)`** — escopo visível derivado de `auth.uid()` e de
  `institutional_memberships` com `status = 'active'`. `school_admin` com
  `school_id` **nulo** não autoriza escola alguma; `org_admin` vale para a
  organização da escola; `platform_admin` vale para qualquer escola. Nenhum
  identificador de organização, escola ou papel enviado pelo cliente participa da
  autorização.
- **`get_school_metrics(uuid, text)`** — indicadores agregados da escola com
  supressão aplicada **no servidor** (§D5–§D7). Um grupo com 1 a 4 participantes
  devolve apenas `{suppressed, reason, minimumGroupSize}` — sem `value`, sem
  `count`, sem porcentagem. Grupo com zero pessoas devolve zero real com marcador
  próprio, porque grupo vazio não expõe ninguém. Escola com universo elegível
  abaixo do limiar mantém `analytics_suppressed = true` e **continua existindo**
  como entidade operacional (§D5/D53). Erro de autorização é **indistinguível**
  de escola inexistente e de sessão ausente, para que a resposta não sirva de
  sonda de quais ids existem. Registra leitura autorizada **e** tentativa negada
  em `data_access_logs`.
  Verificação: `SELECT has_function_privilege('anon', 'public.get_school_metrics(uuid, text)', 'EXECUTE');`
  → esperado `false`.
- **Supressão complementar** (§D6/D54) — com exatamente uma turma suprimida e o
  total divulgado, o valor suprimido é recuperável por subtração (aritmética de
  primeiro grau feita na própria tela). Regra determinística: sobrando duas ou
  mais turmas divulgadas, suprime a menor; sobrando uma só, suprime o total.
  Empate de valor resolve pela chave, para que a mesma entrada dê sempre a mesma
  saída. A mesma regra está espelhada em `src/lib/metric-privacy.ts` para que
  servidor e cliente concordem, com teste comparando os dois.
- **`resend_invitation(uuid)`** — até 3 reenvios além do envio inicial, 24 h de
  intervalo (§D8/D56). A contagem é feita **no ledger, por organização +
  destinatário (hash)**, não na linha do convite: `invite_member` é idempotente
  por `(email, org, role)`, então um contador por linha seria zerado cancelando e
  recriando o convite. Bloqueios também são gravados (`resend_limit_reached`,
  `resend_cooldown`), não só os sucessos.
- **`escalate_indicator(uuid, uuid, text, text)`** — escopo verificado contra o
  banco; alvo em organização diferente é negado **e a negativa é registrada**.
  Escola informada precisa pertencer à organização informada, senão um
  `org_admin` legítimo poderia escalar apontando para escola de outra rede.

> **Ainda não aplicada no ambiente.** Como as anteriores, esta migration precisa
> ser aplicada manualmente no SQL Editor do Lovable. Enquanto não for, o painel
> escolar mostra o estado de erro explícito (não um zero fabricado), porque a
> RPC não existe.

## Quality Gate

Run locally before shipping:

```bash
npm run quality
```

Database tests remain in `supabase/tests/security_invariants.sql` for environments with pgTAP/Supabase CLI and Docker available.

21. `supabase/migrations/20260722190000_drop_org_subscriptions_update_policy.sql` — Drops the `"Owners can update own org subscriptions"` UPDATE policy on `organization_subscriptions`. The owner_id could previously UPDATE any column (plan_id, status, max_seats, current_period_end) directly via PostgREST. All legitimate writes are via SECURITY DEFINER RPCs (activate_subscription_from_intent, claim_escolar_subscription, claim_escolar_subscription_token, subscription_lifecycle, request_subscription_cancellation). No direct client-side UPDATE is required for any supported operation. Idempotent (IF EXISTS).
22. `supabase/migrations/20260722200000_ai_limits_from_plan.sql` — `enforce_ai_usage_limit` now reads `alegria_daily` from the user's resolved plan (`get_my_plan()->'limits'->'alegria_daily'`) instead of a hardcoded 80. Free tier gets 9/day (matches schema + landing); premium (-1) gets unlimited (no counter increment). Other AI functions (cognitive-mirror, future-self, signature-strengths) keep fixed limits (30/20/20) since they are not plan-differentiated in the landing/pricing. Idempotent (CREATE OR REPLACE). REVOKE/GRANT preserved.
23. `supabase/migrations/20260722210000_protect_birth_date_immutable.sql` — Trigger `trg_protect_birth_date` (BEFORE UPDATE on profiles): impede alteração de `birth_date` uma vez preenchida. A policy "Users can update own profile" permitia UPDATE em qualquer coluna, incluindo `birth_date` — um adolescente podia contornar `set_my_birth_date` (single-fill RPC) e alterar a data diretamente via PostgREST, escapando do gate de consentimento. O trigger funciona como defesa em profundidade (inclusive contra service_role acidental). Outras colunas de profiles continuam editáveis normalmente. Idempotente (DROP IF EXISTS + CREATE).
24. `supabase/migrations/20260722220000_institutional_multitenancy.sql` — ONDA 2 multitenancy mínimo: cria `organizations`, `schools`, `classes`, `institutional_memberships`, `institutional_invitations` com RLS (isolamento por tenant via `is_org_member`/`is_org_admin` helpers). Políticas: SELECT só para membros da org; INSERT/UPDATE/DELETE só para org_admin. Invitee pode ver o próprio convite por email confirmado. Sem INSERT policy direto em organizations (criação via RPC futura). REVOKE de PUBLIC/anon em todas. Idempotente (IF NOT EXISTS).
25. `supabase/migrations/20260722230000_institutional_rpcs.sql` — ONDA 2 RPCs institucionais: `create_organization` (cria org + org_admin membership, idempotente), `invite_member` (cria convite com token, valida is_org_admin, enfileira notificação, idempotente), `accept_invitation` (valida token + email confirmado + expiração, cria membership ON CONFLICT, marca convite). Todas SECURITY DEFINER, SET search_path=public, auditadas em data_access_logs. REVOKE de PUBLIC/anon/authenticated + GRANT a authenticated. Estende notification_outbox kind CHECK com 'institutional_invite'.
26. `supabase/migrations/20260722240000_operational_metrics.sql` — ONDA 5 observabilidade: RPC `get_operational_metrics(org_id)` retorna métricas agregadas por organização (membros ativos, convites pendentes, uso de IA hoje/7d, custo estimado, erros 24h). SECURITY DEFINER, valida is_org_admin, auditada. Sem PII. REVOKE de PUBLIC/anon/authenticated + GRANT a authenticated.
27. `supabase/migrations/20260722250000_demo_tenant_seed.sql` — ONDA 3.2 tenant demonstrativo: popula uma organização de DEMONSTRAÇÃO (id fixo, metadata.is_demo=true, nomes com "(DEMONSTRAÇÃO)") com 2 escolas, 3 turmas, 2 educadores + 24 estudantes fictícios (UUIDs sintéticos, sem PII) e 3 convites pendentes. org_admin = conta demo. Idempotente (ON CONFLICT DO NOTHING). Permite demonstrar o painel institucional cheio sem piloto real. `useOrganization` passou a ordenar por created_at desc (mostra a org mais recente de forma determinística).

## Nota de auditoria de dependências (2026-07)

O gate `audit:security` usa `--audit-level=critical`. Contexto honesto:

- Um surto de advisories foi publicado contra `brace-expansion`/`minimatch` (ReDoS) e afeta
  transitivamente o ferramental de **desenvolvimento** (`eslint`, `typescript-eslint`, `glob`).
  `npm audit fix` (não-force) reduziu o volume; o restante ("high") só se resolve com
  `eslint@10` (breaking) — que exige reconfigurar o lint e está fora do escopo do sprint comercial.
- As versões instaladas de `brace-expansion` (1.1.16 e 5.0.8) já estão acima das corrigidas; o
  alerta remanescente é ruído do `npm audit` sobre o lockfile. Esse código roda em **build/lint**,
  não no runtime do site publicado (bundle estático).
- `react-router` 6.x tem 2 advisories **moderate** (open-redirect por backslash — já mitigado pelo
  nosso `getSafeRedirectPath`, testado; e injeção via SSR hydration — não usamos SSR). O fix é
  `react-router-dom@7` (breaking).
- **Zero vulnerabilidades `critical`.** Por isso o gate bloqueia em `critical`.

**Backlog P2 (sessão de manutenção dedicada):** migrar `eslint@9 → 10` e
`react-router-dom@6 → 7`, revalidar lint config e rotas, e voltar o gate para `--audit-level=high`.

## Ordem de aplicação — migrations 28 a 32

Lacuna corrigida na TRUST-1.1B: a lista numerada acima parou em 27 e cinco
migrations aplicadas depois nunca foram registradas aqui. Registradas agora, na
ordem real de aplicação.

28. `supabase/migrations/20260725100000_nps_and_engagement_metrics.sql` — Cria
    `nps_responses` e `engagement_events` com RLS, e as RPCs de leitura agregada.
    **Invariante conhecido em aberto (R02/R11):** as policies de INSERT validam
    apenas `user_id = auth.uid()`, não o `organization_id`, então um usuário pode
    gravar evento ou NPS em organização alheia. Tratamento previsto na TRUST-1.4.
    Idempotente.

29. `supabase/migrations/20260725200000_engagement_reminders.sql` —
    `enqueue_engagement_reminders()`, SECURITY DEFINER, `search_path = public`,
    executável apenas por `service_role`. Enfileira lembretes em
    `notification_outbox`. Idempotente (CREATE OR REPLACE).

30. `supabase/migrations/20260727120000_ux3_school_metrics_and_governance.sql` —
    UX-3: limiar canônico `metric_minimum_group_size()`, ledger append-only
    `institutional_decision_events` (triggers de rejeição de UPDATE/DELETE,
    vocabulário controlado em CHECK, índice parcial de idempotência),
    `can_read_school()`, `get_school_metrics()`, `resend_invitation()`,
    `escalate_indicator()`. Todas SECURITY DEFINER com `search_path = public`,
    REVOKE de PUBLIC/anon + GRANT mínimo.
    **Três defeitos historicamente nesta migration:** (a) `get_school_metrics`
    referenciava `e.school_id`, coluna inexistente — corrigido em #32 abaixo;
    (b) `resend_invitation` chamava `digest()` sem qualificar schema (R20) —
    corrigido em #33; (c) a policy de leitura do ledger foi criada sem
    `GRANT SELECT`, ficando inerte (R21) — **em aberto por decisão de contrato**.
    A migration não é editada: histórico aplicado é imutável.

31. `supabase/migrations/20260728194005_f1a02734-*.sql` e
    `20260728194702_43fa7f5b-*.sql` — **Contaminantes de outro produto.** A
    primeira cria `runtime_gates`, `gate_enabled()`, `compute_cycle_risk()`; a
    segunda os remove e emite `DROP ... IF EXISTS` sobre tabelas que nunca
    pertenceram a este projeto. Verificado em execução na TRUST-1.1B: **nenhum
    objeto residual no estado final** e nenhum objeto do domínio escolar afetado.
    Não reaplicar; não reescrever.

32. `supabase/migrations/20260731100000_fix_school_metrics_no_school_id_column.sql`
    — Corretiva de #30(a). `get_school_metrics` passa a derivar os estudantes da
    escola via `institutional_memberships`, porque `engagement_events` só tem
    `user_id` e `organization_id`. Idempotente (CREATE OR REPLACE).
    **É pré-condição verificada da #33.**

33. `supabase/migrations/20260824120000_trust1_dashboard_os_reconciled.sql` —
    Reconciliação forward-only da TRUST-1.1B. Aplicar **depois** de #32.

    - **§0 Pré-condições, com falha explícita.** Aborta se: `get_school_metrics`
      estiver ausente ou for a versão que referencia `e.school_id`; o ledger não
      existir; os dois triggers append-only não existirem; `metric_minimum_group_size`
      não existir; pgcrypto não estiver instalado.
    - **§1 Correção do R20 (P0).** `resend_invitation` passa a chamar
      `extensions.digest(...)`. O pgcrypto do Supabase mora no schema `extensions`
      e a função é pinada em `SET search_path = public` — a chamada não
      qualificada **nunca resolveu**, em nenhum ambiente. O botão "Reenviar
      convite" nunca funcionou. O `search_path` pinado é preservado; nada mais no
      corpo muda (antiburla de §D56 intacta: 3 reenvios além do inicial, 24h de
      intervalo, contagem por organização + destinatário via hash).
    - **§2 Grants mínimos**, reafirmados de forma idempotente para
      `resend_invitation`, `get_school_metrics`, `escalate_indicator`,
      `can_read_school`, `metric_minimum_group_size`.
    - **§3 Contaminantes:** apenas `RAISE WARNING` se houver resíduo. **Não
      remove nada** — remoção de objeto não inventariado seria destrutiva.

    Forward-only, preservadora de dados, sem `DROP ... CASCADE`, sem criação de
    conta, sem secret. Não redeclara `get_school_metrics` de propósito: o estado
    final já está correto desde #32, e uma terceira cópia de ~200 linhas seria
    dívida, não reconciliação.

    **Não aplicada remotamente.** Provada em banco reconstruído desde zero
    (43 migrations, Supabase local), não contra o estado acumulado do remoto.

    Verificação após aplicar:
    ```sql
    -- correção do R20 presente no corpo aplicado (esperado: true)
    SELECT position('extensions.digest' in pg_get_functiondef(p.oid)) > 0
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'resend_invitation';

    -- grants mínimos (esperado: false | true)
    SELECT has_function_privilege('anon',          'public.resend_invitation(uuid)', 'EXECUTE'),
           has_function_privilege('authenticated', 'public.resend_invitation(uuid)', 'EXECUTE');

    -- pinning preservado (esperado: search_path=public)
    SELECT array_to_string(proconfig, ',') FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'resend_invitation';
    ```

### Reconstrução do banco desde zero

Comprovada na TRUST-1.1B. Duas migrations do histórico precisaram de saneamento
mínimo, com nome e timestamp preservados:

- `20260706192738` — operação de credencial em claro → no-op documentado (R17).
- `20260706192545` — INSERT em `user_roles` com UUID literal de contas de
  `auth.users` → passa a derivar `user_id` por e-mail (R18). Antes disso, o reset
  abortava na 11ª de 42 migrations com SQLSTATE 23503.

Ambiente local (portas 55321-55329 declaradas em `supabase/config.toml` para
conviver com outro projeto Supabase na mesma máquina):

```bash
npx supabase start
npx supabase db reset --local
```

Receipt completo com os 17 testes SQL/RLS executados:
`docs/kiro/trust-1/TRUST_1_1B_LOCAL_RESET_RECEIPT.md`

## Ordem de aplicação — migration 34

34. `supabase/migrations/20260826120000_trust1_5_ledger_read_rpc.sql` —
    TRUST-1.5, fecha o R21. Aplicar **depois** de `20260727120000`.

    - **§0 Pré-condições, com falha explícita.** Aborta se: o ledger
      `institutional_decision_events` não existir; `is_org_admin` não existir;
      `data_access_logs` não existir; ou os dois gatilhos append-only não
      estiverem ambos presentes (esta migration abre um caminho de LEITURA e não
      deve ser aplicada em ledger que perdeu a proteção de escrita).
    - **§1** Remove a policy `"Org admins read decision events"`, que era inerte:
      existia sem `GRANT SELECT`, e em PostgreSQL a RLS **restringe** um
      privilégio existente, não o concede. Reafirma
      `REVOKE SELECT, INSERT, UPDATE, DELETE ... FROM anon, authenticated`.
    - **§2** Cria `get_institutional_decision_events(uuid, integer, integer, integer)`
      como **única** porta de leitura do ledger: `SECURITY DEFINER`,
      `SET search_path = public`, escopo validado por `is_org_admin` contra o
      banco, teto rígido de 100 linhas por página, período máximo de 180 dias,
      ordenação determinística `created_at DESC, id DESC` nos dois níveis
      (subquery da página e agregado do resultado), projeção fechada sem
      `recipient_hash` e sem `idempotency_key`, `metadata` não devolvido cru.
      Negativa idêntica para organização inexistente e fora de escopo, para não
      servir de sonda de existência de tenant.
    - **§3** `REVOKE EXECUTE ... FROM PUBLIC, anon` + `GRANT EXECUTE ... TO authenticated`.

    Forward-only. Preserva dados. Sem `DROP ... CASCADE`. Não concede `SELECT`
    bruto a papel nenhum, inclusive `service_role`.

    **Não aplicada remotamente.** Provada em banco reconstruído desde zero
    (44 migrations, Supabase local) com 15 casos de execução real.

    Verificação após aplicar:
    ```sql
    -- a tabela NÃO é legível diretamente pela API (esperado: false | false)
    SELECT has_table_privilege('anon',          'public.institutional_decision_events', 'SELECT'),
           has_table_privilege('authenticated', 'public.institutional_decision_events', 'SELECT');

    -- a policy inerte não existe mais (esperado: 0)
    SELECT count(*) FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'institutional_decision_events';

    -- a RPC é executável só por authenticated (esperado: false | true)
    SELECT has_function_privilege('anon',          'public.get_institutional_decision_events(uuid, integer, integer, integer)', 'EXECUTE'),
           has_function_privilege('authenticated', 'public.get_institutional_decision_events(uuid, integer, integer, integer)', 'EXECUTE');

    -- gatilhos append-only intactos (esperado: 2)
    SELECT count(*) FROM pg_trigger
     WHERE tgrelid = 'public.institutional_decision_events'::regclass AND NOT tgisinternal;
    ```

### Dois invariantes que NÃO valem hoje — não confie neles

Ambos comprovados em execução na TRUST-1.5. Estão registrados como riscos abertos
porque resolvê-los exige decisão de contrato, não correção mecânica.

**R23 — organização, escola e turma referenciadas pelo ledger não podem ser
apagadas.** As FKs de `institutional_decision_events` são
`organization_id ON DELETE CASCADE` e `school_id`/`class_id ON DELETE SET NULL`.
Qualquer uma dispara escrita na tabela, e os gatilhos append-only rejeitam
escrita — inclusive vinda de `service_role`. O erro que aparece é
`institutional_decision_events is append-only`, o que não deixa óbvio que a causa
foi a FK. Escola sem evento no ledger continua deletável normalmente.

**R24 — `data_access_logs` NÃO registra tentativas negadas.** `get_school_metrics`
e `get_institutional_decision_events` inserem uma linha de negativa antes de
`RAISE EXCEPTION`, e a exceção desfaz o INSERT. Só o caminho de sucesso persiste.
Qualquer relatório de "quem tentou acessar o que não podia" montado sobre essa
tabela está vazio por construção.

### Contrato de tipos ↔ schema

`src/integrations/supabase/types.ts` é **gerado**, nunca editado à mão, e a fonte é
o schema homologado — o banco local reconstruído por replay das migrations:

```bash
npx supabase start
npx supabase gen types typescript --local --schema public > src/integrations/supabase/types.ts
```

Quando o tipo não bate com o uso, a resposta é regerar ou corrigir o schema.
**Nunca** silenciar com `as never`. A TRUST-1.5 removeu seis casts desse tipo que
estavam obsoletos: as RPCs já constavam nos tipos e as muletas nunca foram
retiradas.

O gate de tipos passou a verificar os arquivos reais:

```json
"typecheck": "tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit"
```

Antes era `tsc --noEmit` sobre um `tsconfig.json` com `files: []` e só
`references`, o que compilava **zero arquivo**.

## Ordem de aplicação — migrations TRUST #45 e #46

45. `supabase/migrations/20260828120000_trust1_2_privacy_and_archive.sql` —
    TRUST-1.2. Fecha R10/R23/R27/R28: contrato de arquivamento, supressão do
    universo elegível e do canal de headcount, zero real e proteção do resumo
    organizacional/PDF. `SECURITY DEFINER` com `search_path = public`, grants
    mínimos e sem remoção de dados. Aplicar depois da #44.

46. `supabase/migrations/20260901120000_trust1_2_1_server_analytics_boundary.sql`
    — TRUST-1.2.1. Fecha R31/R32. Remove policies administrativas de SELECT raw
    em NPS/engagement pela semântica de `pg_policies.qual`, preserva self-read e
    `service_role`, cria `get_org_analytics_series(uuid)` e redefine
    `get_org_engagement_summary(uuid)` com `count(DISTINCT user_id)` por
    métrica/bucket. Aplicar depois da #45.

    Verificação após aplicar:
    ```sql
    -- nenhuma policy administrativa raw (esperado: 0)
    SELECT count(*) FROM pg_policies
     WHERE schemaname='public'
       AND tablename IN ('nps_responses','engagement_events')
       AND cmd='SELECT' AND coalesce(qual,'') ~* 'is_org_admin';

    -- grants mínimos da série (esperado: false | true)
    SELECT has_function_privilege('anon',
             'public.get_org_analytics_series(uuid)','EXECUTE'),
           has_function_privilege('authenticated',
             'public.get_org_analytics_series(uuid)','EXECUTE');

    -- pinning (esperado: search_path=public)
    SELECT array_to_string(proconfig, ',') FROM pg_proc p
      JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='get_org_analytics_series';
    ```

As quatro migrations TRUST (#43–#46) continuam **não aplicadas remotamente**.
Antes de qualquer promoção, executar integralmente o checklist read-only do R22.
O replay local pinado em Supabase CLI 2.115.0 aplicou **46/46** desde banco vazio.