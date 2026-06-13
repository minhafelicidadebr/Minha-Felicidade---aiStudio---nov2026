import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, Star, Trophy, CheckCircle2, Sparkles, MessageCircle, HandHeart, BookOpen, HeartHandshake, PartyPopper, Mail, PhoneOff, Globe2, Zap, RotateCcw, Check, Quote } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useProgress } from "@/hooks/useProgress";

const MISSIONS = [
  { id: "m1", title: "Conexão Genuína", description: "Tenha uma conversa de 10 min com alguém sem olhar o celular", xp: 15, category: "Conexão", Icon: MessageCircle, accent: "text-sky-400", difficulty: "Fácil", science: "Epley & Schroeder (2014): conversar com estranhos aumenta o bem-estar mais do que imaginamos" },
  { id: "m2", title: "Corrente de Bondade", description: "Faça 3 atos de bondade em um dia e observe os efeitos", xp: 25, category: "Bondade", Icon: HandHeart, accent: "text-rose-400", difficulty: "Médio", science: "Lyubomirsky (2005): atos de bondade concentrados geram mais felicidade que espalhados" },
  { id: "m3", title: "Mentor de Felicidade", description: "Ensine um conceito deste curso para 2 pessoas", xp: 30, category: "Ensino", Icon: BookOpen, accent: "text-blue-400", difficulty: "Médio", science: "Efeito Protégé: ensinar reforça a aprendizagem (Nestojko et al., 2014)" },
  { id: "m4", title: "Grupo de Gratidão", description: "Crie um grupo de 3+ pessoas para compartilhar gratidão diária por 1 semana", xp: 40, category: "Gratidão", Icon: HeartHandshake, accent: "text-amber-400", difficulty: "Difícil", science: "Emmons (2003): gratidão social amplifica efeitos do journaling individual" },
  { id: "m5", title: "Experiência Compartilhada", description: "Organize uma atividade gratuita com amigos (caminhada, jogo, cozinhar)", xp: 25, category: "Experiências", Icon: PartyPopper, accent: "text-orange-400", difficulty: "Médio", science: "Van Boven (2005): experiências compartilhadas geram mais felicidade duradoura" },
  { id: "m6", title: "Carta de Impacto", description: "Escreva e entregue uma carta de gratidão para alguém que impactou sua vida", xp: 35, category: "Gratidão", Icon: Mail, accent: "text-pink-400", difficulty: "Difícil", science: "Seligman (2005): visita de gratidão é a intervenção mais poderosa de bem-estar" },
  { id: "m7", title: "Silêncio Digital", description: "Passe 24h sem redes sociais e convide 2 amigos para fazer junto", xp: 30, category: "Presença", Icon: PhoneOff, accent: "text-slate-400", difficulty: "Difícil", science: "Hunt et al. (2018): reduzir redes sociais diminui solidão e depressão" },
  { id: "m8", title: "Voluntário por um Dia", description: "Dedique 2h a uma causa social voluntária", xp: 50, category: "Propósito", Icon: Globe2, accent: "text-emerald-400", difficulty: "Épico", science: "Thoits & Hewitt (2001): voluntariado aumenta satisfação de vida e autoestima" },
  { id: "m9", title: "Embaixador do Flow", description: "Ajude 2 pessoas a descobrirem suas forças de caráter (VIA Survey)", xp: 30, category: "Flow", Icon: Zap, accent: "text-violet-400", difficulty: "Médio", science: "Peterson & Seligman (2004): usar forças de caráter aumenta engajamento" },
];

const difficultyConfig: Record<string, { color: string; stars: number; gradient: string }> = {
  "Fácil": { color: "bg-success/20 text-success", stars: 1, gradient: "from-emerald-500/10 to-green-500/10" },
  "Médio": { color: "bg-secondary/20 text-secondary-foreground", stars: 2, gradient: "from-amber-500/10 to-yellow-500/10" },
  "Difícil": { color: "bg-destructive/10 text-destructive", stars: 3, gradient: "from-red-500/10 to-orange-500/10" },
  "Épico": { color: "bg-primary/20 text-primary", stars: 4, gradient: "from-violet-500/10 to-purple-500/10" },
};

