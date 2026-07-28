import { describe, expect, it } from "vitest";
import {
    EMPTY_GROUP_TEXT,
    READ_FAILURE_TEXT,
    describeSuppression,
    describeThreshold,
    enforceSubtractionSafety,
    isEmptyGroup,
    isSubtractionRecoverable,
    isSuppressed,
    planComplementarySuppression,
    toExportCell,
    type MetricGroup,
    type NamedGroup,
} from "./metric-privacy";

const THRESHOLD = 5;

function disclosed(value: number, count: number): MetricGroup {
    return { suppressed: false, value, count, isEmpty: count === 0 };
}

function suppressed(reason: "below_threshold" | "complementary" = "below_threshold"): MetricGroup {
    return { suppressed: true, reason, minimumGroupSize: THRESHOLD };
}

function named(key: string, group: MetricGroup): NamedGroup {
    return { key, label: `Turma ${key}`, group };
}

// ── Grupo com 1 a 4 participantes (teste exigido pelo humano) ────────────────
describe("grupo abaixo do limiar", () => {
    it("não expõe valor nem contagem no tipo do grupo suprimido", () => {
        const group = suppressed();
        expect(isSuppressed(group)).toBe(true);
        // O ponto do teste: os campos não existem no objeto. Se uma refatoração
        // reintroduzir `value`/`count` aqui, o valor real volta a trafegar.
        expect(Object.keys(group).sort()).toEqual(["minimumGroupSize", "reason", "suppressed"]);
        expect("value" in group).toBe(false);
        expect("count" in group).toBe(false);
    });

    it("informa o limiar que o servidor aplicou, sem hardcode no cliente", () => {
        expect(describeThreshold(5)).toContain("5");
        // Servidor manda outro limiar: o cliente acompanha em vez de insistir no 5.
        expect(describeThreshold(10)).toContain("10");
        expect(describeThreshold(10)).not.toContain(" 5 ");
    });

    it("distingue os três estados com textos diferentes", () => {
        const below = describeSuppression({ suppressed: true, reason: "below_threshold", minimumGroupSize: 5 });
        expect(below).not.toBe(EMPTY_GROUP_TEXT);
        expect(below).not.toBe(READ_FAILURE_TEXT);
        expect(EMPTY_GROUP_TEXT).not.toBe(READ_FAILURE_TEXT);
    });

    it("trata grupo vazio como valor real, não como suprimido", () => {
        const empty = disclosed(0, 0);
        expect(isSuppressed(empty)).toBe(false);
        expect(isEmptyGroup(empty)).toBe(true);
        // Zero pessoas não expõe ninguém: mostrar 0 é honesto.
        expect(toExportCell(empty)).toBe("0");
    });
});

