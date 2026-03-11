import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODULES = [
  { id: "mentiras", number: 1, title: "As Grandes Mentiras Sobre Ser Feliz", icon: "🎭" },
  { id: "expectativas", number: 2, title: "O Bug das Expectativas", icon: "🐛" },
  { id: "rewirements", number: 3, title: "O Que Realmente Funciona", icon: "⚡" },
  { id: "hacks", number: 4, title: "Hackeando o Cérebro", icon: "🧠" },
  { id: "habitos", number: 5, title: "Virando o Jogo da Vida Real", icon: "🚀" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: targetUserId } = await req.json().catch(() => ({ data: null }));

    // Check if requesting another user's data (needs teacher/manager role)
    let queryUserId = user.id;
    if (targetUserId && targetUserId !== user.id) {
      const { data: roles } = await supabase.rpc("has_role", { _user_id: user.id, _role: "teacher" });
      const { data: managerRole } = await supabase.rpc("has_role", { _user_id: user.id, _role: "manager" });
      if (!roles && !managerRole) throw new Error("Insufficient permissions");
      queryUserId = targetUserId;
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", queryUserId)
      .single();

    // Fetch progress
    const { data: progress } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", queryUserId)
      .order("created_at", { ascending: false });

    const allProgress = progress || [];
    const totalXp = allProgress.reduce((s: number, p: any) => s + (p.xp_earned || 0), 0);
    const completedCount = allProgress.filter((p: any) => p.completed).length;
    const videosWatched = allProgress.filter((p: any) => p.activity_type === "video" && p.completed).length;

    const moduleStats = MODULES.map((mod) => {
      const modProgress = allProgress.filter((p: any) => p.module_id === mod.id);
      const completed = modProgress.filter((p: any) => p.completed).length;
      const xp = modProgress.reduce((s: number, p: any) => s + (p.xp_earned || 0), 0);
      const activities: Record<string, number> = {};
      modProgress.forEach((p: any) => {
        activities[p.activity_type] = (activities[p.activity_type] || 0) + 1;
      });
      return { ...mod, completed, xp, activities };
    });

    // Activity breakdown
    const activityTypes: Record<string, { count: number; xp: number }> = {};
    allProgress.forEach((p: any) => {
      if (!activityTypes[p.activity_type]) activityTypes[p.activity_type] = { count: 0, xp: 0 };
      activityTypes[p.activity_type].count++;
      activityTypes[p.activity_type].xp += p.xp_earned || 0;
    });

    // Streak calculation (consecutive days with activity)
    const uniqueDays = [...new Set(allProgress.map((p: any) => p.created_at?.split("T")[0]))].sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
    for (let i = 0; i < uniqueDays.length; i++) {
      const expected = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      if (uniqueDays[i] === expected) streak++;
      else break;
    }

    const report = {
      generatedAt: new Date().toISOString(),
      student: {
        name: profile?.full_name || "Estudante",
        email: user.email,
        joinedAt: profile?.created_at,
      },
      summary: {
        totalXp,
        completedActivities: completedCount,
        videosWatched,
        totalModules: 5,
        currentStreak: streak,
        totalDaysActive: uniqueDays.length,
      },
      modules: moduleStats,
      activityBreakdown: activityTypes,
      recentActivity: allProgress.slice(0, 20).map((p: any) => ({
        type: p.activity_type,
        module: p.module_id,
        xp: p.xp_earned,
        completed: p.completed,
        date: p.created_at,
      })),
    };

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
