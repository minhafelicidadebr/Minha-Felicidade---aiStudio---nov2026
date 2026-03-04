import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { poems } from "@/data/moduleContents";
import { ChevronLeft, ChevronRight, PenLine } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function PoetryPage() {
  const [idx, setIdx] = useState(0);
  const [userText, setUserText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const poem = poems[idx];

  const next = () => {
    setIdx((i) => (i + 1) % poems.length);
    setUserText("");
    setSubmitted(false);
  };
  const prev = () => {
    setIdx((i) => (i - 1 + poems.length) % poems.length);
    setUserText("");
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold mb-2">🎭 Poesia Pedagógica</h1>
          <p className="text-muted-foreground mb-8">Codificação emocional + memória semântica + sentido</p>

          <AnimatePresence mode="wait">
            <motion.div
              key={poem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Poem */}
              <div className="gradient-card-coral rounded-2xl p-8 mb-6 shadow-warm">
                <h2 className="font-display font-bold text-xl mb-1">{poem.title}</h2>
                <p className="text-xs text-muted-foreground mb-6">{poem.author}</p>
                <div className="font-display text-lg leading-[1.8] whitespace-pre-line italic">
                  {poem.poem}
                </div>
              </div>

              {/* Reflection */}
              <div className="bg-card rounded-2xl p-6 border border-border mb-6">
                <h3 className="font-display font-bold mb-2">💭 Reflexão</h3>
                <p className="text-sm text-foreground/90 leading-relaxed">{poem.reflection}</p>
              </div>

              {/* Practice */}
              <div className="bg-card rounded-2xl p-6 border border-border mb-6">
                <h3 className="font-display font-bold mb-2 flex items-center gap-2">
                  <PenLine className="w-4 h-4" /> Prática
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{poem.practice}</p>
                <textarea
                  value={userText}
                  onChange={(e) => setUserText(e.target.value)}
                  placeholder="Escreva sua reflexão aqui..."
                  rows={4}
                  className="w-full p-4 rounded-xl bg-muted border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => setSubmitted(true)}
                    disabled={!userText.trim()}
                    className="px-5 py-2.5 rounded-xl gradient-warm text-primary-foreground font-semibold text-sm shadow-warm disabled:opacity-50"
                  >
                    Salvar reflexão
                  </button>
                </div>
                {submitted && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-3 bg-success/10 rounded-lg text-sm text-success font-medium">
                    ✓ Reflexão salva! +15 XP
                  </motion.div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button onClick={prev} className="p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-muted-foreground">Poema {idx + 1} de {poems.length}</span>
            <button onClick={next} className="p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
