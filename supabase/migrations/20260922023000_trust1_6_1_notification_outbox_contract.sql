-- TRUST-1.6.1 — R33/R34: contrato canônico da notification_outbox
--
-- R33 (comprovado): invite_member/resend_invitation escreviam colunas inexistentes
-- body_html/metadata dentro de EXCEPTION WHEN OTHERS, então o convite era tratado
-- como enviado mesmo sem nenhuma linha na outbox.
--
-- R34 (comprovado): process-notifications consultava metadata, coluna que não existe
-- no schema canônico da outbox; além disso guardian_consent_request não tinha template.
-- A parte Deno é corrigida no mesmo PR; esta migration fecha o contrato SQL.
--
-- Contrato canônico de outbox:
--   kind, recipient_email, user_id, payload, dedupe_key, status, attempts,
--   last_error, created_at, sent_at.
--
-- Sem produção remota nesta migration/PR.

DO $precheck$
BEGIN
  IF to_regclass('public.notification_outbox') IS NULL
     OR to_regclass('public.institutional_invitations') IS NULL
     OR to_regprocedure('public.invite_member(uuid,text,text,uuid,uuid)') IS NULL
     OR to_regprocedure('public.resend_invitation(uuid)') IS NULL THEN
    RAISE EXCEPTION 'TRUST-1.6.1: precondition failed — outbox/invitations/RPCs missing.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notification_outbox'
      AND column_name IN ('body_html','metadata')
  ) THEN
    RAISE EXCEPTION 'TRUST-1.6.1: unexpected legacy columns body_html/metadata exist; reconcile before applying.';
  END IF;
END;
$precheck$;

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

  SELECT name INTO _org_name
  FROM public.organizations
  WHERE id = _organization_id;

  SELECT id, token INTO _invitation_id, _token
  FROM public.institutional_invitations
  WHERE organization_id = _organization_id
    AND lower(invited_email) = lower(trim(_invited_email))
    AND role = _role
    AND accepted_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF _invitation_id IS NULL THEN
    INSERT INTO public.institutional_invitations (
      organization_id, invited_email, role, school_id, class_id, invited_by
    )
    VALUES (
      _organization_id, lower(trim(_invited_email)), _role, _school_id, _class_id, _uid
    )
    RETURNING id, token INTO _invitation_id, _token;
    _created := true;
  END IF;

  -- Delivery request is part of the observable success contract.
  -- No silent EXCEPTION swallowing: if the outbox cannot accept the row, the
  -- transaction fails and the UI must not claim that an e-mail was sent.
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

