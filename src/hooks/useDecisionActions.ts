// UX-3 — Execução das ações da fila de decisões contra o servidor.
//
// Autoridade é do banco: `resend_invitation` e `escalate_indicator` resolvem
// papel e organização a partir da identidade autenticada e negam alvo fora do
// escopo. Este hook apenas TRADUZ o resultado nos três desfechos que a interface
// precisa distinguir.
//
// Por que a tradução importa: o Postgres devolve `42501` para "sem permissão" e
// `22023` para "violação de regra" (limite, janela, convite expirado). Tratar os
// dois como "falhou" faria o gestor repetir um reenvio que nunca vai passar.

import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DecisionActionOutcome } from "@/components/dashboard/DecisionQueue";

/** `42501` = insufficient_privilege no Postgres. */
const DENIED_CODE = "42501";
/** `22023` = invalid_parameter_value — usado para limite/janela/estado. */
const RULE_CODE = "22023";

interface PostgrestLikeError {
    code?: string;
    message?: string;
}

function toOutcome(error: PostgrestLikeError | null, successMessage: string): DecisionActionOutcome {
    if (!error) return { status: "succeeded", message: successMessage };

    const message = error.message ?? "Falha desconhecida.";

    if (error.code === DENIED_CODE) {
        return {
            status: "denied",
            message: "Sua conta não tem permissão para esta ação nesta organização. Nada foi alterado.",
        };
    }

    if (error.code === RULE_CODE) {
        // Regra de negócio recusou (limite de reenvio, janela de 24 h, convite
        // expirado). Não é falha técnica nem falta de permissão.
        return { status: "denied", message: `${message} Nada foi alterado.` };
    }

    return { status: "failed", message: `${message} Nada foi alterado.` };
}

export interface UseDecisionActionsResult {
    /**
     * Reenvia um ou mais convites. Cada convite é avaliado pelo servidor
     * separadamente, porque o limite de 3 reenvios e a janela de 24 h valem por
     * destinatário — um bloqueado não deve impedir os demais.
     */
    resendInvitations: (invitationIds: string[]) => Promise<DecisionActionOutcome>;
    escalateIndicator: (input: {
        organizationId: string;
        schoolId?: string | null;
        indicator: string;
        severity?: "info" | "warning" | "critical";
    }) => Promise<DecisionActionOutcome>;
}

export function useDecisionActions(): UseDecisionActionsResult {
    const resendInvitations = useCallback(
        async (invitationIds: string[]): Promise<DecisionActionOutcome> => {
            if (invitationIds.length === 0) {
                return { status: "failed", message: "Nenhum convite selecionado. Nada foi alterado." };
            }

            if (invitationIds.length === 1) {
                const { error } = await supabase.rpc("resend_invitation", {
                    _invitation_id: invitationIds[0],
                });
                return toOutcome(error, "Convite reenviado.");
            }

            // Lote: relata quantos passaram e quantos foram recusados, em vez de
            // esconder o resultado parcial atrás de um "ok" genérico.
            const results = await Promise.all(
                invitationIds.map((id) =>
                    supabase.rpc("resend_invitation", { _invitation_id: id }).then((r) => r.error),
                ),
            );

            const sent = results.filter((error) => !error).length;
            const blocked = results.length - sent;

            if (sent === 0) {
                const first = results.find(Boolean) as PostgrestLikeError | undefined;
                return toOutcome(
                    first ?? { message: "Nenhum reenvio foi aceito." },
                    "Convites reenviados.",
                );
            }

            return {
                status: "succeeded",
                message:
                    blocked === 0
                        ? `${sent} ${sent === 1 ? "convite reenviado" : "convites reenviados"}.`
                        : `${sent} reenviado(s); ${blocked} recusado(s) pelo limite de 3 reenvios ou pela janela de 24 horas.`,
            };
        },
        [],
    );

    const escalateIndicator = useCallback(
        async (input: {
            organizationId: string;
            schoolId?: string | null;
            indicator: string;
            severity?: "info" | "warning" | "critical";
        }): Promise<DecisionActionOutcome> => {
            const { error } = await supabase.rpc("escalate_indicator", {
                _organization_id: input.organizationId,
                _school_id: input.schoolId ?? null,
                _indicator: input.indicator,
                _severity: input.severity ?? "warning",
            });
            return toOutcome(error, "Pendência escalada e registrada no histórico de decisões.");
        },
        [],
    );

    return { resendInvitations, escalateIndicator };
}

/** Exportado para teste: a tradução de erro é a parte com risco de regressão. */
export const __testing = { toOutcome, DENIED_CODE, RULE_CODE };
