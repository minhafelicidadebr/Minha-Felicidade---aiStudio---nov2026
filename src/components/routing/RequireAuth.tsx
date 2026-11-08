import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthStatus = "checking" | "authenticated" | "guest";

function buildRedirectTarget(pathname: string, search: string, hash: string) {
  return `/auth?redirect=${encodeURIComponent(`${pathname}${search}${hash}`)}`;
}

export default function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<AuthStatus>("checking");

  useEffect(() => {
    let active = true;

    const setSessionStatus = (session: Session | null) => {
      if (!active) return;
      setStatus(session ? "authenticated" : "guest");
    };

    supabase.auth.getSession().then(({ data: { session } }) => setSessionStatus(session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSessionStatus(session));

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" aria-busy="true">
        <div className="w-10 h-10 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
      </div>
    );
  }

  if (status === "guest") {
    return (
      <Navigate
        to={buildRedirectTarget(location.pathname, location.search, location.hash)}
        replace
        state={{ from: location }}
      />
    );
  }

  return <>{children}</>;
}
