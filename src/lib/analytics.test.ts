import { describe, expect, it, vi } from "vitest";

// analytics.ts importa o client Supabase (createClient roda no load do módulo);
// no ambiente de teste as envs VITE_ não existem, então mockamos o client.
vi.mock("@/integrations/supabase/client", () => ({
    supabase: { auth: { getSession: vi.fn() }, from: vi.fn() },
}));

import { sanitizeEventMetadata } from "./analytics";

describe("sanitizeEventMetadata", () => {
    it("retorna objeto vazio quando não há metadata", () => {
        expect(sanitizeEventMetadata("signup")).toEqual({});
        expect(sanitizeEventMetadata("signup", undefined)).toEqual({});
    });

    it("mantém apenas chaves da allowlist do kind", () => {
        expect(
            sanitizeEventMetadata("checkout_started", {
                kind: "individual",
                plan_slug: "intermediate",
                billing_interval: "monthly",
                // chaves fora da allowlist são descartadas:
                email: "quem@exemplo.com",
                full_name: "Fulano de Tal",
            }),
        ).toEqual({ kind: "individual", plan_slug: "intermediate", billing_interval: "monthly" });
    });

    it("descarta valores não simples (objetos, arrays, funções)", () => {
        expect(
            sanitizeEventMetadata("paywall_hit", {
                feature: { nested: true } as unknown as string,
            }),
        ).toEqual({});
        expect(sanitizeEventMetadata("activation", { module_id: ["a", "b"] as unknown as string })).toEqual({});
    });

    it("aceita string curta, número finito e boolean", () => {
        expect(sanitizeEventMetadata("lesson_completed", { module_id: "mentiras", activity_type: "video" })).toEqual({
            module_id: "mentiras",
            activity_type: "video",
        });
        expect(sanitizeEventMetadata("activation", { module_id: 42 as unknown as string })).toEqual({ module_id: 42 });
    });

    it("descarta string longa demais (possível texto livre / PII)", () => {
        const longText = "x".repeat(200);
        expect(sanitizeEventMetadata("paywall_hit", { feature: longText })).toEqual({});
    });

    it("descarta número não finito", () => {
        expect(sanitizeEventMetadata("activation", { module_id: Infinity as unknown as string })).toEqual({});
    });
});
