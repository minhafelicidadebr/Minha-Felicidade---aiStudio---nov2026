import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WeeklyDataPoint {
    week: string; // "Sem 1", "Sem 2"...
    sessions: number;
    exercises: number;
    aiInteractions: number;
}

interface Props {
    organizationId: string;
}

/**
 * Line chart showing weekly engagement evolution over the pilot period.
 * SVG-based (no external charting library). Progressive disclosure design.
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

    if (loading) return null;
    if (data.length === 0 || data.every(d => d.sessions === 0 && d.exercises === 0 && d.aiInteractions === 0)) {
        return null; // No data yet
    }

    const maxVal = Math.max(
        ...data.map(d => Math.max(d.sessions, d.exercises, d.aiInteractions)),
        1
    );

    const chartW = 320;
    const chartH = 120;
    const padX = 30;
    const padY = 15;
    const innerW = chartW - padX * 2;
    const innerH = chartH - padY * 2;

    const toX = (i: number) => padX + (i / (data.length - 1)) * innerW;
    const toY = (val: number) => padY + innerH - (val / maxVal) * innerH;

    const makePath = (key: keyof Pick<WeeklyDataPoint, "sessions" | "exercises" | "aiInteractions">) => {
        return data.map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d[key])}`).join(" ");
    };

    const lines = [
        { key: "sessions" as const, color: "#f97316", label: "Sessões" },
        { key: "exercises" as const, color: "#34d399", label: "Exercícios" },
        { key: "aiInteractions" as const, color: "#8b5cf6", label: "IA" },
    ];

    return (
        <section className="mt-6">
            <h3 className="text-sm font-display font-bold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Evolução semanal
            </h3>
            <div className="p-5 rounded-2xl glass-card">
                {/* Legend */}
                <div className="flex items-center gap-4 mb-3">
                    {lines.map((l) => (
                        <div key={l.key} className="flex items-center gap-1.5">
                            <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: l.color, display: "inline-block" }} />
                            <span className="text-[10px] text-muted-foreground">{l.label}</span>
                        </div>
                    ))}
                </div>

                {/* SVG Chart */}
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-32" preserveAspectRatio="xMidYMid meet">
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                        <line
                            key={ratio}
                            x1={padX}
                            y1={padY + innerH * (1 - ratio)}
                            x2={padX + innerW}
                            y2={padY + innerH * (1 - ratio)}
                            stroke="currentColor"
                            strokeOpacity={0.1}
                            strokeDasharray="2,3"
                        />
                    ))}

                    {/* Lines */}
                    {lines.map((l) => (
                        <path
                            key={l.key}
                            d={makePath(l.key)}
                            fill="none"
                            stroke={l.color}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    ))}

                    {/* Dots */}
                    {lines.map((l) =>
                        data.map((d, i) => (
                            <circle
                                key={`${l.key}-${i}`}
                                cx={toX(i)}
                                cy={toY(d[l.key])}
                                r="3"
                                fill={l.color}
                                opacity={d[l.key] > 0 ? 1 : 0.3}
                            />
                        ))
                    )}

                    {/* X labels */}
                    {data.map((d, i) => (
                        <text
                            key={i}
                            x={toX(i)}
                            y={chartH - 2}
                            textAnchor="middle"
                            fontSize="7"
                            fill="currentColor"
                            opacity={0.4}
                        >
                            {d.week}
                        </text>
                    ))}

                    {/* Y max label */}
                    <text x={padX - 4} y={padY + 3} textAnchor="end" fontSize="7" fill="currentColor" opacity={0.4}>
                        {maxVal}
                    </text>
                    <text x={padX - 4} y={padY + innerH + 3} textAnchor="end" fontSize="7" fill="currentColor" opacity={0.4}>
                        0
                    </text>
                </svg>

                <p className="text-[10px] text-muted-foreground mt-2">
                    Últimas 8 semanas · Dados agregados sem identificação individual
                </p>
            </div>
        </section>
    );
}
