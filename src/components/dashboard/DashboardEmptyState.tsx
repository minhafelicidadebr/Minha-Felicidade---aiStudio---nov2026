// UX-1 — Estados explicativos canônicos: vazio, permissão negada e demonstração.
// Contrato §4. Nenhum deles é silencioso: todos explicam a causa e oferecem
// (quando existe) um próximo passo real.

import { Link } from "react-router-dom";
import { Database, Lock, PlayCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardEmptyVariant = "empty" | "denied" | "demo";

interface DashboardEmptyStateProps {
    variant?: DashboardEmptyVariant;
    title: string;
    description: string;
    /** Por que não há dado ainda / o que precisa acontecer. */
    hint?: string;
    action?: { label: string; to: string } | { label: string; onClick: () => void };
    icon?: LucideIcon;
    className?: string;
}

const VARIANT_STYLE: Record<
    DashboardEmptyVariant,
    { icon: LucideIcon; iconClass: string; frameClass: string; role: "status" | "alert"; badge: string }
> = {
    empty: {
        icon: Database,
        iconClass: "text-muted-foreground",
        frameClass: "border-border/50 bg-muted/20",
        role: "status",
        badge: "Sem dados ainda",
    },
    denied: {
        icon: Lock,
        iconClass: "text-destructive",
        frameClass: "border-destructive/30 bg-destructive/5",
        role: "alert",
        badge: "Acesso restrito",
    },
    demo: {
        icon: PlayCircle,
        iconClass: "text-secondary",
        frameClass: "border-secondary/40 bg-secondary/5",
        role: "status",
        badge: "Dados de demonstração",
    },
};

export default function DashboardEmptyState({
    variant = "empty",
    title,
    description,
    hint,
    action,
    icon,
    className,
}: DashboardEmptyStateProps) {
    const style = VARIANT_STYLE[variant];
    const Icon = icon ?? style.icon;

    return (
        <div
            role={style.role}
            aria-live="polite"
            className={cn(
                "flex flex-col items-center gap-3 rounded-2xl border p-6 text-center",
                style.frameClass,
                className,
            )}
            data-testid={`dashboard-empty-${variant}`}
        >
            <span
                className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl bg-background/60",
                    style.iconClass,
                )}
            >
                <Icon className="h-5 w-5" aria-hidden="true" />
            </span>

            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {style.badge}
            </span>

            <div className="space-y-1">
                <h3 className="font-display text-base font-bold">{title}</h3>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
                {hint && <p className="mx-auto max-w-sm text-xs text-muted-foreground/80">{hint}</p>}
            </div>

            {action && "to" in action ? (
                <Link
                    to={action.to}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    {action.label}
                </Link>
            ) : action ? (
                <button
                    type="button"
                    onClick={action.onClick}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    {action.label}
                </button>
            ) : null}
        </div>
    );
}
