# TRUST-1 — MATRIZ DE GATES

Cada corte tem um gate. O gate só passa quando TODOS os critérios estão ✅.

## TRUST-1.0 — Baseline e Congelamento

| Critério | Status |
|---|---|
| Working tree compreendida | ✅ |
| Estado remoto documentado | ✅ |
| Migrations inventariadas (41) | ✅ |
| Riscos P0 e P1 registrados | ✅ |
| Escopo congelado | ✅ |

**Gate: ✅ APROVADO**

## TRUST-1.1 — Reconciliação das Migrations

### TRUST-1.1A — Classificação e ambiente seguro

| Critério | Status |
|---|---|
| Todas as migrations classificadas (42/42) | ✅ |
| Histórico remoto compreendido (inferido por runtime) | ✅ com ressalva |
| Migration aplicada NÃO reescrita | ✅ |
| Snapshot estrutural existe | ✅ (REMOTE_SCHEMA_INVENTORY) |
| Ambiente de staging ou local identificado | ⚠️ Identificado (supabase local), depende de Docker |
| Nenhuma alteração feita em produção | ✅ |
| Migration reconciliada pronta para ensaio | ✅ (plano documentado) |
| Achado P0 novo documentado (R17 — credencial em claro) | ✅ |

**Gate: ✅ APROVADO com ressalva** — ambiente de staging depende de Docker

### TRUST-1.1B — Reconciliação forward-only em staging

| Critério | Status |
|---|---|
| R17 saneado no source | ✅ |
| Nenhuma credencial literal permanece | ✅ |
| Nenhum usuário de teste criado por migration | ✅ `auth.users` = 0 após reset |
| Produção intocada | ✅ sem `--linked`, sem `--db-url` remoto |
| Nenhum dado real usado em staging | ✅ só dados sintéticos, removidos no teardown |
| Docker Engine operacional | ✅ Server 29.6.2 |
| `supabase db reset --local` passa integralmente | ✅ 43/43 migrations desde banco vazio |
| Toda migration compreendida | ✅ classificada (1.1A) e **provada aplicável** (1.1B) |
| Migration reconciliada verde | ✅ `20260824120000_trust1_dashboard_os_reconciled.sql` |
| `get_school_metrics` correta | ✅ verificada em execução; sem `e.school_id`/`e.class_id`; pré-condição aborta se a versão defeituosa estiver aplicada |
| Grants corretos | ✅ nenhuma RPC executável por `anon`; escrita de assinatura só por `service_role` |
| RLS correta | ✅ 22/22 tabelas com RLS; cross-tenant negado em execução |
| Ledger consistente | ✅ append-only comprovado (UPDATE e DELETE rejeitados pelos triggers) |
| Contaminantes ausentes do estado final | ✅ 0 objetos residuais |
| Schema diff totalmente classificado | ✅ para A×B — ⚠️ lado C ainda inferido (R22) |
| Testes SQL/RLS verdes | ✅ 17 testes; 2 defeitos P0 encontrados, 1 corrigido, 1 já corrigido antes |
| Gate de qualidade | ✅ 320 testes, build e security gate verdes |
| **Achado P1 novo resolvido** | 🟡 **NÃO** — R21 aberto por decisão de contrato |

**Gate: 🟡 PARCIAL — integrada via PR #47 (commit `b41f43c` em `main`)**

Aprovada na substância. Duas ressalvas, ambas deliberadas:

1. **R21 aberto por decisão.** A policy de leitura do ledger é inerte (falta
   `GRANT SELECT`). Resolver exige escolher entre alargar privilégio numa tabela
   de auditoria ou remover a policy e ler por RPC dedicada. Decisão de contrato,
   não correção mecânica — o protocolo manda parar diante disso.
2. **Lado C do schema diff continua inferido** (R22). Consultar o catálogo do
   Postgres remoto exigiria credencial de leitura do remoto, não usada nesta onda.

O que a onda entregou de concreto: a sequência histórica passou a ser
reconstruível desde zero (R18), e um defeito P0 que estava em produção sem
ninguém saber foi encontrado e corrigido (R20 — o botão "Reenviar convite" nunca
funcionou).

Receipt: `TRUST_1_1B_LOCAL_RESET_RECEIPT.md`
Diff: `TRUST_1_1B_SCHEMA_DIFF.md`
Evidências: `evidence/reset-failure-01-seed-fk.md`,
`evidence/reset-failure-02-pgcrypto-search-path.md`,
`evidence/finding-03-ledger-policy-sem-grant.md`

## TRUST-1.5 — Typecheck, Schema, Tipos e R21

