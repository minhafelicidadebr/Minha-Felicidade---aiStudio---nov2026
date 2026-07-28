// UX-1 — Navegação por papel (fonte única).
//
// Contrato: DASHBOARD-PRODUCT-CONTRACT §8 (responsivo) e
// DASHBOARD-COMPONENT-INVENTORY (Navbar deixa de ser shell interno).
//
// Regras desta configuração:
//  • Um item só aparece se o papel efetivo estiver em `roles`.
//  • `mobile: true` marca os itens que entram na bottom nav (máx. 5 — nenhuma
//    ação essencial pode desaparecer por breakpoint sem equivalente).
//  • `future: true` documenta a arquitetura-alvo (UX-2/3/4) SEM renderizar
//    link morto. Ao criar a rota, basta remover a flag.

import {
    Award,
    BarChart3,
    Bot,
    Building2,
    Compass,
    CreditCard,
    GraduationCap,
    Home,
    Layers,
    School,
    Settings,
    ShieldCheck,
    Target,
    Users,
    type LucideIcon,
} from "lucide-react";
import type { DashboardRole } from "@/lib/role-home";

export type DashboardNavGroup = "visao" | "gestao" | "aprender" | "ferramentas" | "conta";

export const DASHBOARD_NAV_GROUP_LABEL: Record<DashboardNavGroup, string> = {
    visao: "Visão",
    gestao: "Gestão",
    aprender: "Aprender",
    ferramentas: "Ferramentas",
    conta: "Conta",
};

export const DASHBOARD_NAV_GROUP_ORDER: readonly DashboardNavGroup[] = [
    "visao",
    "gestao",
    "aprender",
    "ferramentas",
    "conta",
] as const;

export interface DashboardNavItem {
    key: string;
    label: string;
    /** Rótulo curto para bottom nav (mobile 320px). */
    shortLabel?: string;
    href: string;
    icon: LucideIcon;
    group: DashboardNavGroup;
    roles: readonly DashboardRole[];
    /** Entra na bottom nav mobile. */
    mobile?: boolean;
    /** Rota ainda não implementada (arquitetura-alvo). Não é renderizada. */
    future?: boolean;
    /** Descrição curta usada em tooltip/aria. */
    description?: string;
}

