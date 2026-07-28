import { describe, expect, it } from "vitest";
import { __testing } from "./useDecisionActions";

const { toOutcome, DENIED_CODE, RULE_CODE } = __testing;

describe("tradução dos desfechos da ação", () => {
    it("sucesso declara o efeito ocorrido", () => {
        const outcome = toOutcome(null, "Convite reenviado.");
        expect(outcome).toEqual({ status: "succeeded", message: "Convite reenviado." });
    });

    it("permissão insuficiente é 'negado', não 'falhou'", () => {
        // Colapsar os dois faria o gestor repetir uma ação que nunca vai passar.
        const outcome = toOutcome({ code: DENIED_CODE, message: "insufficient" }, "ok");
        expect(outcome.status).toBe("denied");
        expect(outcome.message).toContain("permissão");
        expect(outcome.message).toContain("Nada foi alterado");
    });

    it("recusa por regra de negócio é 'negado', com o motivo do servidor", () => {
        const outcome = toOutcome(
            { code: RULE_CODE, message: "Resend limit reached (3 of 3) for this recipient." },
            "ok",
        );
        expect(outcome.status).toBe("denied");
        expect(outcome.message).toContain("Resend limit reached");
    });

    it("falha técnica é 'falhou' e declara que nada mudou", () => {
        const outcome = toOutcome({ code: "08006", message: "connection failure." }, "ok");
        expect(outcome.status).toBe("failed");
        expect(outcome.message).toContain("Nada foi alterado");
    });

    it("erro sem código conhecido não é tratado como permissão negada", () => {
        const outcome = toOutcome({ message: "algo inesperado." }, "ok");
        expect(outcome.status).toBe("failed");
    });

    it("as três mensagens são distintas entre si", () => {
        const succeeded = toOutcome(null, "Convite reenviado.");
        const denied = toOutcome({ code: DENIED_CODE, message: "x" }, "Convite reenviado.");
        const failed = toOutcome({ code: "08006", message: "x" }, "Convite reenviado.");
        const messages = new Set([succeeded.message, denied.message, failed.message]);
        expect(messages.size).toBe(3);
    });

    it("toda falha declara explicitamente que nada foi alterado", () => {
        for (const code of [DENIED_CODE, RULE_CODE, "08006", undefined]) {
            const outcome = toOutcome({ code, message: "erro." }, "ok");
            expect(outcome.status).not.toBe("succeeded");
            expect(outcome.message).toContain("Nada foi alterado");
        }
    });
});
