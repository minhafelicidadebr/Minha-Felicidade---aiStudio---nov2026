import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles, Crown, Rocket, ArrowRight, Building2, Users, Zap, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startIndividualCheckout } from "@/lib/checkout";
import { toast } from "@/hooks/use-toast";
import { planFeatureLabels } from "@/lib/plan-features";

type SubscriptionPlan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
};

const planMeta: Record<string, { icon: LucideIcon; gradient: string }> = {
  free: { icon: Sparkles, gradient: "bg-card" },
  intermediate: { icon: Crown, gradient: "gradient-card-gold" },
  advanced: { icon: Rocket, gradient: "bg-card" },
};

export default function PricingSection() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [showSchool, setShowSchool] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order");
      if (data) setPlans(data);
    };
    fetchPlans();
  }, []);

  const formatPrice = (cents: number) => {
    if (cents === 0) return "R$ 0";
    return `R$ ${Math.round(cents / 100)}`;
  };

  const handleIndividualCta = async (p: SubscriptionPlan) => {
    if (p.price_monthly === 0) {
      navigate("/auth");
      return;
    }
    if (p.slug === "advanced") {
      window.location.href = "mailto:contato@felicidadeparatodos.org?subject=Plano%20Avancado";
      return;
    }
    try {
      await startIndividualCheckout(p.slug, annual ? "yearly" : "monthly");
    } catch (e) {
      toast({
        title: "Não foi possível iniciar a assinatura",
        description: e instanceof Error ? e.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="py-24 relative" id="planos">
      <div className="absolute inset-0 gradient-mesh opacity-15" />
      <div className="container max-w-6xl relative">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            💎 Planos Flexíveis
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Escolha seu <span className="text-gradient">Plano</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Comece gratuitamente e evolua conforme sua jornada.
          </p>

          {/* Individual / School toggle */}
          <div className="inline-flex items-center gap-3 p-1.5 rounded-2xl glass mb-6">
            <button
              onClick={() => setShowSchool(false)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${!showSchool ? "bg-primary text-primary-foreground shadow-warm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Users className="w-4 h-4" /> Individual
            </button>
            <button
              onClick={() => setShowSchool(true)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${showSchool ? "bg-primary text-primary-foreground shadow-warm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Building2 className="w-4 h-4" /> Escolas
            </button>
          </div>

          {!showSchool && (
            <div className="inline-flex items-center gap-3 p-1.5 rounded-2xl glass">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${!annual ? "bg-primary text-primary-foreground shadow-warm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${annual ? "bg-primary text-primary-foreground shadow-warm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Anual <span className="text-xs ml-1 opacity-80">(-20%)</span>
              </button>
            </div>
          )}
        </motion.div>

        {!showSchool ? (
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((p, i) => {
              const meta = planMeta[p.slug] || planMeta.free;
              const Icon = meta.icon;
              const isHighlight = p.slug === "intermediate";
              const price = annual
                ? formatPrice(Math.round(p.price_yearly / 12))
                : formatPrice(p.price_monthly);

              return (
                <motion.div
                  key={p.id}
                  className={`relative p-8 rounded-3xl border transition-all duration-500 ${isHighlight
                    ? `${meta.gradient} border-primary/30 shadow-float scale-[1.03]`
                    : `${meta.gradient} border-border hover:shadow-warm hover:-translate-y-1`
                    }`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                >
                  {isHighlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full gradient-institute text-primary-foreground text-xs font-bold shadow-warm">
                      ⭐ Mais Popular
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isHighlight ? "gradient-institute" : "bg-muted"}`}>
                      <Icon className={`w-5 h-5 ${isHighlight ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg">{p.name}</h3>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    </div>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-display font-bold">{price}</span>
                    <span className="text-sm text-muted-foreground">
                      {p.price_monthly === 0 ? "/para sempre" : annual ? "/mês no plano anual" : "/mês"}
                    </span>
                    {p.price_monthly > 0 && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {annual
                          ? `Cobrança única anual de ${formatPrice(p.price_yearly)}/ano • Cancele quando quiser`
                          : "Ciclo mensal pré-pago • Cancele quando quiser"}
                      </p>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {planFeatureLabels(p.slug).map((f: string) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-success" />
                        </div>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleIndividualCta(p)}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isHighlight
                      ? "gradient-institute text-primary-foreground shadow-warm hover:shadow-glow hover:scale-[1.02]"
                      : "bg-muted hover:bg-muted/80 text-foreground hover:shadow-warm"
                      }`}
                  >
                    {p.price_monthly === 0 ? "Começar Grátis" : p.slug === "advanced" ? "Contato Comercial" : "Assinar Agora"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* School / Organization Plans */
          <motion.div
            className="max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="rounded-3xl border border-primary/20 p-8 md:p-12 gradient-card-gold">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl gradient-institute flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-2xl">Plano Escolar</h3>
                  <p className="text-muted-foreground">Para escolas, ONGs e organizações</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <h4 className="font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" /> O que inclui
                  </h4>
                  <ul className="space-y-2">
                    {[
                      "Acesso Avançado para todos os alunos",
                      "Painel de gestão por escola e turma (LGPD k ≥ 5)",
                      "Relatórios agregados de progresso",
                      "Onboarding dedicado e convites por e-mail",
                      "Suporte prioritário",
                      "Certificados personalizados",
                    ].map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-4">
                  <h4 className="font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Faixas por Volume (Tabela Canônica)
                  </h4>
                  <div className="space-y-2.5">
                    {[
                      { seats: "1 a 50 alunos", price: "R$ 19/aluno/mês" },
                      { seats: "51 a 200 alunos", price: "R$ 14/aluno/mês" },
                      { seats: "201 a 500 alunos", price: "R$ 10/aluno/mês" },
                      { seats: "501 a 2.000 alunos", price: "R$ 7/aluno/mês" },
                      { seats: "Acima de 2.000 alunos", price: "Sob consulta" },
                    ].map(t => (
                      <div key={t.seats} className="flex items-center justify-between p-2.5 rounded-xl bg-background/50 text-sm">
                        <span>{t.seats}</span>
                        <span className="font-bold">{t.price}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Descontos cumulativos: Anual (−20%), Redes de 2+ escolas (−10% a −25%) e Pública/ONG mediante validação (−30%), até o teto de 75%.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="#calculadora"
                  className="flex-1 py-3.5 rounded-2xl font-bold text-sm gradient-institute text-primary-foreground shadow-warm hover:shadow-glow transition-all text-center"
                >
                  Simular na Calculadora
                </a>
                <button
                  onClick={() => navigate("/escolas")}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-sm bg-muted hover:bg-muted/80 transition-all text-center"
                >
                  Conhecer Solução para Escolas
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Trust bar */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-xs text-muted-foreground">
            🔒 Pagamento seguro • Cancele a qualquer momento • Garantia de 7 dias
          </p>
        </motion.div>
      </div>
    </section>
  );
}
