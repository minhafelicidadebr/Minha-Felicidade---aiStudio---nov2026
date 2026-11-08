-- TRUST-1.2.1 — PRIVACY BOUNDARY CLOSURE & SERVER-SIDE ANALYTICS
--
-- R31 medido: org_admin podia projetar todas as colunas de nps_responses e
-- engagement_events. R32 medido: o gate do resumo usava roster elegível, não
-- contribuidores distintos da métrica. Correção forward-only, sem apagar dados.

DO $precheck$
BEGIN
  IF to_regclass('public.nps_responses') IS NULL
     OR to_regclass('public.engagement_events') IS NULL THEN
    RAISE EXCEPTION 'TRUST-1.2.1: tabelas de analytics ausentes.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='metric_minimum_group_size'
  ) THEN
    RAISE EXCEPTION 'TRUST-1.2.1: limiar canônico ausente.';
  END IF;
END;
$precheck$;

-- R31: remover por SEMÂNTICA, não por nome de policy. O self-read
-- `user_id = auth.uid()` permanece. Policies administrativas presentes ou
-- futuramente renomeadas que chamem is_org_admin são removidas.
DO $drop_admin_raw_select$
DECLARE _policy record;
BEGIN
  FOR _policy IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('nps_responses','engagement_events')
      AND cmd='SELECT'
      AND coalesce(qual,'') ~* 'is_org_admin[[:space:]]*\('
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', _policy.policyname, _policy.tablename);
  END LOOP;
END;
$drop_admin_raw_select$;

COMMENT ON TABLE public.nps_responses IS
  'Ledger NPS: self-read do autor e acesso operacional service_role. Analytics institucional somente por RPC agregada.';
COMMENT ON TABLE public.engagement_events IS
  'Ledger de engajamento: self-read do autor e acesso operacional service_role. Analytics institucional somente por RPC agregada.';
