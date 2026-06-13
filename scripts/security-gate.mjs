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

if (!existsSync("supabase/tests/security_invariants.sql")) {
  fail("Missing RLS test suite: supabase/tests/security_invariants.sql");
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
