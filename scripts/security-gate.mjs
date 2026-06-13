import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const failures = [];

function fail(message) {
  failures.push(message);
}

function gitLsFiles() {
  try {
    return execFileSync("git", ["ls-files"], { encoding: "utf8" })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch (error) {
    fail(`Unable to run git ls-files: ${error.message}`);
    return [];
  }
}

function walkFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap((entry) => {
    const fullPath = join(root, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return walkFiles(fullPath);
    return [fullPath];
  });
}

function readIfExists(file) {
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

const trackedFiles = gitLsFiles();
const forbiddenEnvFiles = trackedFiles.filter((file) => {
  const name = basename(file);
  return (name === ".env" || name.startsWith(".env.")) && name !== ".env.example";
});

if (forbiddenEnvFiles.length > 0) {
  fail(`Tracked environment files are forbidden: ${forbiddenEnvFiles.join(", ")}`);
}

const sourceFiles = [...walkFiles("src"), ...walkFiles("supabase/functions")].filter((file) =>
  /\.(ts|tsx|js|mjs)$/.test(file),
);

for (const file of sourceFiles) {
  const text = readFileSync(file, "utf8");
  if (/SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY/.test(text)) {
    fail(`Service role key reference found in runtime source: ${file}`);
  }
}

const frontendFiles = walkFiles("src").filter((file) => /\.(ts|tsx)$/.test(file));
for (const file of frontendFiles) {
  const text = readFileSync(file, "utf8");
  if (/Authorization[\s\S]{0,120}VITE_SUPABASE_PUBLISHABLE_KEY|VITE_SUPABASE_PUBLISHABLE_KEY[\s\S]{0,120}Authorization/.test(text)) {
    fail(`Frontend must not use the Supabase publishable key as a bearer token: ${file}`);
  }
  if (/rpc\(["'](?:get_user_plan|user_has_feature)["']/.test(text)) {
    fail(`Frontend must not call legacy parameterized entitlement RPCs: ${file}`);
  }
  if (
    /from\(["'](?:user_subscriptions|organization_subscriptions)["']\)\s*\.\s*(?:insert|update|upsert|delete)\s*\(/.test(
      text,
    )
  ) {
    fail(`Frontend must not write subscription state directly: ${file}`);
  }
}

const aiAuthHelper = "supabase/functions/_shared/auth.ts";
if (!existsSync(aiAuthHelper)) {
  fail(`Missing Edge Function auth helper: ${aiAuthHelper}`);
} else {
  const text = readIfExists(aiAuthHelper);
  if (!text.includes('Deno.env.get("SUPABASE_ANON_KEY")') || !text.includes(".auth.getUser()")) {
    fail("Edge Function auth helper must validate caller JWT with the Supabase anon key");
  }
  if (!text.includes("Authentication required")) {
    fail("Edge Function auth helper must fail closed for unauthenticated requests");
  }
}

const aiUsageHelper = "supabase/functions/_shared/ai-usage.ts";
if (!existsSync(aiUsageHelper)) {
  fail(`Missing AI usage helper: ${aiUsageHelper}`);
} else {
  const text = readIfExists(aiUsageHelper);
  if (!text.includes('rpc("enforce_ai_usage_limit"') || !text.includes("AiUsageLimitError")) {
    fail("AI usage helper must enforce database-backed quota before AI gateway calls");
  }
  if (!text.includes("Authentication required") || !text.includes("429")) {
    fail("AI usage helper must preserve auth failures and expose a 429 quota failure");
  }
}

const authenticatedAiFunctions = [
  "supabase/functions/aledria-chat/index.ts",
  "supabase/functions/cognitive-mirror/index.ts",
  "supabase/functions/future-self/index.ts",
  "supabase/functions/signature-strengths/index.ts",
];

for (const file of authenticatedAiFunctions) {
  if (!existsSync(file)) {
    fail(`Missing authenticated AI function: ${file}`);
    continue;
  }
  const text = readIfExists(file);
  if (!text.includes('../_shared/ai-usage.ts') || !text.includes('enforceAiUsageLimit(req.headers.get("Authorization")')) {
    fail(`AI Edge Function must enforce authenticated per-user usage limits before calling the AI gateway: ${file}`);
  }
  if (!text.includes("getEdgeErrorStatus") || !text.includes("getEdgeErrorMessage")) {
    fail(`AI Edge Function must map auth and quota failures through shared error handling: ${file}`);
  }
}

const alegriaPage = "src/pages/AlegriaPage.tsx";
if (existsSync(alegriaPage)) {
  const text = readIfExists(alegriaPage);
  if (!text.includes("supabase.auth.getSession()") || !text.includes("session.access_token")) {
    fail("AlegriaPage must send a real user session token to aledria-chat");
  }
}

const alegriaHero = "src/components/landing/HeroAlegriaLive.tsx";
if (existsSync(alegriaHero)) {
  const text = readIfExists(alegriaHero);
  if (!text.includes("buildLocalPreview") || !text.includes("session.access_token")) {
    fail("HeroAlegriaLive must use a local unauthenticated preview and real session token for live calls");
  }
}

const adminDashboardFunction = "supabase/functions/admin-dashboard/index.ts";
if (!existsSync(adminDashboardFunction)) {
  fail(`Missing admin dashboard function: ${adminDashboardFunction}`);
} else {
  const text = readIfExists(adminDashboardFunction);
  if (!text.includes('Deno.env.get("SUPABASE_ANON_KEY")')) {
    fail("admin-dashboard must use the anon key plus caller JWT, not privileged credentials");
  }
  if (!text.includes('rpc("get_learning_progress_overview"')) {
    fail("admin-dashboard must read progress through get_learning_progress_overview RPC");
  }
  if (/from\(["']user_progress["']/.test(text)) {
    fail("admin-dashboard must not read user_progress directly");
  }
  if (/students\s*:|studentRows|full_name|studentEmail|studentUserId|email\s*:/.test(text)) {
    fail("admin-dashboard function must not return or assemble nominal student fields");
  }
}

const generateReportFunction = "supabase/functions/generate-report/index.ts";
if (!existsSync(generateReportFunction)) {
  fail(`Missing generate-report function: ${generateReportFunction}`);
} else {
  const text = readIfExists(generateReportFunction);
  if (!text.includes("Cross-user reports are disabled")) {
    fail("generate-report must explicitly reject cross-user individual reports");
  }
  if (/rpc\(["']has_role["']/.test(text)) {
    fail("generate-report must not use role checks to bypass self-report boundaries");
  }
}

const subscriptionHook = "src/hooks/useSubscription.ts";
if (!existsSync(subscriptionHook)) {
  fail(`Missing subscription hook: ${subscriptionHook}`);
} else {
  const text = readIfExists(subscriptionHook);
  if (!text.includes('rpc("get_my_plan"')) {
    fail("useSubscription must use get_my_plan self-scoped RPC");
  }
  if (text.includes("get_user_plan")) {
    fail("useSubscription must not call legacy get_user_plan(user_id)");
  }
}

const adminPage = "src/pages/AdminPage.tsx";
if (!existsSync(adminPage)) {
  fail(`Missing admin page: ${adminPage}`);
} else {
  const text = readIfExists(adminPage);
  if (/data\.students|students\.map|student\.full_name|student\.email|student\.user_id|download.*student/i.test(text)) {
    fail("AdminPage must not render nominal student records or individual report actions");
  }
}

const hardeningMigration = "supabase/migrations/20260613143000_security_invariants_foundation.sql";
if (!existsSync(hardeningMigration)) {
  fail(`Missing hardening migration: ${hardeningMigration}`);
} else {
  const migration = readFileSync(hardeningMigration, "utf8");
  const requiredSnippets = [
    'DROP POLICY IF EXISTS "Managers can view all progress"',
    'DROP POLICY IF EXISTS "Teachers can view all progress"',
    'DROP POLICY IF EXISTS "Users can insert own subscriptions"',
    'CREATE OR REPLACE FUNCTION public.get_learning_progress_overview',
    "CREATE TABLE IF NOT EXISTS public.data_access_logs",
  ];
  for (const snippet of requiredSnippets) {
    if (!migration.includes(snippet)) {
      fail(`Hardening migration is missing invariant snippet: ${snippet}`);
    }
  }
}

const grantsMigration = "supabase/migrations/20260613170000_rpc_execute_grants_hardening.sql";
if (!existsSync(grantsMigration)) {
  fail(`Missing RPC grant hardening migration: ${grantsMigration}`);
} else {
  const migration = readFileSync(grantsMigration, "utf8");
  const requiredSnippets = [
    "REVOKE EXECUTE ON FUNCTION public.get_user_plan(uuid) FROM PUBLIC, anon, authenticated",
    "REVOKE EXECUTE ON FUNCTION public.user_has_feature(uuid, text) FROM PUBLIC, anon, authenticated",
    "REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon, authenticated",
    "GRANT EXECUTE ON FUNCTION public.get_my_plan() TO authenticated",
    "GRANT EXECUTE ON FUNCTION public.get_learning_progress_overview() TO authenticated",
  ];
  for (const snippet of requiredSnippets) {
    if (!migration.includes(snippet)) {
      fail(`RPC grant hardening migration is missing invariant snippet: ${snippet}`);
    }
  }
}

const defaultPrivilegesMigration = "supabase/migrations/20260613173000_function_default_privileges_hardening.sql";
if (!existsSync(defaultPrivilegesMigration)) {
  fail(`Missing function default privileges migration: ${defaultPrivilegesMigration}`);
} else {
  const migration = readFileSync(defaultPrivilegesMigration, "utf8");
  if (!migration.includes("ALTER DEFAULT PRIVILEGES IN SCHEMA public")) {
    fail("Function default privileges migration does not alter public schema defaults");
  }
  if (!migration.includes("REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated")) {
    fail("Function default privileges migration does not revoke default client EXECUTE");
  }
}

const aiUsageMigration = "supabase/migrations/20260613190000_ai_usage_rate_limits.sql";
if (!existsSync(aiUsageMigration)) {
  fail(`Missing AI usage rate limit migration: ${aiUsageMigration}`);
} else {
  const migration = readFileSync(aiUsageMigration, "utf8");
  const requiredSnippets = [
    "CREATE TABLE IF NOT EXISTS public.ai_usage_limits",
    "CREATE OR REPLACE FUNCTION public.enforce_ai_usage_limit",
    "SECURITY DEFINER",
    "SET search_path = public",
    "CREATE POLICY \"No client access to AI usage limits\"",
    "REVOKE EXECUTE ON FUNCTION public.enforce_ai_usage_limit(text) FROM PUBLIC, anon, authenticated",
    "GRANT EXECUTE ON FUNCTION public.enforce_ai_usage_limit(text) TO authenticated",
    "'ai_usage_allowed'",
    "'ai_usage_blocked'",
  ];
  for (const snippet of requiredSnippets) {
    if (!migration.includes(snippet)) {
      fail(`AI usage migration is missing invariant snippet: ${snippet}`);
    }
  }
}

if (!existsSync("supabase/tests/security_invariants.sql")) {
  fail("Missing RLS test suite: supabase/tests/security_invariants.sql");
}

if (!existsSync("supabase/verification/security_invariants_manual.sql")) {
  fail("Missing manual SQL verification script: supabase/verification/security_invariants_manual.sql");
}

if (!existsSync("docs/security-invariants-runbook.md")) {
  fail("Missing security invariants runbook: docs/security-invariants-runbook.md");
}

if (!existsSync(".github/workflows/quality-gate.yml")) {
  fail("Missing GitHub Actions quality gate: .github/workflows/quality-gate.yml");
}

if (failures.length > 0) {
  console.error("Security gate failed:");
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log("Security gate passed.");
