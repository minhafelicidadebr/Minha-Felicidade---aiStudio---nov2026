import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        },
        rpc: vi.fn(),
    },
}));

import { supabase } from "@/integrations/supabase/client";
import RequireFeature from "./RequireFeature";

const mockGetSession = supabase.auth.getSession as unknown as ReturnType<typeof vi.fn>;
const mockRpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

const PREMIUM_CONTENT = "CONTEUDO PREMIUM";
const PAYWALL_TARGET = "TELA DE PLANOS";

function renderGuarded(feature: string) {
    return render(
        <MemoryRouter initialEntries={["/simulator"]}>
            <Routes>
                <Route
                    path="/simulator"
                    element={
                        <RequireFeature feature={feature}>
                            <div>{PREMIUM_CONTENT}</div>
                        </RequireFeature>
                    }
                />
                <Route path="/subscription" element={<div>{PAYWALL_TARGET}</div>} />
            </Routes>
        </MemoryRouter>,
    );
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("RequireFeature", () => {
    it("bloqueia (redireciona para /subscription) quando o plano resolvido no servidor não tem a feature", async () => {
        mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
        mockRpc.mockResolvedValue({
            data: { plan_slug: "free", features: ["module_1", "quiz_basic"], limits: {}, status: "active" },
            error: null,
        });

        renderGuarded("simulator");

        expect(await screen.findByText(PAYWALL_TARGET)).toBeInTheDocument();
        expect(screen.queryByText(PREMIUM_CONTENT)).not.toBeInTheDocument();
    });

    it("libera o conteúdo quando o plano resolvido no servidor tem a feature", async () => {
        mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
        mockRpc.mockResolvedValue({
            data: { plan_slug: "intermediate", features: ["modules", "simulator"], limits: {}, status: "active" },
            error: null,
        });

        renderGuarded("simulator");

        expect(await screen.findByText(PREMIUM_CONTENT)).toBeInTheDocument();
        expect(screen.queryByText(PAYWALL_TARGET)).not.toBeInTheDocument();
    });

    it("fail-closed: sem sessão (plano padrão gratuito) nunca libera feature premium", async () => {
        mockGetSession.mockResolvedValue({ data: { session: null } });

        renderGuarded("codesign");

        await waitFor(() => expect(screen.getByText(PAYWALL_TARGET)).toBeInTheDocument());
        expect(mockRpc).not.toHaveBeenCalled();
        expect(screen.queryByText(PREMIUM_CONTENT)).not.toBeInTheDocument();
    });
});
