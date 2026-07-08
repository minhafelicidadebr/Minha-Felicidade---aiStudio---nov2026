import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type ConsentStatus = "checking" | "clear" | "blocked";

interface ConsentPayload {
  requires_consent: boolean;
  granted: boolean;
}

/**
 * Rede de segurança do consentimento LGPD art. 14: mesmo que o adolescente
 * feche a aba durante o cadastro, ou faça login numa conta menor de idade
 * ainda sem consentimento registrado, nenhuma rota privada é alcançável até
 * a autorização do responsável ser concluída.
 */
export default function RequireGuardianConsent({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<ConsentStatus>("checking");

  useEffect(() => {
    let active = true;

    async function checkConsent() {
      const { data, error } = await supabase.rpc("get_my_guardian_consent_status");
      if (!active) return;

      if (error) {
        setStatus("clear");
        return;
      }

      const payload = data as ConsentPayload | null;
      const blocked = Boolean(payload?.requires_consent) && !payload?.granted;
      setStatus(blocked ? "blocked" : "clear");
    }

    checkConsent();

    return () => {
      active = false;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" aria-busy="true">
        <div className="w-10 h-10 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <Navigate
        to={`/consentimento-responsavel?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}
