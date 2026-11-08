import { describe, expect, it } from "vitest";
import { assertPublicSupabaseKey, assertSupabaseUrl } from "./supabase-key";

describe("assertPublicSupabaseKey", () => {
    it("aceita uma chave publishable/anon pública", () => {
        expect(assertPublicSupabaseKey("sb_publishable_abc123")).toBe("sb_publishable_abc123");
        // JWT anon legado (formato antigo) também é público e aceito.
        expect(assertPublicSupabaseKey("eyJhbGciOi.legacy.anon")).toBe("eyJhbGciOi.legacy.anon");
    });

    it("rejeita chave secreta sb_secret_", () => {
        expect(() => assertPublicSupabaseKey("sb_secret_deadbeef")).toThrow(/secreta/i);
        expect(() => assertPublicSupabaseKey("SB_SECRET_DEADBEEF")).toThrow(/secreta/i);
    });

    it("rejeita outros prefixos secretos conhecidos", () => {
        expect(() => assertPublicSupabaseKey("service_role_xyz")).toThrow(/secreta/i);
        expect(() => assertPublicSupabaseKey("sbp_personal_access_token")).toThrow(/secreta/i);
    });

    it("rejeita chave ausente/vazia", () => {
        expect(() => assertPublicSupabaseKey(undefined)).toThrow(/ausente/i);
        expect(() => assertPublicSupabaseKey(null)).toThrow(/ausente/i);
        expect(() => assertPublicSupabaseKey("   ")).toThrow(/ausente/i);
    });
});

describe("assertSupabaseUrl", () => {
    it("aceita uma URL presente", () => {
        expect(assertSupabaseUrl("https://abc.supabase.co")).toBe("https://abc.supabase.co");
    });

    it("rejeita URL ausente/vazia", () => {
        expect(() => assertSupabaseUrl(undefined)).toThrow(/ausente/i);
        expect(() => assertSupabaseUrl("")).toThrow(/ausente/i);
    });
});
