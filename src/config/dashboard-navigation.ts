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
    /**
     * Destino do item.
     *
     * Para itens `dynamic`, este valor é o GABARITO (contém `:param`) e nunca é
     * navegado direto — `resolveNavItemHref` troca por um caminho concreto. Um
     * item dinâmico sem contexto para resolver é omitido da navegação, porque
     * renderizar `/escola/:schoolId` literal daria 404.
     */
    href: string;
    icon: LucideIcon;
    group: DashboardNavGroup;
    roles: readonly DashboardRole[];
    /** Entra na bottom nav mobile. */
    mobile?: boolean;
    /** Rota ainda não implementada (arquitetura-alvo). Não é renderizada. */
    future?: boolean;
    /**
     * O destino depende de dado em runtime (ex.: uuid de escola). A config é
     * estática, então o valor concreto vem de `resolveNavItemHref`.
     */
    dynamic?: boolean;
    /** Descrição curta usada em tooltip/aria. */
    description?: string;
}

/** Contexto necessário para resolver itens com destino dinâmico. */
export interface NavResolutionContext {
    /** Escolas que a pessoa administra, derivadas no servidor. */
    schoolIds?: readonly string[];
}

const ALL_INSTITUTIONAL: readonly DashboardRole[] = ["platform_admin", "org_admin", "school_admin"];

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
    // ── Visão ────────────────────────────────────────────────────────────────
    {
        key: "student-home",
        label: "Minha jornada",
        shortLabel: "Início",
        href: "/alunos",
        icon: Home,
        group: "visao",
        roles: ["student"],
        mobile: true,
        description: "Próximo passo, progresso e conquistas",
    },
    {
        // UX-3: saiu de `/admin` para `/professores`. `/admin` passou a ser a
        // Landing Administrativa da plataforma (§D3/D51).
        key: "educator-home",
        label: "Painel pedagógico",
        shortLabel: "Painel",
        href: "/professores",
        icon: GraduationCap,
        group: "visao",
        roles: ["educator"],
        mobile: true,
        description: "Indicadores agregados das turmas",
    },
    {
        // UX-6: absorveu o antigo item `org-people`. Os dois apontavam para
        // `/org` e deixavam o estado "ativo" da sidebar ambíguo — a pessoa não
        // sabia qual dos dois estava selecionado, porque ambos estavam.
        // A página já contém pessoas, convites e decisões: um item basta.
        key: "org-home",
        label: "Visão da rede",
        shortLabel: "Rede",
        href: "/org",
        icon: Building2,
        group: "visao",
        roles: ALL_INSTITUTIONAL,
        mobile: true,
        description: "Implantação, adesão, pessoas, convites e decisões da rede",
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
        // D33 (UX-2): `/escolas` é landing PÚBLICA; o painel autenticado por
        // escola é `/escola/:schoolId`.
        // UX-6: deixou de ser `future` e passou a ser `dynamic`. A rota existe
        // desde a UX-3, mas o href precisa de um uuid que a config estática não
        // carrega — `resolveNavItemHref` resolve com as escolas do contexto.
        key: "org-schools",
        label: "Minha escola",
        shortLabel: "Escola",
        href: "/escola/:schoolId",
        icon: School,
        group: "gestao",
        roles: ALL_INSTITUTIONAL,
        dynamic: true,
        description: "Indicadores agregados da escola",
    },
    // REMOVIDO na UX-6: `org-people` apontava para `/org`, a mesma rota de
    // `org-home`. Dois itens de menu para um destino deixam o estado "ativo"
    // indeterminado e sugerem que existem duas telas onde há uma. Pessoas e
    // convites continuam em `/org` — só não têm mais entrada própria no menu.
    // REMOVIDO na UX-3 (§D4/D52): o item `org-reports` apontava para `/admin` e
    // duplicava indicadores que já vivem em `/org`. Um segundo item levando a
    // outro painel gerava carga cognitiva sem informação nova. Não foi
    // reaproveitado para `platform_admin`: a navegação administrativa terá itens
    // próprios (Operação, Tenants, Segurança, IA e custos, Conteúdos e claims).
    {
        // Segue `future` porque uma página dedicada de turmas do docente não
        // existe. Apontá-la para `/professores` criaria dois itens de menu para
        // a mesma rota, e o estado "ativo" da navegação ficaria ambíguo.
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
        href: "/alunos",
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

/**
 * Resolve o destino concreto de um item.
 *
 * Devolve `null` quando o item é dinâmico e o contexto não permite resolver —
 * por exemplo, um `org_admin` cuja rede ainda não tem escola cadastrada. Quem
 * renderiza deve OMITIR o item nesse caso: um link para `/escola/:schoolId`
 * literal levaria a 404, e um link desabilitado só ocuparia espaço.
 *
 * Cardinalidade: com duas ou mais escolas o item também é omitido, porque
 * escolher uma sem informar o critério seria arbitrário — a lista completa vive
 * em `/org`, que já mostra nome e município de cada escola.
 */
export function resolveNavItemHref(
    item: DashboardNavItem,
    context: NavResolutionContext = {},
): string | null {
    if (!item.dynamic) return item.href;

    if (item.key === "org-schools") {
        const schoolIds = context.schoolIds ?? [];
        if (schoolIds.length !== 1) return null;
        return `/escola/${schoolIds[0]}`;
    }

    // Item dinâmico sem regra de resolução conhecida: omitir é mais seguro que
    // navegar para um gabarito com `:param`.
    return null;
}

/**
 * Itens navegáveis visíveis para o papel.
 *
 * Exclui itens `future` (rota inexistente) e itens `dynamic` que não puderam ser
 * resolvidos com o contexto recebido. O `href` devolvido é sempre concreto.
 */
export function getNavItemsForRole(
    role: DashboardRole,
    context: NavResolutionContext = {},
): DashboardNavItem[] {
    return DASHBOARD_NAV_ITEMS.filter((item) => !item.future && item.roles.includes(role))
        .map((item) => {
            const href = resolveNavItemHref(item, context);
            return href ? { ...item, href } : null;
        })
        .filter((item): item is DashboardNavItem => item !== null);
}

/** Itens agrupados e ordenados para a sidebar desktop/tablet. */
export function getGroupedNavItemsForRole(
    role: DashboardRole,
    context: NavResolutionContext = {},
): { group: DashboardNavGroup; label: string; items: DashboardNavItem[] }[] {
    const items = getNavItemsForRole(role, context);
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
export function getMobileNavItemsForRole(
    role: DashboardRole,
    context: NavResolutionContext = {},
): DashboardNavItem[] {
    const seenHref = new Set<string>();
    const items: DashboardNavItem[] = [];
    for (const item of getNavItemsForRole(role, context)) {
        if (!item.mobile || seenHref.has(item.href)) continue;
        seenHref.add(item.href);
        items.push(item);
        if (items.length === MOBILE_NAV_MAX_ITEMS) break;
    }
    return items;
}
