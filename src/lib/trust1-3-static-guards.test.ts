import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");
const app = source("src/App.tsx");
const context = source("src/contexts/DashboardContext.tsx");
const compatibilityHook = source("src/hooks/useDashboardContext.ts");
const keys = source("src/lib/institutional-query-keys.ts");
const orgPage = source("src/pages/OrgDashboardPage.tsx");

describe("TRUST-1.3 — guards estáticos de contexto institucional", () => {
    it("mantém um único Provider canônico no App e nenhum estado no hook compatível", () => {
        expect(app.match(/<DashboardContextProvider>/g)).toHaveLength(1);
        expect(context).toContain("createContext<UseDashboardContextResult");
        expect(compatibilityHook).toContain("from \"@/contexts/DashboardContext\"");
        expect(compatibilityHook).not.toMatch(/useState|useQuery|createContext/);
    });

    it("protege /org e /escola por papéis institucionais explícitos", () => {
        expect(app).toMatch(/path: "\/org"[\s\S]*?allowedRoles=\{\["platform_admin", "org_admin"\]\}/);
        expect(app).toMatch(/path: "\/escola\/:schoolId"[\s\S]*?allowedRoles=\{\["platform_admin", "org_admin", "school_admin"\]\}/);
    });

    it("factory inclui identidade e tenant em todas as leituras institucionais", () => {
        for (const name of ["context", "organization", "schoolMetrics", "orgAnalytics", "orgEngagement", "operationalMetrics", "governance"]) {
            expect(keys, name).toContain(`${name}:`);
        }
        expect(keys.match(/identity\(userId\)/g)?.length).toBeGreaterThanOrEqual(7);
        expect(keys.match(/organizationId/g)?.length).toBeGreaterThanOrEqual(10);
    });

    it("remonta estado local por tenant e bloqueia export após desmontagem", () => {
        expect(orgPage).toContain("key={dashboardContext.activeOrganization?.id ?? \"no-organization\"}");
        expect(orgPage.match(/if \(!mounted\.current\) return;/g)?.length).toBeGreaterThanOrEqual(4);
        expect(orgPage).toContain("assertInstitutionalPayload(operationOrganizationId");
    });
});