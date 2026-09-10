-- TRUST-1.3 / DB-R29 — archived/suspended fora de leituras operacionais
-- Forward-only. Preserva linhas, FKs e o ledger append-only da TRUST-1.2.
-- Não altera migrations anteriores e não usa DROP ... CASCADE.

DO $precheck$
BEGIN
  IF to_regclass('public.organizations') IS NULL
     OR to_regclass('public.schools') IS NULL
     OR to_regclass('public.classes') IS NULL
     OR to_regclass('public.institutional_decision_events') IS NULL THEN
    RAISE EXCEPTION 'TRUST-1.3/R29: schema institucional ou ledger ausente.';
  END IF;

  IF to_regprocedure('public.get_school_metrics(uuid,text)') IS NULL
     OR to_regprocedure('public.get_org_analytics_series(uuid)') IS NULL
     OR to_regprocedure('public.get_org_engagement_summary(uuid)') IS NULL THEN
    RAISE EXCEPTION 'TRUST-1.3/R29: RPCs de métricas/analytics ausentes. Aplique até 20260901120000.';
  END IF;
END;
$precheck$;

-- Autorização de ciclo de vida: mantém a capacidade de arquivar sem tornar a
-- entidade archived/suspended uma leitura operacional. Não consulta status da org.
CREATE OR REPLACE FUNCTION public.is_org_lifecycle_admin(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institutional_memberships m
    WHERE m.organization_id = _org_id
      AND m.user_id = auth.uid()
      AND m.role IN ('platform_admin', 'org_admin')
      AND m.status = 'active'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_org_lifecycle_admin(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_lifecycle_admin(uuid)
  TO authenticated, service_role;

-- Verificação:
-- SELECT has_function_privilege('anon','public.is_org_lifecycle_admin(uuid)','EXECUTE'),
--        has_function_privilege('authenticated','public.is_org_lifecycle_admin(uuid)','EXECUTE');
-- esperado: false | true

-- Helpers operacionais: membership/admin só existe enquanto a organização está ativa.
CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_org_lifecycle_admin(_org_id)
     AND EXISTS (
       SELECT 1 FROM public.organizations o
       WHERE o.id = _org_id AND o.status = 'active'
     );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institutional_memberships m
    JOIN public.organizations o ON o.id = m.organization_id
    WHERE m.organization_id = _org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND o.status = 'active'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid)
  TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid)
  TO authenticated, service_role;

-- Helper de gestão de turma, separado da leitura operacional da escola.
CREATE OR REPLACE FUNCTION public.is_school_lifecycle_admin(_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.schools s
    JOIN public.institutional_memberships m
      ON m.organization_id = s.organization_id
    WHERE s.id = _school_id
      AND m.user_id = auth.uid()
      AND m.role IN ('platform_admin', 'org_admin')
      AND m.status = 'active'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_school_lifecycle_admin(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_school_lifecycle_admin(uuid)
  TO authenticated, service_role;

-- Verificação dos helpers substituídos/novos:
-- SELECT has_function_privilege('anon','public.is_org_admin(uuid)','EXECUTE'),
--        has_function_privilege('authenticated','public.is_org_admin(uuid)','EXECUTE'),
--        has_function_privilege('anon','public.is_org_member(uuid)','EXECUTE'),
--        has_function_privilege('authenticated','public.is_org_member(uuid)','EXECUTE'),
--        has_function_privilege('anon','public.is_school_lifecycle_admin(uuid)','EXECUTE'),
--        has_function_privilege('authenticated','public.is_school_lifecycle_admin(uuid)','EXECUTE');
-- esperado: false | true | false | true | false | true

-- Policies por operação. As antigas FOR ALL de schools/classes também eram
-- SELECT policies e por isso reexpunham archived para org_admin.
DROP POLICY IF EXISTS "Members can view own organization" ON public.organizations;
DROP POLICY IF EXISTS "Only org_admin can modify organization" ON public.organizations;
CREATE POLICY "Active members can view active organization"
  ON public.organizations FOR SELECT TO authenticated
  USING (status = 'active' AND public.is_org_member(id));
CREATE POLICY "Org admin can update active organization"
  ON public.organizations FOR UPDATE TO authenticated
  USING (status = 'active' AND public.is_org_lifecycle_admin(id))
  WITH CHECK (public.is_org_lifecycle_admin(id));

DROP POLICY IF EXISTS "Members can view schools in their org" ON public.schools;
DROP POLICY IF EXISTS "Org admin can manage schools" ON public.schools;
CREATE POLICY "Active members can view active schools"
  ON public.schools FOR SELECT TO authenticated
  USING (status = 'active' AND public.is_org_member(organization_id));
CREATE POLICY "Org admin can insert active schools"
  ON public.schools FOR INSERT TO authenticated
  WITH CHECK (status = 'active' AND public.is_org_lifecycle_admin(organization_id));
CREATE POLICY "Org admin can update active schools"
  ON public.schools FOR UPDATE TO authenticated
  USING (status = 'active' AND public.is_org_lifecycle_admin(organization_id))
  WITH CHECK (public.is_org_lifecycle_admin(organization_id));
CREATE POLICY "Org admin can delete active schools"
  ON public.schools FOR DELETE TO authenticated
  USING (status = 'active' AND public.is_org_lifecycle_admin(organization_id));

DROP POLICY IF EXISTS "Members can view classes in their org" ON public.classes;
DROP POLICY IF EXISTS "Org admin can manage classes" ON public.classes;
CREATE POLICY "Active members can view active classes"
  ON public.classes FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = school_id
        AND s.status = 'active'
        AND public.is_org_member(s.organization_id)
    )
  );
