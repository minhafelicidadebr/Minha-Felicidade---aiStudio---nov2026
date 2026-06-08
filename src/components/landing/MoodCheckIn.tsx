import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Heart, Clock, Sparkles, CheckCircle2 } from "lucide-react";

type Mood = {
  id: string;
  emoji: string;
  label: string;
  color: string;
  headline: string;
  evidence: string;
  cite: string;
  module: string;
  moduleHref: string;
  plan: string;
  practice: { title: string; steps: string[]; duration: string };
  social: string;
};

const MOODS: Mood[] = [
  {
    id: "anxious", emoji: "😰", label: "Ansioso(a)", color: "from-blue-500/30 to-cyan-500/20",
    headline: "Sua mente está em modo alerta. A ciência tem um caminho.",
    evidence: "Mindfulness reduz ruminação em ~58% (Killingsworth & Gilbert, Science 2010). 8 min/dia já mostra efeito clínico.",
    cite: "Killingsworth & Gilbert (2010) · Science",
    module: "Módulo 4 — Hackeando o Cérebro", moduleHref: "/auth",
    plan: "Plano Aluno (R$ 29/mês)",
    practice: { title: "Box Breathing 4-4-4-4", duration: "90 segundos", steps: ["Inspire pelo nariz contando 4", "Segure o ar contando 4", "Expire pela boca contando 4", "Pausa de 4 e repita 4x"] },
    social: "1.247 pessoas começaram aqui essa semana",
  },
  {
    id: "overwhelmed", emoji: "🌪️", label: "Sobrecarregado(a)", color: "from-orange-500/30 to-red-500/20",
    headline: "Você não precisa de mais força — precisa de melhor design.",
    evidence: "Time affluence (sentir que tem tempo) prediz bem-estar mais do que renda (Whillans et al., PNAS 2017).",
    cite: "Whillans et al. (2017) · PNAS",
    module: "Módulo 5 — Virando o Jogo (WOOP)", moduleHref: "/auth",
    plan: "Plano Aluno (R$ 29/mês)",
    practice: { title: "WOOP em 60s", duration: "1 minuto", steps: ["Wish: qual seu desejo?", "Outcome: melhor resultado possível", "Obstacle: o que te impede?", "Plan: se-X-então-Y"] },
    social: "892 pessoas escolheram esse caminho hoje",
  },
  {
    id: "curious", emoji: "🔍", label: "Curioso(a)", color: "from-violet-500/30 to-purple-500/20",
    headline: "Ótimo. A felicidade é a pergunta mais antiga — e a mais cientificável.",
    evidence: "O curso #1 da história de Yale (Santos, 2018) reúne 50 anos de evidência sobre o que realmente move bem-estar.",
    cite: "Santos (2018) · Yale OpenCourseWare",
    module: "Módulo 1 — As Grandes Mentiras", moduleHref: "/auth",
    plan: "Demo grátis 14 dias",
    practice: { title: "Savoring de 30 segundos", duration: "30 segundos", steps: ["Pause agora", "Identifique 1 coisa boa do seu dia", "Reviva mentalmente em 3 detalhes sensoriais", "Sorria — literalmente"] },
    social: "3.401 alunos ativos neste módulo",
  },
  {
    id: "transition", emoji: "🌱", label: "Em transição", color: "from-emerald-500/30 to-teal-500/20",
    headline: "Identidade nova começa com um hábito pequeno e repetido.",
    evidence: "Implementation Intentions (se-X-então-Y) triplicam taxa de adesão a mudanças (Gollwitzer, 1999).",
    cite: "Gollwitzer (1999) · American Psychologist",
    module: "Módulo 5 — Hábitos Duráveis", moduleHref: "/auth",
    plan: "Plano Aluno (R$ 29/mês)",
    practice: { title: "Seu 1º se-então", duration: "60 segundos", steps: ["Escolha 1 hábito ancorado", "Formato: 'Se [gatilho], então [ação]'", "Ex: 'Se eu escovar os dentes, então 3 respirações conscientes'", "Repita por 7 dias"] },
    social: "574 jornadas iniciadas esta semana",
  },
  {
    id: "lonely", emoji: "🤝", label: "Sozinho(a)", color: "from-pink-500/30 to-rose-500/20",
    headline: "Conexão é o nutriente #1 da felicidade. E é treinável.",
    evidence: "'Very Happy People' (Diener & Seligman, 2002): o único fator comum dos top 10% mais felizes é vida social rica.",
    cite: "Diener & Seligman (2002) · Psychological Science",
    module: "Módulo 3 — Rewirements de Conexão", moduleHref: "/auth",
    plan: "Plano Aluno (R$ 29/mês)",
    practice: { title: "Mensagem de Gratidão", duration: "2 minutos", steps: ["Pense em 1 pessoa importante", "Mande 1 áudio/mensagem agora", "Diga 1 coisa específica que ela faz que importa", "Observe sua emoção depois"] },
    social: "2.108 conexões iniciadas com essa prática",
  },
  {
    id: "school", emoji: "🏫", label: "Sou escola/educador", color: "from-amber-500/30 to-yellow-500/20",
    headline: "Sua rede pode reduzir ansiedade adolescente em até 87%.",
    evidence: "Programas estruturados de Educação Positiva mostram efeitos sustentados em 18 meses (Seligman et al., 2009).",
    cite: "Seligman et al. (2009) · Oxford Review of Education",
    module: "Plano Institucional · Dashboard Wellness Manager", moduleHref: "#planos",
    plan: "Plano Escola (B2B · até 70% off)",
    practice: { title: "Diagnóstico Express", duration: "5 minutos", steps: ["Calcule alunos × R$ 29", "Veja desconto B2B até 70%", "Receba ROI estimado em ansiedade reduzida", "Agende demo com gestor pedagógico"] },
    social: "47 instituições em onboarding este mês",
  },
];

