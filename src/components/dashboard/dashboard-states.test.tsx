// UX-1 — Homologa o CONTRATO DE ESTADOS (§4): loading, empty, denied, demo e
// erro recuperável. O gate proíbe `null` silencioso; estes testes falham se
// alguém reintroduzir esse padrão nos componentes canônicos.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardSkeleton from "./DashboardSkeleton";
import DashboardEmptyState from "./DashboardEmptyState";
import DashboardErrorState from "./DashboardErrorState";
import PrivacyIndicator from "./PrivacyIndicator";
import { formatFreshness } from "@/lib/dashboard-format";
import MetricCard from "./MetricCard";
import DecisionQueue from "./DecisionQueue";
import ChartFrame from "./ChartFrame";

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("DashboardSkeleton (loading)", () => {
    it("anuncia carregamento a tecnologia assistiva", () => {
        render(<DashboardSkeleton variant="metrics" label="Carregando indicadores" />);
        const status = screen.getByRole("status");
        expect(status).toHaveAttribute("aria-busy", "true");
        expect(screen.getByText(/Carregando indicadores/)).toBeInTheDocument();
    });

    it("renderiza conteúdo visível em todas as variantes (nunca vazio)", () => {
        for (const variant of ["metrics", "list", "chart", "page"] as const) {
            const { unmount } = render(<DashboardSkeleton variant={variant} />);
            expect(screen.getByTestId("dashboard-skeleton")).toBeInTheDocument();
            unmount();
        }
    });
});

describe("DashboardEmptyState (empty / denied / demo)", () => {
    it("explica o vazio em vez de sumir", () => {
        render(
            <MemoryRouter>
                <DashboardEmptyState
                    title="Sem convites pendentes"
                    description="Todos os convites enviados já foram aceitos."
                    hint="Novos convites aparecem aqui em tempo real."
                />
            </MemoryRouter>,
        );
        expect(screen.getByRole("status")).toBeInTheDocument();
        expect(screen.getByText("Sem convites pendentes")).toBeInTheDocument();
        expect(screen.getByText(/Novos convites aparecem aqui/)).toBeInTheDocument();
        expect(screen.getByText(/Sem dados ainda/i)).toBeInTheDocument();
    });

    it("permissão negada é anunciada como alerta", () => {
        render(
            <MemoryRouter>
                <DashboardEmptyState
                    variant="denied"
                    title="Acesso restrito"
                    description="Este painel é da coordenação da escola."
                />
            </MemoryRouter>,
        );
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByTestId("dashboard-empty-denied")).toBeInTheDocument();
    });

    it("dados demonstrativos são rotulados explicitamente", () => {
        render(
            <MemoryRouter>
                <DashboardEmptyState
                    variant="demo"
                    title="Rede de demonstração"
                    description="Os números abaixo são fictícios."
                />
            </MemoryRouter>,
        );
        expect(screen.getByText(/Dados de demonstração/i)).toBeInTheDocument();
    });

    it("ação com rota vira link navegável com alvo confortável", () => {
        render(
            <MemoryRouter>
                <DashboardEmptyState
                    title="Nenhuma escola"
                    description="Cadastre a primeira escola da rede."
                    action={{ label: "Adicionar escola", to: "/org" }}
                />
            </MemoryRouter>,
        );
        const link = screen.getByRole("link", { name: "Adicionar escola" });
        expect(link).toHaveAttribute("href", "/org");
        expect(link.className).toContain("min-h-11");
    });
});

describe("DashboardErrorState (erro recuperável)", () => {
    it("é anunciado como alerta e permite tentar novamente", async () => {
        const onRetry = vi.fn();
        render(<DashboardErrorState detail="RPC timeout" onRetry={onRetry} />);

        expect(screen.getByRole("alert")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/i }));
        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("não promete que nada falhou, mas esclarece que dados não foram alterados", () => {
        render(<DashboardErrorState />);
        expect(screen.getByText(/Nada foi perdido nem alterado/i)).toBeInTheDocument();
    });
});

describe("PrivacyIndicator (privacidade + freshness)", () => {
    it("informa escopo agregado e atualização", () => {
        render(<PrivacyIndicator updatedAt={new Date().toISOString()} period="últimos 30 dias" />);
        expect(screen.getByText(/sem identificação individual/i)).toBeInTheDocument();
        expect(screen.getByText(/últimos 30 dias/)).toBeInTheDocument();
    });

    it("declara limiar mínimo quando informado", () => {
        render(<PrivacyIndicator scope="threshold" minimumGroupSize={5} updatedAt={null} />);
        expect(screen.getByText(/limiar mínimo de 5 pessoas/i)).toBeInTheDocument();
    });

    it("nunca inventa freshness quando não há timestamp", () => {
        expect(formatFreshness(null)).toBe("atualização não informada");
        expect(formatFreshness("data-invalida")).toBe("atualização não informada");
    });

    it("formata a idade do dado em linguagem natural", () => {
        const now = new Date("2026-07-26T12:00:00.000Z");
        expect(formatFreshness("2026-07-26T11:59:30.000Z", now)).toBe("atualizado agora");
        expect(formatFreshness("2026-07-26T11:30:00.000Z", now)).toBe("atualizado há 30 min");
        expect(formatFreshness("2026-07-26T09:00:00.000Z", now)).toBe("atualizado há 3 h");
        expect(formatFreshness("2026-07-25T12:00:00.000Z", now)).toBe("atualizado ontem");
        expect(formatFreshness("2026-07-20T12:00:00.000Z", now)).toBe("atualizado há 6 dias");
    });
});

