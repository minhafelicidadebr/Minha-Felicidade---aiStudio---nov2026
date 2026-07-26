// UX-1 — Indicador de privacidade e de atualização (freshness).
// Contrato §6 (privacidade) + §5 (toda métrica informa atualização).
//
// Honestidade: o rótulo descreve o que o dado É (agregado, com limiar mínimo),
// não promete conformidade legal. Interpretação jurídica é de humanos.

import { Clock, ShieldCheck, Users } from "lucide-react";
import { formatFreshness, type PrivacyScope } from "@/lib/dashboard-format";
import { cn } from "@/lib/utils";

interface PrivacyIndicatorProps {
    scope?: PrivacyScope;
    /** Limiar mínimo de agregação (N). Só usado quando scope="threshold". */
    minimumGroupSize?: number;
    /** ISO timestamp da última leitura dos dados. */
    updatedAt?: string | null;
    /** Período coberto pelos dados (ex.: "últimos 30 dias"). */
    period?: string;
    className?: string;
}

const SCOPE_COPY: Record<PrivacyScope, string> = {
    aggregate: "Dados agregados, sem identificação individual",
    threshold: "Agregado com limiar mínimo por grupo",
    nominal: "Contém identificação — visível apenas a papéis autorizados",
};

export default function PrivacyIndicator({
    scope = "aggregate",
    minimumGroupSize,
    updatedAt,
    period,
    className,
}: PrivacyIndicatorProps) {
    const ScopeIcon = scope === "nominal" ? Users : ShieldCheck;
    const scopeLabel =
        scope === "threshold" && minimumGroupSize
            ? `Agregado com limiar mínimo de ${minimumGroupSize} pessoas por grupo`
            : SCOPE_COPY[scope];

    return (
        <div
            className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground",
                className,
            )}
            data-testid="privacy-indicator"
        >
            <span className="inline-flex items-center gap-1.5">
                <ScopeIcon
                    className={cn("h-3.5 w-3.5", scope === "nominal" ? "text-secondary" : "text-success")}
                    aria-hidden="true"
                />
                {scopeLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {period ? `${period} · ` : ""}
                {formatFreshness(updatedAt)}
            </span>
        </div>
    );
}
