// Rate limiting simples para mp-create-preference (função pública no fluxo
// escolar sem JWT). Sem tabela nova: conta as purchase_intents recentes do
// mesmo requisitante (user_id no individual, contact_email no escolar) numa
// janela curta. Risco mitigado é RUÍDO (spam de intents/preferências), não
// financeiro — o preço é sempre resolvido no servidor. Fail-open: se o próprio
// contador falhar, não bloqueia o checkout legítimo.

export class CheckoutRateLimitError extends Error {
    status = 429;
    constructor(message = "Muitas tentativas de checkout. Aguarde alguns minutos e tente novamente.") {
        super(message);
    }
}

export const CHECKOUT_RATE_WINDOW_MINUTES = 10;
export const CHECKOUT_RATE_MAX_INTENTS = 5;

interface CountQuery {
    select: (columns: string, opts: { count: "exact"; head: true }) => CountQuery;
    gte: (column: string, value: string) => CountQuery;
    eq: (column: string, value: string) => CountQuery;
}
interface ServiceLike {
    from: (table: string) => CountQuery;
}

export interface CheckoutRateKey {
    userId?: string | null;
    contactEmail?: string | null;
}

/**
 * Lança CheckoutRateLimitError se o requisitante excedeu o limite de intents na
 * janela. Best-effort: erro do contador NÃO bloqueia (fail-open, por design).
 */
export async function assertCheckoutRateLimit(service: ServiceLike, key: CheckoutRateKey): Promise<void> {
    const sinceIso = new Date(Date.now() - CHECKOUT_RATE_WINDOW_MINUTES * 60_000).toISOString();

    let query = service
        .from("purchase_intents")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sinceIso);

    if (key.userId) {
        query = query.eq("user_id", key.userId);
    } else if (key.contactEmail) {
        query = query.eq("contact_email", key.contactEmail);
    } else {
        return; // sem chave para limitar — não deveria acontecer
    }

    const { count, error } = (await query) as unknown as { count: number | null; error: unknown };
    if (error) return; // fail-open
    if ((count ?? 0) >= CHECKOUT_RATE_MAX_INTENTS) {
        throw new CheckoutRateLimitError();
    }
}
