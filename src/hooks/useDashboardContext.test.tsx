import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        auth: { getSession: vi.fn(), onAuthStateChange: vi.fn() },
        rpc: vi.fn(),
        from: vi.fn(),
    },
}));

import { supabase } from "@/integrations/supabase/client";
import {
    DashboardContextProvider,
    __dashboardContextTesting,
} from "@/contexts/DashboardContext";
import { useDashboardContext } from "./useDashboardContext";

const mockGetSession = vi.mocked(supabase.auth.getSession);
const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange);
const mockRpc = vi.mocked(supabase.rpc);
const mockFrom = vi.mocked(supabase.from);

function tableResult(data: unknown[], error: { message: string } | null = null) {
    const result = { data, error };
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "limit", "is", "in"]) builder[method] = () => builder;
    builder.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
    return builder;
}

const ORG_A = { id: "org-a", name: "Rede A", slug: "a", metadata: {} };
const ORG_B = { id: "org-b", name: "Rede B", slug: "b", metadata: {} };

function arrangeTwoOrgs() {
    const session = { user: { id: "user-1" } };
    mockGetSession.mockResolvedValue({ data: { session }, error: null } as never);
    mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
    } as never);
    mockRpc.mockResolvedValue({ data: { roles: ["manager"] }, error: null } as never);
    mockFrom.mockImplementation(((table: string) => {
        if (table === "institutional_memberships") {
            return tableResult([
                { organization_id: ORG_A.id, role: "org_admin", school_id: null },
                { organization_id: ORG_B.id, role: "org_admin", school_id: null },
            ]);
        }
        if (table === "organizations") return tableResult([ORG_A, ORG_B]);
        return tableResult([]);
    }) as never);
}

function createWrapper(queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
})) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                <DashboardContextProvider>
                    <MemoryRouter>{children}</MemoryRouter>
                </DashboardContextProvider>
            </QueryClientProvider>
        );
    };
}

beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("TRUST-1.3 — canonical context", () => {
    it("duas consumidoras permanecem atomicamente no mesmo tenant após A → B", async () => {
        arrangeTwoOrgs();
        const { result } = renderHook(() => ({
            shell: useDashboardContext(),
            page: useDashboardContext(),
        }), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.shell.activeOrganization?.id).toBe(ORG_A.id));
        expect(result.current.page.activeOrganization?.id).toBe(ORG_A.id);

        act(() => result.current.shell.setActiveOrganization(ORG_B.id));

        await waitFor(() => expect(result.current.shell.activeOrganization?.id).toBe(ORG_B.id));
        expect(result.current.page.activeOrganization?.id).toBe(ORG_B.id);
    });

    it("A → B → A → C termina em C para todas as consumidoras", async () => {
        const ORG_C = { id: "org-c", name: "Rede C", slug: "c", metadata: {} };
        arrangeTwoOrgs();
        mockFrom.mockImplementation(((table: string) => {
            if (table === "institutional_memberships") {
                return tableResult([ORG_A, ORG_B, ORG_C].map((organization) => ({
                    organization_id: organization.id,
                    role: "org_admin",
                    school_id: null,
                })));
            }
            if (table === "organizations") return tableResult([ORG_A, ORG_B, ORG_C]);
            return tableResult([]);
        }) as never);

        const { result } = renderHook(() => ({
            first: useDashboardContext(),
            second: useDashboardContext(),
        }), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.first.activeOrganization?.id).toBe(ORG_A.id));

        act(() => {
            result.current.first.setActiveOrganization(ORG_B.id);
            result.current.first.setActiveOrganization(ORG_A.id);
            result.current.first.setActiveOrganization(ORG_C.id);
        });

        await waitFor(() => expect(result.current.first.activeOrganization?.id).toBe(ORG_C.id));
        expect(result.current.second.activeOrganization?.id).toBe(ORG_C.id);
    });

    it("restaura somente a seleção sessionStorage da identidade atual", async () => {
        arrangeTwoOrgs();
        sessionStorage.setItem(__dashboardContextTesting.storageKey("user-1"), ORG_B.id);
        sessionStorage.setItem(__dashboardContextTesting.storageKey("other-user"), ORG_A.id);

        const { result } = renderHook(() => useDashboardContext(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.activeOrganization?.id).toBe(ORG_B.id));
    });

    it("id persistido sem membership falha fechado e exige escolha explícita", async () => {
        arrangeTwoOrgs();
        const key = __dashboardContextTesting.storageKey("user-1");
        sessionStorage.setItem(key, "org-revogada");

        const { result } = renderHook(() => useDashboardContext(), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.activeOrganization).toBeNull();
        expect(result.current.selectionRequired).toBe(true);
        expect(sessionStorage.getItem(key)).toBeNull();
    });

    it("erro ao listar memberships não é convertido em contexto vazio", async () => {
        arrangeTwoOrgs();
        mockFrom.mockImplementation(((table: string) => {
            if (table === "institutional_memberships") {
                return tableResult([], { message: "membership query failed" });
            }
            if (table === "organizations") return tableResult([ORG_A]);
            return tableResult([]);
        }) as never);

        const { result } = renderHook(() => useDashboardContext(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toContain("membership query failed");
        expect(result.current.activeOrganization).toBeNull();
    });
});