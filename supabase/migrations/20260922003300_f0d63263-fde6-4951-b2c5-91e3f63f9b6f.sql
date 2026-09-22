-- Security linter remediation: restore least-privilege EXECUTE grants and pin search_path.

-- Remove inherited/public EXECUTE from every SECURITY DEFINER function.
DO $do$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      fn
    );
  END LOOP;
END
$do$;

-- Self-scoped/account RPCs intentionally available to signed-in users.
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_plan() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_my_feature(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_learning_progress_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_learning_progress_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_guardian_consent_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_guardian_consent(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_birth_date(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_payment_history() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_subscription_cancellation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_escolar_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_escolar_with_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_ai_usage_limit(text) TO authenticated;

-- Role and tenancy helpers used by RLS and authenticated application flows.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_my_role(public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_school(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;

-- Authenticated institutional workflows with in-function authorization checks.
GRANT EXECUTE ON FUNCTION public.create_organization(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_member(uuid, text, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resend_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_indicator(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_school_metrics(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_operational_metrics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_engagement_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_funnel_overview(integer) TO authenticated;

-- Internal helpers and lifecycle jobs remain service-only.
REVOKE EXECUTE ON FUNCTION public.get_user_plan(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_feature(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.run_subscription_lifecycle(integer) FROM PUBLIC, anon, authenticated;

-- Pin the only mutable public function search path.
ALTER FUNCTION public.protect_birth_date_immutable() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.protect_birth_date_immutable() FROM PUBLIC, anon, authenticated;

-- Trigger and internal functions need no client grants. Service role remains available
-- through its administrative privileges and explicit historical grants.