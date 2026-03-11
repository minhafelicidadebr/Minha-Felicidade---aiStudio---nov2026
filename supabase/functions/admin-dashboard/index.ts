import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Verify teacher or manager role
    const { data: isTeacher } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "teacher" });
    const { data: isManager } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "manager" });
    if (!isTeacher && !isManager) throw new Error("Insufficient permissions — requires teacher or manager role");

    // Fetch all profiles
    const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
    
    // Fetch all progress
    const { data: allProgress } = await supabaseAdmin.from("user_progress").select("*");

    // Fetch all roles
    const { data: allRoles } = await supabaseAdmin.from("user_roles").select("*");

    const progressList = allProgress || [];
    const profilesList = profiles || [];
    const rolesList = allRoles || [];

    // Aggregate per student
    const studentMap: Record<string, any> = {};
    profilesList.forEach((p: any) => {
      const studentProgress = progressList.filter((pr: any) => pr.user_id === p.user_id);
      const role = rolesList.find((r: any) => r.user_id === p.user_id);
      studentMap[p.user_id] = {
        userId: p.user_id,
        name: p.full_name || "Sem nome",
        role: role?.role || "student",
        joinedAt: p.created_at,
        totalXp: studentProgress.reduce((s: number, pr: any) => s + (pr.xp_earned || 0), 0),
        completedActivities: studentProgress.filter((pr: any) => pr.completed).length,
        videosWatched: studentProgress.filter((pr: any) => pr.activity_type === "video" && pr.completed).length,
        modulesActive: [...new Set(studentProgress.map((pr: any) => pr.module_id))].length,
        lastActivity: studentProgress.length > 0
          ? studentProgress.sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))[0]?.created_at
          : null,
      };
    });

    // Global aggregates
    const totalStudents = Object.keys(studentMap).length;
    const totalXpAll = progressList.reduce((s: number, p: any) => s + (p.xp_earned || 0), 0);
    const totalCompleted = progressList.filter((p: any) => p.completed).length;

    // Module engagement
    const moduleEngagement: Record<string, { activities: number; xp: number; uniqueStudents: Set<string> }> = {};
    progressList.forEach((p: any) => {
      if (!moduleEngagement[p.module_id]) moduleEngagement[p.module_id] = { activities: 0, xp: 0, uniqueStudents: new Set() };
      moduleEngagement[p.module_id].activities++;
      moduleEngagement[p.module_id].xp += p.xp_earned || 0;
      moduleEngagement[p.module_id].uniqueStudents.add(p.user_id);
    });

    const moduleStats = Object.entries(moduleEngagement).map(([id, stats]) => ({
      moduleId: id,
      totalActivities: stats.activities,
      totalXp: stats.xp,
      uniqueStudents: stats.uniqueStudents.size,
    }));

    // Activity type distribution
    const activityDist: Record<string, number> = {};
    progressList.forEach((p: any) => {
      activityDist[p.activity_type] = (activityDist[p.activity_type] || 0) + 1;
    });

    return new Response(JSON.stringify({
      generatedAt: new Date().toISOString(),
      role: isManager ? "manager" : "teacher",
      global: {
        totalStudents,
        totalXp: totalXpAll,
        totalActivitiesCompleted: totalCompleted,
        averageXpPerStudent: totalStudents > 0 ? Math.round(totalXpAll / totalStudents) : 0,
      },
      moduleEngagement: moduleStats,
      activityDistribution: activityDist,
      students: Object.values(studentMap).sort((a: any, b: any) => b.totalXp - a.totalXp),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-dashboard error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: e instanceof Error && e.message.includes("permissions") ? 403 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
