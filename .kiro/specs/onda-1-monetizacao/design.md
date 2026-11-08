# Design — Onda 1: Monetização (Mercado Pago)

## Visão geral

```
Cliente                Edge Functions              Banco (Lovable Cloud)
───────                ──────────────              ─────────────────────
PricingSection /
SchoolCalculator /
SubscriptionPage
   │ chama
   ▼
supabase.functions
  .invoke("mp-create-preference")
                          │ resolve plano/preço no servidor
                          │ cria intent + preferência MP
                          ▼
                    purchase_intents (insert)
                          │
                          ▼
              Mercado Pago Checkout Pro (init_point)
                          │ usuário paga
                          ▼
              MP chama mp-webhook (notificação)
                          │ verifica HMAC
                          │ busca pagamento na API do MP
                          │ chama RPC ────────────────▶ activate_subscription_from_intent()
                          │                                  │ lock da intent (FOR UPDATE)
                          │                                  │ idempotente por mp_payment_id
                          │                                  ├─▶ user_subscriptions (upsert)
                          │                                  └─▶ organization_subscriptions (upsert)
```

## Nova tabela: `purchase_intents`

Mesmo papel de `wave_invites`/`org_invites` já existentes no projeto: ponte
de curta duração entre "alguém iniciou uma ação" e "o servidor confirma".
Sem policy de cliente nenhuma — só a edge function (via service role) lê e
escreve.

```sql
CREATE TABLE public.purchase_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_reference uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  kind text NOT NULL CHECK (kind IN ('individual', 'escolar')),
  user_id uuid REFERENCES auth.users(id), -- null no fluxo escolar pré-cadastro (Requirement 2.3)
  plan_slug text NOT NULL,
  billing_interval text NOT NULL CHECK (billing_interval IN ('monthly','yearly')),
  seats_students integer,           -- só kind='escolar'
  seats_schools integer,            -- só kind='escolar'
  contact_email text,               -- só kind='escolar' pré-cadastro
  contact_name text,
  amount_brl_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  mp_preference_id text,
  mp_payment_id text,               -- preenchido no webhook; UNIQUE garante idempotência
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX purchase_intents_mp_payment_id_idx
  ON public.purchase_intents (mp_payment_id) WHERE mp_payment_id IS NOT NULL;

ALTER TABLE public.purchase_intents ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy de cliente: leitura/escrita só via service_role (edge functions).
REVOKE ALL ON public.purchase_intents FROM anon, authenticated;
GRANT ALL ON public.purchase_intents TO service_role;
```

## RPC: `activate_subscription_from_intent`

`SECURITY DEFINER`, chamada só pelo webhook (service role). Espelha o padrão
já usado em `submit_wave_response`/`provision_organization_from_invite` do
produto irmão: `SELECT ... FOR UPDATE` trava a intent, checa idempotência
pelo `mp_payment_id` já gravado, e só então escreve.

Assinatura: `activate_subscription_from_intent(p_external_reference uuid, p_mp_payment_id text, p_mp_status text) RETURNS jsonb`

Lógica:
1. `SELECT * FROM purchase_intents WHERE external_reference = p_external_reference FOR UPDATE`. Não encontrado → retorna `{ok: false, reason: 'intent_not_found'}`.
2. Se `mp_payment_id` já gravado igual a `p_mp_payment_id` e `status='approved'` → retorna `{ok: true, reason: 'already_processed'}` sem tocar em nada mais (idempotência, Requirement 3.3).
3. Se `p_mp_status <> 'approved'` → `UPDATE purchase_intents SET status = CASE p_mp_status WHEN 'rejected' THEN 'rejected' ELSE 'pending' END, mp_payment_id = p_mp_payment_id, updated_at = now()`; retorna sem alterar assinatura (Requirement 3.4).
4. Se aprovado:
   - `kind = 'individual'`: resolve `plan_id` de `subscription_plans` pelo `plan_slug` da intent; `INSERT ... ON CONFLICT (user_id) DO UPDATE` em `user_subscriptions` (status='active', billing_interval, current_period_end = now() + interval conforme billing_interval, external_subscription_id = p_mp_payment_id).
   - `kind = 'escolar'`: se `user_id` presente, upsert em `organization_subscriptions` (owner_id=user_id, max_seats=seats_students, plan_id do slug 'advanced'); se `user_id` NULL (pré-cadastro, Requirement 2.3), grava só `status='approved'` na intent — a associação da organização acontece quando o gestor completar o cadastro (fora de escopo desta RPC; ver Task 6 sobre fluxo de retomada).
   - `UPDATE purchase_intents SET status='approved', mp_payment_id=p_mp_payment_id`.
