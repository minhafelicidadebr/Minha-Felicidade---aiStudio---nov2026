import { useState, useEffect } from "react";
import { Activity, Brain, Flame, Users, TrendingUp, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";

interface EngagementData {
    organization_id: string;
    generated_at: string;
    period_days: number;
    total_sessions: number;
    total_exercises: number;
    total_ai_interactions: number;
    active_users_7d: number;
    active_users_30d: number;
    nps_avg: number | null;
    nps_count: number;
    nps_promoters: number;
    nps_detractors: number;
}

interface Props {
    organizationId: string;
}

/**
 * Painel de métricas de engajamento real para o dashboard institucional.
 * Dados agregados via RPC get_org_engagement_summary — sem PII.
 */
export default function EngagementMetrics({ organizationId }: Props) {
    const [data, setData] = useState<EngagementData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMetrics() {
            try {
                const { data: result, error } = await supabase.rpc("get_org_engagement_summary", {
                    _org_id: organizationId,
                });
                if (error) throw error;
                setData(result as unknown as EngagementData);
            } catch {
                // RPC may not exist yet if migration not applied — fail gracefully
                setData(null);
            } finally {
                setLoading(false);
            }
        }
        fetchMetrics();
    }, [organizationId]);

    if (loading) {
        return (
            <section className="mt-8">
                <h2 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" /> Engajamento do Piloto
                </h2>
                <DashboardSkeleton variant="metrics" count={4} label="Carregando métricas de engajamento" />
            </section>
        );
    }

    if (!data) {
        return (
            <section className="mt-8">
                <h2 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" /> Engajamento do Piloto
                </h2>
                <DashboardEmptyState
                    variant="empty"
                    title="Métricas de engajamento indisponíveis"
                    description="Os dados de engajamento não puderam ser carregados. A RPC pode não estar disponível ainda."
                    icon={Activity}
                />
            </section>
        );
    }

    const npsScore = data.nps_count > 0
        ? Math.round(((data.nps_promoters - data.nps_detractors) / data.nps_count) * 100)
        : null;

    const npsColor = npsScore === null
        ? "text-muted-foreground"
        : npsScore >= 50 ? "text-emerald-400"
            : npsScore >= 0 ? "text-yellow-400"
                : "text-red-400";

    const hasActivity = data.total_sessions > 0 || data.nps_count > 0;

    if (!hasActivity) {
        return (
            <section className="mt-8">
                <h2 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" /> Engajamento do Piloto
                </h2>
                <div className="p-5 rounded-2xl glass-card text-center">
                    <p className="text-sm text-muted-foreground">
                        📊 As métricas de engajamento aparecerão aqui quando os alunos começarem a usar a plataforma.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="mt-8">
            <h2 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Engajamento do Piloto
                <span className="text-xs font-normal text-muted-foreground ml-2">últimos 30 dias</span>
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <MetricCard
                    icon={<Flame className="w-5 h-5 text-orange-400" />}
                    label="Sessões"
                    value={data.total_sessions}
                />
                <MetricCard
                    icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
                    label="Exercícios"
                    value={data.total_exercises}
                />
                <MetricCard
                    icon={<Brain className="w-5 h-5 text-violet-400" />}
                    label="Interações IA"
                    value={data.total_ai_interactions}
                />
                <MetricCard
                    icon={<Users className="w-5 h-5 text-sky-400" />}
                    label="Ativos (7d)"
                    value={data.active_users_7d}
                    subtitle={`${data.active_users_30d} em 30d`}
                />
            </div>

            {/* NPS Section */}
            {data.nps_count > 0 && (
                <div className="p-5 rounded-2xl glass-card">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5" /> NPS do Piloto
                        </h3>
                        <span className="text-xs text-muted-foreground">{data.nps_count} respostas</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div>
                            <span className={`text-3xl font-display font-bold ${npsColor}`}>
                                {npsScore !== null ? (npsScore > 0 ? `+${npsScore}` : npsScore) : "—"}
                            </span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">NPS Score</p>
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <NpsBar label="Promotores (9-10)" count={data.nps_promoters} total={data.nps_count} color="bg-emerald-400" />
                            <NpsBar label="Neutros (7-8)" count={data.nps_count - data.nps_promoters - data.nps_detractors} total={data.nps_count} color="bg-yellow-400" />
                            <NpsBar label="Detratores (0-6)" count={data.nps_detractors} total={data.nps_count} color="bg-red-400" />
                        </div>
                    </div>
                    {data.nps_avg !== null && (
                        <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/30">
                            Média: {data.nps_avg}/10 · Dados agregados, sem identificação individual.
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}

function MetricCard({ icon, label, value, subtitle }: { icon: React.ReactNode; label: string; value: number; subtitle?: string }) {
    return (
        <div className="p-4 rounded-2xl glass-card">
            <div className="mb-2">{icon}</div>
            <div className="text-2xl font-display font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
            {subtitle && <div className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
    );
}

function NpsBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-28 shrink-0">{label}</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] font-bold w-6 text-right">{count}</span>
        </div>
    );
}
