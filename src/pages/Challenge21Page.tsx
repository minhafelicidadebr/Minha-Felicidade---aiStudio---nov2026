import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Circle, Trophy, Flame, Target, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useProgress } from "@/hooks/useProgress";

const CHALLENGES = [
  { day: 1, action: "Agradeça 3 coisas antes de dormir", category: "Gratidão", module: "rewirements" },
  { day: 2, action: "Faça um elogio sincero a alguém", category: "Bondade", module: "rewirements" },
  { day: 3, action: "Medite 5 minutos focando na respiração", category: "Mindfulness", module: "hacks" },
  { day: 4, action: "Caminhe 20 minutos ao ar livre sem celular", category: "Corpo", module: "rewirements" },
  { day: 5, action: "Escreva uma carta de gratidão (não precisa enviar)", category: "Gratidão", module: "rewirements" },
  { day: 6, action: "Passe 30 min em uma atividade que te coloca em Flow", category: "Flow", module: "rewirements" },
  { day: 7, action: "Converse por 10 min com alguém que você não falaria", category: "Conexão", module: "rewirements" },
  { day: 8, action: "Doe algo que não usa mais", category: "Bondade", module: "rewirements" },
  { day: 9, action: "Descreva seu dia ideal sem mencionar dinheiro ou status", category: "Valores", module: "mentiras" },
  { day: 10, action: "Pratique savoring: saboreie uma refeição com total atenção", category: "Savoring", module: "hacks" },
  { day: 11, action: "Durma 30 min mais cedo que o normal", category: "Sono", module: "rewirements" },
  { day: 12, action: "Liste 5 coisas que você dá como certas mas são privilégios", category: "Gratidão", module: "hacks" },
  { day: 13, action: "Faça um ato de bondade anônimo", category: "Bondade", module: "rewirements" },
  { day: 14, action: "Passe 1 hora sem redes sociais e note como se sente", category: "Presença", module: "hacks" },
  { day: 15, action: "Use sua principal força de caráter hoje intencionalmente", category: "Forças", module: "rewirements" },
  { day: 16, action: "Crie um 'implementation intention' para um hábito positivo", category: "Hábitos", module: "habitos" },
  { day: 17, action: "Gaste dinheiro em uma experiência, não em um objeto", category: "Experiências", module: "hacks" },
  { day: 18, action: "Pratique visualização negativa: imagine perder algo querido", category: "Perspectiva", module: "hacks" },
  { day: 19, action: "Ajude alguém com um problema prático", category: "Bondade", module: "rewirements" },
  { day: 20, action: "Aplique WOOP para um objetivo desta semana", category: "Metas", module: "habitos" },
  { day: 21, action: "Reflita: o que mudou em você nestes 21 dias?", category: "Reflexão", module: "habitos" },
];

const categoryColors: Record<string, string> = {
  "Gratidão": "bg-secondary/20 text-secondary-foreground", "Bondade": "bg-destructive/10 text-destructive",
  "Mindfulness": "bg-accent/20 text-accent", "Corpo": "bg-success/20 text-success",
  "Flow": "bg-primary/10 text-primary", "Conexão": "bg-primary/20 text-primary",
  "Valores": "bg-secondary/10 text-secondary-foreground", "Savoring": "bg-accent/10 text-accent",
  "Sono": "bg-accent/20 text-accent", "Presença": "bg-muted text-muted-foreground",
  "Forças": "bg-primary/10 text-primary", "Hábitos": "bg-success/10 text-success",
  "Experiências": "bg-secondary/20 text-secondary-foreground", "Perspectiva": "bg-destructive/10 text-destructive",
  "Metas": "bg-primary/10 text-primary", "Reflexão": "bg-accent/10 text-accent",
};

