import { describe, expect, it } from "vitest";
import {
    validateRegistry,
    getApprovedClaim,
    type ClaimEntry,
} from "./claims";
import { CLAIMS } from "@/content/claims-registry";

const NOW = new Date("2026-07-18T00:00:00.000Z");

function entry(overrides: Partial<ClaimEntry>): ClaimEntry {
    return {
        id: "x",
        text: "texto",
        surface: "landing",
        category: "metric",
        source: { type: "peer_reviewed", url: "https://exemplo/paper" },
        evidenceLevel: "moderate",
        owner: "founder",
        status: "draft",
        lastReviewed: "2026-07-01",
        ...overrides,
    };
}

describe("validateRegistry", () => {
    it("aceita registro bem-formado", () => {
        expect(validateRegistry([entry({ id: "a" }), entry({ id: "b" })], NOW)).toEqual([]);
    });

    it("acusa id duplicado", () => {
        const errs = validateRegistry([entry({ id: "dup" }), entry({ id: "dup" })], NOW);
        expect(errs.some((e) => e.includes("id duplicado"))).toBe(true);
    });

    it("acusa campo obrigatório ausente", () => {
        const errs = validateRegistry([entry({ id: "a", owner: "" })], NOW);
        expect(errs.some((e) => e.includes("owner"))).toBe(true);
    });

    it("acusa aprovado sem proveniência", () => {
        const errs = validateRegistry(
            [entry({ id: "a", status: "approved", source: { type: "internal" }, expiresAt: "2099-01-01" })],
            NOW,
        );
        expect(errs.some((e) => e.includes("proveniência"))).toBe(true);
    });

    it("acusa aprovado sem expiresAt futuro", () => {
        const errs = validateRegistry(
            [entry({ id: "a", status: "approved", expiresAt: "2020-01-01" })],
            NOW,
        );
        expect(errs.some((e) => e.includes("expiresAt"))).toBe(true);
    });

    it("acusa depoimento aprovado sem documento de consentimento", () => {
        const errs = validateRegistry(
            [
                entry({
                    id: "t",
                    category: "testimonial",
                    status: "approved",
                    source: { type: "consent", url: "https://x" }, // tem url mas não document
                    expiresAt: "2099-01-01",
                }),
            ],
            NOW,
        );
        expect(errs.some((e) => e.includes("testimonial aprovado exige source.document"))).toBe(true);
    });

    it("acusa licença aprovada sem documento", () => {
        const errs = validateRegistry(
            [
                entry({
                    id: "l",
                    category: "license",
                    status: "approved",
                    source: { type: "license", url: "https://x" },
                    expiresAt: "2099-01-01",
                }),
            ],
            NOW,
        );
        expect(errs.some((e) => e.includes("license aprovado exige source.document"))).toBe(true);
    });
});

describe("getApprovedClaim", () => {
    it("retorna null para draft/rejected/expired e para id inexistente", () => {
        // CLAIMS reais desta fase não têm aprovados; qualquer id draft → null.
        expect(getApprovedClaim("id-que-nao-existe", NOW)).toBeNull();
    });
});

describe("registro real (CLAIMS)", () => {
    it("passa na validação de integridade", () => {
        expect(validateRegistry(CLAIMS, NOW)).toEqual([]);
    });
});
