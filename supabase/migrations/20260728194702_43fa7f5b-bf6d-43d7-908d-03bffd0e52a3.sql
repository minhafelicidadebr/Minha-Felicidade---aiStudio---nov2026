
DROP TABLE IF EXISTS public.ergonomic_assessments CASCADE;
DROP TABLE IF EXISTS public.contextual_risk_reviews CASCADE;
DROP TABLE IF EXISTS public.risk_criteria_versions CASCADE;
DROP TABLE IF EXISTS public.subscription_events CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.membership_invites CASCADE;
DROP TABLE IF EXISTS public.platform_admins CASCADE;
DROP TABLE IF EXISTS public.instrument_versions CASCADE;
DROP TABLE IF EXISTS public.runtime_gates CASCADE;

DROP FUNCTION IF EXISTS public.gate_enabled(text) CASCADE;
DROP FUNCTION IF EXISTS public.touch_runtime_gate() CASCADE;
DROP FUNCTION IF EXISTS public.crr_compute_levels() CASCADE;
DROP FUNCTION IF EXISTS public.crr_guard_approval() CASCADE;
DROP FUNCTION IF EXISTS public.append_audit_event(text, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.verify_audit_chain() CASCADE;
DROP FUNCTION IF EXISTS public.dashboard_response_count() CASCADE;
DROP FUNCTION IF EXISTS public.cycle_response_counts() CASCADE;
DROP FUNCTION IF EXISTS public.create_membership_invite(text, text, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.accept_membership_invite(text) CASCADE;
DROP FUNCTION IF EXISTS public.list_membership_invites() CASCADE;
DROP FUNCTION IF EXISTS public.current_entitlements() CASCADE;
DROP FUNCTION IF EXISTS public.provision_subscription(text) CASCADE;
DROP FUNCTION IF EXISTS public.instrument_version_status(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.instrument_version_item_ids(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.compute_cycle_risk(uuid) CASCADE;

DROP TYPE IF EXISTS public.risk_review_status CASCADE;
DROP TYPE IF EXISTS public.control_effectiveness CASCADE;
DROP TYPE IF EXISTS public.instrument_status CASCADE;
DROP TYPE IF EXISTS public.subscription_status CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invitations') THEN
    EXECUTE 'ALTER TABLE public.invitations DROP COLUMN IF EXISTS rl_window_start';
    EXECUTE 'ALTER TABLE public.invitations DROP COLUMN IF EXISTS rl_count';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cycles') THEN
    EXECUTE 'ALTER TABLE public.cycles DROP COLUMN IF EXISTS instrument_version_id';
  END IF;
END $$;