/**
 * Innovation #2 (v2) — Mood-driven personalization with embedded
 * 60-second micro-practice, social proof, and clear journey progress.
 */
export default function MoodCheckIn() {
  const [selected, setSelected] = useState<Mood | null>(null);
  const [committed, setCommitted] = useState(false);
  const navigate = useNavigate();

  const handleSelect = (m: Mood) => {
    setSelected(m);
    setCommitted(false);
    setTimeout(() => {
      document.getElementById("mood-result")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  return (
    <section className="py-24 relative overflow-hidden" id="mood">
      <div className="absolute inset-0 gradient-mesh opacity-20" />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <div className="container max-w-5xl relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-primary text-xs font-bold mb-4 uppercase tracking-wider">
            <Heart className="w-3.5 h-3.5" /> Check-in emocional · 1 toque · 60 s
          </span>
          <h2 className="text-4xl md:text-6xl font-display font-bold mb-4 leading-[1.05]">
            Como você está <span className="text-gradient-aurora">agora</span>?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A landing inteira se reorganiza para o que <strong className="text-foreground">você</strong> precisa — com evidência, <strong className="text-foreground">prática de 60s</strong>, módulo sugerido e plano recomendado.
          </p>
        </motion.div>

        {/* Mood grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-w-3xl mx-auto mb-10">
          {MOODS.map((m, i) => (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelect(m)}
              className={`relative p-5 rounded-2xl glass-card border transition-all hover:shadow-float group ${
                selected?.id === m.id
                  ? "border-primary shadow-glow scale-[1.02]"
                  : "border-border/40 hover:border-primary/40"
              }`}
              aria-pressed={selected?.id === m.id}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${m.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative">
                <motion.div
                  className="text-4xl mb-2"
                  animate={selected?.id === m.id ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5 }}
                >{m.emoji}</motion.div>
                <div className="text-sm font-semibold">{m.label}</div>
                {selected?.id === m.id && (
                  <motion.div
                    layoutId="mood-check"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full gradient-institute flex items-center justify-center shadow-warm"
                  >
                    <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Personalized roteiro */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              id="mood-result"
              key={selected.id}
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative max-w-3xl mx-auto"
            >
              <div className={`absolute -inset-4 bg-gradient-to-r ${selected.color} blur-3xl opacity-60 pointer-events-none`} />
              <div className="relative glass-card rounded-3xl p-8 md:p-10 border border-primary/30 shadow-float">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="text-5xl">{selected.emoji}</div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    {selected.social}
                  </div>
                </div>

                <h3 className="text-2xl md:text-3xl font-display font-bold mb-4 leading-tight">
                  {selected.headline}
                </h3>

                {/* Evidence */}
                <div className="p-4 rounded-2xl bg-background/50 border border-border/40 mb-4">
                  <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5">Evidência científica</div>
                  <p className="text-sm md:text-base text-foreground/85 leading-relaxed mb-2">{selected.evidence}</p>
                  <div className="text-xs text-muted-foreground italic">{selected.cite}</div>
                </div>

                {/* 60-second micro-practice (instructional design) */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/30 mb-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Faça agora</span>
                    </div>
                    <span className="text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded-full bg-background/60 text-foreground/70">
                      <Clock className="w-3 h-3" /> {selected.practice.duration}
                    </span>
                  </div>
                  <div className="font-display font-bold text-lg mb-3">{selected.practice.title}</div>
                  <ol className="space-y-1.5 mb-4">
                    {selected.practice.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-foreground/85">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <button
                    onClick={() => setCommitted(true)}
                    className={`w-full text-xs font-bold px-3 py-2 rounded-xl transition-all border ${
                      committed
                        ? "bg-success/15 text-success border-success/40"
                        : "bg-background/60 hover:bg-background border-border/40 hover:border-primary/40"
                    }`}
                  >
                    {committed ? "✓ Compromisso registrado — você acabou de praticar ciência" : "Me comprometo a tentar agora"}
                  </button>
                </motion.div>

                {/* Module + plan */}
                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Por onde começar</div>
                    <div className="font-semibold text-sm">{selected.module}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                    <div className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">Plano recomendado</div>
                    <div className="font-semibold text-sm">{selected.plan}</div>
                  </div>
                </div>

                <button
                  onClick={() => selected.moduleHref.startsWith("#")
                    ? document.querySelector(selected.moduleHref)?.scrollIntoView({ behavior: "smooth" })
                    : navigate(selected.moduleHref)}
                  className="w-full group px-6 py-4 rounded-2xl gradient-institute text-primary-foreground font-bold shadow-warm hover:shadow-glow transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  Começar minha jornada personalizada
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
