# Design Document

Truth & Evidence Registry — claims públicos auditáveis

## Overview

Registro de provas versionado em código: um array tipado de claims regulados
(`src/content/claims-registry.ts`), um leitor/validador puro (`src/lib/claims.ts`),
e enforcement pelo gate (um teste Vitest de integridade roda dentro de
`npm run quality`, então um registro malformado ou um claim aprovado sem prova
quebra o gate). As superfícies de landing passam a obter claims regulados via
`getApprovedClaim(id)`; os claims atuais sem prova são removidos ou rebaixados
honestamente. Começo faseado (só os claims já existentes na landing).

## Architecture

```text
src/content/claims-registry.ts   (dados: ClaimEntry[])
        │  importado por
        ▼
src/lib/claims.ts                (tipos + validateRegistry() + getClaim/getApprovedClaim)
        │                                   │
        │ usado por componentes de landing  │ usado por teste de integridade
        ▼                                   ▼
SocialProofBar / WellbeingScrollStory /   src/lib/claims.test.ts
MoodCheckIn / TestimonialsSection ...      (roda em `npm test` → parte do gate)
        │
        └─ getApprovedClaim(id) → texto aprovado, ou fallback honesto
```

Enforcement: a integridade do registro é verificada por teste (falha o
`npm run quality`). O `security-gate.mjs` adiciona uma checagem leve de presença
(registry + lib existem) para o invariante não sumir silenciosamente.

## Components and Interfaces

### `src/lib/claims.ts`
- Tipos: `ClaimCategory`, `ClaimStatus`, `ClaimSource`, `ClaimEntry`.
- `validateRegistry(entries: ClaimEntry[]): string[]` — puro; retorna lista de
  erros (vazia = ok). Regras: id único; campos obrigatórios; `approved` exige
  `source.url|document` e `expiresAt` futuro; `testimonial` aprovado exige
  `source.document` (consentimento); `license` aprovado exige `source.document`.
- `getClaim(id): ClaimEntry | undefined`.
- `getApprovedClaim(id, now?): { text: string; source: ClaimSource } | null` —
  retorna null para inexistente/`draft`/`rejected`/`expired`/sem prova.

### `src/content/claims-registry.ts`
- `CLAIMS: ClaimEntry[]` — inventário inicial dos claims regulados da landing.
- Os claims sem prova entram como `draft`/`rejected` (não `approved`), então
  `getApprovedClaim` retorna null e a UI usa o fallback honesto.

### Componentes de landing (fase de limpeza)
- `SocialProofBar`: remover/qualificar "WCAG 2.2"; "Baseado em Yale" vira
  descrição de inspiração (não endosso).
- `WellbeingScrollStory` / `MoodCheckIn` / `InteractiveToolsShowcase`: métricas de
  efeito sem fonte aprovada ("58%", "87%", "23%", "3.401 alunos", "47
  instituições") removidas ou trocadas por linguagem qualitativa com citação
  quando houver.
- `TestimonialsSection`: rotular claramente como "exemplos ilustrativos" (não
  "Depoimentos Reais") enquanto não houver depoimentos com consentimento no
  registro.

## Data Models

```ts
type ClaimCategory = "metric" | "social_proof" | "testimonial" | "compliance_badge" | "license";
type ClaimStatus = "draft" | "approved" | "expired" | "rejected";
interface ClaimSource { type: string; url?: string; document?: string; accessedDate?: string; }
interface ClaimEntry {
  id: string;
  text: string;
  surface: string;
  category: ClaimCategory;
  source: ClaimSource;
  evidenceLevel: string;
  limitations?: string;
  owner: string;
  reviewer?: string;
  status: ClaimStatus;
  lastReviewed: string;   // ISO date
  expiresAt?: string;     // ISO date
}
```
Sem tabela/DB — registro é dado de build. Nenhuma migration.

## Correctness Properties

### Property 1: Aprovado só com prova e dentro da validade
`getApprovedClaim` só retorna texto para entradas `approved` com
`source.url|document` e `expiresAt` no futuro; caso contrário retorna null.
**Validates: Requirements 1.2, 1.3**

### Property 2: Registro íntegro ou o gate falha
`validateRegistry` retorna erro para id duplicado, campo obrigatório ausente, ou
`approved` sem prova/validade — e o registro real é validado em teste (parte do
`npm run quality`).
**Validates: Requirements 2.1, 4.3**

### Property 3: Depoimento e licença exigem documento
Uma entrada `testimonial` ou `license` com `status='approved'` sem
`source.document` é reportada como erro por `validateRegistry`.
**Validates: Requirements 2.2, 2.3**

### Property 4: Claim regulado da UI vem do registro
Os componentes de landing obtêm claims regulados via `getApprovedClaim(id)`;
claims sem aprovação não são renderizados como fato (fallback honesto).
**Validates: Requirements 3.1, 3.2**

## Error Handling

- `getApprovedClaim` para id inválido/não-aprovado → `null`; o componente mostra
  fallback (texto qualitativo ou omite o número), nunca um valor inventado.
- Registro malformado → `validateRegistry` acusa e o teste de integridade falha
  o `npm run quality` (bloqueia publicação).
- Claim `expired` → tratado como não-aprovado (força re-revisão).

## Testing Strategy

- Vitest: `validateRegistry` (duplicado, faltando campo, aprovado-sem-prova,
  testimonial/licença sem documento), `getApprovedClaim` (draft/expired/rejected
  → null; aprovado válido → texto), e um teste que valida o **registro real**
  (`CLAIMS`) — garante que nada aprovado sem prova entra.
- `security-gate.mjs`: presença de `src/content/claims-registry.ts` e
  `src/lib/claims.ts` + `src/lib/claims.test.ts`.
- Revisão manual do inventário da landing após a limpeza (fase 3).

## Fora de escopo / follow-up

- Scanner heurístico que varre todo JSX (enforcement por convenção nesta fase).
- CMS governado de claims; assinatura/h& hash de copy aprovada.