const ALL_INSTITUTIONAL: readonly DashboardRole[] = ["platform_admin", "org_admin", "school_admin"];

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
    // ── Visão ────────────────────────────────────────────────────────────────
    {
        key: "student-home",
        label: "Minha jornada",
        shortLabel: "Início",
        href: "/dashboard",
        icon: Home,
        group: "visao",
        roles: ["student"],
        mobile: true,
        description: "Próximo passo, progresso e conquistas",
    },
    {
        key: "educator-home",
        label: "Painel pedagógico",
        shortLabel: "Painel",
        href: "/admin",
        icon: GraduationCap,
        group: "visao",
        roles: ["educator"],
        mobile: true,
        description: "Indicadores agregados das turmas",
    },
    {
        key: "org-home",
        label: "Visão da rede",
        shortLabel: "Rede",
        href: "/org",
        icon: Building2,
        group: "visao",
        roles: ALL_INSTITUTIONAL,
        mobile: true,
        description: "Implantação, adesão e decisões da rede",
    },
    {
        key: "platform-home",
        label: "Operação da plataforma",
        shortLabel: "Operação",
        href: "/admin/operacao",
        icon: ShieldCheck,
        group: "visao",
        roles: ["platform_admin"],
        future: true,
        description: "Saúde, segurança e custo do SaaS",
    },

    // ── Gestão ───────────────────────────────────────────────────────────────
    {
        // D33 (UX-2): `/escolas` é landing pública; o painel autenticado por
        // escola é `/escola/:schoolId`, criado na UX-3. Segue `future` até lá.
        key: "org-schools",
        label: "Escolas",
        shortLabel: "Escolas",
        href: "/escola/:schoolId",
        icon: School,
        group: "gestao",
        roles: ALL_INSTITUTIONAL,
        future: true,
        description: "Portfólio e maturidade de implantação",
    },
    {
        key: "org-people",
        label: "Pessoas e convites",
        shortLabel: "Pessoas",
        href: "/org",
        icon: Users,
        group: "gestao",
        roles: ALL_INSTITUTIONAL,
        mobile: true,
        description: "Membros ativos e convites pendentes",
    },
    {
        key: "org-reports",
        label: "Indicadores agregados",
        shortLabel: "Dados",
        href: "/admin",
        icon: BarChart3,
        group: "gestao",
        roles: ["org_admin", "platform_admin"],
        description: "Progresso agregado, sem dados individuais",
    },
    {
        key: "teacher-classes",
        label: "Minhas turmas",
        shortLabel: "Turmas",
        href: "/professores",
        icon: Users,
        group: "gestao",
        roles: ["educator"],
        future: true,
        description: "Hoje, agenda e atividades",
    },

    // ── Aprender ─────────────────────────────────────────────────────────────
    {
        key: "learn-journey",
        label: "Trilha de módulos",
        shortLabel: "Trilha",
        href: "/dashboard",
        icon: Compass,
        group: "aprender",
        roles: ["educator"],
        description: "Percorra o conteúdo como o estudante vê",
    },
    {
        key: "learn-quiz",
        label: "Quiz",
        shortLabel: "Quiz",
        href: "/quiz",
        icon: Target,
        group: "aprender",
        roles: ["student", "educator"],
        mobile: true,
        description: "Prática ativa com correção imediata",
    },
    {
        key: "learn-flashcards",
        label: "Flashcards",
        shortLabel: "Cards",
        href: "/flashcards",
        icon: Layers,
        group: "aprender",
        roles: ["student", "educator"],
        description: "Repetição espaçada",
    },
    {
        key: "learn-alegria",
        label: "AlegrIA",
        shortLabel: "AlegrIA",
        href: "/alegria",
        icon: Bot,
        group: "aprender",
        roles: ["student", "educator"],
        mobile: true,
        description: "Tutora de bem-estar informada por evidências",
    },

    // ── Ferramentas (curadas: o contrato pede reduzir exposição global) ──────
    {
        key: "tool-evidence",
        label: "Evidence Explorer",
        href: "/evidence",
        icon: BarChart3,
        group: "ferramentas",
        roles: ["student", "educator"],
        description: "Base científica das atividades",
    },
    {
        key: "tool-missions",
        label: "Missões",
        href: "/missions",
        icon: Award,
        group: "ferramentas",
        roles: ["student"],
        description: "Desafios sociais aplicados",
    },

    // ── Conta ────────────────────────────────────────────────────────────────
    {
        key: "account-subscription",
        label: "Assinatura",
        shortLabel: "Plano",
        href: "/subscription",
        icon: CreditCard,
        group: "conta",
        roles: ["student", "educator", "org_admin", "school_admin", "platform_admin"],
        description: "Plano atual e recursos liberados",
    },
    {
        key: "account-profile",
        label: "Perfil",
        shortLabel: "Perfil",
        href: "/profile",
        icon: Settings,
        group: "conta",
        roles: ["student", "educator", "org_admin", "school_admin", "platform_admin"],
        mobile: true,
        description: "Dados da conta e preferências",
    },
];

/** Máximo de itens na bottom nav mobile (alvos de toque confortáveis em 320px). */
export const MOBILE_NAV_MAX_ITEMS = 5;

/** Itens navegáveis (não-future) visíveis para o papel. */
export function getNavItemsForRole(role: DashboardRole): DashboardNavItem[] {
    return DASHBOARD_NAV_ITEMS.filter((item) => !item.future && item.roles.includes(role));
}

/** Itens agrupados e ordenados para a sidebar desktop/tablet. */
export function getGroupedNavItemsForRole(
    role: DashboardRole,
): { group: DashboardNavGroup; label: string; items: DashboardNavItem[] }[] {
    const items = getNavItemsForRole(role);
    return DASHBOARD_NAV_GROUP_ORDER.map((group) => ({
        group,
        label: DASHBOARD_NAV_GROUP_LABEL[group],
        items: items.filter((item) => item.group === group),
    })).filter((section) => section.items.length > 0);
}

/**
 * Itens da bottom nav mobile. Deduplica por href (dois rótulos apontando para
 * a mesma rota confundiriam o estado ativo) e respeita MOBILE_NAV_MAX_ITEMS.
 */
export function getMobileNavItemsForRole(role: DashboardRole): DashboardNavItem[] {
    const seenHref = new Set<string>();
    const items: DashboardNavItem[] = [];
    for (const item of getNavItemsForRole(role)) {
        if (!item.mobile || seenHref.has(item.href)) continue;
        seenHref.add(item.href);
        items.push(item);
        if (items.length === MOBILE_NAV_MAX_ITEMS) break;
    }
    return items;
}
