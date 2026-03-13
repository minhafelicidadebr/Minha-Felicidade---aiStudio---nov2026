import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles, Crown, Rocket } from "lucide-react";

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
  },
];

export default function PricingSection() {
  const navigate = useNavigate();

  return (
    <section className="py-24" id="planos">
      <div className="container max-w-6xl">
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
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comece gratuitamente e evolua conforme sua jornada de aprendizagem.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`relative p-8 rounded-3xl border transition-all duration-500 ${
                plan.highlight
                  ? "bg-card border-primary shadow-premium scale-[1.03]"
                  : "bg-card border-border hover:shadow-warm"
              }`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full gradient-institute text-primary-foreground text-xs font-bold">
                  ⭐ Mais Popular
                </div>
              )}
              <plan.icon className={`w-8 h-8 mb-4 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`} />
              <h3 className="font-display font-bold text-xl mb-1">{plan.name}</h3>
              <p className="text-xs text-muted-foreground mb-4">{plan.desc}</p>
              <div className="mb-6">
                <span className="text-4xl font-display font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/auth")}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
                  plan.highlight
                    ? "gradient-institute text-primary-foreground shadow-warm hover:shadow-glow"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                {plan.price === "R$ 0" ? "Começar Grátis" : "Assinar Agora"}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
