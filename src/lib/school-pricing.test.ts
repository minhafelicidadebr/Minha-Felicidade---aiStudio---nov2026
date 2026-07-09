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
