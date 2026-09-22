# TRUST-1 — LEDGER DE MIGRATIONS

47 arquivos em `supabase/migrations/`. Classificação por domínio e status.

## Estado corrente — TRUST-1.3 / DB-R29

| # | Migration | Domínio | Classificação |
|---|---|---|---|
| 46 | `20260901120000_trust1_2_1_server_analytics_boundary.sql` | Privacidade / Analytics | **RECONCILED, forward-only, NOT_YET_APPLIED_REMOTELY** |
| 47 | `20260902120000_trust1_3_r29_archived_operational_visibility.sql` | Segurança institucional / Lifecycle | **RECONCILED, forward-only, NOT_YET_APPLIED_REMOTELY** |

A #47 separa autorização operacional de autorização de ciclo de vida. Entidades
`archived`/`suspended` deixam de aparecer em leituras operacionais; o
arquivamento tenant-scoped passa pela RPC `archive_institutional_entity`; e
métricas/analytics negam ancestrais inativos e omitem classes não ativas. O
ledger append-only e as linhas históricas são preservados.

`db reset --local`: **47/47 migrations desde banco vazio**. Contratos archive:
**28/28**; runtime completo aplicável: **93/93**.

### Migrations TRUST pendentes de promoção remota

| # | Migration | Onda |
|---|---|---|
| 43 | `20260824120000_trust1_dashboard_os_reconciled.sql` | 1.1B |
| 44 | `20260826120000_trust1_5_ledger_read_rpc.sql` | 1.5 |
| 45 | `20260828120000_trust1_2_privacy_and_archive.sql` | 1.2 |
| 46 | `20260901120000_trust1_2_1_server_analytics_boundary.sql` | 1.2.1 |
| 47 | `20260902120000_trust1_3_r29_archived_operational_visibility.sql` | 1.3 / DB-R29 |

Nenhuma foi aplicada remotamente. Ordem obrigatória = timestamps; antes de
produção, executar o preflight read-only do R22.

## Legenda de status

| Status | Significado |
|---|---|
| ✅ aplicada | Confirmada no ambiente remoto |
| 🔧 corretiva | Corrige migration anterior |
| ⚠️ defeituosa | Contém erro conhecido (coluna inexistente, lógica errada) |
| ❓ não verificada | Conteúdo não classificado / pode ter sido auto-gerada |
| 🏗️ canônica | Estado final desejado |

## Sequência

