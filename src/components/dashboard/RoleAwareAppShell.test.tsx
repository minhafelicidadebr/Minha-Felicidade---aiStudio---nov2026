// UX-1 — Homologa o App Shell adaptativo:
//  • navegação muda por papel (o Navbar atual era igual para todos);
//  • nenhum papel vê a navegação de outro tenant/persona;
//  • bottom nav mobile existe e não deixa ação essencial órfã;
//  • skip link e landmarks presentes;
//  • loading e erro têm estado explícito (nunca `null`).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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
import RoleHomeRedirect from "@/pages/RoleHomeRedirect";

const mockGetSession = supabase.auth.getSession as unknown as ReturnType<typeof vi.fn>;
const mockRpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;
const mockFrom = supabase.from as unknown as ReturnType<typeof vi.fn>;

/** Query builder encadeável e "thenable", como o do supabase-js. */
function tableResult(data: unknown[]) {
    const result = { data, error: null };
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "limit"]) {
        builder[method] = () => builder;
    }
    builder.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
    return builder;
}

interface ContextFixture {
    appRoles?: string[];
    membershipRoles?: string[];
    organizations?: { id: string; name: string; slug: string | null; metadata?: unknown }[];
    profileError?: { message: string };
}

function arrangeContext({
    appRoles = ["student"],
    membershipRoles = [],
    organizations = [],
    profileError,
}: ContextFixture = {}) {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    mockRpc.mockResolvedValue(
        profileError ? { data: null, error: profileError } : { data: { roles: appRoles }, error: null },
    );
    mockFrom.mockImplementation((table: string) => {
        if (table === "institutional_memberships") {
            return tableResult(
                membershipRoles.map((role, index) => ({
                    organization_id: `org-${index + 1}`,
                    role,
                    school_id: null,
                })),
            );
        }
        if (table === "organizations") return tableResult(organizations);
        return tableResult([]);
    });
}

function renderShell(children: React.ReactNode = <p>conteudo do painel</p>) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/org"]}>
                <RoleAwareAppShell title="Visão da rede">{children}</RoleAwareAppShell>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

function renderRoleHome() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/inicio"]}>
                <Routes>
                    <Route path="/inicio" element={<RoleHomeRedirect />} />
                    <Route path="/alunos" element={<p>HOME ESTUDANTE</p>} />
                    <Route path="/dashboard" element={<RoleHomeRedirect />} />
                    <Route path="/org" element={<p>HOME REDE</p>} />
                    <Route path="/admin" element={<p>HOME ADMIN</p>} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("RoleHomeRedirect — redirecionamento canônico por papel", () => {
    it("estudante vai para a jornada de aprendizagem", async () => {
        arrangeContext({ appRoles: ["student"] });
        renderRoleHome();
        expect(await screen.findByText("HOME ESTUDANTE")).toBeInTheDocument();
    });

    it("gestor (manager) vai para a visão da rede", async () => {
        arrangeContext({ appRoles: ["manager"] });
        renderRoleHome();
        expect(await screen.findByText("HOME REDE")).toBeInTheDocument();
    });

    it("membership institucional tem precedência sobre papel de aplicação", async () => {
        arrangeContext({ appRoles: ["student"], membershipRoles: ["platform_admin"] });
        renderRoleHome();
        expect(await screen.findByText("HOME ADMIN")).toBeInTheDocument();
    });

    it("falha na leitura do papel mostra erro recuperável, não painel adivinhado", async () => {
        arrangeContext({ profileError: { message: "rpc indisponivel" } });
        renderRoleHome();

        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/Não conseguimos identificar seu painel/i)).toBeInTheDocument();
        expect(screen.queryByText("HOME ESTUDANTE")).not.toBeInTheDocument();
    });
});

describe("RoleAwareAppShell — estrutura e acessibilidade", () => {
    it("mostra skeleton enquanto o papel não é conhecido (não renderiza menu errado)", async () => {
        arrangeContext();
        renderShell();

        expect(screen.getByTestId("dashboard-skeleton")).toBeInTheDocument();
        expect(screen.queryByTestId("role-navigation")).not.toBeInTheDocument();

        await waitFor(() => expect(screen.getByTestId("role-navigation")).toBeInTheDocument());
    });

    it("entrega skip link, landmarks e conteúdo focável", async () => {
        arrangeContext();
        renderShell();

        expect(await screen.findByRole("link", { name: /Pular para o conteúdo/i })).toHaveAttribute(
            "href",
            "#dashboard-content",
        );
        const main = screen.getByRole("main");
        expect(main).toHaveAttribute("id", "dashboard-content");
        expect(main).toHaveAttribute("tabindex", "-1");
        expect(screen.getByText("conteudo do painel")).toBeInTheDocument();
    });

    it("erro de contexto vira estado explícito com retry", async () => {
        arrangeContext({ profileError: { message: "falha de perfil" } });
        renderShell();

        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Tentar novamente/i })).toBeInTheDocument();
        expect(screen.queryByTestId("role-navigation")).not.toBeInTheDocument();
    });
});

