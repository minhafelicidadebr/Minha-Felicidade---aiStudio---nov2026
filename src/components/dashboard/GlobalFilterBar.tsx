// UX-1 — Barra de filtros global (contrato §8 e benchmark Carbon/Canvas).
//
// Desktop/tablet: filtros inline. Mobile: os MESMOS filtros dentro de um Sheet —
// nunca escondidos sem alternativa (gate do master plan).
//
// Componente controlado: quem monta o dashboard decide o que o período faz.
// Assim a UX-2/UX-3 reaproveitam sem herdar regra de negócio errada.

import { Filter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
    DASHBOARD_PERIOD_LABEL,
    DASHBOARD_PERIOD_OPTIONS,
    type DashboardFilterOption,
    type DashboardPeriod,
} from "@/config/dashboard-filters";
import { cn } from "@/lib/utils";

interface GlobalFilterBarProps {
    period: DashboardPeriod;
    onPeriodChange: (period: DashboardPeriod) => void;
    /** Filtro secundário opcional (ex.: escola). */
    scopeLabel?: string;
    scopeValue?: string;
    scopeOptions?: DashboardFilterOption[];
    onScopeChange?: (value: string) => void;
    className?: string;
}

function PeriodControl({
    period,
    onPeriodChange,
    idPrefix,
}: {
    period: DashboardPeriod;
    onPeriodChange: (period: DashboardPeriod) => void;
    idPrefix: string;
}) {
    return (
        <fieldset className="min-w-0">
            <legend className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Período
            </legend>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Selecionar período">
                {DASHBOARD_PERIOD_OPTIONS.map((option) => {
                    const isActive = option === period;
                    return (
                        <button
                            key={`${idPrefix}-${option}`}
                            type="button"
                            onClick={() => onPeriodChange(option)}
                            aria-pressed={isActive}
                            className={cn(
                                "min-h-11 rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                isActive
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                        >
                            {DASHBOARD_PERIOD_LABEL[option]}
                        </button>
                    );
                })}
            </div>
        </fieldset>
    );
}

function ScopeControl({
    scopeLabel,
    scopeValue,
    scopeOptions,
    onScopeChange,
    idPrefix,
}: {
    scopeLabel: string;
    scopeValue?: string;
    scopeOptions: DashboardFilterOption[];
    onScopeChange: (value: string) => void;
    idPrefix: string;
}) {
    const selectId = `${idPrefix}-scope`;
    return (
        <div className="min-w-0">
            <label
                htmlFor={selectId}
                className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
            >
                {scopeLabel}
            </label>
            <select
                id={selectId}
                value={scopeValue ?? ""}
                onChange={(event) => onScopeChange(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-48"
            >
                {scopeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default function GlobalFilterBar({
    period,
    onPeriodChange,
    scopeLabel,
    scopeValue,
    scopeOptions,
    onScopeChange,
    className,
}: GlobalFilterBarProps) {
    const hasScope = Boolean(scopeLabel && scopeOptions?.length && onScopeChange);

    return (
        <div className={cn("w-full", className)} data-testid="global-filter-bar">
            {/* Mobile: mesmos filtros, dentro de um Sheet. */}
            <div className="md:hidden">
                <Sheet>
                    <SheetTrigger className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-4 text-xs font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                        <Filter className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        Filtros
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {DASHBOARD_PERIOD_LABEL[period]}
                        </span>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="space-y-5">
                        <SheetHeader className="text-left">
                            <SheetTitle className="font-display text-base">Filtros</SheetTitle>
                        </SheetHeader>
                        <PeriodControl period={period} onPeriodChange={onPeriodChange} idPrefix="sheet" />
                        {hasScope && (
                            <ScopeControl
                                scopeLabel={scopeLabel!}
                                scopeValue={scopeValue}
                                scopeOptions={scopeOptions!}
                                onScopeChange={onScopeChange!}
                                idPrefix="sheet"
                            />
                        )}
                    </SheetContent>
                </Sheet>
            </div>

            {/* Tablet/desktop: filtros inline. */}
            <div className="hidden flex-wrap items-end gap-4 md:flex">
                <PeriodControl period={period} onPeriodChange={onPeriodChange} idPrefix="inline" />
                {hasScope && (
                    <ScopeControl
                        scopeLabel={scopeLabel!}
                        scopeValue={scopeValue}
                        scopeOptions={scopeOptions!}
                        onScopeChange={onScopeChange!}
                        idPrefix="inline"
                    />
                )}
            </div>
        </div>
    );
}
