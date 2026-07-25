import { useState, useEffect, useCallback } from "react";
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

/**
 * Hook for org_admin to fetch their organization data.
 * Uses RLS-protected direct reads (org_admin has SELECT via policies).
 */
export function useOrganization() {
    const [org, setOrg] = useState<Organization | null>(null);
    const [schools, setSchools] = useState<School[]>([]);
    const [classes, setClasses] = useState<ClassRoom[]>([]);
    const [members, setMembers] = useState<Membership[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch org (user sees only orgs where they have membership)
            const { data: orgs, error: orgErr } = await supabase
                .from("organizations")
                .select("*")
                .eq("status", "active")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (orgErr || !orgs) {
                setOrg(null);
                setLoading(false);
                return;
            }

            setOrg(orgs as Organization);
            const orgId = orgs.id;

            // Fetch related data in parallel
            const [schoolsRes, membersRes, invitationsRes] = await Promise.all([
                supabase.from("schools").select("*").eq("organization_id", orgId),
                supabase.from("institutional_memberships").select("*").eq("organization_id", orgId).eq("status", "active"),
                supabase.from("institutional_invitations").select("*").eq("organization_id", orgId).is("accepted_at", null),
            ]);

            const schoolData = (schoolsRes.data || []) as School[];
            setSchools(schoolData);
            setMembers((membersRes.data || []) as Membership[]);
            setInvitations((invitationsRes.data || []) as Invitation[]);

            // Fetch classes for all schools
            if (schoolData.length > 0) {
                const schoolIds = schoolData.map(s => s.id);
                const { data: classData } = await supabase
                    .from("classes")
                    .select("*")
                    .in("school_id", schoolIds);
                setClasses((classData || []) as ClassRoom[]);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erro ao carregar dados da organização");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    return { org, schools, classes, members, invitations, loading, error, refetch: fetchAll };
}
