# TRUST-1 — REGISTRO DE RISCOS

## P0 — Bloqueantes para piloto

| # | Risco | Evidência | Status |
|---|---|---|---|
| R01 | **Migration defeituosa aplicada (`20260727120000`):** `get_school_metrics` referenciava `e.school_id` inexistente em `engagement_events`. Migration corretiva (`20260731100000`) criada e aplicada, mas ambas coexistem no histórico. | Comprovado no ambiente (erro em produção) + corrigido com PR #44. | Corrigido parcialmente — a migration original permanece com código defeituoso no histórico. Reconciliação necessária na TRUST-1.1. |
| R02 | **engagement_events aceita INSERT direto com `organization_id` arbitrário.** A policy `"Users can log own engagement"` valida apenas `user_id = auth.uid()`. O usuário pode gravar evento em organização alheia. | Comprovado no código (migration `20260725100000`). | Aberto. Tratar na TRUST-1.4. |
| R03 | **Typecheck pode ser vazio.** `tsc --noEmit` sem `-p tsconfig.app.json` pode verificar zero arquivo se `tsconfig.json` raiz usa apenas `references`. | Registrado em documentação; não verificado em runtime. | Aberto. Verificar na TRUST-1.5. |
| R04 | **Tipos Supabase desatualizados.** Múltiplas RPCs usam `as never` cast (`get_my_payment_history`, `request_subscription_cancellation`, `claim_escolar_subscription`, `claim_escolar_with_token`), indicando que o schema gerado não reflete as migrations aplicadas. | Comprovado no código. | Aberto. Tratar na TRUST-1.5. |
| R05 | **Sem ambiente de staging.** Toda migration é aplicada diretamente em produção. Não há como ensaiar rollback nem validar schema sem afetar dados reais. | Comprovado (docs e operação). | Bloqueio aceito — piloto com mitigação. |
| R06 | **Consentimento parental é auto-declarado pelo adolescente.** `record_guardian_consent` é chamado na sessão do próprio estudante. Não existe verificação independente pelo responsável (token, página separada, email de confirmação). | Comprovado no código (`GuardianConsentPage.tsx`, `AuthPage.tsx`). | Aberto. Tratar na TRUST-1.6. |

## P1 — Importantes mas não bloqueantes imediatos

| # | Risco | Evidência | Status |
|---|---|---|---|
| R07 | **41 migrations acumuladas sem reconciliação.** Inclui migrations auto-geradas pelo Lovable (UUIDs), migrations defeituosas corrigidas por outras, e duplicação de objetos (CREATE + DROP + CREATE). | Comprovado no código (listagem). | Aberto. Tratar na TRUST-1.1. |
| R08 | **Duas migrations com UUID auto-gerado (`20260728*`)** — provavelmente geradas pelo Lovable, conteúdo não classificado. Podem conter alterações não previstas pelo código. | Registrado; conteúdo não verificado. | Verificar na TRUST-1.1. |
| R09 | **Secrets `PUBLIC_SITE_URL` e `RESEND_API_KEY` não configurados.** O reenvio de convite grava o evento no ledger mas o e-mail não sai. A interface informa "Convite reenviado" baseada no ledger, mas nenhum e-mail chega. | Comprovado em documentação (NEXT_ACTION, .env.example). | Aberto. Decisão: o que dizer na interface quando o e-mail não pode sair? |
| R10 | **`eligible_universe` trafega no payload de `get_school_metrics`.** Quando `analytics_suppressed = true`, a contagem exata de alunos elegíveis aparece na resposta, o que pode violar o espírito da supressão para n < 5. | Comprovado no código da RPC. | Aberto. Tratar na TRUST-1.2. |
| R11 | **NPS aceita INSERT direto.** `nps_responses` tem policy de INSERT para authenticated, permitindo score arbitrário e `organization_id` não validado no servidor. | Comprovado no código (migration `20260725100000`). | Aberto. Tratar na TRUST-1.4. |
| R12 | **Dois vocabulários de papel no banco sem verificação cruzada.** Uma rota pode ser alcançada pelo papel de `profiles.roles` (manager/teacher) enquanto a operação institucional exige membership (org_admin). Combinações inconsistentes podem existir. | Comprovado no código (D29, RequireRole vs RequireInstitutionalRole). | Aberto. Mapear na TRUST-1.3/1.4. |

## P2 — Dívidas técnicas registradas

| # | Risco | Evidência | Status |
|---|---|---|---|
| R13 | Testes de banco são estruturais (leem SQL) e não executam em Postgres real. | Comprovado no código (`ux3-migration-invariants.test.ts`). | Aceito para este ciclo. |
| R14 | `/admin/operacao` não existe como rota separada. Landing provisória vive em `/admin`. | Comprovado no código (D58). | Aceito. |
| R15 | `school_admin` com múltiplas escolas não tem item de menu para escola (omitido por design). | Comprovado no código (D70). | Aceito. |
| R16 | Build não verifica edge functions (Deno) — só o frontend (Vite/TSC). | Comprovado (CI só roda `npm run quality`). | Aceito para este ciclo. |
