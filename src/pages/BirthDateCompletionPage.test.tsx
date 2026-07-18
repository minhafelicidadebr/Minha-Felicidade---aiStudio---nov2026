import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/integrations/supabase/client", () => ({
    supabase: { rpc: vi.fn() },
}));

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({ toast: toastMock }),
}));

import { supabase } from "@/integrations/supabase/client";
import BirthDateCompletionPage from "./BirthDateCompletionPage";

const mockRpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;
const REDIRECT_TARGET = "DESTINO PRIVADO";

function renderPage() {
    return render(
        <MemoryRouter initialEntries={["/completar-cadastro?redirect=%2Fdashboard"]}>
            <Routes>
                <Route path="/completar-cadastro" element={<BirthDateCompletionPage />} />
                <Route path="/dashboard" element={<div>{REDIRECT_TARGET}</div>} />
            </Routes>
        </MemoryRouter>,
    );
}

function setDate(value: string) {
    fireEvent.change(screen.getByLabelText(/data de nascimento/i), { target: { value } });
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("BirthDateCompletionPage", () => {
    it("não chama a RPC quando a data é inválida (idade implausível)", async () => {
        renderPage();
        // Aceita pelo input (passada, sem min), mas reprovada por isValidPastDate
        // (idade >= 120) — exercita a validação do cliente antes da RPC.
        setDate("1850-01-01");
        fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

        await waitFor(() => expect(toastMock).toHaveBeenCalled());
        expect(mockRpc).not.toHaveBeenCalled();
        expect(screen.queryByText(REDIRECT_TARGET)).not.toBeInTheDocument();
    });

    it("grava a data e navega ao redirect quando válida", async () => {
        mockRpc.mockResolvedValue({ data: { birth_date: "2000-05-10" }, error: null });
        renderPage();
        setDate("2000-05-10");
        fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

        expect(await screen.findByText(REDIRECT_TARGET)).toBeInTheDocument();
        expect(mockRpc).toHaveBeenCalledWith("set_my_birth_date", { _birth_date: "2000-05-10" });
    });

    it("permanece na página e avisa quando a RPC retorna erro", async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: "birth_date already set" } });
        renderPage();
        setDate("2000-05-10");
        fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

        await waitFor(() => expect(toastMock).toHaveBeenCalled());
        expect(screen.queryByText(REDIRECT_TARGET)).not.toBeInTheDocument();
    });
});