export default function Challenge21Page() {
  const navigate = useNavigate();
  const { trackActivity } = useProgress();
  const [completed, setCompleted] = useState<number[]>(() => {
    const s = localStorage.getItem("challenge21"); return s ? JSON.parse(s) : [];
  });

  useEffect(() => { localStorage.setItem("challenge21", JSON.stringify(completed)); }, [completed]);

  const toggleDay = (day: number) => {
    if (completed.includes(day)) {
      setCompleted(prev => prev.filter(d => d !== day));
    } else {
      setCompleted(prev => [...prev, day]);
      const ch = CHALLENGES.find(c => c.day === day)!;
      trackActivity({ moduleId: ch.module, activityType: "challenge21", activityId: `day-${day}`, data: { action: ch.action, category: ch.category } });
    }
  };

  const progress = (completed.length / 21) * 100;
  const currentDay = Math.min(completed.length + 1, 21);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-2xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative rounded-3xl p-8 mb-8 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-border/30 overflow-hidden">
            <div className="absolute inset-0 noise opacity-30 pointer-events-none" />
            <div className="relative text-center">
              <span className="text-6xl mb-3 block">🎲</span>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Desafio 21 Dias</h1>
              <p className="text-muted-foreground text-sm">Lally et al. (2010): 21 dias para iniciar a formação de um hábito</p>
            </div>
          </div>

          {/* Progress — premium */}
          <div className="glass-card rounded-3xl p-6 mb-8 border border-border/30 relative overflow-hidden">
            {completed.length === 21 && <div className="absolute inset-0 shimmer pointer-events-none" />}
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-bold">{completed.length}/21</span>
                <span className="text-xs text-muted-foreground">completados</span>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-destructive" />
                <span className="font-bold text-primary">+{completed.length * 10} XP</span>
              </div>
            </div>
            <div className="w-full h-4 rounded-full bg-muted overflow-hidden relative z-10">
              <motion.div className="h-full rounded-full gradient-institute relative" animate={{ width: `${progress}%` }} transition={{ type: "spring", damping: 20 }}>
                {progress > 10 && <div className="absolute inset-0 shimmer" />}
              </motion.div>
            </div>
            {/* Mini day indicators */}
            <div className="flex gap-1 mt-3 relative z-10">
              {CHALLENGES.map(ch => (
                <div key={ch.day} className={`flex-1 h-1.5 rounded-full transition-colors ${completed.includes(ch.day) ? "bg-success" : ch.day === currentDay ? "bg-primary/50" : "bg-muted"}`} />
              ))}
            </div>
            <AnimatePresence>
              {completed.length === 21 && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center mt-6 relative z-10">
                  <Trophy className="w-12 h-12 text-secondary mx-auto mb-2" />
                  <p className="font-display font-bold text-xl">🎉 Desafio Completo!</p>
                  <p className="text-sm text-muted-foreground mt-1">Você desenvolveu uma base sólida de novos hábitos!</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Challenge List — premium timeline */}
          <div className="space-y-3 relative">
            <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border/30" />
            {CHALLENGES.map((ch, i) => {
              const done = completed.includes(ch.day);
              const isCurrent = ch.day === currentDay && !done;
              return (
                <motion.button
                  key={ch.day}
                  onClick={() => toggleDay(ch.day)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`w-full text-left pl-10 pr-4 py-4 rounded-2xl flex items-start gap-3 transition-all relative ${
                    done ? "glass-card border border-success/30 bg-success/5"
                      : isCurrent ? "glass-card border-2 border-primary/30 shadow-warm"
                      : "glass-card hover:shadow-warm border border-border/30"
                  }`}
                >
                  {/* Timeline dot */}
                  <div className={`absolute left-[9px] top-5 w-3 h-3 rounded-full border-2 z-10 ${done ? "bg-success border-success" : isCurrent ? "bg-primary border-primary" : "bg-muted border-border"}`} />

                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  ) : (
                    <Circle className={`w-5 h-5 shrink-0 mt-0.5 ${isCurrent ? "text-primary" : "text-muted-foreground/50"}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-bold ${isCurrent ? "text-primary" : done ? "text-success" : "text-muted-foreground"}`}>Dia {ch.day}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${categoryColors[ch.category] || "bg-muted text-muted-foreground"}`}>{ch.category}</span>
                      {isCurrent && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> Hoje</span>}
                    </div>
                    <p className={`text-sm leading-relaxed ${done ? "line-through text-muted-foreground" : ""}`}>{ch.action}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
