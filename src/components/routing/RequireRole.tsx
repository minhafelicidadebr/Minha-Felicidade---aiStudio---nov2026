import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { hasAnyRole, parseProfileRoles, type AppRole, type ProfileRolesPayload } from "@/lib/auth-profile";
import { resolveRoleHomePath, toDashboardRoles } from "@/lib/role-home";

type RoleStatus = "checking" | "allowed" | "denied";

export default function RequireRole({
  allowedRoles,
  children,
}: {
  allowedRoles: AppRole[];
  children: ReactNode;
}) {
  const [status, setStatus] = useState<RoleStatus>("checking");
  // UX-1: destino de acesso negado coerente com o papel real. Mandar um gestor
  // para o painel do estudante era desorientador (e sugeria rebaixamento).
  const [deniedRedirect, setDeniedRedirect] = useState<string | null>(null);
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
      setDeniedRedirect(resolveRoleHomePath(toDashboardRoles({ appRoles: roles })));
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
        <span className="sr-only">Verificando suas permissões…</span>
        <div className="w-10 h-10 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
      </div>
    );
  }

  if (status === "denied") {
    if (deniedRedirect && deniedRedirect !== "/dashboard") {
      return <Navigate to={deniedRedirect} replace state={{ accessDenied: true }} />;
    }
    return <Navigate to="/dashboard" replace state={{ accessDenied: true }} />;
  }

  return <>{children}</>;
}
