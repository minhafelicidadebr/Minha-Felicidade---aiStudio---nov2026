// UX-3 — Política de reenvio de convite (§D8/D56).
//
// AUTORIDADE: o servidor. `public.resend_invitation` decide e nega. Este módulo
// existe para que a interface possa DESABILITAR o botão e EXPLICAR o motivo
// antes de gastar uma ida ao banco — não para autorizar.
//
// Diferente do limiar de privacidade (que o cliente nunca conhece), aqui os
// números precisam aparecer na tela: §D8 manda declarar o limite aplicado e as
// alternativas. Para que servidor e cliente não divirjam em silêncio, há teste
// que compara estas constantes com o SQL da migration.
//
// Por que o rigor: o reenvio dispara e-mail que pode chegar a um adolescente.

/** Reenvios permitidos ALÉM do envio inicial. */
export const MAX_RESENDS = 3;

/** Intervalo mínimo entre reenvios, em horas. */
export const RESEND_COOLDOWN_HOURS = 24;

export interface InvitationResendState {
    /** Reenvios já concluídos para este destinatário nesta organização. */
    readonly resendsSoFar: number;
    /** ISO do último reenvio bem-sucedido, ou null. */
    readonly lastResendAt: string | null;
    readonly acceptedAt: string | null;
    readonly revokedAt: string | null;
    readonly expiresAt: string;
}

export type ResendBlockReason =
    | "already_accepted"
    | "revoked"
    | "expired"
    | "limit_reached"
    | "cooldown";

export type ResendDecision =
    | { allowed: true; resendNumber: number; remaining: number }
    | { allowed: false; reason: ResendBlockReason; retryAfter: string | null };

/**
 * Avalia se o reenvio é permitido.
 *
 * Ordem das checagens é deliberada: estados terminais (aceito, revogado,
 * expirado) vêm antes de limite e janela, porque para eles a resposta não é
 * "espere", é "não faz mais sentido".
 */
export function evaluateResend(
    state: InvitationResendState,
    now: Date = new Date(),
): ResendDecision {
    if (state.acceptedAt) return { allowed: false, reason: "already_accepted", retryAfter: null };
    if (state.revokedAt) return { allowed: false, reason: "revoked", retryAfter: null };

    if (new Date(state.expiresAt).getTime() <= now.getTime()) {
        return { allowed: false, reason: "expired", retryAfter: null };
    }

    if (state.resendsSoFar >= MAX_RESENDS) {
        return { allowed: false, reason: "limit_reached", retryAfter: null };
    }

    if (state.lastResendAt) {
        const nextAllowed = new Date(
            new Date(state.lastResendAt).getTime() + RESEND_COOLDOWN_HOURS * 3_600_000,
        );
        if (nextAllowed.getTime() > now.getTime()) {
            return { allowed: false, reason: "cooldown", retryAfter: nextAllowed.toISOString() };
        }
    }

    return {
        allowed: true,
        resendNumber: state.resendsSoFar + 1,
        remaining: MAX_RESENDS - (state.resendsSoFar + 1),
    };
}

/**
 * Texto do bloqueio, com as alternativas que §D8 manda oferecer.
 * Nunca promete que o e-mail chegou — só descreve o estado.
 */
export function describeResendBlock(reason: ResendBlockReason): string {
    switch (reason) {
        case "already_accepted":
            return "Este convite já foi aceito.";
        case "revoked":
            return "Este convite foi revogado.";
        case "expired":
            return "Este convite expirou. Emita um novo convite, se for permitido.";
        case "limit_reached":
            return `Limite de ${MAX_RESENDS} reenvios atingido para esta pessoa nesta rede. Aguarde a expiração, emita um novo convite quando permitido, ou use outro canal institucional de contato.`;
        case "cooldown":
            return `É preciso aguardar ${RESEND_COOLDOWN_HOURS} horas entre reenvios.`;
    }
}
