import { describe, expect, it } from "vitest";
import {
    calculateSchoolPricing,
    networkDiscount,
    perStudentBrl,
    MAX_TOTAL_DISCOUNT,
} from "./school-pricing";

describe("perStudentBrl (faixas de volume)", () => {
    it("cobre cada faixa nos limites", () => {
        expect(perStudentBrl(1)).toBe(19);
        expect(perStudentBrl(50)).toBe(19);
        expect(perStudentBrl(51)).toBe(14);
        expect(perStudentBrl(200)).toBe(14);
        expect(perStudentBrl(201)).toBe(10);
        expect(perStudentBrl(500)).toBe(10);
        expect(perStudentBrl(501)).toBe(7);
        expect(perStudentBrl(2000)).toBe(7);
    });

    it("acima de 2000 alunos é cotação manual (0)", () => {
        expect(perStudentBrl(2001)).toBe(0);
        expect(perStudentBrl(10000)).toBe(0);
    });
});

describe("networkDiscount (desconto de rede)", () => {
    it("cobre cada faixa de escolas", () => {
        expect(networkDiscount(1)).toBe(0);
        expect(networkDiscount(2)).toBe(0.1);
        expect(networkDiscount(3)).toBe(0.1);
        expect(networkDiscount(4)).toBe(0.18);
        expect(networkDiscount(9)).toBe(0.18);
        expect(networkDiscount(10)).toBe(0.25);
        expect(networkDiscount(50)).toBe(0.25);
    });
});

describe("calculateSchoolPricing", () => {
    it("preço base sem descontos (1 escola, mensal, privada)", () => {
        const r = calculateSchoolPricing({ students: 150, schools: 1, annual: false, isPublicOrNgo: false });
        expect(r.perStudentBrl).toBe(14);
        expect(r.totalDiscount).toBe(0);
        expect(r.finalPerStudentBrl).toBe(14);
        expect(r.monthlyTotalBrl).toBe(150 * 14);
        expect(r.monthlyTotalCents).toBe(150 * 14 * 100);
        expect(r.chargeAmountCents).toBe(150 * 14 * 100);
    });

    it("cobra o total anual quando annual=true", () => {
        const r = calculateSchoolPricing({ students: 150, schools: 1, annual: true, isPublicOrNgo: false });
        // 14 * (1 - 0.20) = 11.2 por aluno/mês
        expect(r.finalPerStudentBrl).toBeCloseTo(11.2, 5);
        expect(r.annualDiscount).toBe(0.2);
        expect(r.totalDiscount).toBe(0.2);
        expect(r.yearlyTotalBrl).toBeCloseTo(11.2 * 150 * 12, 4);
        expect(r.chargeAmountCents).toBe(r.yearlyTotalCents);
    });

    it("soma descontos de rede + anual + pública/ONG", () => {
        const r = calculateSchoolPricing({ students: 300, schools: 5, annual: true, isPublicOrNgo: true });
        // rede(4-9)=0.18 + anual=0.20 + pública=0.30 = 0.68
        expect(r.networkDiscount).toBe(0.18);
        expect(r.totalDiscount).toBeCloseTo(0.68, 5);
        expect(r.perStudentBrl).toBe(10); // faixa 201-500
        expect(r.finalPerStudentBrl).toBeCloseTo(10 * (1 - 0.68), 5);
    });

    it("aplica o teto de desconto (75%) quando a soma passa disso", () => {
        // rede(10+)=0.25 + anual=0.20 + pública=0.30 = 0.75 exatamente
        const r = calculateSchoolPricing({ students: 600, schools: 10, annual: true, isPublicOrNgo: true });
        expect(r.totalDiscount).toBe(MAX_TOTAL_DISCOUNT);
        expect(r.finalPerStudentBrl).toBeCloseTo(7 * 0.25, 5);
    });

    it("marca customQuote acima de 2000 alunos", () => {
        const r = calculateSchoolPricing({ students: 2500, schools: 3, annual: false, isPublicOrNgo: false });
        expect(r.customQuote).toBe(true);
        expect(r.perStudentBrl).toBe(0);
        expect(r.monthlyTotalCents).toBe(0);
    });

    it("gestores grátis: 1 a cada 50 alunos, mínimo 1", () => {
        expect(calculateSchoolPricing({ students: 10, schools: 1, annual: false, isPublicOrNgo: false }).managersFree).toBe(1);
        expect(calculateSchoolPricing({ students: 150, schools: 1, annual: false, isPublicOrNgo: false }).managersFree).toBe(3);
        expect(calculateSchoolPricing({ students: 500, schools: 1, annual: false, isPublicOrNgo: false }).managersFree).toBe(10);
    });

    it("normaliza entradas fracionárias/negativas de forma segura", () => {
        const r = calculateSchoolPricing({ students: 150.9, schools: 0, annual: false, isPublicOrNgo: false });
        expect(r.perStudentBrl).toBe(14); // floor(150.9)=150 -> faixa 51-200
        // schools normalizado para no mínimo 1 -> sem desconto de rede
        expect(r.networkDiscount).toBe(0);
    });
});

