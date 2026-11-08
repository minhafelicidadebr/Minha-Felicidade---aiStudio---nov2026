import { supabase } from "@/integrations/supabase/client";

// Onda 2 — captura de eventos do funil (client-side, best-effort).
// A tabela landing_events é write-only para o cliente (só INSERT). Nunca
// registramos texto livre / PII: cada `kind` tem uma allowlist fechada de
// chaves de metadata, e valores são limitados a tipos simples. A validação
// forte fica no banco (CHECK/policy); esta é a defesa em profundidade.

export type LandingEventKind =
    | "signup"
    | "activation"
    | "lesson_completed"
    | "paywall_hit"
    | "checkout_started";
// 'upgrade' é emitido SOMENTE no servidor (activate_subscription_from_intent),
// por isso não faz parte dos kinds capturáveis pelo cliente.

// Allowlist de chaves de metadata por kind. Qualquer chave fora disto é
// descartada; qualquer valor que não seja string/number/boolean é descartado.
const METADATA_ALLOWLIST: Record<LandingEventKind, readonly string[]> = {
    signup: ["method"],
    activation: ["module_id"],
    lesson_completed: ["module_id", "activity_type"],
    paywall_hit: ["feature"],
    checkout_started: ["kind", "plan_slug", "billing_interval"],
};

const MAX_METADATA_KEYS = 5;
const MAX_STRING_LEN = 120;
const SESSION_KEY = "felicidade.analyticsSessionId";

type MetadataValue = string | number | boolean;

function isSimpleValue(value: unknown): value is MetadataValue {
    const t = typeof value;
    if (t === "number") return Number.isFinite(value as number);
    if (t === "boolean") return true;
    if (t === "string") return (value as string).length <= MAX_STRING_LEN;
    return false;
}

/**
 * Função pura testável: filtra `metadata` mantendo apenas as chaves da
 * allowlist do `kind`, valores simples, e no máximo MAX_METADATA_KEYS chaves.
 */
export function sanitizeEventMetadata(
    kind: LandingEventKind,
    metadata?: Record<string, unknown>,
): Record<string, MetadataValue> {
    if (!metadata) return {};
    const allowed = METADATA_ALLOWLIST[kind];
    if (!allowed) return {};

    const result: Record<string, MetadataValue> = {};
    for (const key of allowed) {
        if (Object.keys(result).length >= MAX_METADATA_KEYS) break;
        const value = metadata[key];
        if (value !== undefined && isSimpleValue(value)) {
            result[key] = value;
        }
    }
    return result;
}

function getSessionId(): string {
    if (typeof window === "undefined" || !window.localStorage) {
        return crypto.randomUUID();
    }
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(SESSION_KEY, id);
    }
    return id;
}

/**
 * Registra um evento do funil. Best-effort: nunca lança nem bloqueia a
 * navegação do usuário (analytics comum). Resolve `user_id` da sessão se houver.
 */
export async function trackEvent(
    kind: LandingEventKind,
    metadata?: Record<string, unknown>,
): Promise<void> {
    try {
        const session_id = getSessionId();
        const {
            data: { session },
        } = await supabase.auth.getSession();

        await supabase.from("landing_events").insert({
            kind,
            session_id,
            user_id: session?.user.id ?? null,
            metadata: sanitizeEventMetadata(kind, metadata),
        });
    } catch {
        // Silencioso por design: instrumentação nunca atrapalha o usuário.
    }
}
