import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw, Trophy, Timer, Zap } from "lucide-react";
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

interface Card {
  id: number;
  text: string;
  pairId: number;
  type: "concept" | "definition";
  flipped: boolean;
  matched: boolean;
}

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
    setCards(shuffled);
    setSelected([]);
    setMatches(0);
    setMoves(0);
    setTimer(0);
    setGameOver(false);
    setStarted(true);
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
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <header className="text-center mb-6">
            <span className="text-5xl mb-3 block">🧩</span>
            <h1 className="text-3xl font-display font-bold mb-1">Jogo da Memória Científica</h1>
            <p className="text-sm text-muted-foreground">{mod?.title || "Módulo"} — Conecte conceitos às definições</p>
          </header>

          {/* Stats Bar */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="flex items-center gap-1.5 text-sm">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-bold">{moves}</span> jogadas
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Timer className="w-4 h-4 text-secondary" />
              <span className="font-bold">{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Trophy className="w-4 h-4 text-accent" />
              <span className="font-bold">{matches}/{total}</span>
            </div>
          </div>

          {/* Game Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
            {cards.map(card => (
              <motion.button
                key={card.id}
                onClick={() => handleFlip(card.id)}
                whileHover={!card.flipped && !card.matched ? { scale: 1.03 } : {}}
                whileTap={!card.flipped && !card.matched ? { scale: 0.97 } : {}}
                className={`aspect-square rounded-2xl p-2 text-xs sm:text-sm font-medium transition-all duration-300 flex items-center justify-center text-center ${
                  card.matched
                    ? "bg-success/20 border-2 border-success/40 text-success"
                    : card.flipped
                    ? card.type === "concept" ? "bg-primary/10 border-2 border-primary/40 text-foreground" : "bg-secondary/10 border-2 border-secondary/40 text-foreground"
                    : "glass-card hover:shadow-warm cursor-pointer border-2 border-transparent"
                }`}
              >
                {card.flipped || card.matched ? (
                  <span>{card.text}</span>
                ) : (
                  <span className="text-2xl">❓</span>
                )}
              </motion.button>
            ))}
          </div>

          {/* Game Over */}
          {gameOver && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-6 text-center">
              <span className="text-4xl block mb-2">🎉</span>
              <h2 className="font-display font-bold text-2xl mb-1">Parabéns!</h2>
              <p className="text-muted-foreground mb-3">Completou em {moves} jogadas e {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}</p>
              <div className="flex justify-center gap-1 mb-4">
                {[1, 2, 3].map(s => <span key={s} className={`text-2xl ${s <= stars ? "" : "opacity-20"}`}>⭐</span>)}
              </div>
              <p className="text-sm font-bold text-primary mb-4">+{stars * 10} XP ganho!</p>
              <button onClick={initGame} className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl gradient-institute text-primary-foreground font-bold shadow-warm hover:shadow-glow transition-shadow">
                <RotateCcw className="w-4 h-4" /> Jogar Novamente
              </button>
            </motion.div>
          )}

          {!gameOver && (
            <div className="flex justify-center">
              <button onClick={initGame} className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card hover:shadow-warm text-sm font-medium transition-all">
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
