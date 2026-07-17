import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Mock do client Supabase: só precisamos controlar a RPC de status.
vi.mock("@/integrations/supabase/client", () => ({
    supabase: { rpc: vi.fn() },
}));

import { supabase } from "@/integrations/supabase/client";
import RequireGuardianConsent from "./RequireGuardianConsent";

const mockRpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

const PRIVATE_CONTENT = "CONTEUDO PRIVADO PROTEGIDO";
const CONSENT_PAGE = "PAGINA DE CONSENTIMENTO";
const ERROR_TITLE = "Não conseguimos verificar sua autorização";

function renderGuard() {
    return render(
        <MemoryRouter initialEntries={["/dashboard"]}>
            <Routes>
                <Route
                    path="/dashboard"
                    element={
                        <RequireGuardianConsent>
                            <div>{PRIVATE_CONTENT}</div>
                        </RequireGuardianConsent>
                    }
                />
                <Route path="/consentimento-responsavel" element={<div>{CONSENT_PAGE}</div>} />
                <Route path="/" element={<div>LANDING</div>} />
            </Routes>
        </MemoryRouter>,
    );
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("RequireGuardianConsent (fail-closed)", () => {
    it("NÃO renderiza conteúdo privado quando a RPC retorna erro", async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });
        renderGuard();

        expect(await screen.findByText(ERROR_TITLE)).toBeInTheDocument();
        expect(screen.queryByText(PRIVATE_CONTENT)).not.toBeInTheDocument();
    });

    it("NÃO renderiza conteúdo privado quando a promessa é rejeitada (rede/sessão)", async () => {
        mockRpc.mockRejectedValue(new Error("network down"));
        renderGuard();

        expect(await screen.findByText(ERROR_TITLE)).toBeInTheDocument();
        expect(screen.queryByText(PRIVATE_CONTENT)).not.toBeInTheDocument();
    });

    it("cai em fail-closed quando a data de nascimento é indeterminada", async () => {
        mockRpc.mockResolvedValue({
            data: { requires_consent: false, reason: "unknown_birth_date", granted: false },
            error: null,
        });
        renderGuard();

        expect(await screen.findByText(ERROR_TITLE)).toBeInTheDocument();
        expect(screen.queryByText(PRIVATE_CONTENT)).not.toBeInTheDocument();
    });

    it("redireciona menor sem consentimento para a página de consentimento", async () => {
        mockRpc.mockResolvedValue({
            data: { requires_consent: true, reason: "minor_pending", granted: false },
            error: null,
        });
        renderGuard();

        expect(await screen.findByText(CONSENT_PAGE)).toBeInTheDocument();
        expect(screen.queryByText(PRIVATE_CONTENT)).not.toBeInTheDocument();
    });

    it("libera conteúdo privado para adulto com data de nascimento conhecida", async () => {
        mockRpc.mockResolvedValue({
            data: { requires_consent: false, reason: "adult", granted: false },
            error: null,
        });
        renderGuard();

        expect(await screen.findByText(PRIVATE_CONTENT)).toBeInTheDocument();
        expect(screen.queryByText(ERROR_TITLE)).not.toBeInTheDocument();
    });

    it("libera conteúdo privado para menor com consentimento válido na política vigente", async () => {
        mockRpc.mockResolvedValue({
            data: {
                requires_consent: true,
                reason: "minor_consented",
                granted: true,
                policy_version: "2026.2",
            },
            error: null,
        });
        renderGuard();

        expect(await screen.findByText(PRIVATE_CONTENT)).toBeInTheDocument();
    });

    it("oferece ação acessível de recuperação (tentar novamente + voltar) no estado bloqueado", async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });
        renderGuard();

        expect(await screen.findByText(ERROR_TITLE)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /voltar ao início/i })).toBeInTheDocument();
    });
});
