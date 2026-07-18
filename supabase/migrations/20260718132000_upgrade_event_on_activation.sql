-- Onda 2 Task 7 — a ativação de assinatura passa a registrar o evento de funil
-- 'upgrade' no servidor (fonte de verdade), independente de o cliente continuar
-- na página. CREATE OR REPLACE reproduz a função vigente (Onda 1 + enqueue de
-- boas-vindas da Onda 1.5) com o ÚNICO acréscimo do INSERT em landing_events.
-- Idempotência preservada: a reentrega do webhook retorna cedo em
-- 'already_processed', então o evento 'upgrade' é inserido no máximo uma vez.

CREATE OR REPLACE FUNCTION public.activate_subscription_from_intent(
  p_external_reference uuid,
  p_mp_payment_id text,
  p_mp_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _intent public.purchase_intents%ROWTYPE;
  _plan_id uuid;
  _period_end timestamptz;
  _org_name text;
  _is_pre_signup boolean;
  _recipient_email text;
BEGIN
  IF p_external_reference IS NULL OR trim(COALESCE(p_mp_payment_id, '')) = '' THEN
    RAISE EXCEPTION 'external_reference and mp_payment_id are required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO _intent
  FROM public.purchase_intents
  WHERE external_reference = p_external_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
    VALUES (NULL, 'UPDATE', 'purchase_intents', 'mp_webhook_activation',
      jsonb_build_object('reason', 'intent_not_found', 'external_reference', p_external_reference), 0);
    RETURN jsonb_build_object('ok', false, 'reason', 'intent_not_found');
  END IF;

  IF _intent.mp_payment_id IS NOT NULL
     AND _intent.mp_payment_id = p_mp_payment_id
     AND _intent.status = 'approved' THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_processed');
  END IF;

  IF p_mp_status <> 'approved' THEN
    UPDATE public.purchase_intents
    SET status = CASE p_mp_status WHEN 'rejected' THEN 'rejected' ELSE 'pending' END,
        mp_payment_id = p_mp_payment_id,
        updated_at = now()
    WHERE id = _intent.id;

    INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
    VALUES (_intent.user_id, 'UPDATE', 'purchase_intents', 'mp_webhook_activation',
      jsonb_build_object('reason', 'not_approved', 'mp_status', p_mp_status, 'kind', _intent.kind), 0);
    RETURN jsonb_build_object('ok', true, 'reason', 'not_approved', 'mp_status', p_mp_status);
  END IF;

  _period_end := CASE _intent.billing_interval
    WHEN 'yearly' THEN now() + interval '1 year'
    ELSE now() + interval '1 month'
  END;

  IF _intent.kind = 'individual' THEN
    IF _intent.user_id IS NULL THEN
      RAISE EXCEPTION 'individual intent is missing user_id' USING ERRCODE = '22023';
    END IF;

    SELECT id INTO _plan_id
    FROM public.subscription_plans
    WHERE slug = _intent.plan_slug AND is_active = true;
    IF _plan_id IS NULL THEN
      RAISE EXCEPTION 'unknown or inactive plan_slug: %', _intent.plan_slug USING ERRCODE = '22023';
    END IF;

    UPDATE public.user_subscriptions
    SET plan_id = _plan_id,
        status = 'active',
        billing_interval = _intent.billing_interval,
        current_period_start = now(),
        current_period_end = _period_end,
        cancel_at_period_end = false,
        external_subscription_id = p_mp_payment_id,
        updated_at = now()
    WHERE user_id = _intent.user_id;

    IF NOT FOUND THEN
      INSERT INTO public.user_subscriptions (
        user_id, plan_id, status, billing_interval,
        current_period_start, current_period_end, external_subscription_id
      )
      VALUES (
        _intent.user_id, _plan_id, 'active', _intent.billing_interval,
        now(), _period_end, p_mp_payment_id
      );
    END IF;

  ELSIF _intent.kind = 'escolar' THEN
    SELECT id INTO _plan_id
    FROM public.subscription_plans
    WHERE slug = 'advanced' AND is_active = true;
    IF _plan_id IS NULL THEN
      RAISE EXCEPTION 'advanced plan not found for escolar activation' USING ERRCODE = 'P0002';
    END IF;

    IF _intent.user_id IS NOT NULL THEN
      _org_name := COALESCE(NULLIF(trim(_intent.contact_name), ''), 'Organização');

      UPDATE public.organization_subscriptions
      SET plan_id = _plan_id,
          status = 'active',
          billing_interval = _intent.billing_interval,
          max_seats = COALESCE(_intent.seats_students, max_seats),
          current_period_start = now(),
          current_period_end = _period_end,
          external_subscription_id = p_mp_payment_id,
          updated_at = now()
      WHERE owner_id = _intent.user_id;

      IF NOT FOUND THEN
        INSERT INTO public.organization_subscriptions (
          organization_name, plan_id, owner_id, status, billing_interval,
          max_seats, current_period_start, current_period_end, external_subscription_id
        )
        VALUES (
          _org_name, _plan_id, _intent.user_id, 'active', _intent.billing_interval,
          COALESCE(_intent.seats_students, 30), now(), _period_end, p_mp_payment_id
        );
      END IF;
    END IF;

  ELSE
    RAISE EXCEPTION 'unknown intent kind: %', _intent.kind USING ERRCODE = '22023';
  END IF;

  _is_pre_signup := (_intent.kind = 'escolar' AND _intent.user_id IS NULL);

  UPDATE public.purchase_intents
  SET status = 'approved', mp_payment_id = p_mp_payment_id, updated_at = now()
  WHERE id = _intent.id;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (
    _intent.user_id, 'INSERT',
    CASE _intent.kind WHEN 'individual' THEN 'user_subscriptions' ELSE 'organization_subscriptions' END,
    'mp_webhook_activation',
    jsonb_build_object(
      'reason', 'activated', 'kind', _intent.kind,
      'plan_slug', _intent.plan_slug, 'pre_signup', _is_pre_signup
    ),
    CASE WHEN _is_pre_signup THEN 0 ELSE 1 END
  );

  -- NOVO (Onda 2 Task 7): evento de funil 'upgrade', server-side (fonte de
  -- verdade). session_id é NOT NULL: usa o user_id quando existe, senão um uuid
  -- sintético (pré-cadastro escolar). Sem PII no metadata.
  INSERT INTO public.landing_events (kind, session_id, user_id, metadata)
  VALUES (
    'upgrade',
    COALESCE(_intent.user_id, gen_random_uuid()),
    _intent.user_id,
    jsonb_build_object('plan_slug', _intent.plan_slug, 'intent_kind', _intent.kind)
  );

  -- Enfileira o e-mail de boas-vindas (best-effort, idempotente — Onda 1.5).
  IF _intent.kind = 'individual' THEN
    SELECT email INTO _recipient_email FROM auth.users WHERE id = _intent.user_id;
  ELSE
    _recipient_email := COALESCE(
      NULLIF(trim(_intent.contact_email), ''),
      (SELECT email FROM auth.users WHERE id = _intent.user_id)
    );
  END IF;

  IF _recipient_email IS NOT NULL AND _recipient_email <> '' THEN
    INSERT INTO public.notification_outbox (kind, recipient_email, user_id, payload, dedupe_key)
    VALUES (
      'subscription_welcome', _recipient_email, _intent.user_id,
      jsonb_build_object(
        'plan_slug', _intent.plan_slug,
        'billing_interval', _intent.billing_interval,
        'period_end', _period_end
      ),
      'welcome:' || p_mp_payment_id
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'reason', CASE WHEN _is_pre_signup THEN 'approved_pending_association' ELSE 'activated' END,
    'kind', _intent.kind
  );
END;
$$;

-- Grants inalterados (a função continua service_role-only).
REVOKE EXECUTE ON FUNCTION public.activate_subscription_from_intent(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription_from_intent(uuid, text, text) TO service_role;