CREATE OR REPLACE FUNCTION public.resend_invitation(_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid            uuid := auth.uid();
  _inv            record;
  _recipient_hash text;
  _resends        integer;
  _last_resend    timestamptz;
  _org_name       text;
  _max_resends    constant integer := 3;
  _cooldown       constant interval := interval '24 hours';
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO _inv
  FROM public.institutional_invitations
  WHERE id = _invitation_id;

  IF _inv IS NULL OR NOT public.is_org_admin(_inv.organization_id) THEN
    RAISE EXCEPTION 'Invitation not available for this account' USING ERRCODE = '42501';
  END IF;

  IF _inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation already accepted' USING ERRCODE = '22023';
  END IF;
  IF _inv.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation revoked' USING ERRCODE = '22023';
  END IF;
  IF _inv.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation expired: cancel and issue a new one' USING ERRCODE = '22023';
  END IF;

  _recipient_hash := encode(
    extensions.digest(lower(trim(_inv.invited_email)), 'sha256'),
    'hex'
  );

  SELECT count(*), max(created_at)
  INTO _resends, _last_resend
  FROM public.institutional_decision_events
  WHERE organization_id = _inv.organization_id
    AND event_type = 'invitation_resend'
    AND result = 'succeeded'
    AND metadata->>'recipient_hash' = _recipient_hash;

  IF _resends >= _max_resends THEN
    INSERT INTO public.institutional_decision_events (
      organization_id, school_id, class_id, event_type, source_entity, source_id,
      severity, reason, actor_user_id, actor_role, result, metadata
    ) VALUES (
      _inv.organization_id, _inv.school_id, _inv.class_id,
      'invitation_resend_blocked', 'institutional_invitations', _inv.id,
      'warning', 'resend_limit_reached', _uid, 'org_admin', 'denied',
      jsonb_build_object(
        'recipient_hash', _recipient_hash,
        'resends', _resends,
        'max_resends', _max_resends,
        'role', _inv.role
      )
    );
    RAISE EXCEPTION 'Resend limit reached (% of %) for this recipient in this organization',
      _resends, _max_resends USING ERRCODE = '22023';
  END IF;

  IF _last_resend IS NOT NULL AND _last_resend > now() - _cooldown THEN
    INSERT INTO public.institutional_decision_events (
      organization_id, school_id, class_id, event_type, source_entity, source_id,
      severity, reason, actor_user_id, actor_role, result, metadata
    ) VALUES (
      _inv.organization_id, _inv.school_id, _inv.class_id,
      'invitation_resend_blocked', 'institutional_invitations', _inv.id,
      'info', 'resend_cooldown', _uid, 'org_admin', 'denied',
      jsonb_build_object(
        'recipient_hash', _recipient_hash,
        'resends', _resends,
        'last_resend_at', _last_resend,
        'role', _inv.role
      )
    );
    RAISE EXCEPTION 'Resend blocked: minimum interval of 24 hours between resends'
      USING ERRCODE = '22023';
  END IF;

  SELECT name INTO _org_name
  FROM public.organizations
  WHERE id = _inv.organization_id;

  -- The resend is successful only if its delivery request exists in the outbox.
  -- Any schema/constraint failure aborts this transaction; no false "succeeded"
  -- decision event is written and the resend quota is not consumed.
  INSERT INTO public.notification_outbox (
    kind, recipient_email, user_id, payload, dedupe_key
  )
  VALUES (
    'institutional_invite',
    lower(trim(_inv.invited_email)),
    NULL,
    jsonb_build_object(
      'invitation_id', _inv.id,
      'token', _inv.token,
      'organization_id', _inv.organization_id,
      'role', _inv.role,
      'org_name', coalesce(_org_name, 'uma organização'),
      'resend', _resends + 1
    ),
    'invite-resend:' || _inv.id::text || ':' || (_resends + 1)::text
  );

  INSERT INTO public.institutional_decision_events (
    organization_id, school_id, class_id, event_type, source_entity, source_id,
    severity, reason, actor_user_id, actor_role, result, metadata, idempotency_key
  ) VALUES (
    _inv.organization_id, _inv.school_id, _inv.class_id,
    'invitation_resend', 'institutional_invitations', _inv.id,
    'info', 'pending_invitation', _uid, 'org_admin', 'succeeded',
    jsonb_build_object(
      'recipient_hash', _recipient_hash,
      'resend', _resends + 1,
      'role', _inv.role
    ),
    'invite-resend:' || _inv.id::text || ':' || (_resends + 1)::text
  );

  RETURN jsonb_build_object(
    'invitation_id', _inv.id,
    'resend', _resends + 1,
    'remaining', _max_resends - (_resends + 1),
    'delivery_enqueued', true
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invite_member(uuid,text,text,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_member(uuid,text,text,uuid,uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.resend_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resend_invitation(uuid) TO authenticated;

-- Postconditions: the canonical outbox columns exist and the legacy phantom
-- columns do not.
DO $postcheck$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notification_outbox' AND column_name='payload'
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notification_outbox'
      AND column_name IN ('body_html','metadata')
  ) THEN
    RAISE EXCEPTION 'TRUST-1.6.1: notification_outbox contract mismatch after migration.';
  END IF;
END;
$postcheck$;
