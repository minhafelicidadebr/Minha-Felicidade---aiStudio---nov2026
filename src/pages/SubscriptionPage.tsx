import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, CreditCard, Calendar, Users, ArrowLeft, CheckCircle2, AlertCircle, Sparkles, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { consumePendingCheckout, startIndividualCheckout } from "@/lib/checkout";
import { planFeatureLabels } from "@/lib/plan-features";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type SubscriptionPlan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
};

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { plan, loading, isPremium, refetch } = useSubscription();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order");
      if (data) setPlans(data);
    };
    fetchPlans();
  }, []);

  // Retoma um checkout iniciado antes do login (Requirement 1.2).
  useEffect(() => {
    const pending = consumePendingCheckout();
    if (!pending) return;
    startIndividualCheckout(pending.planSlug, pending.billingInterval).catch((e) => {
      toast({
        title: "Não foi possível retomar o checkout",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    });
  }, []);

  const handleUpgrade = async (slug: string) => {
    if (slug === "advanced") {
      window.location.href = "mailto:contato@felicidadeparatodos.org?subject=Plano%20Avancado";
      return;
    }
    try {
      await startIndividualCheckout(slug, "monthly");
    } catch (e) {
      toast({
        title: "Não foi possível iniciar a assinatura",
        description: e instanceof Error ? e.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Grátis";
    return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
  };

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case "free": return <Sparkles className="w-5 h-5" />;
      case "intermediate": return <Crown className="w-5 h-5" />;
      case "advanced": return <Shield className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl pt-24 pb-16 px-4">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
        </button>

        {/* Current Plan Card */}
        <motion.div
          className="rounded-3xl border border-border p-8 mb-8 relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPremium ? "gradient-institute text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {getPlanIcon(plan.plan_slug)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Seu plano atual</p>
                <h2 className="text-2xl font-display font-bold">{plan.plan_name}</h2>
              </div>
              {isPremium && (
                <span className="ml-auto px-3 py-1 rounded-full bg-success/10 text-success text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ativo
                </span>
              )}
            </div>

            {plan.source === "organization" && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 mb-4">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Via organização: <strong>{plan.org_name}</strong></span>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-2xl bg-muted/30">
                <CreditCard className="w-4 h-4 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Cobrança</p>
                <p className="font-bold text-sm">{plan.billing_interval === "yearly" ? "Anual" : plan.plan_slug === "free" ? "—" : "Mensal"}</p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/30">
                <Calendar className="w-4 h-4 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Renovação</p>
                <p className="font-bold text-sm">
                  {plan.current_period_end
                    ? new Date(plan.current_period_end).toLocaleDateString("pt-BR")
                    : "—"}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/30">
                <Sparkles className="w-4 h-4 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">AlegrIA/dia</p>
                <p className="font-bold text-sm">{plan.limits.alegria_daily === -1 ? "∞" : plan.limits.alegria_daily || 5}</p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/30">
                <Crown className="w-4 h-4 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Recursos</p>
                <p className="font-bold text-sm">{plan.features.length} desbloqueados</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Available Plans */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Faça Upgrade
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {plans.filter(p => p.slug !== "free").map((p) => (
                <div key={p.id} className="rounded-3xl border border-border p-6 hover:shadow-warm hover:-translate-y-1 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.slug === "intermediate" ? "gradient-institute text-primary-foreground" : "bg-muted"}`}>
                      {getPlanIcon(p.slug)}
                    </div>
                    <div>
                      <h4 className="font-bold">{p.name}</h4>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-display font-bold">
                      {formatPrice(p.price_monthly)}
                    </span>
                    {p.price_monthly > 0 && <span className="text-sm text-muted-foreground">/mês</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mb-4">
                    {p.price_yearly > 0 && `Ou ${formatPrice(Math.round(p.price_yearly / 12))}/mês no plano anual`}
                  </div>
                  <ul className="space-y-1.5 mb-5">
                    {planFeatureLabels(p.slug).slice(0, 6).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleUpgrade(p.slug)}
                    className={`w-full py-3 rounded-2xl font-bold text-sm transition-all ${p.slug === "intermediate"
                      ? "gradient-institute text-primary-foreground shadow-warm hover:shadow-glow"
                      : "bg-muted hover:bg-muted/80"
                      }`}
                  >
                    {p.slug === "advanced" ? "Contato Comercial" : "Assinar Agora"}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Premium management */}
        {isPremium && (
          <motion.div
            className="rounded-3xl border border-border p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              Gerenciar Assinatura
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Para alterar, cancelar ou atualizar o método de pagamento da sua assinatura, entre em contato com nosso suporte.
            </p>
            <a
              href="mailto:contato@felicidadeparatodos.org"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
            >
              Contatar Suporte
            </a>
          </motion.div>
        )}
      </div>
      <Footer />
    </div>
  );
}
