# TRUST-1.1B — RECEIPT DO RESET LOCAL

**Status do gate: 🟡 PARCIAL**

Aprovada na substância: a sequência histórica foi provada reconstruível desde
zero, dois defeitos foram encontrados em execução e um foi corrigido. Não
APROVADO integralmente porque um achado novo (R21) é decisão de contrato e foi
deliberadamente deixado em aberto, e porque o schema remoto continua inferido,
não consultado.

Este documento não contém secrets, senhas, tokens, chaves nem dados pessoais.

## Identificação

| Campo | Valor |
|---|---|
| Branch | `trust-1.1-migration-reconciliation` |
| Commit-base | `c294ce3` (saneamento do R17) |
| Data | 2026-08-24 |
| Docker | Client 29.6.2 / Server 29.6.2, context `desktop-linux` |
| Supabase CLI | 2.115.0 (via `npx --yes supabase@2.115.0`) |
| Node | 24.14.0 |
| Ambiente | Supabase local em Docker, portas 55321-55329 |
| Produção tocada | **NÃO** |
| Dados reais usados | **NÃO** |
| `--linked` usado | **NÃO** |
| `--db-url` remoto usado | **NÃO** |

## Etapa 1 — Saneamento do R17: ✅ CONCLUÍDA (sessão anterior)

Executada antes de qualquer reset. Arquivo `20260706192738` preservado com nome
e timestamp; operação de credencial substituída por no-op documentado; valor da
senha não reproduzido em nenhum lugar; conta de teste não recriada.

Receipt: `TRUST_1_R17_INCIDENT_RECEIPT.md`

## Etapa 2 — Isolamento local: ✅ CONFIRMADO

| Verificação | Resultado |
|---|---|
| Docker Engine operacional | ✅ Server 29.6.2 respondendo |
| Supabase CLI operacional | ✅ 2.115.0 |
| Endpoints apontam só para 127.0.0.1 | ✅ API 55321, DB 55322, Studio 55323, Inbucket 55324 |
| Ausência de `--linked` | ✅ |
| Ausência de `--db-url` remoto | ✅ |
| Nenhuma operação apontou para produção | ✅ |
| Nenhum dado real importado | ✅ banco reconstruído só por migrations |

Portas não padrão (55321-55329) declaradas em `supabase/config.toml` porque a
máquina tem **outro** projeto Supabase local ocupando 54321-54327. Esse outro
projeto **não foi parado** — podia ser trabalho ativo. Registrado como decisão
operacional, não como risco.

Observação registrada: o CLI avisa que os serviços locais fazem bind em
`0.0.0.0`, não apenas em loopback, e que as chaves locais são defaults públicos.
Isso é comportamento do Supabase local, vale só para esta máquina e não tem
relação com produção. Não deve ser usado para nada além de ensaio.

## Etapa 3 — Reset local integral: ✅ PASSOU

Três execuções, na ordem do protocolo (registrar causa → menor correção →
reiniciar desde zero).

### Execução 1 — falhou na 11ª migration

```
Migration:  20260706192545_fd2a8387-44ee-4778-a469-8c613dd8d130.sql
Erro:       SQLSTATE 23503 — user_roles_user_id_fkey
            Key (user_id)=(<uuid>) is not present in table "users"
Aplicadas antes: 10
```

Causa: seed inseria `user_roles` com **UUID literal** de contas criadas
manualmente no painel de Auth do ambiente original. Em banco vazio a FK para
`auth.users` falha. `ON CONFLICT DO NOTHING` não protege — a FK é avaliada antes
do conflito. Isto **confirmou o R18**, que estava registrado como suspeita.

Evidência: `evidence/reset-failure-01-seed-fk.md`

Correção (menor defensável): o INSERT passa a derivar `user_id` de `auth.users`
por e-mail. Banco vazio → zero linhas, migration passa. Banco com as contas →
comportamento idêntico ao original. Nome e timestamp do arquivo preservados.

### Execução 2 — 42 migrations aplicadas desde zero

Sequência completa, sem falha. `20260722250000_demo_tenant_seed` passou: as
tabelas institucionais deliberadamente **não** têm FK para `auth.users`, então
os UUIDs sintéticos do tenant de demonstração não violam nada. Q4 refutada.

Nesta execução os testes SQL/RLS revelaram **dois achados novos** (§Etapa 7).

### Execução 3 — 43 migrations, com a reconciliada

```
Applying migration 20260824120000_trust1_dashboard_os_reconciled.sql...
Finished supabase db reset on branch trust-1.1-migration-reconciliation.
```

