// UX-1 — Estado de carregamento canônico.
// Contrato §4: nenhum bloco assíncrono pode retornar `null` silenciosamente.
// O skeleton é anunciado a leitores de tela via role="status" + aria-busy.

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type DashboardSkeletonVariant = "metrics" | "list" | "chart" | "page";

interface DashboardSkeletonProps {
    variant?: DashboardSkeletonVariant;
    /** Quantidade de blocos repetidos (cards da grade, linhas da lista). */
    count?: number;
    /** Texto anunciado a tecnologia assistiva. */
    label?: string;
    className?: string;
}

export default function DashboardSkeleton({
    variant = "metrics",
    count = 4,
    label = "Carregando dados",
    className,
}: DashboardSkeletonProps) {
    return (
        <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            className={cn("w-full", className)}
            data-testid="dashboard-skeleton"
        >
            <span className="sr-only">{label}…</span>

            {variant === "metrics" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: count }).map((_, index) => (
                        <div key={index} className="rounded-2xl border border-border/40 bg-card/40 p-4">
                            <Skeleton className="mb-3 h-4 w-24" />
                            <Skeleton className="mb-2 h-8 w-16" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    ))}
                </div>
            )}

            {variant === "list" && (
                <div className="space-y-2">
                    {Array.from({ length: count }).map((_, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/40 p-3"
                        >
                            <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                            <div className="min-w-0 flex-1 space-y-2">
                                <Skeleton className="h-3.5 w-2/5" />
                                <Skeleton className="h-3 w-3/5" />
                            </div>
                            <Skeleton className="h-8 w-16 shrink-0 rounded-lg" />
                        </div>
                    ))}
                </div>
            )}

            {variant === "chart" && (
                <div className="rounded-2xl border border-border/40 bg-card/40 p-4">
                    <Skeleton className="mb-1 h-4 w-40" />
                    <Skeleton className="mb-4 h-3 w-56" />
                    <Skeleton className="h-[220px] w-full rounded-xl" />
                </div>
            )}

            {variant === "page" && (
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-7 w-64" />
                        <Skeleton className="h-4 w-80" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="rounded-2xl border border-border/40 bg-card/40 p-4">
                                <Skeleton className="mb-3 h-4 w-24" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                        ))}
                    </div>
                    <Skeleton className="h-[220px] w-full rounded-2xl" />
                </div>
            )}
        </div>
    );
}