describe("simuladores sem efeito degrau (ToT Decisão D)", () => {
    it("documenta os degraus da fórmula ativa em 50->51, 200->201 e 500->501", () => {
        const s50 = calculateSchoolPricing({ students: 50, schools: 1, annual: false, isPublicOrNgo: false });
        const s51 = calculateSchoolPricing({ students: 51, schools: 1, annual: false, isPublicOrNgo: false });
        expect(s50.monthlyTotalBrl).toBe(950);
        expect(s51.monthlyTotalBrl).toBe(714);

        const s200 = calculateSchoolPricing({ students: 200, schools: 1, annual: false, isPublicOrNgo: false });
        const s201 = calculateSchoolPricing({ students: 201, schools: 1, annual: false, isPublicOrNgo: false });
        expect(s200.monthlyTotalBrl).toBe(2800);
        expect(s201.monthlyTotalBrl).toBe(2010);

        const s500 = calculateSchoolPricing({ students: 500, schools: 1, annual: false, isPublicOrNgo: false });
        const s501 = calculateSchoolPricing({ students: 501, schools: 1, annual: false, isPublicOrNgo: false });
        expect(s500.monthlyTotalBrl).toBe(5000);
        expect(s501.monthlyTotalBrl).toBe(3507);
    });

    it("calculateFloorProtectedSchoolPricing elimina queda de receita nas fronteiras de faixa", async () => {
        const { calculateFloorProtectedSchoolPricing } = await import("./school-pricing");
        const f50 = calculateFloorProtectedSchoolPricing({ students: 50, schools: 1, annual: false, isPublicOrNgo: false });
        const f51 = calculateFloorProtectedSchoolPricing({ students: 51, schools: 1, annual: false, isPublicOrNgo: false });
        expect(f51.monthlyTotalBrl).toBeGreaterThanOrEqual(f50.monthlyTotalBrl);
        expect(f51.monthlyTotalBrl).toBe(950);

        const f200 = calculateFloorProtectedSchoolPricing({ students: 200, schools: 1, annual: false, isPublicOrNgo: false });
        const f201 = calculateFloorProtectedSchoolPricing({ students: 201, schools: 1, annual: false, isPublicOrNgo: false });
        expect(f201.monthlyTotalBrl).toBeGreaterThanOrEqual(f200.monthlyTotalBrl);
        expect(f201.monthlyTotalBrl).toBe(2800);

        const f500 = calculateFloorProtectedSchoolPricing({ students: 500, schools: 1, annual: false, isPublicOrNgo: false });
        const f501 = calculateFloorProtectedSchoolPricing({ students: 501, schools: 1, annual: false, isPublicOrNgo: false });
        expect(f501.monthlyTotalBrl).toBeGreaterThanOrEqual(f500.monthlyTotalBrl);
        expect(f501.monthlyTotalBrl).toBe(5000);
    });

    it("calculateProgressiveSchoolPricing é estritamente monotônico em todas as fronteiras", async () => {
        const { calculateProgressiveSchoolPricing } = await import("./school-pricing");
        const p50 = calculateProgressiveSchoolPricing({ students: 50, schools: 1, annual: false, isPublicOrNgo: false });
        const p51 = calculateProgressiveSchoolPricing({ students: 51, schools: 1, annual: false, isPublicOrNgo: false });
        expect(p50.monthlyTotalBrl).toBe(950);
        expect(p51.monthlyTotalBrl).toBe(964); // 50*19 + 1*14

        const p200 = calculateProgressiveSchoolPricing({ students: 200, schools: 1, annual: false, isPublicOrNgo: false });
        const p201 = calculateProgressiveSchoolPricing({ students: 201, schools: 1, annual: false, isPublicOrNgo: false });
        expect(p200.monthlyTotalBrl).toBe(3050); // 50*19 + 150*14
        expect(p201.monthlyTotalBrl).toBe(3060); // 3050 + 1*10

        const p500 = calculateProgressiveSchoolPricing({ students: 500, schools: 1, annual: false, isPublicOrNgo: false });
        const p501 = calculateProgressiveSchoolPricing({ students: 501, schools: 1, annual: false, isPublicOrNgo: false });
        expect(p500.monthlyTotalBrl).toBe(6050); // 3050 + 300*10
        expect(p501.monthlyTotalBrl).toBe(6057); // 6050 + 1*7
    });
});