CREATE POLICY "Org admin can insert active classes"
  ON public.classes FOR INSERT TO authenticated
  WITH CHECK (status = 'active' AND public.is_school_lifecycle_admin(school_id));
CREATE POLICY "Org admin can update active classes"
  ON public.classes FOR UPDATE TO authenticated
  USING (status = 'active' AND public.is_school_lifecycle_admin(school_id))
  WITH CHECK (public.is_school_lifecycle_admin(school_id));
CREATE POLICY "Org admin can delete active classes"
  ON public.classes FOR DELETE TO authenticated
  USING (status = 'active' AND public.is_school_lifecycle_admin(school_id));

-- Escopo de escola: organização E escola precisam estar ativas. School admin
-- continua restrito ao school_id do vínculo; vínculo nulo não autoriza escola.
CREATE OR REPLACE FUNCTION public.can_read_school(_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institutional_memberships m
    JOIN public.schools s ON s.id = _school_id
    JOIN public.organizations o ON o.id = s.organization_id
    WHERE m.user_id = auth.uid()
      AND m.status = 'active'
      AND s.status = 'active'
      AND o.status = 'active'
      AND (
        m.role = 'platform_admin'
        OR (m.role = 'org_admin' AND m.organization_id = s.organization_id)
        OR (m.role = 'school_admin'
            AND m.organization_id = s.organization_id
            AND m.school_id IS NOT NULL
            AND m.school_id = _school_id)
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_read_school(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_school(uuid)
  TO authenticated, service_role;

-- Evita copiar pela quarta vez a implementação grande de métricas: preserva a
-- implementação TRUST-1.2 sob nome interno e publica um wrapper fino que aplica
-- o gate ativo e remove classes archived/suspended do JSON.
DO $preserve_metrics_impl$
BEGIN
  IF to_regprocedure('public.get_school_metrics_r29_base(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.get_school_metrics(uuid, text)
      RENAME TO get_school_metrics_r29_base;
  END IF;
END;
$preserve_metrics_impl$;

REVOKE EXECUTE ON FUNCTION public.get_school_metrics_r29_base(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_school_metrics(
  _school_id uuid,
  _period text DEFAULT '30d'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
  _active_classes jsonb;
BEGIN
  -- Preserva a precedência contratual da validação de parâmetro da função base.
  IF _period IS NOT NULL AND _period NOT IN ('7d', '30d', '90d') THEN
    RAISE EXCEPTION 'Invalid period: expected 7d, 30d or 90d' USING ERRCODE = '22023';
  END IF;

  IF auth.uid() IS NULL OR NOT public.can_read_school(_school_id) THEN
    RAISE EXCEPTION 'School not available for this account' USING ERRCODE = '42501';
  END IF;

  _result := public.get_school_metrics_r29_base(_school_id, _period);

  SELECT coalesce(jsonb_agg(item ORDER BY ord), '[]'::jsonb)
    INTO _active_classes
  FROM jsonb_array_elements(coalesce(_result->'classes', '[]'::jsonb))
       WITH ORDINALITY AS entries(item, ord)
  WHERE EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = (item->>'key')::uuid
      AND c.school_id = _school_id
      AND c.status = 'active'
  );

  RETURN jsonb_set(_result, '{classes}', _active_classes, true);
END;
$$;

COMMENT ON FUNCTION public.get_school_metrics(uuid, text) IS
  'TRUST-1.3/R29: métricas somente de organização/escola ativas; classes não ativas são omitidas.';

REVOKE EXECUTE ON FUNCTION public.get_school_metrics(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_school_metrics(uuid, text)
  TO authenticated;

-- Analytics/summary organizacionais já chamam is_org_admin(_org_id). A
-- redefinição operacional acima faz ambos negarem organization não ativa sem
-- duplicar seus corpos extensos.

-- Verificações pós-aplicação:
-- SELECT has_function_privilege('anon','public.can_read_school(uuid)','EXECUTE'),
--        has_function_privilege('authenticated','public.can_read_school(uuid)','EXECUTE'),
--        has_function_privilege('anon','public.get_school_metrics(uuid,text)','EXECUTE'),
--        has_function_privilege('authenticated','public.get_school_metrics(uuid,text)','EXECUTE'),
--        has_function_privilege('authenticated','public.get_school_metrics_r29_base(uuid,text)','EXECUTE');
-- esperado: false | true | false | true | false
--
-- SELECT tablename, policyname, cmd FROM pg_policies
--  WHERE schemaname='public' AND tablename IN ('organizations','schools','classes')
--  ORDER BY tablename, policyname;
-- esperado: nenhuma policy FOR ALL; SELECT operacional exige status active.

-- PostgreSQL aplica a SELECT policy também ao estado novo de UPDATE. Portanto,
-- arquivar diretamente e esconder archived são objetivos incompatíveis via RLS.
-- Esta RPC é a porta explícita de ciclo de vida: deriva tenant/role do banco,
-- aceita apenas o vocabulário fechado e preserva a linha e o ledger.
CREATE OR REPLACE FUNCTION public.archive_institutional_entity(
  _entity text,
  _entity_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  CASE _entity
    WHEN 'organization' THEN
      SELECT id INTO _org_id FROM public.organizations WHERE id = _entity_id;
    WHEN 'school' THEN
      SELECT organization_id INTO _org_id FROM public.schools WHERE id = _entity_id;
    WHEN 'class' THEN
      SELECT s.organization_id INTO _org_id
      FROM public.classes c JOIN public.schools s ON s.id = c.school_id
      WHERE c.id = _entity_id;
    ELSE
      RAISE EXCEPTION 'Invalid entity: expected organization, school or class'
        USING ERRCODE = '22023';
  END CASE;

  IF _org_id IS NULL OR NOT public.is_org_lifecycle_admin(_org_id) THEN
    RAISE EXCEPTION 'Institutional entity not available for this account'
      USING ERRCODE = '42501';
  END IF;

  CASE _entity
    WHEN 'organization' THEN
      UPDATE public.organizations SET status = 'archived' WHERE id = _entity_id;
    WHEN 'school' THEN
      UPDATE public.schools SET status = 'archived' WHERE id = _entity_id;
    WHEN 'class' THEN
      UPDATE public.classes SET status = 'archived' WHERE id = _entity_id;
  END CASE;

  RETURN jsonb_build_object('entity', _entity, 'id', _entity_id, 'archived', true);
END;
$$;

COMMENT ON FUNCTION public.archive_institutional_entity(text, uuid) IS
  'TRUST-1.3/R29: arquivamento tenant-scoped sem criar SELECT policy para entidades inativas; preserva ledger e FKs.';

REVOKE EXECUTE ON FUNCTION public.archive_institutional_entity(text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_institutional_entity(text, uuid)
  TO authenticated;

-- Verificação:
-- SELECT has_function_privilege('anon',
--          'public.archive_institutional_entity(text,uuid)','EXECUTE'),
--        has_function_privilege('authenticated',
--          'public.archive_institutional_entity(text,uuid)','EXECUTE');
-- esperado: false | true
