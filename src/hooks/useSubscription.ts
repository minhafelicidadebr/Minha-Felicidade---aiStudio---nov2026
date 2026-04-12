import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserPlan {
  plan_slug: string;
  plan_name: string;
  features: string[];
  limits: Record<string, number>;
  source: "individual" | "organization" | "default";
  status: string;
  billing_interval?: string;
  current_period_end?: string;
  org_name?: string;
}

const DEFAULT_PLAN: UserPlan = {
  plan_slug: "free",
  plan_name: "Gratuito",
  features: ["modules", "quiz_basic", "flashcards_basic", "alegria_5", "dashboard", "breathing", "lifewheel", "gratitude", "memory", "emotions"],
  limits: { alegria_daily: 5, quiz_levels: 1 },
  source: "default",
  status: "active",
};

export function useSubscription() {
  const [plan, setPlan] = useState<UserPlan>(DEFAULT_PLAN);
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setPlan(DEFAULT_PLAN);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_user_plan", { _user_id: session.user.id });
      if (error) throw error;

      const raw = data as unknown as Record<string, unknown>;
      setPlan({
        plan_slug: (raw.plan_slug as string) || "free",
        plan_name: (raw.plan_name as string) || "Gratuito",
        features: Array.isArray(raw.features) ? raw.features as string[] : JSON.parse(raw.features as string || "[]"),
        limits: (raw.limits as Record<string, number>) || {},
        source: (raw.source as UserPlan["source"]) || "default",
        status: (raw.status as string) || "active",
        billing_interval: raw.billing_interval as string | undefined,
        current_period_end: raw.current_period_end as string | undefined,
        org_name: raw.org_name as string | undefined,
      });
    } catch (err) {
      console.error("Error fetching plan:", err);
      setPlan(DEFAULT_PLAN);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => fetchPlan());
    return () => subscription.unsubscribe();
  }, [fetchPlan]);

  const hasFeature = useCallback((feature: string) => plan.features.includes(feature), [plan.features]);

  const getLimit = useCallback((key: string) => plan.limits[key] ?? 0, [plan.limits]);

  const isPremium = plan.plan_slug !== "free";
  const isAdvanced = plan.plan_slug === "advanced";

  return { plan, loading, hasFeature, getLimit, isPremium, isAdvanced, refetch: fetchPlan };
}
