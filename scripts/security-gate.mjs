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

// Service role key is forbidden in runtime source EXCEPT in the single
// privileged Mercado Pago module. Payment webhooks are, by definition,
// unauthenticated callers that must write billing state; the privilege is
// only safe because that same module colocates the webhook HMAC verification
// (see the assertions below). Any new file needing the service role must be
// added here explicitly and justified — never widened silently.
const SERVICE_ROLE_ALLOWLIST = new Set([
  // Módulo do webhook de pagamento: privilégio amarrado à verificação HMAC.
  "supabase/functions/_shared/mercadopago.ts",
  // Módulo dos workers internos (process-notifications, subscription-lifecycle):
  // privilégio amarrado ao guard de trigger-secret (assertTriggerSecret).
  "supabase/functions/_shared/service-client.ts",
]);

for (const file of sourceFiles) {
  const text = readFileSync(file, "utf8");
  const normalized = file.replace(/\\/g, "/");
  if (/SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY/.test(text)) {
    if (!SERVICE_ROLE_ALLOWLIST.has(normalized)) {
      fail(`Service role key reference found outside the payment allow-list: ${file}`);
    }
  }
}

// The single privileged module must colocate the HMAC verification that
// justifies its service-role access — privilege and its protection stay tied.
const mpSharedModule = "supabase/functions/_shared/mercadopago.ts";
if (existsSync(mpSharedModule)) {
  const text = readIfExists(mpSharedModule);
  const usesServiceRole = /SUPABASE_SERVICE_ROLE_KEY/.test(text);
  if (usesServiceRole && !text.includes("verifyWebhookSignature")) {
    fail("Mercado Pago module uses the service role key but does not colocate webhook HMAC verification");
  }
  if (usesServiceRole && !text.includes('hash: "SHA-256"')) {
    fail("Mercado Pago module must verify webhook signatures via HMAC-SHA256");
  }
}

// The webhook must verify the signature and reject invalid ones before it
// ever activates billing state through the RPC.
const mpWebhookFunction = "supabase/functions/mp-webhook/index.ts";
if (existsSync(mpWebhookFunction)) {
  const text = readIfExists(mpWebhookFunction);
  if (!text.includes("verifyWebhookSignature")) {
    fail("mp-webhook must verify the HMAC signature before processing");
  }
  if (!/return jsonResponse\(\{ error: "invalid signature" \}, 401\)/.test(text)) {
    fail("mp-webhook must reject invalid signatures with HTTP 401 and no DB write");
  }
  if (!text.includes('rpc("activate_subscription_from_intent"')) {
    fail("mp-webhook must activate subscriptions only through activate_subscription_from_intent");
  }
  if (!text.includes("MERCADO_PAGO_WEBHOOK_SECRET")) {
    fail("mp-webhook must read the configured MERCADO_PAGO_WEBHOOK_SECRET");
  }
}

// mp-create-preference must never trust a client-provided price: it resolves
// the amount server-side (plan lookup for individual, pricing fn for escolar).
const mpPreferenceFunction = "supabase/functions/mp-create-preference/index.ts";
if (existsSync(mpPreferenceFunction)) {
  const text = readIfExists(mpPreferenceFunction);
  if (!text.includes('from("subscription_plans")') || !text.includes("calculateSchoolPricing")) {
    fail("mp-create-preference must derive price from subscription_plans / calculateSchoolPricing, never the client");
  }
  if (/amount_brl_cents\s*:\s*body\./.test(text)) {
    fail("mp-create-preference must not accept the charge amount from the request body");
  }
  // Fluxo escolar é público (sem JWT): precisa de rate limiting antes de criar
  // a intent, para não virar uma porta de spam de preferências.
  if (!text.includes("assertCheckoutRateLimit")) {
    fail("mp-create-preference must rate-limit intent creation via assertCheckoutRateLimit");
  }
}

