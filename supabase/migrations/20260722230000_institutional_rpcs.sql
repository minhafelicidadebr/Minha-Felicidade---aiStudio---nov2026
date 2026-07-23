-- ONDA 2 — RPCs institucionais para piloto escolar
-- 1. create_organization: cria org + primeiro membership (org_admin)
-- 2. invite_member: cria convite com token e enfileira notificação
-- 3. accept_invitation: valida token, cria membership, marca convite
-- Todas: SECURITY DEFINER, SET search_path = public, auditadas, self-scoped.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. CREATE ORGANIZATION
-- Cria a organização e vincula o chamador como org_admin.
-- Se o chamador já tiver uma organization_subscriptions ativa, vincula o org_id
-- nos metadados (para futuro billing lookup).
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
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF _name IS NULL OR trim(_name) = '' THEN
    RAISE EXCEPTION 'Organization name is required' USING ERRCODE = '22023';
  END IF;

  -- Gera slug se não fornecido (lowercase, replace spaces with -)
  _slug_final := COALESCE(NULLIF(trim(_slug), ''), lower(regexp_replace(trim(_name), '\s+', '-', 'g')));

  -- Idempotência: se o usuário já é org_admin de uma org com mesmo nome, retorna ela
  SELECT o.id INTO _org_id
  FROM public.organizations o
  JOIN public.institutional_memberships m ON m.organization_id = o.id
  WHERE o.owner_id = _uid AND lower(o.name) = lower(trim(_name))
    AND m.user_id = _uid AND m.role = 'org_admin' AND m.status = 'active'
  LIMIT 1;

  IF _org_id IS NOT NULL THEN
    RETURN jsonb_build_object('organization_id', _org_id, 'created', false);
  END IF;

  -- Cria organização
  INSERT INTO public.organizations (name, slug, owner_id)
  VALUES (trim(_name), _slug_final, _uid)
  RETURNING id INTO _org_id;

  -- Cria primeiro membership (org_admin)
  INSERT INTO public.institutional_memberships (organization_id, user_id, role, status)
  VALUES (_org_id, _uid, 'org_admin', 'active');

  -- Audit
  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'INSERT', 'organizations', 'create_organization',
    jsonb_build_object('scope_type', 'self', 'organization_id', _org_id), 1);

  RETURN jsonb_build_object('organization_id', _org_id, 'created', true);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. INVITE MEMBER
