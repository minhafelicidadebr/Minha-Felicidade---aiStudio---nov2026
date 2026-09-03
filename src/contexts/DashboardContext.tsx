import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { parseProfileRoles, type AppRole, type ProfileRolesPayload } from "@/lib/auth-profile";
import { institutionalQueryKeys } from "@/lib/institutional-query-keys";
import {
    resolveDashboardRole,
    resolveRoleHomePath,
    toDashboardRoles,
    type DashboardRole,
} from "@/lib/role-home";

const STORAGE_PREFIX = "felicidade.dashboard.activeOrganizationId";

export interface DashboardOrganization {
    id: string;
    name: string;
    slug: string | null;
}

export interface DashboardMembership {
    organizationId: string;
    role: string;
    schoolId: string | null;
}

interface DashboardContextData {
    userId: string;
    appRoles: AppRole[];
    memberships: DashboardMembership[];
    organizations: DashboardOrganization[];
    hasDemoOrganization: boolean;
    fetchedAt: string;
}

interface IdentityState {
    resolved: boolean;
    userId: string | null;
}

interface SelectionState {
    userId: string | null;
    organizationId: string | null;
    initialized: boolean;
    invalidPersistedId: boolean;
}

export interface UseDashboardContextResult {
    role: DashboardRole;
    roles: DashboardRole[];
    roleHomePath: string;
    userId: string | null;
    organizations: DashboardOrganization[];
    activeOrganization: DashboardOrganization | null;
    setActiveOrganization: (organizationId: string) => void;
    memberships: DashboardMembership[];
    hasDemoOrganization: boolean;
    fetchedAt: string | null;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
    selectionRequired: boolean;
}

const DashboardContext = createContext<UseDashboardContextResult | null>(null);

function storageKey(userId: string): string {
    return `${STORAGE_PREFIX}.${userId}`;
}

function readStoredOrganizationId(userId: string): string | null {
    try {
        return sessionStorage.getItem(storageKey(userId));
    } catch {
        return null;
    }
}

function removeStoredOrganizationId(userId: string): void {
    try {
        sessionStorage.removeItem(storageKey(userId));
    } catch {
        // Storage bloqueado: a seleção em memória continua fail-closed.
    }
}

