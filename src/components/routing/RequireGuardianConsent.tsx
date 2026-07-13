import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GUARDIAN_CONSENT_POLICY_VERSION } from "@/lib/guardian-consent";

type ConsentStatus = "checking" | "clear" | "blocked";

interface ConsentPayload {
  requires_consent: boolean;
  granted: boolean;
  policy_version?: string;
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

      const payload = data as unknown as ConsentPayload | null;
      const requires = Boolean(payload?.requires_consent);
      const granted = Boolean(payload?.granted);
      // Re-consentimento em mudança material de política (LGPD art. 14):
      // um consentimento concedido para uma versão ANTERIOR à atual não é
      // suficiente — o responsável precisa reautorizar sob o termo vigente.
      const outdated =
        granted &&
        payload?.policy_version != null &&
        payload.policy_version !== GUARDIAN_CONSENT_POLICY_VERSION;
      const blocked = requires && (!granted || outdated);
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
