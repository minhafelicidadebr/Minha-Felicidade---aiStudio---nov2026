// UX-1 — Fila de decisões (contrato §3, item 3).
//
// É o componente que converte "métrica observada" em "decisão com responsável".
// O scorecard da UX-0 apontou 4.5 em "Decisão acionável" porque as métricas não
// convergiam para uma fila; esta é a estrutura que a UX-2/UX-3 preenchem.
//
// Regra de privacidade (contrato §6): o campo `owner` refere-se a papel/função
// ("coordenação da escola"), não a estudante identificado.

import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowRight,
    CheckCircle2,
    CircleAlert,
    Clock,
    ListChecks,
    Loader2,
    Lock,
    TriangleAlert,
} from "lucide-react";
import DashboardEmptyState from "./DashboardEmptyState";
import { cn } from "@/lib/utils";

export type DecisionPriority = "high" | "medium" | "low";

/**
 * Desfecho de uma ação que ALTERA dados (UX-3, §D1/D49).
 *
 * Três casos deliberadamente distintos, porque a próxima coisa que a pessoa faz
 * é diferente em cada um:
 *   • `succeeded` → nada a fazer, o efeito ocorreu;
 *   • `denied`    → a conta não tem permissão; insistir não resolve;
 *   • `failed`    → falha técnica; **nada foi alterado** e tentar de novo faz
 *                   sentido.
 * Colapsar `denied` em `failed` faria o gestor repetir uma ação que nunca vai
 * passar.
 */
export type DecisionActionOutcome =
    | { status: "succeeded"; message: string }
    | { status: "denied"; message: string }
    | { status: "failed"; message: string };

export interface DecisionMutation {
    label: string;
    pendingLabel?: string;
    /** Executa a ação. Deve resolver com o desfecho, não lançar. */
    run: () => Promise<DecisionActionOutcome>;
    /**
     * Bloqueio conhecido ANTES de chamar o servidor (ex.: janela de 24 h já
     * contada no cliente). O controle aparece desabilitado com o motivo, em vez
     * de gastar uma ida ao banco para ouvir "não".
     */
    blockedReason?: string | null;
}

export interface DecisionItem {
    id: string;
    title: string;
    /** Por que isto está na fila (evidência que gerou a decisão). */
    reason: string;
    priority: DecisionPriority;
    /** Papel responsável — nunca um estudante identificado. */
    owner?: string;
    /** Prazo sugerido em linguagem natural (ex.: "esta semana"). */
    due?: string;
    /** Ação de navegação (não altera dados). */
    action?: { label: string; to: string };
    /**
     * Ação que altera dados. Ausente quando o papel efetivo não pode executar —
     * o item continua visível, só sem o controle (contrato R9 item 15).
     */
    mutation?: DecisionMutation;
}

interface DecisionQueueProps {
    title?: string;
    items: DecisionItem[];
    /** Texto do estado vazio — vazio aqui é boa notícia, não falta de dado. */
    emptyTitle?: string;
    emptyDescription?: string;
    /** Chamado depois de uma ação bem-sucedida, para recarregar do servidor. */
    onResolved?: () => void;
    /** Teto de itens exibidos por leitura. */
    maxItems?: number;
    className?: string;
}

const OUTCOME_STYLE: Record<
    DecisionActionOutcome["status"],
    { icon: typeof CheckCircle2; tone: string; role: "status" | "alert" }
> = {
    succeeded: { icon: CheckCircle2, tone: "text-success", role: "status" },
    denied: { icon: Lock, tone: "text-destructive", role: "alert" },
    failed: { icon: TriangleAlert, tone: "text-destructive", role: "alert" },
};

const PRIORITY_STYLE: Record<DecisionPriority, { label: string; badge: string; bar: string }> = {
    high: {
        label: "Alta",
        badge: "bg-destructive/10 text-destructive",
        bar: "bg-destructive",
    },
    medium: {
        label: "Média",
        badge: "bg-secondary/15 text-secondary",
        bar: "bg-secondary",
    },
    low: {
        label: "Baixa",
        badge: "bg-muted text-muted-foreground",
        bar: "bg-muted-foreground/40",
    },
};

const PRIORITY_ORDER: Record<DecisionPriority, number> = { high: 0, medium: 1, low: 2 };

