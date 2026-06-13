-- Manual security invariant verification.
-- Run in Supabase SQL Editor after applying all migrations.
-- Expected result: every row has status = PASS.

WITH checks AS (
  SELECT
    10 AS ordinal,
    'Inv-1 legacy user-id RPCs are service-only' AS invariant,
    NOT EXISTS (
      SELECT 1
      FROM information_schema.routine_privileges
      WHERE routine_schema = 'public'
        AND routine_name IN ('get_user_plan', 'user_has_feature')
        AND grantee IN ('anon', 'authenticated', 'PUBLIC')
    ) AS passed,
    COALESCE(
      (
        SELECT string_agg(routine_name || ':' || grantee, ', ' ORDER BY routine_name, grantee)
        FROM information_schema.routine_privileges
        WHERE routine_schema = 'public'
          AND routine_name IN ('get_user_plan', 'user_has_feature')
          AND grantee IN ('anon', 'authenticated', 'PUBLIC')
      ),
      'no client EXECUTE grants'
    ) AS details

  UNION ALL
  SELECT
    20,
    'Inv-2 safe SECURITY DEFINER RPCs are not executable by anon/PUBLIC',
    NOT EXISTS (
      SELECT 1
      FROM information_schema.routine_privileges
      WHERE routine_schema = 'public'
        AND routine_name IN (
          'get_my_profile',
          'get_my_plan',
          'user_has_my_feature',
          'get_my_learning_progress_summary',
          'get_learning_progress_overview'
        )
        AND grantee IN ('anon', 'PUBLIC')
    ),
    COALESCE(
      (
        SELECT string_agg(routine_name || ':' || grantee, ', ' ORDER BY routine_name, grantee)
        FROM information_schema.routine_privileges
        WHERE routine_schema = 'public'
          AND routine_name IN (
            'get_my_profile',
            'get_my_plan',
            'user_has_my_feature',
            'get_my_learning_progress_summary',
            'get_learning_progress_overview'
          )
          AND grantee IN ('anon', 'PUBLIC')
      ),
      'no anon/PUBLIC EXECUTE grants'
    )

  UNION ALL
  SELECT
    30,
    'Authenticated can execute all safe RPCs',
    (
      SELECT COUNT(DISTINCT routine_name) = 5
      FROM information_schema.routine_privileges
      WHERE routine_schema = 'public'
        AND routine_name IN (
          'get_my_profile',
          'get_my_plan',
          'user_has_my_feature',
          'get_my_learning_progress_summary',
          'get_learning_progress_overview'
        )
        AND grantee = 'authenticated'
    ),
    (
      SELECT COUNT(DISTINCT routine_name)::text || '/5 authenticated grants present'
      FROM information_schema.routine_privileges
      WHERE routine_schema = 'public'
        AND routine_name IN (
          'get_my_profile',
          'get_my_plan',
          'user_has_my_feature',
          'get_my_learning_progress_summary',
          'get_learning_progress_overview'
        )
        AND grantee = 'authenticated'
    )

  UNION ALL
  SELECT
    40,
    'data_access_logs exists with RLS enabled',
    COALESCE(
      (
        SELECT c.relrowsecurity
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'data_access_logs'
      ),
      false
    ),
    COALESCE(
      (
        SELECT 'relrowsecurity=' || c.relrowsecurity::text
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'data_access_logs'
      ),
      'table missing'
    )

  UNION ALL
  SELECT
    50,
    'data_access_logs has no client table grants',
    NOT EXISTS (
      SELECT 1
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name = 'data_access_logs'
        AND grantee IN ('anon', 'authenticated')
    ),
    COALESCE(
      (
        SELECT string_agg(grantee || ':' || privilege_type, ', ' ORDER BY grantee, privilege_type)
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND table_name = 'data_access_logs'
          AND grantee IN ('anon', 'authenticated')
      ),
      'no anon/authenticated table grants'
    )

  UNION ALL
  SELECT
    60,
    'data_access_logs has explicit deny-all client policy',
    EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'data_access_logs'
        AND policyname = 'No client access to data access logs'
        AND roles = ARRAY['anon', 'authenticated']
        AND cmd = 'ALL'
        AND qual = 'false'
        AND with_check = 'false'
    ),
    COALESCE(
      (
        SELECT 'cmd=' || cmd || ', roles=' || roles::text || ', qual=' || COALESCE(qual, '<null>')
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'data_access_logs'
          AND policyname = 'No client access to data access logs'
        LIMIT 1
      ),
      'policy missing'
    )

  UNION ALL
  SELECT
    70,
    'user_progress exposes only self-scoped policies',
    (
      SELECT array_agg(policyname ORDER BY policyname)::text[] = ARRAY[
        'Users can insert own progress',
        'Users can update own progress',
        'Users can view own progress'
      ]::text[]
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'user_progress'
    ),
    COALESCE(
      (
        SELECT string_agg(policyname, ', ' ORDER BY policyname)
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'user_progress'
      ),
      'no policies'
    )

  UNION ALL
  SELECT
    80,
    'subscription tables have no client write policies',
    NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('user_subscriptions', 'organization_subscriptions')
        AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    ),
    COALESCE(
      (
        SELECT string_agg(tablename || ':' || policyname || ':' || cmd, ', ' ORDER BY tablename, policyname)
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('user_subscriptions', 'organization_subscriptions')
          AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      ),
      'no write policies'
    )

  UNION ALL
  SELECT
    90,
    'aggregate dashboard RPC body avoids direct PII fields',
    NOT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'get_learning_progress_overview'
        AND pg_get_functiondef(p.oid) ILIKE ANY (ARRAY['%''email''%', '%''full_name''%', '%''user_id''%'])
    ),
    'scanned returned JSON keys in get_learning_progress_overview'

  UNION ALL
  SELECT
    100,
    'safe RPCs are SECURITY DEFINER with fixed search_path',
    NOT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'get_my_profile',
          'get_my_plan',
          'user_has_my_feature',
          'get_my_learning_progress_summary',
          'get_learning_progress_overview'
        )
        AND (
          p.prosecdef IS DISTINCT FROM true
          OR NOT EXISTS (
            SELECT 1
            FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS config(setting)
            WHERE setting = 'search_path=public'
          )
        )
    ),
    COALESCE(
      (
        SELECT string_agg(
          p.proname || ':secdef=' || p.prosecdef::text || ':config=' || COALESCE(p.proconfig::text, '{}'),
          ', '
          ORDER BY p.proname
        )
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN (
            'get_my_profile',
            'get_my_plan',
            'user_has_my_feature',
            'get_my_learning_progress_summary',
            'get_learning_progress_overview'
          )
      ),
      'functions missing'
    )
)
SELECT
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS status,
  invariant,
  details
FROM checks
ORDER BY ordinal;
