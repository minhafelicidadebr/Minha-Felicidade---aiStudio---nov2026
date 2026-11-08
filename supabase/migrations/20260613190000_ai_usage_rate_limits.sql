-- Authenticated AI usage guardrails.
-- Prevent authenticated cost abuse without exposing counters to the client.

CREATE TABLE IF NOT EXISTS public.ai_usage_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name text NOT NULL,
  usage_date date NOT NULL DEFAULT (timezone('utc', now())::date),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  first_requested_at timestamptz NOT NULL DEFAULT now(),
  last_requested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, function_name, usage_date),
  CONSTRAINT ai_usage_limits_function_name_check CHECK (
    function_name IN (
      'aledria-chat',
      'cognitive-mirror',
      'future-self',
      'signature-strengths'
    )
  )
);

CREATE INDEX IF NOT EXISTS ai_usage_limits_user_date_idx
ON public.ai_usage_limits (user_id, usage_date DESC);

ALTER TABLE public.ai_usage_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to AI usage limits" ON public.ai_usage_limits;
CREATE POLICY "No client access to AI usage limits"
ON public.ai_usage_limits
FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

REVOKE ALL ON TABLE public.ai_usage_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_usage_limits TO service_role;

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
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  _limit := CASE _function_name
    WHEN 'aledria-chat' THEN 80
    WHEN 'cognitive-mirror' THEN 30
    WHEN 'future-self' THEN 20
    WHEN 'signature-strengths' THEN 20
    ELSE NULL
  END;

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

REVOKE EXECUTE ON FUNCTION public.enforce_ai_usage_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_ai_usage_limit(text) TO authenticated;
