import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
    createServiceClient,
    fetchPayment,
    mpCorsHeaders,
    verifyWebhookSignature,
} from "../_shared/mercadopago.ts";

// mp-webhook (Onda 1)
// 1. Verifica a assinatura HMAC ANTES de qualquer acesso ao banco (Req 3.1/3.2).
// 2. Busca o pagamento na API do MP pelo id recebido (nunca confia no corpo).
// 3. Chama activate_subscription_from_intent (RPC idempotente, service role).
// Notificações que não sejam de pagamento são ignoradas com 200 (Req 5).

function jsonResponse(payload: unknown, status: number): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...mpCorsHeaders, "Content-Type": "application/json" },
    });
}

interface WebhookBody {
    type?: string;
    topic?: string;
    action?: string;
    data?: { id?: string | number };
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: mpCorsHeaders });
    }

    try {
        const url = new URL(req.url);
        const secret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");
        const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");

        // O id do recurso e o tipo chegam por query string na notificação do MP.
        const dataId =
            url.searchParams.get("data.id") ?? url.searchParams.get("id");
        const type = url.searchParams.get("type") ?? url.searchParams.get("topic");

        // --- Verificação HMAC ANTES de tocar em qualquer coisa (fail closed) ---
        const valid = await verifyWebhookSignature({
            signatureHeader: req.headers.get("x-signature"),
            requestId: req.headers.get("x-request-id"),
            dataId,
            secret,
        });
        if (!valid) {
            // 401 e nenhuma escrita no banco (Requirement 3.2).
            return jsonResponse({ error: "invalid signature" }, 401);
        }

        // Corpo pode complementar o tipo/id (mas o id do query já foi assinado).
        let body: WebhookBody = {};
        try {
            body = (await req.json()) as WebhookBody;
        } catch {
            body = {};
        }

        const effectiveType = type ?? body.type ?? body.topic ?? "";
        if (effectiveType !== "payment") {
            // Merchant_order e outros tipos não ativam assinatura.
            return jsonResponse({ ignored: true, type: effectiveType }, 200);
        }

        if (!accessToken) {
            // Sem token não dá para consultar o pagamento; não ativa nada.
            console.error("mp-webhook: MERCADO_PAGO_ACCESS_TOKEN ausente");
            return jsonResponse({ error: "payment lookup unavailable" }, 500);
        }

        const paymentId = String(dataId ?? body.data?.id ?? "");
        if (!paymentId) {
            return jsonResponse({ ignored: true, reason: "no payment id" }, 200);
        }

        // Fonte de verdade do status é a API do MP, nunca o corpo da notificação.
        const payment = await fetchPayment(accessToken, paymentId);
        if (!payment.external_reference) {
            return jsonResponse({ ignored: true, reason: "no external_reference" }, 200);
        }

        const service = createServiceClient();
        const { data, error } = await service.rpc("activate_subscription_from_intent", {
            p_external_reference: payment.external_reference,
            p_mp_payment_id: String(payment.id),
            p_mp_status: payment.status,
        });

        if (error) throw error;

        return jsonResponse({ ok: true, result: data }, 200);
    } catch (e) {
        console.error("mp-webhook error:", e);
        // 500 faz o MP reentregar a notificação; a RPC é idempotente (Req 3.3).
        return jsonResponse({ error: "webhook processing failed" }, 500);
    }
});
