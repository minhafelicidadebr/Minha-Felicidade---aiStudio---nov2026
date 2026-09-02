# TRUST-1.2.1 — DECISÃO DE ARQUITETURA DE ANALYTICS

**Status:** ✅ implementada e provada no ambiente local. Produção intocada.

## Problema medido

O painel institucional consulta `nps_responses` e `engagement_events` pelo cliente.
A RLS histórica autoriza `org_admin` a ler linhas da organização; como o grant é
de tabela, a API aceita projeções com `user_id`, feedback, contexto e metadata.
Além disso, o resumo de 30 dias usa o roster elegível como gate, não o número de
pessoas que realmente contribuíram para cada métrica.

## Alternativas e scoring (1 ruim, 5 melhor)

| Ramo | Privacidade | Testabilidade | Complexidade | Custo operacional | Total |
|---|---:|---:|---:|---:|---:|
| A — SELECT direto + RLS + agregação no cliente | 1 | 2 | 4 | 4 | 11 |
| B — RPC agregadora server-side | 5 | 5 | 4 | 4 | **18** |
| C — view/materialized view/Edge Function | 4 | 3 | 2 | 2 | 11 |

## Decisão: ramo B

Uma RPC `SECURITY DEFINER` resolve autorização por `auth.uid()`/membership,
agrega no PostgreSQL e aplica o limiar canônico por contribuidores distintos em
cada bucket e métrica. O navegador recebe somente `MetricGroup`: divulgado,
vazio real ou suprimido sem valor/count. A ordenação dos buckets é determinística.

As policies administrativas de SELECT bruto serão removidas. O self-read do
estudante permanece porque sustenta o cooldown legítimo do micro-survey. `anon`
continua sem acesso e `service_role` conserva a capacidade operacional.

`get_org_engagement_summary` também passa a usar contributor gate por métrica.
População cadastrada não é proxy de participação. Cinco eventos/respostas da
mesma pessoa continuam sendo um único contribuidor.

## Consequências e limites

- Não altera escrita: R02/R11 continuam para TRUST-1.4.
- Não afirma conformidade legal; descreve uma fronteira técnica.
- Não toca produção. R22 continua obrigatório antes de promoção.
- Calendário semanal usa início ISO da semana e oito buckets ordenados.
- A série não devolve `user_id`, feedback, contexto, metadata, numerador oculto
  ou contagem de grupo suprimido.
