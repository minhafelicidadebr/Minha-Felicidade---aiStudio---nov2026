# CLAUDE.md — App Yale / Felicidade.lab (handoff técnico 360°)

> Documento de orientação para quem assume este repositório (Claude Code ou humano).
> Escrito após a entrega da **Onda 1 (Monetização)** e dos ganhos rápidos de
> pós-compra. Leia isto ANTES de codar.

> ⚠️ **Correção de procedência (2026-07-18).** Partes deste documento foram
> herdadas de um repositório/projeto irmão (`app-curso-yale-vscode`, Supabase
> `fzglidwuqlnteceicwfd`) e **não** descrevem este repositório. Valores
> **verificados para ESTE repo**:
> - Repositório: `minhafelicidadebr/yale-minhafelicidade-julho`.
> - Supabase project ref (de `supabase/config.toml`): **`ctjwyybmlwhynherikqy`**.
> - App publicado (de `index.html`): `curso-felicidade-adolescentes-yale.lovable.app`.
> - As afirmações de "validado em produção" da §6 referem-se ao projeto irmão
>   `fzglidwuqlnteceicwfd` e **não foram verificadas para `ctjwyybmlwhynherikqy`**.
>   Trate a produção deste projeto como **não confirmada** até validar no painel.

---

## 1. O que é o produto

Edtech de bem-estar emocional para **adolescentes brasileiros**, adaptando o
curso "The Science of Well-Being" (Yale, Laurie Santos) + PERMA-V. Instituto
Felicidade para Todos. B2C (aluno individual) + B2B (escolas).

Repo: `minhafelicidadebr/yale-minhafelicidade-julho` · branch principal: `main`.

## 2. Stack & comandos

- **Front:** React 18 + Vite + TypeScript + **npm** (não bun/yarn) + shadcn/ui +
  Tailwind 3. Testes: **Vitest**.
- **Back:** Supabase gerenciado pelo **Lovable Cloud** (project ref
  `ctjwyybmlwhynherikqy`, conforme `supabase/config.toml`) + **Deno edge
  functions** (`supabase/functions/`).
- **Gate de qualidade (definição de "pronto"):**
  ```bash
  npm run quality
  # = audit:security && lint && typecheck && test && build && security:gate
  ```
  Está **verde** hoje (48 testes). Nunca use `--no-verify`, nunca comente teste
  que passou a falhar. `security:gate` = `scripts/security-gate.mjs` (checagens
  de invariante customizadas — leia antes de mexer em auth/billing/roles).

## 3. Como o deploy REALMENTE funciona (pegadinhas críticas)

Este projeto roda no **Lovable Cloud**, que gerencia o Supabase por baixo. Três
gotchas aprendidas na marra — **essenciais**:

1. **Migrations NÃO são aplicadas automaticamente** ao dar push no GitHub. Os
   arquivos em `supabase/migrations/` chegam ao repo, mas o schema do banco só
   muda quando aplicado **manualmente** (SQL editor do Lovable) ou pedindo ao
   agente do Lovable. Sintoma clássico de esquecimento: erro `PGRST205`
   ("table not found") numa edge function.
2. **Edge functions NÃO são deployadas automaticamente** via git. Funções novas
   aparecem como arquivo mas ficam ausentes em Cloud → Edge functions até serem
   publicadas (pelo agente do Lovable ou publish). Sintoma: função "não existe".
3. **O banco de produção pode estar sem seed.** `subscription_plans` estava
   **vazia** em produção — tivemos que semear via SQL editor e conceder
   `GRANT SELECT ... TO anon, authenticated`. Sempre confirme dados+grants antes
   de assumir que uma tabela "existe e é legível".

Após aplicar DDL manual, rode `NOTIFY pgrst, 'reload schema';` para evitar cache
stale do PostgREST.

**Publish:** mudanças em `main` só aparecem no site publicado após clicar
**Publish** no Lovable. O `client.ts` tem fallback com URL+anon key hardcoded
(o Lovable adicionou) para o build publicado não quebrar sem as envs `VITE_`.

## 4. Invariantes de segurança (NÃO NEGOCIÁVEIS)

Ver `.kiro/steering/doutrina-fable5.md` e `docs/security-invariants-runbook.md`.

- **Nunca confiar no cliente:** preço, `plan_slug`, `org_id`, `user_id`
  resolvidos no servidor. O gate falha se `amount_brl_cents` vier do body.
- **Estado de assinatura só via servidor:** `user_subscriptions` /
  `organization_subscriptions` NÃO têm policy de `INSERT`/`UPDATE` para
  `authenticated`. A única escritora é a RPC `activate_subscription_from_intent`
  (`SECURITY DEFINER`, `EXECUTE` só `service_role`), chamada pela `mp-webhook`.
