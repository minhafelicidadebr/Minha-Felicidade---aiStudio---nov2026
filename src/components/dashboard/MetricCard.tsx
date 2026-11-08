// UX-1 — Card de métrica canônico.
//
// Contrato §5: toda métrica apresenta valor, variação, período, referência/meta,
// fórmula/explicação, fonte, atualização, limitação e ação associada.
// Nenhum desses campos é decorativo: a fórmula e a limitação são o que impede o
// gestor de ler engajamento como prova de impacto psicológico.
//
// A11y: a variação nunca depende só de cor (tem seta + texto);
// o detalhamento abre em Popover operável por teclado.

import { Link } from "react-router-dom";
import { ArrowRight, Info, Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatFreshness } from "@/lib/dashboard-format";

export type MetricTrendDirection = "up" | "down" | "flat";
/** Se subir é bom, ruim, ou é neutro (ex.: custo, erros). */
export type MetricTrendPolarity = "positive" | "negative" | "neutral";

export interface MetricCardProps {
    /** Chave do DASHBOARD-METRIC-REGISTRY (rastreabilidade). */
    metricKey?: string;
    label: string;
    value: string | number;
    unit?: string;
    icon?: LucideIcon;
    /** Variação absoluta ou relativa já formatada (ex.: "+12%", "-3 pts"). */
    delta?: string;
    deltaDirection?: MetricTrendDirection;
    /** Polaridade da métrica: define a cor semântica da variação. */
    polarity?: MetricTrendPolarity;
    /** Período coberto (ex.: "últimos 7 dias"). */
    period?: string;
    /** Meta ou referência (ex.: "meta 70%"). */
    target?: string;
    /** Como o número é calculado. Obrigatório pelo contrato de métrica. */
    formula?: string;
    /** Origem do dado (tabela/RPC). */
    source?: string;
    /** O que a métrica NÃO prova. */
    limitation?: string;
    /** ISO timestamp da leitura. */
    updatedAt?: string | null;
    /** Ação associada — o que fazer com esse número. */
    action?: { label: string; to: string };
    className?: string;
}

const TREND_ICON: Record<MetricTrendDirection, LucideIcon> = {
    up: TrendingUp,
    down: TrendingDown,
    flat: Minus,
};

const TREND_TEXT: Record<MetricTrendDirection, string> = {
    up: "em alta",
    down: "em queda",
    flat: "estável",
};

function trendToneClass(direction: MetricTrendDirection, polarity: MetricTrendPolarity): string {
    if (polarity === "neutral" || direction === "flat") return "text-muted-foreground";
    const isGood = polarity === "positive" ? direction === "up" : direction === "down";
    return isGood ? "text-success" : "text-destructive";
}

export default function MetricCard({
    metricKey,
    label,
    value,
    unit,
    icon: Icon,
    delta,
    deltaDirection = "flat",
    polarity = "positive",
    period,
    target,
    formula,
    source,
    limitation,
    updatedAt,
    action,
    className,
}: MetricCardProps) {
    const TrendIcon = TREND_ICON[deltaDirection];
    const hasDetails = Boolean(formula || source || limitation || target);

    return (
        <article
            className={cn(
                "flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/60 p-4 transition-colors hover:border-border",
                className,
            )}
            data-testid="metric-card"
            data-metric-key={metricKey}
        >
            <header className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    {Icon && (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-primary">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                    )}
                    <h3 className="truncate text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {label}
                    </h3>
                </div>

                {hasDetails && (
                    <Popover>
                        <PopoverTrigger
                            className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            aria-label={`Como calculamos ${label}`}
                        >
                            <Info className="h-4 w-4" aria-hidden="true" />
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-72 space-y-2 text-xs">
                            <p className="font-display text-sm font-bold">{label}</p>
                            {formula && (
                                <p>
                                    <span className="font-semibold text-foreground">Cálculo: </span>
                                    <span className="text-muted-foreground">{formula}</span>
                                </p>
                            )}
                            {target && (
                                <p>
                                    <span className="font-semibold text-foreground">Referência: </span>
                                    <span className="text-muted-foreground">{target}</span>
                                </p>
                            )}
                            {source && (
                                <p>
                                    <span className="font-semibold text-foreground">Fonte: </span>
                                    <span className="text-muted-foreground">{source}</span>
                                </p>
                            )}
                            {limitation && (
                                <p className="rounded-lg bg-muted/50 p-2 text-muted-foreground">
                                    <span className="font-semibold text-foreground">Limitação: </span>
                                    {limitation}
                                </p>
                            )}
                            <p className="text-[10px] text-muted-foreground/80">{formatFreshness(updatedAt)}</p>
                        </PopoverContent>
                    </Popover>
                )}
            </header>

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-display text-2xl font-bold leading-none">{value}</span>
                {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
                {delta && (
                    <span
                        className={cn(
                            "inline-flex items-center gap-1 text-xs font-bold",
                            trendToneClass(deltaDirection, polarity),
                        )}
                    >
                        <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {delta}
                        <span className="sr-only">({TREND_TEXT[deltaDirection]})</span>
                    </span>
                )}
            </div>

            <p className="text-[11px] text-muted-foreground">
                {period ?? "período não informado"}
                {target ? ` · ${target}` : ""}
            </p>

            {action && (
                <Link
                    to={action.to}
                    className="-m-1 mt-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg p-1 text-xs font-bold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    {action.label}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
            )}
        </article>
    );
}
