-- ═══════════════════════════════════════════════════════════════════════════════
-- ONDA C2.1 — Menor privilégio na leitura contratual de organization_subscriptions,
-- snapshot operacional autoritativo no servidor (get_org_deployment_snapshot) e
-- preservação de escopo (school_id / class_id) na reemissão de convites.
--
-- Forward-only, idempotente, sem editar migrations históricas. Garante convergência
-- idêntica tanto em banco criado do zero quanto em banco atualizado a partir do
-- estado anterior (b2b82b2 -> 957fa29 -> C2.1).
-- ═══════════════════════════════════════════════════════════════════════════════

DO $precheck$
BEGIN
  IF to_regclass('public.organization_subscriptions') IS NULL
     OR to_regclass('public.organization_members') IS NULL
     OR to_regclass('public.organizations') IS NULL
     OR to_regclass('public.schools') IS NULL
     OR to_regclass('public.classes') IS NULL
     OR to_regclass('public.institutional_memberships') IS NULL
     OR to_regclass('public.institutional_invitations') IS NULL
     OR to_regclass('public.notification_outbox') IS NULL THEN
    RAISE EXCEPTION 'C2.1: precondition failed — required institutional or billing tables missing.';
  END IF;

  IF to_regprocedure('public.is_org_admin(uuid)') IS NULL
     OR to_regprocedure('public.is_org_member(uuid)') IS NULL THEN
    RAISE EXCEPTION 'C2.1: precondition failed — R29 operational helpers missing.';
  END IF;
END;
$precheck$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. CONVERGÊNCIA DE UPGRADE (b2b82b2 -> C2.1) E BLOQUEIO DE TABELA LEGADA
-- Reaplica de forma idempotente o fechamento de organization_members e a auditoria
-- de reconciliação em create_organization para bancos que já haviam aplicado a
-- versão inicial da 20260925120000.
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Members can view own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners can manage members" ON public.organization_members;
REVOKE ALL ON TABLE public.organization_members FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organization_members TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. MENOR PRIVILÉGIO EM organization_subscriptions (Seção 7.1)
-- Problema corrigido:
--   • GRANT SELECT na tabela inteira + policy "owner_id = auth.uid() OR is_org_admin"
--     permitia que org_admin não proprietário consultasse external_subscription_id
--     e metadata diretamente em public.organization_subscriptions, e que gestores
--     em múltiplas redes carregassem linhas de várias organizações no navegador.
-- Solução aplicada (defesa em profundidade):
--   1) REVOKE ALL na tabela inteira para PUBLIC, anon e authenticated (pois REVOKE
--      de coluna não anula SELECT já concedido no nível de tabela).
--   2) GRANT SELECT apenas nas colunas operacionais não financeiras para
--      authenticated (excluindo explicitamente external_subscription_id e metadata).
--   3) Policy de SELECT direto na tabela restrita exclusivamente a owner_id = auth.uid();
--      administradores operacionais (org_admin / platform_admin) consultam o resumo
--      contratual e de vagas da rede exclusivamente via get_org_deployment_snapshot(uuid).
--   4) Caminho de serviço (service_role para webhook e lifecycle) preservado.
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Members can view assigned org subscriptions" ON public.organization_subscriptions;
DROP POLICY IF EXISTS "Owners can view own org subscriptions" ON public.organization_subscriptions;
DROP POLICY IF EXISTS "Teachers/managers can view org subscriptions" ON public.organization_subscriptions;
DROP POLICY IF EXISTS "Owners and org admins can view org subscriptions" ON public.organization_subscriptions;
DROP POLICY IF EXISTS "Contract owners can view own org subscriptions" ON public.organization_subscriptions;

REVOKE ALL ON TABLE public.organization_subscriptions FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  organization_name,
  organization_id,
  plan_id,
  owner_id,
  status,
  billing_interval,
  max_seats,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
) ON TABLE public.organization_subscriptions TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organization_subscriptions TO service_role;

