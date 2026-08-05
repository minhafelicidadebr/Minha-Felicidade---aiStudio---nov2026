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
| 1 | `20260308005342_d6791b55-*.sql` | Lovable auto | ❓ não verificada |
| 2 | `20260315045203_88a4214f-*.sql` | Lovable auto | ❓ não verificada |
| 3 | `20260412163108_6d72da03-*.sql` | Lovable auto | ❓ não verificada |
| 4 | `20260602003246_592c34b2-*.sql` | Lovable auto | ❓ não verificada |
| 5 | `20260613143000_security_invariants_foundation.sql` | Segurança | 🏗️ canônica, ✅ aplicada |
| 6 | `20260613144818_23ed9044-*.sql` | Assinatura | 🏗️ canônica, ✅ aplicada |
| 7 | `20260613170000_rpc_execute_grants_hardening.sql` | Segurança | 🏗️ canônica, ✅ aplicada |
| 8 | `20260613173000_function_default_privileges_hardening.sql` | Segurança | 🏗️ canônica, ✅ aplicada |
| 9 | `20260613190000_ai_usage_rate_limits.sql` | IA | 🏗️ canônica, ✅ aplicada |
| 10 | `20260614163948_26acc0f9-*.sql` | Lovable auto | ❓ não verificada |
| 11 | `20260706192545_fd2a8387-*.sql` | Lovable auto | ❓ não verificada |
| 12 | `20260706192738_1fe643e7-*.sql` | Lovable auto | ❓ não verificada |
| 13 | `20260706194000_guardian_consent_ledger.sql` | Consentimento | 🏗️ canônica, ✅ aplicada |
| 14 | `20260708120000_purchase_intents.sql` | Pagamento | 🏗️ canônica, ✅ aplicada |
| 15 | `20260708120500_activate_subscription_from_intent.sql` | Pagamento | 🏗️ canônica, ✅ aplicada |
| 16 | `20260709164308_e99a5164-*.sql` | Lovable auto | ❓ não verificada |
| 17 | `20260709164400_209a491b-*.sql` | Lovable auto | ❓ não verificada |
| 18 | `20260710120000_notification_outbox.sql` | Notificações | 🏗️ canônica, ✅ aplicada |
| 19 | `20260710130000_get_my_payment_history.sql` | Pagamento | 🏗️ canônica, ✅ aplicada |
| 20 | `20260710140000_request_subscription_cancellation.sql` | Assinatura | 🏗️ canônica, ✅ aplicada |
| 21 | `20260710150000_activation_enqueue_welcome.sql` | Notificações | 🏗️ canônica, ✅ aplicada |
| 22 | `20260710160000_subscription_lifecycle.sql` | Assinatura | 🏗️ canônica, ✅ aplicada |
| 23 | `20260713140000_payment_history_filter.sql` | Pagamento | 🏗️ canônica, ✅ aplicada |
| 24 | `20260718120000_set_my_birth_date.sql` | Perfil | 🏗️ canônica, ✅ aplicada |
| 25 | `20260718130000_landing_events.sql` | Analytics | 🏗️ canônica, ✅ aplicada |
| 26 | `20260718131000_get_funnel_overview.sql` | Métricas | 🏗️ canônica, ✅ aplicada |
| 27 | `20260718132000_upgrade_event_on_activation.sql` | Assinatura | 🏗️ canônica, ✅ aplicada |
| 28 | `20260718140000_claim_escolar_subscription.sql` | Assinatura escolar | 🏗️ canônica, ✅ aplicada |
| 29 | `20260718150000_escolar_claim_token.sql` | Assinatura escolar | 🏗️ canônica, ✅ aplicada |
| 30 | `20260722190000_drop_org_subscriptions_update_policy.sql` | Segurança | 🏗️ canônica, ✅ aplicada |
| 31 | `20260722200000_ai_limits_from_plan.sql` | IA | 🏗️ canônica, ✅ aplicada |
| 32 | `20260722210000_protect_birth_date_immutable.sql` | Segurança | 🏗️ canônica, ✅ aplicada |
| 33 | `20260722220000_institutional_multitenancy.sql` | Institucional | 🏗️ canônica, ✅ aplicada |
| 34 | `20260722230000_institutional_rpcs.sql` | Institucional | 🏗️ canônica, ✅ aplicada |
| 35 | `20260722240000_operational_metrics.sql` | Métricas | 🏗️ canônica, ✅ aplicada |
| 36 | `20260722250000_demo_tenant_seed.sql` | Dados demo | 🏗️ canônica, ✅ aplicada |
| 37 | `20260725100000_nps_and_engagement_metrics.sql` | Métricas | 🏗️ canônica, ✅ aplicada |
| 38 | `20260725200000_engagement_reminders.sql` | Notificações | 🏗️ canônica, ✅ aplicada |
| 39 | `20260727120000_ux3_school_metrics_and_governance.sql` | Dashboard escola | ⚠️ defeituosa (e.school_id), ✅ aplicada |
| 40 | `20260728194005_f1a02734-*.sql` | Lovable auto | ❓ não verificada |
| 41 | `20260728194702_43fa7f5b-*.sql` | Lovable auto | ❓ não verificada |
| 42 | `20260731100000_fix_school_metrics_no_school_id_column.sql` | Dashboard escola | 🔧 corretiva de #39, ✅ aplicada |

## Observações para TRUST-1.1

1. **9 migrations com UUID** (geradas pelo Lovable): conteúdo não classificado.
   Podem conter tabelas, policies ou funções que o código referencia sem saber.
   Precisam ser lidas e classificadas.
2. **Migration #39 é defeituosa mas está aplicada.** A corretiva #42 sobrepõe a
   função com `CREATE OR REPLACE`, então o banco está correto. Mas a migration
   original permanece no histórico com código errado — confunde quem lê.
3. **Reconciliação ideal:** criar uma migration única que consolide o estado final
   desejado do dashboard escolar, permitindo aplicar em banco limpo.
