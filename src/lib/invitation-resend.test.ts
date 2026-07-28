import { describe, expect, it } from "vitest";
import {
    MAX_RESENDS,
    RESEND_COOLDOWN_HOURS,
    describeResendBlock,
    evaluateResend,
    type InvitationResendState,
} from "./invitation-resend";

const NOW = new Date("2026-07-27T12:00:00.000Z");

function state(overrides: Partial<InvitationResendState> = {}): InvitationResendState {
    return {
        resendsSoFar: 0,
        lastResendAt: null,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: "2026-08-27T12:00:00.000Z",
        ...overrides,
    };
}

describe("condições de elegibilidade do reenvio", () => {
    it("permite o primeiro reenvio de convite pendente e válido", () => {
        const decision = evaluateResend(state(), NOW);
        expect(decision.allowed).toBe(true);
        if (decision.allowed) {
            expect(decision.resendNumber).toBe(1);
            expect(decision.remaining).toBe(2);
        }
    });

    it("nega convite já aceito", () => {
        const decision = evaluateResend(state({ acceptedAt: "2026-07-20T10:00:00.000Z" }), NOW);
        expect(decision).toMatchObject({ allowed: false, reason: "already_accepted" });
    });

    it("nega convite revogado", () => {
        const decision = evaluateResend(state({ revokedAt: "2026-07-21T10:00:00.000Z" }), NOW);
        expect(decision).toMatchObject({ allowed: false, reason: "revoked" });
    });

    it("nega convite expirado", () => {
        const decision = evaluateResend(state({ expiresAt: "2026-07-26T12:00:00.000Z" }), NOW);
        expect(decision).toMatchObject({ allowed: false, reason: "expired" });
    });

    it("prioriza estado terminal sobre janela de espera", () => {
        // Aceito E dentro da janela: a resposta útil é "já aceitou", não "espere".
        const decision = evaluateResend(
            state({ acceptedAt: "2026-07-26T12:00:00.000Z", lastResendAt: "2026-07-27T11:00:00.000Z" }),
            NOW,
        );
        expect(decision).toMatchObject({ allowed: false, reason: "already_accepted" });
    });
});

// ── Quarto reenvio (teste exigido pelo humano) ───────────────────────────────
describe("quarto reenvio", () => {
    it("permite o terceiro reenvio e nega o quarto", () => {
        const third = evaluateResend(
            state({ resendsSoFar: 2, lastResendAt: "2026-07-25T12:00:00.000Z" }),
            NOW,
        );
        expect(third.allowed).toBe(true);
        if (third.allowed) {
            expect(third.resendNumber).toBe(3);
            expect(third.remaining).toBe(0);
        }

        const fourth = evaluateResend(
            state({ resendsSoFar: 3, lastResendAt: "2026-07-25T12:00:00.000Z" }),
            NOW,
        );
        expect(fourth).toMatchObject({ allowed: false, reason: "limit_reached" });
    });

    it("nega além do quarto, sem contador negativo", () => {
        const decision = evaluateResend(state({ resendsSoFar: 9 }), NOW);
        expect(decision).toMatchObject({ allowed: false, reason: "limit_reached" });
    });

    it("explica as alternativas quando o limite é atingido", () => {
        const text = describeResendBlock("limit_reached");
        expect(text).toContain(String(MAX_RESENDS));
        expect(text).toContain("expiração");
        expect(text).toContain("outro canal");
    });
});

// ── Reenvio antes de 24 horas (teste exigido pelo humano) ────────────────────
describe("janela mínima de 24 horas", () => {
    it("nega reenvio 23h59 depois do anterior", () => {
        const decision = evaluateResend(
            state({ resendsSoFar: 1, lastResendAt: "2026-07-26T12:01:00.000Z" }),
            NOW,
        );
        expect(decision).toMatchObject({ allowed: false, reason: "cooldown" });
        if (!decision.allowed) {
            expect(decision.retryAfter).toBe("2026-07-27T12:01:00.000Z");
        }
    });

    it("permite exatamente 24h depois", () => {
        const decision = evaluateResend(
            state({ resendsSoFar: 1, lastResendAt: "2026-07-26T12:00:00.000Z" }),
            NOW,
        );
        expect(decision.allowed).toBe(true);
    });

    it("informa quando será possível tentar de novo", () => {
        const decision = evaluateResend(
            state({ resendsSoFar: 1, lastResendAt: "2026-07-27T06:00:00.000Z" }),
            NOW,
        );
        expect(decision.allowed).toBe(false);
        if (!decision.allowed) {
            expect(decision.retryAfter).toBe("2026-07-28T06:00:00.000Z");
        }
    });

    it("usa a janela declarada na política", () => {
        expect(RESEND_COOLDOWN_HOURS).toBe(24);
        expect(describeResendBlock("cooldown")).toContain("24");
    });
});
