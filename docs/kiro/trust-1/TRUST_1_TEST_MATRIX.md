# TRUST-1 — MATRIZ DE TESTES

301 testes em 24 arquivos. Todos passando no commit-base `7e09493`.

## Cobertura por domínio

| Domínio | Arquivo | Testes | O que cobre |
|---|---|---|---|
| Privacidade | `metric-privacy.test.ts` | 17 | Supressão N≥5, subtração, export, limiar canônico |
| Navegação | `dashboard-navigation.test.ts` | 24 | Dedupe, href dinâmico, future, papéis |
| Papéis/Home | `role-home.test.ts` | 27 | Resolução, anti-laço, school path, precedência |
| Shell | `RoleAwareAppShell.test.tsx` | 15 | Redirect, contexto, skeleton, error |
| Viewports | `shell-viewports.test.tsx` | 20 | Responsividade 320-1440 |
| Estados | `dashboard-states.test.tsx` | 23 | Skeleton, empty, error, denied, demo |
| Decisões | `DecisionQueue.test.tsx` | 11 | Mutação, dupla submissão, desfechos |
| Itens da fila | `decision-queue-items.test.ts` | 29 | Derivação, privacidade de e-mail, 2 leituras, canResend |
| Reenvio | `invitation-resend.test.ts` | 14 | Limite 3, janela 24h, estados terminais |
| Ações | `useDecisionActions.test.ts` | 7 | Tradução 42501/22023, três desfechos |
| Migration SQL | `ux3-migration-invariants.test.ts` | 26 | Estrutura do SQL, append-only, privilégios |
| Redirect | `redirect.test.ts` | 8 | Open redirect, /auth loop |
| Auth profile | `auth-profile.test.ts` | 5 | Parse de roles |
| Analytics | `analytics.test.ts` | 3 | Sanitize metadata |
| Consentimento | `guardian-consent.test.ts` | 5 | Fluxo, timeout |
| RequireFeature | `RequireFeature.test.tsx` | 3 | Rota feature-gated |
| RequireConsent | `RequireGuardianConsent.test.tsx` | 6 | Gate de consentimento |
| Claims | `claims.test.ts` | 4 | Claim parsing |
| Claim escolar | `claim-escolar.test.ts` | 3 | Fluxo de claim |
| E-mail templates | `email-templates.test.ts` | 2 | Template rendering |
| Pricing | `school-pricing.test.ts` | 4 | Calculadora B2B |
| Supabase key | `supabase-key.test.ts` | 1 | Key validation |
| Timeout | `with-timeout.test.ts` | 3 | Timeout utility |
| Birth date | `BirthDateCompletionPage.test.tsx` | 3 | Fluxo de nascimento |

## Lacunas identificadas para TRUST-1

| Lacuna | Relevância | Corte |
|---|---|---|
| Zero teste de isolamento cross-tenant (usuário A vê dados de org B) | P0 | TRUST-1.4 |
| Zero teste de spoofing de engagement_event (org_id arbitrário) | P0 | TRUST-1.4 |
| Zero teste de NPS com org_id arbitrário | P1 | TRUST-1.4 |
| Typecheck pode não verificar código real | P0 | TRUST-1.5 |
| Zero teste do consentimento com responsável independente | P0 | TRUST-1.6 |
| Testes de banco são parsing de SQL, não execução em Postgres | P2 | Aceito |
| Zero teste de contexto (troca de org durante query em andamento) | P1 | TRUST-1.3 |
| Zero teste de `eligible_universe` no payload quando suprimido | P1 | TRUST-1.2 |
| Edge functions (Deno) sem qualquer teste automatizado | P2 | Fora de escopo TRUST-1 |
