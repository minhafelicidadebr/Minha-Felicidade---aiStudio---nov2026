// Truth & Evidence Registry (Onda 0 do plano). Fonte única de claims REGULADOS
// exibidos ao público (métricas de efeito, prova social, depoimentos, badges de
// conformidade, menções de licença/afiliação). Doutrina §1: honestidade >
// overclaim — um claim só pode ser exibido como fato se estiver `approved` com
// fonte e dentro da validade. `validateRegistry` é verificado por teste (parte
// do `npm run quality`), então um claim aprovado sem prova quebra o gate.

export type ClaimCategory =
    | "metric"
    | "social_proof"
    | "testimonial"
    | "compliance_badge"
    | "license";

export type ClaimStatus = "draft" | "approved" | "expired" | "rejected";

export interface ClaimSource {
    type: string; // ex.: "peer_reviewed", "internal_metric", "consent_record", "license_doc"
    url?: string;
    document?: string; // referência a um documento interno (consentimento/licença)
    accessedDate?: string; // ISO
}

export interface ClaimEntry {
    id: string;
    text: string;
    surface: string;
    category: ClaimCategory;
    source: ClaimSource;
    evidenceLevel: string;
    limitations?: string;
    owner: string;
    reviewer?: string;
    status: ClaimStatus;
    lastReviewed: string; // ISO date
    expiresAt?: string; // ISO date
}

const REQUIRED_FIELDS: (keyof ClaimEntry)[] = [
    "id",
    "text",
    "surface",
    "category",
    "source",
    "evidenceLevel",
    "owner",
    "status",
    "lastReviewed",
];

function hasProvenance(source: ClaimSource | undefined): boolean {
    if (!source) return false;
    return Boolean((source.url && source.url.trim()) || (source.document && source.document.trim()));
}

function isFutureDate(iso: string | undefined, now: Date): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    return !Number.isNaN(d.getTime()) && d.getTime() > now.getTime();
}

/**
 * Valida a integridade do registro. Retorna a lista de erros (vazia = ok).
 * Função pura testável — o registro real é validado por teste no gate.
 */
export function validateRegistry(entries: ClaimEntry[], now: Date = new Date()): string[] {
    const errors: string[] = [];
    const seen = new Set<string>();

    for (const entry of entries) {
        const label = entry?.id ? `claim "${entry.id}"` : "claim sem id";

        for (const field of REQUIRED_FIELDS) {
            const value = entry?.[field];
            if (value === undefined || value === null || value === "") {
                errors.push(`${label}: campo obrigatório ausente: ${String(field)}`);
            }
        }

        if (entry?.id) {
            if (seen.has(entry.id)) errors.push(`${label}: id duplicado`);
            seen.add(entry.id);
        }

        if (entry?.status === "approved") {
            if (!hasProvenance(entry.source)) {
                errors.push(`${label}: aprovado sem proveniência (source.url ou source.document)`);
            }
            if (!isFutureDate(entry.expiresAt, now)) {
                errors.push(`${label}: aprovado sem expiresAt válido/futuro`);
            }
            if (
                (entry.category === "testimonial" || entry.category === "license") &&
                !(entry.source?.document && entry.source.document.trim())
            ) {
                errors.push(
                    `${label}: ${entry.category} aprovado exige source.document (consentimento/licença)`,
                );
            }
        }
    }

    return errors;
}

// Import tardio evita ciclo (o registro importa tipos deste módulo).
import { CLAIMS } from "@/content/claims-registry";

export function getClaim(id: string): ClaimEntry | undefined {
    return CLAIMS.find((c) => c.id === id);
}

/**
 * Retorna o claim como aprovado (texto + fonte) apenas se estiver `approved`,
 * com proveniência e dentro da validade. Caso contrário, `null` — a UI deve usar
 * um fallback honesto, nunca renderizar um valor não aprovado como fato.
 */
export function getApprovedClaim(
    id: string,
    now: Date = new Date(),
): { text: string; source: ClaimSource } | null {
    const entry = getClaim(id);
    if (!entry) return null;
    if (entry.status !== "approved") return null;
    if (!hasProvenance(entry.source)) return null;
    if (!isFutureDate(entry.expiresAt, now)) return null;
    return { text: entry.text, source: entry.source };
}
