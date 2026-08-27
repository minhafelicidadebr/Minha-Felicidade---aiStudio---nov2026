# TRUST-1.1A — Inventário do Schema Remoto

Data: 2026-08-04
Commit-base: `c4c76e3` (main com PR #46 mergeado)
Projeto Supabase: `ctjwyybmlwhynherikqy`

## Método de verificação

O projeto não tem `supabase` CLI autenticada nem ambiente de staging. O inventário
abaixo é **inferido** da combinação de:

1. Arquivos de migration locais (42 arquivos)
2. Confirmação manual de aplicação pelo humano (SQL Editor)
3. Evidência de runtime (erro `e.school_id does not exist` + correção aplicada)
4. Operação observável (login funciona, dashboard mostra dados, convites funcionam)

**Limitação declarada:** sem `supabase_migrations.schema_migrations` consultável
diretamente, não há PROVA de que TODAS as 42 migrations foram aplicadas. A
evidência de runtime confirma que as fundacionais (profiles, user_roles,
subscription_plans, organizations, schools, etc.) estão no lugar.

## Tabelas confirmadas por uso em runtime

| Tabela | Confirmação |
|---|---|
| `profiles` | Login funciona, perfil exibe nome |
| `user_roles` | RequireRole funciona |
| `user_progress` | Dashboard mostra XP e progresso |
| `subscription_plans` | Pricing e useSubscription funcionam |
| `user_subscriptions` | Plano ativo exibido |
| `organization_subscriptions` | Hook useSubscription resolve org |
| `organization_members` | Membership verificada |
| `organizations` | /org carrega, ContextSwitcher funciona |
| `schools` | Lista de escolas aparece em /org |
| `classes` | Turmas aparecem por escola |
| `institutional_memberships` | Papéis institucionais resolvidos |
| `institutional_invitations` | Convites pendentes aparecem |
| `engagement_events` | Gráfico de engajamento na /org |
| `nps_responses` | NpsEvolution funciona |
| `guardian_consent_events` | Gate de consentimento funciona |
| `data_access_logs` | Auditoria silenciosa (sem erro) |
| `notification_outbox` | Convite enfileirado (sem envio por falta de secret) |
| `ai_usage_limits` | Rate limit de IA funciona |
| `leads` | Formulário público funciona |
| `landing_events` | Analytics de landing funciona |
| `purchase_intents` | Checkout MP funciona |
| `institutional_decision_events` | Fila de decisões registra eventos |
| `runtime_gates` | Incerto — criada E removida por migrations sucessivas |

## RPCs confirmadas por uso em runtime

| RPC | Confirmação |
|---|---|
| `get_my_profile` | Login e shell funcionam |
| `get_my_plan` | useSubscription funciona |
| `has_role` | admin-dashboard funciona |
| `has_my_role` | Policies de leads funcionam |
| `enforce_ai_usage_limit` | Rate limit de IA funciona |
| `get_learning_progress_overview` | Painel docente funciona |
| `get_funnel_overview` | Funil funciona |
| `get_org_engagement_summary` | Métricas de /org funcionam |
| `get_operational_metrics` | OperationalMetrics funciona |
| `invite_member` | Convites são criados |
| `accept_invitation` | AcceptInvite funciona |
| `record_guardian_consent` | Gate de consentimento funciona |
| `get_my_guardian_consent_status` | RequireGuardianConsent funciona |
| `set_my_birth_date` | Fluxo de nascimento funciona |
| `get_school_metrics` | Painel escola funciona (pós-fix) |
| `can_read_school` | Autorização escolar funciona |
| `metric_minimum_group_size` | Verificação retornou 5 |
| `resend_invitation` | Aplicada (verificação de privilégio OK) |
| `escalate_indicator` | Aplicada (verificação de privilégio OK) |

## Objetos com status incerto

| Objeto | Motivo |
|---|---|
| `runtime_gates` | Criada por `20260728194005` e removida por `20260728194702` — a ordem de aplicação pode ter sido invertida ou apenas uma foi aplicada |
| `compute_cycle_risk` | Criada e removida nas mesmas duas migrations |
| `gate_enabled` | Idem |
| Tabelas de risco (ergonomic_assessments, etc.) | Podem ter sido criadas pelo Lovable em algum momento e a migration de DROP as removeu |

## Divergências local × remoto

| Tipo | Descrição | Risco |
|---|---|---|
| Migrations com UUID do Lovable | 9 arquivos no local; provavelmente aplicadas (Lovable aplica ao criar) | Baixo se são DDL básico |
| Migration defeituosa aplicada (#39) | O banco tem a função corrigida (via #42), mas `schema_migrations` listará a defeituosa como aplicada | Nulo — reconciliação é forward-only |
| `runtime_gates` | Pode existir ou não no banco remoto dependendo da ordem real | P2 — irrelevante para dashboard OS |
