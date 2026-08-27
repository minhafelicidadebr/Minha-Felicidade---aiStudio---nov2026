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
| R17 | **Credencial em claro no repositório.** Migration `20260706192738` continha senha em texto claro (valor omitido). Repo público no GitHub. | Comprovado no código. | ✅ **SANEADO (TRUST-1.1B).** Conta não existia em produção — risco era documental. Arquivo saneado com no-op. Ver `TRUST_1_R17_INCIDENT_RECEIPT.md`. |

## Descobertos e tratados na TRUST-1.1B

| # | Risco | Severidade | Evidência | Status |
|---|---|---|---|---|
| R18 | **A sequência histórica nunca foi testada desde zero.** `20260706192545` inseria em `user_roles` com `user_id` literais que referenciam `auth.users`. Em banco vazio a FK falhava (SQLSTATE 23503) na 11ª de 42 migrations. Consequência: banco não reconstruível, staging por replay impossível, onboarding de dev novo quebrado. | P0 | **Comprovado no ambiente** — falha real do reset local. | ✅ **RESOLVIDO.** `user_id` passou a ser derivado de `auth.users` por e-mail. Nome e timestamp do arquivo preservados. 43 migrations aplicam desde zero. |
| R19 | **Docker Engine não operacional no host.** | P0 | Comprovado no ambiente. | ✅ **RESOLVIDO.** Server 29.6.2, context `desktop-linux`. |
| R20 | **`resend_invitation` nunca funcionou.** Chamava `digest()` sem qualificar schema. pgcrypto vive em `extensions` e a função é pinada em `SET search_path = public` por exigência da doutrina — a chamada nunca resolveu. Abortava em toda invocação, antes de escrever. Consumidor ativo: botão "Reenviar convite" da `DecisionQueue`. **Vale para produção também**, não é artefato local. | P0 | **Comprovado no ambiente** — execução real da RPC (teste T15). | ✅ **CORRIGIDO** na migration reconciliada (`extensions.digest`), com `search_path` pinado preservado. Verificado em execução: 1º reenvio passa, 2º imediato é bloqueado pelo cooldown de 24h. Travado por teste de invariante. |
| R21 | **Policy de leitura do ledger é inerte.** `"Org admins read decision events"` existe em `institutional_decision_events`, mas `authenticated` não tem `GRANT SELECT`. RLS restringe um privilégio existente; não concede. Efeito prático hoje: nenhum (nenhum cliente lê a tabela; as RPCs escrevem como `postgres`). O que existe é divergência entre intenção declarada e estado efetivo. | P1 | **Comprovado no ambiente** — privilégios de tabela consultados. | 🟡 **ABERTO POR DECISÃO.** Dois desfechos não equivalentes: conceder SELECT numa tabela de auditoria (alargamento de privilégio sem consumidor) ou remover a policy e ler por RPC dedicada (padrão de `guardian_consent_events`). É decisão de contrato, não correção mecânica. Recomendação técnica: a segunda. Ver `evidence/finding-03-ledger-policy-sem-grant.md`. |
| R22 | **Schema remoto continua inferido, não consultado.** Todas as afirmações sobre o lado C do schema diff derivam de comportamento em runtime e leitura de migrations, não de consulta ao catálogo do Postgres remoto. | P1 | Registrado em documentação. | **Aberto.** Exige credencial de leitura do remoto, não usada nesta onda (produção intocada). |

### Atualização de riscos anteriores pela TRUST-1.1B

| # | Mudança |
|---|---|
| R01 | **Contido.** O estado final de `get_school_metrics` é o correto e a migration reconciliada **aborta** se a versão defeituosa estiver aplicada. A original permanece no histórico, por imutabilidade. |
| R05 | **Mitigado, não resolvido.** Existe agora um staging local reproduzível e documentado (`supabase db reset --local`, portas 55321-55329). Continua não existindo staging **remoto**. |
| R07 | **Compreendido.** As 42 migrations foram provadas reconstruíveis; as duplicações (D5, D6) são inócuas por idempotência. |
| R08 | **Classificado.** `20260728194005`/`20260728194702` são contaminantes de outro produto. Estado final limpo: nenhum resíduo. |
| R13 | **Parcialmente pago.** Além dos testes estruturais, esta onda executou 17 testes SQL/RLS contra Postgres real. Eles ainda não rodam no CI (exigiriam Docker no runner) — dívida remanescente. |
