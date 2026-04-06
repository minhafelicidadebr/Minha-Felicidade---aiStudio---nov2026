import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, Heart, Star, Trophy, CheckCircle2, Circle, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useProgress } from "@/hooks/useProgress";

const MISSIONS = [
  { id: "m1", title: "Conexão Genuína", description: "Tenha uma conversa de 10 min com alguém sem olhar o celular", xp: 15, category: "Conexão", icon: "💬", difficulty: "Fácil", science: "Epley & Schroeder (2014): conversar com estranhos aumenta o bem-estar mais do que imaginamos" },
  { id: "m2", title: "Corrente de Bondade", description: "Faça 3 atos de bondade em um dia e observe os efeitos", xp: 25, category: "Bondade", icon: "💝", difficulty: "Médio", science: "Lyubomirsky (2005): atos de bondade concentrados geram mais felicidade que espalhados" },
  { id: "m3", title: "Mentor de Felicidade", description: "Ensine um conceito deste curso para 2 pessoas", xp: 30, category: "Ensino", icon: "📚", difficulty: "Médio", science: "Efeito Protégé: ensinar reforça a aprendizagem (Nestojko et al., 2014)" },
  { id: "m4", title: "Grupo de Gratidão", description: "Crie um grupo de 3+ pessoas para compartilhar gratidão diária por 1 semana", xp: 40, category: "Gratidão", icon: "🙏", difficulty: "Difícil", science: "Emmons (2003): gratidão social amplifica efeitos do journaling individual" },
  { id: "m5", title: "Experiência Compartilhada", description: "Organize uma atividade gratuita com amigos (caminhada, jogo, cozinhar)", xp: 25, category: "Experiências", icon: "🎉", difficulty: "Médio", science: "Van Boven (2005): experiências compartilhadas geram mais felicidade duradoura" },
  { id: "m6", title: "Carta de Impacto", description: "Escreva e entregue uma carta de gratidão para alguém que impactou sua vida", xp: 35, category: "Gratidão", icon: "✉️", difficulty: "Difícil", science: "Seligman (2005): visita de gratidão é a intervenção mais poderosa de bem-estar" },
  { id: "m7", title: "Desafio do Silêncio Digital", description: "Passe 24h sem redes sociais e convide 2 amigos para fazer junto", xp: 30, category: "Presença", icon: "📵", difficulty: "Difícil", science: "Hunt et al. (2018): reduzir redes sociais diminui solidão e depressão" },
  { id: "m8", title: "Voluntário por um Dia", description: "Dedique 2h a uma causa social voluntária", xp: 50, category: "Propósito", icon: "🌍", difficulty: "Épico", science: "Thoits & Hewitt (2001): voluntariado aumenta satisfação de vida e autoestima" },
  { id: "m9", title: "Embaixador do Flow", description: "Ajude 2 pessoas a descobrirem suas forças de caráter (VIA Survey)", xp: 30, category: "Flow", icon: "⚡", difficulty: "Médio", science: "Peterson & Seligman (2004): usar forças de caráter aumenta engajamento" },
];

const difficultyConfig: Record<string, { color: string; stars: number }> = {
  "Fácil": { color: "bg-success/20 text-success", stars: 1 },
  "Médio": { color: "bg-secondary/20 text-secondary-foreground", stars: 2 },
  "Difícil": { color: "bg-destructive/10 text-destructive", stars: 3 },
  "Épico": { color: "bg-primary/20 text-primary", stars: 4 },
};

export default function SocialMissionsPage() {
  const navigate = useNavigate();
  const { trackActivity } = useProgress();
  const [completed, setCompleted] = useState<string[]>(() => {
    const s = localStorage.getItem("social-missions");
    return s ? JSON.parse(s) : [];
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem("social-missions", JSON.stringify(completed)); }, [completed]);

  const toggleComplete = (mission: typeof MISSIONS[0]) => {
    if (completed.includes(mission.id)) {
      setCompleted(prev => prev.filter(id => id !== mission.id));
    } else {
      setCompleted(prev => [...prev, mission.id]);
      trackActivity({ moduleId: "rewirements", activityType: "social-mission", activityId: mission.id, data: { title: mission.title, category: mission.category } });
    }
  };

  const totalXp = MISSIONS.filter(m => completed.includes(m.id)).reduce((a, m) => a + m.xp, 0);
  const progress = (completed.length / MISSIONS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-2xl">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <header className="text-center mb-8">
            <span className="text-5xl mb-3 block">🏆</span>
            <h1 className="text-3xl font-display font-bold mb-2">Missões Sociais</h1>
            <p className="text-muted-foreground">Desafios de impacto social baseados em evidências científicas</p>
          </header>

          {/* Progress */}
          <div className="glass-card rounded-2xl p-5 mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-bold text-sm">{completed.length}/{MISSIONS.length} missões</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-secondary" />
                <span className="text-sm font-bold">+{totalXp} XP</span>
              </div>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <motion.div className="h-full rounded-full gradient-institute" animate={{ width: `${progress}%` }} transition={{ type: "spring", damping: 20 }} />
            </div>
            {completed.length === MISSIONS.length && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-4">
                <Trophy className="w-8 h-8 text-secondary mx-auto mb-1" />
                <p className="font-display font-bold">🌟 Herói Social Completo!</p>
              </motion.div>
            )}
          </div>

          {/* Missions */}
          <div className="space-y-3">
            {MISSIONS.map((mission, i) => {
              const done = completed.includes(mission.id);
              const diff = difficultyConfig[mission.difficulty];
              const isExpanded = expandedId === mission.id;
              return (
                <motion.div
                  key={mission.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`glass-card rounded-2xl overflow-hidden transition-all ${done ? "border-2 border-success/30" : ""}`}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : mission.id)}
                    className="w-full text-left p-4 flex items-start gap-3"
                  >
                    <span className="text-2xl mt-0.5">{mission.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className={`font-display font-bold text-sm ${done ? "line-through text-muted-foreground" : ""}`}>{mission.title}</h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${diff.color}`}>{mission.difficulty}</span>
                        <span className="text-xs font-bold text-primary">+{mission.xp} XP</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{mission.description}</p>
                    </div>
                    {done && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-4">
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 mb-3">
                          <p className="text-xs font-semibold text-primary">📎 {mission.science}</p>
                        </div>
                        <div className="flex items-center gap-1 mb-3">
                          {Array.from({ length: diff.stars }).map((_, s) => <Star key={s} className="w-3 h-3 text-secondary fill-secondary" />)}
                        </div>
                        <button
                          onClick={() => toggleComplete(mission)}
                          className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${done ? "bg-muted text-muted-foreground" : "gradient-institute text-primary-foreground shadow-warm hover:shadow-glow"}`}
                        >
                          {done ? "↩️ Desmarcar" : "✅ Completar Missão"}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
