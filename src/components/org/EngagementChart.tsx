import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import ChartFrame from "@/components/dashboard/ChartFrame";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

interface WeeklyDataPoint {
    week: string; // "Sem 1", "Sem 2"...
    sessions: number;
    exercises: number;
    aiInteractions: number;
}

interface Props {
    organizationId: string;
}

const chartConfig = {
    sessions: {
        label: "Sessões",
        color: "#f97316",
    },
    exercises: {
        label: "Exercícios",
        color: "#34d399",
    },
    aiInteractions: {
        label: "Interações IA",
        color: "#8b5cf6",
    },
} satisfies ChartConfig;

/**
 * Line chart showing weekly engagement evolution over the pilot period.
 * Uses Recharts + ChartFrame for accessibility (table alternative, description).
 */
export default function EngagementChart({ organizationId }: Props) {
    const [data, setData] = useState<WeeklyDataPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchWeeklyData() {
            try {
                // Fetch last 8 weeks of engagement events
                const eightWeeksAgo = new Date(Date.now() - 56 * 86400000).toISOString();
                const { data: events } = await supabase
                    .from("engagement_events")
                    .select("event_type, created_at")
                    .eq("organization_id", organizationId)
                    .gte("created_at", eightWeeksAgo)
                    .order("created_at", { ascending: true });

                if (!events || events.length === 0) {
                    setData([]);
                    setLoading(false);
                    return;
                }

                // Group by week
                const weeks: Map<number, { sessions: number; exercises: number; ai: number }> = new Map();
                const startDate = new Date(eightWeeksAgo);

                events.forEach((e) => {
                    const eventDate = new Date(e.created_at);
                    const weekNum = Math.floor((eventDate.getTime() - startDate.getTime()) / (7 * 86400000));
                    if (!weeks.has(weekNum)) weeks.set(weekNum, { sessions: 0, exercises: 0, ai: 0 });
                    const w = weeks.get(weekNum)!;
                    if (e.event_type === "session_start") w.sessions++;
                    else if (["exercise_complete", "quiz_complete", "dynamic_complete", "flashcard_session"].includes(e.event_type)) w.exercises++;
                    else if (e.event_type === "ai_interaction") w.ai++;
                });

                const points: WeeklyDataPoint[] = [];
                for (let i = 0; i < 8; i++) {
                    const w = weeks.get(i) || { sessions: 0, exercises: 0, ai: 0 };
                    points.push({
                        week: `Sem ${i + 1}`,
                        sessions: w.sessions,
                        exercises: w.exercises,
                        aiInteractions: w.ai,
                    });
                }
                setData(points);
            } catch {
                setData([]);
            } finally {
                setLoading(false);
            }
        }
        fetchWeeklyData();
    }, [organizationId]);

    if (loading) {
        return (
            <section className="mt-6">
                <DashboardSkeleton variant="chart" label="Carregando gráfico de engajamento" />
            </section>
        );
    }

    if (data.length === 0 || data.every(d => d.sessions === 0 && d.exercises === 0 && d.aiInteractions === 0)) {
        return (
            <section className="mt-6">
                <DashboardEmptyState
                    variant="empty"
                    title="Sem dados de engajamento semanal"
                    description="O gráfico de evolução aparecerá aqui quando houver atividade registrada nos últimos 56 dias."
                    icon={TrendingUp}
                />
            </section>
        );
    }

    const tableColumns = [
        { key: "week", label: "Semana" },
        { key: "sessions", label: "Sessões", numeric: true },
        { key: "exercises", label: "Exercícios", numeric: true },
        { key: "aiInteractions", label: "Interações IA", numeric: true },
    ];

    const tableRows = data.map(d => ({
        week: d.week,
        sessions: d.sessions,
        exercises: d.exercises,
        aiInteractions: d.aiInteractions,
    }));

    return (
        <section className="mt-6">
            <ChartFrame
                title="Evolução semanal"
                description="Sessões, exercícios e interações com IA por semana nas últimas 8 semanas. Dados agregados sem identificação individual."
                columns={tableColumns}
                rows={tableRows}
                period="últimas 8 semanas"
                privacyScope="aggregate"
                footnote="Eventos contabilizados: session_start, exercise/quiz/dynamic/flashcard_complete, ai_interaction"
            >
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis
                            dataKey="week"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            className="fill-muted-foreground"
                        />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            width={32}
                            className="fill-muted-foreground"
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                            type="monotone"
                            dataKey="sessions"
                            stroke="var(--color-sessions)"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="exercises"
                            stroke="var(--color-exercises)"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="aiInteractions"
                            stroke="var(--color-aiInteractions)"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                    </LineChart>
                </ChartContainer>
            </ChartFrame>
        </section>
    );
}