// ── Inferência por subtração (teste exigido pelo humano) ─────────────────────
describe("inferência por subtração", () => {
    it("detecta o furo quando exatamente um grupo está suprimido e o total é divulgado", () => {
        const groups = [
            named("a", disclosed(30, 10)),
            named("b", disclosed(20, 8)),
            named("c", disclosed(10, 6)),
            named("d", suppressed()),
        ];
        expect(isSubtractionRecoverable({ groups, totalDisclosed: true })).toBe(true);
    });

    it("não acusa furo quando o total está suprimido", () => {
        const groups = [named("a", disclosed(30, 10)), named("b", suppressed())];
        expect(isSubtractionRecoverable({ groups, totalDisclosed: false })).toBe(false);
    });

    it("não acusa furo com dois ou mais grupos suprimidos (valor fica indeterminado)", () => {
        const groups = [
            named("a", disclosed(30, 10)),
            named("b", suppressed()),
            named("c", suppressed()),
        ];
        expect(isSubtractionRecoverable({ groups, totalDisclosed: true })).toBe(false);
    });

    it("não acusa furo quando nada está suprimido", () => {
        const groups = [named("a", disclosed(30, 10)), named("b", disclosed(20, 9))];
        expect(isSubtractionRecoverable({ groups, totalDisclosed: true })).toBe(false);
    });

    it("suprime o menor grupo restante quando sobram dois ou mais divulgados", () => {
        const groups = [
            named("a", disclosed(30, 10)),
            named("b", disclosed(20, 8)),
            named("c", disclosed(10, 6)),
            named("d", suppressed()),
        ];
        const result = enforceSubtractionSafety({ groups, total: disclosed(60, 24), minimumGroupSize: THRESHOLD });

        expect(result.applied?.strategy).toBe("suppress_second_smallest");
        expect(result.applied?.groupKey).toBe("c");
        expect(isSuppressed(result.groups.find((g) => g.key === "c")!.group)).toBe(true);
        // Total preservado: o gestor ainda compara as turmas maiores.
        expect(isSuppressed(result.total)).toBe(false);
        // Agora há dois suprimidos, então o valor de cada um é indeterminado.
        expect(result.groups.filter((g) => isSuppressed(g.group))).toHaveLength(2);
    });

    it("suprime o total quando sobra apenas um grupo divulgado", () => {
        const groups = [named("a", disclosed(30, 10)), named("b", suppressed())];
        const result = enforceSubtractionSafety({ groups, total: disclosed(33, 12), minimumGroupSize: THRESHOLD });

        expect(result.applied?.strategy).toBe("suppress_total");
        expect(isSuppressed(result.total)).toBe(true);
        // O único grupo divulgado sobrevive: apagá-lo deixaria o conjunto sem detalhe.
        expect(isSuppressed(result.groups.find((g) => g.key === "a")!.group)).toBe(false);
    });

    it("é determinística: empate de valor resolve pela chave, sempre igual", () => {
        const groups = [
            named("z", disclosed(10, 6)),
            named("a", disclosed(10, 6)),
            named("m", disclosed(40, 20)),
            named("x", suppressed()),
        ];
        const first = enforceSubtractionSafety({ groups, total: disclosed(60, 32), minimumGroupSize: THRESHOLD });
        const second = enforceSubtractionSafety({ groups, total: disclosed(60, 32), minimumGroupSize: THRESHOLD });

        expect(first.applied?.groupKey).toBe("a");
        expect(second.applied?.groupKey).toBe(first.applied?.groupKey);
    });

    it("é idempotente: aplicar de novo não suprime mais nada", () => {
        const groups = [
            named("a", disclosed(30, 10)),
            named("b", disclosed(20, 8)),
            named("c", suppressed()),
        ];
        const once = enforceSubtractionSafety({ groups, total: disclosed(50, 18), minimumGroupSize: THRESHOLD });
        const twice = enforceSubtractionSafety({
            groups: once.groups,
            total: once.total,
            minimumGroupSize: THRESHOLD,
        });

        expect(once.applied).not.toBeNull();
        expect(twice.applied).toBeNull();
    });

    it("marca a supressão complementar com motivo próprio, distinto do limiar", () => {
        const groups = [named("a", disclosed(30, 10)), named("b", disclosed(20, 8)), named("c", suppressed())];
        const result = enforceSubtractionSafety({ groups, total: disclosed(50, 18), minimumGroupSize: THRESHOLD });
        const complementary = result.groups.find((g) => g.key === "b")!.group;

        expect(isSuppressed(complementary)).toBe(true);
        if (isSuppressed(complementary)) {
            expect(complementary.reason).toBe("complementary");
            expect(describeSuppression(complementary)).not.toBe("Amostra insuficiente para exibição segura.");
        }
    });
});

// ── Exportação de grupo suprimido (teste exigido pelo humano) ────────────────
describe("exportação de grupo suprimido", () => {
    it("não escreve o valor real em célula de PDF ou CSV", () => {
        expect(toExportCell(suppressed())).toBe("amostra insuficiente");
        expect(toExportCell(suppressed("complementary"))).toBe("amostra insuficiente");
    });

    it("nenhuma célula exportada de grupo suprimido contém dígito", () => {
        // Guarda contra alguém "melhorar" a mensagem incluindo o valor ou a
        // contagem — o número no CSV vaza igual ao número na tela.
        expect(toExportCell(suppressed())).not.toMatch(/\d/);
    });

    it("exporta normalmente o grupo que atingiu o limiar", () => {
        expect(toExportCell(disclosed(42, 9))).toBe("42");
    });
});

// ── Limiar não duplicado no cliente ─────────────────────────────────────────
describe("limiar canônico no servidor", () => {
    it("o módulo de privacidade não exporta constante de limiar", async () => {
        // §D5/D53: o valor vive numa única configuração server-side. Se alguém
        // exportar um limiar daqui, dois lugares passam a decidir a mesma regra
        // e um deles vai ficar para trás.
        const moduleExports = await import("./metric-privacy");
        const numericExports = Object.entries(moduleExports).filter(
            ([, value]) => typeof value === "number",
        );
        expect(numericExports).toEqual([]);
    });
});
