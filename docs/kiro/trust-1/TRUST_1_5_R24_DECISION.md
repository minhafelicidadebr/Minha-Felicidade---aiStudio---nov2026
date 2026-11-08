# TRUST-1.5 / R24 — DECISÃO: FAIL-CLOSED PRESERVADO

**Status: 🟡 ACCEPTED_ARCHITECTURAL_LIMITATION / FAIL_CLOSED_PRESERVED**
**Auditoria externa de negativas: EXTERNAL_DENIAL_AUDIT_PENDING**

Sem secrets nem dados pessoais.

## O achado

`get_school_metrics` (desde a UX-3), `get_org_engagement_summary` e
`get_institutional_decision_events` gravam uma linha em `data_access_logs` antes
de negar acesso. O `RAISE EXCEPTION` seguinte aborta a transação e **desfaz o
INSERT junto**.

Medido em execução, com transações separadas como faz o PostgREST:

| Caminho | Linhas persistidas |
|---|---|
| Negativa em `get_institutional_decision_events` | **0** |
| Negativa em `get_school_metrics` | **0** |
| Sucesso em `get_institutional_decision_events` | **1** |

Não é bug de implementação: é como PostgreSQL funciona. Uma exceção que sai da
função aborta a (sub)transação, e tudo que ela escreveu vai com ela.

## A decisão

**Preservar `RAISE EXCEPTION` e o comportamento fail-closed.**

Não se muda a autorização para o log sobreviver. As alternativas que fariam a
negativa persistir todas custam segurança:

| Alternativa | Custo |
|---|---|
| Devolver payload vazio em vez de exceção | O cliente deixa de distinguir "negado" de "sem dados". Pior: um bug de checagem passaria a devolver 200 silencioso em vez de erro |
| Commitar o log e só então negar | Exigiria transação autônoma, que PL/pgSQL não tem |
| Mover a checagem para fora da RPC | Espalha autorização por camadas — o oposto de "o servidor é a autoridade" |

Fail-closed vale mais que completude do log.

## Formalização

**`data_access_logs` = acessos CONCEDIDOS.** Ponto. É o que a tabela registra e é
tudo que se deve afirmar sobre ela.

Qualquer relatório de "quem tentou acessar o que não podia" montado sobre essa
tabela está **vazio por construção**. Não é que esteja incompleto: a linha nunca
existiu.

**Tentativas negadas pertencem a um canal independente e ainda inexistente:**

```
security_denied_access_events
```

Esse canal precisa de escrita **fora da transação** da RPC — extensão de
background worker, fila externa, ou log estruturado capturado na borda da API.
Escolher entre essas opções é decisão de arquitetura e infraestrutura, não
correção mecânica.

## O que NÃO se afirma

Não se afirma que negativas estão persistidas — nem em documentação, nem em
comentário de código, nem em interface — até que exista implementação externa à
transação **e** teste correspondente.

Por isso os INSERTs de negativa foram **mantidos**, mas cada um recebeu comentário
explícito no corpo da função:

```sql
-- ATENÇÃO — R24 (comprovado em execução): esta linha de auditoria NÃO
-- PERSISTE. O `RAISE EXCEPTION` abaixo aborta a transação e desfaz o INSERT.
-- `data_access_logs` registra acessos CONCEDIDOS. Tentativas negadas
-- pertencem a um canal independente e ainda inexistente
-- (`security_denied_access_events`).
-- Mantido porque é o ponto de captura correto quando esse canal existir.
```

Manter o INSERT em vez de removê-lo é deliberado: é o ponto de captura correto, e
apagá-lo faria a implementação futura ter que redescobrir onde instrumentar. O
comentário garante que ninguém leia o código e conclua que a auditoria de negativa
funciona.

## Impacto sobre a TRUST-1.2

**Nenhum.** A privacidade não depende do log de negativas. O que protege o dado é
a negativa em si — que funciona, é fail-closed, e é verificada em execução em
todas as RPCs do domínio.

Esta limitação não bloqueia a TRUST-1.2 e não bloqueou.

## Escopo afetado

| RPC | Grava negativa que não persiste |
|---|---|
| `get_school_metrics` | Sim |
| `get_institutional_decision_events` | Sim |
| `get_org_engagement_summary` | Não — nega sem tentar registrar |

Nenhuma delas teve o comportamento de negativa alterado.
