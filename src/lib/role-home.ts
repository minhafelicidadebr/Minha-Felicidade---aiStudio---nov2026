// UX-1 — Resolução canônica de papel → home do dashboard.
//
// Contrato: DASHBOARD-ROUTE-MAP §"Redirecionamento canônico".
// Funções puras (sem I/O) para serem testáveis e reutilizáveis pelo shell,
// pelos guards de rota e pelo redirect de login.
//
// O projeto tem DOIS vocabulários de papel e a UX-1 unifica ambos:
//   1. `profiles.roles` (RPC get_my_profile) → student | teacher | manager
//   2. `institutional_memberships.role`      → platform_admin | org_admin |
//                                              school_admin | educator |
//                                              student | guardian
// O dashboard opera sobre um terceiro vocabulário derivado (DashboardRole),
// para que nenhuma tela precise conhecer as duas origens.

import type { AppRole } from "@/lib/auth-profile";

export type DashboardRole =
    | "platform_admin"
    | "org_admin"
    | "school_admin"
    | "educator"
    | "student";

/** Maior privilégio primeiro. Define qual home ganha em papéis acumulados. */
export const DASHBOARD_ROLE_PRECEDENCE: readonly DashboardRole[] = [
    "platform_admin",
    "org_admin",
    "school_admin",
    "educator",
    "student",
] as const;

const APP_ROLE_TO_DASHBOARD_ROLE: Record<AppRole, DashboardRole> = {
    manager: "org_admin",
    teacher: "educator",
    student: "student",
};

const MEMBERSHIP_ROLE_TO_DASHBOARD_ROLE: Record<string, DashboardRole> = {
    platform_admin: "platform_admin",
    org_admin: "org_admin",
    school_admin: "school_admin",
    educator: "educator",
    student: "student",
    // `guardian` NÃO é um papel de dashboard na UX-1: responsáveis usam o fluxo
    // de consentimento, não um painel. Mapear para "student" daria a um
    // responsável a home do estudante — preferimos ignorar e cair no default.
};

export const DASHBOARD_ROLE_LABEL: Record<DashboardRole, string> = {
    platform_admin: "Administração da plataforma",
    org_admin: "Gestão da rede",
    school_admin: "Coordenação da escola",
    educator: "Docente",
    student: "Estudante",
};

/**
 * Destino canônico por papel (DASHBOARD-ROUTE-MAP).
 *
 * D33 RESOLVIDA (UX-2): `/escolas` **permanece** a landing pública de
 * aquisição e NÃO é home de papel algum. O painel escolar autenticado é
 * `/escola/:schoolId` (singular, para não colidir com a landing no plural).
 * A rota ainda não existe — é criada na UX-3 —, por isso
 * `IMPLEMENTED_ROLE_HOME` continua mandando school_admin para `/org`.
 */
export const CANONICAL_ROLE_HOME: Record<DashboardRole, string> = {
    // Alvo do contrato. `/admin/operacao` ainda não existe como rota; até lá a
    // Landing Administrativa é servida em `/admin` (ver IMPLEMENTED_ROLE_HOME).
    platform_admin: "/admin/operacao",
    org_admin: "/org",
    school_admin: "/escola/:schoolId",
    educator: "/professores",
    student: "/alunos",
};

/**
 * Destino realmente navegável nesta onda.
 *
 * `/alunos`, `/professores` e `/escola/:schoolId` são criados nas ondas
 * UX-3/UX-4. Redirecionar para eles agora produziria 404. A infraestrutura de
 * redirect role-aware aponta para as páginas que já existem — migração
 * incremental autorizada pelo DASHBOARD-MASTER-PLAN ("com feature flag ou
 * migração incremental").
 */
export const IMPLEMENTED_ROLE_HOME: Record<DashboardRole, string> = {
    // UX-3 (§D3/D51): `/admin` deixou de ser o painel docente e passou a ser a
    // Landing Administrativa da plataforma. Redirecionar `platform_admin` para
    // `/org` foi REPROVADO pelo humano — confunde papel e pode mascarar falha
    // de autorização. Quando `/admin/operacao` existir, este valor migra.
    platform_admin: "/admin",
    org_admin: "/org",
    // Fallback: `school_admin` sem escola resolvível cai na visão da rede, que
    // lista as escolas com nome e município. O destino real por escola é
    // resolvido em runtime por `resolveRoleHomePathForContext`, porque um mapa
    // de constantes não pode carregar um uuid.
    school_admin: "/org",
    educator: "/professores",
    student: "/dashboard",
};

