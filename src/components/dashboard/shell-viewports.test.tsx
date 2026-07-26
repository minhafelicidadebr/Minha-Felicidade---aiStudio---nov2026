// UX-1 — Homologação dos VIEWPORTS OBRIGATÓRIOS (UX-0 §"Viewports obrigatórios").
//
// Não é teste de pixel: é teste de CONTRATO de comportamento por breakpoint.
// O gate do master plan diz "nenhuma ação essencial pode desaparecer em mobile" —
// aqui isso é verificado de fato, simulando a largura real da janela e checando
// que a navegação continua alcançável em cada viewport.
//
// <768px  → sidebar vira drawer (fechado por padrão) + bottom nav sempre presente.
// ≥768px  → sidebar/rail persistente com a navegação completa.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        auth: { getSession: vi.fn() },
        rpc: vi.fn(),
        from: vi.fn(),
    },
}));

import { supabase } from "@/integrations/supabase/client";
import RoleAwareAppShell from "./RoleAwareAppShell";
import { getMobileNavItemsForRole } from "@/config/dashboard-navigation";

const mockGetSession = supabase.auth.getSession as unknown as ReturnType<typeof vi.fn>;
const mockRpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;
const mockFrom = supabase.from as unknown as ReturnType<typeof vi.fn>;

const MOBILE_VIEWPORTS = [
    { width: 320, height: 568, name: "320×568" },
    { width: 375, height: 667, name: "375×667" },
    { width: 390, height: 844, name: "390×844" },
] as const;

const WIDE_VIEWPORTS = [
    { width: 768, height: 1024, name: "768×1024" },
    { width: 1024, height: 768, name: "1024×768" },
    { width: 1280, height: 800, name: "1280×800" },
    { width: 1440, height: 900, name: "1440×900" },
] as const;

function thenable(data: unknown[]) {
    const result = { data, error: null };
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "limit"]) builder[method] = () => builder;
    builder.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
    return builder;
}

function setViewport(width: number, height: number) {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
    Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: height });
}

function arrange() {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    mockRpc.mockResolvedValue({ data: { roles: ["student"] }, error: null });
    mockFrom.mockImplementation(() => thenable([]));
}

function renderShell() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/dashboard"]}>
                <RoleAwareAppShell title="Minha jornada">
                    <p>conteudo</p>
                </RoleAwareAppShell>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    localStorage.clear();
    arrange();
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    setViewport(1024, 768);
});

describe.each(MOBILE_VIEWPORTS)("viewport $name (mobile)", ({ width, height }) => {
    it("mantém bottom nav com todos os destinos essenciais do papel", async () => {
        setViewport(width, height);
        renderShell();

        const bottomNav = await screen.findByTestId("mobile-role-navigation");
        const expected = getMobileNavItemsForRole("student");
        const anchors = Array.from(bottomNav.querySelectorAll("a"));

        expect(anchors).toHaveLength(expected.length);
        for (const item of expected) {
            expect(bottomNav).toHaveTextContent(item.shortLabel ?? item.label);
        }
    });

    it("navegação completa continua alcançável pelo drawer (não desaparece)", async () => {
        setViewport(width, height);
        renderShell();

        await screen.findByTestId("mobile-role-navigation");
        // Em mobile o primitivo de sidebar monta um drawer fechado: a navegação
        // completa não está no DOM até ser aberta.
        expect(screen.queryByTestId("role-navigation")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /sidebar/i }));

        await waitFor(() => expect(screen.getByTestId("role-navigation")).toBeInTheDocument());
        expect(screen.getByTestId("role-navigation")).toHaveTextContent("Minha jornada");
    });

    it("mantém um único landmark main e o alvo do skip link", async () => {
        setViewport(width, height);
        renderShell();

        await screen.findByTestId("mobile-role-navigation");
        const main = screen.getByRole("main");
        expect(main).toHaveAttribute("id", "dashboard-content");
        expect(screen.getByRole("link", { name: /Pular para o conteúdo/i })).toBeInTheDocument();
    });

    it("reserva espaço para a bottom nav não cobrir o conteúdo", async () => {
        setViewport(width, height);
        renderShell();

        await screen.findByTestId("mobile-role-navigation");
        const contentWrapper = screen.getByText("conteudo").parentElement;
        expect(contentWrapper?.className).toContain("pb-24");
    });
});

describe.each(WIDE_VIEWPORTS)("viewport $name (tablet/desktop)", ({ width, height }) => {
    it("apresenta a navegação completa persistente", async () => {
        setViewport(width, height);
        renderShell();

        const nav = await screen.findByTestId("role-navigation");
        expect(nav).toHaveTextContent("Minha jornada");
        expect(nav).toHaveAttribute("aria-label", "Navegação principal");
    });

    it("mantém um único landmark main", async () => {
        setViewport(width, height);
        renderShell();

        await screen.findByTestId("role-navigation");
        expect(screen.getAllByRole("main")).toHaveLength(1);
    });
});