5. Todo caminho grava em `data_access_logs` (mesmo padrão das demais RPCs do projeto).

```sql
REVOKE EXECUTE ON FUNCTION public.activate_subscription_from_intent(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription_from_intent(uuid, text, text) TO service_role;
```

## Calculadora escolar server-side (Requirement 2.1)

Antes de escrever, **leia `src/components/landing/SchoolCalculator.tsx`** e
`.lovable/plan.md` §1.4 para extrair a tabela de faixas/descontos exata que a
UI já promete ao usuário. Implemente como função pura testável (ex.:
`supabase/functions/_shared/school-pricing.ts`, importável tanto pela edge
function quanto por um teste unitário via Deno ou copiado como
`src/lib/school-pricing.ts` com teste Vitest espelhando o mesmo cálculo) —
**a tabela de preços deve existir em UM lugar só**, e tanto o preview no
cliente quanto a cobrança no servidor chamam essa mesma função (ou uma
versão dela reimplementada 1:1, nunca duas tabelas divergentes mantidas à
mão).

## Edge function: `mp-create-preference`

Pública, mas: fluxo individual exige JWT válido (Requirement 1.2 — resolve
`user_id` do JWT, nunca do payload); fluxo escolar aceita chamada sem JWT
(gestor ainda sem conta) mas exige `contact_email`/`contact_name`.

Request: `{ kind: 'individual' | 'escolar', plan_slug?, billing_interval, seats_students?, seats_schools?, contact_email?, contact_name? }`

1. Valida `kind`. Individual: extrai `user_id` do JWT (Supabase auth), valida `plan_slug` contra `subscription_plans` ativo, preço = `price_monthly` ou `price_yearly` conforme `billing_interval` (cobrança única do ciclo — ver "fora de escopo" no requirements.md).
2. Escolar: valida `seats_students`/`seats_schools`, calcula preço com a função pura da seção anterior.
3. Insere `purchase_intents`, cria preferência no Checkout Pro do MP (mesmo formato de `items`/`payer`/`external_reference`/`notification_url`/`back_urls` já comprovado no produto irmão), atualiza a intent com `mp_preference_id`, retorna `{ checkout_url }`.
4. Erros de credencial do MP retornam mensagem clara (reaproveitar a checagem `getTokenKind`/erro `PA_UNAUTHORIZED_RESULT_FROM_POLICIES` já validada no produto irmão).

## Edge function: `mp-webhook`

Pública. Verifica HMAC exatamente como o produto irmão (`x-signature`/
`x-request-id` contra `MERCADO_PAGO_WEBHOOK_SECRET`, rejeita com 401 se
ausente/inválido — Requirement 3.1/3.2). Busca o pagamento na API do MP pelo
id, chama `activate_subscription_from_intent`. Loga mas não falha em
notificações de tipo diferente de `payment` (retorna 200 `ignored`).

## Client

- `src/lib/checkout.ts` (novo): `startIndividualCheckout(planSlug, billingInterval)` e `startEscolarCheckout(payload)` — chamam `supabase.functions.invoke("mp-create-preference", ...)` e fazem `window.location.href = checkout_url`. Se não autenticado (individual), redireciona para `/auth?redirect=...` preservando a intenção em query string ou `sessionStorage` (Requirement 1.2).
- `PricingSection.tsx` e `SubscriptionPage.tsx`: botão "Assinar Agora" passa a chamar `startIndividualCheckout` em vez de só navegar.
- `SchoolCalculator.tsx`: CTA de contratar chama `startEscolarCheckout`.
- Novas páginas `src/pages/SubscriptionSuccessPage.tsx` e `SubscriptionPendingPage.tsx` (rotas `/assinatura/sucesso`, `/assinatura/pendente`) — nunca afirmam ativação só pelo parâmetro de URL (Requirement 5.1); chamam `get_my_plan()` e mostram estado "processando" se o plano ainda não refletir a mudança, com um retry leve (poll curto, poucas tentativas).

## Secrets necessários (configurar no Supabase/Lovable Cloud, nunca commitar)

`MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`. Documentar isso
no `docs/security-invariants-runbook.md` ao final da onda.
