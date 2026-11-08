# Deploy Checklist — Julho/2026 (consentimento, instrumentação, escolar, segurança)

Consolida as pendências humanas dos PRs #1–#8 (todos já em `main`). Nada aqui é
aplicado por `git push`: no Lovable Cloud, migrations e edge functions são
aplicadas/deployadas **manualmente**. Aplique nesta ordem.

**Projeto Supabase deste repo:** `ctjwyybmlwhynherikqy` (de `supabase/config.toml`).
Não confundir com o projeto irmão `fzglidwuqlnteceicwfd` citado (desatualizado)
em partes antigas do `CLAUDE.md`.

## 1. Migrations (SQL Editor, nesta ordem)

Aplique em ordem de timestamp. Todas são idempotentes quando possível.

1. `supabase/migrations/20260718120000_set_my_birth_date.sql`
   — desbloqueio de contas legadas (RPC self-scoped, preenchimento único).
2. `supabase/migrations/20260718130000_landing_events.sql`
   — tabela write-only de eventos do funil.
3. `supabase/migrations/20260718131000_get_funnel_overview.sql`
   — RPC agregada do funil (teacher/manager).
4. `supabase/migrations/20260718132000_upgrade_event_on_activation.sql`
   — reproduz `activate_subscription_from_intent` + evento `upgrade`.
5. `supabase/migrations/20260718140000_claim_escolar_subscription.sql`
   — claim escolar por e-mail confirmado (abordagem A).
6. `supabase/migrations/20260718150000_escolar_claim_token.sql`
   — claim escolar por token (abordagem B) + coluna `claim_token` + amplia CHECK
   de `notification_outbox.kind`.

Após aplicar todas:

```sql
NOTIFY pgrst, 'reload schema';
```

### Verificação rápida (esperado entre parênteses)

```sql
-- Grants das RPCs novas
SELECT has_function_privilege('anon',          'public.set_my_birth_date(date)', 'EXECUTE');            -- false
SELECT has_function_privilege('authenticated', 'public.set_my_birth_date(date)', 'EXECUTE');            -- true
SELECT has_function_privilege('authenticated', 'public.get_funnel_overview(integer)', 'EXECUTE');       -- true
SELECT has_function_privilege('anon',          'public.get_funnel_overview(integer)', 'EXECUTE');       -- false
SELECT has_function_privilege('authenticated', 'public.claim_escolar_subscription()', 'EXECUTE');       -- true
SELECT has_function_privilege('authenticated', 'public.claim_escolar_with_token(uuid)', 'EXECUTE');     -- true

-- landing_events é write-only para o cliente
SELECT has_table_privilege('anon', 'public.landing_events', 'INSERT');  -- true
SELECT has_table_privilege('anon', 'public.landing_events', 'SELECT');  -- false

-- coluna e CHECK do outbox
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'purchase_intents' AND column_name = 'claim_token';  -- 1 linha
```

## 2. Edge Functions (deploy/publish)

Deploye as funções alteradas (as demais não mudaram):

- `admin-dashboard` — passa a incluir `funnel` (Onda 2).
- `mp-create-preference` — rate limiting (`assertCheckoutRateLimit`).
- `mp-webhook` — enfileira o e-mail de claim escolar por token.

Módulos `_shared` novos/alterados vão junto com as funções que os importam:
`_shared/checkout-rate-limit.ts`, `_shared/email-templates.ts`.

## 3. Secrets (painel — NUNCA commitar)

- `RESEND_API_KEY` (+ `RESEND_FROM_EMAIL` opcional) — **pendente**. Sem ela, os
  e-mails (boas-vindas, lembretes, e o **código de associação escolar**) ficam
  enfileirados em `notification_outbox`, mas não são entregues.
- `NOTIFICATIONS_TRIGGER_SECRET` — para acionar `process-notifications` e
  `subscription-lifecycle` (cron).
- Já configurados (produção): `MERCADO_PAGO_ACCESS_TOKEN`,
  `MERCADO_PAGO_WEBHOOK_SECRET`, `PUBLIC_SITE_URL`. Confirmar que apontam para
  este projeto (`ctjwyybmlwhynherikqy`).

## 4. Cron (Lovable/Supabase Scheduled)

- `process-notifications` — a cada 5–15 min (esvazia a fila de e-mail).
- `subscription-lifecycle` — 1x/dia (lembretes + expiração).
Ambos com header `x-trigger-secret: <NOTIFICATIONS_TRIGGER_SECRET>`.

## 5. Publish no Lovable

Clicar **Publish** para o front (rejeição de `sb_secret_`, `/completar-cadastro`,
painel de funil, botões de claim escolar) ir ao ar no site publicado.

## 6. Validação manual pós-deploy

- **Consentimento legado:** conta sem `birth_date` → `/completar-cadastro` →
  informa data → adulto acessa; menor cai em `/consentimento-responsavel`.
- **Funil:** inserir alguns eventos, abrir `/admin`, ver contagens; confirmar que
  `anon` não faz `SELECT` em `landing_events`.
- **Claim escolar A:** pagar escolar pré-cadastro (sandbox) → cadastrar com o
  MESMO e-mail (confirmado) → "Associar assinatura escolar" → plano vira
  organização; repetir não duplica.
- **Claim escolar B:** usar o código do e-mail `escolar_claim` com um e-mail
  DIFERENTE → associa; código inválido → mensagem clara.
- **Rate limit:** disparar >5 checkouts do mesmo requisitante em 10 min → 429.

## Nota de segurança

Enquanto as migrations não forem aplicadas, tudo degrada com segurança: gates de
consentimento fail-closed, funil `null` no painel, claims retornam erro sem
ativar nada, rate limit fail-open. Nenhuma mudança ativa algo destrutivo sozinha.
