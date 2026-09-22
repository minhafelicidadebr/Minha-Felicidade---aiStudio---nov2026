import { describe, expect, it } from "vitest";
import { renderEmail, type NotificationKind } from "./email-templates";

const KINDS: NotificationKind[] = [
    "subscription_welcome",
    "renewal_reminder",
    "payment_failed",
    "subscription_expired",
    "subscription_canceled",
    "escolar_claim",
    "institutional_invite",
    "engagement_reminder",
    "guardian_consent_request",
];

describe("renderEmail", () => {
    it("gera assunto e html não vazios para todos os tipos", () => {
        for (const kind of KINDS) {
            const out = renderEmail({ kind, planName: "Intermediário", billingInterval: "monthly", periodEnd: "2026-08-10" });
            expect(out.subject.length).toBeGreaterThan(0);
            expect(out.html.length).toBeGreaterThan(0);
            expect(out.html).toContain("Instituto Felicidade Para Todos");
        }
    });

    it("boas-vindas menciona o plano e a data de renovação", () => {
        const out = renderEmail({ kind: "subscription_welcome", planName: "Intermediário", billingInterval: "yearly", periodEnd: "2027-07-10" });
        expect(out.subject).toContain("Intermediário");
        expect(out.html).toContain("10/07/2027");
    });

    it("não faz overclaim de recorrência automática (v1 é cobrança única)", () => {
        for (const kind of KINDS) {
            const out = renderEmail({ kind, planName: "Intermediário" });
            expect(out.html.toLowerCase()).not.toContain("cobrança automática");
            expect(out.html.toLowerCase()).not.toContain("renovação automática");
        }
    });

    it("cancelamento deixa claro que mantém acesso até o fim do ciclo", () => {
        const out = renderEmail({ kind: "subscription_canceled", planName: "Intermediário", periodEnd: "2026-08-10" });
        expect(out.html).toContain("10/08/2026");
        expect(out.html.toLowerCase()).toContain("sem nova cobrança");
    });

    it("lida com dados ausentes sem quebrar", () => {
        const out = renderEmail({ kind: "renewal_reminder" });
        expect(out.subject.length).toBeGreaterThan(0);
        expect(out.html.length).toBeGreaterThan(0);
    });

    it("claim escolar mostra o código de associação quando fornecido", () => {
        const out = renderEmail({ kind: "escolar_claim", claimToken: "TOKEN-ABC-123", appUrl: "https://app.exemplo" });
        expect(out.subject.toLowerCase()).toContain("escolar");
        expect(out.html).toContain("TOKEN-ABC-123");
    });

    it("convite institucional gera link de aceitação com token", () => {
        const out = renderEmail({
            kind: "institutional_invite",
            inviteToken: "INVITE-TOKEN",
            inviteRole: "educator",
            orgName: "Escola Exemplo",
            appUrl: "https://app.exemplo",
        });
        expect(out.html).toContain("/aceitar-convite?token=INVITE-TOKEN");
        expect(out.html).toContain("Escola Exemplo");
    });

    it("pedido de consentimento gera link seguro para a decisão do responsável", () => {
        const out = renderEmail({
            kind: "guardian_consent_request",
            guardianConsentToken: "GUARDIAN-TOKEN",
            policyVersion: "2026.1",
            appUrl: "https://app.exemplo",
        });
        expect(out.html).toContain("/autorizacao-responsavel?token=GUARDIAN-TOKEN");
        expect(out.html).toContain("2026.1");
    });
});