export default function SocialMissionsPage() {
  const navigate = useNavigate();
  const { trackActivity } = useProgress();
  const [completed, setCompleted] = useState<string[]>(() => {
    const s = localStorage.getItem("social-missions"); return s ? JSON.parse(s) : [];
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
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative rounded-3xl p-8 mb-8 bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-border/30 overflow-hidden">
            <div className="absolute inset-0 noise opacity-30 pointer-events-none" />
            <div className="relative text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl icon-tile-premium flex items-center justify-center text-primary"><Trophy className="w-8 h-8" strokeWidth={1.5} /></div>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Missões Sociais</h1>
              <p className="text-muted-foreground text-sm">Desafios de impacto social baseados em evidências científicas</p>
            </div>
          </div>

          {/* Progress — premium */}
          <div className="glass-card rounded-3xl p-6 mb-8 border border-border/30 relative overflow-hidden">
            {completed.length === MISSIONS.length && <div className="absolute inset-0 shimmer pointer-events-none" />}
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-bold">{completed.length}/{MISSIONS.length}</span>
                <span className="text-xs text-muted-foreground">missões</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-secondary" />
                <span className="font-bold text-primary">+{totalXp} XP</span>
              </div>
            </div>
            <div className="w-full h-4 rounded-full bg-muted overflow-hidden relative z-10">
              <motion.div className="h-full rounded-full gradient-institute relative" animate={{ width: `${progress}%` }} transition={{ type: "spring", damping: 20 }}>
                {progress > 10 && <div className="absolute inset-0 shimmer" />}
              </motion.div>
            </div>
            <AnimatePresence>
              {completed.length === MISSIONS.length && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center mt-6 relative z-10">
                  <Trophy className="w-12 h-12 text-secondary mx-auto mb-2" />
                  <p className="font-display font-bold text-xl flex items-center justify-center gap-2"><Sparkles className="w-5 h-5 text-secondary" /> Herói Social Completo</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Missions — premium cards */}
          <div className="space-y-3">
            {MISSIONS.map((mission, i) => {
              const done = completed.includes(mission.id);
              const diff = difficultyConfig[mission.difficulty];
              const isExpanded = expandedId === mission.id;
              return (
                <motion.div key={mission.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className={`glass-card rounded-2xl overflow-hidden transition-all border ${done ? "border-success/30 bg-success/5" : "border-border/30"}`}
                >
                  <button onClick={() => setExpandedId(isExpanded ? null : mission.id)} className="w-full text-left p-5 flex items-start gap-3">
                    <motion.span className={`w-12 h-12 rounded-xl flex items-center justify-center icon-tile-premium shrink-0 ${mission.accent}`} whileHover={{ scale: 1.08 }}><mission.Icon className="w-5 h-5" strokeWidth={1.75} /></motion.span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className={`font-display font-bold text-sm ${done ? "line-through text-muted-foreground" : ""}`}>{mission.title}</h3>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${diff.color}`}>{mission.difficulty}</span>
                        <span className="text-xs font-bold text-primary">+{mission.xp} XP</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{mission.description}</p>
                    </div>
                    {done && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-5 pb-5">
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-4">
                          <p className="text-xs font-semibold text-primary leading-relaxed flex items-start gap-2"><Quote className="w-3.5 h-3.5 shrink-0 mt-0.5" /> <span>{mission.science}</span></p>
                        </div>
                        <div className="flex items-center gap-1 mb-4">
                          {Array.from({ length: diff.stars }).map((_, s) => (
                            <motion.div key={s} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: s * 0.1 }}>
                              <Star className="w-4 h-4 text-secondary fill-secondary" />
                            </motion.div>
                          ))}
                        </div>
                        <button onClick={() => toggleComplete(mission)}
                          className={`w-full py-3 rounded-2xl font-bold text-sm transition-all ${done ? "bg-muted text-muted-foreground" : "gradient-institute text-primary-foreground shadow-warm hover:shadow-glow"}`}
                        >
                          {done ? (<span className="inline-flex items-center gap-2 justify-center"><RotateCcw className="w-4 h-4" /> Desmarcar</span>) : (<span className="inline-flex items-center gap-2 justify-center"><Check className="w-4 h-4" /> Completar Missão</span>)}
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
