// UX-1 — Contexto compartilhado dos dashboards.
//
// Resolve, em UMA consulta cacheada, tudo que o shell precisa saber:
//   • quem é a pessoa (papéis de aplicação + papéis institucionais);
//   • qual o papel efetivo e a home canônica;
//   • quais organizações ela pode ver (base do ContextSwitcher);
//   • qual organização está ativa (persistida e validada).
//
// Substitui, para o shell, o padrão `.limit(1).maybeSingle()` de
// `useOrganization` (que impedia múltiplos contextos). `useOrganization`
// permanece intacto nesta onda: a migração de /org acontece na UX-2.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseProfileRoles, type AppRole, type ProfileRolesPayload } from "@/lib/auth-profile";
import {
    resolveDashboardRole,
    resolveRoleHomePath,
    toDashboardRoles,
    type DashboardRole,
} from "@/lib/role-home";

const ACTIVE_ORG_STORAGE_KEY = "felicidade.dashboard.activeOrganizationId";

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
    userId: string | null;
    appRoles: AppRole[];
    memberships: DashboardMembership[];
    organizations: DashboardOrganization[];
    /** Quando os dados vieram de uma organização marcada como demonstração. */
    hasDemoOrganization: boolean;
    fetchedAt: string;
}

const EMPTY_CONTEXT: DashboardContextData = {
    userId: null,
    appRoles: [],
    memberships: [],
    organizations: [],
    hasDemoOrganization: false,
    fetchedAt: new Date(0).toISOString(),
};

async function fetchDashboardContext(): Promise<DashboardContextData> {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) return { ...EMPTY_CONTEXT, fetchedAt: new Date().toISOString() };

    const userId = session.user.id;

    const [profileResult, membershipResult, organizationResult] = await Promise.all([
        supabase.rpc("get_my_profile"),
        supabase
            .from("institutional_memberships")
            .select("organization_id, role, school_id")
            .eq("user_id", userId)
            .eq("status", "active"),
        supabase
            .from("organizations")
            .select("id, name, slug, metadata")
            .eq("status", "active")
            .order("created_at", { ascending: false }),
    ]);

    // Falha de perfil é relevante: sem papéis o shell cairia no menor privilégio
    // silenciosamente. Propagamos para o estado de erro explícito do contrato.
    if (profileResult.error) throw profileResult.error;

    const appRoles = parseProfileRoles(profileResult.data as ProfileRolesPayload | null);

    const memberships: DashboardMembership[] = (membershipResult.data ?? []).map((row) => ({
        organizationId: row.organization_id,
        role: row.role,
        schoolId: row.school_id ?? null,
    }));

    const organizationRows = organizationResult.data ?? [];
    const organizations: DashboardOrganization[] = organizationRows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug ?? null,
    }));

    const hasDemoOrganization = organizationRows.some(
        (row) => (row.metadata as { is_demo?: boolean } | null)?.is_demo === true,
    );

    return {
        userId,
        appRoles,
        memberships,
        organizations,
        hasDemoOrganization,
        fetchedAt: new Date().toISOString(),
    };
}

function readStoredOrganizationId(): string | null {
    try {
        return localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
    } catch {
        return null;
    }
}

export interface UseDashboardContextResult {
    /** Papel efetivo (maior privilégio). Fail-safe: "student". */
    role: DashboardRole;
    /** Todos os papéis de dashboard reconhecidos, por precedência. */
    roles: DashboardRole[];
    /** Home navegável para o papel efetivo. */
    roleHomePath: string;
    userId: string | null;
    organizations: DashboardOrganization[];
    activeOrganization: DashboardOrganization | null;
    setActiveOrganization: (organizationId: string) => void;
    memberships: DashboardMembership[];
    hasDemoOrganization: boolean;
    /** Timestamp da última leitura — alimenta o indicador de freshness. */
    fetchedAt: string | null;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
}

export function useDashboardContext(): UseDashboardContextResult {
    const query = useQuery({
        queryKey: ["dashboard-context"],
        queryFn: fetchDashboardContext,
        staleTime: 60_000,
        // Sem retry silencioso: resolver papel é pré-requisito do shell. Falhar
        // rápido e oferecer um botão explícito de "tentar novamente" é melhor
        // que deixar a pessoa esperando sem saber o que está acontecendo
        // (contrato §4 — erro recuperável).
        retry: false,
    });

    const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(
        readStoredOrganizationId,
    );

    // Referência estável: sem isto, o fallback `?? []` cria um array novo a cada
    // render e invalida toda memoização abaixo.
    const organizations = useMemo(() => query.data?.organizations ?? [], [query.data]);

    // Valida a organização persistida contra o que a pessoa realmente pode ver.
    // Um id órfão (perdeu acesso, trocou de rede) não pode travar o shell.
    const activeOrganization = useMemo(() => {
        if (organizations.length === 0) return null;
        return (
            organizations.find((organization) => organization.id === activeOrganizationId) ??
            organizations[0]
        );
    }, [organizations, activeOrganizationId]);

    useEffect(() => {
        if (!activeOrganization) return;
        if (activeOrganization.id === activeOrganizationId) return;
        setActiveOrganizationId(activeOrganization.id);
    }, [activeOrganization, activeOrganizationId]);

    const setActiveOrganization = useCallback((organizationId: string) => {
        setActiveOrganizationId(organizationId);
        try {
            localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, organizationId);
        } catch {
            // Modo privado / storage bloqueado: contexto vale só para a sessão.
        }
    }, []);

    const roles = useMemo(
        () =>
            toDashboardRoles({
                appRoles: query.data?.appRoles,
                membershipRoles: query.data?.memberships.map((membership) => membership.role),
            }),
        [query.data],
    );

    return {
        role: resolveDashboardRole(roles),
        roles,
        roleHomePath: resolveRoleHomePath(roles),
        userId: query.data?.userId ?? null,
        organizations,
        activeOrganization,
        setActiveOrganization,
        memberships: query.data?.memberships ?? [],
        hasDemoOrganization: query.data?.hasDemoOrganization ?? false,
        fetchedAt: query.data?.fetchedAt ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        error: (query.error as Error | null) ?? null,
        refetch: () => void query.refetch(),
    };
}
