import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { debateTopics } from "@/data/moduleContents";
import { modules } from "@/data/courseData";
import { ArrowRight, MessageSquare, Scale } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AlegriaFAB } from "@/components/AlegriaCTA";
import { useProgress } from "@/hooks/useProgress";

export default function DebatePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeModule = searchParams.get("module");
  const filtered = useMemo(() => activeModule ? debateTopics.filter(d => d.module === activeModule) : debateTopics, [activeModule]);

  const [topicIdx, setTopicIdx] = useState(0);
  const [selectedPosition, setSelectedPosition] = useState<"A" | "B" | null>(null);
  const [showSynthesis, setShowSynthesis] = useState(false);
  const [userArgument, setUserArgument] = useState("");
  const [submittedArgs, setSubmittedArgs] = useState<{ position: "A" | "B"; text: string }[]>([]);
  const { trackActivity } = useProgress();

  const topic = filtered[topicIdx];
  const availableModules = useMemo(() => [...new Set(debateTopics.map(d => d.module))], []);

  if (!topic) return <div className="min-h-screen bg-background"><Navbar /><div className="container pt-24 text-center text-muted-foreground">Nenhum debate disponível.</div></div>;

  const submitArg = () => {
    if (!userArgument.trim() || !selectedPosition) return;
    setSubmittedArgs((prev) => [...prev, { position: selectedPosition, text: userArgument.trim() }]);
    setUserArgument("");
    trackActivity({
      moduleId: topic.module,
      activityType: "debate",
      activityId: topic.id,
      data: { position: selectedPosition, argument: userArgument.trim().slice(0, 500) },
    });
  };

  const nextTopic = () => {
    setTopicIdx((i) => (i + 1) % filtered.length);
    setSelectedPosition(null);
    setShowSynthesis(false);
    setUserArgument("");
    setSubmittedArgs([]);
  };

  const mod = modules.find(m => m.id === topic.module);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold mb-2">⚔️ Arena de Debate</h1>
          <p className="text-muted-foreground mb-4">Debate socrático + mapa de argumentos com fontes verificáveis</p>

          <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Filtrar por módulo">
            <button onClick={() => { setSearchParams({}); setTopicIdx(0); setSelectedPosition(null); setShowSynthesis(false); setSubmittedArgs([]); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!activeModule ? "gradient-warm text-primary-foreground shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>Todos</button>
            {availableModules.map(mid => {
              const m = modules.find(mod => mod.id === mid);
              return m ? <button key={mid} onClick={() => { setSearchParams({ module: mid }); setTopicIdx(0); setSelectedPosition(null); setShowSynthesis(false); setSubmittedArgs([]); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeModule === mid ? "gradient-warm text-primary-foreground shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{m.icon} M{m.number}</button> : null;
            })}
          </div>

          <div className="bg-card rounded-2xl p-8 shadow-warm mb-8">
            <div className="text-center mb-8">
              {mod && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold mb-2">{mod.icon} Módulo {mod.number}</span>}
              <span className="block text-xs font-semibold text-primary uppercase tracking-wider">Questão Central</span>
              <h2 className="text-2xl font-display font-bold mt-2">{topic.title}</h2>
              <p className="text-sm text-muted-foreground mt-2">{topic.context}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className={`rounded-2xl p-6 cursor-pointer transition-all border-2 ${selectedPosition === "A" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`} onClick={() => setSelectedPosition("A")} role="button" aria-pressed={selectedPosition === "A"} tabIndex={0}>
                <h3 className="font-display font-bold text-lg mb-3 text-primary">{topic.positionA.title}</h3>
                <div className="space-y-2 mb-4">
                  {topic.positionA.arguments.map((arg, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm"><span className="text-primary font-bold mt-0.5">→</span><span>{arg}</span></div>
                  ))}
                </div>
                <div className="space-y-1">
                  {topic.positionA.sources.map((s, i) => (
                    <p key={i} className="text-xs text-primary truncate">📎 {s}</p>
                  ))}
                </div>
              </div>

              <div className={`rounded-2xl p-6 cursor-pointer transition-all border-2 ${selectedPosition === "B" ? "border-secondary bg-secondary/5" : "border-border hover:border-secondary/30"}`} onClick={() => setSelectedPosition("B")} role="button" aria-pressed={selectedPosition === "B"} tabIndex={0}>
                <h3 className="font-display font-bold text-lg mb-3 text-secondary">{topic.positionB.title}</h3>
                <div className="space-y-2 mb-4">
                  {topic.positionB.arguments.map((arg, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm"><span className="text-secondary font-bold mt-0.5">→</span><span>{arg}</span></div>
                  ))}
                </div>
                <div className="space-y-1">
                  {topic.positionB.sources.map((s, i) => (
                    <p key={i} className="text-xs text-primary truncate">📎 {s}</p>
                  ))}
                </div>
              </div>
            </div>

            {selectedPosition && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <h4 className="font-display font-bold mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Seu Argumento</h4>
                <div className="flex gap-3">
                  <input value={userArgument} onChange={(e) => setUserArgument(e.target.value)} placeholder={`Argumente a favor da posição ${selectedPosition}...`} className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm" onKeyDown={(e) => e.key === "Enter" && submitArg()} aria-label="Digite seu argumento" />
                  <button onClick={submitArg} className="px-5 py-3 rounded-xl gradient-warm text-primary-foreground font-semibold text-sm shadow-warm">Enviar</button>
                </div>
                {submittedArgs.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {submittedArgs.map((arg, i) => (
                      <div key={i} className={`p-3 rounded-lg text-sm ${arg.position === "A" ? "bg-primary/5 border-l-2 border-primary" : "bg-secondary/5 border-l-2 border-secondary"}`}>
                        <span className="text-xs font-semibold text-muted-foreground">Posição {arg.position}</span>
                        <p className="mt-1">{arg.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            <div className="flex justify-center gap-4">
              <button onClick={() => setShowSynthesis(!showSynthesis)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-accent-foreground font-semibold text-sm">
                <Scale className="w-4 h-4" /> {showSynthesis ? "Ocultar" : "Revelar"} Síntese
              </button>
              <button onClick={nextTopic} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-muted text-sm font-medium">
                Próximo debate <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {showSynthesis && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 gradient-card-gold rounded-xl p-6">
                <h4 className="font-display font-bold mb-2">🔗 Ponto de Síntese</h4>
                <p className="text-sm leading-relaxed">{topic.synthesisCue}</p>
              </motion.div>
            )}
          </div>

          <div className="text-center text-xs text-muted-foreground">Debate {topicIdx + 1} de {filtered.length}</div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
