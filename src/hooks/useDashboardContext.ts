// TRUST-1.3 — compatibilidade de import. A implementação e o estado vivem
// exclusivamente no DashboardContextProvider; consumidores nunca criam estado
// de tenant próprio.
export {
    useDashboardContext,
    __dashboardContextTesting,
} from "@/contexts/DashboardContext";
export type {
    DashboardMembership,
    DashboardOrganization,
    UseDashboardContextResult,
} from "@/contexts/DashboardContext";