export default function DecisionQueue({
    title = "Precisa da sua decisão",
    items,
    emptyTitle = "Nenhuma decisão pendente",
    emptyDescription = "Nada exige intervenção agora. Quando um indicador sair do esperado, a decisão aparece aqui com o motivo.",
    onResolved,
    maxItems = 50,
    className,
}: DecisionQueueProps) {
    const [runningId, setRunningId] = useState<string | null>(null);
    const [outcomes, setOutcomes] = useState<Record<string, DecisionActionOutcome>>({});

    const runMutation = useCallback(
        async (item: DecisionItem) => {
            if (!item.mutation || runningId) return;
            setRunningId(item.id);
            setOutcomes((previous) => {
                const next = { ...previous };
                delete next[item.id];
                return next;
            });
            try {
                const outcome = await item.mutation.run();
                setOutcomes((previous) => ({ ...previous, [item.id]: outcome }));
                if (outcome.status === "succeeded") onResolved?.();
            } catch (caught) {
                // Runner que lança em vez de resolver: tratado como falha
                // técnica, e a mensagem diz que nada foi alterado.
                setOutcomes((previous) => ({
                    ...previous,
                    [item.id]: {
                        status: "failed",
                        message:
                            caught instanceof Error
                                ? `${caught.message} Nada foi alterado.`
                                : "Falha inesperada. Nada foi alterado.",
                    },
                }));
            } finally {
                setRunningId(null);
            }
        },
        [runningId, onResolved],
    );

    const ordered = [...items]
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
        .slice(0, maxItems);
    const hiddenCount = items.length - ordered.length;

    return (
        <section className={cn("space-y-3", className)} data-testid="decision-queue">
            <header className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-display text-base font-bold">
                    <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
                    {title}
                </h2>
                {ordered.length > 0 && (
                    <span className="text-xs font-semibold text-muted-foreground">
                        {ordered.length} {ordered.length === 1 ? "item" : "itens"}
                    </span>
                )}
            </header>

            {ordered.length === 0 ? (
                <DashboardEmptyState variant="empty" title={emptyTitle} description={emptyDescription} />
            ) : (
                <ul className="space-y-2">
                    {ordered.map((item) => {
                        const style = PRIORITY_STYLE[item.priority];
                        const isRunning = runningId === item.id;
                        // Uma execução por vez em toda a fila: duas mutações
                        // simultâneas deixariam o estado da lista ambíguo.
                        const isBusy = runningId !== null;
                        const outcome = outcomes[item.id];
                        return (
                            <li
                                key={item.id}
                                className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-4 pl-5"
                            >
                                <span
                                    className={cn("absolute inset-y-0 left-0 w-1", style.bar)}
                                    aria-hidden="true"
                                />
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-display text-sm font-bold">{item.title}</h3>
                                            <span
                                                className={cn(
                                                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                                    style.badge,
                                                )}
                                            >
                                                Prioridade {style.label}
                                            </span>
                                        </div>
                                        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                            {item.reason}
                                        </p>
                                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                            {item.owner && <span>Responsável: {item.owner}</span>}
                                            {item.due && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock className="h-3 w-3" aria-hidden="true" /> {item.due}
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                                        {item.action && (
                                            <Link
                                                to={item.action.to}
                                                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border/60 px-4 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                            >
                                                {item.action.label}
                                                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                            </Link>
                                        )}

                                        {item.mutation && (
                                            <button
                                                type="button"
                                                onClick={() => void runMutation(item)}
                                                disabled={isBusy || Boolean(item.mutation.blockedReason)}
                                                aria-describedby={
                                                    item.mutation.blockedReason ? `${item.id}-blocked` : undefined
                                                }
                                                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                                data-testid="decision-mutation-button"
                                            >
                                                {isRunning ? (
                                                    <>
                                                        <Loader2
                                                            className="h-3.5 w-3.5 animate-spin"
                                                            aria-hidden="true"
                                                        />
                                                        {item.mutation.pendingLabel ?? "Executando…"}
                                                    </>
                                                ) : (
                                                    item.mutation.label
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {item.mutation?.blockedReason && (
                                    <p
                                        id={`${item.id}-blocked`}
                                        className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground"
                                    >
                                        <Clock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                                        {item.mutation.blockedReason}
                                    </p>
                                )}

                                {outcome && (
                                    <p
                                        role={OUTCOME_STYLE[outcome.status].role}
                                        aria-live={outcome.status === "succeeded" ? "polite" : "assertive"}
                                        className={cn(
                                            "mt-2 flex items-start gap-1.5 text-[11px] font-medium",
                                            OUTCOME_STYLE[outcome.status].tone,
                                        )}
                                        data-testid={`decision-outcome-${outcome.status}`}
                                    >
                                        {(() => {
                                            const Icon = OUTCOME_STYLE[outcome.status].icon;
                                            return <Icon className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />;
                                        })()}
                                        {outcome.message}
                                    </p>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {hiddenCount > 0 && (
                <p className="text-[11px] text-muted-foreground">
                    Mostrando {ordered.length} de {items.length} itens. Resolva os atuais para ver os
                    demais.
                </p>
            )}
        </section>
    );
}