describe("RoleAwareAppShell — navegação varia por papel", () => {
    it("estudante não recebe navegação institucional", async () => {
        arrangeContext({ appRoles: ["student"] });
        renderShell();

        await screen.findByTestId("role-navigation");
        const nav = screen.getByTestId("role-navigation");

        expect(nav).toHaveTextContent("Minha jornada");
        expect(nav).not.toHaveTextContent("Visão da rede");
        expect(nav).not.toHaveTextContent("Indicadores agregados");
    });

    it("gestor recebe navegação da rede e não o painel do estudante como home", async () => {
        arrangeContext({ appRoles: ["manager"], membershipRoles: ["org_admin"] });
        renderShell();

        await screen.findByTestId("role-navigation");
        const nav = screen.getByTestId("role-navigation");

        expect(nav).toHaveTextContent("Visão da rede");
        expect(nav).not.toHaveTextContent("Minha jornada");
    });

    it("papel é rotulado no cabeçalho (a pessoa sabe em que contexto está)", async () => {
        arrangeContext({ appRoles: ["manager"] });
        renderShell();

        expect(await screen.findByTestId("dashboard-header")).toHaveTextContent("Gestão da rede");
        expect(screen.getByRole("heading", { level: 1, name: "Visão da rede" })).toBeInTheDocument();
    });

    it("não renderiza link para rota inexistente (arquitetura-alvo não vira 404)", async () => {
        arrangeContext({ appRoles: ["manager"], membershipRoles: ["org_admin"] });
        renderShell();

        await screen.findByTestId("role-navigation");
        for (const link of screen.getAllByRole("link")) {
            const href = link.getAttribute("href") ?? "";
            expect(href).not.toContain(":schoolId");
            expect(href).not.toBe("/professores");
            expect(href).not.toBe("/admin/operacao");
        }
    });
});

describe("RoleAwareAppShell — mobile", () => {
    it("bottom nav existe e todo destino também está na navegação completa", async () => {
        arrangeContext({ appRoles: ["student"] });
        renderShell();

        const bottomNav = await screen.findByTestId("mobile-role-navigation");
        const fullNav = screen.getByTestId("role-navigation");

        const bottomHrefs = Array.from(bottomNav.querySelectorAll("a")).map((a) => a.getAttribute("href"));
        const fullHrefs = Array.from(fullNav.querySelectorAll("a")).map((a) => a.getAttribute("href"));

        expect(bottomHrefs.length).toBeGreaterThan(0);
        for (const href of bottomHrefs) {
            expect(fullHrefs).toContain(href);
        }
    });

    it("alvos da bottom nav têm altura confortável de toque", async () => {
        arrangeContext({ appRoles: ["student"] });
        renderShell();

        const bottomNav = await screen.findByTestId("mobile-role-navigation");
        for (const anchor of Array.from(bottomNav.querySelectorAll("a"))) {
            expect(anchor.className).toContain("min-h-[56px]");
        }
    });
});

describe("RoleAwareAppShell — contexto organizacional", () => {
    it("com uma organização, mostra o contexto sem controle morto", async () => {
        arrangeContext({
            appRoles: ["manager"],
            membershipRoles: ["org_admin"],
            organizations: [{ id: "org-1", name: "Rede Alfa", slug: "alfa" }],
        });
        renderShell();

        expect(await screen.findByTestId("context-switcher-single")).toHaveTextContent("Rede Alfa");
        expect(screen.queryByTestId("context-switcher")).not.toBeInTheDocument();
    });

    it("com múltiplas organizações, oferece troca de contexto acessível", async () => {
        arrangeContext({
            appRoles: ["manager"],
            membershipRoles: ["org_admin"],
            organizations: [
                { id: "org-1", name: "Rede Alfa", slug: "alfa" },
                { id: "org-2", name: "Rede Beta", slug: "beta" },
            ],
        });
        renderShell();

        // Um único controle: duplicar criaria dois tab stops para a mesma ação.
        const switcher = await screen.findByTestId("context-switcher");
        expect(switcher).toHaveAccessibleName(/Trocar organização/i);
        expect(switcher).toHaveTextContent("Rede Alfa");
    });
});
