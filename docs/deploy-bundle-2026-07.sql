-- =============================================================================
-- BUNDLE DE DEPLOY — Julho/2026  (colar no SQL Editor do Lovable/Supabase)
-- Projeto: ctjwyybmlwhynherikqy
-- =============================================================================
-- As 6 migrations pendentes, na ORDEM correta de aplicação. Tudo é idempotente
-- (CREATE OR REPLACE / IF NOT EXISTS / DROP ... IF EXISTS), então rodar o
-- arquivo inteiro de uma vez é seguro e pode ser repetido sem efeito colateral.
-- Ao final há `NOTIFY pgrst, 'reload schema';` e um bloco de VERIFICAÇÃO
-- (comentado) para conferir os grants.
--
-- Este arquivo é uma CONVENIÊNCIA de deploy (espelha as migrations do repo);
-- a fonte de verdade continua sendo supabase/migrations/*.sql.
-- =============================================================================


-- =============================================================================
-- [1/6] 20260718120000_set_my_birth_date.sql
-- Desbloqueio de contas legadas (data de nascimento ausente).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_my_birth_date(_birth_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _current date;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF _birth_date IS NULL
     OR _birth_date >= current_date
     OR date_part('year', age(now(), _birth_date)) >= 120 THEN
    RAISE EXCEPTION 'Invalid birth_date' USING ERRCODE = '22023';
  END IF;

  SELECT birth_date INTO _current FROM public.profiles WHERE user_id = _uid;

  IF _current IS NOT NULL THEN
    RAISE EXCEPTION 'birth_date already set' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles SET birth_date = _birth_date WHERE user_id = _uid;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'UPDATE', 'profiles.birth_date', 'lgpd_art14_age_determination',
          jsonb_build_object('scope_type', 'self'), 1);

  RETURN jsonb_build_object('birth_date', _birth_date);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_my_birth_date(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_birth_date(date) TO authenticated;


-- =============================================================================
-- [2/6] 20260718130000_landing_events.sql
-- Tabela write-only de eventos do funil (Onda 2).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.landing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN (
    'signup', 'activation', 'lesson_completed',
    'paywall_hit', 'checkout_started', 'upgrade'
  )),
  session_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS landing_events_kind_created_at_idx
  ON public.landing_events (kind, created_at);
CREATE INDEX IF NOT EXISTS landing_events_session_id_idx
  ON public.landing_events (session_id);

ALTER TABLE public.landing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert landing events" ON public.landing_events;
CREATE POLICY "Anyone can insert landing events"
  ON public.landing_events FOR INSERT TO anon, authenticated
  WITH CHECK (jsonb_typeof(metadata) = 'object');

REVOKE SELECT, UPDATE, DELETE ON public.landing_events FROM anon, authenticated;
GRANT SELECT ON public.landing_events TO service_role;


-- =============================================================================
-- [3/6] 20260718131000_get_funnel_overview.sql
-- RPC agregada do funil (teacher/manager).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_funnel_overview(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _min_sample integer := 5;
  _days_safe integer := LEAST(GREATEST(COALESCE(_days, 30), 1), 365);
  _counts jsonb;
BEGIN
  IF NOT (public.has_my_role('teacher') OR public.has_my_role('manager')) THEN
    RAISE EXCEPTION 'insufficient_permissions' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_object_agg(kind, cnt) INTO _counts
  FROM (
    SELECT kind, count(DISTINCT session_id) AS cnt
    FROM public.landing_events
    WHERE created_at > now() - make_interval(days => _days_safe)
    GROUP BY kind
  ) t;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (auth.uid(), 'SELECT', 'landing_events', 'funnel_overview',
    jsonb_build_object('days', _days_safe), 0);

  RETURN jsonb_build_object(
    'counts', COALESCE(_counts, '{}'::jsonb),
    'min_sample', _min_sample,
    'days', _days_safe
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_funnel_overview(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_funnel_overview(integer) TO authenticated;


-- =============================================================================
-- [4/6] 20260718132000_upgrade_event_on_activation.sql
-- Reproduz activate_subscription_from_intent + evento 'upgrade' server-side.
-- (Requer a tabela landing_events do passo [2/6].)
-- =============================================================================

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

  INSERT INTO public.landing_events (kind, session_id, user_id, metadata)
  VALUES (
    'upgrade',
    COALESCE(_intent.user_id, gen_random_uuid()),
    _intent.user_id,
    jsonb_build_object('plan_slug', _intent.plan_slug, 'intent_kind', _intent.kind)
  );

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

REVOKE EXECUTE ON FUNCTION public.activate_subscription_from_intent(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription_from_intent(uuid, text, text) TO service_role;


-- =============================================================================
-- [5/6] 20260718140000_claim_escolar_subscription.sql
-- Claim escolar por e-mail confirmado (abordagem A).
-- =============================================================================

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

  IF _confirmed_at IS NULL OR _email IS NULL OR trim(_email) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'email_unconfirmed');
  END IF;

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
  VALUES (_uid, 'INSERT', 'organization_subscriptions', 'escolar_claim_association',
    jsonb_build_object('scope_type', 'self', 'intent_id', _intent.id), 1);

  RETURN jsonb_build_object('ok', true, 'reason', 'associated', 'org_name', _org_name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_escolar_subscription() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_escolar_subscription() TO authenticated;


-- =============================================================================
-- [6/6] 20260718150000_escolar_claim_token.sql
-- Claim escolar por token (abordagem B) + coluna claim_token + CHECK do outbox.
-- =============================================================================

ALTER TABLE public.purchase_intents
  ADD COLUMN IF NOT EXISTS claim_token uuid NOT NULL DEFAULT gen_random_uuid();

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


-- =============================================================================
-- RELOAD do cache de schema do PostgREST (obrigatório após aplicar DDL)
-- =============================================================================
NOTIFY pgrst, 'reload schema';


-- =============================================================================
-- VERIFICAÇÃO (opcional) — rode este bloco separadamente após aplicar.
-- Esperado entre parênteses.
-- =============================================================================
-- SELECT has_function_privilege('anon',          'public.set_my_birth_date(date)', 'EXECUTE');            -- false
-- SELECT has_function_privilege('authenticated', 'public.set_my_birth_date(date)', 'EXECUTE');            -- true
-- SELECT has_function_privilege('authenticated', 'public.get_funnel_overview(integer)', 'EXECUTE');       -- true
-- SELECT has_function_privilege('anon',          'public.get_funnel_overview(integer)', 'EXECUTE');       -- false
-- SELECT has_function_privilege('authenticated', 'public.claim_escolar_subscription()', 'EXECUTE');       -- true
-- SELECT has_function_privilege('authenticated', 'public.claim_escolar_with_token(uuid)', 'EXECUTE');     -- true
-- SELECT has_table_privilege('anon', 'public.landing_events', 'INSERT');                                  -- true
-- SELECT has_table_privilege('anon', 'public.landing_events', 'SELECT');                                  -- false
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'purchase_intents' AND column_name = 'claim_token';                                -- 1 linha
