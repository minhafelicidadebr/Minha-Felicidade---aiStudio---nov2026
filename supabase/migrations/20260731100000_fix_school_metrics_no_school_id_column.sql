-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: engagement_events não tem coluna school_id.
--
-- A RPC get_school_metrics assumiu que engagement_events tinha school_id, mas a
-- tabela só tem organization_id e user_id. A correção: derivar os user_ids da
-- escola via institutional_memberships e filtrar engagement_events por eles.
--
-- Também corrige a subquery de série diária que tinha o mesmo problema, e a
-- subquery de turmas (engagement_events não tem class_id tampouco).
-- ═══════════════════════════════════════════════════════════════════════════════

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
  _uid          uuid := auth.uid();
  _min          integer := public.metric_minimum_group_size();
  _days         integer;
  _since        timestamptz;
  _org_id       uuid;
  _eligible     integer;
  _sessions     integer;
  _exercises    integer;
  _ai           integer;
  _active_7d    integer;
  _classes      jsonb;
  _series       jsonb;
  _generated_at timestamptz := now();
  _totals_suppressed_by_inference boolean := false;
BEGIN
  _days := CASE _period
    WHEN '7d'  THEN 7
    WHEN '30d' THEN 30
    WHEN '90d' THEN 90
    WHEN NULL  THEN 30
    ELSE NULL
  END;

  IF _days IS NULL THEN
    RAISE EXCEPTION 'Invalid period: expected 7d, 30d or 90d' USING ERRCODE = '22023';
  END IF;

  _since := _generated_at - make_interval(days => _days);

  IF _uid IS NULL OR NOT public.can_read_school(_school_id) THEN
    BEGIN
      INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
      VALUES (_uid, 'SELECT', 'school_metrics', 'get_school_metrics_denied',
        jsonb_build_object('scope_type', 'school', 'school_id', _school_id,
          'reason', 'out_of_scope_or_missing', 'period', _period), 0);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RAISE EXCEPTION 'School not available for this account' USING ERRCODE = '42501';
  END IF;

  SELECT organization_id INTO _org_id FROM public.schools WHERE id = _school_id;

  -- Universo elegível: estudantes ativos vinculados A ESTA ESCOLA.
  SELECT count(DISTINCT m.user_id) INTO _eligible
  FROM public.institutional_memberships m
  WHERE m.school_id = _school_id AND m.status = 'active' AND m.role = 'student';

  -- Atividade agregada: filtrar por user_ids da escola (engagement_events não
  -- tem school_id — só organization_id e user_id).
  SELECT
    count(*) FILTER (WHERE e.event_type = 'session_start'),
    count(*) FILTER (WHERE e.event_type IN ('exercise_complete','quiz_complete','dynamic_complete','flashcard_session')),
    count(*) FILTER (WHERE e.event_type = 'ai_interaction'),
    count(DISTINCT e.user_id) FILTER (WHERE e.created_at >= _generated_at - interval '7 days')
  INTO _sessions, _exercises, _ai, _active_7d
  FROM public.engagement_events e
  WHERE e.organization_id = _org_id
    AND e.user_id IN (
      SELECT m.user_id FROM public.institutional_memberships m
      WHERE m.school_id = _school_id AND m.status = 'active' AND m.role = 'student'
    )
    AND e.created_at >= _since;

  -- Turmas: atividade por alunos DAQUELA turma.
  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.label), '[]'::jsonb)
  INTO _classes
  FROM (
    SELECT
      c.id::text AS key,
      c.name     AS label,
      CASE WHEN cnt.eligible >= _min
        THEN jsonb_build_object('suppressed', false, 'value', coalesce(act.total, 0),
                                'count', cnt.eligible, 'isEmpty', cnt.eligible = 0)
        WHEN cnt.eligible = 0
        THEN jsonb_build_object('suppressed', false, 'value', 0, 'count', 0, 'isEmpty', true)
        ELSE jsonb_build_object('suppressed', true, 'reason', 'below_threshold',
                                'minimumGroupSize', _min)
      END AS "group"
    FROM public.classes c
    LEFT JOIN (
      SELECT m.class_id, count(DISTINCT m.user_id) AS eligible
      FROM public.institutional_memberships m
      WHERE m.status = 'active' AND m.role = 'student'
      GROUP BY m.class_id
    ) cnt ON cnt.class_id = c.id
    LEFT JOIN (
      SELECT m.class_id, count(*) AS total
      FROM public.engagement_events e
      JOIN public.institutional_memberships m
        ON m.user_id = e.user_id AND m.status = 'active' AND m.role = 'student'
      WHERE e.created_at >= _since AND e.organization_id = _org_id
      GROUP BY m.class_id
    ) act ON act.class_id = c.id
    WHERE c.school_id = _school_id
  ) t;

  -- Supressão complementar (§D6/D54).
  DECLARE
    _suppressed_count integer;
    _disclosed_count  integer;
    _victim_key       text;
  BEGIN
    SELECT
      count(*) FILTER (WHERE (c->'group'->>'suppressed')::boolean),
      count(*) FILTER (WHERE NOT (c->'group'->>'suppressed')::boolean)
    INTO _suppressed_count, _disclosed_count
    FROM jsonb_array_elements(_classes) AS c;

    IF _eligible >= _min AND _suppressed_count = 1 THEN
      IF _disclosed_count >= 2 THEN
        SELECT c->>'key' INTO _victim_key
        FROM jsonb_array_elements(_classes) AS c
        WHERE NOT (c->'group'->>'suppressed')::boolean
        ORDER BY (c->'group'->>'value')::numeric ASC, c->>'key' ASC
        LIMIT 1;

        SELECT jsonb_agg(
                 CASE WHEN c->>'key' = _victim_key
                   THEN jsonb_set(c, '{group}', jsonb_build_object(
                          'suppressed', true, 'reason', 'complementary',
                          'minimumGroupSize', _min))
                   ELSE c
                 END
                 ORDER BY c->>'label')
        INTO _classes
        FROM jsonb_array_elements(_classes) AS c;
      ELSE
        _totals_suppressed_by_inference := true;
      END IF;
    END IF;
  END;

  -- Série diária: filtrar por user_ids da escola.
  SELECT coalesce(jsonb_agg(row_to_json(p)::jsonb ORDER BY p.day), '[]'::jsonb)
  INTO _series
  FROM (
    SELECT
      to_char(d.day, 'YYYY-MM-DD') AS day,
      CASE WHEN coalesce(s.people, 0) >= _min
        THEN jsonb_build_object('suppressed', false, 'value', coalesce(s.total, 0),
                                'count', coalesce(s.people, 0), 'isEmpty', false)
        WHEN coalesce(s.people, 0) = 0
        THEN jsonb_build_object('suppressed', false, 'value', 0, 'count', 0, 'isEmpty', true)
        ELSE jsonb_build_object('suppressed', true, 'reason', 'below_threshold',
                                'minimumGroupSize', _min)
      END AS "group"
    FROM generate_series(date_trunc('day', _since), date_trunc('day', _generated_at), interval '1 day') AS d(day)
    LEFT JOIN (
      SELECT date_trunc('day', e.created_at) AS day,
             count(*) AS total,
             count(DISTINCT e.user_id) AS people
      FROM public.engagement_events e
      WHERE e.user_id IN (
        SELECT m.user_id FROM public.institutional_memberships m
        WHERE m.school_id = _school_id AND m.status = 'active' AND m.role = 'student'
      )
      AND e.organization_id = _org_id
      AND e.created_at >= _since
      GROUP BY 1
    ) s ON s.day = d.day
  ) p;

  -- Auditoria.
  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'SELECT', 'school_metrics', 'get_school_metrics',
    jsonb_build_object('scope_type', 'school', 'school_id', _school_id,
      'organization_id', _org_id, 'period', _period, 'minimum_group_size', _min), 1);

  RETURN jsonb_build_object(
    'school_id', _school_id,
    'organization_id', _org_id,
    'period', _period,
    'days', _days,
    'minimum_group_size', _min,
    'eligible_universe', _eligible,
    'generated_at', _generated_at,
    'analytics_suppressed', _eligible < _min,
    'totals', CASE WHEN _totals_suppressed_by_inference
      THEN jsonb_build_object(
             'sessions',  jsonb_build_object('suppressed', true, 'reason', 'complementary', 'minimumGroupSize', _min),
             'exercises', jsonb_build_object('suppressed', true, 'reason', 'complementary', 'minimumGroupSize', _min),
             'ai',        jsonb_build_object('suppressed', true, 'reason', 'complementary', 'minimumGroupSize', _min),
             'active_7d', jsonb_build_object('suppressed', true, 'reason', 'complementary', 'minimumGroupSize', _min)
           )
      WHEN _eligible >= _min
      THEN jsonb_build_object(
             'sessions',   jsonb_build_object('suppressed', false, 'value', coalesce(_sessions, 0),  'count', _eligible, 'isEmpty', false),
             'exercises',  jsonb_build_object('suppressed', false, 'value', coalesce(_exercises, 0), 'count', _eligible, 'isEmpty', false),
             'ai',         jsonb_build_object('suppressed', false, 'value', coalesce(_ai, 0),        'count', _eligible, 'isEmpty', false),
             'active_7d',  jsonb_build_object('suppressed', false, 'value', coalesce(_active_7d, 0), 'count', _eligible, 'isEmpty', false)
           )
      ELSE jsonb_build_object(
             'sessions',  jsonb_build_object('suppressed', true, 'reason', 'below_threshold', 'minimumGroupSize', _min),
             'exercises', jsonb_build_object('suppressed', true, 'reason', 'below_threshold', 'minimumGroupSize', _min),
             'ai',        jsonb_build_object('suppressed', true, 'reason', 'below_threshold', 'minimumGroupSize', _min),
             'active_7d', jsonb_build_object('suppressed', true, 'reason', 'below_threshold', 'minimumGroupSize', _min)
           )
      END,
    'classes', CASE WHEN _eligible >= _min THEN _classes ELSE '[]'::jsonb END,
    'series',  CASE WHEN _eligible >= _min THEN _series  ELSE '[]'::jsonb END
  );
END;
$$;

-- Privilégios já foram concedidos na migration original. CREATE OR REPLACE
-- preserva os GRANTs existentes.
