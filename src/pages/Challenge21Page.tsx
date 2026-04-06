import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Circle, Trophy, Flame, Target } from "lucide-react";
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
  "Gratidão": "bg-secondary/20 text-secondary-foreground",
  "Bondade": "bg-destructive/10 text-destructive",
  "Mindfulness": "bg-accent/20 text-accent",
  "Corpo": "bg-success/20 text-success",
  "Flow": "bg-primary/10 text-primary",
  "Conexão": "bg-primary/20 text-primary",
  "Valores": "bg-secondary/10 text-secondary-foreground",
  "Savoring": "bg-accent/10 text-accent",
  "Sono": "bg-accent/20 text-accent",
  "Presença": "bg-muted text-muted-foreground",
  "Forças": "bg-primary/10 text-primary",
  "Hábitos": "bg-success/10 text-success",
  "Experiências": "bg-secondary/20 text-secondary-foreground",
  "Perspectiva": "bg-destructive/10 text-destructive",
  "Metas": "bg-primary/10 text-primary",
  "Reflexão": "bg-accent/10 text-accent",
};

export default function Challenge21Page() {
  const navigate = useNavigate();
  const { trackActivity } = useProgress();
  const [completed, setCompleted] = useState<number[]>(() => {
    const s = localStorage.getItem("challenge21");
    return s ? JSON.parse(s) : [];
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
  const currentDay = completed.length + 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-2xl">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <header className="text-center mb-8">
            <span className="text-5xl mb-3 block">🎲</span>
            <h1 className="text-3xl font-display font-bold mb-2">Desafio 21 Dias</h1>
            <p className="text-muted-foreground">Lally et al. (2010): 21 dias para iniciar a formação de um hábito</p>
          </header>

          {/* Progress */}
          <div className="glass-card rounded-2xl p-5 mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-bold text-sm">{completed.length}/21 completados</span>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-destructive" />
                <span className="text-sm font-bold">+{completed.length * 10} XP</span>
              </div>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full gradient-institute"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", damping: 20 }}
              />
            </div>
            {completed.length === 21 && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center mt-4">
                <Trophy className="w-10 h-10 text-secondary mx-auto mb-2" />
                <p className="font-display font-bold text-lg">🎉 Desafio Completo!</p>
              </motion.div>
            )}
          </div>

          {/* Challenge List */}
          <div className="space-y-3">
            {CHALLENGES.map((ch, i) => {
              const done = completed.includes(ch.day);
              const isCurrent = ch.day === currentDay;
              return (
                <motion.button
                  key={ch.day}
                  onClick={() => toggleDay(ch.day)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`w-full text-left p-4 rounded-2xl flex items-start gap-3 transition-all ${
                    done ? "glass-card border-2 border-success/30 bg-success/5" : isCurrent ? "glass-card border-2 border-primary/30 shadow-warm" : "glass-card hover:shadow-warm"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-6 h-6 text-success shrink-0 mt-0.5" />
                  ) : (
                    <Circle className={`w-6 h-6 shrink-0 mt-0.5 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>Dia {ch.day}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${categoryColors[ch.category] || "bg-muted text-muted-foreground"}`}>
                        {ch.category}
                      </span>
                    </div>
                    <p className={`text-sm ${done ? "line-through text-muted-foreground" : ""}`}>{ch.action}</p>
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
