# TRUST-1.1A — Plano de Reconciliação de Migrations

## Classificação das 9 migrations com UUID (antes desconhecidas)

### 1. `20260308005342_d6791b55-*.sql`

| Campo | Valor |
|---|---|
| Objetivo | Criação fundacional: profiles, user_roles, user_progress, trigger on_auth_user_created, has_role() |
| Domínio | Auth / Core |
| Tabelas | profiles, user_roles, user_progress |
| Funções | has_role(), handle_new_user() |
| Destrutivo | Não |
| Classificação | **CANONICAL, APPLIED** |
| Risco | Nenhum — é a base de todo o sistema |

### 2. `20260315045203_88a4214f-*.sql`

| Campo | Valor |
|---|---|
| Objetivo | Tabela de leads (formulário público) |
| Domínio | Comercial / Leads |
| Tabelas | leads |
| Destrutivo | Não |
| Classificação | **CANONICAL, APPLIED** |
| Risco | Policy "Anyone can insert" é permissiva (corrigida depois pela #16) |

### 3. `20260412163108_6d72da03-*.sql`

| Campo | Valor |
|---|---|
| Objetivo | Schema de assinaturas: subscription_plans, user_subscriptions, organization_subscriptions, organization_members, get_user_plan(), user_has_feature(), seed dos 3 planos |
| Domínio | Assinatura |
| Tabelas | subscription_plans, user_subscriptions, organization_subscriptions, organization_members |
| Funções | get_user_plan(), user_has_feature() |
| Destrutivo | Não |
| Classificação | **CANONICAL, APPLIED** |
| Risco | Policies de INSERT/UPDATE para user_subscriptions e organization_subscriptions (removidas por migrations posteriores) |

### 4. `20260602003246_592c34b2-*.sql`

| Campo | Valor |
|---|---|
| Objetivo | ALTER TABLE leads: adiciona colunas da calculadora B2B |
| Domínio | Comercial / Leads |
| Colunas adicionadas | estimated_students, schools_count, calculated_price_cents, billing_interval, is_public_ngo, message, preferred_demo_at |
| Destrutivo | Não |
| Classificação | **CANONICAL, APPLIED** |
| Risco | Nenhum |

### 5. `20260614163948_26acc0f9-*.sql`

| Campo | Valor |
|---|---|
| Objetivo | Consolidação: grants hardening + default privileges + ai_usage_limits + enforce_ai_usage_limit() |
| Domínio | Segurança / IA |
| Tabelas | ai_usage_limits |
| Funções | enforce_ai_usage_limit() |
| Destrutivo | Não |
| Classificação | **CANONICAL, APPLIED** — é uma versão consolidada que duplica parcialmente as migrations `20260613*` |
| Risco | **P1** — Se as `20260613*` também foram aplicadas, há objetos criados duas vezes. Idempotência (IF NOT EXISTS) mitiga, mas GRANTS duplicados podem confundir. |
| Decisão | Na reconciliação, manter APENAS esta versão consolidada para o domínio IA+grants. |

### 6. `20260706192545_fd2a8387-*.sql`

| Campo | Valor |
|---|---|
| Objetivo | Seed de dados de teste: insere user_roles e profiles para contas de teste (student/teacher/manager @test.local) |
| Domínio | Seed / Teste |
| Destrutivo | Não |
| Classificação | **CANONICAL, APPLIED** (seed necessário para demonstração) |
| Risco | **P1** — assume UUIDs fixos que podem não existir se as contas de teste não foram criadas manualmente no auth.users. ON CONFLICT mitiga. |

### 7. `20260706192738_1fe643e7-*.sql`

| Campo | Valor |
|---|---|
| Objetivo | UPDATE de password para conta de teste teacher@test.local |
| Domínio | Seed / Teste |
| Destrutivo | Não (UPDATE em registro existente) |
| Classificação | **CONTAMINANT, APPLIED** |
| Risco | **P0** — Credencial em claro no repositório público (valor omitido deste documento). Ver `TRUST_1_R17_INCIDENT_RECEIPT.md`. |
| Decisão | **SANEADA na TRUST-1.1B.** Arquivo preservado com mesmo timestamp, operação insegura substituída por no-op documentado. |

### 8. `20260728194005_f1a02734-*.sql`

| Campo | Valor |
|---|---|
| Objetivo | Cria runtime_gates, gate_enabled(), compute_cycle_risk() — motor de risco para outro produto (não pertence ao dashboard de bem-estar) |
| Domínio | **Outro produto** (gestão de riscos corporativos) |
| Tabelas | runtime_gates |
| Funções | gate_enabled(), touch_runtime_gate(), compute_cycle_risk() |
| Destrutivo | Não no que toca o dashboard OS |
| Classificação | **CONTAMINANT, APPLIED (provavelmente)** |
| Risco | **P1** — introduz tabelas e funções de outro domínio. Não causa erro no dashboard, mas polui o schema. A migration seguinte (#41) as remove. |
| Decisão proposta | Se ambas foram aplicadas na ordem, o estado final é "removidas". Se só a #40 foi aplicada, os objetos existem sem uso. Na reconciliação, NÃO incluir. |

### 9. `20260728194702_43fa7f5b-*.sql`

| Campo | Valor |
|---|---|
| Objetivo | DROP CASCADE de tabelas e funções do motor de risco (runtime_gates, compute_cycle_risk, etc.) + limpeza de colunas órfãs |
| Domínio | Limpeza de contaminante |
| Destrutivo | **SIM** — usa DROP CASCADE em 10 tabelas e 12 funções |
| Classificação | **CORRECTIVE (para #40), DESTRUCTIVE, APPLIED (provavelmente)** |
| Risco | **P1** — se aplicada ANTES da #40 (inversão de ordem), os DROPs falham sem erro (IF EXISTS). Se aplicada sem a #40, pode dropar coisas que não existiam neste projeto. Seguro por IF EXISTS. |
| Decisão proposta | Na reconciliação, NÃO incluir. Os objetos já foram limpos ou nunca existiram. |

### 10. `20260709164308_e99a5164-*.sql`

| Campo | Valor |
|---|---|
| Objetivo | Cria has_my_role() (self-scoped), locks handle_new_user/has_role, hardening de leads policies, cria "Owners can update own org subscriptions" |
| Domínio | Segurança / Leads / Assinatura |
| Funções | has_my_role() |
| Policies | Corrige leads; cria policy de UPDATE em org_subscriptions |
| Destrutivo | Não |
| Classificação | **CANONICAL, APPLIED** — exceto a policy de UPDATE em org_subscriptions, que foi removida por `20260722190000_drop_org_subscriptions_update_policy.sql` |
| Risco | **Nenhum** — a policy problemática já foi removida |

### 11. `20260709164400_209a491b-*.sql`

| Campo | Valor |
|---|---|
| Objetivo | Adiciona birth_date a profiles, atualiza handle_new_user(), cria guardian_consent_events + record_guardian_consent() + get_my_guardian_consent_status() |
| Domínio | Consentimento / Perfil |
| Tabelas | guardian_consent_events (ALTER profiles) |
| Funções | record_guardian_consent(), get_my_guardian_consent_status(), handle_new_user() (atualizada) |
| Destrutivo | Não |
| Classificação | **CANONICAL, APPLIED** |
| Risco | **Duplicação parcial** com `20260706194000_guardian_consent_ledger.sql`. Se ambas foram aplicadas, o schema final é o mesmo (CREATE IF NOT EXISTS e CREATE OR REPLACE). |

---

## Migration defeituosa já aplicada (#39)

**Arquivo:** `20260727120000_ux3_school_metrics_and_governance.sql`

### Objetos criados ou substituídos

| Objeto | Tipo | Status pós-correção |
|---|---|---|
| `metric_minimum_group_size()` | Função | ✅ Correto |
| `institutional_decision_events` | Tabela | ✅ Correto |
| `reject_decision_event_mutation()` | Função trigger | ✅ Correto |
| `trg_decision_events_no_update` | Trigger | ✅ Correto |
| `trg_decision_events_no_delete` | Trigger | ✅ Correto |
| `can_read_school()` | Função | ✅ Correto |
| `get_school_metrics()` | Função | ⚠️ **Defeituosa na original, CORRIGIDA por #42** |
| `resend_invitation()` | Função | ✅ Correto |
| `escalate_indicator()` | Função | ✅ Correto |

### O que falhou

`get_school_metrics()` referenciava `e.school_id` em `engagement_events`, coluna
que não existe. Três subqueries afetadas.

### Como foi corrigido

Migration `20260731100000_fix_school_metrics_no_school_id_column.sql` fez
`CREATE OR REPLACE FUNCTION` com a lógica correta (JOINs via user_id de
institutional_memberships).

### Estado final do banco

A função `get_school_metrics()` no banco está **correta** (versão da correção). A
migration original permanece no histórico como arquivo com código defeituoso, mas
isso não afeta o runtime — `CREATE OR REPLACE` sobrepõe.

### Inconsistências remanescentes

Nenhuma funcional. A única inconsistência é documental: quem lê a migration #39
vê código que não corresponde ao que está no banco.

---

## Migration reconciliada proposta

**Nome:** `20260805000000_trust1_dashboard_os_reconciled.sql`

### Escopo

Consolida o estado final correto das RPCs e objetos do Dashboard OS:

1. `metric_minimum_group_size()` — limiar canônico N=5
2. `institutional_decision_events` — tabela + policies + triggers
3. `can_read_school()` — autorização de escola
4. `get_school_metrics()` — versão CORRETA (sem e.school_id)
5. `resend_invitation()` — com limite e antiburla
6. `escalate_indicator()` — com negação cross-org

### O que NÃO inclui

- Tabelas de outros domínios (profiles, user_roles, subscriptions, leads)
- Funções de outros domínios (get_my_profile, enforce_ai_usage_limit)
- Seed de dados ou credenciais
- Objetos do motor de risco (runtime_gates, compute_cycle_risk)
- DROP de objetos de outro domínio

### Estratégia

- `CREATE OR REPLACE FUNCTION` para todas as RPCs
- `CREATE TABLE IF NOT EXISTS` para a tabela de decisões
- `DROP POLICY IF EXISTS` + `CREATE POLICY` para RLS
- Preserva dados existentes (zero DROP TABLE)
- Idempotente: aplicar duas vezes produz o mesmo resultado
- Forward-only: não tenta reverter migrations anteriores
- Limitada ao domínio Dashboard OS

### Pré-condições

- Tabelas `organizations`, `schools`, `classes`, `institutional_memberships`,
  `institutional_invitations`, `engagement_events`, `data_access_logs` devem
  existir (criadas pelas migrations canônicas anteriores)
- Funções `is_org_admin()`, `auth.uid()` devem existir

### Status

**NÃO CRIADA.** O protocolo da TRUST-1.1B exige ensaio em ambiente isolado antes
de escrever a migration reconciliada, e o ensaio está bloqueado (Docker Engine
não operacional).

Criar a migration sem ensaio seria repetir exatamente o erro que originou o R01:
escrever SQL contra um schema presumido em vez de um schema observado.

### Descoberta que muda o plano

O ensaio pode revelar que a sequência histórica **não aplica** em banco vazio.
Suspeita concreta (R18): `20260706192545` e `20260722250000_demo_tenant_seed`
inserem registros com `user_id` fixos que referenciam `auth.users`. Em banco
limpo, esses usuários não existem e a FK deve falhar.

Se confirmado, a reconciliação precisa tratar isso — provavelmente tornando os
seeds condicionais à existência das contas, e não apenas consolidando RPCs.

---

## Achado P0: credencial em claro no repositório — SANEADO

A migration `20260706192738_1fe643e7-*.sql` continha uma senha em texto claro.
O valor não é reproduzido nesta documentação.

**Status: SANEADO na TRUST-1.1B.**

Ver `TRUST_1_R17_INCIDENT_RECEIPT.md` para o receipt completo.

---

## EXECUÇÃO — TRUST-1.1B (2026-08-24)

### Status: ✅ ENSAIADA E CRIADA

O plano acima foi executado. A seção "NÃO CRIADA" está superada.

`supabase/migrations/20260824120000_trust1_dashboard_os_reconciled.sql`

### A suspeita do plano estava certa (parcialmente)

O plano previa que `20260706192545` **e** `20260722250000_demo_tenant_seed`
falhariam por FK contra `auth.users`. O ensaio mostrou:

- `20260706192545` — **falhou**, exatamente como previsto (SQLSTATE 23503).
- `20260722250000_demo_tenant_seed` — **passou.** As tabelas institucionais
  deliberadamente não têm FK para `auth.users`, porque o vínculo pode preceder a
  criação da conta. A previsão estava errada aqui, e é bom que estivesse: mostra
  que ensaiar não é formalidade.

### O que o ensaio revelou que o plano não previa

Um defeito P0 **em produção**, invisível por leitura de código: `resend_invitation`
chamava `digest()` sem qualificar o schema. pgcrypto vive em `extensions`; a
função é pinada em `search_path = public`. A chamada nunca resolveu — o botão
"Reenviar convite" nunca funcionou, em nenhum ambiente.

Isso só apareceu porque um teste **executou a RPC**, em vez de ler o SQL. É a
justificativa concreta para a existência da TRUST-1.

### Escopo da reconciliada — deliberadamente menor que o planejado

O plano falava em "consolidar o estado final desejado do dashboard escolar".
A migration entregue **não** faz isso, e a diferença é intencional:

| Planejado | Entregue | Por quê |
|---|---|---|
| Consolidar `get_school_metrics` | Pré-condição que **aborta** se a versão defeituosa estiver aplicada | Redeclarar ~200 linhas já corretas cria uma terceira cópia a manter — dívida, não reconciliação |
| Consolidar RLS | Não alterada | Verificada em execução: 22/22 tabelas com RLS, cross-tenant negado. Nada a consolidar |
| Consolidar grants | Reafirmação idempotente dos 5 grants do domínio | Torna o estado esperado explícito e verificável na própria migration |
| Neutralizar contaminantes | Apenas `RAISE WARNING` se houver resíduo | Estado final de B está limpo. Remover objeto não inventariado seria destrutivo |
| Corrigir o R20 | Sim — `extensions.digest` | Achado do ensaio, não do plano |

### Aplicação remota

**NÃO APLICADA.** A reconciliada foi provada em banco reconstruído desde zero,
não contra o estado real acumulado do remoto. As pré-condições do §0 existem para
abortar em vez de adivinhar. Aplicar em produção está fora do mandato TRUST-1.

Ordem de aplicação quando autorizada: após `20260731100000`, que é pré-condição
verificada.