async function fetchDashboardContext(expectedUserId: string): Promise<DashboardContextData> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.id !== expectedUserId) {
        throw new Error("A sessão mudou durante a resolução do contexto institucional.");
    }

    const [profileResult, membershipResult, organizationResult, schoolResult] = await Promise.all([
        supabase.rpc("get_my_profile"),
        supabase
            .from("institutional_memberships")
            .select("organization_id, role, school_id")
            .eq("user_id", expectedUserId)
            .eq("status", "active"),
        supabase
            .from("organizations")
            .select("id, name, slug, metadata")
            .eq("status", "active")
            .order("created_at", { ascending: false }),
        supabase
            .from("schools")
            .select("id, organization_id")
            .eq("status", "active"),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (membershipResult.error) throw membershipResult.error;
    if (organizationResult.error) throw organizationResult.error;
    if (schoolResult.error) throw schoolResult.error;

    const organizationRows = organizationResult.data ?? [];
    const authorizedOrganizations = new Set(organizationRows.map((row) => row.id));
    const activeSchools = new Set((schoolResult.data ?? []).map((row) => row.id));
    const memberships: DashboardMembership[] = (membershipResult.data ?? [])
        .filter((row) => authorizedOrganizations.has(row.organization_id))
        .filter((row) => !row.school_id || activeSchools.has(row.school_id))
        .map((row) => ({
            organizationId: row.organization_id,
            role: row.role,
            schoolId: row.school_id ?? null,
        }));

    return {
        userId: expectedUserId,
        appRoles: parseProfileRoles(profileResult.data as ProfileRolesPayload | null),
        memberships,
        organizations: organizationRows.map((row) => ({
            id: row.id,
            name: row.name,
            slug: row.slug ?? null,
        })),
        hasDemoOrganization: organizationRows.some(
            (row) => (row.metadata as { is_demo?: boolean } | null)?.is_demo === true,
        ),
        fetchedAt: new Date().toISOString(),
    };
}

export function DashboardContextProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const previousUserId = useRef<string | null | undefined>(undefined);
    const [identity, setIdentity] = useState<IdentityState>({ resolved: false, userId: null });
    const [selection, setSelection] = useState<SelectionState>({
        userId: null,
        organizationId: null,
        initialized: false,
        invalidPersistedId: false,
    });

    useEffect(() => {
        let mounted = true;

        const applySession = (session: Session | null) => {
            if (!mounted) return;
            const nextUserId = session?.user.id ?? null;
            const previous = previousUserId.current;

            if (previous !== undefined && previous !== nextUserId) {
                void queryClient.cancelQueries({ queryKey: institutionalQueryKeys.root() });
                queryClient.removeQueries({ queryKey: institutionalQueryKeys.root() });
                setSelection({
                    userId: nextUserId,
                    organizationId: null,
                    initialized: false,
                    invalidPersistedId: false,
                });
            }

            previousUserId.current = nextUserId;
            setIdentity({ resolved: true, userId: nextUserId });
        };

        void supabase.auth.getSession().then(({ data }) => applySession(data.session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            applySession(session);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [queryClient]);

    const query = useQuery({
        queryKey: institutionalQueryKeys.context(identity.userId),
        queryFn: () => fetchDashboardContext(identity.userId!),
        enabled: identity.resolved && Boolean(identity.userId),
        staleTime: 60_000,
        retry: false,
    });

    const organizations = useMemo(() => query.data?.organizations ?? [], [query.data]);

    useEffect(() => {
        const userId = identity.userId;
        if (!userId || !query.data) {
            if (identity.resolved && !userId && !selection.initialized) {
                setSelection({ userId: null, organizationId: null, initialized: true, invalidPersistedId: false });
            }
            return;
        }

        if (selection.userId !== userId || !selection.initialized) {
            const storedId = readStoredOrganizationId(userId);
            if (storedId) {
                const isAuthorized = organizations.some((organization) => organization.id === storedId);
                if (isAuthorized) {
                    setSelection({ userId, organizationId: storedId, initialized: true, invalidPersistedId: false });
                } else {
                    removeStoredOrganizationId(userId);
                    setSelection({ userId, organizationId: null, initialized: true, invalidPersistedId: true });
                }
                return;
            }

            // Sem intenção explícita prévia, o primeiro item da ordenação do
            // servidor é o default documentado. Id persistido inválido NÃO cai aqui.
            setSelection({
                userId,
                organizationId: organizations[0]?.id ?? null,
                initialized: true,
                invalidPersistedId: false,
            });
            return;
        }

        if (
            selection.organizationId &&
            !organizations.some((organization) => organization.id === selection.organizationId)
        ) {
            removeStoredOrganizationId(userId);
            setSelection({ userId, organizationId: null, initialized: true, invalidPersistedId: true });
        }
    }, [identity, organizations, query.data, selection]);

    const activeOrganization = useMemo(
        () => organizations.find((organization) => organization.id === selection.organizationId) ?? null,
        [organizations, selection.organizationId],
    );

    const setActiveOrganization = useCallback((organizationId: string) => {
        const userId = identity.userId;
        if (!userId || !organizations.some((organization) => organization.id === organizationId)) {
            if (userId) removeStoredOrganizationId(userId);
            setSelection({ userId, organizationId: null, initialized: true, invalidPersistedId: true });
            return;
        }

        setSelection({ userId, organizationId, initialized: true, invalidPersistedId: false });
        try {
            sessionStorage.setItem(storageKey(userId), organizationId);
        } catch {
            // Cada aba mantém a seleção em memória quando sessionStorage falha.
        }
    }, [identity.userId, organizations]);

    const roles = useMemo(
        () => toDashboardRoles({
            appRoles: query.data?.appRoles,
            membershipRoles: query.data?.memberships.map((membership) => membership.role),
        }),
        [query.data],
    );

    const value = useMemo<UseDashboardContextResult>(() => ({
        role: resolveDashboardRole(roles),
        roles,
        roleHomePath: resolveRoleHomePath(roles),
        userId: identity.userId,
        organizations,
        activeOrganization,
        setActiveOrganization,
        memberships: query.data?.memberships ?? [],
        hasDemoOrganization: query.data?.hasDemoOrganization ?? false,
        fetchedAt: query.data?.fetchedAt ?? null,
        isLoading:
            !identity.resolved ||
            (Boolean(identity.userId) && query.isLoading) ||
            (Boolean(identity.userId) && !query.isError && !selection.initialized),
        isError: query.isError,
        error: (query.error as Error | null) ?? null,
        refetch: () => void query.refetch(),
        selectionRequired:
            selection.initialized &&
            organizations.length > 0 &&
            !activeOrganization &&
            selection.invalidPersistedId,
    }), [
        activeOrganization,
        identity,
        organizations,
        query,
        roles,
        selection,
        setActiveOrganization,
    ]);

    return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext(): UseDashboardContextResult {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error("useDashboardContext exige um DashboardContextProvider único.");
    }
    return context;
}

export const __dashboardContextTesting = { storageKey };