import { useState } from "react";
import { motion } from "framer-motion";
import { debateTopics } from "@/data/moduleContents";
import { ArrowRight, MessageSquare, Scale } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function DebatePage() {
  const [topicIdx, setTopicIdx] = useState(0);
  const [selectedPosition, setSelectedPosition] = useState<"A" | "B" | null>(null);
  const [showSynthesis, setShowSynthesis] = useState(false);
  const [userArgument, setUserArgument] = useState("");
  const [submittedArgs, setSubmittedArgs] = useState<{ position: "A" | "B"; text: string }[]>([]);

  const topic = debateTopics[topicIdx];

  const submitArg = () => {
    if (!userArgument.trim() || !selectedPosition) return;
    setSubmittedArgs((prev) => [...prev, { position: selectedPosition, text: userArgument.trim() }]);
    setUserArgument("");
  };

  const nextTopic = () => {
    setTopicIdx((i) => (i + 1) % debateTopics.length);
    setSelectedPosition(null);
    setShowSynthesis(false);
    setUserArgument("");
    setSubmittedArgs([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold mb-2">⚔️ Arena de Debate</h1>
          <p className="text-muted-foreground mb-8">Debate socrático + mapa de argumentos com fontes verificáveis</p>

          <div className="bg-card rounded-2xl p-8 shadow-warm mb-8">
            <div className="text-center mb-8">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Questão Central</span>
              <h2 className="text-2xl font-display font-bold mt-2">{topic.title}</h2>
            </div>

            {/* Two positions */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Position A */}
              <div
                className={`rounded-2xl p-6 cursor-pointer transition-all border-2 ${
                  selectedPosition === "A" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                }`}
                onClick={() => setSelectedPosition("A")}
              >
                <h3 className="font-display font-bold text-lg mb-3 text-primary">{topic.positionA.name}</h3>
                <div className="space-y-2 mb-4">
                  {topic.positionA.arguments.map((arg, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-bold mt-0.5">→</span>
                      <span>{arg}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {topic.positionA.sources.map((s, i) => (
                    <a key={i} href={s} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary hover:underline truncate">
                      📎 {s}
                    </a>
                  ))}
                </div>
              </div>

              {/* Position B */}
              <div
                className={`rounded-2xl p-6 cursor-pointer transition-all border-2 ${
                  selectedPosition === "B" ? "border-secondary bg-secondary/5" : "border-border hover:border-secondary/30"
                }`}
                onClick={() => setSelectedPosition("B")}
              >
                <h3 className="font-display font-bold text-lg mb-3 text-secondary">{topic.positionB.name}</h3>
                <div className="space-y-2 mb-4">
                  {topic.positionB.arguments.map((arg, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-secondary font-bold mt-0.5">→</span>
                      <span>{arg}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {topic.positionB.sources.map((s, i) => (
                    <a key={i} href={s} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary hover:underline truncate">
                      📎 {s}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* User arguments */}
            {selectedPosition && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <h4 className="font-display font-bold mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Seu Argumento
                </h4>
                <div className="flex gap-3">
                  <input
                    value={userArgument}
                    onChange={(e) => setUserArgument(e.target.value)}
                    placeholder={`Argumente a favor da posição ${selectedPosition}...`}
                    className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    onKeyDown={(e) => e.key === "Enter" && submitArg()}
                  />
                  <button onClick={submitArg} className="px-5 py-3 rounded-xl gradient-warm text-primary-foreground font-semibold text-sm shadow-warm">
                    Enviar
                  </button>
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

            {/* Synthesis */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowSynthesis(!showSynthesis)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-accent-foreground font-semibold text-sm"
              >
                <Scale className="w-4 h-4" /> {showSynthesis ? "Ocultar" : "Revelar"} Síntese
              </button>
              <button onClick={nextTopic} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-muted text-sm font-medium">
                Próximo debate <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {showSynthesis && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 gradient-card-gold rounded-xl p-6"
              >
                <h4 className="font-display font-bold mb-2">🔗 Ponto de Síntese</h4>
                <p className="text-sm leading-relaxed">{topic.synthesisCue}</p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