`SELECT count(*) FROM supabase_migrations.schema_migrations` → **43**

## Etapa 4 — Migrations contaminantes: ✅ ESTADO FINAL LIMPO

| Objeto | Criado por | Removido por | Presente no estado final |
|---|---|---|---|
| `runtime_gates` | `20260728194005` | `20260728194702` | ❌ ausente |
| `gate_enabled()` | `20260728194005` | `20260728194702` | ❌ ausente |
| `compute_cycle_risk()` | `20260728194005` | `20260728194702` | ❌ ausente |
| `ergonomic_assessments`, `contextual_risk_reviews`, `risk_criteria_versions`, `membership_invites`, `platform_admins`, `instrument_versions` | — | `DROP IF EXISTS` em `20260728194702` | ❌ nunca existiram neste projeto |

Consulta de verificação retornou **0 linhas**. Nenhuma migration posterior
depende desses objetos. Nenhum resíduo a neutralizar.

A migration reconciliada **não remove nada**: apenas emite `RAISE WARNING` se
algum ambiente divergir. Remover objeto não inventariado seria destrutivo e está
fora do mandato TRUST-1.

## Etapa 5 — Migration reconciliada

`supabase/migrations/20260824120000_trust1_dashboard_os_reconciled.sql`

| Requisito | Atendido |
|---|---|
| Forward-only | ✅ |
| Preserva dados | ✅ nenhum DELETE, UPDATE, DROP ou TRUNCATE |
| Sem `DROP ... CASCADE` | ✅ |
| Não recria conta de teste | ✅ |
| Não contém secret | ✅ |
| Não altera objeto fora do domínio | ✅ |
| Comentários de pré-condição e finalidade | ✅ |
| Falha explícita diante de estado incompatível | ✅ 4 pré-condições verificadas em `DO` block |

Conteúdo: §0 pré-condições, §1 correção do R20, §2 reafirmação dos grants
mínimos, §3 verificação (não remoção) de contaminantes.

Ela **não redeclara** `get_school_metrics`. O estado final já está correto desde
`20260731100000`; redeclarar criaria uma terceira cópia de ~200 linhas do mesmo
corpo, o que é dívida, não reconciliação. Em vez disso, §0 **aborta a migration**
se o que estiver aplicado for a versão defeituosa que referencia `e.school_id`.

## Etapa 6 — Validação do schema local

### RPCs do domínio

| Função | Assinatura | Modo | search_path |
|---|---|---|---|
| `get_school_metrics` | `_school_id uuid, _period text` | SECURITY DEFINER | `public` |
| `can_read_school` | `_school_id uuid` | SECURITY DEFINER | `public` |
| `resend_invitation` | `_invitation_id uuid` | SECURITY DEFINER | `public` |
| `escalate_indicator` | `_organization_id uuid, _school_id uuid, _indicator text, _severity text` | SECURITY DEFINER | `public` |
| `accept_invitation` | `_token uuid` | SECURITY DEFINER | `public` |
| `invite_member` | `_organization_id uuid, _invited_email text, _role text, _school_id uuid, _class_id uuid` | SECURITY DEFINER | `public` |
| `create_organization` | `_name text, _slug text` | SECURITY DEFINER | `public` |
| `get_operational_metrics` | `_organization_id uuid` | SECURITY DEFINER | `public` |
| `get_org_engagement_summary` | `_org_id uuid` | SECURITY DEFINER | `public` |
| `metric_minimum_group_size` | — | invoker | `public` |

Owner de todas: `postgres`.

**Funções `SECURITY DEFINER` sem `search_path` no schema inteiro: 0.**

### Grants

| Função | anon | authenticated | service_role | PUBLIC |
|---|---|---|---|---|
| `get_school_metrics` | ❌ | ✅ | ❌ | ❌ |
| `resend_invitation` | ❌ | ✅ | ❌ | ❌ |
| `escalate_indicator` | ❌ | ✅ | ❌ | ❌ |
| `can_read_school` | ❌ | ✅ | ✅ | ❌ |
| `metric_minimum_group_size` | ❌ | ✅ | ✅ | ❌ |
| `activate_subscription_from_intent` | ❌ | ❌ | ✅ | ❌ |
| `record_guardian_consent` | ❌ | ✅ | ❌ | ❌ |
| `get_my_guardian_consent_status` | ❌ | ✅ | ❌ | ❌ |
| `get_my_plan` | ❌ | ✅ | ❌ | ❌ |

