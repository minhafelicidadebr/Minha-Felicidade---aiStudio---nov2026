-- ═══════════════════════════════════════════════════════════════════════════════
-- ONDA C2 / C2.R — Vínculo explícito organization_subscriptions <-> organizations,
-- ativação/renovação determinística sem consumo silencioso de pagamento,
-- resolução determinística de entitlements em get_my_plan()/get_user_plan(),
-- RLS sem recursão e enforcement transacional de assentos de estudantes em
-- todas as portas de escrita (triggers BEFORE INSERT OR UPDATE + RPCs).
--
-- Forward-only, idempotente, sem DROP ... CASCADE e preservando integralmente
-- os contratos TRUST-1.1B a TRUST-1.6.1 (incluindo notification_outbox R33/R34
-- e visibilidade/bloqueio operacional R29).
-- ═══════════════════════════════════════════════════════════════════════════════

DO $precheck$
BEGIN
  IF to_regclass('public.organization_subscriptions') IS NULL
     OR to_regclass('public.organizations') IS NULL
     OR to_regclass('public.institutional_memberships') IS NULL
     OR to_regclass('public.institutional_invitations') IS NULL
     OR to_regclass('public.notification_outbox') IS NULL THEN
    RAISE EXCEPTION 'C2: precondition failed — required institutional/billing tables missing.';
  END IF;
END;
$precheck$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Vínculo explícito organization_id em organization_subscriptions
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.organization_subscriptions
  ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.organization_subscriptions'::regclass
      AND conname = 'organization_subscriptions_organization_id_fkey'
  ) THEN
    ALTER TABLE public.organization_subscriptions
      ADD CONSTRAINT organization_subscriptions_organization_id_fkey
      FOREIGN KEY (organization_id)
      REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;
END;
$fk$;

CREATE INDEX IF NOT EXISTS organization_subscriptions_organization_id_idx
  ON public.organization_subscriptions (organization_id);

-- Backfill seguro: apenas quando o owner_id possui exatamente 1 organização ativa
-- e 1 assinatura sem organization_id preenchido (zero heurística por nome).
WITH unambiguous_owners AS (
  SELECT o.owner_id, (array_agg(o.id))[1] AS org_id
  FROM public.organizations o
  WHERE o.status = 'active'
  GROUP BY o.owner_id
  HAVING count(*) = 1
),
unambiguous_subs AS (
  SELECT os.owner_id, (array_agg(os.id))[1] AS sub_id
  FROM public.organization_subscriptions os
  WHERE os.organization_id IS NULL
  GROUP BY os.owner_id
  HAVING count(*) = 1
)
UPDATE public.organization_subscriptions os
SET organization_id = uo.org_id,
    updated_at = now()
