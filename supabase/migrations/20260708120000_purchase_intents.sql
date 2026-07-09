-- Onda 1 (monetização) — tabela-ponte entre "usuário iniciou um checkout" e
-- "o servidor confirmou o pagamento". Mesmo papel de curta duração que outras
-- tabelas de intenção/convite do schema: nenhuma policy de cliente, leitura e
-- escrita exclusivamente via service_role (edge functions mp-create-preference
-- e mp-webhook). O estado da assinatura NUNCA é escrito a partir daqui pelo
-- cliente — só a RPC activate_subscription_from_intent (migration seguinte),
-- chamada pelo webhook com a service role key, ativa uma assinatura.

CREATE TABLE IF NOT EXISTS public.purchase_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- external_reference é o identificador enviado ao Mercado Pago e devolvido
  -- na notificação; é por ele que o webhook reencontra a intent.
  external_reference uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  kind text NOT NULL CHECK (kind IN ('individual', 'escolar')),
  -- null no fluxo escolar pré-cadastro (Requirement 2.3): o gestor pode iniciar
  -- o checkout antes de ter conta; a associação org<->conta é um passo posterior.
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_slug text NOT NULL,
  billing_interval text NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
  seats_students integer,            -- somente kind='escolar'
  seats_schools integer,             -- somente kind='escolar'
  contact_email text,                -- somente kind='escolar' pré-cadastro
  contact_name text,                 -- somente kind='escolar' pré-cadastro
  -- preço resolvido NO SERVIDOR (nunca aceito do cliente), em centavos de BRL.
  amount_brl_cents integer NOT NULL CHECK (amount_brl_cents >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  mp_preference_id text,
  -- preenchido no webhook; o índice único parcial abaixo garante idempotência:
  -- a mesma notificação de pagamento reentregue não ativa a assinatura 2x.
  mp_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotência (Requirement 3.3): um pagamento do MP só pode estar ligado a
-- uma intent. Índice parcial porque mp_payment_id é NULL enquanto pendente.
CREATE UNIQUE INDEX IF NOT EXISTS purchase_intents_mp_payment_id_idx
  ON public.purchase_intents (mp_payment_id)
  WHERE mp_payment_id IS NOT NULL;

ALTER TABLE public.purchase_intents ENABLE ROW LEVEL SECURITY;

-- Sem NENHUMA policy de cliente: anon/authenticated não leem nem escrevem.
-- Toda interação acontece via service_role dentro das edge functions.
REVOKE ALL ON public.purchase_intents FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.purchase_intents TO service_role;

-- VERIFICAÇÃO (rodar após aplicar):
-- SELECT has_table_privilege('anon', 'public.purchase_intents', 'SELECT');          -- false
-- SELECT has_table_privilege('authenticated', 'public.purchase_intents', 'SELECT'); -- false
-- SELECT has_table_privilege('authenticated', 'public.purchase_intents', 'INSERT'); -- false
-- SELECT has_table_privilege('service_role', 'public.purchase_intents', 'INSERT');  -- true
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'purchase_intents';           -- true