Únicas funções executáveis por `anon`: `protect_birth_date_immutable` e
`reject_decision_event_mutation` — ambas são funções de **trigger** (retornam
`trigger`, não invocáveis como RPC pela API). Sem impacto.

### Privacidade

| Verificação | Resultado |
|---|---|
| `metric_minimum_group_size()` | **5** |
| `get_school_metrics` referencia `e.school_id` | ❌ não (posição 0) |
| `get_school_metrics` referencia `e.class_id` | ❌ não (posição 0) |
| Deriva escola por `institutional_memberships` | ✅ |
| Colunas reais de `engagement_events` | `id, user_id, organization_id, event_type, metadata, created_at` — **não existe** `school_id` nem `class_id` |

### Governança

`institutional_decision_events`: 15 colunas, 5 CHECK constraints (vocabulário
controlado de `event_type`, `reason`, `result`, `severity`, `source_entity`),
3 FKs, PK, 4 índices (inclusive o único parcial de idempotência), 2 triggers
append-only (`trg_decision_events_no_update`, `trg_decision_events_no_delete`).

### Segurança

| Verificação | Resultado |
|---|---|
| `auth.users` após reset | **0 linhas** |
| `public.user_roles` após reset | **0 linhas** |
| `public.profiles` após reset | **0 linhas** |
| Credencial histórica presente | ❌ nenhuma conta criada por migration |
| Tabelas em `public` sem RLS | **0** de 22 |
| Policies de UPDATE/DELETE em tabela append-only | **0** |
| Objetos residuais de contaminante | **0** |

Total no schema final: 22 tabelas, 36 funções, 39 policies.

## Etapa 7 — Testes SQL e RLS

17 testes executados diretamente no Postgres local, com dados **100%
sintéticos** (dois tenants fictícios, e-mails `@example.invalid`), removidos no
teardown (`auth.users` volta a 0).

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| T1 | RLS cross-tenant em `organizations` | A vê só A | ✅ 1 linha |
| T2 | RLS cross-tenant em `schools` | A vê só Escola A | ✅ |
| T3 | `can_read_school` própria vs alheia | `t` / `f` | ✅ |
| T4 | `get_school_metrics` cross-tenant | negar 42501 | ✅ `School not available for this account` |
| T5 | `get_school_metrics` sem membership | negar 42501 | ✅ mesma mensagem (não serve de sonda) |
| T6 | `get_school_metrics` como `anon` | negar | ✅ `permission denied for function` |
| T7 | Supressão por limiar (2 alunos < 5) | suprimir | ✅ `analytics_suppressed=true`, totais `below_threshold`, `classes=[]`, `series=[]` |
| T8 | Período inválido (`1y`) | negar 22023 | ✅ |
| T9 | `escalate_indicator` fora do escopo | negar | ✅ `Organization not available for this account` |
| T10 | `escalate_indicator` legítimo | gravar no ledger | ✅ retornou payload |
| T11 | UPDATE no ledger | rejeitar | ✅ `institutional_decision_events is append-only` |
| T12 | DELETE no ledger | rejeitar | ✅ mesma rejeição |
| T13 | Leitura cross-tenant do ledger | B não vê A | ✅ por ausência de grant (ver R21) |
| T14 | `resend_invitation` por não-membro | negar 42501 | ✅ `Invitation not available` |
| T15 | Antiburla de reenvio | 1º passa, 2º imediato bloqueia | 🔴 → ✅ **achou o R20**; após correção: `{"resend":1,"remaining":2}` e depois `Resend blocked: minimum interval of 24 hours` |
| T16 | INSERT direto em `user_subscriptions` por `authenticated` | negar | ✅ `permission denied for table` |
| T17 | `activate_subscription_from_intent` por `authenticated` | negar | ✅ `permission denied for function` |

### Achado T15 — R20 (P0), corrigido

`resend_invitation` chamava `digest()` sem qualificar o schema. O pgcrypto do
Supabase mora em `extensions`, e a função é pinada em `SET search_path = public`
por exigência da doutrina — então a chamada **nunca resolveu**, em nenhum
ambiente. Toda invocação abortava antes de escrever.

Consumidor ativo: `src/hooks/useDecisionActions.ts` → botão "Reenviar convite"
da `DecisionQueue`. Conclusão honesta: **o reenvio de convite nunca funcionou**,
nem em produção.

Por que os testes de UX-3 não pegaram: são invariantes de texto sobre o `.sql`,
não executam Postgres. Exatamente a lacuna que a TRUST-1 existe para fechar.