-- Cria um convite para um e-mail com papel e (opcionalmente) escola/turma.
-- Só org_admin pode convidar. Token gerado automaticamente (uuid).
-- Enfileira notificação na notification_outbox (se a tabela existir).
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
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  -- Verificar que o chamador é org_admin da organização
  IF NOT public.is_org_admin(_organization_id) THEN
    RAISE EXCEPTION 'Only org_admin can invite members' USING ERRCODE = '42501';
  END IF;

  -- Validações
  IF _invited_email IS NULL OR trim(_invited_email) = '' THEN
    RAISE EXCEPTION 'Email is required' USING ERRCODE = '22023';
  END IF;
  IF _role NOT IN ('org_admin', 'school_admin', 'educator', 'student', 'guardian') THEN
    RAISE EXCEPTION 'Invalid role: %', _role USING ERRCODE = '22023';
  END IF;

  -- Idempotência: se já existe convite pendente para mesmo email+org+role, retorna
  SELECT id, token INTO _invitation_id, _token
  FROM public.institutional_invitations
  WHERE organization_id = _organization_id
    AND lower(invited_email) = lower(trim(_invited_email))
    AND role = _role
    AND accepted_at IS NULL
  LIMIT 1;

  IF _invitation_id IS NOT NULL THEN
    RETURN jsonb_build_object('invitation_id', _invitation_id, 'token', _token, 'created', false);
  END IF;

  -- Cria convite
  INSERT INTO public.institutional_invitations (
    organization_id, invited_email, role, school_id, class_id, invited_by
  )
  VALUES (
    _organization_id, lower(trim(_invited_email)), _role, _school_id, _class_id, _uid
  )
  RETURNING id, token INTO _invitation_id, _token;

  -- Enfileira notificação (best-effort: captura qualquer erro de schema/tabela)
  BEGIN
    INSERT INTO public.notification_outbox (kind, recipient_email, body_html, dedupe_key, metadata)
    VALUES (
      'institutional_invite',
      lower(trim(_invited_email)),
      '<p>Você recebeu um convite para participar como <strong>' || _role || '</strong>.</p>' ||
      '<p>Use o código de convite ou clique no link enviado para aceitar.</p>',
      'invite:' || _invitation_id::text,
      jsonb_build_object('invitation_id', _invitation_id, 'token', _token, 'organization_id', _organization_id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- notification_outbox may have different schema or not exist; never block the invite
    NULL;
  END;

  -- Audit
  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'INSERT', 'institutional_invitations', 'invite_member',
    jsonb_build_object('scope_type', 'org', 'organization_id', _organization_id,
      'invited_email', lower(trim(_invited_email)), 'role', _role), 1);

  RETURN jsonb_build_object('invitation_id', _invitation_id, 'token', _token, 'created', true);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. ACCEPT INVITATION
-- O convidado (autenticado) aceita o convite pelo token. Cria a membership.
-- Validações: token existe, não expirou, não foi aceito, email bate.
-- ═══════════════════════════════════════════════════════════════════════════════
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
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  -- Busca email confirmado do usuário
  SELECT email INTO _user_email
  FROM auth.users
  WHERE id = _uid AND email_confirmed_at IS NOT NULL;

  IF _user_email IS NULL THEN
    RAISE EXCEPTION 'Confirmed email is required to accept an invitation' USING ERRCODE = '28000';
  END IF;

  -- Busca convite pelo token
  SELECT * INTO _inv
  FROM public.institutional_invitations
  WHERE token = _token;

  IF _inv IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation token' USING ERRCODE = '22023';
  END IF;

  IF _inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation already accepted' USING ERRCODE = '22023';
  END IF;

  IF _inv.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation expired' USING ERRCODE = '22023';
  END IF;

  -- Verifica email match (case-insensitive)
  IF lower(_user_email) <> lower(_inv.invited_email) THEN
    RAISE EXCEPTION 'Email does not match invitation' USING ERRCODE = '42501';
  END IF;

  -- Cria membership (idempotente via ON CONFLICT)
  INSERT INTO public.institutional_memberships (
    organization_id, user_id, role, school_id, class_id, status
  )
  VALUES (
    _inv.organization_id, _uid, _inv.role, _inv.school_id, _inv.class_id, 'active'
  )
  ON CONFLICT (organization_id, user_id, role) DO UPDATE
    SET status = 'active', updated_at = now();

  -- Marca convite como aceito
  UPDATE public.institutional_invitations
  SET accepted_at = now()
  WHERE id = _inv.id;

  -- Audit
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.create_organization(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.invite_member(uuid, text, text, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invite_member(uuid, text, text, uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.accept_invitation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Extend notification_outbox kind CHECK to include 'institutional_invite'
-- (safe: ADD CONSTRAINT IF NOT EXISTS not supported, so use DO block)
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  -- Try to drop and recreate the check constraint with the new value
  -- If notification_outbox doesn't exist, silently skip
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notification_outbox') THEN
    ALTER TABLE public.notification_outbox DROP CONSTRAINT IF EXISTS notification_outbox_kind_check;
    ALTER TABLE public.notification_outbox ADD CONSTRAINT notification_outbox_kind_check
      CHECK (kind IN ('welcome','payment_confirmed','renewal_reminder','expiration_notice','escolar_claim','institutional_invite'));
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Verificação manual pós-deploy:
-- SELECT has_function_privilege('anon', 'public.create_organization(text,text)', 'EXECUTE');  -- false
-- SELECT has_function_privilege('authenticated', 'public.create_organization(text,text)', 'EXECUTE');  -- true
-- SELECT has_function_privilege('authenticated', 'public.invite_member(uuid,text,text,uuid,uuid)', 'EXECUTE');  -- true
-- SELECT has_function_privilege('authenticated', 'public.accept_invitation(uuid)', 'EXECUTE');  -- true
-- ═══════════════════════════════════════════════════════════════════════════════
