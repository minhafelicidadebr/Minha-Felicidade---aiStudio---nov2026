import { describe, expect, it } from "vitest";
import {
    CANONICAL_ROLE_HOME,
    canSeeInstitutionalData,
    fromMembershipRoles,
    resolveDashboardRole,
    resolveRoleHomePath,
    toDashboardRoles,
} from "./role-home";

describe("toDashboardRoles", () => {
    it("une papéis de aplicação e de membership sem duplicar", () => {
        expect(
            toDashboardRoles({ appRoles: ["teacher", "student"], membershipRoles: ["educator", "student"] }),
        ).toEqual(["educator", "student"]);
    });

    it("ordena por precedência independentemente da ordem de entrada", () => {
        expect(
            toDashboardRoles({ appRoles: ["student"], membershipRoles: ["org_admin", "platform_admin"] }),
        ).toEqual(["platform_admin", "org_admin", "student"]);
    });

    it("mapeia manager→org_admin e teacher→educator", () => {
        expect(toDashboardRoles({ appRoles: ["manager"] })).toEqual(["org_admin"]);
        expect(toDashboardRoles({ appRoles: ["teacher"] })).toEqual(["educator"]);
    });

    it("devolve vazio para entradas nulas ou desconhecidas", () => {
        expect(toDashboardRoles({})).toEqual([]);
        expect(toDashboardRoles({ appRoles: null, membershipRoles: null })).toEqual([]);
        expect(fromMembershipRoles(["papel_inexistente"])).toEqual([]);
    });

    it("não promove guardian a papel de dashboard (responsável não tem painel)", () => {
        expect(fromMembershipRoles(["guardian"])).toEqual([]);
        expect(toDashboardRoles({ membershipRoles: ["guardian"] })).toEqual([]);
    });
});

describe("resolveDashboardRole", () => {
    it("escolhe o maior privilégio quando há papéis acumulados", () => {
        expect(resolveDashboardRole(["student", "school_admin", "org_admin"])).toBe("org_admin");
        expect(resolveDashboardRole(["educator", "student"])).toBe("educator");
    });

    it("fail-safe para student quando não há papel reconhecido", () => {
        expect(resolveDashboardRole([])).toBe("student");
        expect(resolveDashboardRole(null)).toBe("student");
        expect(resolveDashboardRole(undefined)).toBe("student");
    });
});

describe("resolveRoleHomePath", () => {
    it("resolve destinos navegáveis nesta onda (sem 404)", () => {
        expect(resolveRoleHomePath(["student"])).toBe("/dashboard");
        expect(resolveRoleHomePath(["educator"])).toBe("/admin");
        expect(resolveRoleHomePath(["school_admin"])).toBe("/org");
        expect(resolveRoleHomePath(["org_admin"])).toBe("/org");
        expect(resolveRoleHomePath(["platform_admin"])).toBe("/admin");
    });

    it("resolve destinos canônicos do contrato quando pedido", () => {
        expect(resolveRoleHomePath(["student"], { canonical: true })).toBe("/alunos");
        expect(resolveRoleHomePath(["educator"], { canonical: true })).toBe("/professores");
        expect(resolveRoleHomePath(["org_admin"], { canonical: true })).toBe("/org");
        expect(resolveRoleHomePath(["platform_admin"], { canonical: true })).toBe("/admin");
    });

    it("todo destino resolvido é um caminho interno absoluto", () => {
        for (const path of Object.values(CANONICAL_ROLE_HOME)) {
            expect(path.startsWith("/")).toBe(true);
            expect(path.startsWith("//")).toBe(false);
        }
    });

    it("sem papel algum manda para a home do estudante (menor privilégio)", () => {
        expect(resolveRoleHomePath([])).toBe("/dashboard");
    });
});

describe("canSeeInstitutionalData", () => {
    it("libera apenas papéis institucionais", () => {
        expect(canSeeInstitutionalData("platform_admin")).toBe(true);
        expect(canSeeInstitutionalData("org_admin")).toBe(true);
        expect(canSeeInstitutionalData("school_admin")).toBe(true);
        expect(canSeeInstitutionalData("educator")).toBe(false);
        expect(canSeeInstitutionalData("student")).toBe(false);
    });
});
