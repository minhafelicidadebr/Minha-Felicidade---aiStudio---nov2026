import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { flashcards, modules } from "@/data/courseData";
import { RotateCcw, ChevronLeft, ChevronRight, Sparkles, Trophy } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AlegriaFAB } from "@/components/AlegriaCTA";
import { useProgress } from "@/hooks/useProgress";
import { useXPBurst, EncouragementBubble, ConfettiCelebration } from "@/components/learning/LearningFX";
import { useNeonFX } from "@/components/learning/NeonConfettiFX";
import BackToVideoBanner from "@/components/learning/BackToVideoBanner";

export default function FlashcardsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeModule = searchParams.get("module");
  const filtered = useMemo(() => activeModule ? flashcards.filter(f => f.module === activeModule) : flashcards, [activeModule]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [totalXp, setTotalXp] = useState(0);
  const [encourageTrigger, setEncourageTrigger] = useState(0);
  const { trackActivity } = useProgress();
  const xpFx = useXPBurst();
  const neonFx = useNeonFX();

  const card = filtered[idx] || filtered[0];
  if (!card) return <div className="min-h-screen bg-background"><Navbar /><div className="container pt-24 text-center text-muted-foreground">Nenhum flashcard disponível.</div></div>;

  const next = () => { setFlipped(false); setTimeout(() => setIdx((i) => (i + 1) % filtered.length), 200); };
  const prev = () => { setFlipped(false); setTimeout(() => setIdx((i) => (i - 1 + filtered.length) % filtered.length), 200); };
  const markKnown = (e?: React.MouseEvent) => {
    if (!known.has(card.id)) {
      setKnown((s) => new Set(s).add(card.id));
      setTotalXp(p => p + 5);
      const ev = e ? { clientX: e.clientX, clientY: e.clientY } : undefined;
      xpFx.trigger(5, ev);
      neonFx.correct(ev);
      setEncourageTrigger(t => t + 1);
      trackActivity({ moduleId: card.module, activityType: "flashcard", activityId: card.id, score: 100, data: { status: "known" } });
    }
    next();
  };

  const availableModules = [...new Set(flashcards.map(f => f.module))];
  const mod = modules.find(m => m.id === card.module);
  const allDone = known.size === filtered.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <BackToVideoBanner />
      <div className="flex-1 container pt-24 pb-16 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-display font-bold">🃏 Flashcards</h1>
              <p className="text-muted-foreground mt-1">Repetição espaçada para consolidação</p>
            </div>
            <div className="flex items-center gap-3">
              {totalXp > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/20 text-secondary-foreground">
                  <Trophy className="w-3.5 h-3.5" />
                  <span className="font-bold text-sm">+{totalXp} XP</span>
                </div>
              )}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success">
                <Sparkles className="w-4 h-4" />
                <span className="font-bold text-sm">{known.size}/{filtered.length}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => { setSearchParams({}); setIdx(0); setFlipped(false); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!activeModule ? "gradient-institute text-primary-foreground shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>Todos</button>
            {availableModules.map(mid => {
              const m = modules.find(mod => mod.id === mid);
              return m ? <button key={mid} onClick={() => { setSearchParams({ module: mid }); setIdx(0); setFlipped(false); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeModule === mid ? "gradient-institute text-primary-foreground shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{m.icon} M{m.number}</button> : null;
            })}
          </div>

          <div className="w-full h-2 bg-muted rounded-full mb-8 overflow-hidden">
            <motion.div className="h-full bg-success rounded-full" animate={{ width: `${(known.size / filtered.length) * 100}%` }} transition={{ duration: 0.5 }} />
          </div>

          {allDone ? (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-16 bg-card rounded-3xl border border-border shadow-premium">
              <span className="text-6xl block mb-4">🎉</span>
              <h2 className="font-display font-bold text-2xl mb-2">Parabéns!</h2>
              <p className="text-muted-foreground mb-4">Você dominou todos os {filtered.length} flashcards!</p>
              <p className="text-sm font-bold text-secondary">+{totalXp} XP ganhos nesta sessão</p>
              <button onClick={() => { setKnown(new Set()); setIdx(0); setTotalXp(0); }} className="mt-6 px-6 py-3 rounded-xl gradient-institute text-primary-foreground font-semibold shadow-warm">
                <RotateCcw className="w-4 h-4 inline mr-2" /> Revisar Novamente
              </button>
            </motion.div>
          ) : (
            <>
              <div className="mb-8" style={{ perspective: "1000px" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={card.id + (flipped ? "-back" : "-front")}
                    initial={{ rotateY: flipped ? -90 : 0, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: flipped ? 0 : 90, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => setFlipped(!flipped)}
                    className={`min-h-[320px] rounded-3xl p-8 flex flex-col justify-center items-center text-center cursor-pointer transition-colors ${
                      flipped
                        ? "gradient-card-gold shadow-premium"
                        : "bg-card border border-border shadow-warm hover:shadow-premium"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      {mod && <span className="text-xs font-semibold text-primary">{mod.icon} M{mod.number}</span>}
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">{card.category} • {flipped ? "Resposta" : "Conceito"}</span>
                    </div>
                    <p className={`font-display leading-relaxed ${flipped ? "text-lg" : "text-2xl font-bold"}`}>
                      {flipped ? card.back : card.front}
                    </p>
                    {!flipped && (
                      <span className="text-xs text-muted-foreground mt-6 flex items-center gap-1">
                        Clique para virar
                      </span>
                    )}
                    {flipped && !known.has(card.id) && (
                      <span className="text-xs text-primary mt-4 font-semibold">+5 XP ao marcar como aprendido</span>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between">
                <button onClick={prev} className="p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors" aria-label="Card anterior"><ChevronLeft className="w-5 h-5" /></button>
                <div className="flex gap-3">
                  <button onClick={next} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors font-medium text-sm"><RotateCcw className="w-4 h-4" /> Revisar</button>
                  <button onClick={(e) => markKnown(e)} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm shadow-warm transition-all dopamine-pop ${known.has(card.id) ? "bg-success/20 text-success" : "gradient-institute text-primary-foreground"}`}>
                    {known.has(card.id) ? "✓ Aprendido" : "✓ Sei isso!"}
                  </button>
                </div>
                <button onClick={next} className="p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors" aria-label="Próximo card"><ChevronRight className="w-5 h-5" /></button>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">Card {idx + 1} de {filtered.length}</p>
            </>
          )}
        </motion.div>
      </div>
      {xpFx.node}
      {neonFx.node}
      <EncouragementBubble trigger={encourageTrigger} />
      <ConfettiCelebration active={allDone} />
      <AlegriaFAB moduleId={activeModule ?? undefined} />
      <Footer />
    </div>
  );
}
