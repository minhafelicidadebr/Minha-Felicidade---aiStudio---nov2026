import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserPlan {
    plan_slug: "free" | "intermediate" | "advanced";
    plan_name: string;
    features: string[];
    limits: Record<string, number>;
    source: "individual" | "organization" | "default";
    status?: string;
    billing_interval?: string;
    current_period_end?: string;
    org_name?: string;
    organization_id?: string | null;
}

const DEFAULT_FREE_PLAN: UserPlan = {
    plan_slug: "free",
    plan_name: "Gratuito",
    features: [
        "modules",
        "quiz_basic",
        "flashcards_basic",
        "alegria_5",
        "dashboard",
        "breathing",
        "lifewheel",
        "gratitude",
        "memory",
        "emotions",
    ],
    limits: { alegria_daily: 9, quiz_levels: 1 },
    source: "default",
    status: "active",
};

export const SUBSCRIPTION_INVALIDATED_EVENT = "felicidade:subscription-invalidated";

/** Notifica todas as instâncias montadas de useSubscription para recarregar get_my_plan(). */
export function notifySubscriptionChanged(): void {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(SUBSCRIPTION_INVALIDATED_EVENT));
    }
}

export function useSubscription() {
    const [plan, setPlan] = useState<UserPlan>(DEFAULT_FREE_PLAN);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPlan = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setPlan(DEFAULT_FREE_PLAN);
                setError(null);
                setLoading(false);
                return;
            }

            const { data, error: rpcError } = await supabase.rpc("get_my_plan");
            if (rpcError) {
                console.warn("Error fetching plan:", rpcError.message);
                setError(rpcError.message);
                setPlan(DEFAULT_FREE_PLAN);
            } else if (data) {
                const parsed = data as unknown as UserPlan;
                setPlan({
                    plan_slug: parsed.plan_slug || "free",
                    plan_name: parsed.plan_name || "Gratuito",
                    features: Array.isArray(parsed.features) ? parsed.features : DEFAULT_FREE_PLAN.features,
                    limits: parsed.limits || DEFAULT_FREE_PLAN.limits,
                    source: parsed.source || "default",
                    status: parsed.status,
                    billing_interval: parsed.billing_interval,
                    current_period_end: parsed.current_period_end,
                    org_name: parsed.org_name,
                    organization_id: parsed.organization_id ?? null,
                });
                setError(null);
            }
        } catch (err) {
            console.warn("Subscription check error:", err);
            setError(err instanceof Error ? err.message : "Falha ao verificar plano.");
            setPlan(DEFAULT_FREE_PLAN);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchPlan();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            void fetchPlan();
        });

        const handleInvalidate = () => {
            void fetchPlan();
        };

        if (typeof window !== "undefined") {
            window.addEventListener(SUBSCRIPTION_INVALIDATED_EVENT, handleInvalidate);
        }

        return () => {
            subscription.unsubscribe();
            if (typeof window !== "undefined") {
                window.removeEventListener(SUBSCRIPTION_INVALIDATED_EVENT, handleInvalidate);
            }
        };
    }, [fetchPlan]);

    const hasFeature = useCallback(
        (feature: string): boolean => {
            return plan.features.includes(feature);
        },
        [plan.features]
    );

    const getLimit = useCallback(
        (limitKey: string): number => {
            return plan.limits[limitKey] ?? 0;
        },
        [plan.limits]
    );

    const isPremium = plan.plan_slug !== "free";

    return {
        plan,
        loading,
        error,
        isPremium,
        hasFeature,
        getLimit,
        refetch: fetchPlan,
    };
}
