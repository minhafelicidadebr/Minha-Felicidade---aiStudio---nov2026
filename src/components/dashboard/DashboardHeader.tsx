// UX-1 — Cabeçalho do shell.
//
// Carrega o item 1 do contrato de primeira viewport: CONTEXTO ATUAL.
// Em qualquer viewport a pessoa vê: quem ela é no sistema (papel), de qual
// organização são os números (context switcher) e quando o dado foi lido.

import { SidebarTrigger } from "@/components/ui/sidebar";
import ContextSwitcher from "./ContextSwitcher";
import { formatFreshness } from "@/lib/dashboard-format";
import { DASHBOARD_ROLE_LABEL, type DashboardRole } from "@/lib/role-home";
import type { DashboardOrganization } from "@/hooks/useDashboardContext";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
    role: DashboardRole;
    title: string;
    /** Uma linha de contexto: o que esta tela responde. */
    subtitle?: string;
    organizations: DashboardOrganization[];
    activeOrganization: DashboardOrganization | null;
    onOrganizationChange: (organizationId: string) => void;
    updatedAt?: string | null;
    /** Ação primária da tela (contrato §3, item 5). */
    action?: React.ReactNode;
    className?: string;
}

export default function DashboardHeader({
    role,
    title,
    subtitle,
    organizations,
    activeOrganization,
    onOrganizationChange,
    updatedAt,
    action,
    className,
}: DashboardHeaderProps) {
    return (
        <header
            className={cn(
                "sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur",
                className,
            )}
            data-testid="dashboard-header"
        >
            <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
                {/* Abre a navegação completa em mobile/tablet (drawer do primitivo). */}
                <SidebarTrigger className="h-11 w-11 shrink-0 md:hidden" />

                <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {DASHBOARD_ROLE_LABEL[role]}
                    </p>
                    <h1 className="truncate font-display text-base font-bold leading-tight sm:text-lg">
                        {title}
                    </h1>
                </div>

                {action && <div className="shrink-0">{action}</div>}
            </div>

            {/* Linha de contexto. O ContextSwitcher é renderizado UMA única vez
          e reflui aqui em qualquer viewport: duplicar o controle criaria dois
          tab stops para a mesma ação, e esconder em mobile violaria o gate
          "nenhuma ação essencial desaparece por breakpoint". */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pb-2 sm:px-4">
                <div className="min-w-0 max-w-full">
                    <ContextSwitcher
                        organizations={organizations}
                        activeOrganization={activeOrganization}
                        onSelect={onOrganizationChange}
                    />
                </div>
                {subtitle && (
                    <p className="min-w-0 flex-1 text-xs text-muted-foreground">{subtitle}</p>
                )}
                <p className="text-[11px] text-muted-foreground">{formatFreshness(updatedAt)}</p>
            </div>
        </header>
    );
}
