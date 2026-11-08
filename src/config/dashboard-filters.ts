// UX-1 — Vocabulário de filtros dos dashboards (fonte única).
//
// Separado do componente para que card, gráfico e texto de período usem
// exatamente o mesmo rótulo. Divergência de rótulo de período é uma das formas
// mais fáceis de tornar um dashboard não confiável.

export type DashboardPeriod = "7d" | "30d" | "90d";

/** Rótulo curto — usado em botões e chips. */
export const DASHBOARD_PERIOD_LABEL: Record<DashboardPeriod, string> = {
    "7d": "7 dias",
    "30d": "30 dias",
    "90d": "90 dias",
};

/** Descrição em frase — usada no contrato de métrica (campo "período"). */
export const DASHBOARD_PERIOD_DESCRIPTION: Record<DashboardPeriod, string> = {
    "7d": "últimos 7 dias",
    "30d": "últimos 30 dias",
    "90d": "últimos 90 dias",
};

export const DASHBOARD_PERIOD_OPTIONS: readonly DashboardPeriod[] = ["7d", "30d", "90d"] as const;

export const DEFAULT_DASHBOARD_PERIOD: DashboardPeriod = "30d";

export interface DashboardFilterOption {
    value: string;
    label: string;
}
