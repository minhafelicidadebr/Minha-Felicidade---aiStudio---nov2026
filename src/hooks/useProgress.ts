import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

const XP_MAP: Record<string, number> = {
  video: 10,
  quiz: 20,
  flashcard: 5,
  simulator: 25,
  debate: 15,
  poetry: 15,
  codesign: 20,
  evidence: 5,
};

export function useProgress() {
  const { toast } = useToast();

  const trackActivity = useCallback(
    async ({
      moduleId,
      activityType,
      activityId,
      score,
      data,
      completed = true,
    }: {
      moduleId: string;
      activityType: string;
      activityId?: string;
      score?: number;
      data?: Record<string, unknown>;
      completed?: boolean;
    }) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return null;

        const xp = completed ? (XP_MAP[activityType] || 10) : 0;

        const { data: result, error } = await supabase.from("user_progress").insert([{
          user_id: session.user.id,
          module_id: moduleId,
          activity_type: activityType,
          activity_id: activityId || null,
          score: score || null,
          xp_earned: xp,
          completed,
          data: (data || {}) as never,
        }]).select().single();

        if (error) {
          // Silently fail for duplicate entries
          if (error.code === "23505") return null;
          console.error("Progress tracking error:", error);
          return null;
        }

        if (completed && xp > 0) {
          toast({
            title: `+${xp} XP! ✨`,
            description: `Atividade completada com sucesso!`,
          });
        }

        // Instrumentação do funil (best-effort, sem PII).
        if (completed) {
          void trackEvent("lesson_completed", { module_id: moduleId, activity_type: activityType });
          // `activation` = PRIMEIRA atividade concluída da conta.
          void (async () => {
            const { count } = await supabase
              .from("user_progress")
              .select("id", { count: "exact", head: true })
              .eq("user_id", session.user.id)
              .eq("completed", true);
            if (count === 1) void trackEvent("activation", { module_id: moduleId });
          })();
        }

        return result;
      } catch (err) {
        console.error("Track activity error:", err);
        return null;
      }
    },
    [toast]
  );

  const getModuleProgress = useCallback(async (moduleId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const { data } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("module_id", moduleId);
    return data || [];
  }, []);

  return { trackActivity, getModuleProgress };
}
