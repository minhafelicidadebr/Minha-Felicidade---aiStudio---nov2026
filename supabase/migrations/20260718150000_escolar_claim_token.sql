-- Onda "escolar claim" — abordagem B (token). Complementa a abordagem A
-- (match por e-mail confirmado, migration 20260718140000): permite reivindicar
-- a assinatura escolar paga usando um CÓDIGO (claim_token) enviado ao
-- contact_email após o pagamento — útil quando o gestor cria a conta com um
-- e-mail DIFERENTE do checkout. O token é a prova de compra (entregue ao inbox
-- do contact_email), então o match não depende de o e-mail da conta bater.

-- 1. Token de reivindicação por intent (default cobre linhas existentes).
ALTER TABLE public.purchase_intents
  ADD COLUMN IF NOT EXISTS claim_token uuid NOT NULL DEFAULT gen_random_uuid();

-- 2. Amplia o CHECK do outbox para aceitar o e-mail de claim escolar.
ALTER TABLE public.notification_outbox DROP CONSTRAINT IF EXISTS notification_outbox_kind_check;
ALTER TABLE public.notification_outbox ADD CONSTRAINT notification_outbox_kind_check
  CHECK (kind IN (
    'subscription_welcome',
    'renewal_reminder',
    'payment_failed',
    'subscription_expired',
    'subscription_canceled',
    'escolar_claim'
  ));

-- 3. RPC: reivindicar por token (self-scoped). O token prova a compra; não
-- exige que o e-mail da conta bata com o contact_email (é o caso de uso do B).
CREATE OR REPLACE FUNCTION public.claim_escolar_with_token(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _intent public.purchase_intents%ROWTYPE;
  _plan_id uuid;
  _period_end timestamptz;
  _org_name text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF _token IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;

  SELECT * INTO _intent
  FROM public.purchase_intents
  WHERE kind = 'escolar'
    AND status = 'approved'
    AND user_id IS NULL
    AND claim_token = _token
  ORDER BY updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;

  SELECT id INTO _plan_id
  FROM public.subscription_plans
  WHERE slug = 'advanced' AND is_active = true;
  IF _plan_id IS NULL THEN
    RAISE EXCEPTION 'advanced plan not found for escolar association' USING ERRCODE = 'P0002';
  END IF;

  _org_name := COALESCE(NULLIF(trim(_intent.contact_name), ''), 'Organização');
  _period_end := CASE _intent.billing_interval
    WHEN 'yearly' THEN now() + interval '1 year'
    ELSE now() + interval '1 month'
  END;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_subscriptions WHERE owner_id = _uid
  ) THEN
    INSERT INTO public.organization_subscriptions (
      organization_name, plan_id, owner_id, status, billing_interval,
      max_seats, current_period_start, current_period_end, external_subscription_id
    )
    VALUES (
      _org_name, _plan_id, _uid, 'active', _intent.billing_interval,
      COALESCE(_intent.seats_students, 30), now(), _period_end, _intent.mp_payment_id
    );
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'manager')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.purchase_intents
  SET user_id = _uid, updated_at = now()
  WHERE id = _intent.id;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'INSERT', 'organization_subscriptions', 'escolar_claim_token_association',
    jsonb_build_object('scope_type', 'self', 'intent_id', _intent.id), 1);

  RETURN jsonb_build_object('ok', true, 'reason', 'associated', 'org_name', _org_name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_escolar_with_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_escolar_with_token(uuid) TO authenticated;

-- VERIFICAÇÃO (rodar após aplicar):
-- SELECT has_function_privilege('anon', 'public.claim_escolar_with_token(uuid)', 'EXECUTE');          -- false
-- SELECT has_function_privilege('authenticated', 'public.claim_escolar_with_token(uuid)', 'EXECUTE'); -- true