- **Toda função `SECURITY DEFINER`:** `SET search_path = public` +
  `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` + `GRANT` só ao papel certo,
  com query de verificação (`has_function_privilege`) comentada.
- **Service role key:** proibida em toda fonte de runtime EXCETO
  `supabase/functions/_shared/mercadopago.ts` (allow-list explícito no
  `security-gate.mjs`), que é OBRIGADO pelo gate a conter a verificação HMAC do
  webhook — privilégio e proteção amarrados no mesmo teste.
- **Ledgers imutáveis:** onde há padrão INSERT-only (consent, data_access_logs,
  purchase_intents), estado é derivado por leitura; não invente coluna mutável.
- **Honestidade > overclaim:** documente os 20% que faltam; nunca prometa
  conformidade legal nem cobrança recorrente que não existe.

## 5. Arquitetura de monetização (Onda 1 — ENTREGUE e em produção)

Fluxo: `PricingSection`/`SubscriptionPage`/`SchoolCalculator` → `src/lib/checkout.ts`
→ edge `mp-create-preference` (resolve preço no servidor, cria `purchase_intents`,
cria preferência no Mercado Pago Checkout Pro) → usuário paga → MP chama
`mp-webhook` (verifica HMAC → busca pagamento na API do MP → chama a RPC
`activate_subscription_from_intent`, idempotente por `mp_payment_id`) → ativa
`user_subscriptions`/`organization_subscriptions` → páginas `/assinatura/sucesso`
e `/assinatura/pendente` confirmam via `get_my_plan` (nunca pela URL).

Peças-chave:
- Tabela `purchase_intents` (service_role-only, índice único parcial em
  `mp_payment_id` = idempotência).
- RPC `activate_subscription_from_intent(uuid, text, text)`.
- `_shared/mercadopago.ts` (service client + HMAC + API MP) e
  `_shared/school-pricing.ts` (ESPELHO 1:1 de `src/lib/school-pricing.ts` — a
  tabela de preço escolar vive nos dois; se mudar num, mude no outro).
- Modelo v1 = **cobrança única por ciclo** (renovação = novo checkout). NÃO é
  recorrência automática.

## 6. Estado em produção (⚠️ do projeto irmão — ver nota de procedência no topo)

> Os itens abaixo foram verificados no projeto irmão `fzglidwuqlnteceicwfd`
> (`app-curso-yale-vscode`), NÃO no projeto deste repo (`ctjwyybmlwhynherikqy`).
> Reconfirme no painel antes de assumir que valem aqui.

- ✅ **Ciclo de pagamento completo funciona em produção** — validado com um Pix
  real que ativou uma assinatura Intermediário (`status=active`, renovação +1 mês).
- Secrets configurados no Lovable Cloud: `MERCADO_PAGO_ACCESS_TOKEN` (produção,
  `APP_USR-`), `MERCADO_PAGO_WEBHOOK_SECRET` (produção), `PUBLIC_SITE_URL`
  (`https://app-curso-yale-vscode.lovable.app`). **Falta:** `RESEND_API_KEY`.
- Webhook do MP configurado apontando para
  `https://fzglidwuqlnteceicwfd.supabase.co/functions/v1/mp-webhook`.
- `subscription_plans` semeada (free/intermediate 2900/advanced 5900) e legível.
- ⚠️ **Sandbox do MP é instável** (cartão de teste recusado, "Ops"); produção
  funciona. Para testar em sandbox exige usuário de teste comprador + janela
  anônima.

## 7. Histórico do que foi feito

- **Onda 0:** consentimento parental LGPD art. 14
  (`guardian_consent_events`, `record_guardian_consent`,
  `get_my_guardian_consent_status`, `RequireGuardianConsent`) — **na main**.
  ✅ **Protocolo de crise da IA JÁ está na main** — `_shared/crisis.ts` +
  injeção nas 4 funções de IA foram mergeados (PR #1 `feat/onda0-protocolo-crise`,
  commit `f144d53`), junto com os disclaimers/transparência de IA. A informação
  anterior ("não está na main") estava desatualizada.
- **Correções de consentimento (2026-07):** o gate `RequireGuardianConsent`
  passou a ser **fail-closed** (PR #1 deste repo, `fix(consent): fail closed…`,
  commit `f68ee89`) e ganhou um caminho self-service para contas legadas sem
  `birth_date` (PR #2, `fix(consent): unblock legacy accounts…`, commit
  `8dbf59a`, migration `20260718120000_set_my_birth_date.sql`). ⚠️ Essa
  migration **ainda precisa ser aplicada** no Supabase `ctjwyybmlwhynherikqy`
  (SQL editor) + `NOTIFY pgrst, 'reload schema';` para o desbloqueio funcionar.
