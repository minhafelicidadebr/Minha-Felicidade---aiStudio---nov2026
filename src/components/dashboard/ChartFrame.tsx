// UX-1 — Moldura canônica de gráfico.
//
// Contrato §9 e gate do master plan: "Gráficos devem possuir descrição,
// tooltip e tabela alternativa". Esta moldura garante os três — o gráfico em si
// (Recharts, via ui/chart.tsx) é passado como children.
//
// Por que uma moldura e não um componente de gráfico: cada dashboard precisa de
// séries diferentes; padronizar a MOLDURA (título, descrição acessível,
// freshness, privacidade, alternância tabela) evita 4 implementações divergentes
// sem engessar a visualização.

import { useId, useState } from "react";
import { Table2, LineChart as LineChartIcon } from "lucide-react";
import PrivacyIndicator from "./PrivacyIndicator";
import type { PrivacyScope } from "@/lib/dashboard-format";
import { cn } from "@/lib/utils";

export interface ChartTableColumn {
    key: string;
    label: string;
    /** Alinhamento numérico à direita melhora leitura de série temporal. */
    numeric?: boolean;
}

interface ChartFrameProps {
    title: string;
    /** Resumo textual do que o gráfico mostra — lido por leitores de tela. */
    description: string;
    /** Colunas da tabela alternativa. */
    columns: ChartTableColumn[];
    /** Linhas da tabela alternativa (mesma fonte de dados do gráfico). */
    rows: Record<string, string | number>[];
    period?: string;
    updatedAt?: string | null;
    privacyScope?: PrivacyScope;
    minimumGroupSize?: number;
    /** Fórmula/fonte resumida exibida no rodapé. */
    footnote?: string;
    className?: string;
    children: React.ReactNode;
}

export default function ChartFrame({
    title,
    description,
    columns,
    rows,
    period,
    updatedAt,
    privacyScope = "aggregate",
    minimumGroupSize,
    footnote,
    className,
    children,
}: ChartFrameProps) {
    const [showTable, setShowTable] = useState(false);
    const descriptionId = useId();
    const regionId = useId();

    return (
        <section
            aria-labelledby={`${regionId}-title`}
            className={cn("rounded-2xl border border-border/50 bg-card/60 p-4", className)}
            data-testid="chart-frame"
        >
            <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <h3 id={`${regionId}-title`} className="font-display text-sm font-bold">
                        {title}
                    </h3>
                    <p id={descriptionId} className="mt-0.5 text-xs text-muted-foreground">
                        {description}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowTable((previous) => !previous)}
                    aria-pressed={showTable}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-border/60 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    {showTable ? (
                        <>
                            <LineChartIcon className="h-3.5 w-3.5" aria-hidden="true" /> Ver gráfico
                        </>
                    ) : (
                        <>
                            <Table2 className="h-3.5 w-3.5" aria-hidden="true" /> Ver dados em tabela
                        </>
                    )}
                </button>
            </header>

            {showTable ? (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs" aria-describedby={descriptionId}>
                        <caption className="sr-only">{`${title}. ${description}`}</caption>
                        <thead>
                            <tr className="border-b border-border/50">
                                {columns.map((column) => (
                                    <th
                                        key={column.key}
                                        scope="col"
                                        className={cn(
                                            "px-2 py-2 font-bold text-muted-foreground",
                                            column.numeric ? "text-right" : "text-left",
                                        )}
                                    >
                                        {column.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="px-2 py-3 text-center text-muted-foreground"
                                    >
                                        Nenhum dado no período.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row, index) => (
                                    <tr key={index} className="border-b border-border/20 last:border-0">
                                        {columns.map((column) => (
                                            <td
                                                key={column.key}
                                                className={cn(
                                                    "px-2 py-1.5",
                                                    column.numeric
                                                        ? "text-right font-medium tabular-nums"
                                                        : "text-left text-muted-foreground",
                                                )}
                                            >
                                                {row[column.key] ?? "—"}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                // `img` + aria-label dá ao gráfico um nome acessível único, com a
                // tabela acima como alternativa real de leitura.
                <div role="img" aria-label={`${title}. ${description}`} className="w-full">
                    {children}
                </div>
            )}

            <footer className="mt-3 space-y-1 border-t border-border/30 pt-2">
                <PrivacyIndicator
                    scope={privacyScope}
                    minimumGroupSize={minimumGroupSize}
                    updatedAt={updatedAt}
                    period={period}
                />
                {footnote && <p className="text-[10px] text-muted-foreground/80">{footnote}</p>}
            </footer>
        </section>
    );
}
