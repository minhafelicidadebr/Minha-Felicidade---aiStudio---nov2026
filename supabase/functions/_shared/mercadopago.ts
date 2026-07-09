// ──────────────────────────────────────────────────────────────────────────
// Módulo privilegiado de pagamento (Mercado Pago) — Onda 1.
//
// INVARIANTE DE SEGURANÇA: este é o ÚNICO arquivo de runtime autorizado a
// referenciar a SERVICE_ROLE key (ver allow-list em scripts/security-gate.mjs).
// O privilégio só é seguro porque a verificação HMAC do webhook
// (verifyWebhookSignature) está colocada AQUI, no mesmo módulo — quem herdar o
// cliente privilegiado herda, no mesmo lugar, a checagem que o justifica.
//
// As tabelas de pagamento (purchase_intents) e a RPC de ativação
// (activate_subscription_from_intent) são service_role-only por design: o
// cliente nunca ativa a própria assinatura. mp-create-preference e mp-webhook
// são os dois únicos chamadores.
// ──────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const mpCorsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Cliente Supabase com service role. Uso restrito às funções de pagamento
 * (escritoras server-only do estado de assinatura). NUNCA use isto em funções
 * de IA ou em qualquer coisa exposta a input não verificado do cliente.
 */
export function createServiceClient() {
    return createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false, autoRefreshToken: false } },
    );
}

/** Comparação de tempo constante para evitar timing attacks na assinatura. */
function timingSafeEqualHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

function parseSignatureHeader(header: string | null): { ts: string; v1: string } {
    const result = { ts: "", v1: "" };
    if (!header) return result;
    for (const part of header.split(",")) {
        const idx = part.indexOf("=");
        if (idx === -1) continue;
        const key = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        if (key === "ts") result.ts = value;
        if (key === "v1") result.v1 = value;
    }
    return result;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
    return Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Verifica a assinatura HMAC de uma notificação do Mercado Pago.
 * Manifest oficial: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * (Requirement 3.1/3.2 — rejeita se ausente/ inválida/ sem segredo.)
 */
export async function verifyWebhookSignature(params: {
    signatureHeader: string | null;
    requestId: string | null;
    dataId: string | null;
    secret: string | undefined;
}): Promise<boolean> {
    const { signatureHeader, requestId, dataId, secret } = params;
    if (!secret || !dataId) return false;

    const { ts, v1 } = parseSignatureHeader(signatureHeader);
    if (!ts || !v1) return false;

    // O MP normaliza IDs alfanuméricos para minúsculas no cálculo do manifest.
    const normalizedId = /^[a-zA-Z0-9]+$/.test(dataId) ? dataId.toLowerCase() : dataId;
    const manifest = `id:${normalizedId};request-id:${requestId ?? ""};ts:${ts};`;
    const expected = await hmacSha256Hex(secret, manifest);
    return timingSafeEqualHex(expected, v1);
}

export interface MpPreferenceItem {
    title: string;
    quantity: number;
    unit_price: number; // em reais (não centavos)
    currency_id: "BRL";
}

/** Cria uma preferência no Checkout Pro e retorna o init_point (checkout_url). */
export async function createPreference(params: {
    accessToken: string;
    externalReference: string;
    item: MpPreferenceItem;
    payerEmail?: string;
    notificationUrl: string;
    successUrl: string;
    pendingUrl: string;
    failureUrl: string;
}): Promise<{ id: string; init_point: string }> {
    const body = {
        items: [params.item],
        external_reference: params.externalReference,
        notification_url: params.notificationUrl,
        back_urls: {
            success: params.successUrl,
            pending: params.pendingUrl,
            failure: params.failureUrl,
        },
        auto_return: "approved",
        ...(params.payerEmail ? { payer: { email: params.payerEmail } } : {}),
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${params.accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text();
        // Mensagem clara em caso de credencial inválida (mesmo sintoma do produto irmão).
        if (response.status === 401 || response.status === 403) {
            throw new MpCredentialError(`Mercado Pago rejeitou as credenciais (${response.status}): ${text}`);
        }
        throw new Error(`Mercado Pago preference error (${response.status}): ${text}`);
    }

    const data = (await response.json()) as { id?: string; init_point?: string };
    if (!data.id || !data.init_point) {
        throw new Error("Mercado Pago não retornou init_point da preferência");
    }
    return { id: data.id, init_point: data.init_point };
}

export interface MpPayment {
    id: number | string;
    status: string;
    external_reference: string | null;
}

/** Busca o pagamento na API do MP pelo id recebido na notificação. */
export async function fetchPayment(accessToken: string, paymentId: string): Promise<MpPayment> {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Mercado Pago payment lookup error (${response.status}): ${text}`);
    }
    const data = (await response.json()) as MpPayment;
    return data;
}

export class MpCredentialError extends Error {
    status = 502;
    constructor(message: string) {
        super(message);
        this.name = "MpCredentialError";
    }
}
