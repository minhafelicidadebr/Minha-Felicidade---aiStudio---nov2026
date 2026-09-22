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
| **R23** | ✅ **FECHADO na MACRO-ONDA D** — `ARCHIVE_CONTRACT` |
| **R24** | 🟡 **ACEITO na MACRO-ONDA D** — limitação arquitetural, fail-closed preservado |
| **R25** | ✅ **FECHADO na MACRO-ONDA D** — job `runtime-db` no CI |

**Gate: 🟡 PARCIAL**

Os três riscos do escopo declarado (R03, R04, R21) estão fechados e provados em
execução. As duas ressalvas são deliberadas:

As três ressalvas que restavam foram endereçadas na MACRO-ONDA D:

1. **R23** — decidido como `ARCHIVE_INSTEAD_OF_HARD_DELETE`. `schools` e `classes`
   ganharam coluna de estado espelhando `organizations`, e o erro obscuro de
   append-only virou erro de domínio que aponta o arquivamento.
2. **R24** — aceito como limitação arquitetural. `data_access_logs` formalizado
   como registro de acessos **concedidos**; negativas pertencem a um canal externo
   à transação, ainda inexistente. Fail-closed preservado: não se troca segurança
   por completude de log.
3. **R25** — fechado. O CI passou a subir Postgres real e a falhar diante de skip.

Receipts: `TRUST_1_5_TYPECHECK_RECEIPT.md`,
`TRUST_1_5_SCHEMA_TYPE_CONTRACT.md`, `TRUST_1_5_R21_RUNTIME_RECEIPT.md`

## TRUST-1.2 — Privacidade Integral

| Critério | Status |
|---|---|
| Superfície mapeada | ✅ |
| Contrato de testes pré-definido | ✅ e escrito **vermelho antes** da correção |
| Servidor não retorna valores abaixo de k | ✅ `eligible_universe` é `MetricGroup`; grupos suprimidos sem `value`/`count` |
| Supressão complementar funciona | ✅ dois canais — valor e headcount — algoritmo documentado |
| Payload serializado é seguro | ✅ varredura de valores JSON com caminho, em todas as escolas |
| Exports são seguros | ✅ CSV via `toExportCell`; PDF com bloco de supressão |
| PDF é seguro | ✅ `null` nunca vira `0`; NPS só desenha com números reais |
| Tooltips e a11y são seguros | ✅ `sr-only` só menciona o limiar; gráfico recebe `null` |
| Cache não reintroduz valor | ✅ chave inclui escopo; nenhum vazamento inequívoco |
| Testes adversariais verdes | ✅ 23 contratos, inclusive não-inferência |
| Replay DB verde | ✅ 45/45 migrations desde banco vazio |
| RPC runtime contracts verdes | ✅ 62 no total |
| CI runtime DB verde | ✅ job `runtime-db` (R25) |
| Quality verde | ✅ 28 arquivos, 382 testes |
| Produção intocada | ✅ |
| **R10** | ✅ **FECHADO** |
| **Achados novos resolvidos** | 🟡 R27 e R28 corrigidos; **R29 e R30 abertos** |

**Gate: 🟡 PARCIAL**

O critério central está cumprido: o servidor não devolve mais nada abaixo do
limiar, em nenhuma das duas superfícies de métrica, e isso foi provado por teste
que falhava antes da correção. Duas ressalvas, ambas registradas e nenhuma
bloqueante para o objetivo da onda:

1. **R29 — arquivamento não é filtrado em leitura.** `schools.status` e
   `classes.status` existem, mas nada define `archived` e nenhuma query o exclui.
   Inócuo hoje; é o débito que a decisão do R23 deixa para a onda que expuser o
   arquivamento.
2. **R30 — roster administrativo fora do limiar, por decisão.** As contagens de
   cadastro no PDF do piloto continuam exatas. São dados que o org_admin gerencia
   diretamente, não analytics de comportamento. Estender o limiar a elas é decisão
   de produto.

Receipts: `TRUST_1_2_PRIVACY_CONTRACT.md`,
`TRUST_1_2_PRIVACY_TEST_RECEIPT.md`,
`TRUST_1_2_COMPLEMENTARY_SUPPRESSION.md`,
`TRUST_1_2_EXPORT_SURFACE_RECEIPT.md`

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

## TRUST-1.2.1 — Privacy Boundary Closure & Server-Side Analytics

| Critério | Status |
|---|---|
| Leitura institucional raw de NPS/engagement removida | ✅ policies removidas por semântica |
| Self-read legítimo preservado | ✅ |
| Analytics agregada no servidor | ✅ `get_org_analytics_series` + resumo |
| Contributor gate por métrica/bucket | ✅ `count(DISTINCT user_id)` |
| n=0 / n=1 / n=4 / n=5 distintos | ✅ |
| Payload suprimido sem valor/count/PII | ✅ |
| UI, tabela, ARIA e PDF preservam supressão | ✅ 7/7 |
| Runtime contra PostgreSQL real | ✅ 78/78; TRUST-1.2.1 12/12 |
| Replay desde zero | ✅ 46/46 migrations |
| Quality | ✅ 30 arquivos, 405 testes, build e security gate |
| Produção intocada | ✅ |
| R31 / R32 | ✅ fechados |
| R22 | 🔴 aberto e obrigatório antes de produção |

