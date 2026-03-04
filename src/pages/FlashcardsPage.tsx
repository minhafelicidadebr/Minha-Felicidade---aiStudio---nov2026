import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { flashcards } from "@/data/courseData";
import { RotateCcw, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function FlashcardsPage() {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());

  const card = flashcards[idx];

  const next = () => {
    setFlipped(false);
    setTimeout(() => setIdx((i) => (i + 1) % flashcards.length), 200);
  };

  const prev = () => {
    setFlipped(false);
    setTimeout(() => setIdx((i) => (i - 1 + flashcards.length) % flashcards.length), 200);
  };

  const markKnown = () => {
    setKnown((s) => new Set(s).add(card.id));
    next();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold">🃏 Flashcards</h1>
              <p className="text-muted-foreground mt-1">Repetição espaçada para consolidação</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success">
              <Sparkles className="w-4 h-4" />
              <span className="font-bold text-sm">{known.size}/{flashcards.length}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="w-full h-1.5 bg-muted rounded-full mb-8">
            <div
              className="h-full bg-success rounded-full transition-all duration-500"
              style={{ width: `${(known.size / flashcards.length) * 100}%` }}
            />
          </div>

          {/* Card */}
          <div className="perspective-1000 mb-8" style={{ perspective: "1000px" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={card.id + (flipped ? "-back" : "-front")}
                initial={{ rotateY: flipped ? -90 : 0, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: flipped ? 0 : 90, opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => setFlipped(!flipped)}
                className={`min-h-[320px] rounded-2xl p-8 flex flex-col justify-center items-center text-center cursor-pointer shadow-warm transition-colors ${
                  flipped ? "gradient-card-gold" : "bg-card border border-border"
                }`}
              >
                <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-4">
                  {card.category} • {flipped ? "Resposta" : "Conceito"}
                </span>
                <p className={`font-display leading-relaxed ${flipped ? "text-lg" : "text-2xl font-bold"}`}>
                  {flipped ? card.back : card.front}
                </p>
                {!flipped && (
                  <span className="text-xs text-muted-foreground mt-6">Clique para virar</span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <button onClick={prev} className="p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex gap-3">
              <button onClick={next} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors font-medium text-sm">
                <RotateCcw className="w-4 h-4" /> Revisar depois
              </button>
              <button onClick={markKnown} className="flex items-center gap-2 px-5 py-3 rounded-xl gradient-warm text-primary-foreground font-semibold text-sm shadow-warm">
                ✓ Sei isso!
              </button>
            </div>

            <button onClick={next} className="p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Card {idx + 1} de {flashcards.length}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
