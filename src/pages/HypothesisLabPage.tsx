import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, FlaskConical, CheckCircle2, XCircle, Clock, Lightbulb } from "lucide-react";
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
  id: string;
  hypothesis: string;
  module: string;
  prediction: string;
  status: "testing" | "confirmed" | "refuted";
  result?: string;
  createdAt: string;
}

export default function HypothesisLabPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const moduleId = searchParams.get("module") || "mentiras";
  const { trackActivity } = useProgress();

  const [hypotheses, setHypotheses] = useState<Hypothesis[]>(() => {
    const s = localStorage.getItem("hypothesis-lab");
    return s ? JSON.parse(s) : [];
  });
  const [showForm, setShowForm] = useState(false);
  const [hypothesis, setHypothesis] = useState("");
  const [prediction, setPrediction] = useState("");

  useEffect(() => { localStorage.setItem("hypothesis-lab", JSON.stringify(hypotheses)); }, [hypotheses]);

  const handleCreate = () => {
    if (!hypothesis.trim()) return;
    const h: Hypothesis = {
      id: `h-${Date.now()}`, hypothesis: hypothesis.trim(), module: moduleId,
      prediction: prediction.trim(), status: "testing", createdAt: new Date().toISOString().split("T")[0],
    };
    setHypotheses(prev => [h, ...prev]);
    trackActivity({ moduleId, activityType: "hypothesis", activityId: h.id, data: { hypothesis: h.hypothesis } });
    setHypothesis("");
    setPrediction("");
    setShowForm(false);
  };

  const updateStatus = (id: string, status: "confirmed" | "refuted", result: string) => {
    setHypotheses(prev => prev.map(h => h.id === id ? { ...h, status, result } : h));
  };

  const suggestions = SUGGESTED_HYPOTHESES[moduleId] || SUGGESTED_HYPOTHESES.mentiras;
  const mod = modules.find(m => m.id === moduleId);

  const statusConfig = {
    testing: { icon: <Clock className="w-4 h-4" />, label: "Em teste", css: "bg-secondary/20 text-secondary-foreground" },
    confirmed: { icon: <CheckCircle2 className="w-4 h-4" />, label: "Confirmada", css: "bg-success/20 text-success" },
    refuted: { icon: <XCircle className="w-4 h-4" />, label: "Refutada", css: "bg-destructive/10 text-destructive" },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-2xl">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <header className="text-center mb-8">
            <span className="text-5xl mb-3 block">🔬</span>
            <h1 className="text-3xl font-display font-bold mb-2">Laboratório de Hipóteses</h1>
            <p className="text-muted-foreground">{mod?.title} — Método Científico Pessoal (Popper, 1959)</p>
          </header>

          {/* Suggestions */}
          <div className="glass-card rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-secondary" />
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">Sugestões de Hipóteses</span>
            </div>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setHypothesis(s); setShowForm(true); }}
                  className="w-full text-left p-3 rounded-xl glass-card hover:shadow-warm text-sm transition-all"
                >
                  💡 {s}
                </button>
              ))}
            </div>
          </div>

          {/* Create Button */}
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="w-full py-3 rounded-xl gradient-institute text-primary-foreground font-bold shadow-warm hover:shadow-glow transition-shadow flex items-center justify-center gap-2 mb-6">
              <Plus className="w-4 h-4" /> Criar Nova Hipótese
            </button>
          )}

          {/* Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="glass-card rounded-2xl p-5 mb-6">
                <h3 className="font-display font-bold mb-3 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-primary" /> Nova Hipótese
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">SE... ENTÃO...</label>
                    <textarea value={hypothesis} onChange={e => setHypothesis(e.target.value)} placeholder="Se eu fizer X por Y dias, então Z vai acontecer..." rows={2} className="w-full p-3 rounded-xl border border-border/50 bg-background/50 text-sm resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Minha previsão (como vou medir?)</label>
                    <input value={prediction} onChange={e => setPrediction(e.target.value)} placeholder="Ex: Escala de 1-10 de humor, número de vezes..." className="w-full p-3 rounded-xl border border-border/50 bg-background/50 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreate} disabled={!hypothesis.trim()} className="flex-1 py-2.5 rounded-xl gradient-institute text-primary-foreground font-bold disabled:opacity-50">
                      🧪 Iniciar Experimento
                    </button>
                    <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl glass-card text-sm font-medium">Cancelar</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hypotheses List */}
          {hypotheses.length > 0 && (
            <section>
              <h2 className="font-display font-bold text-lg mb-3">🧪 Meus Experimentos ({hypotheses.length})</h2>
              <div className="space-y-3">
                {hypotheses.map((h, i) => {
                  const sc = statusConfig[h.status];
                  return (
                    <motion.div key={h.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="glass-card rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${sc.css}`}>
                          {sc.icon} {sc.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{h.createdAt}</span>
                      </div>
                      <p className="text-sm font-medium mb-1">{h.hypothesis}</p>
                      {h.prediction && <p className="text-xs text-muted-foreground mb-2">📏 Medição: {h.prediction}</p>}
                      {h.result && <p className="text-xs p-2 rounded-lg bg-muted/50">📝 {h.result}</p>}
                      {h.status === "testing" && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => { const r = prompt("Descreva o resultado:"); if (r) updateStatus(h.id, "confirmed", r); }} className="flex-1 py-2 rounded-lg bg-success/10 text-success text-xs font-bold hover:bg-success/20 transition-colors">
                            ✅ Confirmada
                          </button>
                          <button onClick={() => { const r = prompt("O que você aprendeu?"); if (r) updateStatus(h.id, "refuted", r); }} className="flex-1 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-colors">
                            ❌ Refutada
                          </button>
                        </div>
                      )}
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
