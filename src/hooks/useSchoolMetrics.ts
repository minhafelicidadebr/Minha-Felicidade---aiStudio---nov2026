// UX-3 — Leitura dos indicadores agregados de uma escola.
//
// Toda a supressão (limiar e complementar) já vem aplicada pelo servidor
// (§D5–§D7). Este hook NÃO decide o que esconder: se decidisse, o valor real
// teria que trafegar até aqui, e §D6 proíbe exatamente isso.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardPeriod } from "@/config/dashboard-filters";
import type { MetricGroup, NamedGroup } from "@/lib/metric-privacy";

export interface SchoolMetricsTotals {
    sessions: MetricGroup;
    exercises: MetricGroup;
    ai: MetricGroup;
    active_7d: MetricGroup;
}

export interface SchoolSeriesPoint {
    day: string;
    group: MetricGroup;
}

export interface SchoolMetrics {
    school_id: string;
    organization_id: string;
    period: DashboardPeriod;
    days: number;
    minimum_group_size: number;
    eligible_universe: number;
    generated_at: string;
    /** True quando o universo elegível da escola está abaixo do limiar. */
    analytics_suppressed: boolean;
    totals: SchoolMetricsTotals;
    classes: NamedGroup[];
    series: SchoolSeriesPoint[];
}

/** Erro de autorização, indistinguível de escola inexistente (anti-enumeração). */
export class SchoolAccessDeniedError extends Error {
    constructor() {
        super("A escola solicitada não está no escopo desta conta.");
        this.name = "SchoolAccessDeniedError";
    }
}

function isDeniedMessage(message: string): boolean {
    return message.includes("not available for this account");
}

async function fetchSchoolMetrics(
    schoolId: string,
    period: DashboardPeriod,
): Promise<SchoolMetrics> {
    const { data, error } = await supabase.rpc("get_school_metrics", {
        _school_id: schoolId,
        _period: period,
    });

    if (error) {
        if (isDeniedMessage(error.message)) throw new SchoolAccessDeniedError();
        throw error;
    }
    if (!data) throw new SchoolAccessDeniedError();

    return data as unknown as SchoolMetrics;
}

export interface UseSchoolMetricsResult {
    metrics: SchoolMetrics | null;
    isLoading: boolean;
    isError: boolean;
    /** True quando a falha é de autorização, que tem estado próprio na UI. */
    isDenied: boolean;
    error: Error | null;
    refetch: () => void;
}

/**
 * @param schoolId id já validado como uuid pelo chamador. Passar `null`
 *                 desabilita a consulta — id malformado não deve gerar chamada
 *                 de rede (contrato §2 item 7).
 */
export function useSchoolMetrics(
    schoolId: string | null,
    period: DashboardPeriod,
): UseSchoolMetricsResult {
    const query = useQuery({
        queryKey: ["school-metrics", schoolId, period],
        queryFn: () => fetchSchoolMetrics(schoolId!, period),
        enabled: Boolean(schoolId),
        staleTime: 30_000,
        retry: false,
    });

    const error = (query.error as Error | null) ?? null;

    return {
        metrics: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        isDenied: error instanceof SchoolAccessDeniedError,
        error,
        refetch: () => void query.refetch(),
    };
}
