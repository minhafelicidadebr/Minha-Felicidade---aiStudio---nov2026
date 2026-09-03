// UX-3 — Leitura dos indicadores agregados de uma escola.
//
// Toda a supressão (limiar e complementar) já vem aplicada pelo servidor
// (§D5–§D7). Este hook NÃO decide o que esconder: se decidisse, o valor real
// teria que trafegar até aqui, e §D6 proíbe exatamente isso.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { assertInstitutionalPayload, institutionalQueryKeys } from "@/lib/institutional-query-keys";
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
    /**
     * TRUST-1.2 (R10): deixou de ser um inteiro cru.
     *
     * O tamanho do universo elegível é ele mesmo um dado protegido: publicá-lo
     * exato quando os indicadores estão suprimidos revelaria o tamanho do grupo,
     * que é justamente o que o limiar existe para esconder. E, mesmo acima do
     * limiar, o total permitia reconstruir por subtração o headcount de uma turma
     * suprimida (`eligible_universe - Σ counts divulgados`), então o servidor
     * também o suprime de forma complementar nesse caso.
     */
    eligible_universe: MetricGroup;
    generated_at: string;
    /**
     * True quando o universo elegível da escola está entre 1 e o limiar.
     *
     * Universo ZERO é `false`: ninguém foi exposto, e "ninguém participou" é
     * resposta diferente de "amostra insuficiente".
     */
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
    const metrics = data as unknown as SchoolMetrics;
    assertInstitutionalPayload(schoolId, metrics.school_id, "school");
    return metrics;
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
    userId: string | null,
    schoolId: string | null,
    period: DashboardPeriod,
): UseSchoolMetricsResult {
    const query = useQuery({
        queryKey: institutionalQueryKeys.schoolMetrics(userId, schoolId, period),
        queryFn: () => fetchSchoolMetrics(schoolId!, period),
        enabled: Boolean(userId && schoolId),
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