- **Onda 1 (Monetização):** completa, mergeada (PR #2), em produção. Runbook de
  teste em `docs/mercadopago-sandbox-runbook.md`.
- **Ganhos rápidos de pós-compra:** CTA de plano no `Navbar`, card de plano no
  `DashboardPage`, recursos por plano (`src/lib/plan-features.ts`) na landing e
  em `/subscription`, tradução PT dos erros de auth (`src/lib/auth-errors.ts`).

## 8. Pendências e próximos passos

1. **Publish no Lovable** para os ganhos rápidos + erros PT irem ao ar (estão em
   `main`, ainda não publicados no site quando este doc foi escrito).
2. **Onda 1.5 — Pós-compra & Gestão de Assinatura** (spec pronto, ver §9):
   e-mail transacional (Resend, via outbox idempotente), lembrete de renovação,
   dunning/expiração, cancelamento self-service, feature discovery, **histórico
   "Faturas e pagamentos"** (RPC `get_my_payment_history` self-scoped).
3. **Aplicar a migration de consentimento legado** `20260718120000_set_my_birth_date.sql`
   no Supabase `ctjwyybmlwhynherikqy` + `NOTIFY pgrst, 'reload schema';` e validar o
   fluxo `/completar-cadastro` (o protocolo de crise da Onda 0 já foi mergeado —
   não é mais pendência).
4. **Gap escolar pré-cadastro (Req 2.3 da Onda 1):** associação organização↔conta
   após o gestor se cadastrar NÃO está implementada; intent fica `approved` com
   `user_id` nulo para reconciliação manual.
5. **Rate limiting em `mp-create-preference`** (pública; fluxo escolar sem JWT) —
   follow-up não-bloqueante (risco de ruído, não financeiro).
6. **Trilha estratégica "Billing Maduro":** migrar cobrança única → recorrente
   (MP preapproval/Stripe) para destravar método de pagamento editável,
   renovação automática, faturas reais e **Nota Fiscal (B2B)**. Sem isso, NÃO
   crie botão "editar cartão"/"editar faturamento" (seria overclaim).

## 9. Especificações (`.kiro/specs/`)

- `onda-1-monetizacao/` — Onda 1 (concluída; tasks marcadas; Task 10 sandbox
  pendente de credenciais). 
- `pos-compra-assinatura/` — Onda 1.5 (pronta para execução; formato validado:
  requirements/design/tasks com dependency graph em JSON).
- `onda-2-instrumentacao/` — Onda 2 (funil de conversão): spec completa,
  implementação ainda **não iniciada** (0% de código).
- `consentimento-conta-legada/` — follow-up do fail-closed: desbloqueio
  self-service de contas legadas sem `birth_date`. **Implementada e mergeada**
  (PR #2 / `8dbf59a`); falta só aplicar a migration no Supabase.

Steering sempre incluído: `.kiro/steering/doutrina-fable5.md` (doutrina de
segurança/ética) e `.kiro/steering/contexto-produto.md` (schema de assinaturas,
onde o preço aparece na UI, o que não tocar).

## 10. Como continuar (workflow)

1. Leia a doutrina e o contexto de produto em `.kiro/steering/`.
2. Trabalhe em **branch nova** (`feat/...`), nunca direto na `main` (embora o
   Lovable também commite direto na main — cuidado com divergência; dê
   `git pull --ff-only origin main` antes de começar).
3. Uma tarefa por vez; ao fim de cada uma, `npm run quality` **verde**.
4. Toda migration nova entra no fim de `docs/security-invariants-runbook.md`.
5. Lembre das gotchas da §3: aplicar migration + deployar function + conferir
   seed/grants no Lovable — o push por si só NÃO faz isso.
6. Não modifique `_shared/crisis.ts` (quando mergeado), o fluxo de
   `guardian_consent_events`/`RequireGuardianConsent`, nem `ai_usage_limits`.
7. Ao terminar uma onda, mergeie via PR e deixe o founder revisar o diff contra
   os invariantes antes do merge na `main`.

## 11. Mapa rápido de arquivos

- Monetização: `supabase/functions/mp-create-preference/`, `mp-webhook/`,
  `_shared/mercadopago.ts`, `_shared/school-pricing.ts`, `src/lib/checkout.ts`,
  `src/lib/school-pricing.ts`, `src/pages/Subscription*Page.tsx`,
  `supabase/migrations/20260708120000_purchase_intents.sql`,
  `20260708120500_activate_subscription_from_intent.sql`.
- Pós-compra (ganhos rápidos): `src/components/Navbar.tsx`,
  `src/pages/DashboardPage.tsx`, `src/lib/plan-features.ts`,
  `src/lib/auth-errors.ts`.
- Segurança: `scripts/security-gate.mjs`, `docs/security-invariants-runbook.md`,
  `supabase/tests/`, `supabase/verification/`.