CREATE POLICY "Contract owners can view own org subscriptions"
  ON public.organization_subscriptions
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. SNAPSHOT OPERACIONAL AUTORITATIVO DA REDE (Seção 7.2)
-- Fonte única de verdade para a Central de Implantação da Rede:
--   • Valida sessão autenticada e papel administrativo operacional na organização
--     ativa (is_org_admin(_organization_id)).
--   • Seleciona a assinatura vinculada usando exatamente a mesma ordenação
--     determinística dos triggers e RPCs de enforcement.
--   • Calcula no servidor (sem truncamento de 1.000 linhas e sem expor auth.users
--     ou e-mails de estudantes ao cliente):
--       - contracted_seats (0 quando não há contrato ativo vinculado; nunca 30 implícito)
--       - occupied_student_seats (count(DISTINCT user_id) de estudantes ativos)
--       - reserved_student_seats (convites pendentes válidos de estudantes deduplicados
--         por lower(trim(invited_email)) e excluindo e-mails de estudantes já ativos)
--       - available_student_seats e is_quota_full
--       - contagens de convites expirados, equipe ativa e estrutura de escolas/turmas
--       - contratos ativos pendentes de vínculo (apenas quando owner_id = auth.uid())
--   • Nunca expõe external_subscription_id, metadata ou PII de estudantes.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_org_deployment_snapshot(
  _organization_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _now timestamptz := now();
  _org record;
  _linked_sub record;
  _has_active_contract boolean := false;
  _contract_state text := 'missing_contract';
  _contracted_seats integer := 0;
  _occupied_student_seats integer := 0;
  _reserved_student_seats integer := 0;
  _available_student_seats integer := 0;
  _is_quota_full boolean := false;
  _expired_student_invitations_count integer := 0;
  _active_org_admins integer := 0;
  _active_school_admins integer := 0;
  _active_educators integer := 0;
  _valid_staff_invitations_count integer := 0;
  _expired_staff_invitations_count integer := 0;
  _schools_count integer := 0;
  _classes_count integer := 0;
  _schools_without_classes_count integer := 0;
  _unlinked_active_count integer := 0;
  _unlinked_max_seats integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF _organization_id IS NULL OR NOT public.is_org_admin(_organization_id) THEN
    RAISE EXCEPTION 'Only org_admin can view organization deployment snapshot' USING ERRCODE = '42501';
  END IF;

  SELECT o.id, o.name, o.slug, o.owner_id, o.status
  INTO _org
  FROM public.organizations o
  WHERE o.id = _organization_id
    AND o.status = 'active';

  IF _org.id IS NULL THEN
    RAISE EXCEPTION 'Organization not available for this account' USING ERRCODE = '42501';
  END IF;

  -- Seleciona a assinatura vinculada usando a mesma regra determinística do enforcement
  SELECT
    os.id,
    os.organization_name,
    os.organization_id,
    os.status,
    os.billing_interval,
    os.max_seats,
    os.current_period_start,
    os.current_period_end
  INTO _linked_sub
  FROM public.organization_subscriptions os
  WHERE os.organization_id = _organization_id
  ORDER BY
    CASE WHEN os.status IN ('active', 'trialing') THEN 0 ELSE 1 END,
    os.current_period_end DESC NULLS LAST,
    os.updated_at DESC,
    os.id DESC
  LIMIT 1;

  _has_active_contract := (
    _linked_sub.id IS NOT NULL
    AND _linked_sub.status IN ('active', 'trialing')
    AND (_linked_sub.current_period_end IS NULL OR _linked_sub.current_period_end > _now)
  );

  _contracted_seats := CASE
    WHEN _has_active_contract THEN GREATEST(1, COALESCE(_linked_sub.max_seats, 30))
    ELSE 0
  END;

  -- Contratos pagos sem organização vinculada pertencentes exclusivamente ao próprio chamador
  SELECT
    count(*)::integer,
    COALESCE(max(GREATEST(1, COALESCE(os.max_seats, 30))), 0)::integer
  INTO _unlinked_active_count, _unlinked_max_seats
  FROM public.organization_subscriptions os
  WHERE os.owner_id = _uid
    AND os.organization_id IS NULL
    AND os.status IN ('active', 'trialing')
    AND (os.current_period_end IS NULL OR os.current_period_end > _now);

  IF _has_active_contract THEN
    _contract_state := 'active_linked';
  ELSIF _unlinked_active_count > 0 THEN
    _contract_state := 'association_pending';
  ELSIF _linked_sub.id IS NOT NULL THEN
    _contract_state := 'expired_linked';
  ELSE
    _contract_state := 'missing_contract';
  END IF;

  -- Assentos ocupados por estudantes ativos (distintos por user_id)
  SELECT count(DISTINCT im.user_id)::integer
  INTO _occupied_student_seats
  FROM public.institutional_memberships im
  WHERE im.organization_id = _organization_id
    AND im.role = 'student'
    AND im.status = 'active';

  -- Assentos reservados por convites pendentes e válidos de estudante,
  -- deduplicados por lower(trim(invited_email)) e excluindo estudantes já ativos na organização
  SELECT count(DISTINCT lower(trim(ii.invited_email)))::integer
  INTO _reserved_student_seats
  FROM public.institutional_invitations ii
  WHERE ii.organization_id = _organization_id
    AND ii.role = 'student'
    AND ii.accepted_at IS NULL
    AND ii.expires_at > _now
    AND NOT EXISTS (
      SELECT 1
      FROM public.institutional_memberships im
      JOIN auth.users u ON u.id = im.user_id
      WHERE im.organization_id = _organization_id
        AND im.role = 'student'
        AND im.status = 'active'
        AND lower(trim(u.email)) = lower(trim(ii.invited_email))
    );

  SELECT count(*)::integer
  INTO _expired_student_invitations_count
  FROM public.institutional_invitations ii
  WHERE ii.organization_id = _organization_id
    AND ii.role = 'student'
    AND ii.accepted_at IS NULL
    AND ii.expires_at <= _now;

  _available_student_seats := CASE
    WHEN _has_active_contract THEN GREATEST(0, _contracted_seats - (_occupied_student_seats + _reserved_student_seats))
    ELSE 0
  END;

  _is_quota_full := (
    _has_active_contract
    AND (_occupied_student_seats + _reserved_student_seats) >= _contracted_seats
  );

  -- Equipe pedagógica e gestores ativos (sem truncamento por paginação REST)
  SELECT
    count(DISTINCT im.user_id) FILTER (WHERE im.role = 'org_admin')::integer,
    count(DISTINCT im.user_id) FILTER (WHERE im.role = 'school_admin')::integer,
    count(DISTINCT im.user_id) FILTER (WHERE im.role = 'educator')::integer
  INTO
    _active_org_admins,
    _active_school_admins,
    _active_educators
  FROM public.institutional_memberships im
  WHERE im.organization_id = _organization_id
    AND im.status = 'active';

  SELECT
    count(*) FILTER (WHERE ii.expires_at > _now)::integer,
    count(*) FILTER (WHERE ii.expires_at <= _now)::integer
  INTO
    _valid_staff_invitations_count,
    _expired_staff_invitations_count
  FROM public.institutional_invitations ii
  WHERE ii.organization_id = _organization_id
    AND ii.role IN ('org_admin', 'school_admin', 'educator')
    AND ii.accepted_at IS NULL;

  -- Estrutura de escolas e turmas ativas
  SELECT count(*)::integer
  INTO _schools_count
  FROM public.schools s
  WHERE s.organization_id = _organization_id
    AND s.status = 'active';

  SELECT count(*)::integer
  INTO _classes_count
  FROM public.classes c
  JOIN public.schools s ON s.id = c.school_id
  WHERE s.organization_id = _organization_id
    AND s.status = 'active'
    AND c.status = 'active';

  SELECT count(*)::integer
  INTO _schools_without_classes_count
  FROM public.schools s
  WHERE s.organization_id = _organization_id
    AND s.status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.school_id = s.id
        AND c.status = 'active'
    );

  RETURN jsonb_build_object(
    'organization_id', _organization_id,
    'reference_at', _now,
    'contract_state', _contract_state,
    'has_active_contract', _has_active_contract,
    'contracted_seats', _contracted_seats,
    'occupied_student_seats', _occupied_student_seats,
    'reserved_student_seats', _reserved_student_seats,
    'available_student_seats', _available_student_seats,
    'is_quota_full', _is_quota_full,
    'expired_student_invitations_count', _expired_student_invitations_count,
    'active_org_admins_count', COALESCE(_active_org_admins, 0),
    'active_school_admins_count', COALESCE(_active_school_admins, 0),
    'active_educators_count', COALESCE(_active_educators, 0),
    'valid_staff_invitations_count', COALESCE(_valid_staff_invitations_count, 0),
    'expired_staff_invitations_count', COALESCE(_expired_staff_invitations_count, 0),
    'schools_count', COALESCE(_schools_count, 0),
    'classes_count', COALESCE(_classes_count, 0),
    'schools_without_classes_count', COALESCE(_schools_without_classes_count, 0),
    'unlinked_active_subscriptions_count', COALESCE(_unlinked_active_count, 0),
    'unlinked_max_seats', COALESCE(_unlinked_max_seats, 0),
    'subscription', CASE
      WHEN _linked_sub.id IS NOT NULL THEN jsonb_build_object(
        'id', _linked_sub.id,
        'organization_name', _linked_sub.organization_name,
        'organization_id', _linked_sub.organization_id,
        'status', _linked_sub.status,
        'billing_interval', _linked_sub.billing_interval,
        'max_seats', _linked_sub.max_seats,
        'current_period_start', _linked_sub.current_period_start,
        'current_period_end', _linked_sub.current_period_end
      )
      ELSE NULL
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_org_deployment_snapshot(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_deployment_snapshot(uuid) TO authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. PRESERVAÇÃO E VALIDAÇÃO DE ESCOPO (school_id / class_id) EM invite_member
-- E CONVERGÊNCIA DE create_organization (Seção 7.3)
--   • Valida que _school_id e _class_id (quando informados) pertencem à
--     organização ativa.
--   • Na reemissão de convite expirado, preserva school_id e class_id anteriores
--     caso o chamador omita esses parâmetros e a escola/turma siga ativa.
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

  INSERT INTO public.organizations (name, slug, owner_id)
  VALUES (trim(_name), _slug_final, _uid)
  RETURNING id INTO _org_id;

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
  _resolved_school_id uuid := _school_id;
  _resolved_class_id uuid := _class_id;
  _class_school_id uuid;
  _prev_expired record;
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

  -- Valida escopo de escola/turma se informado explicitamente
  IF _resolved_school_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.schools s
      WHERE s.id = _resolved_school_id
        AND s.organization_id = _organization_id
        AND s.status = 'active'
    ) THEN
      RAISE EXCEPTION 'School does not belong to this active organization' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF _resolved_class_id IS NOT NULL THEN
    SELECT c.school_id INTO _class_school_id
    FROM public.classes c
    JOIN public.schools s ON s.id = c.school_id
    WHERE c.id = _resolved_class_id
      AND s.organization_id = _organization_id
      AND s.status = 'active'
      AND c.status = 'active';

    IF _class_school_id IS NULL THEN
      RAISE EXCEPTION 'Class does not belong to this active organization' USING ERRCODE = '22023';
    END IF;

    IF _resolved_school_id IS NOT NULL AND _resolved_school_id <> _class_school_id THEN
      RAISE EXCEPTION 'Class does not belong to the specified school' USING ERRCODE = '22023';
    END IF;

    _resolved_school_id := _class_school_id;
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
  -- e-mail e papel, reutiliza sem consumir novo assento (preservando/atualizando escopo se fornecido).
  SELECT id, token, school_id, class_id
  INTO _invitation_id, _token, _resolved_school_id, _resolved_class_id
  FROM public.institutional_invitations
  WHERE organization_id = _organization_id
    AND lower(trim(invited_email)) = lower(trim(_invited_email))
    AND role = _role
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF _invitation_id IS NOT NULL AND (_school_id IS NOT NULL OR _class_id IS NOT NULL) THEN
    UPDATE public.institutional_invitations
    SET school_id = COALESCE(_school_id, _class_school_id, school_id),
        class_id = COALESCE(_class_id, class_id)
    WHERE id = _invitation_id
    RETURNING school_id, class_id INTO _resolved_school_id, _resolved_class_id;
  END IF;

  IF _invitation_id IS NULL THEN
    -- Se havia convite expirado anterior e o chamador não enviou escopo explícito,
    -- preserva school_id e class_id anteriores desde que ainda ativos na organização.
    IF _resolved_school_id IS NULL AND _resolved_class_id IS NULL THEN
      SELECT ii.school_id, ii.class_id
      INTO _prev_expired
      FROM public.institutional_invitations ii
      WHERE ii.organization_id = _organization_id
        AND lower(trim(ii.invited_email)) = lower(trim(_invited_email))
        AND ii.role = _role
        AND ii.accepted_at IS NULL
        AND ii.expires_at <= now()
      ORDER BY ii.created_at DESC
      LIMIT 1;

      IF _prev_expired.school_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.schools s
        WHERE s.id = _prev_expired.school_id
          AND s.organization_id = _organization_id
          AND s.status = 'active'
      ) THEN
        _resolved_school_id := _prev_expired.school_id;
      END IF;

      IF _prev_expired.class_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.classes c
        JOIN public.schools s ON s.id = c.school_id
        WHERE c.id = _prev_expired.class_id
          AND s.organization_id = _organization_id
          AND s.status = 'active'
          AND c.status = 'active'
      ) THEN
        _resolved_class_id := _prev_expired.class_id;
      END IF;
    END IF;

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
      _organization_id, lower(trim(_invited_email)), _role, _resolved_school_id, _resolved_class_id, _uid
    )
    RETURNING id, token INTO _invitation_id, _token;
    _created := true;
  END IF;

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
      'school_id', _resolved_school_id,
      'class_id', _resolved_class_id,
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
        'role', _role,
        'school_id', _resolved_school_id,
        'class_id', _resolved_class_id
      ),
      1
    );
  END IF;

  RETURN jsonb_build_object(
    'invitation_id', _invitation_id,
    'token', _token,
    'created', _created,
    'school_id', _resolved_school_id,
    'class_id', _resolved_class_id,
    'delivery_enqueued', true
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invite_member(uuid, text, text, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invite_member(uuid, text, text, uuid, uuid) TO authenticated;
