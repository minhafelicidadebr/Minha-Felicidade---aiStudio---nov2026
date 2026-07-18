import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

// Cliente de checkout (Onda 1). Invoca a edge function mp-create-preference e
// redireciona para o Checkout Pro do Mercado Pago. O preço/plano é sempre
// resolvido no servidor — aqui só enviamos a intenção (plano, intervalo, seats).

export type BillingInterval = "monthly" | "yearly";

export interface EscolarCheckoutPayload {
    seats_students: number;
    seats_schools: number;
    billing_interval: BillingInterval;
    contact_email: string;
    contact_name: string;
    is_public_ngo?: boolean;
}

interface PreferenceResponse {
    checkout_url?: string;
    error?: string;
}

const PENDING_CHECKOUT_KEY = "felicidade.pendingCheckout";

export interface PendingCheckout {
    planSlug: string;
    billingInterval: BillingInterval;
}

/**
 * Inicia o checkout individual. Se não houver sessão, preserva a intenção
 * (plano + intervalo) e manda para /auth, retomando após o login (Req 1.2).
 */
export async function startIndividualCheckout(
    planSlug: string,
    billingInterval: BillingInterval,
): Promise<void> {
    void trackEvent("checkout_started", { kind: "individual", plan_slug: planSlug, billing_interval: billingInterval });

    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        sessionStorage.setItem(
            PENDING_CHECKOUT_KEY,
            JSON.stringify({ planSlug, billingInterval } satisfies PendingCheckout),
        );
        window.location.href = `/auth?redirect=${encodeURIComponent("/subscription")}`;
        return;
    }

    const { data, error } = await supabase.functions.invoke<PreferenceResponse>("mp-create-preference", {
        body: { kind: "individual", plan_slug: planSlug, billing_interval: billingInterval },
    });

    if (error) throw error;
    const url = data?.checkout_url;
    if (!url) throw new Error(data?.error ?? "Não foi possível iniciar o checkout");
    window.location.href = url;
}

/** Inicia o checkout escolar/B2B. Não exige sessão (gestor pode ser pré-cadastro). */
export async function startEscolarCheckout(payload: EscolarCheckoutPayload): Promise<void> {
    void trackEvent("checkout_started", { kind: "escolar", billing_interval: payload.billing_interval });

    const { data, error } = await supabase.functions.invoke<PreferenceResponse>("mp-create-preference", {
        body: { kind: "escolar", ...payload },
    });

    if (error) throw error;
    const url = data?.checkout_url;
    if (!url) throw new Error(data?.error ?? "Não foi possível iniciar o checkout");
    window.location.href = url;
}

/** Lê e limpa uma intenção de checkout pendente (retomada pós-login). */
export function consumePendingCheckout(): PendingCheckout | null {
    const raw = sessionStorage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
    try {
        return JSON.parse(raw) as PendingCheckout;
    } catch {
        return null;
    }
}
