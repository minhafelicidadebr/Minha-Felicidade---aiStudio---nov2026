# Implementation Plan: Truth & Evidence Registry

## Overview

Branch nova (`feat/claims-registry`), nunca direto na `main`. `npm run quality`
verde a cada tarefa. Começo faseado: registro + validador + gate primeiro; depois
a limpeza honesta da copy da landing.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1], "description": "Lib: tipos + validador + leitor (puro, testado)" },
    { "wave": 2, "tasks": [2], "description": "Registro seed dos claims atuais + teste de integridade" },
    { "wave": 3, "tasks": [3, 4], "description": "Limpeza honesta da copy da landing (usar getApprovedClaim / rebaixar)" },
    { "wave": 4, "tasks": [5], "description": "Gate de presença + docs + quality" }
  ]
}
```

## Tasks

- [x] 1. Lib `src/lib/claims.ts` (+ testes)
  - Tipos `ClaimCategory/ClaimStatus/ClaimSource/ClaimEntry`; `validateRegistry`
    (puro), `getClaim`, `getApprovedClaim(id, now?)`.
  - Testes: duplicado, campo faltando, aprovado-sem-prova, testimonial/licença
    sem documento; getApprovedClaim (draft/expired/rejected → null; válido → texto).
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3 · Properties 1, 2, 3_

- [x] 2. Registro `src/content/claims-registry.ts` + teste de integridade
  - `CLAIMS: ClaimEntry[]` com o inventário atual da landing. Claims sem prova
    entram como `draft`/`rejected` (nunca `approved`).
  - Teste que roda `validateRegistry(CLAIMS)` e exige zero erros (integra o gate
    via `npm test`).
  - _Requirements: 2.1, 4.1, 4.3 · Property 2_

- [x] 3. Limpeza da landing — badges e Yale
  - `SocialProofBar.tsx`: remover/qualificar "WCAG 2.2" (sem auditoria);
    "Baseado em Yale" → linguagem de inspiração curricular, sem endosso.
  - _Requirements: 3.3, 3.4_

- [x] 4. Limpeza da landing — métricas e depoimentos
  - Métricas de efeito sem fonte aprovada removidas/qualificadas em
    `WellbeingScrollStory.tsx`, `MoodCheckIn.tsx`, `InteractiveToolsShowcase.tsx`
    ("58%", "87%", "23%", "3.401 alunos", "47 instituições").
  - `TestimonialsSection.tsx`: rotular como "exemplos ilustrativos" (não
    "Depoimentos Reais") enquanto não houver depoimento com consentimento.
  - Onde fizer sentido, obter o texto via `getApprovedClaim(id)`.
  - _Requirements: 3.1, 3.2_

- [x] 5. Gate de presença + docs + quality
  - `security-gate.mjs`: exigir `src/content/claims-registry.ts`, `src/lib/claims.ts`
    e `src/lib/claims.test.ts`.
  - Documentar o registro no `docs/security-invariants-runbook.md`.
  - `npm run quality` completo verde.
  - _Requirements: 4.2, 4.3_

## Notes

- Não altera `_shared/crisis.ts`, consentimento, pagamento nem invariantes de
  segurança (Requirement 4.2).
- Fase única de código; a curadoria/aprovação de claims com fonte real é trabalho
  humano posterior (mudar `status` para `approved` com `source`).
- Follow-up: scanner de JSX, CMS governado, hash de copy aprovada.

