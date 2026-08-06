import { supabase } from "@/integrations/supabase/client";

/**
 * Valid engagement event types (matches CHECK constraint in engagement_events table).
 */
export type EngagementEventType =
    | "session_start"
    | "module_view"
    | "exercise_complete"
    | "ai_interaction"
    | "quiz_complete"
    | "flashcard_session"
    | "dynamic_complete"
    | "streak_day";

/**
 * Track a user engagement event. Best-effort: never throws, never blocks UI.
 * Inserts into engagement_events table (ledger, INSERT-only via RLS).
 * If user belongs to an org, the org_id is resolved from institutional_memberships.
 */
export async function trackEngagement(
    eventType: EngagementEventType,
    metadata?: Record<string, unknown>,
): Promise<void> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const userId = session.user.id;

        // Resolve org_id (best-effort, cached per session)
        const orgId = await getOrgId(userId);

        await supabase.from("engagement_events").insert([{
            user_id: userId,
            organization_id: orgId,
            event_type: eventType,
            metadata: (metadata ? sanitize(metadata) : {}) as never,
        }]);
    } catch {
        // Silencioso: instrumentação nunca atrapalha o usuário.
    }
}

// Simple per-session cache for org_id lookup
let cachedOrgId: string | null | undefined = undefined;
let cachedUserId: string | null = null;

async function getOrgId(userId: string): Promise<string | null> {
    if (cachedUserId === userId && cachedOrgId !== undefined) {
        return cachedOrgId;
    }
    try {
        const { data } = await supabase
            .from("institutional_memberships")
            .select("organization_id")
            .eq("user_id", userId)
            .eq("status", "active")
            .limit(1)
            .maybeSingle();
        cachedOrgId = data?.organization_id ?? null;
        cachedUserId = userId;
    } catch {
        cachedOrgId = null;
        cachedUserId = userId;
    }
    return cachedOrgId;
}

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const keys = Object.keys(obj).slice(0, 5);
    for (const key of keys) {
        const val = obj[key];
        if (typeof val === "string" && val.length <= 120) result[key] = val;
        else if (typeof val === "number" && Number.isFinite(val)) result[key] = val;
        else if (typeof val === "boolean") result[key] = val;
    }
    return result;
}