-- Uma única série temporal para NPS e engajamento. Oito semanas ISO,
-- ordenadas por bucket_start. Cada métrica aplica k por contribuidores distintos.
CREATE OR REPLACE FUNCTION public.get_org_analytics_series(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid       uuid := auth.uid();
  _min       integer := public.metric_minimum_group_size();
  _start     date := (date_trunc('week', now()) - interval '7 weeks')::date;
  _nps       jsonb;
  _eng       jsonb;
BEGIN
  IF _uid IS NULL OR NOT public.is_org_admin(_org_id) THEN
    RAISE EXCEPTION 'Organization not available for this account' USING ERRCODE='42501';
  END IF;

  WITH buckets AS (
    SELECT generate_series(_start::timestamp, date_trunc('week', now()), interval '1 week')::date AS bucket_start
  ), measured AS (
    SELECT date_trunc('week', created_at)::date AS bucket_start,
           count(DISTINCT user_id) AS contributors,
           round(avg(score)::numeric, 1) AS average
    FROM public.nps_responses
    WHERE organization_id=_org_id AND created_at >= _start
    GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object(
           'bucket_start', to_char(b.bucket_start,'YYYY-MM-DD'),
           'group', CASE
             WHEN coalesce(m.contributors,0)=0 THEN
               jsonb_build_object('suppressed',false,'value',0,'count',0,'isEmpty',true)
             WHEN m.contributors < _min THEN
               jsonb_build_object('suppressed',true,'reason','below_threshold','minimumGroupSize',_min)
             ELSE jsonb_build_object('suppressed',false,'value',m.average,
                                      'count',m.contributors,'isEmpty',false)
           END) ORDER BY b.bucket_start)
  INTO _nps
  FROM buckets b LEFT JOIN measured m USING (bucket_start);

  WITH buckets AS (
    SELECT generate_series(_start::timestamp, date_trunc('week', now()), interval '1 week')::date AS bucket_start
  ), measured AS (
    SELECT date_trunc('week', created_at)::date AS bucket_start,
      count(*) FILTER (WHERE event_type='session_start') AS sessions_value,
      count(DISTINCT user_id) FILTER (WHERE event_type='session_start') AS sessions_people,
      count(*) FILTER (WHERE event_type IN ('exercise_complete','quiz_complete','dynamic_complete','flashcard_session')) AS exercises_value,
      count(DISTINCT user_id) FILTER (WHERE event_type IN ('exercise_complete','quiz_complete','dynamic_complete','flashcard_session')) AS exercises_people,
      count(*) FILTER (WHERE event_type='ai_interaction') AS ai_value,
      count(DISTINCT user_id) FILTER (WHERE event_type='ai_interaction') AS ai_people
    FROM public.engagement_events
    WHERE organization_id=_org_id AND created_at >= _start
    GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object(
    'bucket_start',to_char(b.bucket_start,'YYYY-MM-DD'),
    'sessions', CASE
      WHEN coalesce(m.sessions_people,0)=0 THEN jsonb_build_object('suppressed',false,'value',0,'count',0,'isEmpty',true)
      WHEN m.sessions_people < _min THEN jsonb_build_object('suppressed',true,'reason','below_threshold','minimumGroupSize',_min)
      ELSE jsonb_build_object('suppressed',false,'value',m.sessions_value,'count',m.sessions_people,'isEmpty',false) END,
    'exercises', CASE
      WHEN coalesce(m.exercises_people,0)=0 THEN jsonb_build_object('suppressed',false,'value',0,'count',0,'isEmpty',true)
      WHEN m.exercises_people < _min THEN jsonb_build_object('suppressed',true,'reason','below_threshold','minimumGroupSize',_min)
      ELSE jsonb_build_object('suppressed',false,'value',m.exercises_value,'count',m.exercises_people,'isEmpty',false) END,
    'ai_interactions', CASE
      WHEN coalesce(m.ai_people,0)=0 THEN jsonb_build_object('suppressed',false,'value',0,'count',0,'isEmpty',true)
      WHEN m.ai_people < _min THEN jsonb_build_object('suppressed',true,'reason','below_threshold','minimumGroupSize',_min)
      ELSE jsonb_build_object('suppressed',false,'value',m.ai_value,'count',m.ai_people,'isEmpty',false) END
  ) ORDER BY b.bucket_start)
  INTO _eng
  FROM buckets b LEFT JOIN measured m USING (bucket_start);

  INSERT INTO public.data_access_logs(actor_user_id,action,resource,purpose,scope,row_count)
  VALUES (_uid,'SELECT','organization_analytics','get_org_analytics_series',
          jsonb_build_object('scope_type','organization','organization_id',_org_id,
                             'minimum_group_size',_min,'weeks',8),1);

  RETURN jsonb_build_object(
    'organization_id',_org_id,
    'generated_at',now(),
    'period_weeks',8,
    'minimum_group_size',_min,
    'nps',coalesce(_nps,'[]'::jsonb),
    'engagement',coalesce(_eng,'[]'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_org_analytics_series(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_analytics_series(uuid)
  TO authenticated, service_role;
-- R32: resumo de 30 dias com gate independente por métrica. Roster elegível
-- continua informativo, mas nunca autoriza divulgação de uma métrica sem k
-- contribuidores reais.
CREATE OR REPLACE FUNCTION public.get_org_engagement_summary(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _min integer := public.metric_minimum_group_size();
  _eligible bigint;
  _sessions bigint; _sessions_people bigint;
  _exercises bigint; _exercises_people bigint;
  _ai bigint; _ai_people bigint;
  _active_7 bigint; _active_30 bigint;
  _nps_count bigint; _nps_people bigint; _nps_promoters bigint; _nps_detractors bigint;
  _nps_avg numeric;
  _suppressed jsonb;
BEGIN
  IF _uid IS NULL OR NOT public.is_org_admin(_org_id) THEN
    RAISE EXCEPTION 'Organization not available for this account' USING ERRCODE='42501';
  END IF;

  SELECT count(DISTINCT user_id) INTO _eligible
  FROM public.institutional_memberships
  WHERE organization_id=_org_id AND status='active' AND role='student';

  SELECT
    count(*) FILTER (WHERE event_type='session_start'),
    count(DISTINCT user_id) FILTER (WHERE event_type='session_start'),
    count(*) FILTER (WHERE event_type IN ('exercise_complete','dynamic_complete','quiz_complete')),
    count(DISTINCT user_id) FILTER (WHERE event_type IN ('exercise_complete','dynamic_complete','quiz_complete')),
    count(*) FILTER (WHERE event_type='ai_interaction'),
    count(DISTINCT user_id) FILTER (WHERE event_type='ai_interaction'),
    count(DISTINCT user_id) FILTER (WHERE created_at > now()-interval '7 days'),
    count(DISTINCT user_id)
  INTO _sessions,_sessions_people,_exercises,_exercises_people,
       _ai,_ai_people,_active_7,_active_30
  FROM public.engagement_events
  WHERE organization_id=_org_id AND created_at > now()-interval '30 days';

  SELECT count(*),count(DISTINCT user_id),round(avg(score)::numeric,1),
         count(*) FILTER (WHERE score>=9),count(*) FILTER (WHERE score<=6)
  INTO _nps_count,_nps_people,_nps_avg,_nps_promoters,_nps_detractors
  FROM public.nps_responses
  WHERE organization_id=_org_id AND created_at > now()-interval '30 days';

  SELECT coalesce(jsonb_agg(name ORDER BY name),'[]'::jsonb) INTO _suppressed
  FROM (VALUES
    ('active_users_7d', _active_7 > 0 AND _active_7 < _min),
    ('active_users_30d', _active_30 > 0 AND _active_30 < _min),
    ('nps', _nps_people > 0 AND _nps_people < _min),
    ('total_ai_interactions', _ai_people > 0 AND _ai_people < _min),
    ('total_exercises', _exercises_people > 0 AND _exercises_people < _min),
    ('total_sessions', _sessions_people > 0 AND _sessions_people < _min)
  ) AS status(name,is_suppressed)
  WHERE is_suppressed;
  INSERT INTO public.data_access_logs(actor_user_id,action,resource,purpose,scope,row_count)
  VALUES (_uid,'SELECT','organization_analytics','get_org_engagement_summary',
          jsonb_build_object('scope_type','organization','organization_id',_org_id,
                             'minimum_group_size',_min,'period_days',30),1);

  RETURN jsonb_build_object(
    'organization_id',_org_id,'generated_at',now(),'period_days',30,
    'minimum_group_size',_min,
    'analytics_suppressed',jsonb_array_length(_suppressed)>0,
    'suppressed_metrics',_suppressed,
    'eligible_universe',CASE WHEN _eligible=0 OR _eligible>=_min THEN _eligible ELSE NULL END,
    'total_sessions',CASE WHEN _sessions_people=0 OR _sessions_people>=_min THEN _sessions ELSE NULL END,
    'total_exercises',CASE WHEN _exercises_people=0 OR _exercises_people>=_min THEN _exercises ELSE NULL END,
    'total_ai_interactions',CASE WHEN _ai_people=0 OR _ai_people>=_min THEN _ai ELSE NULL END,
    'active_users_7d',CASE WHEN _active_7=0 OR _active_7>=_min THEN _active_7 ELSE NULL END,
    'active_users_30d',CASE WHEN _active_30=0 OR _active_30>=_min THEN _active_30 ELSE NULL END,
    'nps_avg',CASE WHEN _nps_people=0 OR _nps_people>=_min THEN _nps_avg ELSE NULL END,
    'nps_count',CASE WHEN _nps_people=0 OR _nps_people>=_min THEN _nps_count ELSE NULL END,
    'nps_promoters',CASE WHEN _nps_people=0 OR _nps_people>=_min THEN _nps_promoters ELSE NULL END,
    'nps_detractors',CASE WHEN _nps_people=0 OR _nps_people>=_min THEN _nps_detractors ELSE NULL END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_org_engagement_summary(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_engagement_summary(uuid)
  TO authenticated, service_role;

-- Verificação pós-aplicação:
-- SELECT tablename,policyname,qual FROM pg_policies
--  WHERE schemaname='public' AND tablename IN ('nps_responses','engagement_events')
--    AND cmd='SELECT'; -- somente self-read
-- SELECT has_function_privilege('anon','public.get_org_analytics_series(uuid)','EXECUTE'),
--        has_function_privilege('authenticated','public.get_org_analytics_series(uuid)','EXECUTE');
-- esperado: false | true
