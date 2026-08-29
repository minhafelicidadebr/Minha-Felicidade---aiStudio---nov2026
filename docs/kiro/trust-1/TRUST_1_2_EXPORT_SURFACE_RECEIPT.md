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

**Servidor** — `get_org_engagement_summary` passa a usar o universo elegível da
organização como gate, com a mesma regra do nível da escola (0 divulgável,
1..k-1 suprimido, ≥k divulgável). Quando suprimido, as dez chaves derivadas de
estudantes vêm `null`, com `analytics_suppressed` e `minimum_group_size`.

**Fronteira do cliente** — `OrgDashboardPage` deixa de usar `|| 0`. Passa a
propagar `null` e o par `suppressed` / `minimumGroupSize` para o gerador.

**PDF** — o tipo de `engagementData` passou de `number` para `number | null` nas
chaves derivadas, com `suppressed: boolean` e `minimumGroupSize: number`.

- Bloco suprimido imprime texto explícito:
  *"Amostra insuficiente para exibição segura."* mais a linha do limiar.
- `null` individual imprime `—` via helper `cell()`, nunca `0`.
- NPS só é desenhado quando `npsCount`, `npsPromotors` e `npsDetractors` são todos
  números — antes o `> 0` bastava e um `null` teria virado NaN no cálculo.

Efeito colateral corrigido: antes o bloco de engajamento simplesmente **não era
desenhado** quando `totalSessions` era `0`, o que confundia "ninguém participou"
com "não podemos dizer". Agora os dois têm saída distinta.

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
