import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
    supabase: { rpc: vi.fn() },
}));

import { supabase } from "@/integrations/supabase/client";
import { claimEscolarSubscription, claimEscolarWithToken, normalizeClaimReason } from "./claim-escolar";

const rpcMock = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

afterEach(() => vi.clearAllMocks());

describe("normalizeClaimReason", () => {
    it("mantém reasons conhecidas", () => {
        expect(normalizeClaimReason("associated")).toBe("associated");
        expect(normalizeClaimReason("no_claimable_intent")).toBe("no_claimable_intent");
        expect(normalizeClaimReason("email_unconfirmed")).toBe("email_unconfirmed");
    });
    it("cai em 'error' para reason desconhecida/ausente", () => {
        expect(normalizeClaimReason("whatever")).toBe("error");
        expect(normalizeClaimReason(undefined)).toBe("error");
    });
});

describe("claimEscolarSubscription", () => {
    it("mapeia associação bem-sucedida", async () => {
        rpcMock.mockResolvedValue({ data: { ok: true, reason: "associated", org_name: "Escola X" }, error: null });
        expect(await claimEscolarSubscription()).toEqual({ ok: true, reason: "associated", org_name: "Escola X" });
    });

    it("mapeia ausência de intent elegível", async () => {
        rpcMock.mockResolvedValue({ data: { ok: false, reason: "no_claimable_intent" }, error: null });
        expect(await claimEscolarSubscription()).toEqual({ ok: false, reason: "no_claimable_intent", org_name: undefined });
    });

    it("mapeia e-mail não confirmado", async () => {
        rpcMock.mockResolvedValue({ data: { ok: false, reason: "email_unconfirmed" }, error: null });
        expect(await claimEscolarSubscription()).toEqual({ ok: false, reason: "email_unconfirmed", org_name: undefined });
    });

    it("retorna error (sem lançar) quando a RPC falha", async () => {
        rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
        expect(await claimEscolarSubscription()).toEqual({ ok: false, reason: "error" });
    });

    it("retorna error (sem lançar) quando a promessa rejeita", async () => {
        rpcMock.mockRejectedValue(new Error("network"));
        expect(await claimEscolarSubscription()).toEqual({ ok: false, reason: "error" });
    });
});

describe("claimEscolarWithToken", () => {
    it("mapeia associação bem-sucedida por token", async () => {
        rpcMock.mockResolvedValue({ data: { ok: true, reason: "associated", org_name: "Escola Y" }, error: null });
        expect(await claimEscolarWithToken("tok-123")).toEqual({ ok: true, reason: "associated", org_name: "Escola Y" });
        expect(rpcMock).toHaveBeenCalledWith("claim_escolar_with_token", { _token: "tok-123" });
    });

    it("mapeia token inválido", async () => {
        rpcMock.mockResolvedValue({ data: { ok: false, reason: "invalid_token" }, error: null });
        expect(await claimEscolarWithToken("nope")).toEqual({ ok: false, reason: "invalid_token", org_name: undefined });
    });

    it("retorna error quando a RPC falha", async () => {
        rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
        expect(await claimEscolarWithToken("x")).toEqual({ ok: false, reason: "error" });
    });
});