Corrigido na reconciliada (`extensions.digest`), mantendo o `search_path` pinado.
Evidência: `evidence/reset-failure-02-pgcrypto-search-path.md`

### Achado T13 — R21 (P1), registrado e NÃO corrigido

A policy `"Org admins read decision events"` existe, mas `authenticated` não tem
`GRANT SELECT` na tabela. Em PostgreSQL, RLS restringe um privilégio existente;
não concede. A policy é **inerte**.

Efeito prático hoje: nenhum. Nenhum caminho do cliente lê a tabela; as RPCs
`SECURITY DEFINER` escrevem como `postgres`. O que existe é divergência entre
intenção declarada e estado efetivo.

Não corrigido de propósito: os dois desfechos possíveis (conceder SELECT numa
tabela de auditoria vs. remover a policy e ler por RPC dedicada) são decisão de
contrato, não correção mecânica. Evidência:
`evidence/finding-03-ledger-policy-sem-grant.md`

### Testes adicionados ao repositório

`src/lib/trust1-reconciliation-invariants.test.ts` — 19 testes que travam:
a qualificação de schema do pgcrypto em toda migration a partir da reconciliada;
a preservação do defeito na migration histórica (detecta reescrita de histórico);
a ausência de UUID literal no seed; o caráter forward-only da reconciliada.

## Gate de qualidade

```
npm run quality
  audit:security  ✅
  lint            ✅
  typecheck       ✅
  test            ✅ 25 arquivos, 320 testes
  build           ✅ 3226 módulos, 33.6s
  security:gate   ✅ Security gate passed
```

Ajuste necessário: subir o stack local faz o Supabase CLI gerar bundles
minificados em `supabase/.temp/`, que o ESLint passava a analisar e derrubavam o
lint com 205 erros. Adicionado a `eslint.config.js` (ignores) e ao `.gitignore`.
É artefato de ferramenta, não código do projeto.

## Riscos restantes

| Risco | Severidade | Status |
|---|---|---|
| R18 — sequência histórica nunca testada desde zero | P0 | ✅ **RESOLVIDO** — 43 migrations reconstroem o banco; correção mínima aplicada |
| R19 — Docker Engine não operacional | P0 | ✅ **RESOLVIDO** — Server 29.6.2 |
| R20 — `resend_invitation` quebrada por `search_path` | P0 | ✅ **CORRIGIDO** na reconciliada; verificado em execução |
| R21 — policy de leitura do ledger inerte | P1 | 🟡 **ABERTO por decisão** — aguarda escolha de contrato |
| R01 — migration defeituosa não reconciliada | P0 | 🟡 **CONTIDO** — estado final correto e travado por pré-condição que aborta a migration |
| R05 — sem staging | P0 | 🟡 **MITIGADO** — staging local reproduzível existe e está documentado; ainda não há staging remoto |
| R04 — tipos Supabase desatualizados | P1 | Aberto — TRUST-1.5 |
| Schema remoto ainda inferido, não consultado | P1 novo (R22) | Aberto — exige credencial de leitura do remoto |

## O que este receipt NÃO prova

- Que o schema remoto é igual ao local. O lado remoto continua **inferido por
  runtime**, não consultado. Registrado como R22.
- Que a reconciliada aplica sem erro **em produção**. Foi provada em banco
  reconstruído desde zero, não contra o estado real acumulado do remoto. As
  pré-condições do §0 existem justamente para abortar em vez de adivinhar.
- Que o e-mail de reenvio chega. R20 conserta a RPC; R09 (secrets de e-mail não
  configurados) continua aberto. O ledger registra a decisão; o envio é outra
  camada.

---

## Status de integração (acrescentado depois, sem alterar o registro acima)

| Campo | Valor |
|---|---|
| Integration status | **merged via PR #47** |
| Commit em `main` | `b41f43c` |
| Data da integração | 2026-08-26 |
| CI do PR | verde após o `main` ser recuperado pelo PR #48 |

O `main` estava vermelho em `aa39286` por dois avisos de
`react-hooks/exhaustive-deps` introduzidos por commits do Lovable em componentes
de landing — fora do domínio TRUST. Corrigidos em PR isolado (#48) antes da
integração, sem tocar nenhum arquivo TRUST.

**O registro acima permanece verdadeiro:** o R21 estava aberto durante a
TRUST-1.1B e não foi incluído nela. Ele foi fechado depois, na TRUST-1.5 — ver
`TRUST_1_5_R21_RUNTIME_RECEIPT.md`.
