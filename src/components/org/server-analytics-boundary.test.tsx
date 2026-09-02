import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/hooks/useOrgAnalytics", () => ({
    useOrgAnalyticsSeries: vi.fn(),
    useOrgEngagementSummary: vi.fn(),
}));

import { useOrgAnalyticsSeries, useOrgEngagementSummary } from "@/hooks/useOrgAnalytics";
import EngagementChart from "./EngagementChart";
import EngagementMetrics from "./EngagementMetrics";
import NpsEvolution from "./NpsEvolution";

class ResizeObserverMock {
    observe() { /* jsdom has no layout */ }
    unobserve() { /* jsdom has no layout */ }
    disconnect() { /* jsdom has no layout */ }
}
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

const seriesMock = vi.mocked(useOrgAnalyticsSeries);
const summaryMock = vi.mocked(useOrgEngagementSummary);
const disclosed = (value: number, count = 5) => ({ suppressed: false as const, value, count, isEmpty: false });
const empty = { suppressed: false as const, value: 0, count: 0, isEmpty: true };
const hidden = { suppressed: true as const, reason: "below_threshold" as const, minimumGroupSize: 5 };

function queryResult<T>(data: T | undefined, state: "ready" | "loading" | "error" = "ready") {
    return {
        data,
        isLoading: state === "loading",
        isError: state === "error",
        error: state === "error" ? new Error("falha sintética") : null,
        refetch: vi.fn(),
    } as never;
}

function series(overrides: Record<string, unknown> = {}) {
    return {
        organization_id: "org-a", generated_at: "2026-09-01T12:00:00Z",
        period_weeks: 8, minimum_group_size: 5,
        nps: [{ bucket_start: "2026-09-01", group: empty }],
        engagement: [{ bucket_start: "2026-09-01", sessions: empty, exercises: empty, ai_interactions: empty }],
        ...overrides,
    };
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("TRUST-1.2.1 — estados da série institucional", () => {
    it("loading é explícito", () => {
        seriesMock.mockReturnValue(queryResult(undefined, "loading"));
        render(<EngagementChart organizationId="org-a" />);
        expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    });

    it("erro é recuperável e não vira vazio", () => {
        seriesMock.mockReturnValue(queryResult(undefined, "error"));
        render(<NpsEvolution organizationId="org-a" />);
        expect(screen.getByRole("alert")).toHaveTextContent(/Não foi possível carregar/);
        expect(screen.getByRole("button", { name: /Tentar novamente/i })).toBeInTheDocument();
    });

    it("zero legítimo produz estado vazio, não supressão", () => {
        seriesMock.mockReturnValue(queryResult(series()));
        render(<NpsEvolution organizationId="org-a" />);
        expect(screen.getByText("Sem dados de NPS")).toBeInTheDocument();
        expect(screen.queryByText(/Amostra insuficiente/)).not.toBeInTheDocument();
    });

    it("suprimido não aparece em DOM, tooltip, ARIA nem tabela acessível", () => {
        const compromised = { ...hidden, value: 98765, count: 2 } as never;
        seriesMock.mockReturnValue(queryResult(series({
            engagement: [{ bucket_start: "2026-09-01", sessions: compromised, exercises: hidden, ai_interactions: hidden }],
        })));
        const { container } = render(<EngagementChart organizationId="org-a" />);
        expect(screen.getByText(/Alguns pontos mostram/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Ver dados em tabela/i }));
        expect(screen.getAllByText("Amostra insuficiente").length).toBeGreaterThanOrEqual(3);
        expect(container.innerHTML).not.toContain("98765");
        expect(container.querySelector("[title*='98765'], [aria-label*='98765'], [data-value*='98765']")).toBeNull();
    });

    it("valor divulgado aparece no gráfico e na tabela", () => {
        seriesMock.mockReturnValue(queryResult(series({
            engagement: [{ bucket_start: "2026-09-01", sessions: disclosed(12), exercises: disclosed(7), ai_interactions: disclosed(6) }],
        })));
        render(<EngagementChart organizationId="org-a" />);
        fireEvent.click(screen.getByRole("button", { name: /Ver dados em tabela/i }));
        expect(screen.getByRole("cell", { name: "12" })).toBeInTheDocument();
        expect(screen.getByRole("cell", { name: "7" })).toBeInTheDocument();
    });
});

describe("TRUST-1.2.1 — resumo por métrica", () => {
    const base = {
        organization_id: "org-a", generated_at: "2026-09-01T12:00:00Z", period_days: 30,
        minimum_group_size: 5, analytics_suppressed: false, suppressed_metrics: [], eligible_universe: 5,
        total_sessions: 12, total_exercises: 7, total_ai_interactions: 6,
        active_users_7d: 5, active_users_30d: 5, nps_avg: 9,
        nps_count: 5, nps_promoters: 5, nps_detractors: 0,
    };

    it("disclosed renderiza números autorizados", () => {
        summaryMock.mockReturnValue(queryResult(base));
        render(<EngagementMetrics organizationId="org-a" />);
        expect(screen.getByLabelText("Sessões: 12")).toBeInTheDocument();
        expect(screen.getByText("+100")).toBeInTheDocument();
    });

    it("supressão parcial não fabrica zero nem esconde métricas permitidas", () => {
        summaryMock.mockReturnValue(queryResult({
            ...base,
            analytics_suppressed: true,
            suppressed_metrics: ["total_sessions", "nps"],
            total_sessions: null,
            nps_avg: null, nps_count: null, nps_promoters: null, nps_detractors: null,
        }));
        const { container } = render(<EngagementMetrics organizationId="org-a" />);
        expect(screen.getByLabelText("Sessões: amostra insuficiente")).toBeInTheDocument();
        expect(screen.getByLabelText("Exercícios: 7")).toBeInTheDocument();
        expect(screen.getAllByText("Amostra insuficiente para exibição segura.")).toHaveLength(1);
        expect(container.querySelector("[aria-label='Sessões: 0']")).toBeNull();
    });
});
