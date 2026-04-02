import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles, Crown, Rocket, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "/para sempre",
    icon: Sparkles,
    highlight: false,
    desc: "Acesso completo ao curso para adolescentes",
    features: [
      "5 módulos completos",
      "32 vídeos com legendas",
      "Quiz adaptativo (nível 1)",
      "Flashcards básicos",
      "AlegrIA (5 perguntas/dia)",
      "Dashboard de progresso",
    ],
    cta: "Começar Grátis",
    gradient: "bg-card",
  },
  {
    name: "Intermediário",
    price: "R$ 29",
    period: "/mês",
    icon: Crown,
    highlight: true,
    desc: "Para quem quer ir além com tutoria avançada",
    features: [
      "Tudo do plano Gratuito",
      "Quiz adaptativo (3 níveis)",
      "AlegrIA ilimitada",
      "Simulador de decisões",
      "Arena de debate",
      "Poesia pedagógica",
      "Relatório PDF de progresso",
      "Certificado digital",
    ],
    cta: "Assinar Agora",
    gradient: "gradient-card-gold",
  },
  {
    name: "Avançado",
    price: "R$ 59",
    period: "/mês",
    icon: Rocket,
    highlight: false,
    desc: "Para educadores e organizações",
    features: [
      "Tudo do plano Intermediário",
      "Estúdio de co-design",
      "Evidence Explorer completo",
      "Painel de gestor",
      "Dados agregados de turma",
      "Export de relatórios",
      "Suporte prioritário",
      "API de integração",
    ],
    cta: "Contato Comercial",
    gradient: "bg-card",
  },
];

export default function PricingSection() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(false);

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

          {/* Billing toggle */}
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
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const price = plan.price === "R$ 0" ? "R$ 0" : annual
              ? `R$ ${Math.round(parseInt(plan.price.replace("R$ ", "")) * 0.8)}`
              : plan.price;

            return (
              <motion.div
                key={plan.name}
                className={`relative p-8 rounded-3xl border transition-all duration-500 ${
                  plan.highlight
                    ? `${plan.gradient} border-primary/30 shadow-float scale-[1.03]`
                    : `${plan.gradient} border-border hover:shadow-warm hover:-translate-y-1`
                }`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full gradient-institute text-primary-foreground text-xs font-bold shadow-warm">
                    ⭐ Mais Popular
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.highlight ? "gradient-institute" : "bg-muted"}`}>
                    <plan.icon className={`w-5 h-5 ${plan.highlight ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.desc}</p>
                  </div>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-display font-bold">{price}</span>
                  <span className="text-sm text-muted-foreground">{annual && plan.price !== "R$ 0" ? "/mês (anual)" : plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-success" />
                      </div>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/auth")}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    plan.highlight
                      ? "gradient-institute text-primary-foreground shadow-warm hover:shadow-glow hover:scale-[1.02]"
                      : "bg-muted hover:bg-muted/80 text-foreground hover:shadow-warm"
                  }`}
                >
                  {plan.cta} <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