describe("MetricCard (contrato de métrica §5)", () => {
    const baseProps = {
        metricKey: "activation_rate",
        label: "Taxa de ativação",
        value: "82%",
        period: "últimos 30 dias",
        formula: "membros ativos ÷ (membros + convites pendentes)",
        source: "institutional_memberships + institutional_invitations",
        limitation: "Não indica aprendizagem nem impacto emocional.",
        updatedAt: new Date().toISOString(),
    };

    it("expõe a chave do registro de métricas para rastreabilidade", () => {
        render(
            <MemoryRouter>
                <MetricCard {...baseProps} />
            </MemoryRouter>,
        );
        expect(screen.getByTestId("metric-card")).toHaveAttribute("data-metric-key", "activation_rate");
    });

    it("mostra período e oferece explicação de cálculo acessível por teclado", () => {
        render(
            <MemoryRouter>
                <MetricCard {...baseProps} />
            </MemoryRouter>,
        );
        expect(screen.getByText("últimos 30 dias")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Como calculamos Taxa de ativação/i }),
        ).toBeInTheDocument();
    });

    it("declara período não informado em vez de omitir silenciosamente", () => {
        render(
            <MemoryRouter>
                <MetricCard label="Sessões" value={12} />
            </MemoryRouter>,
        );
        expect(screen.getByText(/período não informado/i)).toBeInTheDocument();
    });

    it("variação não depende apenas de cor (tem texto para leitor de tela)", () => {
        render(
            <MemoryRouter>
                <MetricCard {...baseProps} delta="+12%" deltaDirection="up" />
            </MemoryRouter>,
        );
        expect(screen.getByText("(em alta)")).toBeInTheDocument();
    });

    it("respeita polaridade invertida: subir custo/erro não é positivo", () => {
        render(
            <MemoryRouter>
                <MetricCard
                    label="Erros 24h"
                    value={9}
                    delta="+4"
                    deltaDirection="up"
                    polarity="negative"
                />
            </MemoryRouter>,
        );
        const delta = screen.getByText("+4");
        expect(delta.className).toContain("text-destructive");
    });
});

describe("DecisionQueue (contrato §3 item 3)", () => {
    const items = [
        {
            id: "low",
            title: "Revisar cronograma",
            reason: "Conclusão 8% abaixo do previsto.",
            priority: "low" as const,
        },
        {
            id: "high",
            title: "Convites parados",
            reason: "12 convites sem aceite há 14 dias.",
            priority: "high" as const,
            owner: "coordenação da escola",
            due: "esta semana",
            action: { label: "Ver convites", to: "/org" },
        },
    ];

    it("ordena por prioridade, independente da ordem recebida", () => {
        render(
            <MemoryRouter>
                <DecisionQueue items={items} />
            </MemoryRouter>,
        );
        const titles = screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent);
        expect(titles[0]).toBe("Convites parados");
    });

    it("mostra motivo, responsável (papel) e prazo", () => {
        render(
            <MemoryRouter>
                <DecisionQueue items={items} />
            </MemoryRouter>,
        );
        expect(screen.getByText(/12 convites sem aceite/)).toBeInTheDocument();
        expect(screen.getByText(/Responsável: coordenação da escola/)).toBeInTheDocument();
        expect(screen.getByText(/esta semana/)).toBeInTheDocument();
    });

    it("fila vazia explica que vazio é bom sinal (não é falta de dado)", () => {
        render(
            <MemoryRouter>
                <DecisionQueue items={[]} />
            </MemoryRouter>,
        );
        expect(screen.getByText("Nenhuma decisão pendente")).toBeInTheDocument();
        expect(screen.getByText(/Nada exige intervenção agora/)).toBeInTheDocument();
    });
});

describe("ChartFrame (contrato §9 — gráfico acessível)", () => {
    const props = {
        title: "Evolução semanal",
        description: "Sessões, exercícios e interações com IA por semana.",
        columns: [
            { key: "week", label: "Semana" },
            { key: "sessions", label: "Sessões", numeric: true },
        ],
        rows: [
            { week: "Sem 1", sessions: 12 },
            { week: "Sem 2", sessions: 18 },
        ],
    };

    it("dá nome acessível ao gráfico e descrição textual", () => {
        render(
            <ChartFrame {...props}>
                <div>grafico</div>
            </ChartFrame>,
        );
        expect(screen.getByRole("img", { name: /Evolução semanal/ })).toBeInTheDocument();
        expect(screen.getByText(/Sessões, exercícios e interações/)).toBeInTheDocument();
    });

    it("oferece tabela alternativa com os mesmos dados", () => {
        render(
            <ChartFrame {...props}>
                <div>grafico</div>
            </ChartFrame>,
        );
        const toggle = screen.getByRole("button", { name: /Ver dados em tabela/i });
        expect(toggle).toHaveAttribute("aria-pressed", "false");
        fireEvent.click(toggle);

        expect(screen.getByRole("table")).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Semana" })).toBeInTheDocument();
        expect(screen.getByRole("cell", { name: "18" })).toBeInTheDocument();
    });

    it("tabela vazia informa ausência de dado no período", () => {
        render(
            <ChartFrame {...props} rows={[]}>
                <div>grafico</div>
            </ChartFrame>,
        );
        fireEvent.click(screen.getByRole("button", { name: /Ver dados em tabela/i }));
        expect(screen.getByText("Nenhum dado no período.")).toBeInTheDocument();
    });
});
