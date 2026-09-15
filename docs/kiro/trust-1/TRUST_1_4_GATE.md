# TRUST-1.4 — GATE: INPUT INTEGRITY / TENANT-SAFE WRITES

**Status:** ✅ gate local aprovado. Produção intocada.

Sem secrets, credenciais ou dados pessoais.

## R02 — engagement_events

**Before.** A policy `"Users can log own engagement"` (criada em
`20260725100000_nps_and_engagement_metrics.sql`) validava apenas
`WITH CHECK (user_id = auth.uid())`. `organization_id` chegava inteiramente do
payload do cliente, sem nenhuma verificação de membership.

**Attack.** Usuário autenticado, membro apenas de `ORG_A`, insere direto via
PostgREST com `organization_id = ORG_B` (organização de que nunca foi membro).
Reproduzido manualmente contra Postgres local antes de qualquer correção: o
`INSERT` teve sucesso, `RETURNING organization_id` devolveu `ORG_B` (revertido
só porque o teste manual usou `ROLLBACK` de propósito, para não persistir).

**Fix.** RPC `record_engagement_event(_organization_id uuid, _event_type text,
_metadata jsonb)`, `SECURITY DEFINER`, `SET search_path = public`. Resolve
`auth.uid()` internamente — a assinatura não tem parâmetro de `user_id`.
Valida `is_org_member(_organization_id)` quando `_organization_id` não é nulo
— o mesmo helper que a R29 já hardened contra membership inativa e organização
archived/suspended. `INSERT` direto client-side foi revogado
(`REVOKE INSERT ... FROM authenticated` + `DROP POLICY`).

**Evidence.** `src/lib/input-integrity-runtime-contract.test.ts`, suite
"TRUST-1.4 / R02 — record_engagement_event é tenant-safe" (10 testes) +
suite "TRUST-1.4 — direct INSERT client-side está fechado" (6 testes).

**Status.** ✅ **CLOSED.**

## R11 — nps_responses

**Before.** A policy `"Users can submit own NPS"` (mesma migration) tinha a
mesma lacuna: só validava `user_id = auth.uid()`.

**Attack.** Mesmo vetor: membro de `ORG_A` insere `nps_responses` com
`organization_id = ORG_B`. Reproduzido manualmente contra Postgres local:
sucesso, `RETURNING organization_id` devolveu `ORG_B`.

**Fix.** RPC `submit_nps_response(_score smallint, _organization_id uuid,
_feedback text, _context text)`, mesma forma: `SECURITY DEFINER`,
`auth.uid()` interno, `is_org_member` quando organização é declarada. `score`
continua validado pelo `CHECK` original da tabela (0–10), não duplicado na
RPC. `INSERT` direto revogado.

**Evidence.** Mesma suite, "TRUST-1.4 / R11 — submit_nps_response é
tenant-safe" (8 testes).

**Status.** ✅ **CLOSED.**

## Rebase / baseline