| Critério | Status |
|---|---|
| Typecheck verifica arquivos reais | ✅ prova negativa nos dois sentidos (exit 2 com erro, exit 0 sem) |
| Tipos refletem o schema homologado | ✅ gerados do banco local reconstruído desde zero |
| CI falha diante de erro de tipo | ✅ `typecheck` real integrado ao `quality`, que é o gate do CI |
| Build e testes usam a mesma versão de schema | ✅ 44 migrations locais = migrations da branch |
| Casts que mascaram drift removidos | ✅ 0 restantes no código |
| R03 fechado | ✅ |
| R04 fechado | ✅ |
| R21 fechado | ✅ leitura do ledger por RPC dedicada, sem `GRANT SELECT` bruto |
| RPC do ledger executada em Postgres real | ✅ 15 casos + 26 contratos de runtime |
| Sem `SELECT` bruto no ledger | ✅ `has_table_privilege` = false para `anon` e `authenticated` |
| Runtime contracts das RPCs críticas | ✅ `resend_invitation`, `get_school_metrics`, `escalate_indicator`, `get_institutional_decision_events` |
| `db reset --local` continua passando | ✅ 44/44 desde banco vazio |
| Produção intocada | ✅ |
| Dados reais usados | ✅ nenhum — só sintéticos, em banco descartável |
| Gate de qualidade | ✅ 26 arquivos, 346 testes, build, security gate |
| **Achados novos resolvidos** | 🟡 **NÃO** — R23 e R24 abertos por decisão de contrato |
| **Runtime contracts no CI** | 🟡 **NÃO** — R25: exigem Docker no runner |

**Gate: 🟡 PARCIAL**

Os três riscos do escopo declarado (R03, R04, R21) estão fechados e provados em
execução. As duas ressalvas são deliberadas:

1. **R23 e R24 são decisões de contrato.** O ledger torna tenants indeletáveis, e
   a auditoria de negativa nunca persiste. Ambos foram descobertos por execução
   nesta onda, ambos têm saídas não equivalentes que envolvem retenção de dados e
   contrato de segurança. Registrados, não alterados.
2. **R25 — o CI não executa os contratos de runtime.** Eles rodam localmente e são
   pulados (com aviso explícito, não aprovados) onde não há Docker.

Receipts: `TRUST_1_5_TYPECHECK_RECEIPT.md`,
`TRUST_1_5_SCHEMA_TYPE_CONTRACT.md`, `TRUST_1_5_R21_RUNTIME_RECEIPT.md`

## TRUST-1.2 — Privacidade Integral

| Critério | Status |
|---|---|
| Superfície mapeada | ✅ preparação dirigida concluída |
| Contrato de testes pré-definido | ✅ cardinalidade, inferência, payload, saídas |
| Payload não revela contagem abaixo de 5 | ⬜ **R10 aberto e comprovado** |
| Subtração não reconstrói grupos | ⬜ supressão complementar existe; falta cobertura de teste |
| UI, PDF e CSV coerentes | ⬜ |
| Tooltip e a11y não revelam grupo suprimido | ⬜ |
| Testes passam em banco real | ⬜ |
| Documentação reflete a regra | ⬜ |

**Gate: 📋 PREPARADO, NÃO INICIADO**

Preparação em `TRUST_1_2_PREP.md`: superfície medida (servidor, cliente, export,
tooltip, a11y, cache) e contrato de testes definido antes de qualquer mudança de
comportamento. Nenhuma alteração de privacidade foi implementada.

## Homologação pós-merge (2026-08-26)

| Verificação | Resultado |
|---|---|
| `main` após TRUST-1.5 | `e6e6d0c` |
| CI do `main` | ✅ success |
| `git status` | limpo |
| `db reset --local` em `main` | ✅ 44/44 desde banco vazio |
| `npm run quality` em `main` | ✅ 26 arquivos, 346 testes, build, security gate |
| Produção tocada | **NÃO** |

A propriedade `main limpo → dependências → replay de schema → tipos → typecheck →
testes → build` foi verificada de ponta a ponta na branch integrada.

## TRUST-1.3 — Contexto Organizacional Único

| Critério | Status |
|---|---|
| Shell e conteúdo mostram mesmo tenant | ⬜ |
| Nenhuma query usa contexto anterior | ⬜ |
| Cache segregado por tenant | ⬜ |
| Escolas e turmas pertencem ao contexto ativo | ⬜ |
| Testes de troca passam | ⬜ |

**Gate: ⬜ NÃO INICIADO**

## TRUST-1.4 — Integridade dos Eventos

| Critério | Status |
|---|---|
| Writes diretos revogados | ⬜ |
| RPCs resolvem contexto | ⬜ |
| Spoofing falha | ⬜ |
| Eventos legítimos funcionam | ⬜ |
| Relatórios não aceitam contaminação | ⬜ |

**Gate: ⬜ NÃO INICIADO**

## TRUST-1.6 — Consentimento Verificável

| Critério | Status |
|---|---|
| Adolescente não pode autorizar sozinho | ⬜ |
| Responsável confirma em contexto independente | ⬜ |
| Revogação funciona | ⬜ |
| Versão do termo registrada | ⬜ |
| Testes de token passam | ⬜ |

**Gate: ⬜ NÃO INICIADO**

## TRUST-1.7 — Prova Ponta a Ponta

| Critério | Status |
|---|---|
| Prova ponta a ponta completa | ⬜ |
| Evidências salvas | ⬜ |
| Receipt final assinado | ⬜ |

**Gate: ⬜ NÃO INICIADO**
