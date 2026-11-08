# TRUST-1.2 — RECEIPT DOS TESTES DE PRIVACIDADE

**Status: ✅ R10 FECHADO — comportamento vulnerável congelado em teste antes da correção.**

Dados 100% sintéticos (`@example.invalid`, RFC 2606) em banco local descartável.
Nenhum secret, credencial ou dado pessoal.

## Identificação

| Campo | Valor |
|---|---|
| Branch | `trust-1.2-privacy-end-to-end` |
| Base | `main` em `707cf42` |
| Ambiente | Supabase local em Docker, portas 55321-55329 |
| Migrations após reset | **45/45 desde banco vazio** |
| Produção tocada | **NÃO** |

## Método: vermelho antes de verde

Os testes foram escritos **antes** da correção e executados contra o servidor
vulnerável. Nenhum teste foi ajustado para ficar verde; o servidor foi corrigido.

```
1ª execução (servidor vulnerável):  6 falharam | 11 passaram
```

### As 6 falhas iniciais e o que cada uma provou

| Teste | Falha | O que provou |
|---|---|---|
| `n=0 — grupo vazio, NÃO suprimido` | `analytics_suppressed` era `true` | O nível da escola tratava universo zero como amostra insuficiente, contradizendo o nível da turma, que já distinguia `isEmpty` |
| `n=1 — payload NÃO contém o tamanho exato` | `eligible_universe: 1` | **R10 literal** |
| `n=4 — payload NÃO contém o tamanho exato` | `eligible_universe: 4` | **R10 literal** |
| `headcount da turma suprimida NÃO é reconstruível` | `20 − 17 = 3` | **Segundo canal do R10**: `eligible_universe` + `count` divulgado reconstruíam o headcount da turma suprimida |
| `7d e 90d continuam suprimidos` | `eligible_universe: 4` em todo período | O vazamento não dependia de filtro temporal |
| `nenhuma contagem 1..k-1 no payload` | contagem `1` presente | Varredura do payload inteiro |

### Payload antes da correção (medido, escola com 4 estudantes)

```json
{"analytics_suppressed": true,
 "eligible_universe": 4,
 "totals": {"sessions": {"reason":"below_threshold","suppressed":true,...}}}
```

Os valores estavam escondidos. O tamanho do grupo, não.

### Payload antes da correção (medido, escola 20 = 17 + 3)

```json
{"eligible_universe": 20,
 "classes": [{"group":{"count":17,"value":17,"suppressed":false}},
             {"group":{"reason":"below_threshold","suppressed":true}}]}
```

`20 − 17 = 3`. A turma suprimida tinha 3 estudantes, e o payload dizia isso.

## Depois da correção

```
2ª execução: 17 passaram | 0 falharam
Final (com os casos de organização): 23 passaram | 0 falharam
```

### Payload depois (mesmas escolas)

| Escola | `eligible_universe` | `analytics_suppressed` |
|---|---|---|
| 4 estudantes | `{suppressed: true, reason: below_threshold, minimumGroupSize: 5}` | `true` |
| 0 estudantes | `{suppressed: false, value: 0, count: 0, isEmpty: true}` | `false` |
| 20 = 17 + 3 | `{suppressed: true, reason: complementary, minimumGroupSize: 5}` | `false` |

No terceiro caso o único número visível é `17` — um grupo que atingiu o limiar. O
`3` não é recuperável por nenhuma combinação do payload.

## Casos cobertos — 23 contratos de execução real

### Cardinalidade (`PRIVACY — cardinalidade do universo elegível`)

| Caso | Esperado | Resultado |
|---|---|---|
| limiar vem do servidor | não hardcoded no teste | ✅ lido de `metric_minimum_group_size()` |
| n=0 | vazio, não suprimido; `value: 0`, `isEmpty: true` | ✅ |
| n=1 | totais suprimidos, `classes` e `series` vazias | ✅ |
| n=1 | tamanho do grupo ausente do payload | ✅ |
| n=4 | totais suprimidos, `classes` e `series` vazias | ✅ |
| n=4 | tamanho do grupo ausente do payload | ✅ |
| n=5 | divulgado (limiar é `>=`, não `>`) | ✅ `count: 5` |
| n=6 | divulgado | ✅ `count: 6` |

### Não inferência (`PRIVACY — não inferência por subtração`)

| Caso | Turmas | Resultado |
|---|---|---|
| turma pequena isolada ⇒ totais protegidos | [17, 3] | ✅ `reason: complementary` |
| headcount não reconstruível | [17, 3] | ✅ `eligible_universe` suprimido |
| um suprimido + dois divulgados ⇒ complementar | [17, 3, 5] | ✅ 2 grupos suprimidos, um deles `complementary` |
| duas pequenas ⇒ supressão simples basta | [18, 3, 3] | ✅ nenhuma complementar, totais divulgados |
| nenhum grupo suprimido carrega `value`/`count` | todas as 8 escolas | ✅ inclusive na série diária |

### Filtro temporal

| Caso | Resultado |
|---|---|
| 7d, 30d e 90d na mesma escola pequena | ✅ suprimidos nos três; recálculo, não herança |
| período inválido (`1y`) | ✅ recusado pelo servidor |

### Escopo organizacional (`get_org_engagement_summary`)

| Caso | Resultado |
|---|---|
| rede com 2 estudantes: bloco suprimido | ✅ 10 chaves derivadas vêm `null` |
| média e distribuição de NPS não trafegam | ✅ nem `9` (média) nem `2` (contagem) |
| rede acima do limiar: divulgado | ✅ |
| limiar publicado é o canônico | ✅ |
| cross-tenant nos dois sentidos | ✅ negado |
| `anon` | ✅ negado por privilégio |

### Payload como um todo

| Caso | Resultado |
|---|---|
| nenhuma contagem `1..k-1` em escola abaixo do limiar | ✅ varredura de valores JSON com caminho |
| cross-tenant | ✅ nega antes de montar payload |

## Nota metodológica sobre a varredura do payload

A primeira versão do varredor procurava dígitos no **texto** da resposta e
acusava falso positivo: fragmentos de UUID (`4000`, `d201`) e de timestamp ISO
contêm dígitos.

Substituído por caminhada recursiva sobre os **valores numéricos** do JSON, com o
caminho de cada ocorrência, excluindo as chaves de metadado (`days`,
`minimum_group_size`, `minimumGroupSize`) — que são públicas por design, porque o
limiar precisa ser exibido para a supressão ser honesta.

Isso importa registrar: quatro das falhas depois da correção eram defeito do
teste, não vazamento. Confirmado inspecionando o payload real antes de mexer no
varredor.

## Gate de qualidade

```
npm run quality  → exit 0
  audit:security  ✅
  lint            ✅ 0 problemas
  typecheck       ✅ real (R03), 0 erros
  test            ✅ 28 arquivos, 382 testes
  build           ✅
  security:gate   ✅
```

`db reset --local` → **45/45 migrations desde banco vazio.**

## O que este receipt NÃO prova

- Que o **remoto** tem este comportamento. A migration não foi aplicada em
  produção. R22 continua obrigatório como preflight.
- Que a **renderização** foi verificada pixel a pixel. O que existe é: o payload é
  seguro; `SuppressedValue` não renderiza número para grupo suprimido; o gráfico
  recebe `null`; o `sr-only` só menciona o limiar; `toExportCell` devolve texto; e
  o PDF imprime bloco de supressão. Não há teste de snapshot visual.
- Que o roster administrativo está sob o limiar. Não está, por decisão explícita —
  ver `TRUST_1_2_PRIVACY_CONTRACT.md` §"O que este contrato NÃO afirma".
