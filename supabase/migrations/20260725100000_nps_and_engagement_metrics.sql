-- ONDA 6 — NPS + Métricas de Engajamento Real
-- Tabela de respostas NPS (ledger: INSERT-only, sem UPDATE/DELETE para authenticated)
-- + View materializada de métricas de engajamento (sessões, exercícios, IA)
-- Idempotente (IF NOT EXISTS).

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. NPS RESPONSES (micro-survey in-app)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.nps_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  score smallint NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback text, -- optional open-ended comment
  context text DEFAULT 'general' CHECK (context IN ('general', 'module_complete', 'week_end', 'pilot_end')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

-- User can INSERT own NPS (ledger: no UPDATE/DELETE)
CREATE POLICY "Users can submit own NPS"
  ON public.nps_responses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User can read own NPS history
CREATE POLICY "Users can view own NPS"
  ON public.nps_responses FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Org admin can view aggregated NPS for their org
CREATE POLICY "Org admin can view org NPS"
  ON public.nps_responses FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND public.is_org_admin(organization_id)
  );

REVOKE ALL ON TABLE public.nps_responses FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.nps_responses TO authenticated;
GRANT ALL ON TABLE public.nps_responses TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. ENGAGEMENT EVENTS (lightweight usage tracking for pilot metrics)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.engagement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'session_start', 'module_view', 'exercise_complete', 'ai_interaction',
    'quiz_complete', 'flashcard_session', 'dynamic_complete', 'streak_day'
  )),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.engagement_events ENABLE ROW LEVEL SECURITY;

-- User can INSERT own events (ledger: no UPDATE/DELETE)
CREATE POLICY "Users can log own engagement"
  ON public.engagement_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User can view own history
CREATE POLICY "Users can view own engagement"
  ON public.engagement_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Org admin can view events for their org (aggregated queries)
CREATE POLICY "Org admin can view org engagement"
  ON public.engagement_events FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND public.is_org_admin(organization_id)
  );

REVOKE ALL ON TABLE public.engagement_events FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.engagement_events TO authenticated;
GRANT ALL ON TABLE public.engagement_events TO service_role;

-- Index for org-level queries
CREATE INDEX IF NOT EXISTS idx_engagement_events_org_type
  ON public.engagement_events (organization_id, event_type, created_at DESC)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nps_responses_org
  ON public.nps_responses (organization_id, created_at DESC)
  WHERE organization_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. RPC: get_org_engagement_summary (aggregated, no PII)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_org_engagement_summary(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN
  -- Only org_admin can call
  IF NOT public.is_org_admin(_org_id) THEN
    RAISE EXCEPTION 'Acesso negado: requer org_admin';
  END IF;

  SELECT jsonb_build_object(
    'organization_id', _org_id,
    'generated_at', now(),
    'period_days', 30,
    'total_sessions', COALESCE((
      SELECT count(*) FROM engagement_events
      WHERE organization_id = _org_id AND event_type = 'session_start'
        AND created_at > now() - interval '30 days'
    ), 0),
    'total_exercises', COALESCE((
      SELECT count(*) FROM engagement_events
      WHERE organization_id = _org_id AND event_type IN ('exercise_complete', 'dynamic_complete', 'quiz_complete')
        AND created_at > now() - interval '30 days'
    ), 0),
    'total_ai_interactions', COALESCE((
      SELECT count(*) FROM engagement_events
      WHERE organization_id = _org_id AND event_type = 'ai_interaction'
        AND created_at > now() - interval '30 days'
    ), 0),
    'active_users_7d', COALESCE((
      SELECT count(DISTINCT user_id) FROM engagement_events
      WHERE organization_id = _org_id
        AND created_at > now() - interval '7 days'
    ), 0),
    'active_users_30d', COALESCE((
      SELECT count(DISTINCT user_id) FROM engagement_events
      WHERE organization_id = _org_id
        AND created_at > now() - interval '30 days'
    ), 0),
    'nps_avg', COALESCE((
      SELECT round(avg(score)::numeric, 1) FROM nps_responses
      WHERE organization_id = _org_id
        AND created_at > now() - interval '30 days'
    ), null),
    'nps_count', COALESCE((
      SELECT count(*) FROM nps_responses
      WHERE organization_id = _org_id
        AND created_at > now() - interval '30 days'
    ), 0),
    'nps_promoters', COALESCE((
      SELECT count(*) FROM nps_responses
      WHERE organization_id = _org_id AND score >= 9
        AND created_at > now() - interval '30 days'
    ), 0),
    'nps_detractors', COALESCE((
      SELECT count(*) FROM nps_responses
      WHERE organization_id = _org_id AND score <= 6
        AND created_at > now() - interval '30 days'
    ), 0)
  ) INTO _result;

  RETURN _result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_org_engagement_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_org_engagement_summary(uuid) TO authenticated, service_role;

-- Verificação:
-- SELECT public.get_org_engagement_summary('00000000-0000-4000-8000-0000000000d0'::uuid);
