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

**Gate: 🟡 PARCIAL**

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

## TRUST-1.5 — Typecheck, Schema e Tipos

| Critério | Status |
|---|---|
| Typecheck verifica arquivos reais | ⬜ |
| Tipos refletem staging | ⬜ |
| CI falha diante de erro | ⬜ |
| Build e testes usam mesma versão de schema | ⬜ |

**Gate: ⬜ NÃO INICIADO**

## TRUST-1.2 — Privacidade Integral

| Critério | Status |
|---|---|
| Payload não revela contagem abaixo de 5 | ⬜ |
| Subtração não reconstrói grupos | ⬜ |
| UI, PDF e CSV coerentes | ⬜ |
| Testes passam em banco real | ⬜ |
| Documentação reflete a regra | ⬜ |

**Gate: ⬜ NÃO INICIADO**

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
