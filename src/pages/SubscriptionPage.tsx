import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, CreditCard, Calendar, Users, ArrowLeft, CheckCircle2, AlertCircle, Sparkles, Shield, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { consumePendingCheckout, startIndividualCheckout } from "@/lib/checkout";
import { claimEscolarSubscription, claimEscolarWithToken } from "@/lib/claim-escolar";
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

type PaymentRow = {
  created_at: string;
  kind: string;
  plan_slug: string;
  plan_name: string | null;
  billing_interval: string;
  amount_brl_cents: number;
  status: string;
  payment_ref: string | null;
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  approved: "Aprovado",
  pending: "Aguardando pagamento",
  rejected: "Recusado",
  expired: "Expirado",
};

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { plan, loading, isPremium, refetch } = useSubscription();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [canceling, setCanceling] = useState(false);
  const [canceled, setCanceled] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimToken, setClaimToken] = useState("");

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

  // Histórico de pagamentos do próprio usuário (RPC self-scoped).
  // Cast: get_my_payment_history ainda não está nos tipos gerados pelo Lovable
  // (os tipos são regenerados quando a migration é aplicada no Lovable Cloud).
  useEffect(() => {
    const fetchPayments = async () => {
      const { data, error } = await supabase.rpc("get_my_payment_history" as never);
      if (!error && data) setPayments(data as unknown as PaymentRow[]);
    };
    fetchPayments();
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

  const handleCancel = async () => {
    if (!window.confirm("Cancelar a renovação da sua assinatura? Você mantém o acesso até o fim do ciclo atual e não haverá nova cobrança.")) return;
    setCanceling(true);
    try {
      // RPC nova (ainda não nos tipos gerados até o Lovable aplicar a migration).
      const { error } = await supabase.rpc("request_subscription_cancellation" as never);
      if (error) throw error;
      setCanceled(true);
      toast({
        title: "Renovação cancelada",
        description: "Você mantém o acesso até o fim do ciclo atual. Não haverá nova cobrança.",
      });
    } catch (e) {
      toast({
        title: "Não foi possível cancelar",
        description: e instanceof Error ? e.message : "Tente novamente ou fale com o suporte.",
        variant: "destructive",
      });
    } finally {
      setCanceling(false);
    }
  };

  const reportClaim = (result: Awaited<ReturnType<typeof claimEscolarSubscription>>) => {
    if (result.ok) {
      toast({
        title: "Assinatura escolar associada! 🎉",
        description: result.org_name ? `Organização: ${result.org_name}` : undefined,
      });
      refetch();
    } else if (result.reason === "email_unconfirmed") {
      toast({
        title: "Confirme seu e-mail primeiro",
        description: "Para associar a assinatura escolar, confirme o e-mail da sua conta e tente de novo.",
        variant: "destructive",
      });
    } else if (result.reason === "no_claimable_intent") {
      toast({
        title: "Nenhuma assinatura escolar encontrada",
        description: "Não achamos uma compra escolar paga para o e-mail desta conta. Use o mesmo e-mail do checkout ou o código de associação.",
      });
    } else if (result.reason === "invalid_token") {
      toast({
        title: "Código inválido",
        description: "Não encontramos uma assinatura escolar paga para este código. Confira o código do e-mail.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Não foi possível associar agora", description: "Tente novamente em instantes.", variant: "destructive" });
    }
  };

  const handleClaimEscolar = async () => {
    setClaiming(true);
    try {
      reportClaim(await claimEscolarSubscription());
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimToken = async () => {
    const token = claimToken.trim();
    if (!token) return;
    setClaiming(true);
    try {
      reportClaim(await claimEscolarWithToken(token));
    } finally {
      setClaiming(false);
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

        {/* Claim de assinatura escolar paga antes do cadastro (Req 2.3) */}
        {!isPremium && (
          <motion.div
            className="rounded-3xl border border-border p-6 mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h3 className="font-display font-bold text-lg mb-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Assinatura escolar paga antes do cadastro?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Se sua escola pagou o Plano Escolar antes de você criar a conta, associe agora — use o
              mesmo e-mail (confirmado) do checkout.
            </p>
            <button
              onClick={handleClaimEscolar}
              disabled={claiming}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl gradient-institute text-primary-foreground text-sm font-semibold shadow-warm hover:shadow-glow transition-all disabled:opacity-60"
            >
              {claiming ? "Associando..." : "Associar assinatura escolar"}
            </button>

            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">
                Criou a conta com um e-mail diferente do checkout? Informe o código de associação que
                enviamos por e-mail:
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={claimToken}
                  onChange={(e) => setClaimToken(e.target.value)}
                  placeholder="Código de associação"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <button
                  onClick={handleClaimToken}
                  disabled={claiming || !claimToken.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium transition-colors disabled:opacity-60"
                >
                  Usar código
                </button>
              </div>
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
            {canceled ? (
              <p className="text-sm text-muted-foreground">
                Renovação cancelada. Você mantém o acesso até{" "}
                {plan.current_period_end ? new Date(plan.current_period_end).toLocaleDateString("pt-BR") : "o fim do ciclo atual"}
                {" "}e não haverá nova cobrança.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Você pode cancelar a renovação a qualquer momento — o acesso continua até o fim do ciclo atual,
                  sem nova cobrança. Para reembolso ou troca de método de pagamento, fale com o suporte.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleCancel}
                    disabled={canceling}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    {canceling ? "Cancelando..." : "Cancelar renovação"}
                  </button>
                  <a
                    href="mailto:contato@felicidadeparatodos.org"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
                  >
                    Contatar Suporte
                  </a>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Faturas e pagamentos (histórico do próprio usuário) */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Faturas e pagamentos
          </h3>
          {payments.length === 0 ? (
            <div className="rounded-2xl border border-border p-6 text-sm text-muted-foreground text-center">
              Nenhum pagamento ainda. Quando você assinar um plano, seus pagamentos aparecem aqui.
            </div>
          ) : (
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
              {payments.map((p, i) => {
                const statusColor =
                  p.status === "approved" ? "text-success"
                    : p.status === "rejected" ? "text-destructive"
                      : "text-muted-foreground";
                return (
                  <div key={`${p.payment_ref ?? "ref"}-${i}`} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {p.plan_name ?? p.plan_slug}{p.kind === "escolar" ? " · Escolar" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("pt-BR")} · {p.billing_interval === "yearly" ? "Anual" : "Mensal"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm">{formatPrice(p.amount_brl_cents)}</p>
                      <span className={`text-xs font-semibold ${statusColor}`}>
                        {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
