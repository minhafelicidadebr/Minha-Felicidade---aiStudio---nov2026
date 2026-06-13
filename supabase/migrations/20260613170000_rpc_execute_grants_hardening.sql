-- RPC execution grant hardening.
-- Supabase projects may retain explicit EXECUTE grants for anon/authenticated
-- even after REVOKE FROM PUBLIC. Keep legacy user-id RPCs service-only and
-- expose the new self-scoped RPCs only to authenticated sessions.

REVOKE EXECUTE ON FUNCTION public.get_user_plan(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_feature(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_has_feature(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_plan() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_my_feature(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_learning_progress_summary() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_learning_progress_overview() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_plan() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_my_feature(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_learning_progress_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_learning_progress_overview() TO authenticated;
