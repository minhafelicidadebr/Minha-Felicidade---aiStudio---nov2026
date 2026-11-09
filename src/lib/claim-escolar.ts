import { supabase } from "@/integrations/supabase/client";
import { notifySubscriptionChanged } from "@/hooks/useSubscription";

export type ClaimEscolarReason =
    | "associated"
    | "association_pending"
    | "already_associated"
    | "no_claimable_intent"
    | "email_unconfirmed"
    | "invalid_token"
    | "unauthenticated";

export interface ClaimEscolarResult {
    ok: boolean;
    reason?: ClaimEscolarReason;
    org_name?: string;
    organization_id?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tenta associar à conta atual uma compra escolar aprovada antes do cadastro
 * (Req 2.3 da Onda 1). Segura para chamar múltiplas vezes (idempotente).
 * A RPC resolve o e-mail do próprio JWT em auth.users e exige e-mail confirmado.
 */
export async function claimEscolarSubscription(): Promise<ClaimEscolarResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return { ok: false, reason: "unauthenticated" };
    }

    const { data, error } = await supabase.rpc("claim_escolar_subscription");
    if (error) {
        console.warn("claim_escolar_subscription failed:", error.message);
        return { ok: false };
    }
    const result = (data ?? { ok: false }) as unknown as ClaimEscolarResult;
    if (result.ok) {
        notifySubscriptionChanged();
    }
    return result;
}

/**
 * Abordagem B: associa pelo código recebido por e-mail (claim_token), permitindo
 * que o gestor reivindique mesmo que tenha criado a conta com outro e-mail.
 */
export async function claimEscolarWithToken(rawToken: string): Promise<ClaimEscolarResult> {
    const token = rawToken.trim();
    if (!UUID_RE.test(token)) {
        return { ok: false, reason: "invalid_token" };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return { ok: false, reason: "unauthenticated" };
    }

    const { data, error } = await supabase.rpc("claim_escolar_with_token", { _token: token });
    if (error) {
        console.warn("claim_escolar_with_token failed:", error.message);
        return { ok: false };
    }
    const result = (data ?? { ok: false }) as unknown as ClaimEscolarResult;
    if (result.ok) {
        notifySubscriptionChanged();
    }
    return result;
}
