# TRUST-1.2 — CONTRATO DE PRIVACIDADE

**Status: ✅ R10 FECHADO. Servidor é a autoridade.**

Normativo complementar a `docs/kiro/METRIC_PRIVACY_POLICY.md`. Sem secrets nem
dados pessoais.

## Princípio

O servidor decide o que pode sair. A interface **não protege**: se protegesse, o
valor real teria que trafegar até ela, e um valor que trafega vaza em DevTools,
em log de rede, em cache de proxy e em export — mesmo escondido na tela.

Limiar canônico: `public.metric_minimum_group_size()`. Fonte única, resolvida no
servidor, publicada em cada resposta como `minimum_group_size`. Nenhum cliente
escreve o número.

## Os três estados de um grupo

| Estado | Forma | Significado |
|---|---|---|
| Divulgado | `{ suppressed: false, value, count, isEmpty: false }` | Atingiu o limiar |
| Vazio | `{ suppressed: false, value: 0, count: 0, isEmpty: true }` | Ninguém participou — **não** expõe pessoa alguma |
| Suprimido | `{ suppressed: true, reason, minimumGroupSize }` | Não pode ser divulgado |

Grupo suprimido **não tem** `value` nem `count`. A ausência é o contrato: se o
tipo permitisse esses campos, o valor poderia trafegar.

`reason` é `below_threshold` (1..k-1 pessoas) ou `complementary` (suprimido para
impedir reconstrução por subtração).

### Vazio ≠ suprimido

Distinção deliberada. Zero participantes não expõe ninguém, e `0` ali é honesto.
Tratar os dois como a mesma coisa faria o gestor ler "sem dados" onde a resposta
correta é "ninguém participou".

Antes desta onda o **nível da escola** contradizia isso: universo zero era
tratado como amostra insuficiente (`analytics_suppressed: true`, totais
`below_threshold`), enquanto o **nível da turma** já distinguia corretamente.
Corrigido.

## O que NÃO pode trafegar quando um grupo está suprimido

Nem no objeto, nem em campo alternativo, nem em metadado, nem em export:

- `count` exato
- `value`, `numerator`, `denominator`
- `percentage`, `score`, `average`
- distribuição (ex.: promotores/detratores de NPS)
- o **tamanho do universo elegível**, que é ele mesmo um dado protegido
- qualquer número auxiliar que permita reconstrução

São metadados legítimos, e continuam públicos: `minimum_group_size`, `days`,
`period`, `generated_at`, identificadores de escopo. O limiar **precisa** ser
exibido para a supressão ser honesta.

## `eligible_universe` é um grupo, não um inteiro

Era um inteiro cru. Isso abria dois canais:

1. **Direto (R10):** escola com 4 estudantes devolvia `"eligible_universe": 4`
   junto de `analytics_suppressed: true`. A supressão escondia os valores e
   revelava o tamanho do grupo — exatamente o que o limiar protege.

2. **Por subtração:** escola de 20 estudantes com turma de 17 (divulgada,
   `count: 17`) e turma de 3 (suprimida) devolvia `eligible_universe: 20`.
   20 − 17 = 3. A supressão complementar então existente protegia o `value`
   (eventos) e deixava o `count` (pessoas) aberto.

Hoje `eligible_universe` é um `MetricGroup` com as mesmas três formas acima. O
algoritmo do canal de headcount está em `TRUST_1_2_COMPLEMENTARY_SUPPRESSION.md`.

## Superfícies cobertas

| Superfície | Regra |
|---|---|
| RPC / payload serializado | Autoridade. Nada abaixo do limiar sai daqui |
| Hook (`useSchoolMetrics`) | Só transporta. Não decide, não recalcula |
| Cache (React Query) | Chave inclui o escopo (`schoolId`, `period`) |
| Card / número grande | `SuppressedValue` — nunca `0` para grupo suprimido |
| Gráfico | Ponto suprimido é `null`, não zero |
| Tooltip | Recebe o mesmo `null`; não há valor para mostrar |
| `aria-label` / `sr-only` | Só o limiar. Leitor de tela não recebe número que a tela esconde |
| CSV / export | `toExportCell` → `"amostra insuficiente"` |
| PDF | Bloco suprimido imprime texto explícito; `null` nunca vira `0` |

## Escopo organizacional e contributor gate

`get_org_engagement_summary` alimenta o painel institucional **e** o PDF do
relatório piloto. A TRUST-1.2 fechou a ausência completa de limiar; a
TRUST-1.2.1 fechou a aproximação seguinte: roster elegível não é participação.

Hoje **cada métrica** usa seus próprios contribuidores distintos. NPS, sessões,
exercícios, interações com IA e usuários ativos são divulgados somente quando a
métrica tem `count(DISTINCT user_id) >= metric_minimum_group_size()`. Cinco
eventos da mesma pessoa continuam sendo um contribuidor. Métrica sem contribuinte
é zero real; métrica com 1..k-1 vem `null` e aparece em `suppressed_metrics`.

A série semanal segue a mesma regra por métrica e bucket na RPC
`get_org_analytics_series`. Grupo suprimido não carrega `value` nem `count`.
`null` e não `0`: zero fabricado é afirmação falsa, e o cliente precisa distinguir
"ninguém" de "não podemos dizer".

## Fronteira raw

`org_admin` não lê mais linhas de `nps_responses` ou `engagement_events`. Policies
administrativas de SELECT foram removidas por qualificador semântico; self-read
do estudante e acesso operacional de `service_role` permanecem. O navegador
institucional recebe somente as duas RPCs agregadoras. Cache e UI não são a
fronteira de privacidade; o servidor é.

## O que este contrato NÃO afirma

- **Não afirma conformidade legal.** Descreve o que o código faz tecnicamente. A
  interpretação jurídica é de humanos (doutrina §1).
- **Não cobre o roster administrativo.** `totalMembers`, `totalStudents`,
  `classCount` no relatório piloto são contagens de cadastro que o org_admin
  gerencia diretamente — não são analytics derivadas de comportamento. O limiar
  protege *analytics de estudante*, não a lista de pessoas que a própria gestão
  inseriu. Se essa fronteira mudar, é decisão de produto, não ajuste técnico.
- **Não cobre `get_operational_metrics`.** Devolve contagens operacionais da
  organização (membros ativos, convites pendentes, uso de IA, custo, erros). Não
  desce a grupo de estudantes e não foi alterado nesta onda.
