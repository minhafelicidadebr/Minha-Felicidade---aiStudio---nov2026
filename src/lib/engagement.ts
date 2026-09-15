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
 *
 * TRUST-1.4 (R02): grava via RPC `record_engagement_event`, não via INSERT
 * direto — o INSERT client-side foi revogado. A RPC resolve `auth.uid()` e
 * valida a membership do organization_id requisitado no servidor; o valor
 * resolvido aqui é só a intenção do cliente, nunca a autoridade final.
 */
export async function trackEngagement(
    eventType: EngagementEventType,
    metadata?: Record<string, unknown>,
): Promise<void> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const userId = session.user.id;

        // Organização requisitada (best-effort, cached per session).
        // A RPC revalida a membership; isto é só intenção, não autorização.
        const orgId = await getOrgId(userId);

        await supabase.rpc("record_engagement_event", {
            _organization_id: orgId,
            _event_type: eventType,
            _metadata: metadata ? sanitize(metadata) : {},
        });
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

// TRUST-1.5: o retorno é tipado como valores JSON escalares em vez de `unknown`.
// A coluna `metadata` é `Json` no schema; antes o descasamento era escondido com
// `as never` no insert. O filtro abaixo já garantia só string/number/boolean —
// agora o tipo diz isso, e o insert type-checa sem cast.
function sanitize(obj: Record<string, unknown>): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};
    const keys = Object.keys(obj).slice(0, 5);
    for (const key of keys) {
        const val = obj[key];
        if (typeof val === "string" && val.length <= 120) result[key] = val;
        else if (typeof val === "number" && Number.isFinite(val)) result[key] = val;
        else if (typeof val === "boolean") result[key] = val;
    }
    return result;
}
