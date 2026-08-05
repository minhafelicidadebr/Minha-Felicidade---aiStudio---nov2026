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

| Critério | Status |
|---|---|
| Staging aceita a sequência | ⬜ Não iniciado |
| Nenhuma migration relevante falha | ⬜ |
| Schema diff compreendido | ⬜ |
| RPCs existem com assinaturas esperadas | ⬜ |
| Grants e RLS comprovados | ⬜ |
| Receipt de aplicação registrado | ⬜ |

**Gate: ⬜ NÃO INICIADO**

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
