import { Star } from "lucide-react";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardErrorState from "@/components/dashboard/DashboardErrorState";
import { useOrgAnalyticsSeries } from "@/hooks/useOrgAnalytics";
import { describeSuppression, isEmptyGroup, isSuppressed } from "@/lib/metric-privacy";

interface Props { userId: string | null; organizationId: string }

export default function NpsEvolution({ userId, organizationId }: Props) {
    const query = useOrgAnalyticsSeries(userId, organizationId);

    if (query.isLoading) {
        return <section className="mt-4"><DashboardSkeleton variant="chart" label="Carregando evolução NPS" /></section>;
    }
    if (query.isError || !query.data) {
        return (
            <section className="mt-4">
                <DashboardErrorState
                    title="Não foi possível carregar a evolução NPS"
                    detail={query.error instanceof Error ? query.error.message : undefined}
                    onRetry={() => void query.refetch()}
                />
            </section>
        );
    }

    const rows = query.data.nps;
    const disclosedValues = rows.flatMap((row) =>
        isSuppressed(row.group) || isEmptyGroup(row.group) ? [] : [row.group.value],
    );
    const disclosedCount = disclosedValues.length;
    const suppressed = rows.filter((row) => isSuppressed(row.group));

    if (disclosedCount === 0 && suppressed.length === 0) {
        return (
            <section className="mt-4">
                <DashboardEmptyState variant="empty" title="Sem dados de NPS"
                    description="As respostas NPS aparecerão aqui quando os alunos avaliarem a plataforma." icon={Star} />
            </section>
        );
    }

    const trend = disclosedCount >= 2
        ? disclosedValues.at(-1)! - disclosedValues[0]
        : 0;
    const trendLabel = trend > 0.5 ? "↑ melhorando" : trend < -0.5 ? "↓ atenção" : "→ estável";
    const trendColor = trend > 0.5 ? "text-emerald-400" : trend < -0.5 ? "text-rose-400" : "text-yellow-400";

    return (
        <section className="mt-4">
            <div className="rounded-2xl p-4 glass-card">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <Star className="h-3.5 w-3.5" /> Evolução NPS
                    </h3>
                    <span className={`text-xs font-bold ${trendColor}`}>{trendLabel}</span>
                </div>

                {disclosedCount === 0 && suppressed.length > 0 && (
                    <p role="status" className="mb-3 text-xs text-muted-foreground">
                        Amostra insuficiente para exibição segura. Limiar mínimo de {query.data.minimum_group_size} participantes por semana.
                    </p>
                )}

                <div className="flex h-16 items-end gap-1" aria-label="Evolução semanal de NPS com supressão por contribuidores">
                    {rows.map((row) => {
                        const empty = isEmptyGroup(row.group);
                        const value = isSuppressed(row.group) || empty ? null : row.group.value;
                        const height = value === null ? 5 : Math.max((value / 10) * 100, 10);
                        const color = value === null ? "bg-muted/30"
                            : value >= 9 ? "bg-emerald-400" : value >= 7 ? "bg-yellow-400" : "bg-rose-400";
                        const label = row.bucket_start.slice(5);
                        const aria = isSuppressed(row.group)
                            ? `${label}: ${describeSuppression(row.group)}`
                            : empty ? `${label}: sem respostas` : `${label}: média ${value}`;
                        return (
                            <div key={row.bucket_start} className="flex flex-1 flex-col items-center gap-0.5" aria-label={aria}>
                                {value !== null && <span className="text-[9px] font-bold text-muted-foreground">{value}</span>}
                                <div className={`w-full rounded-t-sm ${color}`} style={{ height: `${height}%`, minHeight: "2px", opacity: value === null ? 0.25 : 1 }} />
                                <span className="text-[8px] text-muted-foreground">{label}</span>
                            </div>
                        );
                    })}
                </div>

                <p className="mt-2 text-[10px] text-muted-foreground">
                    {disclosedCount} semana(s) divulgada(s)
                    {suppressed.length > 0 ? ` · ${suppressed.length} protegida(s) pelo limiar` : ""}
                </p>
            </div>
        </section>
    );
}
