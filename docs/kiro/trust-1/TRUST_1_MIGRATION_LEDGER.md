# TRUST-1 — LEDGER DE MIGRATIONS

41 arquivos em `supabase/migrations/`. Classificação por domínio e status.

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
