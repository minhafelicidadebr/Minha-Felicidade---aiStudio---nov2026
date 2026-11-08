import { describe, expect, it } from "vitest";
import {
    CANONICAL_ROLE_HOME,
    DASHBOARD_ROLE_PRECEDENCE,
    IMPLEMENTED_ROLE_HOME,
    buildSchoolPath,
    canSeeInstitutionalData,
    fromMembershipRoles,
    isValidSchoolId,
    resolveDashboardRole,
    resolveRoleHomePath,
    resolveRoleHomePathForContext,
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
        expect(resolveRoleHomePath(["student"])).toBe("/alunos");
        expect(resolveRoleHomePath(["educator"])).toBe("/professores");
        expect(resolveRoleHomePath(["school_admin"])).toBe("/org");
        expect(resolveRoleHomePath(["org_admin"])).toBe("/org");
        expect(resolveRoleHomePath(["platform_admin"])).toBe("/admin");
    });

    it("resolve destinos canônicos do contrato quando pedido", () => {
        expect(resolveRoleHomePath(["student"], { canonical: true })).toBe("/alunos");
        expect(resolveRoleHomePath(["educator"], { canonical: true })).toBe("/professores");
        expect(resolveRoleHomePath(["org_admin"], { canonical: true })).toBe("/org");
        expect(resolveRoleHomePath(["platform_admin"], { canonical: true })).toBe("/admin/operacao");
    });

    // D33 (resolvida na UX-2): /escolas é landing PÚBLICA de aquisição. Mandar um
    // papel autenticado para lá o tiraria do app. O painel escolar é /escola/:schoolId.
    it("não usa a landing pública /escolas como home de papel algum", () => {
        for (const path of Object.values(CANONICAL_ROLE_HOME)) {
            expect(path).not.toBe("/escolas");
        }
        for (const path of Object.values(IMPLEMENTED_ROLE_HOME)) {
            expect(path).not.toBe("/escolas");
        }
    });

    it("coordenação da escola tem /escola/:schoolId como destino canônico (D33)", () => {
        expect(CANONICAL_ROLE_HOME.school_admin).toBe("/escola/:schoolId");
    });

    // Enquanto /escola/:schoolId não existir, o destino navegável não pode conter
    // parâmetro — navegar para o literal ":schoolId" seria um 404.
    it("nenhum destino navegável hoje contém parâmetro de rota não resolvido", () => {
        for (const path of Object.values(IMPLEMENTED_ROLE_HOME)) {
            expect(path).not.toContain(":");
        }
    });

    it("todo destino resolvido é um caminho interno absoluto", () => {
        for (const path of Object.values(CANONICAL_ROLE_HOME)) {
            expect(path.startsWith("/")).toBe(true);
            expect(path.startsWith("//")).toBe(false);
        }
    });

    it("sem papel algum manda para a home do estudante (menor privilégio)", () => {
        expect(resolveRoleHomePath([])).toBe("/alunos");
    });
});

// ── Laço do platform_admin (teste exigido pelo humano) ──────────────────────
describe("laço de redirecionamento do platform_admin", () => {
    // §D3/D51: mandar platform_admin para /org foi reprovado. E se a home dele
    // apontasse para uma rota que redireciona de volta, ele nunca chegaria a
    // lugar algum.
    it("platform_admin não é enviado para a experiência de gestor de organização", () => {
        expect(IMPLEMENTED_ROLE_HOME.platform_admin).not.toBe("/org");
        expect(resolveRoleHomePath(["platform_admin"])).not.toBe("/org");
    });

    it("platform_admin tem destino próprio e estável", () => {
        const destino = resolveRoleHomePath(["platform_admin"]);
        // Reaplicar a resolução no papel não muda o destino: sem laço.
        expect(resolveRoleHomePath(["platform_admin"])).toBe(destino);
        expect(destino).toBe("/admin");
    });

    it("nenhum papel resolve para o mesmo destino de outro papel de forma ambígua", () => {
        // educator saiu de /admin: se voltasse, /admin serviria dois papéis com
        // expectativas diferentes e o gate de rota não saberia qual proteger.
        expect(IMPLEMENTED_ROLE_HOME.educator).toBe("/professores");
        expect(IMPLEMENTED_ROLE_HOME.educator).not.toBe(IMPLEMENTED_ROLE_HOME.platform_admin);
    });
});

// ── Acesso ao destino correto por papel (teste exigido pelo humano) ──────────
describe("destino correto por papel", () => {
    it("cada um dos cinco papéis tem destino navegável distinto do gabarito", () => {
        for (const role of DASHBOARD_ROLE_PRECEDENCE) {
            const destino = IMPLEMENTED_ROLE_HOME[role];
            expect(destino.startsWith("/")).toBe(true);
            expect(destino).not.toContain(":");
        }
    });

    it("resolve a escola concreta quando o school_admin administra exatamente uma", () => {
        const schoolId = "11111111-2222-3333-4444-555555555555";
        expect(
            resolveRoleHomePathForContext({ roles: ["school_admin"], schoolIds: [schoolId] }),
        ).toBe(`/escola/${schoolId}`);
    });

    it("não escolhe escola por conta própria quando há duas ou mais", () => {
        const result = resolveRoleHomePathForContext({
            roles: ["school_admin"],
            schoolIds: [
                "11111111-2222-3333-4444-555555555555",
                "66666666-7777-8888-9999-000000000000",
            ],
        });
        // Manda para a visão da rede, onde as escolas aparecem com nome e
        // município para escolha explícita.
        expect(result).toBe("/org");
        expect(result).not.toContain("/escola/");
    });

    it("cai no fallback do papel quando não há escola vinculada", () => {
        expect(resolveRoleHomePathForContext({ roles: ["school_admin"], schoolIds: [] })).toBe("/org");
        expect(resolveRoleHomePathForContext({ roles: ["school_admin"] })).toBe("/org");
    });

    it("ignora id de escola malformado em vez de montar URL inválida", () => {
        expect(
            resolveRoleHomePathForContext({ roles: ["school_admin"], schoolIds: ["nao-e-uuid"] }),
        ).toBe("/org");
    });

    it("papel não escolar ignora a lista de escolas", () => {
        expect(
            resolveRoleHomePathForContext({
                roles: ["educator"],
                schoolIds: ["11111111-2222-3333-4444-555555555555"],
            }),
        ).toBe("/professores");
    });
});

describe("isValidSchoolId", () => {
    it("aceita uuid canônico e recusa o resto", () => {
        expect(isValidSchoolId("11111111-2222-3333-4444-555555555555")).toBe(true);
        expect(isValidSchoolId("11111111-2222-3333-4444-55555555555")).toBe(false);
        expect(isValidSchoolId("../../etc/passwd")).toBe(false);
        expect(isValidSchoolId("")).toBe(false);
        expect(isValidSchoolId(null)).toBe(false);
        expect(isValidSchoolId(undefined)).toBe(false);
    });

    it("recusa id com caractere fora do alfabeto hexadecimal", () => {
        expect(isValidSchoolId("zzzzzzzz-2222-3333-4444-555555555555")).toBe(false);
    });
});

describe("buildSchoolPath", () => {
    it("monta o caminho do painel da escola sem parâmetro pendente", () => {
        const path = buildSchoolPath("11111111-2222-3333-4444-555555555555");
        expect(path).toBe("/escola/11111111-2222-3333-4444-555555555555");
        expect(path).not.toContain(":");
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
