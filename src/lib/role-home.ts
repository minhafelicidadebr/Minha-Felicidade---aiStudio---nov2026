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
 * ATENÇÃO (dívida registrada em DECISIONS.md · UX-1): `/escolas` hoje é a
 * landing pública de aquisição. O mapa canônico do contrato aponta
 * school_admin → `/escolas`, mas o próprio contrato diz que o dashboard
 * escolar autenticado vive em `/escolas/:schoolId`. A UX-2 precisa desfazer
 * essa ambiguidade; até lá `resolveRoleHomePath` NÃO usa este valor para
 * school_admin (ver IMPLEMENTED_ROLE_HOME).
 */
export const CANONICAL_ROLE_HOME: Record<DashboardRole, string> = {
    platform_admin: "/admin",
    org_admin: "/org",
    school_admin: "/escolas",
    educator: "/professores",
    student: "/alunos",
};

/**
 * Destino realmente navegável nesta onda.
 *
 * `/alunos`, `/professores` e `/escolas/:schoolId` são criados nas ondas
 * UX-2/3/4. Redirecionar para eles agora produziria 404. A UX-1 entrega a
 * infraestrutura de redirect role-aware apontando para as páginas que já
 * existem — migração incremental autorizada pelo DASHBOARD-MASTER-PLAN
 * ("com feature flag ou migração incremental").
 */
export const IMPLEMENTED_ROLE_HOME: Record<DashboardRole, string> = {
    platform_admin: "/admin",
    org_admin: "/org",
    school_admin: "/org",
    educator: "/admin",
    student: "/dashboard",
};

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