FROM unambiguous_owners uo
JOIN unambiguous_subs us ON us.owner_id = uo.owner_id
WHERE os.id = us.sub_id
  AND os.organization_id IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. RLS DE ASSINATURAS SEM RECURSÃO (C2.R — Defeito #4)
-- Remove a referência cruzada organization_subscriptions -> organization_members
-- que formava ciclo com a policy "Org owners can manage members"
-- (organization_members -> organization_subscriptions).
-- Leitura direta de organization_subscriptions fica restrita ao owner_id e aos
-- administradores operacionais (is_org_admin) da organização vinculada; demais
-- membros consultam seu plano via get_my_plan() (SECURITY DEFINER).
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Members can view assigned org subscriptions" ON public.organization_subscriptions;
DROP POLICY IF EXISTS "Owners can view own org subscriptions" ON public.organization_subscriptions;
DROP POLICY IF EXISTS "Teachers/managers can view org subscriptions" ON public.organization_subscriptions;
DROP POLICY IF EXISTS "Owners and org admins can view org subscriptions" ON public.organization_subscriptions;

-- Tabela legada organization_members não possui leitores diretos no cliente; acesso
-- ocorre exclusivamente via get_my_plan()/get_user_plan() (SECURITY DEFINER) e service_role.
DROP POLICY IF EXISTS "Members can view own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners can manage members" ON public.organization_members;
REVOKE ALL ON TABLE public.organization_members FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organization_members TO service_role;

CREATE POLICY "Owners and org admins can view org subscriptions"
ON public.organization_subscriptions
FOR SELECT TO authenticated
USING (
  owner_id = auth.uid()
  OR (
    organization_id IS NOT NULL
    AND public.is_org_admin(organization_id)
  )
);

-- Contrato de leitura de menor privilégio compatível com RLS (C2.R — Bloqueio D)
GRANT SELECT ON TABLE public.organization_subscriptions TO authenticated;
REVOKE ALL ON TABLE public.organization_subscriptions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.organization_subscriptions FROM authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. CREATE ORGANIZATION — vincula assinatura pendente APENAS quando unívoca 1:1
-- (nunca usa coincidência de nome como identidade contratual — C2.R Defeito #3)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_organization(
  _name text,
  _slug text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
  _slug_final text;
  _sub_id uuid;
  _active_org_count integer;
  _unlinked_sub_count integer;
  _same_name_count integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF _name IS NULL OR trim(_name) = '' THEN
    RAISE EXCEPTION 'Organization name is required' USING ERRCODE = '22023';
  END IF;

  _slug_final := COALESCE(NULLIF(trim(_slug), ''), lower(regexp_replace(trim(_name), '\s+', '-', 'g')));

  -- Idempotência segura: reutiliza organização ativa com mesmo nome apenas se for única
  SELECT count(*), (array_agg(o.id))[1]
  INTO _same_name_count, _org_id
  FROM public.organizations o
  JOIN public.institutional_memberships m ON m.organization_id = o.id
  WHERE o.owner_id = _uid
    AND o.status = 'active'
    AND lower(trim(o.name)) = lower(trim(_name))
    AND m.user_id = _uid
    AND m.role = 'org_admin'
    AND m.status = 'active';

  IF _same_name_count = 1 AND _org_id IS NOT NULL THEN
    SELECT count(*) INTO _active_org_count
    FROM public.organizations o
    WHERE o.owner_id = _uid AND o.status = 'active';

    SELECT count(*) INTO _unlinked_sub_count
    FROM public.organization_subscriptions os
    WHERE os.owner_id = _uid
      AND os.organization_id IS NULL
      AND os.status IN ('active', 'trialing');

    IF _active_org_count = 1 AND _unlinked_sub_count = 1 THEN
      SELECT os.id INTO _sub_id
      FROM public.organization_subscriptions os
      WHERE os.owner_id = _uid
        AND os.organization_id IS NULL
        AND os.status IN ('active', 'trialing')
      LIMIT 1
      FOR UPDATE;

      IF _sub_id IS NOT NULL THEN
        UPDATE public.organization_subscriptions
        SET organization_id = _org_id, updated_at = now()
        WHERE id = _sub_id;

        INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
        VALUES (_uid, 'UPDATE', 'organization_subscriptions', 'associate_organization_subscription',
          jsonb_build_object('scope_type', 'self', 'organization_id', _org_id, 'linked_subscription_id', _sub_id), 1);
      END IF;
    END IF;

    RETURN jsonb_build_object('organization_id', _org_id, 'created', false);
  END IF;

  -- Cria organização
  INSERT INTO public.organizations (name, slug, owner_id)
  VALUES (trim(_name), _slug_final, _uid)
  RETURNING id INTO _org_id;

  -- Cria primeiro membership (org_admin)
  INSERT INTO public.institutional_memberships (organization_id, user_id, role, status)
  VALUES (_org_id, _uid, 'org_admin', 'active');

  SELECT count(*) INTO _active_org_count
  FROM public.organizations o
  WHERE o.owner_id = _uid AND o.status = 'active';

  SELECT count(*) INTO _unlinked_sub_count
  FROM public.organization_subscriptions os
  WHERE os.owner_id = _uid
    AND os.organization_id IS NULL
    AND os.status IN ('active', 'trialing');

  -- Auto-vínculo estritamente 1:1 (1 organização ativa do owner e 1 assinatura não vinculada).
  -- Nome de organização nunca é usado para vincular contrato financeiro.
  IF _active_org_count = 1 AND _unlinked_sub_count = 1 THEN
    SELECT os.id INTO _sub_id
    FROM public.organization_subscriptions os
    WHERE os.owner_id = _uid
      AND os.organization_id IS NULL
      AND os.status IN ('active', 'trialing')
    LIMIT 1
    FOR UPDATE;

    IF _sub_id IS NOT NULL THEN
      UPDATE public.organization_subscriptions
      SET organization_id = _org_id, updated_at = now()
      WHERE id = _sub_id;
    END IF;
  END IF;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'INSERT', 'organizations', 'create_organization',
    jsonb_build_object('scope_type', 'self', 'organization_id', _org_id, 'linked_subscription_id', _sub_id), 1);

  RETURN jsonb_build_object('organization_id', _org_id, 'created', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_organization(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization(text, text) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. ATIVAÇÃO E CLAIM DE ASSINATURA ESCOLAR (C2.R — Defeitos #2 e #3)
-- Regras:
--   • Nenhum pagamento aprovado pode ser consumido sem ativar ou renovar uma
--     assinatura válida (status = 'active' e current_period_end > now()).
--   • Se o comprador já possui exatamente 1 assinatura (mesmo expirada/cancelada
--     ou ativa) e no máximo 1 organização ativa compatível, renova/reativa essa
--     assinatura preservando vigência futura restante (se current_period_end > now(),
--     soma o novo período; se expirada, inicia em now() + _interval).
--   • Se o comprador possui múltiplas organizações ou múltiplas assinaturas,
--     cria novo contrato ativo com organization_id = NULL (sem adivinhar por nome),
--     aguardando conciliação explícita.
-- ═══════════════════════════════════════════════════════════════════════════════
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
  _interval interval;
  _period_end timestamptz;
  _org_name text;
  _linked_org_id uuid;
  _active_org_count integer := 0;
  _owner_sub_count integer := 0;
  _existing_sub public.organization_subscriptions%ROWTYPE;
  _existing_org_is_active boolean := false;
  _target_org_id uuid;
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

  _interval := CASE _intent.billing_interval
    WHEN 'yearly' THEN interval '1 year'
    ELSE interval '1 month'
  END;
  _period_end := now() + _interval;

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
        current_period_start = CASE
          WHEN status IN ('active', 'trialing') AND current_period_end IS NOT NULL AND current_period_end > now()
          THEN current_period_start
          ELSE now()
        END,
        current_period_end = CASE
          WHEN status IN ('active', 'trialing') AND current_period_end IS NOT NULL AND current_period_end > now()
          THEN current_period_end + _interval
          ELSE _period_end
        END,
        cancel_at_period_end = false,
        external_subscription_id = p_mp_payment_id,
        updated_at = now()
    WHERE user_id = _intent.user_id
    RETURNING current_period_end INTO _period_end;

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

      SELECT count(*) INTO _active_org_count
      FROM public.organizations o
      WHERE o.owner_id = _intent.user_id AND o.status = 'active';

      SELECT count(*) INTO _owner_sub_count
      FROM public.organization_subscriptions os
      WHERE os.owner_id = _intent.user_id;

      -- Vínculo automático estritamente 1:1 (nunca por nome de organização)
      IF _active_org_count = 1 AND _owner_sub_count <= 1 THEN
        SELECT o.id INTO _linked_org_id
        FROM public.organizations o
        WHERE o.owner_id = _intent.user_id AND o.status = 'active'
        LIMIT 1;
      END IF;

      IF _owner_sub_count = 1 AND _active_org_count <= 1 THEN
        SELECT * INTO _existing_sub
        FROM public.organization_subscriptions os
        WHERE os.owner_id = _intent.user_id
          AND (os.organization_id IS NULL OR _linked_org_id IS NULL OR os.organization_id = _linked_org_id)
        LIMIT 1
        FOR UPDATE;
      END IF;

      -- Determina se a organização vinculada anteriormente (se houver) continua ativa.
      -- Se a organização anterior está arquivada/suspensa, desvincula (target = NULL)
      -- para garantir que o comprador tenha acesso imediato ao plano advanced via owner_id
      -- sem ser bloqueado pela organização inativa (C2.R — Bloqueio B).
      _existing_org_is_active := false;
      IF _existing_sub.id IS NOT NULL AND _existing_sub.organization_id IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1 FROM public.organizations o
          WHERE o.id = _existing_sub.organization_id AND o.status = 'active'
        ) INTO _existing_org_is_active;
      END IF;

      IF _linked_org_id IS NOT NULL THEN
        _target_org_id := _linked_org_id;
      ELSIF _existing_org_is_active THEN
        _target_org_id := _existing_sub.organization_id;
      ELSE
        _target_org_id := NULL;
      END IF;

      IF _existing_sub.id IS NOT NULL THEN
        UPDATE public.organization_subscriptions
        SET plan_id = _plan_id,
            status = 'active',
            billing_interval = _intent.billing_interval,
            max_seats = COALESCE(_intent.seats_students, max_seats, 30),
            organization_id = _target_org_id,
            current_period_start = CASE
              WHEN status IN ('active', 'trialing') AND current_period_end IS NOT NULL AND current_period_end > now()
              THEN current_period_start
              ELSE now()
            END,
            current_period_end = CASE
              WHEN status IN ('active', 'trialing') AND current_period_end IS NOT NULL AND current_period_end > now()
              THEN current_period_end + _interval
              ELSE _period_end
            END,
            external_subscription_id = p_mp_payment_id,
            updated_at = now()
        WHERE id = _existing_sub.id
        RETURNING current_period_end INTO _period_end;
      ELSE
        INSERT INTO public.organization_subscriptions (
          organization_name, organization_id, plan_id, owner_id, status, billing_interval,
          max_seats, current_period_start, current_period_end, external_subscription_id
        )
        VALUES (
          _org_name, _target_org_id, _plan_id, _intent.user_id, 'active', _intent.billing_interval,
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
      'plan_slug', _intent.plan_slug, 'pre_signup', _is_pre_signup,
      'organization_id', _linked_org_id
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
  _interval interval;
  _period_end timestamptz;
  _org_name text;
  _linked_org_id uuid;
  _active_org_count integer := 0;
  _owner_sub_count integer := 0;
  _existing_sub public.organization_subscriptions%ROWTYPE;
  _existing_org_is_active boolean := false;
  _target_org_id uuid;
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
  _interval := CASE _intent.billing_interval
    WHEN 'yearly' THEN interval '1 year'
    ELSE interval '1 month'
  END;
  _period_end := now() + _interval;

  SELECT count(*) INTO _active_org_count
  FROM public.organizations o
  WHERE o.owner_id = _uid AND o.status = 'active';

  SELECT count(*) INTO _owner_sub_count
  FROM public.organization_subscriptions os
  WHERE os.owner_id = _uid;

  -- Vínculo automático apenas quando 1:1 (exatamente 1 organização ativa e no máximo 1 assinatura).
  -- Nome de organização nunca é usado para vincular contrato.
  IF _active_org_count = 1 AND _owner_sub_count <= 1 THEN
    SELECT o.id INTO _linked_org_id
    FROM public.organizations o
    WHERE o.owner_id = _uid AND o.status = 'active'
    LIMIT 1;
  END IF;

  IF _owner_sub_count = 1 AND _active_org_count <= 1 THEN
    SELECT * INTO _existing_sub
    FROM public.organization_subscriptions os
    WHERE os.owner_id = _uid
      AND (os.organization_id IS NULL OR _linked_org_id IS NULL OR os.organization_id = _linked_org_id)
    LIMIT 1
    FOR UPDATE;
  END IF;

  -- Determina se a organização vinculada anteriormente (se houver) continua ativa.
  -- Se estava ligada a uma organização arquivada/suspensa ou não há organização ativa única,
  -- desvincula (target = NULL) para garantir que o comprador receba seu plano advanced
  -- via owner_id sem vazar dados ou ter seu plano bloqueado por organização arquivada (C2.R — Bloqueio B).
  _existing_org_is_active := false;
  IF _existing_sub.id IS NOT NULL AND _existing_sub.organization_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = _existing_sub.organization_id AND o.status = 'active'
    ) INTO _existing_org_is_active;
  END IF;

  IF _linked_org_id IS NOT NULL THEN
    _target_org_id := _linked_org_id;
  ELSIF _existing_org_is_active THEN
    _target_org_id := _existing_sub.organization_id;
  ELSE
    _target_org_id := NULL;
  END IF;

  IF _existing_sub.id IS NOT NULL THEN
    UPDATE public.organization_subscriptions
    SET plan_id = _plan_id,
        status = 'active',
        billing_interval = _intent.billing_interval,
        max_seats = COALESCE(_intent.seats_students, max_seats, 30),
        organization_id = _target_org_id,
        current_period_start = CASE
          WHEN status IN ('active', 'trialing') AND current_period_end IS NOT NULL AND current_period_end > now()
          THEN current_period_start
          ELSE now()
        END,
        current_period_end = CASE
          WHEN status IN ('active', 'trialing') AND current_period_end IS NOT NULL AND current_period_end > now()
          THEN current_period_end + _interval
          ELSE _period_end
        END,
        external_subscription_id = COALESCE(_intent.mp_payment_id, external_subscription_id),
        updated_at = now()
    WHERE id = _existing_sub.id
    RETURNING organization_id INTO _target_org_id;
  ELSE
    INSERT INTO public.organization_subscriptions (
      organization_name, organization_id, plan_id, owner_id, status, billing_interval,
      max_seats, current_period_start, current_period_end, external_subscription_id
    )
    VALUES (
      _org_name, _target_org_id, _plan_id, _uid, 'active', _intent.billing_interval,
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
    jsonb_build_object('scope_type', 'self', 'intent_id', _intent.id, 'organization_id', _target_org_id), 1);

  RETURN jsonb_build_object(
    'ok', true,
    'reason', CASE WHEN _target_org_id IS NOT NULL THEN 'associated' ELSE 'association_pending' END,
    'org_name', _org_name,
    'organization_id', _target_org_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_escolar_subscription() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_escolar_subscription() TO authenticated;

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
  _interval interval;
  _period_end timestamptz;
  _org_name text;
  _linked_org_id uuid;
  _active_org_count integer := 0;
  _owner_sub_count integer := 0;
  _existing_sub public.organization_subscriptions%ROWTYPE;
  _existing_org_is_active boolean := false;
  _target_org_id uuid;
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
  _interval := CASE _intent.billing_interval
    WHEN 'yearly' THEN interval '1 year'
    ELSE interval '1 month'
  END;
  _period_end := now() + _interval;

  SELECT count(*) INTO _active_org_count
  FROM public.organizations o
  WHERE o.owner_id = _uid AND o.status = 'active';

  SELECT count(*) INTO _owner_sub_count
  FROM public.organization_subscriptions os
  WHERE os.owner_id = _uid;

  -- Vínculo automático apenas quando 1:1 (exatamente 1 organização ativa e no máximo 1 assinatura).
  -- Nome de organização nunca é usado para vincular contrato.
  IF _active_org_count = 1 AND _owner_sub_count <= 1 THEN
    SELECT o.id INTO _linked_org_id
    FROM public.organizations o
    WHERE o.owner_id = _uid AND o.status = 'active'
    LIMIT 1;
  END IF;

  IF _owner_sub_count = 1 AND _active_org_count <= 1 THEN
    SELECT * INTO _existing_sub
    FROM public.organization_subscriptions os
    WHERE os.owner_id = _uid
      AND (os.organization_id IS NULL OR _linked_org_id IS NULL OR os.organization_id = _linked_org_id)
    LIMIT 1
    FOR UPDATE;
  END IF;

  -- Determina se a organização vinculada anteriormente (se houver) continua ativa.
  -- Se estava ligada a uma organização arquivada/suspensa ou não há organização ativa única,
  -- desvincula (target = NULL) para garantir que o comprador receba seu plano advanced
  -- via owner_id sem vazar dados ou ter seu plano bloqueado por organização arquivada (C2.R — Bloqueio B).
  _existing_org_is_active := false;
  IF _existing_sub.id IS NOT NULL AND _existing_sub.organization_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = _existing_sub.organization_id AND o.status = 'active'
    ) INTO _existing_org_is_active;
  END IF;

  IF _linked_org_id IS NOT NULL THEN
    _target_org_id := _linked_org_id;
  ELSIF _existing_org_is_active THEN
    _target_org_id := _existing_sub.organization_id;
  ELSE
    _target_org_id := NULL;
  END IF;

  IF _existing_sub.id IS NOT NULL THEN
    UPDATE public.organization_subscriptions
    SET plan_id = _plan_id,
        status = 'active',
        billing_interval = _intent.billing_interval,
        max_seats = COALESCE(_intent.seats_students, max_seats, 30),
        organization_id = _target_org_id,
        current_period_start = CASE
          WHEN status IN ('active', 'trialing') AND current_period_end IS NOT NULL AND current_period_end > now()
          THEN current_period_start
          ELSE now()
        END,
        current_period_end = CASE
          WHEN status IN ('active', 'trialing') AND current_period_end IS NOT NULL AND current_period_end > now()
          THEN current_period_end + _interval
          ELSE _period_end
        END,
        external_subscription_id = COALESCE(_intent.mp_payment_id, external_subscription_id),
        updated_at = now()
    WHERE id = _existing_sub.id
    RETURNING organization_id INTO _target_org_id;
  ELSE
    INSERT INTO public.organization_subscriptions (
      organization_name, organization_id, plan_id, owner_id, status, billing_interval,
      max_seats, current_period_start, current_period_end, external_subscription_id
    )
    VALUES (
      _org_name, _target_org_id, _plan_id, _uid, 'active', _intent.billing_interval,
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
    jsonb_build_object('scope_type', 'self', 'intent_id', _intent.id, 'organization_id', _target_org_id), 1);

  RETURN jsonb_build_object(
    'ok', true,
    'reason', CASE WHEN _target_org_id IS NOT NULL THEN 'associated' ELSE 'association_pending' END,
    'org_name', _org_name,
    'organization_id', _target_org_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_escolar_with_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_escolar_with_token(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. RESOLUÇÃO DETERMINÍSTICA DE ENTITLEMENTS (get_user_plan / get_my_plan)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
        'plan_slug', sp.slug,
        'plan_name', sp.name,
        'features', sp.features,
        'limits', sp.limits,
        'source', 'individual',
        'status', us.status,
        'billing_interval', us.billing_interval,
        'current_period_end', us.current_period_end
      )
      FROM public.user_subscriptions us
      JOIN public.subscription_plans sp ON sp.id = us.plan_id
      WHERE us.user_id = _user_id
        AND us.status IN ('active', 'trialing')
        AND (us.current_period_end IS NULL OR us.current_period_end > now())
      ORDER BY sp.sort_order DESC, us.current_period_end DESC NULLS LAST
      LIMIT 1
    ),
    (
      SELECT jsonb_build_object(
        'plan_slug', sp.slug,
        'plan_name', sp.name,
        'features', sp.features,
        'limits', sp.limits,
        'source', 'organization',
        'org_name', os.organization_name,
        'organization_id', os.organization_id,
        'status', os.status,
        'billing_interval', os.billing_interval,
        'current_period_end', os.current_period_end
      )
      FROM public.organization_subscriptions os
      JOIN public.subscription_plans sp ON sp.id = os.plan_id
      LEFT JOIN public.organizations linked_org ON linked_org.id = os.organization_id
      WHERE os.status IN ('active', 'trialing')
        AND (os.current_period_end IS NULL OR os.current_period_end > now())
        AND (os.organization_id IS NULL OR linked_org.status = 'active')
        AND (
          EXISTS (
            SELECT 1
            FROM public.institutional_memberships im
            JOIN public.organizations o ON o.id = im.organization_id
            WHERE im.user_id = _user_id
              AND im.status = 'active'
              AND o.status = 'active'
              AND os.organization_id = o.id
          )
          OR (
            os.owner_id = _user_id
            AND NOT EXISTS (
              SELECT 1
              FROM public.institutional_memberships im_rev
              WHERE im_rev.organization_id = os.organization_id
                AND im_rev.user_id = _user_id
                AND im_rev.status <> 'active'
            )
          )
          OR (
            EXISTS (
              SELECT 1
              FROM public.organization_members om
              WHERE om.org_subscription_id = os.id
                AND om.user_id = _user_id
                AND om.status = 'active'
            )
            AND NOT EXISTS (
              SELECT 1
              FROM public.institutional_memberships im_rev
              WHERE im_rev.organization_id = os.organization_id
                AND im_rev.user_id = _user_id
                AND im_rev.status <> 'active'
            )
          )
        )
      ORDER BY sp.sort_order DESC, os.current_period_end DESC NULLS LAST
      LIMIT 1
    ),
    jsonb_build_object(
      'plan_slug', 'free',
      'plan_name', 'Gratuito',
      'features', '["modules","quiz_basic","flashcards_basic","alegria_5","dashboard","breathing","lifewheel","gratitude","memory","emotions"]'::jsonb,
      'limits', '{"alegria_daily": 9, "quiz_levels": 1}'::jsonb,
      'source', 'default',
      'status', 'active'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_plan()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  _result := public.get_user_plan(_uid);

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'READ', 'plan_entitlements', 'feature_gate', jsonb_build_object('scope_type', 'self'), 1);

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_plan(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_my_plan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_plan() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. ENFORCEMENT TRANSACIONAL DE ASSENTOS EM TODOS OS CAMINHOS (C2.R — Defeito #1)
-- Gatilhos BEFORE INSERT OR UPDATE em institutional_memberships e
-- institutional_invitations + validação em invite_member e accept_invitation.
-- Impede contorno por INSERT/UPDATE direto via PostgREST, reativação de
-- estudante suspenso/removido, promoção de papel para student, transferência de
-- organização ou revalidação de convite expirado.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.enforce_institutional_membership_seats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_status text;
  _sub record;
  _max_student_seats integer;
  _active_students integer := 0;
  _pending_students integer := 0;
  _user_email text;
  _has_matching_invite boolean := false;
BEGIN
  -- Só aplica quando o estado resultante é um assento ativo de estudante
  IF NEW.role IS DISTINCT FROM 'student' OR NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  -- Se já era um estudante ativo da mesma organização (ex.: troca de school_id/class_id),
  -- não consome novo assento.
  IF TG_OP = 'UPDATE'
     AND OLD.organization_id = NEW.organization_id
     AND OLD.user_id = NEW.user_id
     AND OLD.role = 'student'
     AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  -- Serializa na organização antes da assinatura (ordem canônica de lock)
  SELECT o.status INTO _org_status
  FROM public.organizations o
  WHERE o.id = NEW.organization_id
  FOR UPDATE;

  IF _org_status IS DISTINCT FROM 'active' AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Organization not available for this account' USING ERRCODE = '42501';
  END IF;

  SELECT id, status, max_seats, current_period_end
  INTO _sub
  FROM public.organization_subscriptions
  WHERE organization_id = NEW.organization_id
  ORDER BY
    CASE WHEN status IN ('active', 'trialing') THEN 0 ELSE 1 END,
    current_period_end DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF _sub.id IS NULL THEN
    -- Sem assinatura vinculada: bloqueia alocação de assento por chamadas autenticadas
    -- (nunca concede trial implícito de 30 vagas sem contrato).
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Organization subscription is required to allocate student seats' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF _sub.status NOT IN ('active', 'trialing')
     OR (_sub.current_period_end IS NOT NULL AND _sub.current_period_end <= now()) THEN
    RAISE EXCEPTION 'Organization subscription is inactive or expired' USING ERRCODE = '42501';
  END IF;

  _max_student_seats := GREATEST(1, COALESCE(_sub.max_seats, 30));

  SELECT count(DISTINCT im.user_id) INTO _active_students
  FROM public.institutional_memberships im
  WHERE im.organization_id = NEW.organization_id
    AND im.role = 'student'
    AND im.status = 'active'
    AND im.user_id <> NEW.user_id;

  IF _active_students >= _max_student_seats THEN
    RAISE EXCEPTION 'Student seat limit reached (% of % active student seats)',
      _active_students, _max_student_seats
      USING ERRCODE = '22023';
  END IF;

  -- Se a inserção/reativação NÃO corresponde a um convite de estudante desta organização,
  -- respeita também os assentos reservados por convites pendentes válidos.
  SELECT lower(trim(u.email)) INTO _user_email
  FROM auth.users u
  WHERE u.id = NEW.user_id;

  IF _user_email IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.institutional_invitations ii
      WHERE ii.organization_id = NEW.organization_id
        AND ii.role = 'student'
        AND ii.accepted_at IS NULL
        AND ii.expires_at > now()
        AND lower(trim(ii.invited_email)) = _user_email
    ) INTO _has_matching_invite;
  END IF;

  IF NOT _has_matching_invite THEN
    SELECT count(DISTINCT lower(trim(ii.invited_email))) INTO _pending_students
    FROM public.institutional_invitations ii
    WHERE ii.organization_id = NEW.organization_id
      AND ii.role = 'student'
      AND ii.accepted_at IS NULL
      AND ii.expires_at > now()
      AND NOT EXISTS (
        SELECT 1
        FROM public.institutional_memberships im
        JOIN auth.users u ON u.id = im.user_id
        WHERE im.organization_id = NEW.organization_id
          AND im.role = 'student'
          AND im.status = 'active'
          AND lower(trim(u.email)) = lower(trim(ii.invited_email))
      );

    IF (_active_students + _pending_students) >= _max_student_seats THEN
      RAISE EXCEPTION 'Student seat limit reached (% of % seats occupied or reserved)',
        (_active_students + _pending_students), _max_student_seats
        USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_institutional_membership_seats() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_institutional_membership_seats ON public.institutional_memberships;
CREATE TRIGGER trg_enforce_institutional_membership_seats
  BEFORE INSERT OR UPDATE ON public.institutional_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_institutional_membership_seats();

CREATE OR REPLACE FUNCTION public.enforce_institutional_invitation_seats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_status text;
  _sub record;
  _max_student_seats integer;
  _active_students integer := 0;
  _pending_students integer := 0;
  _already_active_student boolean := false;
BEGIN
  -- Só aplica quando o convite resultante está pendente, válido e para o papel student
  IF NEW.role IS DISTINCT FROM 'student'
     OR NEW.accepted_at IS NOT NULL
     OR NEW.expires_at <= now() THEN
    RETURN NEW;
  END IF;

  -- Se já era um convite pendente válido para o mesmo e-mail e organização, não consome novo assento
  IF TG_OP = 'UPDATE'
     AND OLD.organization_id = NEW.organization_id
     AND lower(trim(OLD.invited_email)) = lower(trim(NEW.invited_email))
     AND OLD.role = 'student'
     AND OLD.accepted_at IS NULL
     AND OLD.expires_at > now() THEN
    RETURN NEW;
  END IF;

  SELECT o.status INTO _org_status
  FROM public.organizations o
  WHERE o.id = NEW.organization_id
  FOR UPDATE;

  IF _org_status IS DISTINCT FROM 'active' AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Organization not available for this account' USING ERRCODE = '42501';
  END IF;

  SELECT id, status, max_seats, current_period_end
  INTO _sub
  FROM public.organization_subscriptions
  WHERE organization_id = NEW.organization_id
  ORDER BY
    CASE WHEN status IN ('active', 'trialing') THEN 0 ELSE 1 END,
    current_period_end DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF _sub.id IS NULL THEN
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Organization subscription is required to allocate student seats' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF _sub.status NOT IN ('active', 'trialing')
     OR (_sub.current_period_end IS NOT NULL AND _sub.current_period_end <= now()) THEN
    RAISE EXCEPTION 'Organization subscription is inactive or expired' USING ERRCODE = '42501';
  END IF;

  _max_student_seats := GREATEST(1, COALESCE(_sub.max_seats, 30));

  SELECT EXISTS (
    SELECT 1
    FROM public.institutional_memberships im
    JOIN auth.users u ON u.id = im.user_id
    WHERE im.organization_id = NEW.organization_id
      AND im.role = 'student'
      AND im.status = 'active'
      AND lower(trim(u.email)) = lower(trim(NEW.invited_email))
  ) INTO _already_active_student;

  IF _already_active_student THEN
    RETURN NEW;
  END IF;

  SELECT count(DISTINCT im.user_id) INTO _active_students
  FROM public.institutional_memberships im
  WHERE im.organization_id = NEW.organization_id
    AND im.role = 'student'
    AND im.status = 'active';

  SELECT count(DISTINCT lower(trim(ii.invited_email))) INTO _pending_students
  FROM public.institutional_invitations ii
  WHERE ii.organization_id = NEW.organization_id
    AND ii.role = 'student'
    AND ii.accepted_at IS NULL
    AND ii.expires_at > now()
    AND ii.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND lower(trim(ii.invited_email)) <> lower(trim(NEW.invited_email))
    AND NOT EXISTS (
      SELECT 1
      FROM public.institutional_memberships im
      JOIN auth.users u ON u.id = im.user_id
      WHERE im.organization_id = NEW.organization_id
        AND im.role = 'student'
        AND im.status = 'active'
        AND lower(trim(u.email)) = lower(trim(ii.invited_email))
    );

  IF (_active_students + _pending_students) >= _max_student_seats THEN
    RAISE EXCEPTION 'Student seat limit reached (% of % seats occupied or reserved)',
      (_active_students + _pending_students), _max_student_seats
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_institutional_invitation_seats() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_institutional_invitation_seats ON public.institutional_invitations;
CREATE TRIGGER trg_enforce_institutional_invitation_seats
  BEFORE INSERT OR UPDATE ON public.institutional_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_institutional_invitation_seats();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. RPCs invite_member E accept_invitation ALINHADAS COM O GATE DE ASSENTOS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.invite_member(
  _organization_id uuid,
  _invited_email text,
  _role text,
  _school_id uuid DEFAULT NULL,
  _class_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _invitation_id uuid;
  _token uuid;
  _org_name text;
  _created boolean := false;
  _sub record;
  _max_student_seats integer;
  _active_students integer := 0;
  _pending_students integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF NOT public.is_org_admin(_organization_id) THEN
    RAISE EXCEPTION 'Only org_admin can invite members' USING ERRCODE = '42501';
  END IF;

  IF _invited_email IS NULL OR trim(_invited_email) = '' THEN
    RAISE EXCEPTION 'Email is required' USING ERRCODE = '22023';
  END IF;
  IF _role NOT IN ('org_admin', 'school_admin', 'educator', 'student', 'guardian') THEN
    RAISE EXCEPTION 'Invalid role: %', _role USING ERRCODE = '22023';
  END IF;

  -- Trava a organização para serializar convites concorrentes no mesmo tenant
  SELECT name INTO _org_name
  FROM public.organizations
  WHERE id = _organization_id AND status = 'active'
  FOR UPDATE;

  IF _org_name IS NULL THEN
    RAISE EXCEPTION 'Organization not available for this account' USING ERRCODE = '42501';
  END IF;

  -- Verifica assinatura vinculada à organização (trava FOR UPDATE se existir).
  SELECT id, status, max_seats, current_period_end
  INTO _sub
  FROM public.organization_subscriptions
  WHERE organization_id = _organization_id
  ORDER BY
    CASE WHEN status IN ('active', 'trialing') THEN 0 ELSE 1 END,
    current_period_end DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF _sub.id IS NOT NULL THEN
    IF _sub.status NOT IN ('active', 'trialing')
       OR (_sub.current_period_end IS NOT NULL AND _sub.current_period_end <= now()) THEN
      RAISE EXCEPTION 'Organization subscription is inactive or expired' USING ERRCODE = '42501';
    END IF;
    _max_student_seats := GREATEST(1, COALESCE(_sub.max_seats, 30));
  ELSIF _role = 'student' THEN
    RAISE EXCEPTION 'Organization subscription is required to allocate student seats' USING ERRCODE = '42501';
  END IF;

  -- Idempotência: se já existe convite pendente e dentro da validade para o mesmo
  -- e-mail e papel, reutiliza sem consumir novo assento.
  SELECT id, token INTO _invitation_id, _token
  FROM public.institutional_invitations
  WHERE organization_id = _organization_id
    AND lower(trim(invited_email)) = lower(trim(_invited_email))
    AND role = _role
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF _invitation_id IS NULL THEN
    IF _role = 'student' THEN
      SELECT count(DISTINCT im.user_id) INTO _active_students
      FROM public.institutional_memberships im
      WHERE im.organization_id = _organization_id
        AND im.role = 'student'
        AND im.status = 'active';

      SELECT count(DISTINCT lower(trim(ii.invited_email))) INTO _pending_students
      FROM public.institutional_invitations ii
      WHERE ii.organization_id = _organization_id
        AND ii.role = 'student'
        AND ii.accepted_at IS NULL
        AND ii.expires_at > now()
        AND NOT EXISTS (
          SELECT 1
          FROM public.institutional_memberships im
          JOIN auth.users u ON u.id = im.user_id
          WHERE im.organization_id = _organization_id
            AND im.role = 'student'
            AND im.status = 'active'
            AND lower(trim(u.email)) = lower(trim(ii.invited_email))
        );

      IF (_active_students + _pending_students) >= _max_student_seats THEN
        RAISE EXCEPTION 'Student seat limit reached (% of % seats occupied or reserved)',
          (_active_students + _pending_students), _max_student_seats
          USING ERRCODE = '22023';
      END IF;
    END IF;

    -- Remove convite anterior expirado e não aceito para permitir reemissão limpa com novo id/token
    DELETE FROM public.institutional_invitations
    WHERE organization_id = _organization_id
      AND lower(trim(invited_email)) = lower(trim(_invited_email))
      AND role = _role
      AND accepted_at IS NULL
      AND expires_at <= now();

    INSERT INTO public.institutional_invitations (
      organization_id, invited_email, role, school_id, class_id, invited_by
    )
    VALUES (
      _organization_id, lower(trim(_invited_email)), _role, _school_id, _class_id, _uid
    )
    RETURNING id, token INTO _invitation_id, _token;
    _created := true;
  END IF;

  -- Contrato canônico da notification_outbox (TRUST-1.6.1 R33/R34):
  -- Sem EXCEPTION WHEN OTHERS silencioso.
  INSERT INTO public.notification_outbox (
    kind, recipient_email, user_id, payload, dedupe_key
  )
  VALUES (
    'institutional_invite',
    lower(trim(_invited_email)),
    NULL,
    jsonb_build_object(
      'invitation_id', _invitation_id,
      'token', _token,
      'organization_id', _organization_id,
      'role', _role,
      'org_name', coalesce(_org_name, 'uma organização')
    ),
    'invite:' || _invitation_id::text
  )
  ON CONFLICT (dedupe_key) DO NOTHING;

  IF _created THEN
    INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
    VALUES (
      _uid, 'INSERT', 'institutional_invitations', 'invite_member',
      jsonb_build_object(
        'scope_type', 'org',
        'organization_id', _organization_id,
        'invited_email', lower(trim(_invited_email)),
        'role', _role
      ),
      1
    );
  END IF;

  RETURN jsonb_build_object(
    'invitation_id', _invitation_id,
    'token', _token,
    'created', _created,
    'delivery_enqueued', true
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invite_member(uuid, text, text, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invite_member(uuid, text, text, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_invitation(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _user_email text;
  _inv record;
  _sub record;
  _max_student_seats integer;
  _active_students integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT email INTO _user_email
  FROM auth.users
  WHERE id = _uid AND email_confirmed_at IS NOT NULL;

  IF _user_email IS NULL THEN
    RAISE EXCEPTION 'Confirmed email is required to accept an invitation' USING ERRCODE = '28000';
  END IF;

  -- Trava o convite para evitar duplo aceite concorrente
  SELECT * INTO _inv
  FROM public.institutional_invitations
  WHERE token = _token
  FOR UPDATE;

  IF _inv IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation token' USING ERRCODE = '22023';
  END IF;

  IF _inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation already accepted' USING ERRCODE = '22023';
  END IF;

  IF _inv.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation expired' USING ERRCODE = '22023';
  END IF;

  IF lower(trim(_user_email)) <> lower(trim(_inv.invited_email)) THEN
    RAISE EXCEPTION 'Email does not match invitation' USING ERRCODE = '42501';
  END IF;

  -- Verifica que a organização de destino está ativa (R29) e serializa no tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = _inv.organization_id AND o.status = 'active'
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'Organization not available for this account' USING ERRCODE = '42501';
  END IF;

  -- Valida assinatura e limite de assentos no momento da conversão em membro ativo
  SELECT id, status, max_seats, current_period_end
  INTO _sub
  FROM public.organization_subscriptions
  WHERE organization_id = _inv.organization_id
  ORDER BY
    CASE WHEN status IN ('active', 'trialing') THEN 0 ELSE 1 END,
    current_period_end DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF _sub.id IS NOT NULL THEN
    IF _sub.status NOT IN ('active', 'trialing')
       OR (_sub.current_period_end IS NOT NULL AND _sub.current_period_end <= now()) THEN
      RAISE EXCEPTION 'Organization subscription is inactive or expired' USING ERRCODE = '42501';
    END IF;
    _max_student_seats := GREATEST(1, COALESCE(_sub.max_seats, 30));
  ELSIF _inv.role = 'student' THEN
    RAISE EXCEPTION 'Organization subscription is required to allocate student seats' USING ERRCODE = '42501';
  END IF;

  IF _inv.role = 'student' THEN
    SELECT count(DISTINCT im.user_id) INTO _active_students
    FROM public.institutional_memberships im
    WHERE im.organization_id = _inv.organization_id
      AND im.role = 'student'
      AND im.status = 'active'
      AND im.user_id <> _uid;

    IF _active_students >= _max_student_seats THEN
      RAISE EXCEPTION 'Student seat limit reached (% of % active student seats)',
        _active_students, _max_student_seats
        USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO public.institutional_memberships (
    organization_id, user_id, role, school_id, class_id, status
  )
  VALUES (
    _inv.organization_id, _uid, _inv.role, _inv.school_id, _inv.class_id, 'active'
  )
  ON CONFLICT (organization_id, user_id, role) DO UPDATE
    SET status = 'active',
        school_id = COALESCE(EXCLUDED.school_id, public.institutional_memberships.school_id),
        class_id = COALESCE(EXCLUDED.class_id, public.institutional_memberships.class_id),
        updated_at = now();

  UPDATE public.institutional_invitations
  SET accepted_at = now()
  WHERE id = _inv.id;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'INSERT', 'institutional_memberships', 'accept_invitation',
    jsonb_build_object('scope_type', 'self', 'organization_id', _inv.organization_id,
      'invitation_id', _inv.id, 'role', _inv.role), 1);

  RETURN jsonb_build_object(
    'organization_id', _inv.organization_id,
    'role', _inv.role,
    'membership_created', true
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_invitation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid) TO authenticated;
