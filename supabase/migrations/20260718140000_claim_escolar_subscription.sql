-- Fecha o gap escolar pré-cadastro (Req 2.3 da Onda 1): o gestor pagou sem
-- conta (purchase_intents kind='escolar', status='approved', user_id NULL), e
-- agora, autenticado, reivindica a assinatura paga. Abordagem A (match por
-- e-mail), segura POR CONSTRUÇÃO: o e-mail é lido de auth.users (nunca do
-- cliente) e precisa estar CONFIRMADO (email_confirmed_at IS NOT NULL), então
-- não depende da configuração global de confirmação de e-mail do projeto.
-- Idempotente; concede o papel manager só aqui (servidor).

CREATE OR REPLACE FUNCTION public.claim_escolar_subscription()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _confirmed_at timestamptz;
  _intent public.purchase_intents%ROWTYPE;
  _plan_id uuid;
  _period_end timestamptz;
  _org_name text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT email, email_confirmed_at INTO _email, _confirmed_at
  FROM auth.users WHERE id = _uid;

  -- Segurança por construção: sem e-mail confirmado, nenhuma associação.
  IF _confirmed_at IS NULL OR _email IS NULL OR trim(_email) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'email_unconfirmed');
  END IF;

  -- Intent escolar paga, ainda não associada, do MESMO e-mail (case-insensitive).
  SELECT * INTO _intent
  FROM public.purchase_intents
  WHERE kind = 'escolar'
    AND status = 'approved'
    AND user_id IS NULL
    AND lower(trim(contact_email)) = lower(trim(_email))
  ORDER BY updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_claimable_intent');
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

  -- Idempotência: só cria a organização se o gestor ainda não tiver uma.
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

  -- Papel de gestor (concedido só aqui, no servidor).
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'manager')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Marca a intent como associada (não pode ser reivindicada de novo).
  UPDATE public.purchase_intents
  SET user_id = _uid, updated_at = now()
  WHERE id = _intent.id;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'INSERT', 'organization_subscriptions', 'escolar_claim_association',
    jsonb_build_object('scope_type', 'self', 'intent_id', _intent.id), 1);

  RETURN jsonb_build_object('ok', true, 'reason', 'associated', 'org_name', _org_name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_escolar_subscription() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_escolar_subscription() TO authenticated;

-- VERIFICAÇÃO (rodar após aplicar):
-- SELECT has_function_privilege('anon', 'public.claim_escolar_subscription()', 'EXECUTE');          -- false
-- SELECT has_function_privilege('authenticated', 'public.claim_escolar_subscription()', 'EXECUTE'); -- true
