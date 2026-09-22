import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MetricGroup } from "@/lib/metric-privacy";

export interface NpsSeriesPoint {
    bucket_start: string;
    group: MetricGroup;
}

export interface EngagementSeriesPoint {
    bucket_start: string;
    sessions: MetricGroup;
    exercises: MetricGroup;
    ai_interactions: MetricGroup;
}

export interface OrgAnalyticsSeries {
    organization_id: string;
    generated_at: string;
    period_weeks: number;
    minimum_group_size: number;
    nps: NpsSeriesPoint[];
    engagement: EngagementSeriesPoint[];
}

export interface OrgEngagementSummary {
    organization_id: string;
    generated_at: string;
    period_days: number;
    minimum_group_size: number;
    analytics_suppressed: boolean;
    suppressed_metrics: string[];
    eligible_universe: number | null;
    total_sessions: number | null;
    total_exercises: number | null;
    total_ai_interactions: number | null;
    active_users_7d: number | null;
    active_users_30d: number | null;
    nps_avg: number | null;
    nps_count: number | null;
    nps_promoters: number | null;
    nps_detractors: number | null;
}
async function fetchSeries(organizationId: string): Promise<OrgAnalyticsSeries> {
    // Type-asserted while generated Supabase types are out of sync with this RPC.
    const { data, error } = await (supabase as any).rpc("get_org_analytics_series", { _org_id: organizationId });
    if (error) throw error;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Resposta inválida da série institucional.");
    }
    return data as unknown as OrgAnalyticsSeries;
}


async function fetchSummary(organizationId: string): Promise<OrgEngagementSummary> {
    const { data, error } = await supabase.rpc("get_org_engagement_summary", { _org_id: organizationId });
    if (error) throw error;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Resposta inválida do resumo institucional.");
    }
    return data as unknown as OrgEngagementSummary;
}

/** Cache segregado por tenant; o servidor revalida o escopo em toda chamada. */
export function useOrgAnalyticsSeries(organizationId: string) {
    return useQuery({
        queryKey: ["org-analytics-series", organizationId],
        queryFn: () => fetchSeries(organizationId),
        enabled: Boolean(organizationId),
        staleTime: 30_000,
        retry: false,
    });
}

export function useOrgEngagementSummary(organizationId: string) {
    return useQuery({
        queryKey: ["org-engagement-summary", organizationId],
        queryFn: () => fetchSummary(organizationId),
        enabled: Boolean(organizationId),
        staleTime: 30_000,
        retry: false,
    });
}
