-- P0 corte 1.3 — Limites de IA centralizados
-- O enforce_ai_usage_limit tinha limites HARDCODED (80/30/20 pra qualquer
-- usuário, independente do plano). O plano gratuito promete 9/dia de AlegrIA;
-- o premium promete ilimitado (-1). Essa inconsistência violava o critério
-- "landing, banco, edge functions e frontend exibem a mesma regra".
--
-- Correção: o RPC agora consulta get_my_plan()->'limits'->'alegria_daily' como
-- fonte canônica do limite da AlegrIA. Para as demais funções de IA
-- (cognitive-mirror, future-self, signature-strengths), aplica limites fixos
-- razoáveis (eles não são comercializados como feature com limite por plano na
-- landing, então hardcoded é aceitável por ora; se um dia forem vendidos com
-- limites por plano, migrar para o mesmo padrão).
--
-- Idempotente (CREATE OR REPLACE).
-- SECURITY DEFINER + SET search_path = public + REVOKE/GRANT preservados.

CREATE OR REPLACE FUNCTION public.enforce_ai_usage_limit(_function_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _usage_date date := timezone('utc', now())::date;
  _limit integer;
  _count integer;
  _allowed boolean := false;
  _plan jsonb;
  _plan_limit integer;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Resolve o limite baseado no plano do usuário para aledria-chat.
  -- Demais funções mantêm limites fixos (não são feature comercializada por plano).
  IF _function_name = 'aledria-chat' THEN
    _plan := public.get_my_plan();
    _plan_limit := (_plan -> 'limits' ->> 'alegria_daily')::integer;
    IF _plan_limit IS NOT NULL AND _plan_limit = -1 THEN
      -- Ilimitado: não contar, retornar permitido direto.
      RETURN jsonb_build_object(
        'allowed', true,
        'function_name', _function_name,
        'usage_date', _usage_date,
        'limit', -1,
        'used', 0,
        'remaining', -1,
        'reset_at', ((_usage_date + 1)::timestamp AT TIME ZONE 'UTC')
      );
    END IF;
    _limit := COALESCE(_plan_limit, 9); -- fallback conservador: 9 (free)
  ELSE
    _limit := CASE _function_name
      WHEN 'cognitive-mirror' THEN 30
      WHEN 'future-self' THEN 20
      WHEN 'signature-strengths' THEN 20
      ELSE NULL
    END;
  END IF;

  IF _limit IS NULL THEN
    RAISE EXCEPTION 'Unknown AI function: %', _function_name;
  END IF;

  WITH upserted AS (
    INSERT INTO public.ai_usage_limits (
      user_id,
      function_name,
      usage_date,
      request_count,
      first_requested_at,
      last_requested_at
    )
    VALUES (_user_id, _function_name, _usage_date, 1, now(), now())
    ON CONFLICT (user_id, function_name, usage_date)
    DO UPDATE
      SET request_count = public.ai_usage_limits.request_count + 1,
          last_requested_at = now()
      WHERE public.ai_usage_limits.request_count < _limit
    RETURNING request_count
  )
  SELECT request_count INTO _count
  FROM upserted;

  IF _count IS NULL THEN
    SELECT request_count
    INTO _count
    FROM public.ai_usage_limits
    WHERE user_id = _user_id
      AND function_name = _function_name
      AND usage_date = _usage_date;
  ELSE
    _allowed := true;
  END IF;

  INSERT INTO public.data_access_logs (
    actor_user_id,
    action,
    resource,
    purpose,
    scope,
    row_count
  )
  VALUES (
    _user_id,
    CASE WHEN _allowed THEN 'ai_usage_allowed' ELSE 'ai_usage_blocked' END,
    'ai_usage_limits',
    'edge_function_ai_cost_control',
    jsonb_build_object(
      'function_name', _function_name,
      'usage_date', _usage_date,
      'daily_limit', _limit,
      'request_count', COALESCE(_count, 0)
    ),
    1
  );

  RETURN jsonb_build_object(
    'allowed', _allowed,
    'function_name', _function_name,
    'usage_date', _usage_date,
    'limit', _limit,
    'used', COALESCE(_count, 0),
    'remaining', GREATEST(_limit - COALESCE(_count, 0), 0),
    'reset_at', ((_usage_date + 1)::timestamp AT TIME ZONE 'UTC')
  );
END;
$$;

-- Grants preservados (idempotente)
REVOKE EXECUTE ON FUNCTION public.enforce_ai_usage_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_ai_usage_limit(text) TO authenticated;

-- Verificação manual pós-deploy:
-- 1. Criar um usuário free, testar que após 9 chamadas ao aledria-chat a 10a retorna allowed=false.
-- 2. Criar um usuário premium (intermediate/advanced, alegria_daily=-1): confirmar allowed=true
--    sem incremento do contador.
-- 3. Confirmar que cognitive-mirror/future-self/signature-strengths mantêm 30/20/20.