**Gate: ✅ APROVADO LOCALMENTE**

A fronteira técnica está fechada no replay local: o navegador institucional não
recebe linhas brutas, e roster deixou de ser proxy de contribuição. Isto não
homologa o remoto. Receipts: `TRUST_1_2_1_RAW_ACCESS_BOUNDARY_RECEIPT.md`,
`TRUST_1_2_1_CONTRIBUTOR_GATE_RECEIPT.md`,
`TRUST_1_2_1_SERVER_ANALYTICS_RECEIPT.md`,
`TRUST_1_2_1_UI_EXPORT_RECEIPT.md` e
`TRUST_1_2_1_REPLAY_QUALITY_RECEIPT.md`.

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
| Writes diretos revogados | ✅ `REVOKE INSERT` + policy de INSERT removida em `engagement_events`/`nps_responses` |
| RPCs resolvem contexto | ✅ `record_engagement_event`/`submit_nps_response`, `auth.uid()` server-side, `user_id` nunca é parâmetro |
| Spoofing falha | ✅ cross-tenant, sem membership, org archived, org inexistente — todos negados em execução real |
| Eventos legítimos funcionam | ✅ membro único e multi-org gravam corretamente; `organization_id` nulo preservado |
| Relatórios não aceitam contaminação | ✅ threshold poisoning 4→5 bloqueado antes de qualquer INSERT; contributor distinctness (TRUST-1.2.1) intocado |

**Gate: ✅ APROVADO LOCALMENTE**

RED reproduzido contra Postgres local antes da correção: membro de `ORG_A`
inseria com sucesso em `ORG_B`. GREEN: 28 contratos de runtime em
`input-integrity-runtime-contract.test.ts` + 4 guards estáticos em
`trust1-4-static-guards.test.ts`. Replay 48/48 migrations desde banco vazio.
Quality: 38 arquivos, 475 testes, build e security gate verdes. Isto não
homologa o remoto — R22 continua `OPEN / REQUIRED_BEFORE_PRODUCTION`. Receipt:
`TRUST_1_4_GATE.md`.

## TRUST-1.6 — Consentimento Verificável

| Critério | Status |
|---|---|
| Adolescente não pode autorizar sozinho | ✅ escrita direta em `record_guardian_consent` deixou de ser usada por qualquer código de aplicação; único caminho de decisão é `decide_guardian_consent`, que exige o token entregue ao canal do responsável |
| Responsável confirma em contexto independente | ✅ `GuardianDecisionPage` (rota `/autorizacao-responsavel`), sem sessão de estudante, fora de `<RequireAuth>`; ação positiva explícita (Autorizar/Não autorizar), sem checkbox pré-marcada |
| Revogação funciona | ✅ `revoke_guardian_consent` — evento novo `revoked`, não edita o grant anterior; testado em execução real |
| Versão do termo registrada | ✅ `guardian_consent_policies` (policy_version + statement_sha256 + requires_reconsent); `get_my_guardian_consent_status` compara contra a versão vigente resolvida no servidor, não numa constante do frontend |
| Testes de token passam | ✅ one-time/replay/expiração/superseded/aleatório/nulo/corrida atômica — 35 contratos de runtime |

**Gate: ✅ APROVADO LOCALMENTE**

RED reproduzido contra Postgres local antes da correção: estudante concedeu
consentimento a si mesmo com um responsável inteiramente fabricado, e a RPC
antiga devolveu `granted = true`. GREEN: 35 contratos de runtime em
`guardian-consent-runtime-contract.test.ts` + 7 guards estáticos em
`trust1-6-static-guards.test.ts`. Assurance explícito: **Level 1** (canal do
responsável verificado, relação apenas declarada) — não Level 2 (vínculo
confirmado institucionalmente), porque não existe hoje nenhuma fonte
institucional de relação estudante-responsável no produto; construir uma é
expansão de produto, fora do escopo desta correção. Replay 49/49 migrations
desde banco vazio. Regressão: 121/121 contratos herdados (TRUST-1.2/1.2.1/
1.3/1.4) verdes. Quality: 517/517 testes, build e security gate verdes. Isto
não homologa o remoto — R22 continua `OPEN / REQUIRED_BEFORE_PRODUCTION`.
Receipt: `TRUST_1_6_GATE.md`.

## TRUST-1.7 — Prova Ponta a Ponta

| Critério | Status |
|---|---|
| Prova ponta a ponta completa | ⬜ |
| Evidências salvas | ⬜ |
| Receipt final assinado | ⬜ |

**Gate: ⬜ NÃO INICIADO**
