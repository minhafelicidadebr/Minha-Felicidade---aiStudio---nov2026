import { describe, expect, it, vi } from "vitest";
import {
    ACTIVATION_EXPECTED_RANGE,
    PENDING_INVITATION_HOURS,
    buildInvitationDecisionItems,
    buildInvitationSources,
    describeRange,
    isActionableInvitation,
    isOutOfRange,
    type InvitationLike,
} from "./decision-queue-items";

const NOW = new Date("2026-07-27T12:00:00.000Z");

function invitation(overrides: Partial<InvitationLike> = {}): InvitationLike {
    return {
        id: "inv-1",
        invited_email: "pessoa@escola.edu.br",
        role: "educator",
        expires_at: "2026-08-27T12:00:00.000Z",
        accepted_at: null,
        created_at: "2026-07-01T12:00:00.000Z",
        school_id: null,
        ...overrides,
    };
}

const schools = [{ id: "school-a", name: "EMEF Esperança" }];

describe("elegibilidade do convite para a fila", () => {
    it("entra na fila quando está pendente há 168 horas ou mais", () => {
        expect(PENDING_INVITATION_HOURS).toBe(168);
        const old = invitation({ created_at: "2026-07-20T11:00:00.000Z" });
        expect(isActionableInvitation(old, NOW)).toBe(true);
    });

    it("não entra na fila quando é recente", () => {
        const recent = invitation({ created_at: "2026-07-26T12:00:00.000Z" });
        expect(isActionableInvitation(recent, NOW)).toBe(false);
    });

    it("entra na fila quando expirou, mesmo se recente", () => {
        const expired = invitation({
            created_at: "2026-07-26T12:00:00.000Z",
            expires_at: "2026-07-27T11:00:00.000Z",
        });
        expect(isActionableInvitation(expired, NOW)).toBe(true);
    });

    it("sai da fila quando é aceito", () => {
        const accepted = invitation({ accepted_at: "2026-07-25T12:00:00.000Z" });
        expect(isActionableInvitation(accepted, NOW)).toBe(false);
    });
});

describe("privacidade dos convites de estudante", () => {
    it("agrega convites de estudante por escola, sem e-mail algum", () => {
        const sources = buildInvitationSources(
            [
                invitation({ id: "s1", role: "student", invited_email: "aluno1@x.com", school_id: "school-a" }),
                invitation({ id: "s2", role: "student", invited_email: "aluno2@x.com", school_id: "school-a" }),
            ],
            schools,
            NOW,
        );

        expect(sources).toHaveLength(1);
        const [source] = sources;
        expect(source.kind).toBe("aggregated");

        const items = buildInvitationDecisionItems({
            sources,
            canResend: true,
            resend: async () => ({ status: "succeeded", message: "ok" }),
        });

        const serialized = JSON.stringify(items);
        expect(serialized).not.toContain("aluno1@x.com");
        expect(serialized).not.toContain("aluno2@x.com");
        // Identificado por papel e contagem.
        expect(items[0].title).toContain("2 convites de estudante");
        expect(items[0].title).toContain("EMEF Esperança");
    });

    it("mostra o e-mail de convite de adulto da equipe, que é o identificador do trabalho", () => {
        const sources = buildInvitationSources(
            [invitation({ role: "educator", invited_email: "prof@escola.edu.br" })],
            schools,
            NOW,
        );
        const items = buildInvitationDecisionItems({
            sources,
            canResend: true,
            resend: async () => ({ status: "succeeded", message: "ok" }),
        });
        expect(items[0].reason).toContain("prof@escola.edu.br");
    });

    it("nunca expõe e-mail de estudante mesmo sem escola vinculada", () => {
        const sources = buildInvitationSources(
            [invitation({ id: "s1", role: "student", invited_email: "aluno@x.com", school_id: null })],
            schools,
            NOW,
        );
        const items = buildInvitationDecisionItems({
            sources,
            canResend: true,
            resend: async () => ({ status: "succeeded", message: "ok" }),
        });
        expect(JSON.stringify(items)).not.toContain("aluno@x.com");
    });
});

describe("controle de ação conforme permissão", () => {
    it("mantém o item visível sem controle quando o papel não pode reenviar", () => {
        const sources = buildInvitationSources([invitation()], schools, NOW);
        const items = buildInvitationDecisionItems({
            sources,
            canResend: false,
            resend: async () => ({ status: "succeeded", message: "ok" }),
        });
        expect(items).toHaveLength(1);
        expect(items[0].mutation).toBeUndefined();
    });

    it("não oferece reenvio de convite expirado: reemitir é a ação correta", () => {
        const sources = buildInvitationSources(
            [invitation({ expires_at: "2026-07-20T12:00:00.000Z" })],
            schools,
            NOW,
        );
        const items = buildInvitationDecisionItems({
            sources,
            canResend: true,
            resend: async () => ({ status: "succeeded", message: "ok" }),
        });
        expect(items[0].mutation?.blockedReason).toContain("expirado");
    });

    it("propaga bloqueio já conhecido no cliente sem chamar o servidor", async () => {
        const resend = vi.fn(async () => ({ status: "succeeded" as const, message: "ok" }));
        const sources = buildInvitationSources([invitation()], schools, NOW);
        const items = buildInvitationDecisionItems({
            sources,
            canResend: true,
            resend,
            blockedReasonFor: () => "É preciso aguardar 24 horas entre reenvios.",
        });
        expect(items[0].mutation?.blockedReason).toContain("24 horas");
        expect(resend).not.toHaveBeenCalled();
    });

    it("prioriza convite expirado sobre convite apenas pendente", () => {
        const sources = buildInvitationSources(
            [
                invitation({ id: "a" }),
                invitation({ id: "b", expires_at: "2026-07-20T12:00:00.000Z" }),
            ],
            schools,
            NOW,
        );
        const items = buildInvitationDecisionItems({
            sources,
            canResend: true,
            resend: async () => ({ status: "succeeded", message: "ok" }),
        });
        expect(items.find((i) => i.id === "invitation:b")?.priority).toBe("high");
        expect(items.find((i) => i.id === "invitation:a")?.priority).toBe("medium");
    });
});

describe("faixa esperada do indicador", () => {
    it("declara a faixa no próprio indicador", () => {
        expect(describeRange(ACTIVATION_EXPECTED_RANGE)).toContain("60%");
        expect(describeRange(ACTIVATION_EXPECTED_RANGE)).toContain("100%");
    });

    it("detecta valor fora da faixa", () => {
        expect(isOutOfRange(40, ACTIVATION_EXPECTED_RANGE)).toBe(true);
        expect(isOutOfRange(75, ACTIVATION_EXPECTED_RANGE)).toBe(false);
        expect(isOutOfRange(60, ACTIVATION_EXPECTED_RANGE)).toBe(false);
    });
});
