import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, FlaskConical, CheckCircle2, XCircle, Clock, Lightbulb, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useProgress } from "@/hooks/useProgress";
import { modules } from "@/data/courseData";

const SUGGESTED_HYPOTHESES: Record<string, string[]> = {
  mentiras: [
    "Se eu parar de verificar redes sociais por 3 dias, vou me sentir menos ansioso(a)",
    "Se eu comprar algo que desejo muito, a felicidade vai durar menos de 1 semana",
    "Se eu focar em experiências ao invés de notas, minha satisfação vai aumentar",
  ],
  expectativas: [
    "Se eu anotar 3 coisas boas por dia, vou perceber mais coisas positivas em 7 dias",
    "Se eu comparar minha vida com quem tem menos (não mais), vou me sentir mais grato(a)",
    "Se eu aceitar uma nota 'boa' ao invés de perfeita, meu estresse vai diminuir",
  ],
  rewirements: [
    "Se eu fizer 1 ato de bondade por dia, meu humor vai melhorar em 1 semana",
    "Se eu conversar com 1 pessoa nova por dia, vou me sentir mais conectado(a)",
    "Se eu dormir 30 min mais cedo, vou ter mais energia e melhor humor",
  ],
  hacks: [
    "Se eu meditar 5 min/dia, vou perceber menos mind-wandering em 2 semanas",
    "Se eu praticar savoring em 1 refeição/dia, vou apreciar mais a comida",
    "Se eu imaginar perder algo que tenho, vou valorizar mais o que possuo",
  ],
  habitos: [
    "Se eu usar 'se-então' para exercício, vou conseguir manter por 14 dias",
    "Se eu aplicar WOOP para 1 meta, vou progredir mais que sem estratégia",
    "Se eu mudar meu ambiente (ex: deixar livro na mesa), vou ler mais",
  ],
};

interface Hypothesis {
  id: string; hypothesis: string; module: string; prediction: string;
  status: "testing" | "confirmed" | "refuted"; result?: string; createdAt: string;
}

