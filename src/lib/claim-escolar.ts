import { supabase } from "@/integrations/supabase/client";

// Cliente do claim escolar pré-cadastro (abordagem A). Invoca a RPC
// self-scoped claim_escolar_subscription — o servidor resolve tudo a partir do
// e-mail CONFIRMADO do auth.uid(); nada de e-mail vindo daqui. Nunca lança:
// mapeia sucesso, "sem intent", "e-mail não confirmado" e erro para um shape
// único que a UI consome.

export type ClaimReason =
    | "associated"
    | "no_claimable_intent"
    | "email_unconfirmed"
    | "invalid_token"
    | "error";

export interface ClaimResult {
    ok: boolean;
    reason: ClaimReason;
    org_name?: string;
}

interface RpcClaimPayload {
    ok?: boolean;
    reason?: string;
    org_name?: string;
}

/** Normaliza uma reason vinda da RPC para o conjunto conhecido. */
export function normalizeClaimReason(reason: unknown): ClaimReason {
    if (
        reason === "associated" ||
        reason === "no_claimable_intent" ||
        reason === "email_unconfirmed" ||
        reason === "invalid_token"
    ) {
        return reason;
    }
    return "error";
}

export async function claimEscolarSubscription(): Promise<ClaimResult> {
    try {
        // Cast `as never`: a RPC ainda não está nos tipos gerados até o Lovable
        // regenerá-los (mesmo padrão de get_my_payment_history / cancelamento).
        const { data, error } = await supabase.rpc("claim_escolar_subscription" as never);
        if (error) return { ok: false, reason: "error" };

        const payload = (data ?? {}) as RpcClaimPayload;
        const reason = normalizeClaimReason(payload.reason);
        return { ok: payload.ok === true, reason, org_name: payload.org_name };
    } catch {
        return { ok: false, reason: "error" };
    }
}

/**
 * Abordagem B: reivindica a assinatura escolar por CÓDIGO (token), permitindo
 * usar um e-mail diferente do checkout. O token é a prova de compra. Nunca lança.
 */
export async function claimEscolarWithToken(token: string): Promise<ClaimResult> {
    try {
        const { data, error } = await supabase.rpc("claim_escolar_with_token" as never, { _token: token } as never);
        if (error) return { ok: false, reason: "error" };

        const payload = (data ?? {}) as RpcClaimPayload;
        const reason = normalizeClaimReason(payload.reason);
        return { ok: payload.ok === true, reason, org_name: payload.org_name };
    } catch {
        return { ok: false, reason: "error" };
    }
}
