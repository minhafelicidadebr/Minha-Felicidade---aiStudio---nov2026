-- Security invariants foundation.
CREATE TABLE IF NOT EXISTS public.data_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  action text NOT NULL,
  resource text NOT NULL,
  purpose text NOT NULL,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_count integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to data access logs" ON public.data_access_logs;
CREATE POLICY "No client access to data access logs"
ON public.data_access_logs
FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

REVOKE ALL ON TABLE public.data_access_logs FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.data_access_logs TO service_role;

DROP POLICY IF EXISTS "Managers can view all progress" ON public.user_progress;
DROP POLICY IF EXISTS "Teachers can view all progress" ON public.user_progress;

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Owners can manage own org subscriptions" ON public.organization_subscriptions;
DROP POLICY IF EXISTS "Teachers/managers can view org subscriptions" ON public.organization_subscriptions;

DROP POLICY IF EXISTS "Members can view assigned org subscriptions" ON public.organization_subscriptions;
CREATE POLICY "Members can view assigned org subscriptions"
ON public.organization_subscriptions
FOR SELECT TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.org_subscription_id = organization_subscriptions.id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
  )
);

CREATE OR REPLACE FUNCTION public.get_my_profile()
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

  SELECT jsonb_build_object(
    'profile', to_jsonb(p),
    'roles', COALESCE(
      (
        SELECT jsonb_agg(ur.role ORDER BY ur.role)
        FROM public.user_roles ur
        WHERE ur.user_id = _uid
      ),
      '[]'::jsonb
    )
  )
  INTO _result
  FROM public.profiles p
  WHERE p.user_id = _uid;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'READ', 'profiles', 'self_profile', jsonb_build_object('scope_type', 'self'), 1);

  RETURN COALESCE(_result, jsonb_build_object('profile', NULL, 'roles', '[]'::jsonb));
END;
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
      WHERE us.user_id = _uid AND us.status IN ('active','trialing')
      ORDER BY sp.sort_order DESC
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
        'status', os.status,
        'billing_interval', os.billing_interval,
        'current_period_end', os.current_period_end
      )
      FROM public.organization_members om
      JOIN public.organization_subscriptions os ON os.id = om.org_subscription_id
      JOIN public.subscription_plans sp ON sp.id = os.plan_id
      WHERE om.user_id = _uid
        AND om.status = 'active'
        AND os.status IN ('active','trialing')
      ORDER BY sp.sort_order DESC
      LIMIT 1
    ),
    jsonb_build_object(
      'plan_slug', 'free',
      'plan_name', 'Gratuito',
      'features', '["modules","quiz_basic","flashcards_basic","alegria_5","dashboard"]'::jsonb,
      'limits', '{"alegria_daily": 5, "quiz_levels": 1}'::jsonb,
      'source', 'default',
      'status', 'active'
    )
  )
  INTO _result;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'READ', 'plan_entitlements', 'feature_gate', jsonb_build_object('scope_type', 'self'), 1);

  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_my_feature(_feature text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.get_my_plan() -> 'features')::jsonb ? _feature
$$;

CREATE OR REPLACE FUNCTION public.get_my_learning_progress_summary()
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

  SELECT jsonb_build_object(
    'total_xp', COALESCE(SUM(xp_earned), 0),
    'completed_activities', COUNT(*) FILTER (WHERE completed),
    'activity_events', COUNT(*),
    'modules_active', COUNT(DISTINCT module_id),
    'module_engagement', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'module_id', module_id,
            'activity_events', activity_events,
            'completed_activities', completed_activities,
            'xp', xp
          )
          ORDER BY module_id
        )
        FROM (
          SELECT
            module_id,
            COUNT(*)::integer AS activity_events,
            COUNT(*) FILTER (WHERE completed)::integer AS completed_activities,
            COALESCE(SUM(xp_earned), 0)::integer AS xp
          FROM public.user_progress
          WHERE user_id = _uid
          GROUP BY module_id
        ) module_counts
      ),
      '[]'::jsonb
    )
  )
  INTO _result
  FROM public.user_progress
  WHERE user_id = _uid;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'READ', 'user_progress', 'self_progress_summary', jsonb_build_object('scope_type', 'self'), 1);

  RETURN COALESCE(
    _result,
    jsonb_build_object(
      'total_xp', 0,
      'completed_activities', 0,
      'activity_events', 0,
      'modules_active', 0,
      'module_engagement', '[]'::jsonb
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_learning_progress_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_staff boolean;
  _respondent_count integer;
  _minimum_sample integer := 5;
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT public.has_role(_uid, 'teacher') OR public.has_role(_uid, 'manager')
  INTO _is_staff;

  IF NOT COALESCE(_is_staff, false) THEN
    RAISE EXCEPTION 'Insufficient permissions' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(DISTINCT user_id)::integer
  INTO _respondent_count
  FROM public.user_progress;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (
    _uid,
    'READ',
    'user_progress_aggregate',
    'staff_aggregate_dashboard',
    jsonb_build_object('scope_type', 'legacy_platform', 'minimum_sample', _minimum_sample),
    _respondent_count
  );

  IF _respondent_count < _minimum_sample THEN
    RETURN jsonb_build_object(
      'generated_at', now(),
      'scope_type', 'legacy_platform',
      'respondent_count', _respondent_count,
      'minimum_sample', _minimum_sample,
      'insufficient_sample', true,
      'global', NULL,
      'module_engagement', '[]'::jsonb,
      'activity_distribution', '{}'::jsonb
    );
  END IF;

  WITH stats AS (
    SELECT
      COUNT(DISTINCT user_id)::integer AS respondent_count,
      COALESCE(SUM(xp_earned), 0)::integer AS total_xp,
      COUNT(*) FILTER (WHERE completed)::integer AS completed_activities,
      COUNT(*)::integer AS activity_events
    FROM public.user_progress
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'scope_type', 'legacy_platform',
    'respondent_count', stats.respondent_count,
    'minimum_sample', _minimum_sample,
    'insufficient_sample', false,
    'global', jsonb_build_object(
      'total_students', stats.respondent_count,
      'total_xp', stats.total_xp,
      'total_activities_completed', stats.completed_activities,
      'average_xp_per_student',
        CASE WHEN stats.respondent_count = 0 THEN 0 ELSE ROUND(stats.total_xp::numeric / stats.respondent_count)::integer END
    ),
    'module_engagement', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'module_id', module_id,
            'activity_events', activity_events,
            'completed_activities', completed_activities,
            'total_xp', total_xp,
            'unique_students', unique_students
          )
          ORDER BY module_id
        )
        FROM (
          SELECT
            module_id,
            COUNT(*)::integer AS activity_events,
            COUNT(*) FILTER (WHERE completed)::integer AS completed_activities,
            COALESCE(SUM(xp_earned), 0)::integer AS total_xp,
            COUNT(DISTINCT user_id)::integer AS unique_students
          FROM public.user_progress
          GROUP BY module_id
        ) module_counts
      ),
      '[]'::jsonb
    ),
    'activity_distribution', COALESCE(
      (
        SELECT jsonb_object_agg(activity_type, activity_count)
        FROM (
          SELECT activity_type, COUNT(*)::integer AS activity_count
          FROM public.user_progress
          GROUP BY activity_type
        ) activity_counts
      ),
      '{}'::jsonb
    )
  )
  INTO _result
  FROM stats;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_plan(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_feature(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_plan(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_has_feature(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_plan() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_my_feature(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_learning_progress_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_learning_progress_overview() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_plan() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_my_feature(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_learning_progress_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_learning_progress_overview() TO authenticated;