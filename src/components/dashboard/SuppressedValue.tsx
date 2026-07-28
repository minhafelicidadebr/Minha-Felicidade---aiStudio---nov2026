// UX-3 — Exibição de valor suprimido (§D5–§D7).
//
// Existe para que nenhuma tela improvise o texto de supressão. Três estados
// precisam ser textualmente DISTINTOS — suprimido, vazio e falha —, e um
// improviso por tela faria o gestor ler "0" onde a resposta correta é
// "não sabemos" ou "ninguém participou".
//
// A distinção nunca depende só de cor: cada estado tem ícone + texto.

import { EyeOff, Minus, ShieldAlert } from "lucide-react";
import {
    EMPTY_GROUP_TEXT,
    READ_FAILURE_TEXT,
    describeSuppression,
    isSuppressed,
    type MetricGroup,
} from "@/lib/metric-privacy";
import { cn } from "@/lib/utils";

interface SuppressedValueProps {
    group: MetricGroup;
    className?: string;
}

/**
 * Renderiza o valor OU o motivo da ausência.
 *
 * Nunca renderiza `0` para grupo suprimido: o zero fabricado é o erro que a
 * doutrina §1 e a decisão D45 proíbem.
 */
export default function SuppressedValue({ group, className }: SuppressedValueProps) {
    if (isSuppressed(group)) {
        const Icon = group.reason === "complementary" ? ShieldAlert : EyeOff;
        return (
            <span
                className={cn("inline-flex items-start gap-1.5 text-xs text-muted-foreground", className)}
                data-testid="suppressed-value"
                data-suppression-reason={group.reason}
            >
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                    {describeSuppression(group)}
                    <span className="sr-only">
                        {` Limiar mínimo de ${group.minimumGroupSize} pessoas por grupo.`}
                    </span>
                </span>
            </span>
        );
    }

    if (group.isEmpty) {
        return (
            <span
                className={cn("inline-flex items-baseline gap-2", className)}
                data-testid="empty-group-value"
            >
                <span className="font-display text-2xl font-bold leading-none">0</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Minus className="h-3 w-3" aria-hidden="true" />
                    {EMPTY_GROUP_TEXT}
                </span>
            </span>
        );
    }

    return (
        <span className={cn("font-display text-2xl font-bold leading-none", className)}>
            {group.value.toLocaleString("pt-BR")}
        </span>
    );
}

/** Texto de falha de leitura, distinto dos dois estados acima. */
export function ReadFailureValue({ className }: { className?: string }) {
    return (
        <span
            className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}
            data-testid="read-failure-value"
        >
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {READ_FAILURE_TEXT}
        </span>
    );
}
