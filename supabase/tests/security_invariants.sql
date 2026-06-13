-- Security invariants test suite.
-- Run with: supabase test db

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(13);

SELECT has_table('public', 'data_access_logs', 'audit log table exists');

SELECT is(
  (
    SELECT array_agg(policyname ORDER BY policyname)::text[]
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_progress'
  ),
  ARRAY[
    'Users can insert own progress',
    'Users can update own progress',
    'Users can view own progress'
  ]::text[],
  'user_progress exposes only self-service policies after hardening'
);

SELECT is_empty(
  $$
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_progress'
      AND policyname IN ('Managers can view all progress', 'Teachers can view all progress')
  $$,
  'legacy broad staff progress policies are absent'
);

SELECT is_empty(
  $$
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_subscriptions'
      AND cmd IN ('INSERT', 'UPDATE')
  $$,
  'client cannot insert or update user subscription state'
);

SELECT is_empty(
  $$
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_subscriptions'
      AND policyname = 'Teachers/managers can view org subscriptions'
  $$,
  'staff role alone cannot read every organization subscription'
);

SELECT has_function('public', 'get_my_plan', ARRAY[]::name[], 'safe self-plan RPC exists');
SELECT has_function('public', 'get_my_profile', ARRAY[]::name[], 'safe self-profile RPC exists');
SELECT has_function('public', 'get_learning_progress_overview', ARRAY[]::name[], 'aggregate staff dashboard RPC exists');

SELECT is_empty(
  $$
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'get_learning_progress_overview'
      AND routine_definition ILIKE ANY (ARRAY['%email%', '%full_name%'])
  $$,
  'aggregate dashboard RPC does not expose names or emails in its body'
);

SELECT is(
  (
    SELECT COUNT(*)::integer
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'get_user_plan'
      AND grantee IN ('anon', 'authenticated', 'PUBLIC')
  ),
  0,
  'legacy get_user_plan(uuid) is not executable by client roles'
);

SELECT is(
  (
    SELECT COUNT(*)::integer
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'user_has_feature'
      AND grantee IN ('anon', 'authenticated', 'PUBLIC')
  ),
  0,
  'legacy user_has_feature(uuid, text) is not executable by client roles'
);

SELECT is(
  (
    SELECT COUNT(*)::integer
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'data_access_logs'
      AND policyname = 'No client access to data access logs'
  ),
  1,
  'audit log has explicit deny-all client policy'
);

SELECT isnt_empty(
  $$
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'get_learning_progress_overview'
      AND grantee = 'authenticated'
  $$,
  'authenticated role can execute aggregate RPC after role checks inside function'
);

SELECT * FROM finish();

ROLLBACK;
