# TRUST-1.2 — PREPARAÇÃO DIRIGIDA (privacidade integral)

**Status: 📋 PREPARAÇÃO — nenhuma alteração de privacidade implementada.**

Este documento existe para a TRUST-1.2 começar com superfície mapeada e contrato
de testes definido, sem gastar a onda descobrindo onde mexer. Não é auditoria
sistêmica: é varredura dirigida ao domínio da supressão.

## O risco central já registrado

**R10 (P1) — `eligible_universe` trafega no payload quando a supressão está
ativa.** `get_school_metrics` devolve a contagem exata de estudantes elegíveis
mesmo com `analytics_suppressed = true`. Comprovado em execução na TRUST-1.1B:
para uma escola com 2 estudantes, a resposta traz `eligible_universe: 2` junto de
`analytics_suppressed: true` e totais `below_threshold`.

Ou seja: a supressão esconde os **valores** e revela o **tamanho do grupo** — que
é justamente o que o limiar N≥5 existe para proteger.

## Superfície afetada (medida, não estimada)

### Servidor

| Objeto | Migration | O que precisa ser revisto |
|---|---|---|
| `get_school_metrics(uuid, text)` | `20260727120000` + `20260731100000` | `eligible_universe` no payload; supressão complementar; `count` dentro de grupos divulgados |
| `metric_minimum_group_size()` | `20260727120000` | Limiar canônico — fonte única, não mudar sem decisão |
| `get_operational_metrics(uuid)` | `20260722240000` | Contagens por organização; verificar se alguma desce a grupo pequeno |
| `get_org_engagement_summary(uuid)` | `20260725100000` | Idem |
| `get_institutional_decision_events(...)` | `20260826120000` | Já tem projeção fechada; verificar se `school_id`/`class_id` + volume permite inferência |

### Cliente

| Arquivo | Ocorrências no domínio | Papel |
|---|---|---|
| `src/lib/metric-privacy.ts` | 24 | Módulo canônico de supressão — `isSuppressed`, `isEmptyGroup`, export |
| `src/lib/metric-privacy.test.ts` | 35 | 17 testes existentes |
| `src/pages/SchoolDashboardPage.tsx` | 8 | Consome `get_school_metrics`; cards, gráficos, rótulos |
| `src/hooks/useSchoolMetrics.ts` | 2 | Fronteira de dados; onde o payload entra |
| `src/pages/AdminPage.tsx` | 2 | Landing administrativa |

### Export, PDF e CSV

| Arquivo | Relevância |
|---|---|
| `src/lib/generate-pilot-report-pdf.ts` | Caminho de PDF com métricas — precisa respeitar supressão |
| `src/pages/OrgDashboardPage.tsx` | Export do painel institucional |
| `src/pages/DashboardPage.tsx` | Export do estudante (dados próprios; verificar se agrega) |
| `src/components/Certificate.tsx` | Dados individuais, não agregados — provavelmente fora de escopo |

### Tooltip, a11y e gráficos

| Arquivo | Relevância |
|---|---|
| `src/components/dashboard/ChartFrame.tsx` | Moldura canônica; `aria-label` e estado vazio |
| `src/components/org/EngagementChart.tsx` | Recharts + tooltip — tooltip pode revelar valor suprimido |
| `src/components/org/EngagementMetrics.tsx` | Cards de métrica |

### Cache

`useSchoolMetrics` e os hooks institucionais usam cache por chave. A TRUST-1.3
trata segregação por tenant; aqui importa apenas que um payload **suprimido** não
seja substituído por um payload **anterior mais revelador** ao trocar de período.

## Contrato de testes da TRUST-1.2 — pré-definido

Estes casos devem existir **antes** de qualquer mudança de comportamento, para
que a mudança seja verificável.

### Cardinalidade do grupo

| n | Esperado |
|---|---|
| 0 | `isEmpty = true`, `suppressed = false`. "Ninguém participou" ≠ "sem dados" |
| 1 | suprimido |
| 4 | suprimido |
| 5 | divulgado (limiar é ≥, não >) |
| 6 | divulgado |

### Inferência por subtração

| Caso | Esperado |
|---|---|
| Uma turma pequena entre turmas grandes | supressão complementar ativa: a menor turma divulgada também é suprimida |
| Duas turmas pequenas | supressão simples basta; nenhuma complementar necessária |
| Total dedutível a partir das partes divulgadas | totais suprimidos por inferência (`reason = complementary`) |
| Filtro temporal que reduz o grupo abaixo do limiar | resposta recalculada sob supressão, não herdada do período anterior |

### Payload

| Caso | Esperado |
|---|---|
| `analytics_suppressed = true` | payload **não** revela `eligible_universe` exato (**R10**) |
| Grupo divulgado | `count` presente é aceitável, porque ≥ limiar |
| Grupo suprimido | nenhuma chave numérica que permita reconstruir o tamanho |
| Serialização JSON completa | nenhuma contagem abaixo do limiar em qualquer nível |

### Superfícies de saída

| Superfície | Esperado |
|---|---|
| Card / número grande | rótulo de supressão, nunca `0` no lugar do valor |
| Gráfico | ponto ausente ou marcado, não zerado |
| Tooltip | não revela valor de grupo suprimido |
| `aria-label` | descreve a supressão; leitor de tela não recebe o número |
| PDF | mesma supressão da tela |
| CSV / export | mesma supressão da tela |
| Cross-tenant | nada disso vaza entre organizações |

## Ordem sugerida

1. Travar os testes de cardinalidade e de payload sobre o comportamento **atual**
   (documentando o R10 como falha esperada).
2. Corrigir o servidor: `eligible_universe` sob supressão.
3. Propagar para as superfícies de saída, PDF e CSV inclusive.
4. A11y e tooltip.
5. Regerar tipos se a forma do payload mudar (D81) e rodar o contrato de runtime.

## R22 — permanece obrigatório

```
R22 remains mandatory as read-only production preflight
before any TRUST migration promotion.
```

Nenhuma credencial remota foi solicitada nesta onda, e a TRUST-1.2 é executável
inteiramente em staging local. O preflight é pré-condição da **promoção**, não do
desenvolvimento.
