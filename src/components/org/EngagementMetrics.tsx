import { Activity, Brain, Flame, Star, TrendingUp, Users } from "lucide-react";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardErrorState from "@/components/dashboard/DashboardErrorState";
import { useOrgEngagementSummary } from "@/hooks/useOrgAnalytics";

interface Props { userId: string | null; organizationId: string }

export default function EngagementMetrics({ userId, organizationId }: Props) {
    const query = useOrgEngagementSummary(userId, organizationId);

    if (query.isLoading) {
        return (
            <section className="mt-8">
                <Heading />
                <DashboardSkeleton variant="metrics" count={4} label="Carregando métricas de engajamento" />
            </section>
        );
    }
    if (query.isError || !query.data) {
        return (
            <section className="mt-8">
                <Heading />
                <DashboardErrorState title="Métricas de engajamento indisponíveis"
                    detail={query.error instanceof Error ? query.error.message : undefined}
                    onRetry={() => void query.refetch()} />
            </section>
        );
    }

    const data = query.data;
    const suppressed = new Set(data.suppressed_metrics);
    const values = [data.total_sessions, data.total_exercises, data.total_ai_interactions, data.active_users_7d, data.nps_count];
    const hasActivity = values.some((value) => typeof value === "number" && value > 0);

    if (!hasActivity && suppressed.size === 0) {
        return (
            <section className="mt-8">
                <Heading />
                <DashboardEmptyState variant="empty" title="Sem engajamento no período"
                    description="As métricas aparecerão quando houver atividade ou respostas NPS nos últimos 30 dias." icon={Activity} />
            </section>
        );
    }

    const npsReady = data.nps_count !== null && data.nps_count > 0
        && data.nps_promoters !== null && data.nps_detractors !== null;
    const npsScore = npsReady
        ? Math.round(((data.nps_promoters! - data.nps_detractors!) / data.nps_count!) * 100)
        : null;
    const npsColor = npsScore === null ? "text-muted-foreground"
        : npsScore >= 50 ? "text-emerald-400" : npsScore >= 0 ? "text-yellow-400" : "text-red-400";

    return (
        <section className="mt-8">
            <Heading />
            {suppressed.size > 0 && (
                <p role="status" className="mb-3 text-xs text-muted-foreground">
                    Amostra insuficiente em parte dos indicadores. Limiar mínimo de {data.minimum_group_size} contribuidores por métrica.
                </p>
            )}
            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <MetricCard icon={<Flame className="h-5 w-5 text-orange-400" />} label="Sessões" value={data.total_sessions} />
                <MetricCard icon={<TrendingUp className="h-5 w-5 text-emerald-400" />} label="Exercícios" value={data.total_exercises} />
                <MetricCard icon={<Brain className="h-5 w-5 text-violet-400" />} label="Interações IA" value={data.total_ai_interactions} />
                <MetricCard icon={<Users className="h-5 w-5 text-sky-400" />} label="Ativos (7d)" value={data.active_users_7d}
                    subtitle={data.active_users_30d === null ? "30d: amostra insuficiente" : `${data.active_users_30d} em 30d`} />
            </div>

            {suppressed.has("nps") && (
                <div className="rounded-2xl p-5 glass-card" role="status">
                    <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <Star className="h-3.5 w-3.5" /> NPS do Piloto
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">Amostra insuficiente para exibição segura.</p>
                </div>
            )}

            {npsReady && (
                <div className="rounded-2xl p-5 glass-card">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            <Star className="h-3.5 w-3.5" /> NPS do Piloto
                        </h3>
                        <span className="text-xs text-muted-foreground">{data.nps_count} respostas</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div><span className={`text-3xl font-display font-bold ${npsColor}`}>
                            {npsScore! > 0 ? `+${npsScore}` : npsScore}
                        </span><p className="mt-0.5 text-[10px] text-muted-foreground">NPS Score</p></div>
                        <div className="flex-1 space-y-1.5">
                            <NpsBar label="Promotores (9-10)" count={data.nps_promoters!} total={data.nps_count!} color="bg-emerald-400" />
                            <NpsBar label="Neutros (7-8)" count={data.nps_count! - data.nps_promoters! - data.nps_detractors!} total={data.nps_count!} color="bg-yellow-400" />
                            <NpsBar label="Detratores (0-6)" count={data.nps_detractors!} total={data.nps_count!} color="bg-red-400" />
                        </div>
                    </div>
                    {data.nps_avg !== null && <p className="mt-3 border-t border-border/30 pt-3 text-[11px] text-muted-foreground">
                        Média: {data.nps_avg}/10 · Dados agregados, sem identificação individual.
                    </p>}
                </div>
            )}
        </section>
    );
}

function Heading() {
    return <h2 className="mb-3 flex items-center gap-2 text-lg font-display font-bold">
        <Activity className="h-5 w-5 text-primary" /> Engajamento do Piloto
        <span className="ml-2 text-xs font-normal text-muted-foreground">últimos 30 dias</span>
    </h2>;
}

function MetricCard({ icon, label, value, subtitle }: {
    icon: React.ReactNode; label: string; value: number | null; subtitle?: string;
}) {
    return (
        <div className="rounded-2xl p-4 glass-card" aria-label={`${label}: ${value === null ? "amostra insuficiente" : value}`}>
            <div className="mb-2">{icon}</div>
            {value === null
                ? <div className="text-sm font-semibold text-muted-foreground">Amostra insuficiente</div>
                : <div className="text-2xl font-display font-bold">{value}</div>}
            <div className="text-xs text-muted-foreground">{label}</div>
            {subtitle && <div className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</div>}
        </div>
    );
}

function NpsBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-[10px] text-muted-foreground">{label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-6 text-right text-[10px] font-bold">{count}</span>
        </div>
    );
}
