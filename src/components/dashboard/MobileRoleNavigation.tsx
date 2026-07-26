// UX-1 — Bottom navigation mobile por papel (contrato §8).
//
// Gate: "Nenhuma ação essencial pode desaparecer em mobile". A bottom nav carrega
// os destinos marcados como `mobile: true` na config; todo o resto continua
// alcançável pelo drawer (mesma fonte de navegação).
//
// A11y: cada alvo tem no mínimo 44×44 px (WCAG 2.2 alvo premium), `aria-current`
// na rota ativa e rótulo textual permanente (não depende de ícone/cor).

import { NavLink } from "react-router-dom";
import { getMobileNavItemsForRole } from "@/config/dashboard-navigation";
import type { DashboardRole } from "@/lib/role-home";
import { cn } from "@/lib/utils";

interface MobileRoleNavigationProps {
    role: DashboardRole;
    className?: string;
}

export default function MobileRoleNavigation({ role, className }: MobileRoleNavigationProps) {
    const items = getMobileNavItemsForRole(role);

    if (items.length === 0) return null;

    return (
        <nav
            aria-label="Navegação rápida"
            className={cn(
                "fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur md:hidden",
                // Respeita a área segura de aparelhos com gesto/notch.
                "pb-[env(safe-area-inset-bottom)]",
                className,
            )}
            data-testid="mobile-role-navigation"
        >
            <ul className="flex items-stretch justify-around">
                {items.map((item) => (
                    <li key={item.key} className="min-w-0 flex-1">
                        <NavLink
                            to={item.href}
                            className={({ isActive }) =>
                                cn(
                                    "flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Indicador de estado que não depende só de cor. */}
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            "h-0.5 w-6 rounded-full transition-colors",
                                            isActive ? "bg-primary" : "bg-transparent",
                                        )}
                                    />
                                    <item.icon className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
                                    <span className="w-full truncate text-center">
                                        {item.shortLabel ?? item.label}
                                    </span>
                                    {isActive && <span className="sr-only">(página atual)</span>}
                                </>
                            )}
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
