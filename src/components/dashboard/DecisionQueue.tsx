// UX-1 — Fila de decisões (contrato §3, item 3).
//
// É o componente que converte "métrica observada" em "decisão com responsável".
// O scorecard da UX-0 apontou 4.5 em "Decisão acionável" porque as métricas não
// convergiam para uma fila; esta é a estrutura que a UX-2/UX-3 preenchem.
//
// Regra de privacidade (contrato §6): o campo `owner` refere-se a papel/função
// ("coordenação da escola"), não a estudante identificado.

import { Link } from "react-router-dom";
import { ArrowRight, CircleAlert, Clock, ListChecks } from "lucide-react";
import DashboardEmptyState from "./DashboardEmptyState";
import { cn } from "@/lib/utils";

export type DecisionPriority = "high" | "medium" | "low";

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
    action?: { label: string; to: string };
}

interface DecisionQueueProps {
    title?: string;
    items: DecisionItem[];
    /** Texto do estado vazio — vazio aqui é boa notícia, não falta de dado. */
    emptyTitle?: string;
    emptyDescription?: string;
    className?: string;
}

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
    className,
}: DecisionQueueProps) {
    const ordered = [...items].sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    );

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

                                    {item.action && (
                                        <Link
                                            to={item.action.to}
                                            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                        >
                                            {item.action.label}
                                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                        </Link>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
