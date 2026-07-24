-- ONDA 5 — Indicadores operacionais mínimos para observabilidade do piloto.
-- RPC que retorna métricas agregadas para o admin (platform_admin / org_admin):
-- custo estimado de IA, assentos consumidos, erros recentes, convites pendentes.
-- SECURITY DEFINER, self-scoped to org membership. Sem PII.

CREATE OR REPLACE FUNCTION public.get_operational_metrics(_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _result jsonb;
  _total_members integer;
  _total_invitations_pending integer;
  _ai_usage_today integer;
  _ai_usage_week integer;
  _recent_errors integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  -- Verify caller is org_admin
  IF NOT public.is_org_admin(_organization_id) THEN
    RAISE EXCEPTION 'Insufficient permissions' USING ERRCODE = '42501';
  END IF;

  -- Active members count
  SELECT count(*)::integer INTO _total_members
  FROM public.institutional_memberships
  WHERE organization_id = _organization_id AND status = 'active';

  -- Pending invitations
  SELECT count(*)::integer INTO _total_invitations_pending
  FROM public.institutional_invitations
  WHERE organization_id = _organization_id AND accepted_at IS NULL AND expires_at > now();

  -- AI usage today (all org members combined)
  SELECT COALESCE(sum(request_count), 0)::integer INTO _ai_usage_today
  FROM public.ai_usage_limits al
  JOIN public.institutional_memberships m ON m.user_id = al.user_id
  WHERE m.organization_id = _organization_id
    AND m.status = 'active'
    AND al.usage_date = timezone('utc', now())::date;

  -- AI usage last 7 days
  SELECT COALESCE(sum(request_count), 0)::integer INTO _ai_usage_week
  FROM public.ai_usage_limits al
  JOIN public.institutional_memberships m ON m.user_id = al.user_id
  WHERE m.organization_id = _organization_id
    AND m.status = 'active'
    AND al.usage_date >= (timezone('utc', now())::date - 7);

  -- Recent errors (from data_access_logs, last 24h, error actions)
  SELECT count(*)::integer INTO _recent_errors
  FROM public.data_access_logs
  WHERE action LIKE '%error%' OR action LIKE '%blocked%'
    AND created_at > now() - interval '24 hours'
    AND actor_user_id IN (
      SELECT user_id FROM public.institutional_memberships
      WHERE organization_id = _organization_id AND status = 'active'
    );

  _result := jsonb_build_object(
    'organization_id', _organization_id,
    'generated_at', now(),
    'members_active', _total_members,
    'invitations_pending', _total_invitations_pending,
    'ai_usage_today', _ai_usage_today,
    'ai_usage_7d', _ai_usage_week,
    'ai_estimated_cost_7d_brl', round((_ai_usage_week * 0.015)::numeric, 2), -- ~R$0.015 per request estimate
    'recent_errors_24h', _recent_errors
  );

  -- Audit
  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'READ', 'operational_metrics', 'org_admin_observability',
    jsonb_build_object('scope_type', 'org', 'organization_id', _organization_id), 1);

  RETURN _result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_operational_metrics(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_operational_metrics(uuid) TO authenticated;

-- Verificação:
-- SELECT has_function_privilege('authenticated', 'public.get_operational_metrics(uuid)', 'EXECUTE'); -- true
-- SELECT has_function_privilege('anon', 'public.get_operational_metrics(uuid)', 'EXECUTE'); -- false
