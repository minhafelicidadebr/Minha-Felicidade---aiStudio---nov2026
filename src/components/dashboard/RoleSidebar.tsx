// UX-1 — Sidebar do shell (desktop/tablet; vira drawer no mobile).
//
// Reutiliza o primitivo já instalado `ui/sidebar.tsx` (decisão do inventário:
// "Preservar — base do shell desktop/tablet"), sem novo framework de layout.
// O conteúdo vem de RoleNavigation para haver UMA fonte de navegação.

import { Link } from "react-router-dom";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
} from "@/components/ui/sidebar";
import logoIcon from "@/assets/logo-mf-icon.png";
import RoleNavigation from "./RoleNavigation";
import type { NavResolutionContext } from "@/config/dashboard-navigation";
import { DASHBOARD_ROLE_LABEL, type DashboardRole } from "@/lib/role-home";
import { useSidebar } from "@/components/ui/sidebar";

interface RoleSidebarProps {
    role: DashboardRole;
    /** Home do papel — o clique na marca volta para o lugar certo. */
    homePath: string;
    /** Contexto para resolver itens de destino dinâmico (ex.: escola). */
    navContext?: NavResolutionContext;
}

export default function RoleSidebar({ role, homePath, navContext }: RoleSidebarProps) {
    const { isMobile, setOpenMobile } = useSidebar();

    const closeOnMobile = () => {
        if (isMobile) setOpenMobile(false);
    };

    return (
        <Sidebar collapsible="offcanvas">
            <SidebarHeader className="border-b border-sidebar-border/60">
                <Link
                    to={homePath}
                    onClick={closeOnMobile}
                    className="flex min-h-11 items-center gap-2.5 rounded-xl px-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    <img
                        src={logoIcon}
                        alt=""
                        aria-hidden="true"
                        className="h-8 w-8 shrink-0 rounded-lg object-contain"
                    />
                    <span className="min-w-0">
                        <span className="block truncate font-display text-sm font-bold leading-tight">
                            Minha Felicidade
                        </span>
                        <span className="block truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                            {DASHBOARD_ROLE_LABEL[role]}
                        </span>
                    </span>
                </Link>
            </SidebarHeader>

            <SidebarContent className="px-2 py-3">
                <RoleNavigation role={role} onNavigate={closeOnMobile} navContext={navContext} />
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border/60">
                <p className="px-2 py-1 text-[10px] leading-relaxed text-muted-foreground">
                    Plataforma independente do Instituto Felicidade Para Todos. Painéis mostram apenas
                    dados agregados.
                </p>
            </SidebarFooter>
        </Sidebar>
    );
}
