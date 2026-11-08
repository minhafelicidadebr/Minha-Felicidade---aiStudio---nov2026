-- Onda 2 — leitura agregada do funil. SECURITY DEFINER (roda como owner,
-- contornando o RLS write-only de landing_events de forma controlada), mas
-- valida o papel internamente (teacher/manager) via has_my_role — mesmo padrão
-- self-checking das demais RPCs. Conta sessões distintas por kind no intervalo,
-- registra o acesso em data_access_logs. A regra de N mínimo (k-anon) é
-- aplicada na UI, que recebe `min_sample` para sinalizar "amostra insuficiente".

CREATE OR REPLACE FUNCTION public.get_funnel_overview(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _min_sample integer := 5; -- mesma constante de admin-dashboard
  _days_safe integer := LEAST(GREATEST(COALESCE(_days, 30), 1), 365);
  _counts jsonb;
BEGIN
  IF NOT (public.has_my_role('teacher') OR public.has_my_role('manager')) THEN
    RAISE EXCEPTION 'insufficient_permissions' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_object_agg(kind, cnt) INTO _counts
  FROM (
    SELECT kind, count(DISTINCT session_id) AS cnt
    FROM public.landing_events
    WHERE created_at > now() - make_interval(days => _days_safe)
    GROUP BY kind
  ) t;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (auth.uid(), 'SELECT', 'landing_events', 'funnel_overview',
    jsonb_build_object('days', _days_safe), 0);

  RETURN jsonb_build_object(
    'counts', COALESCE(_counts, '{}'::jsonb),
    'min_sample', _min_sample,
    'days', _days_safe
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_funnel_overview(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_funnel_overview(integer) TO authenticated;

-- VERIFICAÇÃO (rodar após aplicar):
-- SELECT has_function_privilege('anon', 'public.get_funnel_overview(integer)', 'EXECUTE');          -- false
-- SELECT has_function_privilege('authenticated', 'public.get_funnel_overview(integer)', 'EXECUTE'); -- true
-- Chamar como um usuário sem papel teacher/manager deve levantar insufficient_permissions.
