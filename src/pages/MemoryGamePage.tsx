import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Trophy, Timer, Zap, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useProgress } from "@/hooks/useProgress";
import { modules } from "@/data/courseData";

const CARDS_BY_MODULE: Record<string, { concept: string; definition: string }[]> = {
  mentiras: [
    { concept: "Miswanting", definition: "Desejar coisas que não nos farão felizes" },
    { concept: "Falácia G.I. Joe", definition: "Saber não é suficiente para mudar" },
    { concept: "Hedonic Treadmill", definition: "Esteira que nos faz buscar sempre mais" },
    { concept: "Motivação Extrínseca", definition: "Busca por recompensas externas" },
    { concept: "Impact Bias", definition: "Superestimar impacto emocional futuro" },
    { concept: "Comparação Social", definition: "Avaliar-se em relação aos outros" },
  ],
  expectativas: [
    { concept: "Adaptação Hedônica", definition: "Voltamos ao nível emocional base" },
    { concept: "Pontos de Referência", definition: "Padrões que usamos para comparar" },
    { concept: "Focalismo", definition: "Focar demais em um aspecto da vida" },
    { concept: "Negligência Imune", definition: "Ignorar nossa resiliência natural" },
    { concept: "Medalha de Prata", definition: "Paradoxo: bronze mais feliz que prata" },
    { concept: "Affective Forecasting", definition: "Previsão incorreta de emoções" },
  ],
  rewirements: [
    { concept: "Flow", definition: "Estado de imersão total em atividade" },
    { concept: "Atos de Bondade", definition: "Generosidade aumenta bem-estar" },
    { concept: "Conexão Social", definition: "Maior preditor de felicidade" },
    { concept: "Time Affluence", definition: "Sensação de ter tempo suficiente" },
    { concept: "Forças de Caráter", definition: "Qualidades que energizam quando usadas" },
    { concept: "Helper's High", definition: "Bem-estar por ajudar os outros" },
  ],
  hacks: [
    { concept: "Savoring", definition: "Saborear experiências intencionalmente" },
    { concept: "Mindfulness", definition: "Atenção plena ao momento presente" },
    { concept: "Visualização Negativa", definition: "Imaginar perda para valorizar" },
    { concept: "Experiências > Coisas", definition: "Gastar em vivências, não objetos" },
    { concept: "Mind-Wandering", definition: "Mente divaga 50% do tempo" },
    { concept: "Reset de Referência", definition: "Recalibrar expectativas" },
  ],
  habitos: [
    { concept: "WOOP", definition: "Wish, Outcome, Obstacle, Plan" },
    { concept: "Implementation Intentions", definition: "Se-então para hábitos" },
    { concept: "Growth Mindset", definition: "Inteligência pode ser desenvolvida" },
    { concept: "Hacking de Hábitos", definition: "Pista, rotina, recompensa" },
    { concept: "Design de Ambiente", definition: "Ajustar o contexto para facilitar" },
    { concept: "Situation Modification", definition: "Mudar a situação, não você" },
  ],
};

interface Card { id: number; text: string; pairId: number; type: "concept" | "definition"; flipped: boolean; matched: boolean; }

