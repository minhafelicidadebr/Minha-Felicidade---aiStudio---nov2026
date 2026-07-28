import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";

interface WeeklyNps {
    week: string;
    avg: number;
    count: number;
}

interface Props {
    organizationId: string;
}

/**
 * NPS evolution over weeks — sparkline style visualization.
 * Shows average NPS score per week with trend indicator.
 */
export default function NpsEvolution({ organizationId }: Props) {
    const [data, setData] = useState<WeeklyNps[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetch() {
            try {
                const eightWeeksAgo = new Date(Date.now() - 56 * 86400000).toISOString();
                const { data: responses } = await supabase
                    .from("nps_responses")
                    .select("score, created_at")
                    .eq("organization_id", organizationId)
                    .gte("created_at", eightWeeksAgo)
                    .order("created_at", { ascending: true });

                if (!responses || responses.length === 0) {
                    setData([]);
                    setLoading(false);
                    return;
                }

                const startDate = new Date(eightWeeksAgo);
                const weeks: Map<number, number[]> = new Map();

                responses.forEach((r) => {
                    const weekNum = Math.floor((new Date(r.created_at).getTime() - startDate.getTime()) / (7 * 86400000));
                    if (!weeks.has(weekNum)) weeks.set(weekNum, []);
                    weeks.get(weekNum)!.push(r.score);
                });

                const points: WeeklyNps[] = [];
                for (let i = 0; i < 8; i++) {
                    const scores = weeks.get(i) || [];
                    points.push({
                        week: `S${i + 1}`,
                        avg: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
                        count: scores.length,
                    });
                }
                setData(points);
            } catch {
                setData([]);
            } finally {
                setLoading(false);
            }
        }
        fetch();
    }, [organizationId]);

    if (loading) {
        return (
            <section className="mt-4">
                <DashboardSkeleton variant="chart" label="Carregando evolução NPS" />
            </section>
        );
    }

    if (data.every(d => d.count === 0)) {
        return (
            <section className="mt-4">
                <DashboardEmptyState
                    variant="empty"
                    title="Sem dados de NPS"
                    description="As respostas NPS aparecerão aqui quando os alunos avaliarem a plataforma."
                    icon={Star}
                />
            </section>
        );
    }

    const filledWeeks = data.filter(d => d.count > 0);
    const trend = filledWeeks.length >= 2
        ? filledWeeks[filledWeeks.length - 1].avg - filledWeeks[0].avg
        : 0;

    const trendLabel = trend > 0.5 ? "↑ melhorando" : trend < -0.5 ? "↓ atenção" : "→ estável";
    const trendColor = trend > 0.5 ? "text-emerald-400" : trend < -0.5 ? "text-rose-400" : "text-yellow-400";

    return (
        <section className="mt-4">
            <div className="p-4 rounded-2xl glass-card">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5" /> Evolução NPS
                    </h3>
                    <span className={`text-xs font-bold ${trendColor}`}>{trendLabel}</span>
                </div>

                {/* Sparkline bars */}
                <div className="flex items-end gap-1 h-12">
                    {data.map((d, i) => {
                        const height = d.count > 0 ? Math.max((d.avg / 10) * 100, 10) : 5;
                        const color = d.avg >= 9 ? "bg-emerald-400"
                            : d.avg >= 7 ? "bg-yellow-400"
                                : d.avg > 0 ? "bg-rose-400"
                                    : "bg-muted/30";
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                {d.count > 0 && (
                                    <span className="text-[9px] font-bold text-muted-foreground">{d.avg}</span>
                                )}
                                <div
                                    className={`w-full rounded-t-sm ${color} transition-all`}
                                    style={{ height: `${height}%`, minHeight: "2px", opacity: d.count > 0 ? 1 : 0.2 }}
                                />
                                <span className="text-[8px] text-muted-foreground">{d.week}</span>
                            </div>
                        );
                    })}
                </div>

                <p className="text-[10px] text-muted-foreground mt-2">
                    {filledWeeks.length} semana(s) com respostas · Total: {data.reduce((a, d) => a + d.count, 0)} avaliações
                </p>
            </div>
        </section>
    );
}
