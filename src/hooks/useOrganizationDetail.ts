import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    assertInstitutionalPayload,
    institutionalQueryKeys,
} from "@/lib/institutional-query-keys";
import type {
    OrganizationSubscriptionSnapshot,
    ServerDeploymentSnapshot,
} from "@/lib/network-deployment";

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
    status: string;
}

export interface ClassRoom {
    id: string;
    school_id: string;
    name: string;
    year: number;
    semester: number | null;
    status: string;
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
    school_id: string | null;
    class_id: string | null;
    token: string;
    expires_at: string;
    accepted_at: string | null;
}

interface OrganizationDetailData {
    org: Organization;
    schools: School[];
    classes: ClassRoom[];
    members: Membership[];
    invitations: Invitation[];
    serverSnapshot: ServerDeploymentSnapshot | null;
    linkedSubscription: OrganizationSubscriptionSnapshot | null;
    unlinkedSubscriptions: OrganizationSubscriptionSnapshot[];
    subscriptionQueryError: string | null;
}

async function fetchOrganizationDetail(organizationId: string): Promise<OrganizationDetailData> {
    const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", organizationId)
        .eq("status", "active")
        .maybeSingle();

    if (orgError) throw orgError;
    if (!orgData) throw new Error("Organização não disponível para esta conta.");
    assertInstitutionalPayload(organizationId, orgData.id, "organization");

    const [schoolsResult, membersResult, invitationsResult, snapshotResult] = await Promise.all([
        supabase
            .from("schools")
            .select("*")
            .eq("organization_id", organizationId)
            .eq("status", "active"),
        supabase
            .from("institutional_memberships")
            .select("*")
            .eq("organization_id", organizationId)
            .eq("status", "active"),
        supabase
            .from("institutional_invitations")
            .select("*")
            .eq("organization_id", organizationId)
            .is("accepted_at", null),
        supabase.rpc("get_org_deployment_snapshot", {
            _organization_id: organizationId,
        }),
    ]);

    if (schoolsResult.error) throw schoolsResult.error;
    if (membersResult.error) throw membersResult.error;
    if (invitationsResult.error) throw invitationsResult.error;

    const schools = (schoolsResult.data ?? []) as School[];
    let classes: ClassRoom[] = [];
    if (schools.length > 0) {
        const { data, error } = await supabase
            .from("classes")
            .select("*")
            .in("school_id", schools.map((school) => school.id))
            .eq("status", "active");
        if (error) throw error;
        classes = (data ?? []) as ClassRoom[];
    }

    let serverSnapshot: ServerDeploymentSnapshot | null = null;
    let subscriptionQueryError: string | null = null;

    if (snapshotResult.error) {
        subscriptionQueryError = snapshotResult.error.message;
    } else if (
        snapshotResult.data &&
        typeof snapshotResult.data === "object" &&
        !Array.isArray(snapshotResult.data)
    ) {
        const parsed = snapshotResult.data as unknown as ServerDeploymentSnapshot;
        assertInstitutionalPayload(organizationId, parsed.organization_id, "organization");
        serverSnapshot = parsed;
    } else {
        subscriptionQueryError = "Resposta contratual inválida do servidor.";
    }

    const linkedSubscription = serverSnapshot?.subscription ?? null;
    const unlinkedSubscriptions: OrganizationSubscriptionSnapshot[] =
        serverSnapshot && serverSnapshot.unlinked_active_subscriptions_count > 0
            ? Array.from({ length: serverSnapshot.unlinked_active_subscriptions_count }, (_, idx) => ({
                  id: `unlinked-${idx + 1}`,
                  organization_name: orgData.name,
                  organization_id: null,
                  status: "active",
                  billing_interval: "monthly",
                  max_seats: serverSnapshot.unlinked_max_seats || 30,
                  current_period_start: null,
                  current_period_end: null,
              }))
            : [];

    return {
        org: orgData as Organization,
        schools,
        classes,
        members: (membersResult.data ?? []) as Membership[],
        invitations: (invitationsResult.data ?? []) as Invitation[],
        serverSnapshot,
        linkedSubscription,
        unlinkedSubscriptions,
        subscriptionQueryError,
    };
}

export interface UseOrganizationDetailResult {
    org: Organization | null;
    schools: School[];
    classes: ClassRoom[];
    members: Membership[];
    invitations: Invitation[];
    serverSnapshot: ServerDeploymentSnapshot | null;
    linkedSubscription: OrganizationSubscriptionSnapshot | null;
    unlinkedSubscriptions: OrganizationSubscriptionSnapshot[];
    subscriptionQueryError: string | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

/** Dados operacionais da organização ativa, particionados por identidade e tenant. */
export function useOrganizationDetail(
    userId: string | null,
    organizationId: string | null | undefined,
): UseOrganizationDetailResult {
    const enabled = Boolean(userId && organizationId);
    const query = useQuery({
        queryKey: institutionalQueryKeys.organization(userId, organizationId),
        queryFn: () => fetchOrganizationDetail(organizationId!),
        enabled,
        staleTime: 30_000,
        retry: false,
    });

    return {
        org: query.data?.org ?? null,
        schools: query.data?.schools ?? [],
        classes: query.data?.classes ?? [],
        members: query.data?.members ?? [],
        invitations: query.data?.invitations ?? [],
        serverSnapshot: query.data?.serverSnapshot ?? null,
        linkedSubscription: query.data?.linkedSubscription ?? null,
        unlinkedSubscriptions: query.data?.unlinkedSubscriptions ?? [],
        subscriptionQueryError: query.data?.subscriptionQueryError ?? null,
        loading: enabled && query.isLoading,
        error: query.error ? (query.error as Error).message : null,
        refetch: () => void query.refetch(),
    };
}