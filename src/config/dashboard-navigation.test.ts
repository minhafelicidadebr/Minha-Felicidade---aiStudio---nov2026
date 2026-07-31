import { describe, expect, it } from "vitest";
import {
    DASHBOARD_NAV_ITEMS,
    MOBILE_NAV_MAX_ITEMS,
    getGroupedNavItemsForRole,
    getMobileNavItemsForRole,
    getNavItemsForRole,
    resolveNavItemHref,
} from "./dashboard-navigation";
import { DASHBOARD_ROLE_PRECEDENCE, type DashboardRole } from "@/lib/role-home";

const ROLES: readonly DashboardRole[] = DASHBOARD_ROLE_PRECEDENCE;

describe("navegação por papel", () => {
    it("nunca renderiza rota marcada como future (link morto)", () => {
        for (const role of ROLES) {
            expect(getNavItemsForRole(role).every((item) => !item.future)).toBe(true);
        }
    });

    it("todo papel tem ao menos um item de navegação e uma home", () => {
        for (const role of ROLES) {
            expect(getNavItemsForRole(role).length).toBeGreaterThan(0);
            expect(getMobileNavItemsForRole(role).length).toBeGreaterThan(0);
        }
    });

    it("não expõe item de gestão institucional para estudante", () => {
        const studentHrefs = getNavItemsForRole("student").map((item) => item.href);
        expect(studentHrefs).not.toContain("/org");
        expect(studentHrefs).not.toContain("/admin");
    });

    it("não expõe painel de estudante como home de papel institucional", () => {
        for (const role of ["org_admin", "school_admin", "platform_admin"] as const) {
            const first = getNavItemsForRole(role)[0];
            expect(first.href).not.toBe("/dashboard");
        }
    });

    // D33 (resolvida na UX-2): /escolas é landing pública de aquisição. Um item de
    // navegação do app autenticado apontando para lá jogaria a pessoa fora do painel.
    it("não aponta para a landing pública /escolas", () => {
        for (const item of DASHBOARD_NAV_ITEMS) {
            expect(item.href).not.toBe("/escolas");
        }
    });

    it("nenhum item navegável hoje tem parâmetro de rota não resolvido", () => {
        for (const role of ROLES) {
            for (const item of getNavItemsForRole(role)) {
                expect(item.href).not.toContain(":");
            }
        }
    });

    // UX-3 §D4/D52: item duplicado removido do menu do gestor.
    it("não expõe item duplicado de indicadores agregados", () => {
        expect(DASHBOARD_NAV_ITEMS.some((item) => item.key === "org-reports")).toBe(false);
    });

    // UX-3 §D3/D51: `/admin` é a Landing Administrativa, não o painel docente.
    it("não aponta papel não administrativo para /admin", () => {
        for (const role of ["student", "org_admin", "school_admin", "educator"] as const) {
            const hrefs = getNavItemsForRole(role).map((item) => item.href);
            expect(hrefs).not.toContain("/admin");
        }
    });

    it("leva o docente ao painel em /professores", () => {
        const hrefs = getNavItemsForRole("educator").map((item) => item.href);
        expect(hrefs).toContain("/professores");
    });

    // UX-6: a dívida foi PAGA. `org-people` foi absorvido por `org-home`, que
    // já descreve a página inteira (implantação, pessoas, convites, decisões).
    // Dois itens para uma rota deixavam o estado "ativo" indeterminado.
    it("não tem destino duplicado na navegação de nenhum papel", () => {
        for (const role of ROLES) {
            const hrefs = getNavItemsForRole(role).map((item) => item.href);
            expect(new Set(hrefs).size).toBe(hrefs.length);
        }
    });

    it("não expõe mais o item duplicado de pessoas e convites", () => {
        expect(DASHBOARD_NAV_ITEMS.some((item) => item.key === "org-people")).toBe(false);
    });
});

