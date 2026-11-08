# COMMERCIAL_GATES — gates comerciais

## P0.0 — Guardrails de marca/PI/conteúdo externo: **APROVADO** (2026-07)
Ver histórico completo em DECISIONS.md. Rótulo "Recurso externo" implementado nos players de
vídeo. Pendências menores no backlog (não bloqueiam o P0 principal): renomear domínio público
com "yale" (manual), auditoria verbatim da base da IA, nome do canal por vídeo.

## ONDA 1 — Corte 1.1: Entitlement canônico

### Achado (evidência anterior)
- `get_my_plan()` (RPC `SECURITY DEFINER`, `SET search_path=public`, REVOKE de
  PUBLIC/anon/authenticated + GRANT a `authenticated`) já resolve plano individual → organização
  → gratuito, com fonte única (`subscription_plans.features`/`limits`). **Isso já estava correto.**
- **Gap real:** nada usava essa fonte para proteger rotas. `FeatureGate.tsx` existe mas não era
  usado em NENHUMA página. As rotas premium (`/simulator`, `/debate`, `/poetry`, `/codesign`,
  `/evidence`, `/mindmap`, `/challenge21`, `/hypothesis`, `/missions`) estavam em `privateRoutes`
  protegidas só por `RequireAuth` + `RequireGuardianConsent` — **qualquer conta autenticada
  digitando a URL acessava a ferramenta**, mesmo no plano gratuito.
- Bug adicional: `FeatureGate` e o gate inline de `ModulePage` liberavam o conteúdo enquanto
  `loading === true` (fail-open durante o carregamento do plano).

### Implementado
- `src/components/routing/RequireFeature.tsx` (novo): guarda de rota que usa `useSubscription()`
  (→ `get_my_plan()` server-side) e substitui a rota inteira por redirect para `/subscription`
  quando a feature não está no plano resolvido. Fail-closed durante loading (não desbloqueia).
- `src/App.tsx`: `PrivateRoute` ganhou campo opcional `feature`; rotas de ferramenta premium
  (`evidence`, `simulator`, `debate`, `poetry`, `codesign`, `mindmap`, `challenge21`,
  `hypothesis`, `missions`) agora exigem a feature canônica correspondente do schema de planos
  antes de renderizar. Literal exigido pelo `security-gate.mjs` para `RequireRole` preservado
  intacto.
- `src/components/FeatureGate.tsx`: corrigido fail-open — enquanto `loading`, mostra um spinner
  neutro em vez de liberar o conteúdo.

### Critério de aceite
"Nenhuma função premium pode ser usada apenas digitando sua URL." → **atendido** para as 9 rotas
listadas acima. `dashboard`, `quiz`, `flashcards`, `breathing`, `lifewheel`, `gratitude`,
`memory`, `emotions`, `alegria` permanecem abertas a qualquer conta autenticada por design (fazem
parte do plano gratuito ou têm limite próprio, ex. `alegria_9`).

### Testes
`src/components/routing/RequireFeature.test.tsx` (novo, 3 casos): bloqueia sem a feature
(redireciona `/subscription`), libera com a feature, fail-closed sem sessão. Comando:
`npx vitest run src/components/routing/RequireFeature.test.tsx` → 3 passed.

### Gate da onda
`npm run quality`: 83 testes (13 arquivos), lint `--max-warnings 0`, typecheck, build, security
gate — **verde**.

### Riscos restantes (backlog)
- `ModulePage.tsx` (`moduleAllowed`) tem o mesmo padrão de fail-open durante `subLoading` (evita
  duplicar lógica — corrigir junto de um próximo corte no ModulePage, não incluído aqui para não
  ampliar o escopo deste corte vertical).
- `/module/:id` continua sem `RequireFeature` — o gate de "só Módulo 1 no gratuito" já existe
  inline (`moduleAllowed`) e funciona; não migrado para `RequireFeature` nesta rodada.
- Falta corte 1.2 (integridade de assinatura — proteção contra manipulação client-side de
  status/vigência/assentos) e corte 1.3 (limites de IA centralizados) do plano master.
