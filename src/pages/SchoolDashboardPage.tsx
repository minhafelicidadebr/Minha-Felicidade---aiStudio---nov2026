// UX-3 — Painel escolar autenticado (`/escola/:schoolId`).
//
// D33/D43: `/escolas` continua sendo a landing PÚBLICA de aquisição. Este painel
// vive no singular justamente para não colidir com ela nem depender de
// precedência de rota.
//
// A autorização real é do servidor (`can_read_school` dentro de
// `get_school_metrics`). O guard de rota barra o papel errado, mas não sabe se
// ESTA escola pertence à rede da pessoa — só o banco sabe.

import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Bot, Building2, Dumbbell, Flame, School, Users } from "lucide-react";
import RoleAwareAppShell from "@/components/dashboard/RoleAwareAppShell";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardErrorState from "@/components/dashboard/DashboardErrorState";
import ChartFrame from "@/components/dashboard/ChartFrame";
import GlobalFilterBar from "@/components/dashboard/GlobalFilterBar";
import PrivacyIndicator from "@/components/dashboard/PrivacyIndicator";
import SuppressedValue from "@/components/dashboard/SuppressedValue";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
    DASHBOARD_PERIOD_DESCRIPTION,
    DEFAULT_DASHBOARD_PERIOD,
    type DashboardPeriod,
} from "@/config/dashboard-filters";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSchoolMetrics } from "@/hooks/useSchoolMetrics";
import { isValidSchoolId } from "@/lib/role-home";
import { describeThreshold, isSuppressed, toExportCell } from "@/lib/metric-privacy";

const TITLE = "Painel da escola";

