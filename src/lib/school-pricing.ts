// Fonte ÚNICA da tabela de preços B2B escolar (Onda 1 — monetização).
//
// O preview no cliente (SchoolCalculator) e a cobrança no servidor
// (edge function mp-create-preference) DEVEM produzir números idênticos.
// Este módulo é a tabela canônica no lado do app/cliente; a edge function em
// Deno espelha esta lógica 1:1 em supabase/functions/_shared/school-pricing.ts
// (Deno não importa de forma confiável módulos fora de supabase/functions no
// deploy), e AMBOS os lados são cobertos por testes que checam os mesmos
// valores esperados. Se você mudar um número aqui, mude no espelho também.
//
// Valores expressos em R$/aluno/mês. Origem: .lovable/plan.md §1.4.

export interface StudentTier {
    /** Limite superior (inclusivo) de alunos desta faixa. */
    readonly maxStudents: number;
    /** Preço por aluno/mês em reais. */
    readonly perStudentBrl: number;
}

export const STUDENT_TIERS: readonly StudentTier[] = [
    { maxStudents: 50, perStudentBrl: 19 },
    { maxStudents: 200, perStudentBrl: 14 },
    { maxStudents: 500, perStudentBrl: 10 },
    { maxStudents: 2000, perStudentBrl: 7 },
] as const;

/** Acima desta contagem de alunos o preço é sob consulta (cotação manual). */
export const CUSTOM_QUOTE_THRESHOLD = 2000;
export const ANNUAL_DISCOUNT = 0.2;
export const PUBLIC_NGO_DISCOUNT = 0.3;
/** Teto de desconto acumulado, para nunca zerar/inverter o preço. */
export const MAX_TOTAL_DISCOUNT = 0.75;

/** Preço base por aluno/mês (0 = faixa de cotação manual, > CUSTOM_QUOTE_THRESHOLD). */
export function perStudentBrl(students: number): number {
    for (const tier of STUDENT_TIERS) {
        if (students <= tier.maxStudents) return tier.perStudentBrl;
    }
    return 0;
}

/** Desconto de rede por número de escolas/unidades. */
export function networkDiscount(schools: number): number {
    if (schools >= 10) return 0.25;
    if (schools >= 4) return 0.18;
    if (schools >= 2) return 0.1;
    return 0;
}

export interface SchoolPricingInput {
    students: number;
    schools: number;
    annual: boolean;
    isPublicOrNgo: boolean;
}

export interface SchoolPricingResult {
    /** true quando a faixa é "sob consulta" (> CUSTOM_QUOTE_THRESHOLD alunos). */
    customQuote: boolean;
    perStudentBrl: number;
    finalPerStudentBrl: number;
    totalDiscount: number;
    networkDiscount: number;
    annualDiscount: number;
    publicDiscount: number;
    monthlyTotalBrl: number;
    yearlyTotalBrl: number;
    monthlyTotalCents: number;
    yearlyTotalCents: number;
    /** Valor que efetivamente será cobrado no ciclo escolhido, em centavos. */
    chargeAmountCents: number;
    /** Gestores/coordenadores grátis (1 a cada 50 alunos, mínimo 1). */
    managersFree: number;
}

/**
 * Calcula o preço escolar. Função pura e determinística: mesma entrada → mesma
 * saída, sem I/O. É a única fonte de verdade do cálculo no lado do cliente.
 */
export function calculateSchoolPricing(input: SchoolPricingInput): SchoolPricingResult {
    const students = Math.max(0, Math.floor(input.students));
    const schools = Math.max(1, Math.floor(input.schools));

    const base = perStudentBrl(students);
    const customQuote = base === 0;

    const net = networkDiscount(schools);
    const annualDiscount = input.annual ? ANNUAL_DISCOUNT : 0;
    const publicDiscount = input.isPublicOrNgo ? PUBLIC_NGO_DISCOUNT : 0;
    const totalDiscount = Math.min(MAX_TOTAL_DISCOUNT, net + annualDiscount + publicDiscount);

    const finalPerStudentBrl = base * (1 - totalDiscount);
    const monthlyTotalBrl = finalPerStudentBrl * students;
    const yearlyTotalBrl = monthlyTotalBrl * 12;
    const managersFree = Math.max(1, Math.floor(students / 50));

    const monthlyTotalCents = Math.round(monthlyTotalBrl * 100);
    const yearlyTotalCents = Math.round(yearlyTotalBrl * 100);

    return {
        customQuote,
        perStudentBrl: base,
        finalPerStudentBrl,
        totalDiscount,
        networkDiscount: net,
        annualDiscount,
        publicDiscount,
        monthlyTotalBrl,
        yearlyTotalBrl,
        monthlyTotalCents,
        yearlyTotalCents,
        chargeAmountCents: input.annual ? yearlyTotalCents : monthlyTotalCents,
        managersFree,
    };
}

