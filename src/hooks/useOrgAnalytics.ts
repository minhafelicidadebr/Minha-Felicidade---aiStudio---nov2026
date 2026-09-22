import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { assertInstitutionalPayload, institutionalQueryKeys } from "@/lib/institutional-query-keys";
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
    const { data, error } = await supabase.rpc("get_org_analytics_series", { _org_id: organizationId });
    if (error) throw error;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Resposta inválida da série institucional.");
    }
    const payload = data as unknown as OrgAnalyticsSeries;
    assertInstitutionalPayload(organizationId, payload.organization_id, "organization");
    return payload;
}


async function fetchSummary(organizationId: string): Promise<OrgEngagementSummary> {
    const { data, error } = await supabase.rpc("get_org_engagement_summary", { _org_id: organizationId });
    if (error) throw error;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Resposta inválida do resumo institucional.");
    }
    const payload = data as unknown as OrgEngagementSummary;
    assertInstitutionalPayload(organizationId, payload.organization_id, "organization");
    return payload;
}

/** Cache segregado por identidade e tenant; o servidor revalida o escopo. */
export function useOrgAnalyticsSeries(userId: string | null, organizationId: string) {
    return useQuery({
        queryKey: institutionalQueryKeys.orgAnalytics(userId, organizationId),
        queryFn: () => fetchSeries(organizationId),
        enabled: Boolean(userId && organizationId),
        staleTime: 30_000,
        retry: false,
    });
}

export function useOrgEngagementSummary(userId: string | null, organizationId: string) {
    return useQuery({
        queryKey: institutionalQueryKeys.orgEngagement(userId, organizationId),
        queryFn: () => fetchSummary(organizationId),
        enabled: Boolean(userId && organizationId),
        staleTime: 30_000,
        retry: false,
    });
}