// ── UX-6: itens de destino dinâmico ─────────────────────────────────────────
describe("resolução de destino dinâmico", () => {
    const SCHOOL_A = "11111111-2222-3333-4444-555555555555";
    const SCHOOL_B = "66666666-7777-8888-9999-000000000000";

    function orgSchoolsItem() {
        return DASHBOARD_NAV_ITEMS.find((item) => item.key === "org-schools")!;
    }

    it("o gabarito do item de escola contém parâmetro e não é navegado direto", () => {
        const item = orgSchoolsItem();
        expect(item.dynamic).toBe(true);
        expect(item.href).toContain(":");
    });

    it("resolve para a escola quando a pessoa administra exatamente uma", () => {
        expect(resolveNavItemHref(orgSchoolsItem(), { schoolIds: [SCHOOL_A] })).toBe(
            `/escola/${SCHOOL_A}`,
        );
    });

    it("omite o item quando não há escola vinculada", () => {
        expect(resolveNavItemHref(orgSchoolsItem(), { schoolIds: [] })).toBeNull();
        expect(resolveNavItemHref(orgSchoolsItem(), {})).toBeNull();
    });

    it("omite o item quando há duas ou mais escolas, em vez de escolher uma", () => {
        // Escolher sem informar o critério seria arbitrário: a lista completa,
        // com nome e município, vive em /org.
        expect(resolveNavItemHref(orgSchoolsItem(), { schoolIds: [SCHOOL_A, SCHOOL_B] })).toBeNull();
    });

    it("item estático devolve o próprio href", () => {
        const staticItem = DASHBOARD_NAV_ITEMS.find((item) => item.key === "org-home")!;
        expect(resolveNavItemHref(staticItem)).toBe("/org");
    });

    it("navegação do gestor inclui a escola quando há exatamente uma", () => {
        const hrefs = getNavItemsForRole("org_admin", { schoolIds: [SCHOOL_A] }).map((i) => i.href);
        expect(hrefs).toContain(`/escola/${SCHOOL_A}`);
    });

    it("navegação do gestor não tem link morto quando não há escola", () => {
        const hrefs = getNavItemsForRole("org_admin", { schoolIds: [] }).map((i) => i.href);
        expect(hrefs.some((href) => href.includes(":"))).toBe(false);
        expect(hrefs).not.toContain("/escola/:schoolId");
    });

    it("nenhum item resolvido carrega parâmetro pendente, em qualquer contexto", () => {
        const contexts = [{}, { schoolIds: [] }, { schoolIds: [SCHOOL_A] }, { schoolIds: [SCHOOL_A, SCHOOL_B] }];
        for (const role of ROLES) {
            for (const context of contexts) {
                for (const item of getNavItemsForRole(role, context)) {
                    expect(item.href).not.toContain(":");
                }
            }
        }
    });

    it("bottom nav respeita o limite de itens e não duplica destino", () => {
        for (const role of ROLES) {
            const items = getMobileNavItemsForRole(role);
            expect(items.length).toBeLessThanOrEqual(MOBILE_NAV_MAX_ITEMS);
            const hrefs = items.map((item) => item.href);
            expect(new Set(hrefs).size).toBe(hrefs.length);
        }
    });

    it("todo item de bottom nav também existe na navegação completa (sem ação órfã)", () => {
        for (const role of ROLES) {
            const allKeys = new Set(getNavItemsForRole(role).map((item) => item.key));
            for (const item of getMobileNavItemsForRole(role)) {
                expect(allKeys.has(item.key)).toBe(true);
            }
        }
    });

    it("agrupa a sidebar sem seções vazias", () => {
        for (const role of ROLES) {
            for (const section of getGroupedNavItemsForRole(role)) {
                expect(section.items.length).toBeGreaterThan(0);
            }
        }
    });

    it("todo item tem chave única e href interno", () => {
        const keys = DASHBOARD_NAV_ITEMS.map((item) => item.key);
        expect(new Set(keys).size).toBe(keys.length);
        for (const item of DASHBOARD_NAV_ITEMS) {
            expect(item.href.startsWith("/")).toBe(true);
            expect(item.href.startsWith("//")).toBe(false);
        }
    });

    it("todo item navegável tem rótulo curto ou rótulo curto o suficiente para mobile", () => {
        for (const role of ROLES) {
            for (const item of getMobileNavItemsForRole(role)) {
                const label = item.shortLabel ?? item.label;
                expect(label.length).toBeLessThanOrEqual(12);
            }
        }
    });
});
