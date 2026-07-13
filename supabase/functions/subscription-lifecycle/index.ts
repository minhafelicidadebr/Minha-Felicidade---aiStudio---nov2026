import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { assertTriggerSecret, createServiceClient } from "../_shared/service-client.ts";

// subscription-lifecycle (Onda 1.5) — job diário (cron).
// Fina: apenas aciona a RPC run_subscription_lifecycle (toda a lógica está no
// SQL: lembretes de renovação + expiração + enfileira avisos na outbox).
// Acionada por cron/admin com x-trigger-secret (não é público).

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, x-trigger-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status: number): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        assertTriggerSecret(req);

        const reminderDays = Number(Deno.env.get("RENEWAL_REMINDER_DAYS") ?? "3");
        const service = createServiceClient();

        const { data, error } = await service.rpc("run_subscription_lifecycle", {
            _reminder_days: Number.isFinite(reminderDays) ? reminderDays : 3,
        });
        if (error) throw error;

        return json({ ok: true, result: data }, 200);
    } catch (e) {
        const status = e instanceof Error && e.message === "Forbidden" ? 401 : 500;
        console.error("subscription-lifecycle error:", e);
        return json({ error: e instanceof Error ? e.message : "error" }, status);
    }
});
