
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date date;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, birth_date)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'birth_date', '')::date
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.guardian_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_name text NOT NULL,
  guardian_email text NOT NULL,
  policy_version text NOT NULL,
  decision text NOT NULL DEFAULT 'granted' CHECK (decision = 'granted'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, policy_version)
);

REVOKE ALL ON public.guardian_consent_events FROM anon, authenticated;
GRANT SELECT ON public.guardian_consent_events TO authenticated;
GRANT ALL ON public.guardian_consent_events TO service_role;

ALTER TABLE public.guardian_consent_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own guardian consent" ON public.guardian_consent_events;
CREATE POLICY "Users can view own guardian consent"
ON public.guardian_consent_events FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.record_guardian_consent(
  _guardian_name text,
  _guardian_email text,
  _policy_version text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _birth_date date;
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF trim(_guardian_name) = '' OR trim(_guardian_email) = '' OR trim(_policy_version) = '' THEN
    RAISE EXCEPTION 'guardian_name, guardian_email and policy_version are required' USING ERRCODE = '22023';
  END IF;

  SELECT birth_date INTO _birth_date FROM public.profiles WHERE user_id = _uid;
  IF _birth_date IS NOT NULL AND date_part('year', age(now(), _birth_date)) >= 18 THEN
    RAISE EXCEPTION 'Guardian consent is only applicable to minor accounts' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.guardian_consent_events (user_id, guardian_name, guardian_email, policy_version)
  VALUES (_uid, trim(_guardian_name), trim(_guardian_email), trim(_policy_version))
  ON CONFLICT (user_id, policy_version) DO NOTHING
  RETURNING jsonb_build_object('granted', true, 'policy_version', policy_version, 'occurred_at', occurred_at)
  INTO _result;

  IF _result IS NULL THEN
    SELECT jsonb_build_object('granted', true, 'policy_version', policy_version, 'occurred_at', occurred_at)
    INTO _result
    FROM public.guardian_consent_events
    WHERE user_id = _uid AND policy_version = trim(_policy_version);
  END IF;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'INSERT', 'guardian_consent_events', 'lgpd_art14_consent', jsonb_build_object('scope_type', 'self'), 1);

  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_guardian_consent_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _birth_date date;
  _age integer;
  _granted_event record;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT birth_date INTO _birth_date FROM public.profiles WHERE user_id = _uid;

  IF _birth_date IS NULL THEN
    RETURN jsonb_build_object('requires_consent', false, 'reason', 'unknown_birth_date', 'granted', false);
  END IF;

  _age := date_part('year', age(now(), _birth_date));
  IF _age >= 18 THEN
    RETURN jsonb_build_object('requires_consent', false, 'reason', 'adult', 'granted', false);
  END IF;

  SELECT guardian_name, occurred_at, policy_version INTO _granted_event
  FROM public.guardian_consent_events
  WHERE user_id = _uid
  ORDER BY occurred_at DESC
  LIMIT 1;

  IF _granted_event IS NULL THEN
    RETURN jsonb_build_object('requires_consent', true, 'reason', 'minor_pending', 'granted', false);
  END IF;

  RETURN jsonb_build_object(
    'requires_consent', true,
    'reason', 'minor_consented',
    'granted', true,
    'guardian_name', _granted_event.guardian_name,
    'occurred_at', _granted_event.occurred_at,
    'policy_version', _granted_event.policy_version
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_guardian_consent(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_guardian_consent_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_guardian_consent(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_guardian_consent_status() TO authenticated;
