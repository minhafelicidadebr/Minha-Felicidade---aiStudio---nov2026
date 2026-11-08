# TRUST-1.2.1 — RECEIPT DO CONTRIBUTOR GATE

**Status:** ✅ R32 fechado no ambiente local. Limiar canônico = servidor.

## Regra comprovada

Cada métrica e cada bucket contam `DISTINCT user_id`; roster elegível não autoriza
divulgação. NPS, sessões, exercícios e interações com IA têm gates independentes.

| Caso | Resultado |
|---|---|
| n=0 | vazio real: `value: 0`, `count: 0`, `isEmpty: true` |
| n=1 | suprimido, sem `value` e sem `count` |
| n=4 | suprimido, sem `value` e sem `count` |
| n=5 | divulgado |
| 5 respostas da mesma pessoa | 1 contribuidor; suprimido |
| muitos eventos de 2 pessoas | 2 contribuidores; suprimido |

O limiar vem de `metric_minimum_group_size()`; nenhum cliente define o número.
O resumo de 30 dias também usa contribuidores distintos por métrica e devolve
`suppressed_metrics`, permitindo supressão parcial sem fabricar zero.

## Evidência

Sete contratos R32 executaram em PostgreSQL real. O payload suprimido não contém
identificadores, feedback, metadata, valor ou contagem oculta; buckets semanais
saem em ordem determinística. Conjunto TRUST-1.2.1: **12/12 verde**.

Limitação preservada: integridade da escrita direta em NPS/engagement pertence à
TRUST-1.4 (R11/R02), não a este corte de leitura.