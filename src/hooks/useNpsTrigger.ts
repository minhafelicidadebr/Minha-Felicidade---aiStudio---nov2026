import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const NPS_COOLDOWN_KEY = "nps_last_shown";
const NPS_COOLDOWN_DAYS = 0; // TEMP: 0 para teste — voltar para 14 depois

/**
 * Controls when the NPS micro-survey should appear.
 * Rules:
 * - Show only to authenticated users
 * - Don't show if user answered within the last 14 days
 * - Show after meaningful engagement (5+ sessions or module completion)
 */
export function useNpsTrigger() {
    const [shouldShow, setShouldShow] = useState(false);

    useEffect(() => {
        async function check() {
            try {
                // Check cooldown
                const lastShown = localStorage.getItem(NPS_COOLDOWN_KEY);
                if (lastShown) {
                    const daysSince = (Date.now() - parseInt(lastShown, 10)) / (1000 * 60 * 60 * 24);
                    if (daysSince < NPS_COOLDOWN_DAYS) return;
                }

                // Check auth
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Check if already submitted recently
                const { data: recent } = await supabase
                    .from("nps_responses")
                    .select("id")
                    .eq("user_id", user.id)
                    .gte("created_at", new Date(Date.now() - NPS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString())
                    .limit(1);

                if (recent && recent.length > 0) return;

                setShouldShow(true);
            } catch {
                // Fail silently — NPS is non-critical
            }
        }
        check();
    }, []);

    const dismiss = () => {
        localStorage.setItem(NPS_COOLDOWN_KEY, String(Date.now()));
        setShouldShow(false);
    };

    return { shouldShow, dismiss };
}