/** Caminho do painel de uma escola específica. Único lugar que monta esta URL. */
export function buildSchoolPath(schoolId: string): string {
    return `/escola/${schoolId}`;
}

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida o formato de um id de escola vindo da URL.
 *
 * Serve ao contrato §2 item 7: `schoolId` malformado precisa cair no estado de
 * acesso negado SEM chamada de rede. Sem esta checagem, um valor arbitrário na
 * URL viraria uma consulta ao banco — barulho inútil e superfície a mais.
 */
export function isValidSchoolId(value: string | null | undefined): boolean {
    if (!value) return false;
    return UUID_PATTERN.test(value);
}

export const DEFAULT_DASHBOARD_ROLE: DashboardRole = "student";

/** Converte os papéis de aplicação (profiles.roles) em papéis de dashboard. */
export function fromAppRoles(appRoles: readonly AppRole[] | null | undefined): DashboardRole[] {
    if (!appRoles?.length) return [];
    return appRoles
        .map((role) => APP_ROLE_TO_DASHBOARD_ROLE[role])
        .filter((role): role is DashboardRole => Boolean(role));
}

/** Converte papéis de membership institucional em papéis de dashboard. */
export function fromMembershipRoles(membershipRoles: readonly string[] | null | undefined): DashboardRole[] {
    if (!membershipRoles?.length) return [];
    return membershipRoles
        .map((role) => MEMBERSHIP_ROLE_TO_DASHBOARD_ROLE[role])
        .filter((role): role is DashboardRole => Boolean(role));
}

/**
 * Une as duas origens de papel, sem duplicatas, ordenado por precedência.
 * O resultado é estável (ordem previsível) para facilitar teste e memoização.
 */
export function toDashboardRoles(input: {
    appRoles?: readonly AppRole[] | null;
    membershipRoles?: readonly string[] | null;
}): DashboardRole[] {
    const found = new Set<DashboardRole>([
        ...fromAppRoles(input.appRoles),
        ...fromMembershipRoles(input.membershipRoles),
    ]);
    return DASHBOARD_ROLE_PRECEDENCE.filter((role) => found.has(role));
}

/** Papel efetivo (maior privilégio). Fail-safe: sem papel reconhecido → student. */
export function resolveDashboardRole(roles: readonly DashboardRole[] | null | undefined): DashboardRole {
    if (!roles?.length) return DEFAULT_DASHBOARD_ROLE;
    return (
        DASHBOARD_ROLE_PRECEDENCE.find((role) => roles.includes(role)) ?? DEFAULT_DASHBOARD_ROLE
    );
}

/**
 * Caminho de home para o conjunto de papéis.
 * @param options.canonical `true` devolve o destino do contrato (pós-migração),
 *                          `false` (default) devolve o destino navegável hoje.
 */
export function resolveRoleHomePath(
    roles: readonly DashboardRole[] | null | undefined,
    options: { canonical?: boolean } = {},
): string {
    const role = resolveDashboardRole(roles);
    return options.canonical ? CANONICAL_ROLE_HOME[role] : IMPLEMENTED_ROLE_HOME[role];
}

/** True quando o papel pode ver dados institucionais agregados (org/escola). */
export function canSeeInstitutionalData(role: DashboardRole): boolean {
    return role === "platform_admin" || role === "org_admin" || role === "school_admin";
}

/**
 * Home navegável considerando o contexto real da pessoa (UX-3).
 *
 * Diferença em relação a `resolveRoleHomePath`: aquela função opera só sobre
 * papéis e devolve constantes; esta recebe as escolas que a pessoa realmente
 * administra e pode devolver um caminho com uuid concreto.
 *
 * Regra de cardinalidade (§3 do spec, itens 4–6):
 *   • exatamente 1 escola  → vai direto ao painel dessa escola;
 *   • 2 ou mais escolas    → NÃO escolhe por conta própria; manda para a visão
 *                            da rede, onde as escolas aparecem com nome e
 *                            município para escolha explícita;
 *   • nenhuma escola       → fallback do papel.
 *
 * Escolher automaticamente uma entre várias seria pior que pedir a escolha: a
 * pessoa não saberia por que caiu naquela escola nem que existem outras.
 */
export function resolveRoleHomePathForContext(input: {
    roles?: readonly DashboardRole[] | null;
    /** Escolas que a pessoa administra, derivadas no servidor. */
    schoolIds?: readonly string[] | null;
}): string {
    const role = resolveDashboardRole(input.roles);
    if (role !== "school_admin") return IMPLEMENTED_ROLE_HOME[role];

    const schoolIds = (input.schoolIds ?? []).filter(isValidSchoolId);
    if (schoolIds.length === 1) return buildSchoolPath(schoolIds[0]);
    return IMPLEMENTED_ROLE_HOME.school_admin;
}
