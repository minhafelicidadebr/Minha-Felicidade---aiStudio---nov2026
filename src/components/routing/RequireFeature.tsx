import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

/**
 * Route guard for premium-only tools (P0 — entitlement canônico).
 *
 * Blocks direct-URL access to a route when the resolved plan (server-side,
 * via `get_my_plan()`) does not include `feature`. Unlike `FeatureGate`
 * (inline blur/upsell used within a page), this fully replaces the route so
 * the tool's content never mounts for an unentitled user — "nenhuma função
 * premium pode ser usada apenas digitando sua URL".
 *
 * While the plan is loading, nothing is unlocked by default (fail-closed);
 * the caller sees a neutral loading state instead of a content flash.
 */
export default function RequireFeature({
    feature,
    children,
}: {
    feature: string;
    children: ReactNode;
}) {
    const { hasFeature, loading } = useSubscription();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center" aria-busy="true">
                <div className="w-10 h-10 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
            </div>
        );
    }

    if (!hasFeature(feature)) {
        return <Navigate to="/subscription" replace state={{ paywallFeature: feature }} />;
    }

    return <>{children}</>;
}