const chartConfig = {
    atividade: { label: "Atividade", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const TOTAL_CARDS = [
    { key: "sessions" as const, label: "Sessões", icon: Flame },
    { key: "exercises" as const, label: "Exercícios", icon: Dumbbell },
    { key: "ai" as const, label: "Interações IA", icon: Bot },
    { key: "active_7d" as const, label: "Ativos (7 dias)", icon: Users },
] as const;

export default function SchoolDashboardPage() {
    const { schoolId } = useParams<{ schoolId: string }>();
    const [period, setPeriod] = useState<DashboardPeriod>(DEFAULT_DASHBOARD_PERIOD);
    const { organizations, roleHomePath } = useDashboardContext();

    // Id malformado não gera chamada de rede (contrato §2 item 7): passar `null`
    // desabilita a query e a pessoa vai direto ao estado de acesso negado.
    const validId = isValidSchoolId(schoolId) ? schoolId! : null;
    const { metrics, isLoading, isError, isDenied, error, refetch } = useSchoolMetrics(validId, period);

    const organizationName = useMemo(
        () => organizations.find((o) => o.id === metrics?.organization_id)?.name ?? null,
        [organizations, metrics],
    );

    const filters = <GlobalFilterBar period={period} onPeriodChange={setPeriod} />;

    // ── Id inválido ou acesso negado: mesma resposta, para não servir de sonda ──
    if (!validId || isDenied) {
        return (
            <RoleAwareAppShell title={TITLE} subtitle="Acesso restrito">
                <DashboardEmptyState
                    variant="denied"
                    title="Escola fora do seu escopo"
                    description="A escola solicitada não está disponível para esta conta."
                    hint="Se você deveria ter acesso, peça à gestão da rede para vincular sua conta a esta escola."
                    icon={School}
                    action={{ label: "Voltar ao meu painel", to: roleHomePath }}
                />
            </RoleAwareAppShell>
        );
    }

    if (isLoading) {
        return (
            <RoleAwareAppShell title={TITLE} subtitle="Carregando…" filters={filters}>
                <DashboardSkeleton
                    variant="page"
                    label={`Carregando indicadores da escola — ${DASHBOARD_PERIOD_DESCRIPTION[period]}`}
                />
            </RoleAwareAppShell>
        );
    }

    if (isError || !metrics) {
        return (
            <RoleAwareAppShell title={TITLE} subtitle="Indicadores da escola" filters={filters}>
                <DashboardErrorState
                    title="Não conseguimos carregar os indicadores desta escola"
                    description="A falha é na leitura dos indicadores. Nada foi alterado nos dados da escola."
                    detail={error?.message ?? null}
                    onRetry={refetch}
                />
            </RoleAwareAppShell>
        );
    }

    const thresholdLabel = describeThreshold(metrics.minimum_group_size);

    const seriesRows = metrics.series.map((point) => ({
        day: point.day,
        atividade: toExportCell(point.group),
    }));

    // Ponto suprimido vira lacuna (null), nunca zero interpolado: uma linha
    // caindo a zero contaria uma história que o dado não sustenta.
    const chartData = metrics.series.map((point) => ({
        day: point.day.slice(5),
        atividade: isSuppressed(point.group) ? null : point.group.value,
    }));

    return (
        <RoleAwareAppShell
            title={TITLE}
            subtitle={organizationName ? `Rede: ${organizationName}` : "Indicadores da escola"}
            filters={filters}
        >
            {/* Universo elegível abaixo do limiar: a escola PERMANECE visível
          como entidade operacional (§D5/D53). Só o analytics de estudante sai. */}
            {metrics.analytics_suppressed && (
                <DashboardEmptyState
                    variant="empty"
                    title="Amostra insuficiente para exibição segura"
                    description={`Esta escola tem menos de ${metrics.minimum_group_size} participantes elegíveis no período, então os indicadores de atividade dos estudantes não são exibidos.`}
                    hint="Os dados operacionais da escola — turmas, convites e pendências — continuam disponíveis na visão da rede."
                    icon={School}
                    className="mb-6"
                />
            )}

            <section className="mb-8" aria-labelledby="school-totals">
                <h2
                    id="school-totals"
                    className="mb-3 text-sm font-display font-bold uppercase tracking-wider text-muted-foreground"
                >
                    Atividade agregada
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {TOTAL_CARDS.map((card) => {
                        const Icon = card.icon;
                        return (
                            <article
                                key={card.key}
                                className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/60 p-4"
                                data-testid="school-metric-card"
                            >
                                <header className="flex items-center gap-2">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-primary">
                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                    <h3 className="truncate text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {card.label}
                                    </h3>
                                </header>

                                <SuppressedValue group={metrics.totals[card.key]} />

                                <p className="text-[11px] text-muted-foreground">
                                    {DASHBOARD_PERIOD_DESCRIPTION[metrics.period]}
                                </p>
                                <p className="text-[10px] text-muted-foreground/80">
                                    Fonte: RPC <code>get_school_metrics</code> · Limitação: mede uso da
                                    plataforma, não bem-estar.
                                </p>
                            </article>
                        );
                    })}
                </div>
                <PrivacyIndicator
                    scope="threshold"
                    minimumGroupSize={metrics.minimum_group_size}
                    updatedAt={metrics.generated_at}
                    period={DASHBOARD_PERIOD_DESCRIPTION[metrics.period]}
                    className="mt-3"
                />
            </section>

            <section className="mb-8" aria-labelledby="school-classes">
                <h2
                    id="school-classes"
                    className="mb-3 text-sm font-display font-bold uppercase tracking-wider text-muted-foreground"
                >
                    Turmas
                </h2>
                {metrics.classes.length === 0 ? (
                    <DashboardEmptyState
                        variant="empty"
                        title="Sem turmas com indicador no período"
                        description="Turmas aparecem aqui quando têm participantes suficientes e atividade registrada."
                        icon={Building2}
                    />
                ) : (
                    <ul className="space-y-2">
                        {metrics.classes.map((item) => (
                            <li
                                key={item.key}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-card/60 p-3"
                            >
                                <span className="text-sm font-medium">{item.label}</span>
                                <SuppressedValue group={item.group} className="text-right" />
                            </li>
                        ))}
                    </ul>
                )}
                <p className="mt-2 text-[10px] text-muted-foreground/80">{thresholdLabel}.</p>
            </section>

            <ChartFrame
                title="Atividade por dia"
                description={`Eventos de atividade por dia na escola, ${DASHBOARD_PERIOD_DESCRIPTION[metrics.period]}. Dias com menos de ${metrics.minimum_group_size} participantes aparecem como amostra insuficiente, sem valor.`}
                columns={[
                    { key: "day", label: "Dia" },
                    { key: "atividade", label: "Atividade", numeric: true },
                ]}
                rows={seriesRows}
                period={DASHBOARD_PERIOD_DESCRIPTION[metrics.period]}
                updatedAt={metrics.generated_at}
                privacyScope="threshold"
                minimumGroupSize={metrics.minimum_group_size}
                footnote="Pontos suprimidos aparecem como lacuna no gráfico — nunca como zero."
            >
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        {/* connectNulls={false}: a lacuna precisa APARECER como lacuna. */}
                        <Line
                            type="monotone"
                            dataKey="atividade"
                            stroke="var(--color-atividade)"
                            strokeWidth={2}
                            dot={{ r: 2 }}
                            connectNulls={false}
                        />
                    </LineChart>
                </ChartContainer>
            </ChartFrame>
        </RoleAwareAppShell>
    );
}
