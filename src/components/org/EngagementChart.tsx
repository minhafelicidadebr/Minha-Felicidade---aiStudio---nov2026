import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import ChartFrame from "@/components/dashboard/ChartFrame";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardErrorState from "@/components/dashboard/DashboardErrorState";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useOrgAnalyticsSeries } from "@/hooks/useOrgAnalytics";
import { isSuppressed, type MetricGroup } from "@/lib/metric-privacy";

interface Props { organizationId: string }
interface WeeklyDataPoint { week: string; sessions: number | null; exercises: number | null; aiInteractions: number | null }

const chartConfig = {
    sessions: { label: "Sessões", color: "#f97316" },
    exercises: { label: "Exercícios", color: "#34d399" },
    aiInteractions: { label: "Interações IA", color: "#8b5cf6" },
} satisfies ChartConfig;

const chartValue = (group: MetricGroup) => isSuppressed(group) ? null : group.value;
const tableValue = (group: MetricGroup) => isSuppressed(group) ? "Amostra insuficiente" : group.value;

export default function EngagementChart({ organizationId }: Props) {
    const query = useOrgAnalyticsSeries(organizationId);

    if (query.isLoading) {
        return <section className="mt-6"><DashboardSkeleton variant="chart" label="Carregando gráfico de engajamento" /></section>;
    }
    if (query.isError || !query.data) {
        return (
            <section className="mt-6">
                <DashboardErrorState title="Não foi possível carregar a evolução semanal"
                    detail={query.error instanceof Error ? query.error.message : undefined}
                    onRetry={() => void query.refetch()} />
            </section>
        );
    }

    const source = query.data.engagement;
    const groups = source.flatMap((row) => [row.sessions, row.exercises, row.ai_interactions]);
    const hasSuppressed = groups.some(isSuppressed);
    const hasActivity = groups.some((group) => !isSuppressed(group) && group.value > 0);

    if (!hasActivity && !hasSuppressed) {
        return (
            <section className="mt-6">
                <DashboardEmptyState variant="empty" title="Sem dados de engajamento semanal"
                    description="O gráfico aparecerá aqui quando houver atividade registrada nas últimas 8 semanas." icon={TrendingUp} />
            </section>
        );
    }

    const data: WeeklyDataPoint[] = source.map((row) => ({
        week: row.bucket_start.slice(5),
        sessions: chartValue(row.sessions),
        exercises: chartValue(row.exercises),
        aiInteractions: chartValue(row.ai_interactions),
    }));
    const tableRows = source.map((row) => ({
        week: row.bucket_start.slice(5),
        sessions: tableValue(row.sessions),
        exercises: tableValue(row.exercises),
        aiInteractions: tableValue(row.ai_interactions),
    }));
    const tableColumns = [
        { key: "week", label: "Semana" },
        { key: "sessions", label: "Sessões", numeric: true },
        { key: "exercises", label: "Exercícios", numeric: true },
        { key: "aiInteractions", label: "Interações IA", numeric: true },
    ];

    return (
        <section className="mt-6">
            {hasSuppressed && (
                <p role="status" className="mb-2 text-xs text-muted-foreground">
                    Alguns pontos mostram “Amostra insuficiente” porque não atingiram o limiar mínimo de {query.data.minimum_group_size} contribuidores.
                </p>
            )}
            <ChartFrame title="Evolução semanal"
                description="Sessões, exercícios e interações com IA por semana. Pontos abaixo do limiar não trafegam com valor."
                columns={tableColumns} rows={tableRows} period="últimas 8 semanas"
                updatedAt={query.data.generated_at} privacyScope="threshold"
                minimumGroupSize={query.data.minimum_group_size}
                footnote="Eventos: session_start, exercise/quiz/dynamic/flashcard_complete e ai_interaction">
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} className="fill-muted-foreground" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="sessions" connectNulls={false} stroke="var(--color-sessions)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="exercises" connectNulls={false} stroke="var(--color-exercises)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="aiInteractions" connectNulls={false} stroke="var(--color-aiInteractions)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                </ChartContainer>
            </ChartFrame>
        </section>
    );
}
