import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { assertTriggerSecret, createServiceClient } from "../_shared/service-client.ts";
import { renderEmail, type NotificationKind } from "../_shared/email-templates.ts";

// process-notifications (Onda 1.5) — worker da outbox.
// Lê notification_outbox pendente (lote), envia via Resend, marca sent/failed.
// Idempotente e NÃO-bloqueante: falha de envio nunca reverte a ativação.
// Acionado por cron/admin com x-trigger-secret (não é público).

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, x-trigger-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLAN_NAMES: Record<string, string> = {
    free: "Gratuito",
    intermediate: "Intermediário",
    advanced: "Avançado",
};

interface OutboxRow {
    id: string;
    kind: string;
    recipient_email: string;
    attempts: number | null;
    payload: {
        plan_slug?: string;
        billing_interval?: string;
        period_end?: string;
        effective_until?: string;
    } | null;
}

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

        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (!resendKey) throw new Error("RESEND_API_KEY not configured");
        const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ??
            "Felicidade.lab <nao-responda@felicidadeparatodos.org>";
        const appUrl = Deno.env.get("PUBLIC_SITE_URL") ?? undefined;

        const service = createServiceClient();

        const { data, error } = await service
            .from("notification_outbox")
            .select("id, kind, recipient_email, attempts, payload")
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(25);
        if (error) throw error;

        const rows = (data ?? []) as OutboxRow[];
        let sent = 0;
        let failed = 0;

        for (const row of rows) {
            const p = row.payload ?? {};
            try {
                const email = renderEmail({
                    kind: row.kind as NotificationKind,
                    planName: p.plan_slug ? (PLAN_NAMES[p.plan_slug] ?? p.plan_slug) : undefined,
                    billingInterval: p.billing_interval,
                    periodEnd: p.period_end ?? p.effective_until,
                    appUrl,
                });

                const resp = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        from: fromEmail,
                        to: row.recipient_email,
                        subject: email.subject,
                        html: email.html,
                    }),
                });

                if (!resp.ok) {
                    throw new Error(`Resend ${resp.status}: ${await resp.text()}`);
                }

                await service
                    .from("notification_outbox")
                    .update({ status: "sent", sent_at: new Date().toISOString(), attempts: (row.attempts ?? 0) + 1 })
                    .eq("id", row.id);
                sent++;
            } catch (e) {
                await service
                    .from("notification_outbox")
                    .update({ status: "failed", attempts: (row.attempts ?? 0) + 1, last_error: String(e).slice(0, 500) })
                    .eq("id", row.id);
                failed++;
            }
        }

        return json({ ok: true, processed: rows.length, sent, failed }, 200);
    } catch (e) {
        const status = e instanceof Error && e.message === "Forbidden" ? 401 : 500;
        console.error("process-notifications error:", e);
        return json({ error: e instanceof Error ? e.message : "error" }, status);
    }
});