/**
 * Simulador alternativo (ToT Decisão D — Opção 2): Faixa única com piso monotônico
 * do topo da faixa anterior (`max(total_faixa, topo_faixa_anterior)`), eliminando
 * quedas abruptas em 50→51, 200→201 e 500→501 sem alterar a função ativa de checkout.
 */
export function calculateFloorProtectedSchoolPricing(input: SchoolPricingInput): SchoolPricingResult {
    const baseResult = calculateSchoolPricing(input);
    const students = Math.max(0, Math.floor(input.students));
    if (baseResult.customQuote || students <= 0) return baseResult;

    let rawMonthlyFloorBrl = students * baseResult.perStudentBrl;
    let prevMaxStudents = 0;
    for (const tier of STUDENT_TIERS) {
        const tierTopBrl = tier.maxStudents * tier.perStudentBrl;
        if (students > tier.maxStudents && rawMonthlyFloorBrl < tierTopBrl) {
            rawMonthlyFloorBrl = tierTopBrl;
        }
        prevMaxStudents = tier.maxStudents;
        if (students <= prevMaxStudents) break;
    }

    const monthlyTotalBrl = rawMonthlyFloorBrl * (1 - baseResult.totalDiscount);
    const yearlyTotalBrl = monthlyTotalBrl * 12;
    const finalPerStudentBrl = monthlyTotalBrl / students;
    const monthlyTotalCents = Math.round(monthlyTotalBrl * 100);
    const yearlyTotalCents = Math.round(yearlyTotalBrl * 100);

    return {
        ...baseResult,
        finalPerStudentBrl,
        monthlyTotalBrl,
        yearlyTotalBrl,
        monthlyTotalCents,
        yearlyTotalCents,
        chargeAmountCents: input.annual ? yearlyTotalCents : monthlyTotalCents,
    };
}

/**
 * Simulador alternativo (ToT Decisão D — Opção 3): Cálculo progressivo marginal
 * por faixa (1–50 × R$ 19 + 51–200 × R$ 14 + 201–500 × R$ 10 + 501–2000 × R$ 7).
 * Estritamente monotônico em qualquer transição de volume. Não altera o checkout ativo
 * sem decisão comercial formal.
 */
export function calculateProgressiveSchoolPricing(input: SchoolPricingInput): SchoolPricingResult {
    const baseResult = calculateSchoolPricing(input);
    const students = Math.max(0, Math.floor(input.students));
    if (baseResult.customQuote || students <= 0) return baseResult;

    let remaining = students;
    let prevCap = 0;
    let progressiveBaseMonthlyBrl = 0;

    for (const tier of STUDENT_TIERS) {
        const bracketSize = tier.maxStudents - prevCap;
        const inBracket = Math.min(remaining, bracketSize);
        if (inBracket > 0) {
            progressiveBaseMonthlyBrl += inBracket * tier.perStudentBrl;
            remaining -= inBracket;
        }
        prevCap = tier.maxStudents;
        if (remaining <= 0) break;
    }

    const effectiveBasePerStudentBrl = progressiveBaseMonthlyBrl / students;
    const finalPerStudentBrl = effectiveBasePerStudentBrl * (1 - baseResult.totalDiscount);
    const monthlyTotalBrl = progressiveBaseMonthlyBrl * (1 - baseResult.totalDiscount);
    const yearlyTotalBrl = monthlyTotalBrl * 12;
    const monthlyTotalCents = Math.round(monthlyTotalBrl * 100);
    const yearlyTotalCents = Math.round(yearlyTotalBrl * 100);

    return {
        ...baseResult,
        perStudentBrl: Number(effectiveBasePerStudentBrl.toFixed(4)),
        finalPerStudentBrl,
        monthlyTotalBrl,
        yearlyTotalBrl,
        monthlyTotalCents,
        yearlyTotalCents,
        chargeAmountCents: input.annual ? yearlyTotalCents : monthlyTotalCents,
    };
}

