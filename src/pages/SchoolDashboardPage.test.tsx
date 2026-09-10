import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";

vi.mock("@/hooks/useDashboardContext", () => ({ useDashboardContext: vi.fn() }));
vi.mock("@/hooks/useSchoolMetrics", () => ({
    useSchoolMetrics: vi.fn(),
    SchoolAccessDeniedError: class SchoolAccessDeniedError extends Error { },
}));
vi.mock("@/components/dashboard/RoleAwareAppShell", () => ({
    default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

import { useDashboardContext, type UseDashboardContextResult } from "@/hooks/useDashboardContext";
import { useSchoolMetrics, type SchoolMetrics, type UseSchoolMetricsResult } from "@/hooks/useSchoolMetrics";
import SchoolDashboardPage from "./SchoolDashboardPage";

const SCHOOL_A = "10000000-0000-4000-8000-000000000001";
const SCHOOL_B = "10000000-0000-4000-8000-000000000002";
const SCHOOL_FOREIGN = "10000000-0000-4000-8000-000000000099";
const ORG_A = "20000000-0000-4000-8000-000000000001";
const ORG_B = "20000000-0000-4000-8000-000000000002";
const ORG_FOREIGN = "20000000-0000-4000-8000-000000000099";
const emptyGroup = { suppressed: false as const, value: 0, count: 0, isEmpty: true };
const setActiveOrganization = vi.fn<(organizationId: string) => void>();
const mockContext = vi.mocked(useDashboardContext);
const mockMetrics = vi.mocked(useSchoolMetrics);

function metrics(schoolId: string, organizationId: string): SchoolMetrics {
    return {
        school_id: schoolId, organization_id: organizationId, period: "30d", days: 30,
        minimum_group_size: 5, eligible_universe: emptyGroup, generated_at: "2026-09-02T12:00:00Z",
        analytics_suppressed: false,
        totals: { sessions: emptyGroup, exercises: emptyGroup, ai: emptyGroup, active_7d: emptyGroup },
        classes: [], series: [],
    };
}

function ready(schoolId: string, organizationId: string): UseSchoolMetricsResult {
    return {
        metrics: metrics(schoolId, organizationId), isLoading: false, isError: false,
        isDenied: false, error: null, refetch: vi.fn()
    };
}

const denied: UseSchoolMetricsResult = {
    metrics: null, isLoading: false, isError: true, isDenied: true,
    error: new Error("denied"), refetch: vi.fn(),
};

function dashboardContext(): UseDashboardContextResult {
    return {
        role: "org_admin", roles: ["org_admin"], roleHomePath: "/org", userId: "user-a",
        organizations: [
            { id: ORG_A, name: "Rede A", slug: "a" },
            { id: ORG_B, name: "Rede B", slug: "b" },
        ],
        activeOrganization: null, setActiveOrganization,
        memberships: [], hasDemoOrganization: false, fetchedAt: "2026-09-02T12:00:00Z",
        isLoading: false, isError: false, error: null, refetch: vi.fn(), selectionRequired: false,
    };
}

function Controls() {
    const navigate = useNavigate();
    return <nav>
        <button onClick={() => navigate(`/escola/${SCHOOL_B}`)}>ir B</button>
        <button onClick={() => navigate("/escola/id-invalido")}>ir inválida</button>
        <button onClick={() => navigate(-1)}>voltar</button>
    </nav>;
}

function renderPage(entries: string[], initialIndex = 0) {
    return render(
        <MemoryRouter initialEntries={entries} initialIndex={initialIndex}>
            <Routes>
                <Route path="/escola/:schoolId" element={<><SchoolDashboardPage /><Controls /></>} />
            </Routes>
        </MemoryRouter>,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    mockContext.mockReturnValue(dashboardContext());
    mockMetrics.mockImplementation((_userId, schoolId) => {
        if (!schoolId) {
            return {
                metrics: null, isLoading: false, isError: false, isDenied: false,
                error: null, refetch: vi.fn()
            };
        }
        if (schoolId === SCHOOL_FOREIGN) return denied;
        return ready(schoolId, schoolId === SCHOOL_B ? ORG_B : ORG_A);
    });
});

describe("TRUST-1.3 — URL de escola sincroniza contexto canônico", () => {
    it("deep-link/reload seleciona somente a organização devolvida pelo servidor", async () => {
        renderPage([`/escola/${SCHOOL_A}`]);
        await waitFor(() => expect(setActiveOrganization).toHaveBeenCalledWith(ORG_A));
        expect(mockMetrics).toHaveBeenCalledWith("user-a", SCHOOL_A, "30d");
    });

    it("mudança manual de URL troca A→B e id inválido falha fechado", async () => {
        renderPage([`/escola/${SCHOOL_A}`]);
        await waitFor(() => expect(setActiveOrganization).toHaveBeenCalledWith(ORG_A));
        fireEvent.click(screen.getByRole("button", { name: "ir B" }));
        await waitFor(() => expect(setActiveOrganization).toHaveBeenCalledWith(ORG_B));

        const callsBeforeInvalid = setActiveOrganization.mock.calls.length;
        fireEvent.click(screen.getByRole("button", { name: "ir inválida" }));
        await waitFor(() => expect(mockMetrics).toHaveBeenLastCalledWith("user-a", null, "30d"));
        expect(setActiveOrganization).toHaveBeenCalledTimes(callsBeforeInvalid);
        expect(screen.getByText("Escola fora do seu escopo")).toBeInTheDocument();
    });

    it("back/forward do router recalcula o tenant a partir do schoolId", async () => {
        renderPage([`/escola/${SCHOOL_A}`, `/escola/${SCHOOL_B}`], 1);
        await waitFor(() => expect(setActiveOrganization).toHaveBeenCalledWith(ORG_B));
        fireEvent.click(screen.getByRole("button", { name: "voltar" }));
        await waitFor(() => expect(setActiveOrganization).toHaveBeenLastCalledWith(ORG_A));
    });

    it("rota cross-tenant negada pelo servidor nunca altera o Provider", async () => {
        renderPage([`/escola/${SCHOOL_FOREIGN}`]);
        expect(await screen.findByText("Escola fora do seu escopo")).toBeInTheDocument();
        expect(setActiveOrganization).not.toHaveBeenCalled();
    });

    it("payload de organização ausente do contexto autorizado falha fechado", async () => {
        mockMetrics.mockReturnValue(ready(SCHOOL_A, ORG_FOREIGN));
        renderPage([`/escola/${SCHOOL_A}`]);
        expect(await screen.findByText("Escola fora do contexto autorizado")).toBeInTheDocument();
        expect(setActiveOrganization).not.toHaveBeenCalled();
    });
});