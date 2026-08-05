# TRUST-1.0 — BASELINE E CONGELAMENTO

Data: 2026-08-04
Responsável: Kiro (agente)

## Estado Git

| Campo | Valor |
|---|---|
| Remote | `origin` — github.com/minhafelicidadebr/yale-minhafelicidade-julho.git |
| Branch | `main` |
| Commit-base | `7e09493b76782d0b20ea2ed0b93ba6dcdbfa30e5` |
| Working tree | limpa |
| PRs abertos | 0 |
| Branches abertas | 0 |

## Últimos 10 commits

```
7e09493 Merge pull request #45 from minhafelicidadebr/fix-avatar-display
928a1ef fix: profile avatar URL was saved but never rendered as image
4dd5759 Merge pull request #44 from minhafelicidadebr/fix-school-metrics-no-school-id-column
57c51cd fix: get_school_metrics assumed engagement_events had school_id column
c9247f7 Merge pull request #43 from minhafelicidadebr/close-d65-partial-requirements
3110658 feat: close the two partial requirements from D65
a6d37ab Merge pull request #42 from minhafelicidadebr/nav-dedupe-and-dynamic-school
2bfd320 refactor(ux-6): dedupe navigation and resolve school item href dynamically
07f56b1 Merge pull request #41 from minhafelicidadebr/cleanup-dead-hook-and-guard
7ed82b1 refactor: remove dead useOrganization hook + create RequireInstitutionalRole
```

## Migrations (41 arquivos)

Ver `TRUST_1_MIGRATION_LEDGER.md` para classificação individual.

## RPCs referenciadas no código

| RPC | Chamada de | Domínio |
|---|---|---|
| `get_my_profile` | RequireRole, DashboardPage, useDashboardContext | Auth/Perfil |
| `get_my_plan` | useSubscription | Assinatura |
| `get_my_payment_history` | SubscriptionPage | Assinatura |
| `request_subscription_cancellation` | SubscriptionPage | Assinatura |
| `activate_subscription_from_intent` | mp-webhook (server) | Pagamento |
| `run_subscription_lifecycle` | subscription-lifecycle (server) | Pagamento |
| `enforce_ai_usage_limit` | _shared/ai-usage (server) | IA |
| `has_role` | admin-dashboard (server) | Auth |
| `get_learning_progress_overview` | admin-dashboard (server) | Métricas |
| `get_funnel_overview` | admin-dashboard (server) | Métricas |
| `get_org_engagement_summary` | OrgDashboardPage, EngagementMetrics | Métricas |
| `get_operational_metrics` | OperationalMetrics | Métricas |
| `get_school_metrics` | useSchoolMetrics | Métricas escola |
| `invite_member` | OrgDashboardPage, OnboardingWizard | Institucional |
| `accept_invitation` | AcceptInvitePage | Institucional |
| `resend_invitation` | useDecisionActions | Governança |
| `escalate_indicator` | useDecisionActions | Governança |
| `record_guardian_consent` | GuardianConsentPage, AuthPage | Consentimento |
| `get_my_guardian_consent_status` | RequireGuardianConsent | Consentimento |
| `set_my_birth_date` | BirthDateCompletionPage | Perfil |
| `claim_escolar_subscription` | claim-escolar.ts | Assinatura escolar |
| `claim_escolar_with_token` | claim-escolar.ts | Assinatura escolar |

## Scripts de CI/Gate

| Script | Comando | Função |
|---|---|---|
| audit:security | `npm audit --audit-level=critical` | Dependências |
| lint | `eslint . --max-warnings 0` | Qualidade de código |
| typecheck | `tsc --noEmit` | Tipos |
| test | `vitest run` | 301 testes em 24 arquivos |
| build | `vite build` | Produção |
| security:gate | `node scripts/security-gate.mjs` | Invariantes de segurança |
| quality | Executa os 6 acima em sequência | Gate completo |

CI: GitHub Actions (`quality-gate.yml`) — roda em push/PR para main.

## Typecheck — observação crítica

O comando `tsc --noEmit` sem `-p` usa `tsconfig.json` da raiz. Se o `tsconfig.json`
não inclui os arquivos da aplicação (usando `references` para `tsconfig.app.json`),
o typecheck pode estar rodando vazio. **Verificar na TRUST-1.5.**

## Tipos Supabase

Arquivo: `src/integrations/supabase/types.ts`

Observação: várias RPCs usam `as never` cast — indica que os tipos gerados estão
desatualizados em relação às migrations aplicadas. **Risco registrado como P1.**

## Secrets necessários (edge functions)

| Secret | Função que usa | Status |
|---|---|---|
| SUPABASE_URL | Todas | Configurado (infra automática Lovable) |
| SUPABASE_ANON_KEY | auth, admin-dashboard, generate-report | Configurado |
| SUPABASE_SERVICE_ROLE_KEY | service-client, mercadopago | Configurado |
| LOVABLE_API_KEY | aledria-chat, cognitive-mirror, future-self, signature-strengths | Configurado |
| MERCADO_PAGO_ACCESS_TOKEN | mp-create-preference, mp-webhook | Configurado |
| MERCADO_PAGO_WEBHOOK_SECRET | mp-webhook | Configurado |
| PUBLIC_SITE_URL | mp-create-preference, process-notifications | **NÃO CONFIGURADO** |
| RESEND_API_KEY | process-notifications | **NÃO CONFIGURADO** |
| RESEND_FROM_EMAIL | process-notifications | Não configurado (tem fallback) |
| NOTIFICATIONS_TRIGGER_SECRET | subscription-lifecycle, process-notifications | Não verificado |
| RENEWAL_REMINDER_DAYS | subscription-lifecycle | Não verificado (tem fallback) |

## Ambientes disponíveis

| Ambiente | URL | Migrations | Status |
|---|---|---|---|
| Lovable Cloud (produção) | ctjwyybmlwhynherikqy.supabase.co | Aplicadas via SQL Editor | Ativo |
| Staging dedicado | **NÃO EXISTE** | — | Ausente |
| Local (supabase local) | **NÃO CONFIGURADO** | — | Ausente |

**Bloqueio externo:** não existe ambiente de staging separado. Toda aplicação é
direto em produção via SQL Editor. A TRUST-1.7 (prova ponta a ponta) será
limitada a produção com dados de demonstração.

## Testes existentes (24 arquivos, 301 testes)

Ver `TRUST_1_TEST_MATRIX.md`.

## Congelamento

Durante a TRUST-1, NÃO alterar:
- Identidade visual
- Textos comerciais não relacionados a confiança
- Gamificação
- Conteúdo pedagógico
- Landing pages
- Pricing
- Novas métricas
- Novas rotas

Alterações permitidas:
- Correções de segurança, privacidade e integridade
- Reconciliação de migrations
- Testes de confiança
- Documentação da TRUST-1
