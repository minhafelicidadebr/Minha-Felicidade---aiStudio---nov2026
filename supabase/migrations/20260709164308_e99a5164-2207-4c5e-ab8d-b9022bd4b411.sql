
-- 1) Self-scoped role helper (no arbitrary user_id lookups from clients)
CREATE OR REPLACE FUNCTION public.has_my_role(_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_my_role(public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_my_role(public.app_role) TO authenticated;

-- 2) Lock down handle_new_user (trigger-only) and has_role (used only by policies as definer)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- 3) LEADS: replace permissive INSERT policy and add manager-only UPDATE/DELETE
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
CREATE POLICY "Public can submit valid leads"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    name IS NOT NULL
    AND length(btrim(name)) BETWEEN 1 AND 200
    AND email IS NOT NULL
    AND length(email) BETWEEN 3 AND 320
    AND email LIKE '%_@_%.__%'
    AND (message IS NULL OR length(message) <= 5000)
    AND (organization IS NULL OR length(organization) <= 200)
    AND (city IS NULL OR length(city) <= 120)
    AND (segment IS NULL OR length(segment) <= 120)
    AND (billing_interval IS NULL OR billing_interval IN ('monthly','yearly'))
  );

-- Replace has_role in existing SELECT policy with self-scoped helper
DROP POLICY IF EXISTS "Teachers and managers can read leads" ON public.leads;
CREATE POLICY "Teachers and managers can read leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (public.has_my_role('teacher') OR public.has_my_role('manager'));

CREATE POLICY "Managers can update leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (public.has_my_role('manager'))
  WITH CHECK (public.has_my_role('manager'));

CREATE POLICY "Managers can delete leads"
  ON public.leads
  FOR DELETE
  TO authenticated
  USING (public.has_my_role('manager'));

-- 4) ORGANIZATION_SUBSCRIPTIONS: explicit owner-only UPDATE; no client INSERT/DELETE.
-- (Service role bypasses RLS, so edge functions continue to manage rows.)
CREATE POLICY "Owners can update own org subscriptions"
  ON public.organization_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
