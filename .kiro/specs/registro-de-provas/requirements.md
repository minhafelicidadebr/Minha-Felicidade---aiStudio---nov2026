# Requirements Document

Truth & Evidence Registry — claims públicos auditáveis (Onda 0 do plano)

## Introduction

A landing atual faz afirmações reguladas sem proveniência verificável — algumas
plausivelmente fabricadas. Exemplos reais encontrados no código:

- Métricas de efeito: "58% de redução em ruminação aos 21 dias"
  (`WellbeingScrollStory.tsx`), "reduzir ansiedade adolescente em até 87%"
  (`MoodCheckIn.tsx`), "reduz cortisol em 23%" (`InteractiveToolsShowcase.tsx`).
- Prova social: "3.401 alunos ativos neste módulo", "47 instituições em
  onboarding este mês" (`MoodCheckIn.tsx`).
- Depoimentos rotulados **"Depoimentos Reais"** com nomes que parecem fictícios
  (`TestimonialsSection.tsx`).
- Badges: "WCAG 2.2", "Baseado em Yale" (`SocialProofBar.tsx`).

Isso viola a doutrina §1 (honestidade > overclaim) e é risco regulatório/marca.
Esta spec cria um **registro de provas** (claims registry): toda afirmação
regulada exibida ao público passa a ter um registro com fonte, nível de
evidência e status, e o build/CI impede publicar claim regulado sem registro
aprovado. Início pragmático: registro versionado em código (build-time), sem
depender de CMS — evolução para CMS governado fica para depois.

Escopo honesto: esta onda NÃO valida cientificamente as afirmações; ela cria a
infraestrutura de rastreabilidade e força que cada claim regulado esteja
**aprovado com fonte** OU seja removido/rebaixado (ex.: depoimentos marcados como
exemplos ilustrativos, métricas sem fonte movidas para `draft` e retiradas da UI).

## Glossary

- **Claim regulado**: afirmação pública que exige prova — métrica de efeito,
  número de usuários/instituições, depoimento, badge de conformidade
  (WCAG/LGPD), menção de licença/afiliação (Yale).
- **Registro (registry entry)**: item com `id`, texto, superfície, categoria,
  fonte (tipo + URL/documento + data de acesso), nível de evidência, limitações,
  owner, revisor, status e validade.
- **Status**: `draft` | `approved` | `expired` | `rejected`.
- **Proveniência**: fonte primária citável (estudo, dado interno com método) que
  sustenta o claim.

## Requirements

### Requirement 1: Modelo de registro de provas

**User Story:** Como responsável pela plataforma, quero um registro versionado de
todos os claims regulados, para que cada afirmação pública tenha fonte e status
rastreáveis.

#### Acceptance Criteria

1. THE sistema SHALL manter um registro em código (ex.: `src/content/claims-registry.ts`)
   onde cada entrada tem: `id` único, `text` curto, `surface`, `category`
   (`metric|social_proof|testimonial|compliance_badge|license`), `source`
   (`{ type, url?, document?, accessedDate? }`), `evidenceLevel`, `limitations?`,
   `owner`, `reviewer?`, `status`, `lastReviewed`, `expiresAt?`.
2. THE sistema SHALL expor um leitor tipado (`getClaim(id)` / `getApprovedClaim(id)`)
   que só retorna como aprovado um claim com `status='approved'`, `source` com
   URL/documento e `expiresAt` no futuro.
3. THE função de leitura de claim aprovado SHALL falhar de forma explícita
   (lançar/retornar inválido) para `id` inexistente, `draft`, `rejected` ou
   `expired` — nunca renderizar como se fosse aprovado.

### Requirement 2: Integridade do registro validada no gate

**User Story:** Como responsável pela qualidade, quero que o gate (CI) valide o
registro, para impedir claims aprovados sem prova ou registros malformados.

#### Acceptance Criteria

1. THE gate SHALL falhar se houver `id` duplicado, campo obrigatório ausente, ou
   entrada `approved` sem `source.url`/`source.document` e `expiresAt` válido.
2. THE gate SHALL falhar se um depoimento (`category='testimonial'`) estiver
   `approved` sem consentimento/uso registrado (`source.document`).
3. THE gate SHALL falhar se uma menção de licença/afiliação
   (`category='license'`) estiver `approved` sem documento de licença.
4. A validação da forma do registro SHALL ter testes unitários (função pura).

### Requirement 3: Superfícies públicas não exibem claim regulado sem registro aprovado

**User Story:** Como responsável pela marca, quero que a landing só mostre claims
regulados que estejam aprovados com fonte, para não fazer overclaim.

#### Acceptance Criteria

1. WHEN um componente de landing exibe um claim regulado THEN ele SHALL obtê-lo
   via `getApprovedClaim(id)` (ou equivalente), nunca como string solta.
2. IF um claim regulado atual não tem prova THEN o sistema SHALL removê-lo da UI
   OU rebaixá-lo honestamente (ex.: depoimentos → rotular "exemplos ilustrativos";
   métricas sem fonte → retiradas até haver fonte aprovada).
3. THE badge "WCAG 2.2" SHALL ser removido ou qualificado com escopo/nível/data
   enquanto não houver auditoria (é claim de conformidade sem prova hoje).
4. THE linguagem sobre Yale SHALL descrever inspiração curricular de forma exata,
   sem sugerir licença/afiliação/endosso não comprovados.

### Requirement 4: Escopo faseado e não-regressão

**User Story:** Como time, quero um começo pragmático que não quebre a landing
nem exija CMS, para entregar valor rápido e evoluir depois.

#### Acceptance Criteria

1. THE primeira fase SHALL cobrir os claims regulados JÁ existentes na landing
   (inventário desta spec), não todos os textos do produto.
2. THE onda NÃO SHALL alterar `_shared/crisis.ts`, consentimento, pagamento nem
   os invariantes de segurança existentes.
3. `npm run quality` SHALL permanecer verde a cada tarefa; o novo gate de claims
   integra o `security:gate` (ou um script `claims:gate` encadeado em `quality`).

## Fora de escopo

- Validação científica das afirmações (é trabalho de conteúdo/curadoria humana).
- CMS governado de claims (fase futura; começamos com registro em código).
- Scanner heurístico que "lê" todo JSX à procura de claims — nesta fase o
  enforcement é por convenção (componentes usam `getApprovedClaim`) + revisão do
  inventário; a varredura automática ampla fica como follow-up.
