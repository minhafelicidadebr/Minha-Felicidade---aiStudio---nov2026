// UX-2 — Dados de detalhe de uma organização (escolas, turmas, membros, convites).
//
// Substitui `useOrganization` (que faz .limit(1).maybeSingle()) nas telas do
// shell role-aware: aqui o organizationId vem do ContextSwitcher via
// useDashboardContext, e não de uma consulta fixa. A troca de organização no
// switcher causa refetch automático via queryKey.
//
// Mantém a mesma interface de dados para minimizar quebra na página.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Organization {
    id: string;
    name: string;
    slug: string | null;
    status: string;
    created_at: string;
}

export interface School {
    id: string;
    organization_id: string;
    name: string;
    municipality: string | null;
    state_code: string | null;
}

export interface ClassRoom {
    id: string;
    school_id: string;
    name: string;
    year: number;
    semester: number | null;
}

export interface Membership {
    id: string;
    organization_id: string;
    user_id: string;
    role: string;
    status: string;
    school_id: string | null;
    class_id: string | null;
    created_at: string;
}

export interface Invitation {
    id: string;
    organization_id: string;
    invited_email: string;
    role: string;
    token: string;
    expires_at: string;
    accepted_at: string | null;
}

interface OrganizationDetailData {
    org: Organization | null;
    schools: School[];
    classes: ClassRoom[];
    members: Membership[];
    invitations: Invitation[];
}

async function fetchOrganizationDetail(organizationId: string): Promise<OrganizationDetailData> {
    // Fetch the organization record itself
    const { data: orgData, error: orgErr } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", organizationId)
        .eq("status", "active")
        .maybeSingle();

    if (orgErr || !orgData) {
        return { org: null, schools: [], classes: [], members: [], invitations: [] };
    }

    const org = orgData as Organization;

    // Fetch related data in parallel
    const [schoolsRes, membersRes, invitationsRes] = await Promise.all([
        supabase.from("schools").select("*").eq("organization_id", organizationId),
        supabase.from("institutional_memberships").select("*").eq("organization_id", organizationId).eq("status", "active"),
        supabase.from("institutional_invitations").select("*").eq("organization_id", organizationId).is("accepted_at", null),
    ]);

    const schoolData = (schoolsRes.data || []) as School[];
    const members = (membersRes.data || []) as Membership[];
    const invitations = (invitationsRes.data || []) as Invitation[];

    // Fetch classes for all schools
    let classes: ClassRoom[] = [];
    if (schoolData.length > 0) {
        const schoolIds = schoolData.map(s => s.id);
        const { data: classData } = await supabase
            .from("classes")
            .select("*")
            .in("school_id", schoolIds);
        classes = (classData || []) as ClassRoom[];
    }

    return { org, schools: schoolData, classes, members, invitations };
}

export interface UseOrganizationDetailResult {
    org: Organization | null;
    schools: School[];
    classes: ClassRoom[];
    members: Membership[];
    invitations: Invitation[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

/**
 * Dados de detalhe de uma organização específica. Reage à troca de ID
 * (ContextSwitcher → useDashboardContext → activeOrganization.id).
 *
 * @param organizationId — ID da organização ativa (null/undefined desabilita a query).
 */
export function useOrganizationDetail(organizationId: string | null | undefined): UseOrganizationDetailResult {
    const query = useQuery({
        queryKey: ["organization-detail", organizationId],
        queryFn: () => fetchOrganizationDetail(organizationId!),
        enabled: Boolean(organizationId),
        staleTime: 30_000,
        retry: false,
    });

    return {
        org: query.data?.org ?? null,
        schools: query.data?.schools ?? [],
        classes: query.data?.classes ?? [],
        members: query.data?.members ?? [],
        invitations: query.data?.invitations ?? [],
        loading: query.isLoading,
        error: query.error ? (query.error as Error).message : null,
        refetch: () => void query.refetch(),
    };
}
