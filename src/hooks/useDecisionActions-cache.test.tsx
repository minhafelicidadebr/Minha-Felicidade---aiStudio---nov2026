import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@/integrations/supabase/client", () => ({
    supabase: { rpc: vi.fn() },
}));

import { supabase } from "@/integrations/supabase/client";
import { institutionalQueryKeys } from "@/lib/institutional-query-keys";
import { useDecisionActions } from "./useDecisionActions";

const rpc = vi.mocked(supabase.rpc);

function createWrapper(client: QueryClient) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

beforeEach(() => vi.clearAllMocks());

describe("TRUST-1.3 — mutations invalidam somente identidade+tenant", () => {
    it("sucesso invalida o prefixo da organização que iniciou a ação", async () => {
        rpc.mockResolvedValue({ data: null, error: null });
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue();
        const { result } = renderHook(
            () => useDecisionActions("user-a", "org-a"),
            { wrapper: createWrapper(client) },
        );

        await act(async () => {
            expect(await result.current.resendInvitations(["invite-a"])).toMatchObject({ status: "succeeded" });
        });

        expect(invalidate).toHaveBeenCalledWith({
            queryKey: institutionalQueryKeys.organization("user-a", "org-a"),
        });
        expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({
            queryKey: institutionalQueryKeys.organization("user-a", "org-b"),
        }));
    });


    it("contexto divergente falha antes da RPC e não invalida cache", async () => {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue();
        const { result } = renderHook(
            () => useDecisionActions("user-a", "org-a"),
            { wrapper: createWrapper(client) },
        );

        await act(async () => {
            expect(await result.current.escalateIndicator({
                organizationId: "org-b",
                indicator: "activation_rate",
            })).toMatchObject({ status: "failed" });
        });

        expect(rpc).not.toHaveBeenCalled();
        expect(invalidate).not.toHaveBeenCalled();
    });
});