import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Crown, ArrowRight } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { trackEvent } from "@/lib/analytics";

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { hasFeature, loading } = useSubscription();
  const navigate = useNavigate();

  const blocked = !loading && !hasFeature(feature);

  // Funil: registra o bloqueio por falta de plano (best-effort, uma vez por
  // montagem do gate bloqueado). Sem PII — só o nome do recurso.
  useEffect(() => {
    if (blocked) void trackEvent("paywall_hit", { feature });
  }, [blocked, feature]);

  if (loading) return <>{children}</>;

  if (hasFeature(feature)) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <motion.div
      className="relative rounded-3xl overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="absolute inset-0 backdrop-blur-md bg-background/60 z-10 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-display font-bold text-xl mb-2">Recurso Premium</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm">
          Faça upgrade do seu plano para desbloquear esta funcionalidade e acelerar seu aprendizado.
        </p>
        <button
          onClick={() => navigate("/#planos")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl gradient-institute text-primary-foreground font-bold text-sm shadow-warm hover:shadow-glow hover:scale-[1.02] transition-all"
        >
          <Crown className="w-4 h-4" />
          Ver Planos
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      <div className="opacity-20 pointer-events-none select-none">
        {children}
      </div>
    </motion.div>
  );
}
