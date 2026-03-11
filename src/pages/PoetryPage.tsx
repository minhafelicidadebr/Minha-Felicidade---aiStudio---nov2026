import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { poems } from "@/data/moduleContents";
import { modules } from "@/data/courseData";
import { ChevronLeft, ChevronRight, PenLine } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useProgress } from "@/hooks/useProgress";

export default function PoetryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeModule = searchParams.get("module");
  const filtered = useMemo(() => activeModule ? poems.filter(p => p.module === activeModule) : poems, [activeModule]);
  const [idx, setIdx] = useState(0);
  const [userText, setUserText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { trackActivity } = useProgress();

  const poem = filtered[idx] || filtered[0];
  const availableModules = useMemo(() => [...new Set(poems.map(p => p.module))], []);

  if (!poem) return <div className="min-h-screen bg-background"><Navbar /><div className="container pt-24 text-center text-muted-foreground">Nenhum poema disponível.</div></div>;

  const next = () => { setIdx((i) => (i + 1) % filtered.length); setUserText(""); setSubmitted(false); };
  const prev = () => { setIdx((i) => (i - 1 + filtered.length) % filtered.length); setUserText(""); setSubmitted(false); };
  const mod = modules.find(m => m.id === poem.module);

  const handleSubmit = () => {
    setSubmitted(true);
    trackActivity({
      moduleId: poem.module,
      activityType: "poetry",
      activityId: poem.id,
      data: { reflection: userText.slice(0, 500) },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold mb-2">🎭 Poesia Pedagógica</h1>
          <p className="text-muted-foreground mb-4">Codificação emocional + memória semântica + sentido</p>

          <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Filtrar por módulo">
            <button onClick={() => { setSearchParams({}); setIdx(0); setUserText(""); setSubmitted(false); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!activeModule ? "gradient-warm text-primary-foreground shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>Todos</button>
            {availableModules.map(mid => {
              const m = modules.find(mod => mod.id === mid);
              return m ? <button key={mid} onClick={() => { setSearchParams({ module: mid }); setIdx(0); setUserText(""); setSubmitted(false); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeModule === mid ? "gradient-warm text-primary-foreground shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{m.icon} M{m.number}</button> : null;
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={poem.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="gradient-card-coral rounded-2xl p-8 mb-6 shadow-warm">
                {mod && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold mb-3">{mod.icon} Módulo {mod.number}</span>}
                <h2 className="font-display font-bold text-xl mb-1">{poem.title}</h2>
                <p className="text-xs text-muted-foreground mb-6">{poem.author}</p>
                <div className="font-display text-lg leading-[1.8] whitespace-pre-line italic">{poem.text}</div>
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border mb-6">
                <h3 className="font-display font-bold mb-2">💭 Reflexão</h3>
                <p className="text-sm text-foreground/90 leading-relaxed">{poem.reflection}</p>
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border mb-6">
                <h3 className="font-display font-bold mb-2 flex items-center gap-2"><PenLine className="w-4 h-4" /> Prática</h3>
                <p className="text-sm text-muted-foreground mb-4">{poem.practice}</p>
                <textarea value={userText} onChange={(e) => setUserText(e.target.value)} placeholder="Escreva sua reflexão aqui..." rows={4} className="w-full p-4 rounded-xl bg-muted border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none" aria-label="Sua reflexão poética" />
                <div className="flex justify-end mt-3">
                  <button onClick={handleSubmit} disabled={!userText.trim() || submitted} className="px-5 py-2.5 rounded-xl gradient-warm text-primary-foreground font-semibold text-sm shadow-warm disabled:opacity-50">Salvar reflexão</button>
                </div>
                {submitted && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-3 bg-success/10 rounded-lg text-sm text-success font-medium" role="status">✓ Reflexão salva! +15 XP</motion.div>}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-6">
            <button onClick={prev} className="p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors" aria-label="Poema anterior"><ChevronLeft className="w-5 h-5" /></button>
            <span className="text-sm text-muted-foreground">Poema {idx + 1} de {filtered.length}</span>
            <button onClick={next} className="p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors" aria-label="Próximo poema"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
