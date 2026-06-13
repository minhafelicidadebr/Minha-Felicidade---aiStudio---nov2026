import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { hasAnyRole, parseProfileRoles, type AppRole, type ProfileRolesPayload } from "@/lib/auth-profile";

type RoleStatus = "checking" | "allowed" | "denied";

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

      const roles = parseProfileRoles(data as ProfileRolesPayload | null);
      setStatus(hasAnyRole(roles, Array.from(allowedRoleSet)) ? "allowed" : "denied");
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
