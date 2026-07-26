// UX-1 — Lista de navegação por papel (usada na sidebar e no drawer mobile).
//
// Fonte única: src/config/dashboard-navigation.ts. Não há menu hardcoded aqui —
// era exatamente o problema do Navbar atual (nove ferramentas iguais para todos).

import { NavLink } from "react-router-dom";
import { getGroupedNavItemsForRole } from "@/config/dashboard-navigation";
import type { DashboardRole } from "@/lib/role-home";
import { cn } from "@/lib/utils";

interface RoleNavigationProps {
    role: DashboardRole;
    /** Chamado após navegar (fecha o drawer no mobile). */
    onNavigate?: () => void;
    className?: string;
}

export default function RoleNavigation({ role, onNavigate, className }: RoleNavigationProps) {
    const sections = getGroupedNavItemsForRole(role);

    return (
        <nav aria-label="Navegação principal" className={cn("space-y-5", className)} data-testid="role-navigation">
            {sections.map((section) => (
                <div key={section.group}>
                    <h2 className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {section.label}
                    </h2>
                    <ul className="space-y-0.5">
                        {section.items.map((item) => (
                            <li key={item.key}>
                                <NavLink
                                    to={item.href}
                                    end={item.href === "/"}
                                    onClick={onNavigate}
                                    className={({ isActive }) =>
                                        cn(
                                            "flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                            isActive
                                                ? "bg-primary/10 font-bold text-primary"
                                                : "text-foreground/80 hover:bg-muted hover:text-foreground",
                                        )
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={1.9} />
                                            <span className="truncate">{item.label}</span>
                                            {isActive && <span className="sr-only">(página atual)</span>}
                                        </>
                                    )}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </nav>
    );
}