// Workers internos: o módulo de service client dos workers deve colocar junto o
// guard de trigger-secret que justifica o privilégio (privilégio ↔ proteção).
const svcClientModule = "supabase/functions/_shared/service-client.ts";
if (existsSync(svcClientModule)) {
  const text = readIfExists(svcClientModule);
  if (/SUPABASE_SERVICE_ROLE_KEY/.test(text) && !text.includes("assertTriggerSecret")) {
    fail("service-client module uses the service role key but does not colocate the trigger-secret guard");
  }
}

// As functions worker (fila de e-mail e ciclo de vida) não podem ser públicas:
// precisam exigir o trigger-secret antes de qualquer ação privilegiada.
for (const workerFn of [
  "supabase/functions/process-notifications/index.ts",
  "supabase/functions/subscription-lifecycle/index.ts",
]) {
  if (existsSync(workerFn)) {
    const text = readIfExists(workerFn);
    if (!text.includes("assertTriggerSecret")) {
      fail(`Internal worker must guard invocation with assertTriggerSecret: ${workerFn}`);
    }
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
  if (/from\(["']user_roles["']\)/.test(text)) {
    fail(`Frontend must not read user_roles directly; use get_my_profile self-scoped RPC: ${file}`);
  }
  if (
    /from\(["'](?:user_subscriptions|organization_subscriptions)["']\)\s*\.\s*(?:insert|update|upsert|delete)\s*\(/.test(
      text,
    )
  ) {
    fail(`Frontend must not write subscription state directly: ${file}`);
  }
}

// The Supabase browser client must reject a SECRET key in the frontend and
// require the public env — a secret key in the bundle would bypass RLS.
const supabaseKeyGuard = "src/lib/supabase-key.ts";
if (!existsSync(supabaseKeyGuard)) {
  fail(`Missing Supabase key guard: ${supabaseKeyGuard}`);
} else {
  const text = readIfExists(supabaseKeyGuard);
  if (!text.includes("assertPublicSupabaseKey") || !text.includes("sb_secret_")) {
    fail("supabase-key guard must reject secret keys (sb_secret_) in the frontend");
  }
}
if (!existsSync("src/lib/supabase-key.test.ts")) {
  fail("Missing Supabase key guard unit tests: src/lib/supabase-key.test.ts");
}

const supabaseClient = "src/integrations/supabase/client.ts";
if (existsSync(supabaseClient)) {
  const text = readIfExists(supabaseClient);
  if (!text.includes("assertPublicSupabaseKey")) {
    fail("Supabase browser client must validate the key via assertPublicSupabaseKey (reject sb_secret_)");
  }
}

// Global Error Boundary: garante que erros de renderização nunca resultam em
// tela totalmente branca sem explicação (especialmente importante para público
// adolescente que não sabe o que fazer diante de uma página vazia).
if (!existsSync("src/components/ErrorBoundary.tsx")) {
  fail("Missing global Error Boundary: src/components/ErrorBoundary.tsx");
} else {
  const text = readIfExists("src/components/ErrorBoundary.tsx");
  if (!text.includes("getDerivedStateFromError") || !text.includes("componentDidCatch")) {
    fail("ErrorBoundary must implement getDerivedStateFromError and componentDidCatch");
  }
}
if (existsSync("src/App.tsx")) {
  const text = readIfExists("src/App.tsx");
  if (!text.includes("<ErrorBoundary")) {
    fail("App.tsx must wrap the component tree with <ErrorBoundary>");
  }
}

// Truth & Evidence Registry: o registro de claims e seu validador/testes devem
// existir. A integridade do conteúdo (nenhum claim aprovado sem prova) é
// verificada pelo teste Vitest do registro real, que roda no `npm run quality`.
for (const claimsFile of [
  "src/lib/claims.ts",
  "src/content/claims-registry.ts",
  "src/lib/claims.test.ts",
]) {
  if (!existsSync(claimsFile)) {
    fail(`Missing Truth & Evidence Registry file: ${claimsFile}`);
  }
}

const requireAuthComponent = "src/components/routing/RequireAuth.tsx";
if (!existsSync(requireAuthComponent)) {
  fail(`Missing route auth guard: ${requireAuthComponent}`);
} else {
  const text = readIfExists(requireAuthComponent);
  if (!text.includes("supabase.auth.getSession()") || !text.includes("onAuthStateChange")) {
    fail("RequireAuth must validate the current Supabase session and subscribe to auth changes");
  }
  if (!text.includes("/auth?redirect=") || !text.includes("<Navigate")) {
    fail("RequireAuth must redirect guests to /auth with the original path preserved");
  }
}

const requireRoleComponent = "src/components/routing/RequireRole.tsx";
if (!existsSync(requireRoleComponent)) {
  fail(`Missing route role guard: ${requireRoleComponent}`);
} else {
  const text = readIfExists(requireRoleComponent);
  if (!text.includes('rpc("get_my_profile"') || text.includes('from("user_roles"')) {
    fail("RequireRole must use get_my_profile self-scoped RPC instead of direct role table reads");
  }
  if (!text.includes("<Navigate") || !text.includes('to="/dashboard"')) {
    fail("RequireRole must deny unauthorized users without rendering protected content");
  }
}

const appRouter = "src/App.tsx";
if (!existsSync(appRouter)) {
  fail(`Missing app router: ${appRouter}`);
} else {
  const text = readIfExists(appRouter);
  const requiredPrivateRoutes = [
    "/dashboard",
    "/module/:id",
    "/quiz",
    "/flashcards",
    "/evidence",
    "/simulator",
    "/debate",
    "/poetry",
    "/codesign",
    "/alegria",
    "/admin",
    // UX-3: painel docente saiu de /admin para /professores; /admin passou a ser
    // a Landing Administrativa. Ambas seguem obrigatórias na tabela privada.
    "/professores",
    "/escola/:schoolId",
    "/profile",
    "/breathing",
    "/lifewheel",
    "/gratitude",
    "/memory",
    "/mindmap",
    "/emotions",
    "/challenge21",
    "/hypothesis",
    "/missions",
    "/subscription",
    "/constellation",
    "/mirror",
    "/future-self",
    "/strengths",
    "/org",
  ];

  if (!text.includes('import RequireAuth from "@/components/routing/RequireAuth"')) {
    fail("App router must import RequireAuth");
  }
  if (!text.includes('import RequireRole from "@/components/routing/RequireRole"')) {
    fail("App router must import RequireRole");
  }
  if (!text.includes("const privateRoutes: PrivateRoute[] = [") || !text.includes("<RequireAuth>")) {
    fail("App router must render privateRoutes through RequireAuth");
  }
  // UX-3 (§D3/D51): a asserção do literal foi SUBSTITUÍDA, não removida. O painel
  // docente mudou de /admin para /professores e continua exigindo teacher/manager.
  if (!text.includes('path: "/professores", element: <AdminPage />, roles: ["teacher", "manager"]')) {
    fail("Educator dashboard route (/professores) must be protected by the teacher/manager RequireRole gate");
  }
  // /admin deixou de servir o painel docente. Se voltar a servi-lo, dois papéis
  // com expectativas diferentes disputariam a mesma rota.
  if (/path:\s*"\/admin",\s*element:\s*<AdminPage\s*\/>/.test(text)) {
    fail("/admin must not serve the educator dashboard: it is the platform administration landing");
  }
  if (!text.includes('path: "/admin", element: <AdminOperacaoPage />')) {
    fail("/admin must serve the platform administration landing (AdminOperacaoPage)");
  }
  if (!text.includes("<RequireRole allowedRoles={route.roles}>{route.element}</RequireRole>")) {
    fail("Role-scoped routes must render through RequireRole");
  }
  for (const route of requiredPrivateRoutes) {
    if (!text.includes(`path: "${route}"`)) {
      fail(`Private route is missing from RequireAuth-protected route table: ${route}`);
    }
  }
}

const authPage = "src/pages/AuthPage.tsx";
if (!existsSync(authPage)) {
  fail(`Missing auth page: ${authPage}`);
} else {
  const text = readIfExists(authPage);
  if (!text.includes('import { getSafeRedirectPath } from "@/lib/redirect"')) {
    fail("AuthPage must use the shared safe redirect helper before navigation");
  }
  if (!text.includes("useSearchParams") || !text.includes("navigate(redirectPath, { replace: true })")) {
    fail("AuthPage must return authenticated users to the sanitized redirect path");
  }
}

const redirectHelper = "src/lib/redirect.ts";
if (!existsSync(redirectHelper)) {
  fail(`Missing redirect helper: ${redirectHelper}`);
} else {
  const text = readIfExists(redirectHelper);
  if (!text.includes("getSafeRedirectPath") || !text.includes('redirect.startsWith("//")') || !text.includes('redirect.includes("\\\\")')) {
    fail("Redirect helper must reject external, protocol-relative, and backslash redirects");
  }
  if (!text.includes('redirect.startsWith("/auth")')) {
    fail("Redirect helper must prevent redirect loops back into /auth");
  }
}

if (!existsSync("src/lib/redirect.test.ts")) {
  fail("Missing redirect helper unit tests: src/lib/redirect.test.ts");
}

if (!existsSync("src/lib/auth-profile.test.ts")) {
  fail("Missing auth profile helper unit tests: src/lib/auth-profile.test.ts");
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
  if (!text.includes("getErrorStatus") || !text.includes('error.message === "Missing authorization"') || !text.includes("return 401")) {
    fail("admin-dashboard must map missing/invalid authorization to HTTP 401");
  }
  if (!text.includes("permissions") || !text.includes("return 403")) {
    fail("admin-dashboard must map insufficient role permissions to HTTP 403");
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
  if (!text.includes("getErrorStatus") || !text.includes('error.message === "Missing authorization"') || !text.includes("return 401")) {
    fail("generate-report must map missing/invalid authorization to HTTP 401");
  }
  if (!text.includes('error.message.startsWith("Cross-user reports are disabled")') || !text.includes("return 403")) {
    fail("generate-report must map cross-user report attempts to HTTP 403");
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

// ── UX-3: painel escolar, papel→home e governança ────────────────────────────

const schoolPage = "src/pages/SchoolDashboardPage.tsx";
if (!existsSync(schoolPage)) {
  fail(`Missing school dashboard page: ${schoolPage}`);
} else {
  const text = readIfExists(schoolPage);
  if (/student\.full_name|student\.email|student\.user_id|data\.students/i.test(text)) {
    fail("SchoolDashboardPage must not render nominal student fields");
  }
  // Id malformado não pode virar chamada de rede.
  if (!text.includes("isValidSchoolId")) {
    fail("SchoolDashboardPage must validate schoolId before querying");
  }
}

const roleHomeModule = "src/lib/role-home.ts";
if (!existsSync(roleHomeModule)) {
  fail(`Missing role home resolver: ${roleHomeModule}`);
} else {
  const text = readIfExists(roleHomeModule);
  // Anti-laço (§D3/D51): mandar platform_admin para /org foi reprovado, e um
  // papel apontando para uma rota que redireciona de volta nunca chega.
  if (/platform_admin:\s*"\/org"/.test(text)) {
    fail("platform_admin must not resolve to the organization manager experience (/org)");
  }
  // /escolas é landing pública de aquisição: não é home de papel algum (D33/D43).
  if (/(CANONICAL_ROLE_HOME|IMPLEMENTED_ROLE_HOME)[\s\S]{0,400}?:\s*"\/escolas"/.test(text)) {
    fail("/escolas is the public acquisition landing and must not be any role home");
  }
}

const ux3Migration = "supabase/migrations/20260727120000_ux3_school_metrics_and_governance.sql";
if (!existsSync(ux3Migration)) {
  fail(`Missing UX-3 migration: ${ux3Migration}`);
} else {
  const text = readIfExists(ux3Migration);

  // Limiar canônico único (§D5/D53).
  if (!text.includes("CREATE OR REPLACE FUNCTION public.metric_minimum_group_size()")) {
    fail("UX-3 migration must define the canonical minimum group size function");
  }

  // Ledger append-only (§D2/D50): sem UPDATE/DELETE para authenticated.
  if (!text.includes("REVOKE UPDATE, DELETE ON TABLE public.institutional_decision_events")) {
    fail("institutional_decision_events must revoke UPDATE/DELETE from authenticated (append-only)");
  }
  if (/CREATE POLICY[^;]*institutional_decision_events[^;]*FOR\s+(UPDATE|DELETE)/i.test(text)) {
    fail("institutional_decision_events must not have UPDATE/DELETE policies");
  }
  if (!text.includes("trg_decision_events_no_update") || !text.includes("trg_decision_events_no_delete")) {
    fail("institutional_decision_events must block mutation with triggers (defence in depth)");
  }

  // RPCs novas seguem a doutrina de privilégio mínimo.
  for (const fn of [
    "public.get_school_metrics(uuid, text)",
    "public.resend_invitation(uuid)",
    "public.escalate_indicator(uuid, uuid, text, text)",
  ]) {
    if (!text.includes(`REVOKE EXECUTE ON FUNCTION ${fn} FROM PUBLIC, anon, authenticated`)) {
      fail(`UX-3 migration must revoke EXECUTE on ${fn} from PUBLIC/anon/authenticated before granting`);
    }
  }
  if ((text.match(/SET search_path = public/g) ?? []).length < 6) {
    fail("Every SECURITY DEFINER function in the UX-3 migration must pin search_path = public");
  }

  // Supressão aplicada no servidor (§D6/D54) — não só escondida na tela.
  if (!text.includes("'reason', 'complementary'")) {
    fail("UX-3 migration must apply complementary suppression against subtraction inference");
  }

  // Antiburla do reenvio (§D8/D56): contagem por organização + destinatário.
  if (!text.includes("recipient_hash")) {
    fail("resend_invitation must count resends per organization and recipient, not per invitation row");
  }
}

const metricPrivacyModule = "src/lib/metric-privacy.ts";
if (!existsSync(metricPrivacyModule)) {
  fail(`Missing metric privacy helpers: ${metricPrivacyModule}`);
} else {
  const text = readIfExists(metricPrivacyModule);
  // §D5/D53: o limiar vive numa única configuração server-side. Um literal no
  // cliente cria uma segunda fonte da verdade que vai ficar para trás.
  if (/(MINIMUM_GROUP_SIZE|MIN_SAMPLE|LIMIAR)\s*=\s*\d/.test(text)) {
    fail("Client must not hardcode the minimum group size: it comes from the server response");
  }
}

if (!existsSync("src/lib/metric-privacy.test.ts")) {
  fail("Missing metric privacy unit tests: src/lib/metric-privacy.test.ts");
}

// §D1/D49: o produto não tem etapa de aprovação de convite. Um rótulo dessa ação
// prometeria à gestão da rede um poder que ela não tem — overclaim de interface.
// A verificação exclui arquivos de teste, que citam o termo para provar a ausência.
{
  const uiFiles = [
    "src/components/dashboard/DecisionQueue.tsx",
    "src/lib/decision-queue-items.ts",
    "src/hooks/useDecisionActions.ts",
    "src/pages/OrgDashboardPage.tsx",
  ];
  for (const file of uiFiles) {
    if (!existsSync(file)) continue;
    if (/aprovar\s+convite/i.test(readIfExists(file))) {
      fail(`${file} must not offer an "Aprovar convite" action: the product has no approval step`);
    }
  }
}

if (!existsSync("src/components/dashboard/DecisionQueue.test.tsx")) {
  fail("Missing decision queue behaviour tests: src/components/dashboard/DecisionQueue.test.tsx");
}

const dashboardPage = "src/pages/DashboardPage.tsx";
if (!existsSync(dashboardPage)) {
  fail(`Missing dashboard page: ${dashboardPage}`);
} else {
  const text = readIfExists(dashboardPage);
  if (!text.includes('rpc("get_my_profile"') || text.includes('from("user_roles"')) {
    fail("DashboardPage must use get_my_profile for role-aware UI and avoid direct user_roles reads");
  }
  if (!text.includes("hasAnyRole(roles, [\"teacher\", \"manager\"])")) {
    fail("DashboardPage must derive admin affordances from the complete role set");
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
