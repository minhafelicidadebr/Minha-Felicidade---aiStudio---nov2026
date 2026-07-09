// ESPELHO Deno de src/lib/school-pricing.ts — DEVE ficar 1:1 com aquele arquivo.
// Deno (edge functions) não importa de forma confiável módulos fora de
// supabase/functions no deploy, então mantemos uma cópia sincronizada aqui.
// A tabela de preços canônica vive em src/lib/school-pricing.ts; se mudar lá,
// mude aqui também. Ambos os lados são cobertos por testes com os MESMOS
// valores esperados (src/lib/school-pricing.test.ts).

export interface StudentTier {
    readonly maxStudents: number;
    readonly perStudentBrl: number;
}

export const STUDENT_TIERS: readonly StudentTier[] = [
    { maxStudents: 50, perStudentBrl: 19 },
    { maxStudents: 200, perStudentBrl: 14 },
    { maxStudents: 500, perStudentBrl: 10 },
    { maxStudents: 2000, perStudentBrl: 7 },
];

export const CUSTOM_QUOTE_THRESHOLD = 2000;
export const ANNUAL_DISCOUNT = 0.2;
export const PUBLIC_NGO_DISCOUNT = 0.3;
export const MAX_TOTAL_DISCOUNT = 0.75;

export function perStudentBrl(students: number): number {
    for (const tier of STUDENT_TIERS) {
        if (students <= tier.maxStudents) return tier.perStudentBrl;
    }
    return 0;
}

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
    chargeAmountCents: number;
    managersFree: number;
}

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