export default function HypothesisLabPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const moduleId = searchParams.get("module") || "mentiras";
  const { trackActivity } = useProgress();
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>(() => {
    const s = localStorage.getItem("hypothesis-lab"); return s ? JSON.parse(s) : [];
  });
  const [showForm, setShowForm] = useState(false);
  const [hypothesis, setHypothesis] = useState("");
  const [prediction, setPrediction] = useState("");
  const [resultInput, setResultInput] = useState<{ id: string; type: "confirmed" | "refuted" } | null>(null);
  const [resultText, setResultText] = useState("");

  useEffect(() => { localStorage.setItem("hypothesis-lab", JSON.stringify(hypotheses)); }, [hypotheses]);

  const handleCreate = () => {
    if (!hypothesis.trim()) return;
    const h: Hypothesis = { id: `h-${Date.now()}`, hypothesis: hypothesis.trim(), module: moduleId, prediction: prediction.trim(), status: "testing", createdAt: new Date().toISOString().split("T")[0] };
    setHypotheses(prev => [h, ...prev]);
    trackActivity({ moduleId, activityType: "hypothesis", activityId: h.id, data: { hypothesis: h.hypothesis } });
    setHypothesis(""); setPrediction(""); setShowForm(false);
  };

  const updateStatus = (id: string, status: "confirmed" | "refuted", result: string) => {
    setHypotheses(prev => prev.map(h => h.id === id ? { ...h, status, result } : h));
    setResultInput(null); setResultText("");
  };

  const suggestions = SUGGESTED_HYPOTHESES[moduleId] || SUGGESTED_HYPOTHESES.mentiras;
  const mod = modules.find(m => m.id === moduleId);
  const statusConfig = {
    testing: { icon: <Clock className="w-4 h-4" />, label: "Em teste", css: "bg-secondary/20 text-secondary-foreground" },
    confirmed: { icon: <CheckCircle2 className="w-4 h-4" />, label: "Confirmada", css: "bg-success/20 text-success" },
    refuted: { icon: <XCircle className="w-4 h-4" />, label: "Refutada", css: "bg-destructive/10 text-destructive" },
  };

  const stats = { total: hypotheses.length, testing: hypotheses.filter(h => h.status === "testing").length, confirmed: hypotheses.filter(h => h.status === "confirmed").length };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-2xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative rounded-3xl p-8 mb-8 bg-gradient-to-br from-lime-500/10 to-green-500/10 border border-border/30 overflow-hidden">
            <div className="absolute inset-0 noise opacity-30 pointer-events-none" />
            <div className="relative text-center">
              <span className="text-6xl mb-3 block">🔬</span>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Laboratório de Hipóteses</h1>
              <p className="text-muted-foreground text-sm">{mod?.title} — Método Científico Pessoal (Popper, 1959)</p>
            </div>
          </div>

          {/* Stats */}
          {stats.total > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { value: stats.total, label: "Experimentos", icon: <FlaskConical className="w-4 h-4 text-primary" /> },
                { value: stats.testing, label: "Em teste", icon: <Clock className="w-4 h-4 text-secondary" /> },
                { value: stats.confirmed, label: "Confirmadas", icon: <CheckCircle2 className="w-4 h-4 text-success" /> },
              ].map((s, i) => (
                <motion.div key={i} className="glass-card rounded-2xl p-4 text-center border border-border/30" whileHover={{ y: -2 }}>
                  <div className="mb-1 flex justify-center">{s.icon}</div>
                  <span className="text-2xl font-bold font-display block">{s.value}</span>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Suggestions — premium */}
          <div className="glass-card rounded-3xl p-6 mb-6 border border-border/30">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-4 h-4 text-secondary" />
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">Sugestões para {mod?.title || "este módulo"}</span>
            </div>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <motion.button key={i} whileHover={{ x: 4 }}
                  onClick={() => { setHypothesis(s); setShowForm(true); }}
                  className="w-full text-left p-3.5 rounded-2xl glass-card hover:shadow-warm text-sm transition-all border border-border/30 flex items-start gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  {s}
                </motion.button>
              ))}
            </div>
          </div>

          {!showForm && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(true)}
              className="w-full py-3.5 rounded-2xl gradient-institute text-primary-foreground font-bold shadow-warm hover:shadow-glow transition-all flex items-center justify-center gap-2 mb-6"
            >
              <Plus className="w-4 h-4" /> Criar Nova Hipótese
            </motion.button>
          )}

          <AnimatePresence>
            {showForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="glass-card rounded-3xl p-6 mb-6 border border-border/30"
              >
                <h3 className="font-display font-bold mb-4 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-primary" /> Nova Hipótese
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block">SE... ENTÃO...</label>
                    <textarea value={hypothesis} onChange={e => setHypothesis(e.target.value)} placeholder="Se eu fizer X por Y dias, então Z vai acontecer..." rows={2}
                      className="w-full p-3.5 rounded-2xl border border-border/30 bg-background/50 text-sm resize-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Como vou medir?</label>
                    <input value={prediction} onChange={e => setPrediction(e.target.value)} placeholder="Ex: Escala de 1-10 de humor..."
                      className="w-full p-3.5 rounded-2xl border border-border/30 bg-background/50 text-sm focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreate} disabled={!hypothesis.trim()} className="flex-1 py-3 rounded-2xl gradient-institute text-primary-foreground font-bold disabled:opacity-50 shadow-warm">
                      🧪 Iniciar Experimento
                    </button>
                    <button onClick={() => setShowForm(false)} className="px-5 py-3 rounded-2xl glass-card text-sm font-medium border border-border/30">Cancelar</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {hypotheses.length > 0 && (
            <section>
              <h2 className="font-display font-bold text-lg mb-4">🧪 Meus Experimentos ({hypotheses.length})</h2>
              <div className="space-y-3">
                {hypotheses.map((h, i) => {
                  const sc = statusConfig[h.status];
                  return (
                    <motion.div key={h.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className={`glass-card rounded-2xl p-5 border ${h.status === "confirmed" ? "border-success/30" : h.status === "refuted" ? "border-destructive/20" : "border-border/30"}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${sc.css}`}>{sc.icon} {sc.label}</span>
                        <span className="text-xs text-muted-foreground">{h.createdAt}</span>
                      </div>
                      <p className="text-sm font-medium mb-1">{h.hypothesis}</p>
                      {h.prediction && <p className="text-xs text-muted-foreground mb-2">📏 Medição: {h.prediction}</p>}
                      {h.result && <div className="text-xs p-3 rounded-xl bg-muted/50 mb-2">📝 {h.result}</div>}

                      {h.status === "testing" && resultInput?.id !== h.id && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => setResultInput({ id: h.id, type: "confirmed" })} className="flex-1 py-2.5 rounded-xl bg-success/10 text-success text-xs font-bold hover:bg-success/20 transition-all">✅ Confirmada</button>
                          <button onClick={() => setResultInput({ id: h.id, type: "refuted" })} className="flex-1 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-all">❌ Refutada</button>
                        </div>
                      )}

                      <AnimatePresence>
                        {resultInput?.id === h.id && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3">
                            <textarea value={resultText} onChange={e => setResultText(e.target.value)}
                              placeholder={resultInput.type === "confirmed" ? "Descreva o resultado..." : "O que você aprendeu?"}
                              rows={2} className="w-full p-3 rounded-xl border border-border/30 bg-background/50 text-sm resize-none mb-2" />
                            <div className="flex gap-2">
                              <button onClick={() => updateStatus(h.id, resultInput.type, resultText)}
                                className={`flex-1 py-2 rounded-xl font-bold text-xs ${resultInput.type === "confirmed" ? "bg-success text-white" : "bg-destructive text-white"}`}
                              >Confirmar</button>
                              <button onClick={() => { setResultInput(null); setResultText(""); }} className="px-4 py-2 rounded-xl glass-card text-xs">Cancelar</button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
