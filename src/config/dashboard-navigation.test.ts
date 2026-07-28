import { describe, expect, it } from "vitest";
import {
    DASHBOARD_NAV_ITEMS,
    MOBILE_NAV_MAX_ITEMS,
    getGroupedNavItemsForRole,
    getMobileNavItemsForRole,
    getNavItemsForRole,
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
