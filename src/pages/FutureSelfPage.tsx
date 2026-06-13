/**
 * Linha do Tempo do Eu Futuro — State-of-the-art Episodic Future Thinking interface
 * Science: Hershfield (2011) Future Self-Continuity, Atance & O'Neill (2001) EFT,
 * Oettingen (2014) Mental Contrasting, Clear (2018) Atomic Habits, Gollwitzer (1999) IIs.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, Sparkles, Hourglass, Mail, Target, Wand2, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { NeuralBackground, useXPBurst, AchievementToast, EncouragementBubble, ConfettiCelebration } from "@/components/learning/LearningFX";
import { InsightDialog } from "@/components/learning/InsightDialog";
import { NarrativeJourney, FUTURE_SELF_CHAPTERS } from "@/components/learning/NarrativeJourney";
import { useProgress } from "@/hooks/useProgress";
import { useToast } from "@/hooks/use-toast";

type Scene = {
  horizon: string;
  title: string;
  scene: string;
  metric: string;
  emotion: string;
  risk: string;
};

type Timeline = {
  headline: string;
  scientific_basis: string;
  scenes: Scene[];
  letter_from_future: string;
  if_then_plan: string;
};

const HORIZON_GRADIENTS = [
  "from-amber-400 to-orange-500",
  "from-orange-500 to-rose-500",
  "from-rose-500 to-fuchsia-500",
  "from-fuchsia-500 to-indigo-500",
  "from-indigo-500 to-cyan-400",
];

const HORIZON_ICONS = ["🌱", "🌿", "🌳", "🌟", "🌅"];

const SAMPLE_PROMPTS = [
  { habit: "Caminhar 20 minutos por dia", value: "Saúde mental" },
  { habit: "Escrever 3 gratidões antes de dormir", value: "Conexão emocional" },
  { habit: "Ler 10 páginas por dia", value: "Crescimento contínuo" },
  { habit: "Ligar para alguém querido toda quarta", value: "Pertencimento" },
];

export default function FutureSelfPage() {
  const [name, setName] = useState("");
  const [habit, setHabit] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [activeScene, setActiveScene] = useState(0);
  const [letterOpen, setLetterOpen] = useState(false);
  const [achievement, setAchievement] = useState<{ title: string; desc: string } | null>(null);
  const [encouragement, setEncouragement] = useState(0);
  const [confetti, setConfetti] = useState(false);
  const { trigger: burstXP, node: xpNode } = useXPBurst();
  const { trackActivity } = useProgress();
  const { toast } = useToast();

  const generate = async () => {
    if (habit.trim().length < 5) return;
    setLoading(true);
    setTimeline(null);
    try {
      const { data, error } = await supabase.functions.invoke("future-self", {
        body: { name, habit, value },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTimeline(data as Timeline);
      setActiveScene(0);
      burstXP(40, { clientX: window.innerWidth / 2, clientY: 200 });
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3500);
      setAchievement({ title: "Cronista do Futuro", desc: "Linha do tempo gerada! +40 XP" });
      setEncouragement(t => t + 1);
      trackActivity({ moduleId: "all", activityType: "evidence", activityId: "future-self-generate", data: { habit, value } });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Tente em instantes.";
      toast({ title: "Não foi possível gerar agora", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openLetter = () => {
    setLetterOpen(true);
    burstXP(30, { clientX: window.innerWidth / 2, clientY: 300 });
    trackActivity({ moduleId: "all", activityType: "poetry", activityId: "future-letter-read" });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <NeuralBackground />
      <Navbar />
      {xpNode}
      <ConfettiCelebration active={confetti} />
      <EncouragementBubble trigger={encouragement} />
      <AchievementToast
        show={!!achievement}
        title={achievement?.title || ""}
        description={achievement?.desc || ""}
        onClose={() => setAchievement(null)}
      />

      <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Dashboard</Button>
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-primary/30 mb-4">
            <Hourglass className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold tracking-wider uppercase">Episodic Future Thinking • IA</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-black mb-3">
            <span className="holographic">Linha do Tempo do Eu Futuro</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Visualize cientificamente quem você se torna em 1 semana, 1 mês, 6 meses, 1 ano e 5 anos.
            Cada cena é gerada com rigor e imagens vívidas para ativar seu córtex pré-frontal.
          </p>

          {/* Mini CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
            <NarrativeJourney chapters={FUTURE_SELF_CHAPTERS} cta="Modo História" emoji="📖" />
            <InsightDialog
              cta="Como funciona"
              emoji="🧭"
              variant="primary"
              subtitle="Guia rápido • 60s"
              title="3 passos para projetar seu futuro"
              intro="A IA usa Episodic Future Thinking — uma técnica validada para reduzir desconto temporal e aumentar autocontrole."
              steps={[
                { icon: "✍️", title: "Descreva um hábito real", body: "Quanto mais específico, mais vívida a projeção. 'Caminhar 20 min/dia' funciona melhor que 'ser saudável'.", evidence: "Specificity → vivid imagery (Atance, 2001)" },
                { icon: "💎", title: "Nomeie um valor central", body: "Saúde, conexão, propósito... isso ancora a narrativa nas suas motivações intrínsecas (Self-Determination Theory).", evidence: "Deci & Ryan (2000)" },
                { icon: "🌅", title: "Explore os 5 horizontes", body: "Toque em cada cena para ver detalhes, riscos realistas (Mental Contrasting) e métricas mensuráveis do efeito composto.", evidence: "Oettingen (2014); Clear (2018)" },
                { icon: "💌", title: "Leia a carta do seu eu futuro", body: "Cartas autobiográficas do futuro aumentam comportamento pró-poupança em +60% (estudos com fMRI).", evidence: "Hershfield et al. (2011) JMR" },
              ]}
              takeaway="Quem se vê com clareza no futuro toma decisões melhores no presente."
              citation="Future Self-Continuity — Hershfield (2011)"
            />
            <InsightDialog
              cta="A ciência por trás"
              emoji="🧠"
              variant="secondary"
              subtitle="Neurociência • EFT"
              title="Por que isso funciona no cérebro"
              intro="Quando você imagina vividamente seu eu futuro, ativa o córtex pré-frontal medial (mPFC). Quanto mais essa região se ativa, mais você trata o eu-futuro como 'você' — não como um estranho."
              steps={[
                { icon: "🔬", title: "Estudo Hershfield 2011", body: "Em scanner de fMRI: pessoas que viam o eu-futuro como estranho poupavam menos. Após exercícios de visualização, a ativação do mPFC aumentou e o comportamento mudou.", evidence: "Hershfield et al., J. Marketing Research" },
                { icon: "⏳", title: "Desconto Temporal", body: "Tendemos a desvalorizar recompensas futuras (preferimos R$50 hoje a R$100 em 1 ano). EFT reduz esse viés em até 30%.", evidence: "Peters & Büchel (2010)" },
                { icon: "🎯", title: "Mental Contrasting", body: "Apenas sonhar relaxa o cérebro e reduz ação. Por isso cada cena traz 'risco realista': contrastar mentalmente desejo vs obstáculo aumenta execução.", evidence: "Oettingen et al. (2001-2014)" },
                { icon: "📜", title: "Implementation Intentions", body: "A 'frase-âncora' Se X, então Y dobra a taxa de cumprimento de objetivos em meta-análises (94 estudos, n>8.000).", evidence: "Gollwitzer & Sheeran (2006)" },
              ]}
              takeaway="Esta tela é uma máquina de costurar o seu eu-presente ao seu eu-futuro."
              citation="Self-continuity literature, 2009-2024"
            />
            <InsightDialog
              cta="Dicas de uso"
              emoji="💡"
              variant="accent"
              subtitle="Boas práticas"
              title="Como tirar mais valor"
              intro="Esta é uma ferramenta de design pessoal — não de adivinhação. Funciona melhor com estes hábitos."
              steps={[
                { icon: "🔁", title: "Volte 1×/semana", body: "Mude o hábito ou valor e gere de novo. Comparar versões diferentes treina raciocínio prospectivo.", evidence: "Schacter et al. (2017)" },
                { icon: "📓", title: "Anote a frase-âncora", body: "Copie a Implementation Intention para um papel visível. Ela é o que efetivamente muda comportamento.", evidence: "Gollwitzer (1999)" },
                { icon: "🗣️", title: "Leia em voz alta", body: "Verbalizar cenas futuras ativa áreas adicionais de memória episódica e fortalece a 'realidade' do cenário.", evidence: "Sirigu et al. (2015)" },
                { icon: "🧘", title: "Use após respiração", body: "EFT tem maior eficácia em estado parassimpático. Combine com 3 minutos de respiração 4-7-8 antes.", evidence: "Porges (2011); Brown & Gerbarg" },
              ]}
              takeaway="O futuro não é previsto — é ensaiado. Esta tela é seu palco."
              citation="Boas práticas baseadas em 4 décadas de psicologia prospectiva"
            />
          </div>
        </motion.div>

        {/* Input Panel */}
        {!timeline && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto p-6 md:p-8 rounded-3xl glass border border-border shadow-premium"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl gradient-institute flex items-center justify-center text-2xl glow-pulse">
                ⏳
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">Projete seu futuro</h2>
                <p className="text-xs text-muted-foreground">Em ~12 segundos a IA constrói 5 horizontes vívidos.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Seu nome (opcional)</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Como o seu eu futuro deve te chamar?"
                  className="w-full p-3 text-sm rounded-xl bg-background/60 border border-border focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Hábito ou compromisso</label>
                <textarea
                  value={habit}
                  onChange={e => setHabit(e.target.value)}
                  placeholder="Ex.: Caminhar 20 minutos todas as manhãs"
                  className="w-full h-20 p-3 text-sm rounded-xl bg-background/60 border border-border focus:border-primary outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Valor central</label>
                <input
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder="Ex.: Saúde mental, conexão, crescimento..."
                  className="w-full p-3 text-sm rounded-xl bg-background/60 border border-border focus:border-primary outline-none"
                />
              </div>

              {/* Sample prompts */}
              <div>
                <p className="text-[11px] text-muted-foreground mb-2">💫 Inspirações:</p>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_PROMPTS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setHabit(s.habit); setValue(s.value); }}
                      className="px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 text-[11px] transition-colors"
                    >
                      {s.habit}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={generate}
                disabled={loading || habit.trim().length < 5}
                className="w-full gradient-institute h-12 text-base font-bold"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Cronista escrevendo...</>
                ) : (
                  <><Wand2 className="w-5 h-5 mr-2" /> Gerar minha linha do tempo</>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Timeline */}
        <AnimatePresence>
          {timeline && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
              {/* Headline */}
              <div className="text-center mb-8">
                <p className="font-display text-2xl md:text-3xl font-bold italic text-gradient-aurora max-w-3xl mx-auto leading-tight">
                  "{timeline.headline}"
                </p>
                <p className="text-xs text-muted-foreground mt-3 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                  {timeline.scientific_basis}
                </p>
              </div>

              {/* Horizontal timeline rail */}
              <div className="relative mb-8 px-4">
                <div className="absolute left-0 right-0 top-1/2 h-1 bg-gradient-to-r from-amber-400 via-fuchsia-500 to-cyan-400 -translate-y-1/2 rounded-full opacity-60" />
                <div className="relative flex justify-between">
                  {timeline.scenes.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveScene(i)}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${HORIZON_GRADIENTS[i]} flex items-center justify-center text-xl shadow-lg transition-all ${activeScene === i ? "scale-125 ring-4 ring-primary/40" : "group-hover:scale-110"}`}>
                        {HORIZON_ICONS[i]}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${activeScene === i ? "text-primary" : "text-muted-foreground"}`}>
                        {s.horizon}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active scene card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeScene}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="max-w-3xl mx-auto"
                >
                  <div className={`relative p-6 md:p-8 rounded-3xl bg-gradient-to-br ${HORIZON_GRADIENTS[activeScene]} bg-opacity-10 border border-primary/20 shadow-premium overflow-hidden`}>
                    <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                    <div className="relative">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Horizonte • {timeline.scenes[activeScene].horizon}</p>
                          <h3 className="font-display text-2xl md:text-3xl font-black">{timeline.scenes[activeScene].title}</h3>
                        </div>
                        <div className="text-5xl">{HORIZON_ICONS[activeScene]}</div>
                      </div>

                      <p className="text-base md:text-lg leading-relaxed mb-5 italic">
                        {timeline.scenes[activeScene].scene}
                      </p>

                      <div className="grid sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-background/60 backdrop-blur border border-border">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">📈 Métrica</p>
                          <p className="text-xs font-semibold">{timeline.scenes[activeScene].metric}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-background/60 backdrop-blur border border-border">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">💗 Emoção</p>
                          <p className="text-xs font-semibold">{timeline.scenes[activeScene].emotion}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-background/60 backdrop-blur border border-border">
                          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">⚠️ Risco real</p>
                          <p className="text-xs font-semibold">{timeline.scenes[activeScene].risk}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <Button variant="ghost" size="sm" onClick={() => setActiveScene(s => Math.max(0, s - 1))} disabled={activeScene === 0}>
                      ← Antes
                    </Button>
                    <span className="text-xs text-muted-foreground">{activeScene + 1} / {timeline.scenes.length}</span>
                    <Button variant="ghost" size="sm" onClick={() => setActiveScene(s => Math.min(timeline.scenes.length - 1, s + 1))} disabled={activeScene === timeline.scenes.length - 1}>
                      Depois →
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Implementation Intention + Letter */}
              <div className="grid md:grid-cols-2 gap-4 mt-10 max-w-3xl mx-auto">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/10 border border-primary/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-primary" />
                    <h4 className="font-display font-bold">Frase-âncora</h4>
                  </div>
                  <p className="text-sm font-medium italic leading-relaxed">"{timeline.if_then_plan}"</p>
                  <p className="text-[10px] text-muted-foreground mt-2">📌 Implementation Intention — Gollwitzer (1999)</p>
                </div>

                <button
                  onClick={openLetter}
                  className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 to-rose-500/10 border border-amber-500/30 text-left hover:scale-[1.02] transition-transform"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-5 h-5 text-amber-500" />
                    <h4 className="font-display font-bold">Carta do seu eu de 5 anos</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">👆 Toque para abrir o envelope (+30 XP)</p>
                </button>
              </div>

              <div className="text-center mt-8 flex flex-wrap justify-center gap-3">
                <Button variant="outline" onClick={() => { setTimeline(null); setHabit(""); setValue(""); }}>
                  🔄 Nova projeção
                </Button>
              </div>

              {/* Letter modal */}
              <AnimatePresence>
                {letterOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setLetterOpen(false)}
                    className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                  >
                    <motion.div
                      initial={{ scale: 0.8, rotateY: -90 }}
                      animate={{ scale: 1, rotateY: 0 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      onClick={e => e.stopPropagation()}
                      className="max-w-lg w-full p-8 rounded-3xl bg-gradient-to-br from-amber-50 to-rose-50 dark:from-amber-950/40 dark:to-rose-950/40 border border-amber-500/40 shadow-2xl"
                    >
                      <div className="text-center mb-4">
                        <div className="text-5xl mb-2">💌</div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">De: você, em 5 anos</p>
                        <p className="text-[10px] text-muted-foreground">Para: você, hoje</p>
                      </div>
                      <p className="font-serif text-base md:text-lg leading-relaxed italic text-foreground">
                        "{timeline.letter_from_future}"
                      </p>
                      <Button onClick={() => setLetterOpen(false)} className="w-full mt-6 gradient-institute">
                        Vou guardar isso ✨
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
