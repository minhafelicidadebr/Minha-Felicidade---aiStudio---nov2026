import { describe, expect, it, vi } from "vitest";
import {
    ACTIVATION_EXPECTED_RANGE,
    PENDING_INVITATION_HOURS,
    READING_INTERVAL_DAYS,
    buildInvitationDecisionItems,
    buildInvitationSources,
    canResendInvitations,
    computeActivationRateAt,
    describeRange,
    evaluateActivationEscalation,
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

// ── D65 fechada: escalonamento exige duas leituras (R9 item 16) ──────────────
describe("escalonamento por duas leituras consecutivas", () => {
    const NOW_E = new Date("2026-07-27T12:00:00.000Z");
    const range = ACTIVATION_EXPECTED_RANGE;

    function member(createdAt: string) {
        return { created_at: createdAt, status: "active" };
    }

    function pendingInvite(id: string, createdAt: string, acceptedAt: string | null = null) {
        return invitation({
            id,
            created_at: createdAt,
            accepted_at: acceptedAt,
            expires_at: "2026-12-31T00:00:00.000Z",
        });
    }

    it("reconstrói a taxa de uma data passada contando só o que já existia", () => {
        // Há 7 dias: 1 membro, 1 convite pendente → 50%.
        // Hoje: 1 membro, 3 convites pendentes → 25%.
        const members = [member("2026-07-01T00:00:00.000Z")];
        const invitations = [
            pendingInvite("a", "2026-07-01T00:00:00.000Z"),
            pendingInvite("b", "2026-07-25T00:00:00.000Z"),
            pendingInvite("c", "2026-07-26T00:00:00.000Z"),
        ];

        expect(computeActivationRateAt(members, invitations, new Date("2026-07-20T12:00:00.000Z"))).toBe(50);
        expect(computeActivationRateAt(members, invitations, NOW_E)).toBe(25);
    });

    it("conta convite como pendente na data se só foi aceito depois", () => {
        const members = [member("2026-07-01T00:00:00.000Z")];
        // Aceito em 26/07: na leitura de 20/07 ainda era pendente.
        const invitations = [pendingInvite("a", "2026-07-02T00:00:00.000Z", "2026-07-26T00:00:00.000Z")];

        expect(computeActivationRateAt(members, invitations, new Date("2026-07-20T12:00:00.000Z"))).toBe(50);
    });

    it("devolve null quando ninguém havia sido convidado ainda", () => {
        // Zero seria uma leitura fabricada, e dispararia escalonamento indevido.
        expect(computeActivationRateAt([], [], NOW_E)).toBeNull();
    });

    it("NÃO escala quando só a leitura atual está fora da faixa", () => {
        // Rede convidou 30 pessoas ontem: ativação despenca por construção, não
        // por problema. Escalar aqui seria alarme falso.
        const members = Array.from({ length: 8 }, () => member("2026-07-01T00:00:00.000Z"));
        const invitations = Array.from({ length: 30 }, (_, i) =>
            pendingInvite(`new-${i}`, "2026-07-26T00:00:00.000Z"),
        );

        const verdict = evaluateActivationEscalation({ members, invitations, range, now: NOW_E });
        expect(verdict.shouldEscalate).toBe(false);
        expect(verdict.previous).toBe(100);
        expect(verdict.rationale).toContain("oscilação");
    });

    it("escala quando AS DUAS leituras estão fora da faixa", () => {
        // Baixa há semanas: 2 membros, 8 convites parados desde o começo.
        const members = [member("2026-07-01T00:00:00.000Z"), member("2026-07-02T00:00:00.000Z")];
        const invitations = Array.from({ length: 8 }, (_, i) =>
            pendingInvite(`old-${i}`, "2026-07-01T00:00:00.000Z"),
        );

        const verdict = evaluateActivationEscalation({ members, invitations, range, now: NOW_E });
        expect(verdict.shouldEscalate).toBe(true);
        expect(verdict.current).toBe(20);
        expect(verdict.previous).toBe(20);
        expect(verdict.rationale).toContain("duas leituras");
    });

    it("NÃO escala quando a taxa está dentro da faixa", () => {
        const members = Array.from({ length: 9 }, () => member("2026-07-01T00:00:00.000Z"));
        const invitations = [pendingInvite("a", "2026-07-01T00:00:00.000Z")];

        const verdict = evaluateActivationEscalation({ members, invitations, range, now: NOW_E });
        expect(verdict.shouldEscalate).toBe(false);
        expect(verdict.current).toBe(90);
        expect(verdict.rationale).toContain("dentro da");
    });

    it("NÃO escala sem leitura anterior para comparar", () => {
        // Rede criada hoje: fora da faixa, mas sem histórico. Escalar seria
        // julgar uma rede que ainda não teve chance.
        const members = [member("2026-07-27T00:00:00.000Z")];
        const invitations = Array.from({ length: 9 }, (_, i) =>
            pendingInvite(`n-${i}`, "2026-07-27T00:00:00.000Z"),
        );

        const verdict = evaluateActivationEscalation({ members, invitations, range, now: NOW_E });
        expect(verdict.shouldEscalate).toBe(false);
        expect(verdict.previous).toBeNull();
        expect(verdict.rationale).toContain("sem leitura");
    });

    it("usa intervalo de 7 dias entre as leituras", () => {
        expect(READING_INTERVAL_DAYS).toBe(7);
    });
});

// ── D65 fechada: controle escondido por papel (R9 item 15) ───────────────────
describe("permissão de reenvio por papel", () => {
    const ORG = "org-1";

    it("permite a gestão da rede", () => {
        expect(canResendInvitations([{ organizationId: ORG, role: "org_admin" }], ORG)).toBe(true);
    });

    it("permite a administração da plataforma", () => {
        expect(canResendInvitations([{ organizationId: ORG, role: "platform_admin" }], ORG)).toBe(true);
    });

    it("NÃO permite coordenação de escola", () => {
        // `resend_invitation` exige is_org_admin no banco: a coordenação de
        // escola não emite convite da rede. Mostrar o botão para ela seria
        // prometer uma ação que sempre falharia.
        expect(canResendInvitations([{ organizationId: ORG, role: "school_admin" }], ORG)).toBe(false);
    });

    it("NÃO permite educador nem estudante", () => {
        expect(canResendInvitations([{ organizationId: ORG, role: "educator" }], ORG)).toBe(false);
        expect(canResendInvitations([{ organizationId: ORG, role: "student" }], ORG)).toBe(false);
    });

    it("não vaza permissão entre organizações", () => {
        // Gestor da rede A não reenvia convite da rede B.
        expect(canResendInvitations([{ organizationId: "org-A", role: "org_admin" }], "org-B")).toBe(false);
    });

    it("nega sem organização resolvida", () => {
        expect(canResendInvitations([{ organizationId: ORG, role: "org_admin" }], null)).toBe(false);
        expect(canResendInvitations([{ organizationId: ORG, role: "org_admin" }], undefined)).toBe(false);
    });

    it("nega com lista de vínculos vazia", () => {
        expect(canResendInvitations([], ORG)).toBe(false);
    });

    it("aceita quando a pessoa tem vários vínculos e um deles serve", () => {
        expect(
            canResendInvitations(
                [
                    { organizationId: "org-A", role: "educator" },
                    { organizationId: ORG, role: "org_admin" },
                ],
                ORG,
            ),
        ).toBe(true);
    });
});