| # | Arquivo | Domínio | Classificação |
|---|---|---|---|
| 1 | `20260308005342_d6791b55-*.sql` | Auth / Core | CANONICAL, APPLIED |
| 2 | `20260315045203_88a4214f-*.sql` | Comercial / Leads | CANONICAL, APPLIED |
| 3 | `20260412163108_6d72da03-*.sql` | Assinatura | CANONICAL, APPLIED |
| 4 | `20260602003246_592c34b2-*.sql` | Comercial / Leads | CANONICAL, APPLIED |
| 5 | `20260613143000_security_invariants_foundation.sql` | Segurança | CANONICAL, APPLIED |
| 6 | `20260613144818_23ed9044-*.sql` | Assinatura | CANONICAL, APPLIED |
| 7 | `20260613170000_rpc_execute_grants_hardening.sql` | Segurança | CANONICAL, APPLIED — parcialmente duplicada por #10 |
| 8 | `20260613173000_function_default_privileges_hardening.sql` | Segurança | CANONICAL, APPLIED — parcialmente duplicada por #10 |
| 9 | `20260613190000_ai_usage_rate_limits.sql` | IA | CANONICAL, APPLIED — parcialmente duplicada por #10 |
| 10 | `20260614163948_26acc0f9-*.sql` | Segurança + IA (consolidação) | CANONICAL, APPLIED — consolida #7/#8/#9 com adições |
| 11 | `20260706192545_fd2a8387-*.sql` | Seed / Teste | CANONICAL, APPLIED |
| 12 | `20260706192738_1fe643e7-*.sql` | Seed / Teste | **CONTAMINANT, APPLIED — senha em claro (P0 R17)** |
| 13 | `20260706194000_guardian_consent_ledger.sql` | Consentimento | CANONICAL, APPLIED |
| 14 | `20260708120000_purchase_intents.sql` | Pagamento | CANONICAL, APPLIED |
| 15 | `20260708120500_activate_subscription_from_intent.sql` | Pagamento | CANONICAL, APPLIED |
| 16 | `20260709164308_e99a5164-*.sql` | Segurança / Leads / Assinatura | CANONICAL, APPLIED |
| 17 | `20260709164400_209a491b-*.sql` | Consentimento / Perfil | CANONICAL, APPLIED — duplica parcialmente #13 |
| 18 | `20260710120000_notification_outbox.sql` | Notificações | CANONICAL, APPLIED |
| 19 | `20260710130000_get_my_payment_history.sql` | Pagamento | CANONICAL, APPLIED |
| 20 | `20260710140000_request_subscription_cancellation.sql` | Assinatura | CANONICAL, APPLIED |
| 21 | `20260710150000_activation_enqueue_welcome.sql` | Notificações | CANONICAL, APPLIED |
| 22 | `20260710160000_subscription_lifecycle.sql` | Assinatura | CANONICAL, APPLIED |
| 23 | `20260713140000_payment_history_filter.sql` | Pagamento | CANONICAL, APPLIED |
| 24 | `20260718120000_set_my_birth_date.sql` | Perfil | CANONICAL, APPLIED |
| 25 | `20260718130000_landing_events.sql` | Analytics | CANONICAL, APPLIED |
| 26 | `20260718131000_get_funnel_overview.sql` | Métricas | CANONICAL, APPLIED |
| 27 | `20260718132000_upgrade_event_on_activation.sql` | Assinatura | CANONICAL, APPLIED |
| 28 | `20260718140000_claim_escolar_subscription.sql` | Assinatura escolar | CANONICAL, APPLIED |
| 29 | `20260718150000_escolar_claim_token.sql` | Assinatura escolar | CANONICAL, APPLIED |
| 30 | `20260722190000_drop_org_subscriptions_update_policy.sql` | Segurança | CORRECTIVE (#3 policy), APPLIED |
| 31 | `20260722200000_ai_limits_from_plan.sql` | IA | CORRECTIVE (#9/#10 limites), APPLIED |
| 32 | `20260722210000_protect_birth_date_immutable.sql` | Segurança | CANONICAL, APPLIED |
| 33 | `20260722220000_institutional_multitenancy.sql` | Institucional | CANONICAL, APPLIED |
| 34 | `20260722230000_institutional_rpcs.sql` | Institucional | CANONICAL, APPLIED |
| 35 | `20260722240000_operational_metrics.sql` | Métricas | CANONICAL, APPLIED |
| 36 | `20260722250000_demo_tenant_seed.sql` | Dados demo | CANONICAL, APPLIED |
| 37 | `20260725100000_nps_and_engagement_metrics.sql` | Métricas | CANONICAL, APPLIED |
| 38 | `20260725200000_engagement_reminders.sql` | Notificações | CANONICAL, APPLIED |
| 39 | `20260727120000_ux3_school_metrics_and_governance.sql` | Dashboard escola | **DEFECTIVE (e.school_id), APPLIED, REQUIRES_RECONCILIATION** |
| 40 | `20260728194005_f1a02734-*.sql` | **Outro produto** (risco corporativo) | **CONTAMINANT, APPLIED** |
| 41 | `20260728194702_43fa7f5b-*.sql` | Limpeza de contaminante | CORRECTIVE (#40), DESTRUCTIVE, APPLIED |
| 42 | `20260731100000_fix_school_metrics_no_school_id_column.sql` | Dashboard escola | CORRECTIVE (#39), APPLIED |

## Observações para TRUST-1.1

1. **9 migrations com UUID** (geradas pelo Lovable): conteúdo não classificado.
   Podem conter tabelas, policies ou funções que o código referencia sem saber.
   Precisam ser lidas e classificadas.
2. **Migration #39 é defeituosa mas está aplicada.** A corretiva #42 sobrepõe a
   função com `CREATE OR REPLACE`, então o banco está correto. Mas a migration
   original permanece no histórico com código errado — confunde quem lê.
3. **Reconciliação ideal:** criar uma migration única que consolide o estado final
   desejado do dashboard escolar, permitindo aplicar em banco limpo.

---

## Atualização TRUST-1.1B — ensaio de reconstrução concluído

As 42 migrations foram **executadas** em banco vazio (Supabase local). Isso muda
o status de várias entradas: classificar é diferente de provar.

### Correções aplicadas ao histórico (nome e timestamp preservados)

| # | Migration | Mudança | Motivo |
|---|---|---|---|
| 11 | `20260706192545_fd2a8387-*.sql` | INSERT em `user_roles` passou a derivar `user_id` de `auth.users` por e-mail, em vez de usar UUID literal | **Bloqueava a reconstrução** (SQLSTATE 23503 na FK). R18. Único ponto de falha em 42 migrations. |
| 12 | `20260706192738_1fe643e7-*.sql` | Operação de credencial → no-op documentado | R17 (sessão anterior) |

Nenhuma outra migration foi editada. As duas mudanças acima são as exceções
previstas pelo protocolo (saneamento de secret e desbloqueio de reconstrução),
ambas com nome e timestamp intactos.

### Nova migration

| # | Migration | Domínio | Classificação |
|---|---|---|---|
| 43 | `20260824120000_trust1_dashboard_os_reconciled.sql` | Dashboard OS | **RECONCILED, forward-only, NOT_YET_APPLIED_REMOTELY** |

Conteúdo: pré-condições que abortam diante de estado incompatível; correção do
R20 (`digest` → `extensions.digest` em `resend_invitation`); reafirmação dos
grants mínimos; verificação (sem remoção) de resíduo de contaminante.

### Reclassificações

| # | Migration | Antes | Depois |
|---|---|---|---|
| 39 | `20260727120000_ux3_*` | DEFECTIVE, REQUIRES_RECONCILIATION | **DEFECTIVE, APPLIED, RECONCILED** — estado final correto; a reconciliada aborta se a versão defeituosa estiver aplicada. Além do `e.school_id`, esta migration também trouxe o R20 (`digest` sem schema) e o R21 (policy sem grant). |
| 40 | `20260728194005_f1a02734-*` | CONTAMINANT, APPLIED | **CONTAMINANT, NEUTRALIZED** — nenhum objeto seu sobrevive ao estado final |
| 41 | `20260728194702_43fa7f5b-*` | CORRECTIVE, DESTRUCTIVE | **CORRECTIVE, DESTRUCTIVE, VERIFIED_SAFE** — todos os alvos são de outro produto ou criados por #40; domínio escolar intacto |
| 36 | `20260722250000_demo_tenant_seed` | risco suspeito de FK | **SAFE** — tabelas institucionais não referenciam `auth.users`, por design |
| 10, 12, 17 | `20260614163948`, `20260613*`, `20260709164400` | duplicação suspeita | **SAFE** — idempotência comprovada em execução |

### Observações da nota original, revisadas

1. **9 migrations com UUID:** todas classificadas na 1.1A e agora **provadas
   aplicáveis** em sequência desde zero.
2. **#39 defeituosa mas aplicada:** permanece no histórico com o código errado,
   por imutabilidade. A confusão para quem lê é mitigada pelo comentário de
   pré-condição da #43, que nomeia o problema e aborta se ele estiver presente.
3. **Reconciliação ideal:** feita como #43, e deliberadamente **mínima** — não
   consolida o estado inteiro do dashboard, porque redeclarar ~200 linhas de
   `get_school_metrics` já correta criaria uma terceira cópia a manter.

---

## Atualização TRUST-1.5

| # | Migration | Domínio | Classificação |
|---|---|---|---|
| 44 | `20260826120000_trust1_5_ledger_read_rpc.sql` | Governança / Dashboard OS | **RECONCILED, forward-only, NOT_YET_APPLIED_REMOTELY** |

Fecha o R21. Remove a policy inerte `"Org admins read decision events"`, reafirma
a ausência de DML para `anon`/`authenticated` na tabela do ledger, e cria
`get_institutional_decision_events(uuid, integer, integer, integer)` como única
porta de leitura.

Procedência: partiu de um candidato não commitado encontrado na árvore ao final da
TRUST-1.1B, preservado com hash SHA-256 verificado
(`F5E890B5CCA2E01C7A54C722D6BBAB40483F3065E64DEFC5D248CB5D703E8A8B`) e tratado
como ponto de partida, não como fonte de verdade. Alterado em quatro pontos:
determinismo do agregado, pré-condições ampliadas, timestamp real, e comentário
explícito sobre o R24.

Pré-condições que abortam a migration: ledger ausente, `is_org_admin` ausente,
`data_access_logs` ausente, ou gatilhos append-only incompletos.

`db reset --local`: **44/44 migrations desde banco vazio.**

### Achados de execução que envolvem migrations anteriores

| Migration | Achado |
|---|---|
| `20260727120000_ux3_*` | **R23** — as FKs do ledger (`ON DELETE CASCADE` / `ON DELETE SET NULL`) são incompatíveis com os próprios gatilhos append-only: deletar organização, escola ou turma referenciada falha para qualquer papel, inclusive `service_role`. |
| `20260727120000_ux3_*` | **R24** — a auditoria da negativa em `get_school_metrics` nunca persiste: o `RAISE EXCEPTION` desfaz o INSERT em `data_access_logs`. |

Nenhuma das duas foi alterada: ambas exigem decisão de contrato. Ver o registro
de riscos.

---

## Atualização da MACRO-ONDA D

| # | Migration | Domínio | Classificação |
|---|---|---|---|
| 45 | `20260828120000_trust1_2_privacy_and_archive.sql` | Privacidade + Governança | **RECONCILED, forward-only, NOT_YET_APPLIED_REMOTELY** |

Cinco seções, todas motivadas por achado comprovado em execução:

- **§1 (R23)** `status` em `schools` e `classes` espelhando `organizations`;
  gatilho `BEFORE DELETE` nas três tabelas devolvendo erro de domínio
  (`ERRCODE 23001`) que aponta o arquivamento. A função é `SECURITY DEFINER` —
  necessário porque desde a TRUST-1.5 nem `authenticated` nem `service_role` têm
  `SELECT` no ledger; um gatilho `INVOKER` falharia com `permission denied`, que é
  o tipo de erro obscuro que a função existe para eliminar.
- **§2 (R10)** `eligible_universe` deixou de ser inteiro cru e passou a
  `MetricGroup`.
- **§3 (R10/D6)** proteção complementar do **canal de headcount**, novo.
- **§4 (R28)** universo zero deixou de ser tratado como amostra insuficiente.
- **§5 (R27)** `get_org_engagement_summary` passou a aplicar o limiar. Antes não
  aplicava nenhum: devolvia contagens cruas e o bloco inteiro de NPS, alimentando
  o painel **e** o PDF do relatório piloto.

Pré-condições que abortam: ledger ausente, `schools`/`classes` ausentes,
`metric_minimum_group_size` ausente, ou `get_school_metrics` aplicada sendo a
versão que referencia `e.school_id`.

`db reset --local`: **45/45 migrations desde banco vazio.**

Nenhum `DROP ... CASCADE`. Nenhuma linha de dado removida. O único DDL destrutivo
é `DROP TRIGGER IF EXISTS` sobre os gatilhos que a própria migration recria.

### Migrations TRUST pendentes de promoção

Três, todas provadas em banco reconstruído desde zero e **nenhuma** aplicada
remotamente:

| # | Migration | Onda |
|---|---|---|
| 43 | `20260824120000_trust1_dashboard_os_reconciled.sql` | 1.1B |
| 44 | `20260826120000_trust1_5_ledger_read_rpc.sql` | 1.5 |
| 45 | `20260828120000_trust1_2_privacy_and_archive.sql` | 1.2 |

Ordem de aplicação é a ordem dos timestamps. O checklist read-only de preflight
está em `TRUST_1_R22_PREFLIGHT_CHECKLIST.md` e **não foi executado**.


---

## Atualização TRUST-1.3 / DB-R29

| # | Migration | Domínio | Classificação |
|---|---|---|---|
| 47 | `20260902120000_trust1_3_r29_archived_operational_visibility.sql` | Segurança institucional / Lifecycle | **RECONCILED, forward-only, NOT_YET_APPLIED_REMOTELY** |

A #47 fecha a frente DB/R29 sem editar o histórico:

- `organizations`, `schools` e `classes` `archived`/`suspended` não aparecem em
  SELECT operacional de `authenticated`; policies `FOR ALL` administrativas não
  sobrevivem no estado final.
- `is_org_admin`/`is_org_member` exigem organization active. O helper separado
  `is_org_lifecycle_admin` autoriza a RPC tenant-scoped
  `archive_institutional_entity(text, uuid)` sem reabrir SELECT de archived.
- `can_read_school` exige organization e school active. `get_school_metrics`
  nega ancestrais inativos e filtra classes não active por wrapper fino sobre a
  implementação TRUST-1.2 preservada, evitando outra cópia do corpo grande.
- `get_org_analytics_series` e `get_org_engagement_summary` negam organization
  inativa pela redefinição reutilizada de `is_org_admin`; seus corpos não foram
  duplicados.
- Ledger, FKs e eventos históricos permanecem intactos. Nenhum `DROP ...
  CASCADE`, remoção de linha ou aplicação remota.
- Funções `SECURITY DEFINER` novas/substituídas usam `SET search_path = public`,
  `REVOKE`/`GRANT` explícitos e queries `has_function_privilege` documentadas.

Validação local: Supabase CLI 2.116.0, `db reset --local` **47/47**; archive
**28/28**; RPC **30/30**; privacy **23/23**; server analytics **12/12**; total
runtime aplicável **93/93**.

## Nota — reconciliação pós-rebase TRUST-1.3 (2026-09-09)

Rebase de `trust-1.3-context-isolation` sobre `origin/main` não introduziu
migration nova (nenhum arquivo em `supabase/migrations/` veio do upstream).
`db reset --local` pós-rebase confirmou os mesmos **47/47** desde banco vazio,
incluindo a #47 (R29). O que precisou de reconciliação foi
`src/integrations/supabase/types.ts` — artefato gerado, não migration — que o
upstream tinha regenerado contra schema remoto desatualizado. Ver
`TRUST_1_3_UPSTREAM_TYPES_DRIFT_RECEIPT.md` para a análise completa e o gate de
CI adicionado para detectar essa classe de drift automaticamente.

## Atualização TRUST-1.4 / DB-R02, R11

| # | Migration | Domínio | Classificação |
|---|---|---|---|
| 48 | `20260909120000_trust1_4_tenant_safe_writes.sql` | Segurança de escrita / Integridade institucional | **RECONCILED, forward-only, NOT_YET_APPLIED_REMOTELY** |

A #48 fecha a frente de escrita deixada aberta pela #37/#28
(`20260725100000_nps_and_engagement_metrics.sql`), sem editar o histórico:

- `record_engagement_event(uuid, text, jsonb)` e
  `submit_nps_response(smallint, uuid, text, text)`, ambas `SECURITY DEFINER`
  com `search_path = public`, resolvem `auth.uid()` internamente — `user_id`
  nunca é parâmetro aceito do chamador — e validam `is_org_member(_organization_id)`
  antes de gravar. Reuso direto do helper hardened pela R29: organização
  archived/suspended e membership inativa já são negadas sem duplicar lógica.
- `organization_id` nulo permanece aceito (uso individual sem organização);
  usuário com múltiplas memberships continua podendo escrever em qualquer
  organização de que seja membro ativo.
- `score`/`event_type`/`context` continuam validados pelos `CHECK` constraints
  originais da tabela — não duplicados na RPC. `metadata`/`feedback` recebem
  limite de tamanho na própria RPC (defesa em profundidade contra chamador que
  ignore o filtro client-side).
- As duas policies de INSERT originais (`"Users can log own engagement"`,
  `"Users can submit own NPS"`) são removidas e `REVOKE INSERT` explícito é
  aplicado a `authenticated` nas duas tabelas — o INSERT direto client-side
  deixa de ser um caminho possível, não só indesejado.
- Nenhum `DROP ... CASCADE`, remoção de linha, nem aplicação remota. SELECT
  (self-read) não é alterado.

RED comprovado contra Postgres local antes da migration: membro de uma
organização inseria com sucesso `organization_id` de organização alheia nas
duas tabelas (linha persistida e devolvida por `RETURNING`). `user_id` spoof já
estava bloqueado pela policy original — só `organization_id` era vulnerável.

Validação local: Supabase CLI 2.115.0, `db reset --local` **48/48**;
`input-integrity-runtime-contract.test.ts` **28/28** (cross-tenant engagement,
cross-tenant NPS, archived org, org inexistente, sem membership, INSERT direto
fechado, threshold poisoning 4→5); total runtime aplicável **121/121**
(93 herdados da TRUST-1.3 + 28 novos).

Frontend migrado na mesma onda: `src/lib/engagement.ts` e
`src/components/NpsSurvey.tsx` passaram de `.insert()` direto para as RPCs.
Guard estático em `trust1-4-static-guards.test.ts` impede regressão para
INSERT direto em código de aplicação.


## Atualização TRUST-1.6 / DB-R06

| # | Migration | Domínio | Classificação |
|---|---|---|---|
| 49 | `20260916120000_trust1_6_verifiable_guardian_consent.sql` | Consentimento parental / Cadeia de evidência | **RECONCILED, forward-only, NOT_YET_APPLIED_REMOTELY** |

A #49 fecha R06 sem editar o histórico:

- Duas tabelas novas: `guardian_consent_policies` (versão vigente do termo +
  hash do texto apresentado + flag de reconsentimento; uma linha ativa por
  vez) e `guardian_consent_requests` (request de canal, `token_hash` único,
  one-time, `pending`/`consumed`/`expired`/`superseded`). Nenhuma delas tem
  policy de INSERT/UPDATE/DELETE para `authenticated` — escrita só via RPC.
- `guardian_consent_events` (existente desde `20260706194000`) é **estendida,
  não substituída**: `decision` passa a aceitar `declined`/`revoked` além de
  `granted`; novas colunas `request_id` e `assurance_level`
  (`self_declared`/`channel_verified`); removida a
  `UNIQUE(user_id, policy_version)` original, incompatível com múltiplos
  eventos por usuário/versão ao longo do tempo. Linhas antigas preservadas
  sem edição, por doutrina de ledger imutável.
- Sete RPCs novas/reescritas, todas `SECURITY DEFINER` com
  `search_path = public` e `REVOKE`/`GRANT` explícitos:
  `get_current_guardian_consent_policy`, `create_guardian_consent_request`,
  `resolve_guardian_consent_token`, `decide_guardian_consent`,
  `revoke_guardian_consent`, `get_my_guardian_consent_status` (v2),
  `has_valid_guardian_consent` (novo boundary, `service_role` apenas).
- `enforce_ai_usage_limit` (existente desde `20260722200000`) reescrita
  preservando **integralmente** a lógica original de limite por plano;
  adiciona apenas a checagem de `has_valid_guardian_consent` no topo, antes
  de qualquer contagem de cota. Contrato das 4 edge functions de IA que a
  chamam não muda.
- Token: `pgcrypto` (`gen_random_bytes` + `digest`), mesma primitiva já
  homologada no projeto (`institutional_invitations.token`,
  `purchase_intents.claim_token`). Só o hash é persistido; o bruto existe
  transitoriamente em `notification_outbox.payload`.
- `notification_outbox_kind_check` estendido com `'guardian_consent_request'`.
- Nenhum `DROP ... CASCADE`, remoção de linha, nem aplicação remota. SELECT
  de `record_guardian_consent` (histórico) não é alterado.

RED comprovado contra Postgres local antes da migration: estudante concedeu
consentimento a si mesmo com responsável fabricado, RPC antiga devolveu
`granted = true`.

Validação local: Supabase CLI 2.115.0, `db reset --local` **49/49**;
`guardian-consent-runtime-contract.test.ts` **35/35** (request≠receipt,
token one-time/replay/expiração/superseded/aleatório/nulo/vocabulário,
corrida atômica, grant/decline/revoke, versionamento, autoridade do
servidor, isolamento RLS, disciplina SECURITY DEFINER);
`trust1-6-static-guards.test.ts` **7/7**; total runtime aplicável **163/163**
(121 herdados de TRUST-1.2/1.2.1/1.3/1.4 + 35 novos + 7 guards estáticos).

Frontend migrado na mesma onda: `AuthPage.tsx` (envia request em vez de
gravar consentimento direto), `GuardianConsentPage.tsx` reescrita (visto pelo
estudante: cria/reenvia request, mostra pending/declined/reconsent_required,
nunca grava consentimento), `GuardianDecisionPage.tsx` nova (visto pelo
responsável via token, sem sessão, ação positiva explícita), `ProfilePage.tsx`
(status + revogação condicional). Rota `/autorizacao-responsavel` registrada
em `App.tsx` fora de `<RequireAuth>`.

Achado fora do escopo, registrado como R33: `invite_member`/
`resend_invitation` referenciam colunas inexistentes (`body_html`,
`metadata`) em `notification_outbox`; erro engolido por
`EXCEPTION WHEN OTHERS`. Não corrigido nesta onda. Ver
`TRUST_1_RISK_REGISTER.md` e `TRUST_1_6_GATE.md`.
