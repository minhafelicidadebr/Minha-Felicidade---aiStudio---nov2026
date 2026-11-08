import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DecisionQueue, {
    type DecisionActionOutcome,
    type DecisionItem,
} from "./DecisionQueue";

function renderQueue(items: DecisionItem[], onResolved?: () => void) {
    return render(
        <MemoryRouter>
            <DecisionQueue items={items} onResolved={onResolved} />
        </MemoryRouter>,
    );
}

function item(overrides: Partial<DecisionItem> = {}): DecisionItem {
    return {
        id: "item-1",
        title: "Convite pendente",
        reason: "Pendente há 8 dias.",
        priority: "medium",
        ...overrides,
    };
}

/** Promessa controlável, para observar o estado "executando". */
function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => {
        resolve = r;
    });
    return { promise, resolve };
}

describe("DecisionQueue com ações que alteram dados", () => {
    it("mostra estado vazio explicando que vazio é boa notícia", () => {
        renderQueue([]);
        expect(screen.getByTestId("dashboard-empty-empty")).toBeInTheDocument();
    });

    it("não renderiza controle de ação quando o item não tem mutação", () => {
        renderQueue([item()]);
        expect(screen.queryByTestId("decision-mutation-button")).not.toBeInTheDocument();
    });

    it("executa a ação e mostra a confirmação do efeito", async () => {
        
        const onResolved = vi.fn();
        const run = vi.fn(
            async (): Promise<DecisionActionOutcome> => ({
                status: "succeeded",
                message: "Convite reenviado.",
            }),
        );

        renderQueue([item({ mutation: { label: "Reenviar convite", run } })], onResolved);
        fireEvent.click(screen.getByTestId("decision-mutation-button"));

        await waitFor(() => {
            expect(screen.getByTestId("decision-outcome-succeeded")).toHaveTextContent(
                "Convite reenviado.",
            );
        });
        expect(run).toHaveBeenCalledTimes(1);
        // Sucesso recarrega a fila do servidor.
        expect(onResolved).toHaveBeenCalledTimes(1);
    });

    it("bloqueia dupla submissão enquanto a ação está em execução", async () => {
        
        const gate = deferred<DecisionActionOutcome>();
        const run = vi.fn(() => gate.promise);

        renderQueue([item({ mutation: { label: "Reenviar convite", run } })]);
        const button = screen.getByTestId("decision-mutation-button");

        fireEvent.click(button);
        await waitFor(() => expect(button).toBeDisabled());
        // Segundo clique no controle desabilitado não dispara nova execução.
        fireEvent.click(button);

        gate.resolve({ status: "succeeded", message: "Convite reenviado." });
        await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    });

    it("desabilita as ações dos outros itens durante uma execução", async () => {
        
        const gate = deferred<DecisionActionOutcome>();
        const runA = vi.fn(() => gate.promise);
        const runB = vi.fn(async (): Promise<DecisionActionOutcome> => ({
            status: "succeeded",
            message: "ok",
        }));

        renderQueue([
            item({ id: "a", mutation: { label: "Ação A", run: runA } }),
            item({ id: "b", title: "Outro item", mutation: { label: "Ação B", run: runB } }),
        ]);

        fireEvent.click(screen.getByRole("button", { name: /Ação A/ }));
        await waitFor(() => {
            for (const button of screen.getAllByTestId("decision-mutation-button")) {
                expect(button).toBeDisabled();
            }
        });

        gate.resolve({ status: "succeeded", message: "ok" });
        await waitFor(() => expect(runB).not.toHaveBeenCalled());
    });

    it("distingue permissão negada de falha técnica", async () => {
        
        renderQueue([
            item({
                id: "denied",
                mutation: {
                    label: "Escalar",
                    run: async () => ({ status: "denied", message: "Sem permissão. Nada foi alterado." }),
                },
            }),
        ]);

        fireEvent.click(screen.getByTestId("decision-mutation-button"));
        await waitFor(() => {
            const alert = screen.getByTestId("decision-outcome-denied");
            expect(alert).toHaveAttribute("role", "alert");
            expect(alert).toHaveTextContent("Sem permissão");
        });
        expect(screen.queryByTestId("decision-outcome-failed")).not.toBeInTheDocument();
    });

    it("declara que nada foi alterado quando a ação falha, e mantém o item", async () => {
        
        renderQueue([
            item({
                mutation: {
                    label: "Reenviar convite",
                    run: async () => ({ status: "failed", message: "Falha de rede. Nada foi alterado." }),
                },
            }),
        ]);

        fireEvent.click(screen.getByTestId("decision-mutation-button"));
        await waitFor(() => {
            expect(screen.getByTestId("decision-outcome-failed")).toHaveTextContent("Nada foi alterado");
        });
        // Item permanece na fila para nova tentativa.
        expect(screen.getByText("Convite pendente")).toBeInTheDocument();
    });

    it("trata runner que lança como falha técnica, não como sucesso", async () => {
        
        renderQueue([
            item({
                mutation: {
                    label: "Reenviar convite",
                    run: async () => {
                        throw new Error("Boom.");
                    },
                },
            }),
        ]);

        fireEvent.click(screen.getByTestId("decision-mutation-button"));
        await waitFor(() => {
            expect(screen.getByTestId("decision-outcome-failed")).toHaveTextContent("Nada foi alterado");
        });
    });

    it("desabilita e explica quando há bloqueio conhecido de antemão", async () => {
        renderQueue([
            item({
                mutation: {
                    label: "Reenviar convite",
                    run: async () => ({ status: "succeeded", message: "ok" }),
                    blockedReason: "É preciso aguardar 24 horas entre reenvios.",
                },
            }),
        ]);

        expect(screen.getByTestId("decision-mutation-button")).toBeDisabled();
        expect(screen.getByText(/aguardar 24 horas/)).toBeInTheDocument();
    });

    it("não anuncia rótulo de aprovação, que não existe no produto", () => {
        // §D1/D49: rótulo de ação inexistente é overclaim.
        renderQueue([
            item({ mutation: { label: "Reenviar convite", run: async () => ({ status: "succeeded", message: "ok" }) } }),
        ]);
        expect(screen.queryByText(/Aprovar convite/i)).not.toBeInTheDocument();
    });

    it("limita a fila e informa quantos itens ficaram de fora", () => {
        const many = Array.from({ length: 55 }, (_, index) =>
            item({ id: `i-${index}`, title: `Item ${index}` }),
        );
        render(
            <MemoryRouter>
                <DecisionQueue items={many} maxItems={50} />
            </MemoryRouter>,
        );
        expect(screen.getByText(/Mostrando 50 de 55 itens/)).toBeInTheDocument();
    });
});
