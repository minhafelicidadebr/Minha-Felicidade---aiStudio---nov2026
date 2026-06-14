import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type JsonRecord = Record<string, unknown>;

function toRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function toNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getErrorStatus(error: unknown): number {
  if (!(error instanceof Error)) return 500;
  if (error.message === "Missing authorization" || error.message === "Unauthorized") return 401;
  if (error.message.includes("permissions")) return 403;
  return 500;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) throw new Error("Unauthorized");

    const { data: isTeacher } = await supabaseUser.rpc("has_role", { _user_id: user.id, _role: "teacher" });
    const { data: isManager } = await supabaseUser.rpc("has_role", { _user_id: user.id, _role: "manager" });
    if (!isTeacher && !isManager) throw new Error("Insufficient permissions - requires teacher or manager role");

    const { data: overview, error: overviewError } = await supabaseUser.rpc("get_learning_progress_overview");
    if (overviewError) throw overviewError;

    const aggregate = toRecord(overview);
    const global = toRecord(aggregate.global);
    const moduleItems = Array.isArray(aggregate.module_engagement) ? aggregate.module_engagement : [];
    const moduleStats = moduleItems.map((value) => {
      const item = toRecord(value);
      return {
        moduleId: String(item.module_id || ""),
        totalActivities: toNumber(item.activity_events),
        totalXp: toNumber(item.total_xp),
        uniqueStudents: toNumber(item.unique_students),
      };
    });

    return new Response(
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        role: isManager ? "manager" : "teacher",
        scopeType: String(aggregate.scope_type || "legacy_platform"),
        insufficientSample: Boolean(aggregate.insufficient_sample),
        minimumSample: toNumber(aggregate.minimum_sample, 5),
        global: {
          totalStudents: toNumber(global.total_students ?? aggregate.respondent_count),
          totalXp: toNumber(global.total_xp),
          totalActivitiesCompleted: toNumber(global.total_activities_completed),
          averageXpPerStudent: toNumber(global.average_xp_per_student),
        },
        moduleEngagement: moduleStats,
        activityDistribution: toRecord(aggregate.activity_distribution),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("admin-dashboard error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: getErrorStatus(e),
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
