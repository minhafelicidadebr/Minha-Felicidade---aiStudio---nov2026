# WORKLOG (curto)

## 2026-07 · P0.0 — Guardrails marca/PI/conteúdos externos
- Inventário por buscas direcionadas: `Yale`, `Coursera|Laurie Santos|Science of Well-Being`,
  `oficial|parceria|licenciad|endossad|certificad`.
- Ocorrências públicas críticas corrigidas (P0):
  - `index.html`: description/keywords/schema/og/twitter → linguagem independente, sem "baseado
    em Yale"; keyword "Yale" removida.
  - `src/components/landing/CourseStructure.tsx`: "Da Dra. Laurie Santos para você" → framing
    independente.
  - `src/pages/ConstellationPage.tsx`: "Da sala de Yale para sua tela" / "O conteúdo vem de Yale"
    / "o que alunos de Yale fazem" → material autoral com referência, sem alegação de origem/endosso.
  - `src/components/Footer.tsx`: adicionado aviso de independência institucional (site-wide);
    removido badge "WCAG 2.2".
- Docs criados: `P0_0_GUARDRAILS_MARCA_PI_CONTEUDOS_EXTERNOS.md`, `CONTENT_PROVENANCE.md`,
  `PROJECT_TRUTH.md`, `COMMERCIAL_GATES.md`, `DECISIONS.md`, `WORKLOG.md`, `NEXT_ACTION.md`.
- NÃO tocado: prompts de IA, protocolo de crise, consentimento, planos, edge functions.
- Gate: `npm run quality` (resultado registrado na entrega).

## 2026-07 · Fechamento do P0.0 — rótulo "Recurso externo"
- Criado `src/components/learning/ExternalResourceNotice.tsx`.
- Aplicado em `src/pages/ModulePage.tsx`: painel persistente de vídeo + modal de fallback.
- `CONTENT_PROVENANCE.md` e `COMMERCIAL_GATES.md` atualizados: pendência resolvida, gate P0.0 → **aprovado**.
- `npm run quality`: 80 testes, lint, typecheck, build, security gate — verde.

## 2026-07 · ONDA 1 Corte 1.1 — Entitlement canônico
- Criado `src/components/routing/RequireFeature.tsx` + teste (3 casos).
- `src/App.tsx`: campo `feature` em `PrivateRoute`; 9 rotas de ferramenta premium passam a exigir
  a feature canônica (evidence, simulator, debate, poetry, codesign, mindmap, challenge21,
  hypothesis, missions) antes de renderizar.
- `src/components/FeatureGate.tsx`: corrigido fail-open durante loading (mostrava conteúdo antes
  de resolver o plano).
- Ajuste de segurança: primeira versão do App.tsx quebrou `scripts/security-gate.mjs` (checa
  literal de `RequireRole`); corrigido preservando o literal exato.
- `npm run quality`: 83 testes, lint, typecheck, build, security gate — verde.

## 2026-07 · ONDA 1 Corte 1.2 — Integridade da assinatura
- Auditoria por buscas direcionadas: `user_subscriptions` ok (sem policy de INSERT/UPDATE para
  authenticated). `organization_subscriptions` **tinha** policy de UPDATE para `authenticated`
  (owner_id podia alterar plan/status/seats/vigência pelo client).
- Migration `20260722190000_drop_org_subscriptions_update_policy.sql`: remove essa policy.
- Runbook atualizado (item 21).
- `npm run quality`: 83 testes, lint, typecheck, build, security gate — verde.

## 2026-07 · ONDA 1 Corte 1.3 — Limites de IA centralizados
- Achado: `enforce_ai_usage_limit` aplicava 80/dia pra TODOS (hardcoded), independente do plano.
  Plano gratuito promete 9/dia; premium promete ilimitado. Inconsistência.
- Migration `20260722200000_ai_limits_from_plan.sql`: aledria-chat agora lê
  `get_my_plan()->'limits'->'alegria_daily'`. Se -1 = ilimitado (sem contar). Fallback = 9.
- Runbook atualizado (item 22).
- `npm run quality`: verificar.

## 2026-07 · ONDA 1 Corte 1.4 — Idade e consentimento
- `set_my_birth_date`: confirmada single-fill (ok).
- `guardian_consent_events`: ledger imutável confirmado (ok).
- `get_my_guardian_consent_status`: SECURITY DEFINER, self-scoped (ok).
- **GAP:** policy "Users can update own profile" permitia alterar `birth_date` diretamente.
- Migration `20260722210000_protect_birth_date_immutable.sql`: trigger que impede alteração de
  `birth_date` uma vez preenchida. Runbook item 23.
- `npm run quality`: verificar.
