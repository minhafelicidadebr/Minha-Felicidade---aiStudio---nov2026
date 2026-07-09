# Security Invariants Runbook

## Current State

The Supabase hardening path is versioned as migrations. Apply them in timestamp order:

1. `supabase/migrations/20260613143000_security_invariants_foundation.sql`
2. `supabase/migrations/20260613144818_23ed9044-2366-4ed2-9e72-c6382bbae4bb.sql`
3. `supabase/migrations/20260613170000_rpc_execute_grants_hardening.sql`
4. `supabase/migrations/20260613173000_function_default_privileges_hardening.sql`
5. `supabase/migrations/20260613190000_ai_usage_rate_limits.sql`
6. `supabase/migrations/20260706194000_guardian_consent_ledger.sql`
7. `supabase/migrations/20260708120000_purchase_intents.sql`

The `20260613144818...` migration was generated remotely after the first foundation migration. It is mostly idempotent duplication. The later `20260613170000...` migration is still required because it removes explicit `anon`/`authenticated` EXECUTE grants that are not removed by revoking from `PUBLIC`.

## Manual Validation

When Lovable or local Docker is unavailable, use the Supabase Dashboard SQL Editor:

1. Apply `20260613170000_rpc_execute_grants_hardening.sql` if it is not already applied.
2. Apply `20260613173000_function_default_privileges_hardening.sql`.
3. Apply `20260613190000_ai_usage_rate_limits.sql`.
4. Redeploy the AI Edge Functions: `aledria-chat`, `cognitive-mirror`, `future-self`, and `signature-strengths`.
5. Run `supabase/verification/security_invariants_manual.sql`.
6. Treat any `FAIL` row as a release blocker.

## Expected Invariants

- Legacy user-id RPCs are executable only by `service_role`.
- New self-scoped RPCs are executable by `authenticated`, not `anon` or `PUBLIC`.
- `data_access_logs` exists, has RLS enabled, and has no client grants.
- `user_progress` exposes only self-scoped policies.
- Subscription tables expose no client write policies.
- The aggregate dashboard RPC avoids direct PII fields.
- Safe RPCs are `SECURITY DEFINER` with fixed `search_path=public`.
- Individual progress reports are self-only. Cross-user reporting must use a future tenant-scoped, audited RPC, not direct table reads.
- AI Edge Functions require a valid user JWT and call `enforce_ai_usage_limit()` before the AI gateway.
- `ai_usage_limits` is RLS-locked, has no direct client grants, and is mutated only through the authenticated quota RPC.

## Quality Gate

Run locally before shipping:

```bash
npm run quality
```

Database tests remain in `supabase/tests/security_invariants.sql` for environments with pgTAP/Supabase CLI and Docker available.
