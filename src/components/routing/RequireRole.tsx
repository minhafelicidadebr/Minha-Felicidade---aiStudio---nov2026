import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "student" | "teacher" | "manager";
type RoleStatus = "checking" | "allowed" | "denied";

type ProfilePayload = {
  roles?: AppRole[] | string;
};

function parseRoles(payload: ProfilePayload | null): AppRole[] {
  if (!payload?.roles) return [];
  if (Array.isArray(payload.roles)) return payload.roles;

  try {
    const parsed = JSON.parse(payload.roles);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function RequireRole({
  allowedRoles,
  children,
}: {
  allowedRoles: AppRole[];
  children: ReactNode;
}) {
  const [status, setStatus] = useState<RoleStatus>("checking");
  const allowedRoleSet = useMemo(() => new Set(allowedRoles), [allowedRoles]);

  useEffect(() => {
    let active = true;

    async function checkRole() {
      const { data, error } = await supabase.rpc("get_my_profile");
      if (!active) return;

      if (error) {
        setStatus("denied");
        return;
      }

      const roles = parseRoles(data as ProfilePayload | null);
      setStatus(roles.some((role) => allowedRoleSet.has(role)) ? "allowed" : "denied");
    }

    checkRole();

    return () => {
      active = false;
    };
  }, [allowedRoleSet]);

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" aria-busy="true">
        <div className="w-10 h-10 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/dashboard" replace state={{ accessDenied: true }} />;
  }

  return <>{children}</>;
}
