import { useState, useEffect } from "react";
import { Activity, Zap, AlertTriangle, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
    organizationId: string;
}

interface Metrics {
    members_active: number;
    invitations_pending: number;
    ai_usage_today: number;
    ai_usage_7d: number;
    ai_estimated_cost_7d_brl: number;
    recent_errors_24h: number;
}

/**
 * ONDA 5 — Operational metrics section for the org dashboard.
 * Calls get_operational_metrics RPC (org_admin only).
 */
export default function OperationalMetrics({ organizationId }: Props) {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetch() {
            const { data, error } = await supabase.rpc("get_operational_metrics", {
                _organization_id: organizationId,
            });
            if (!error && data) {
                setMetrics(data as unknown as Metrics);
            }
            setLoading(false);
        }
        fetch();
    }, [organizationId]);

    if (loading || !metrics) return null;

    const items = [
        { icon: Zap, label: "IA hoje", value: metrics.ai_usage_today, suffix: "chamadas", color: "text-primary" },
        { icon: Activity, label: "IA (7 dias)", value: metrics.ai_usage_7d, suffix: "chamadas", color: "text-secondary" },
        { icon: DollarSign, label: "Custo IA (7d)", value: `R$ ${metrics.ai_estimated_cost_7d_brl}`, suffix: "estimado", color: "text-emerald-500" },
        { icon: AlertTriangle, label: "Erros (24h)", value: metrics.recent_errors_24h, suffix: "", color: metrics.recent_errors_24h > 0 ? "text-destructive" : "text-success" },
    ];

    return (
        <section className="mb-8">
            <h2 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent" /> Operação
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {items.map((item) => (
                    <div key={item.label} className="p-4 rounded-2xl glass-card">
                        <item.icon className={`w-4 h-4 ${item.color} mb-1.5`} />
                        <div className="text-xl font-display font-bold">{item.value}</div>
                        <div className="text-[11px] text-muted-foreground">{item.label}{item.suffix ? ` · ${item.suffix}` : ""}</div>
                    </div>
                ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
                💡 Custo estimado com base no uso médio de tokens por chamada. Valores reais dependem do modelo e tamanho das respostas.
            </p>
        </section>
    );
}
