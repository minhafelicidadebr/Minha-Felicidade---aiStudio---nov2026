# TRUST-1.2 — RECEIPT DA SUPERFÍCIE DE EXPORT (§D8/§D9)

Exportação é superfície de dados, não detalhe visual. Sem secrets nem dados
pessoais.

## Inventário das saídas

| Saída | Arquivo | Carrega métrica de estudante? | Situação |
|---|---|---|---|
| CSV da série diária | `SchoolDashboardPage.tsx` → `toExportCell` | Sim | ✅ já suprimia (UX-3); reverificado |
| PDF do relatório piloto | `generate-pilot-report-pdf.ts` | **Sim** | 🔴 vazava → ✅ corrigido |
| Certificado do estudante | `Certificate.tsx` | Não — dado do próprio titular | Fora de escopo |
| Export do painel do estudante | `DashboardPage.tsx` | Não — dado do próprio titular | Fora de escopo |
| Co-design | `CoDesignPage.tsx` | Não | Fora de escopo |

## O vazamento do PDF — achado desta onda

`OrgDashboardPage.handleDownloadReport` chamava `get_org_engagement_summary` e
passava o resultado ao gerador de PDF. A RPC **não aplicava limiar nenhum**:
devolvia contagens cruas de atividade e o bloco inteiro de NPS.

Uma rede com 2 estudantes que responderam NPS produzia um arquivo com:

```
NPS DO PILOTO   +100
2 respostas · Média 9.0/10
Ativos 7d / 30d  2/2
```

Média e distribuição de um grupo de duas pessoas, num PDF que o gestor manda por
e-mail para a secretaria. §D5 nomeia exatamente isso: `percentage`, `score`,
`average`, `distribuição`.

Agravante: o cliente fazia `(e.nps_count as number) || 0`. Se o servidor
passasse a mandar `null`, o `|| 0` converteria a supressão em **zero fabricado** —
e o PDF afirmaria "0 respostas", o que é falso.

## Correção, em três camadas

**Servidor** — `get_org_engagement_summary` aplica contributor gate independente
por métrica, não por roster. Cada indicador conta `DISTINCT user_id`; zero é
vazio real, 1..k-1 vem `null`, e apenas ≥k é divulgado. `suppressed_metrics`
identifica exatamente os indicadores protegidos. A série semanal aplica a mesma
regra em cada bucket por `get_org_analytics_series`.

**Fronteira do cliente** — `OrgDashboardPage` não usa `|| 0`. Propaga `null`,
`suppressedMetrics` e `minimumGroupSize` para o gerador. Métrica suprimida não é
recalculada nem inferida no navegador.

**PDF** — as chaves derivadas são `number | null`.

- Supressão parcial preserva indicadores permitidos e imprime `—` nos protegidos,
  com texto que informa o limiar.
- O bloco inteiro só vira *"Amostra insuficiente para exibição segura"* quando
  nenhum indicador de analytics é divulgável.
- `null` individual nunca vira `0` (`cell()`).
- NPS só é desenhado quando `npsCount`, `npsPromotors` e `npsDetractors` foram
  divulgados; caso contrário não há cálculo nem `NaN`.

Assim, "ninguém participou", "parte das métricas está protegida" e "nenhuma
métrica é divulgável" têm saídas distintas.

## Tooltip e acessibilidade (§D9)

Verificado em `SuppressedValue.tsx` e nas superfícies que o usam.

| Canal | Situação |
|---|---|
| Número na tela | ✅ grupo suprimido não renderiza valor; ícone + texto |
| `title` | ✅ não usado para valor suprimido |
| Tooltip do gráfico | ✅ recebe `null` (`isSuppressed(point.group) ? null : point.group.value`); não há valor para mostrar |
| `aria-label` / `aria-labelledby` | ✅ descrevem a seção, não o valor |
| `sr-only` | ✅ menciona **apenas** o limiar (`Limiar mínimo de N pessoas por grupo`) |
| `alt` | ✅ não há imagem com valor |
| DOM oculto | ✅ o valor não existe no payload, então não pode estar no DOM |
| `data-*` | ✅ `data-suppression-reason` carrega o motivo, não o número |

O ponto estrutural: como o servidor não envia o valor, **nenhuma** camada de
cliente pode reintroduzi-lo — em tooltip, em atributo ou em texto de leitor de
tela. A privacidade é a mesma para usuário visual e para tecnologia assistiva
porque a informação não chega ao navegador.

Os três estados têm textos **distintos**, sem reuso (`describeSuppression`,
`EMPTY_GROUP_TEXT`, `READ_FAILURE_TEXT`), e a distinção nunca depende só de cor:
cada estado tem ícone mais texto.

## Cache (§D10)

`useSchoolMetrics` usa `queryKey: ["school-metrics", schoolId, period]`. O
`schoolId` é UUID global, então trocar de escola — ou de organização — muda a
chave. Nenhum vazamento inequívoco encontrado nesta superfície.

**Não é uma auditoria de contexto multi-tenant.** A verificação sistemática de
segregação por tenant nos demais hooks é TRUST-1.3 e não foi feita aqui.

## O que este receipt NÃO cobre

- **Roster administrativo no PDF.** `totalMembers`, `totalStudents`,
  `totalEducators`, `totalInvitations` e `classCount` por escola continuam saindo
  exatos. São contagens de cadastro que o org_admin gerencia diretamente, não
  analytics derivadas de comportamento. Estender o limiar a elas é decisão de
  produto — registrado, não alterado.
- **Snapshot visual.** Não há teste de imagem do PDF nem do gráfico. O que está
  provado é o contrato de dados e o caminho de código.