- Branch: `trust-1.4-input-integrity`, criada a partir de `origin/main`
  (`6ec78bc45768957eafb4dd852c8f391cf43173e5` — merge da PR #53/TRUST-1.3).
- `git log HEAD..origin/main` no início da onda: vazio (apenas o próprio merge
  commit da TRUST-1.3). Classificação: `NO_OVERLAP`. Nenhuma sincronização
  adicional necessária.

## Arquitetura — decisão

Quatro alternativas avaliadas (RLS reforçado / RPC `SECURITY INVOKER` / RPC
`SECURITY DEFINER` / Edge Function gateway). Escolhida: **RPC `SECURITY
DEFINER`**, por ser a forma já provada e usada no projeto
(`escalate_indicator`, `invite_member`, `archive_institutional_entity`) — reduz
custo de migração, reusa `is_org_member` (que já resolve R29), fecha o `INSERT`
direto como única porta de bypass possível, e não introduz superfície nova
(rede, secrets, timeout) que uma Edge Function exigiria sem necessidade.

## DB

- Migration: `supabase/migrations/20260909120000_trust1_4_tenant_safe_writes.sql`.
- RLS: as duas policies de INSERT originais foram removidas (`DROP POLICY`).
  SELECT (self-read) intocado.
- RPCs: `record_engagement_event`, `submit_nps_response` — `SECURITY DEFINER`,
  `search_path = public`, `REVOKE ... FROM PUBLIC, anon`, `GRANT ... TO
  authenticated`.
- Grants: `REVOKE INSERT ON TABLE engagement_events, nps_responses FROM
  authenticated` — o bypass por `INSERT` direto é negado por privilégio de
  tabela, não só por RLS.

## Frontend

- `src/lib/engagement.ts` — `trackEngagement()` chama
  `supabase.rpc("record_engagement_event", ...)`. `getOrgId()` continua
  resolvendo a organização candidata client-side, mas isso é só a intenção
  declarada — a RPC revalida no servidor.
- `src/components/NpsSurvey.tsx` — `handleSubmit()` chama
  `supabase.rpc("submit_nps_response", ...)`.
- `src/hooks/useNpsTrigger.ts` — inalterado (só faz `SELECT` do próprio
  `user_id`, policy de self-read não foi tocada).
- Guard estático: `src/lib/trust1-4-static-guards.test.ts` (4 testes) — nenhum
  código de aplicação chama `.insert()`/`.upsert()` nas duas tabelas; ambos os
  consumidores usam as RPCs; a migration não expõe `user_id` como parâmetro.

## Data poisoning — ataques provados bloqueados

Todos em execução real contra Postgres local, não mock:

| Ataque | Resultado |
|---|---|
| Cross-tenant engagement poisoning | `Organization not available for this account` (42501) |
| Cross-tenant NPS poisoning | `Organization not available for this account` (42501) |
| User identity spoof | Já bloqueado antes desta onda (RLS `user_id = auth.uid()` original); confirmado que as novas RPCs nem aceitam `user_id` como parâmetro |
| Archived tenant write | Negado — integra R29 via `is_org_member`, sem duplicar checagem |
| Threshold poisoning (4→5 via organização alheia) | Bloqueado antes de qualquer `INSERT`; organização permanece com 4 contribuidores distintos e `nps_count` continua `null` (suprimido) |

Preservado sem regressão: contributor distinctness (TRUST-1.2.1) — múltiplas
respostas do mesmo `auth.uid()` continuam contando como 1 contribuidor, não
retestado nesta onda porque a lógica de leitura não foi tocada; confirmado por
inspeção que `count(DISTINCT user_id)` nas RPCs de leitura permanece intacto.

## Schema

- Replay: `npx supabase db reset --local` → **48/48 migrations desde banco
  vazio** (Supabase CLI 2.115.0, portas locais do `config.toml`, sem
  `--linked`).
- Types: `src/integrations/supabase/types.ts` regenerado do schema local
  reconstruído (`npx supabase gen types typescript --local --schema public`).
  Confirmado que `record_engagement_event`/`submit_nps_response` aparecem
  tipadas. Nenhum `as any`/`as never`/`@ts-ignore`/`@ts-expect-error`
  introduzido.

## Tests

- Runtime contracts novos: `src/lib/input-integrity-runtime-contract.test.ts`
  — **28/28**, 0 skips.
- Guards estáticos novos: `src/lib/trust1-4-static-guards.test.ts` — **4/4**.
- Runtime contracts herdados (TRUST-1.2/1.2.1/1.3): **93/93**, 0 skips.
- Total runtime aplicável: **121/121**.
- Suíte geral: **475/475** em 38 arquivos.

## CI

- `quality` (lint, typecheck, test, build, security:gate): verde local, exit 0
  em `npm run quality`.
- `runtime-db` (migrations desde zero + gate de types drift + runtime
  contracts, mínimo 90): job existente reaproveitado, sem workflow paralelo.
  O limiar mínimo de contratos (`90`) permanece válido — 121 executados é
  maior que o baseline.

## Git

- Branch: `trust-1.4-input-integrity`.
- Migration: `20260909120000_trust1_4_tenant_safe_writes.sql`.
- PR: `trust-1.4: enforce tenant-safe institutional writes` (aberta após este
  receipt).

## Riscos

| # | Status |
|---|---|
| R02 | ✅ **CLOSED** |
| R11 | ✅ **CLOSED** |
| R22 | 🔴 **OPEN / REQUIRED_BEFORE_PRODUCTION** — inalterado, nenhuma migration TRUST promovida remotamente nesta onda |
| R06 | Inalterado — `TRUST-1.6` |
| R26 | Inalterado — hardening backlog |

## O que este documento NÃO prova

Que o schema remoto de produção recebeu a migration #48. Nenhum `db push`,
`--linked`, `--db-url` remoto ou SQL Editor de produção foi usado. R22
continua exigindo o preflight read-only descrito em
`TRUST_1_R22_PREFLIGHT_CHECKLIST.md` antes de qualquer promoção remota.