export default function MemoryGamePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const moduleId = searchParams.get("module") || "mentiras";
  const { trackActivity } = useProgress();
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [lastMatch, setLastMatch] = useState<string | null>(null);

  const initGame = useCallback(() => {
    const items = CARDS_BY_MODULE[moduleId] || CARDS_BY_MODULE.mentiras;
    const shuffled: Card[] = [];
    items.forEach((item, i) => {
      shuffled.push({ id: i * 2, text: item.concept, pairId: i, type: "concept", flipped: false, matched: false });
      shuffled.push({ id: i * 2 + 1, text: item.definition, pairId: i, type: "definition", flipped: false, matched: false });
    });
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setCards(shuffled); setSelected([]); setMatches(0); setMoves(0); setTimer(0); setGameOver(false); setStarted(true); setLastMatch(null);
  }, [moduleId]);

  useEffect(() => { initGame(); }, [initGame]);
  useEffect(() => {
    if (!started || gameOver) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [started, gameOver]);

  const handleFlip = (id: number) => {
    if (selected.length >= 2) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    const newCards = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    setCards(newCards);
    const newSelected = [...selected, id];
    setSelected(newSelected);
    if (newSelected.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newSelected.map(sid => newCards.find(c => c.id === sid)!);
      if (a.pairId === b.pairId) {
        setLastMatch(`${a.type === "concept" ? a.text : b.text} = ${a.type === "definition" ? a.text : b.text}`);
        setTimeout(() => {
          setCards(prev => prev.map(c => c.pairId === a.pairId ? { ...c, matched: true } : c));
          setMatches(m => {
            const newM = m + 1;
            const total = (CARDS_BY_MODULE[moduleId] || CARDS_BY_MODULE.mentiras).length;
            if (newM === total) {
              setGameOver(true);
              trackActivity({ moduleId, activityType: "memory", activityId: `memory-${moduleId}`, score: Math.max(0, 100 - moves * 2), data: { moves: moves + 1, time: timer } });
            }
            return newM;
          });
          setSelected([]);
        }, 600);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(c => newSelected.includes(c.id) ? { ...c, flipped: false } : c));
          setSelected([]);
        }, 1000);
      }
    }
  };

  const total = (CARDS_BY_MODULE[moduleId] || CARDS_BY_MODULE.mentiras).length;
  const stars = moves <= total ? 3 : moves <= total * 2 ? 2 : 1;
  const mod = modules.find(m => m.id === moduleId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-3xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative rounded-3xl p-8 mb-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-border/30 overflow-hidden">
            <div className="absolute inset-0 noise opacity-30 pointer-events-none" />
            <div className="relative text-center">
              <span className="text-6xl mb-3 block">🧩</span>
              <h1 className="text-3xl font-display font-bold mb-1">Jogo da Memória Científica</h1>
              <p className="text-sm text-muted-foreground">{mod?.title || "Módulo"} — Conecte conceitos às definições</p>
            </div>
          </div>

          {/* Stats Bar — premium */}
          <div className="glass-card rounded-2xl p-4 mb-6 flex items-center justify-between border border-border/30">
            <div className="flex items-center gap-1.5 text-sm">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-bold">{moves}</span> <span className="text-muted-foreground text-xs">jogadas</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Timer className="w-4 h-4 text-secondary" />
              <span className="font-bold">{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Trophy className="w-4 h-4 text-accent" />
              <span className="font-bold">{matches}/{total}</span>
            </div>
            {/* Progress bar */}
            <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
              <motion.div className="h-full gradient-institute rounded-full" animate={{ width: `${(matches / total) * 100}%` }} />
            </div>
          </div>

          {/* Last match indicator */}
          <AnimatePresence>
            {lastMatch && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center mb-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-xs font-bold">
                  <Sparkles className="w-3 h-3" /> {lastMatch}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game Grid — premium cards with 3D flip */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
            {cards.map(card => (
              <motion.button
                key={card.id}
                onClick={() => handleFlip(card.id)}
                whileHover={!card.flipped && !card.matched ? { scale: 1.05, y: -2 } : {}}
                whileTap={!card.flipped && !card.matched ? { scale: 0.97 } : {}}
                animate={card.matched ? { scale: [1, 1.1, 1] } : {}}
                className={`aspect-square rounded-2xl p-2 text-xs sm:text-sm font-medium transition-all duration-300 flex items-center justify-center text-center relative overflow-hidden ${
                  card.matched
                    ? "bg-success/15 border-2 border-success/40 text-success shadow-lg"
                    : card.flipped
                    ? card.type === "concept" ? "bg-primary/10 border-2 border-primary/40" : "bg-secondary/10 border-2 border-secondary/40"
                    : "glass-card hover:shadow-warm cursor-pointer border-2 border-transparent"
                }`}
              >
                {(card.flipped || card.matched) ? (
                  <motion.span initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} className="leading-tight">
                    {card.type === "concept" && <span className="text-[9px] text-primary/60 block mb-0.5 font-bold uppercase tracking-wider">Conceito</span>}
                    {card.type === "definition" && <span className="text-[9px] text-secondary/60 block mb-0.5 font-bold uppercase tracking-wider">Definição</span>}
                    {card.text}
                  </motion.span>
                ) : (
                  <span className="text-3xl">❓</span>
                )}
                {card.matched && <div className="absolute inset-0 shimmer pointer-events-none" />}
              </motion.button>
            ))}
          </div>

          {/* Game Over — premium celebration */}
          <AnimatePresence>
            {gameOver && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-3xl p-8 text-center border border-success/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent pointer-events-none" />
                <motion.span className="text-6xl block mb-3" animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5 }}>🎉</motion.span>
                <h2 className="font-display font-bold text-3xl mb-2">Parabéns!</h2>
                <p className="text-muted-foreground mb-4">Completou em {moves} jogadas e {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}</p>
                <div className="flex justify-center gap-1 mb-4">
                  {[1, 2, 3].map(s => (
                    <motion.span key={s} className={`text-3xl ${s <= stars ? "" : "opacity-20"}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: s * 0.2, type: "spring" }}>⭐</motion.span>
                  ))}
                </div>
                <p className="text-lg font-bold text-primary mb-6">+{stars * 10} XP ganho!</p>
                <button onClick={initGame} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl gradient-institute text-primary-foreground font-bold shadow-warm hover:shadow-glow transition-all">
                  <RotateCcw className="w-4 h-4" /> Jogar Novamente
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!gameOver && (
            <div className="flex justify-center">
              <button onClick={initGame} className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass-card hover:shadow-warm text-sm font-medium transition-all border border-border/30">
                <RotateCcw className="w-4 h-4" /> Reiniciar
              </button>
            </div>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
