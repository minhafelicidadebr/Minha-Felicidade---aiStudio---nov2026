import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { simulatorScenarios } from "@/data/moduleContents";
import { modules } from "@/data/courseData";
import { ArrowRight, RotateCcw, Zap, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import Navbar from "@/components/Navbar";

const impactConfig = {
  positivo: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", border: "border-success" },
  neutro: { icon: MinusCircle, color: "text-secondary-foreground", bg: "bg-secondary/10", border: "border-secondary" },
  negativo: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive" },
};

export default function SimulatorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeModule = searchParams.get("module");
  const scenarios = useMemo(() => activeModule ? simulatorScenarios.filter(s => s.module === activeModule) : simulatorScenarios, [activeModule]);

  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [totalXp, setTotalXp] = useState(0);

  const scenario = scenarios[scenarioIdx];
  const availableModules = useMemo(() => [...new Set(simulatorScenarios.map(s => s.module))], []);

  if (!scenario) return (
    <div className="min-h-screen bg-background"><Navbar /><div className="container pt-24 text-center text-muted-foreground">Nenhum cenário disponível para este módulo.</div></div>
  );

  const handleSelect = (i: number) => { if (selected !== null) return; setSelected(i); setTotalXp((x) => x + scenario.options[i].xp); };
  const next = () => { setSelected(null); setScenarioIdx((i) => (i + 1) % scenarios.length); };
  const mod = modules.find(m => m.id === scenario.module);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-display font-bold">🎮 Simulador de Decisões</h1>
              <p className="text-muted-foreground mt-1">Cenários reais com consequências baseadas em evidências</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20">
              <Zap className="w-4 h-4 text-secondary" />
              <span className="font-bold text-sm">{totalXp} XP</span>
            </div>
          </div>

          {/* Module filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => { setSearchParams({}); setScenarioIdx(0); setSelected(null); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!activeModule ? "gradient-warm text-primary-foreground shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>Todos</button>
            {availableModules.map(mid => {
              const m = modules.find(mod => mod.id === mid);
              return m ? <button key={mid} onClick={() => { setSearchParams({ module: mid }); setScenarioIdx(0); setSelected(null); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeModule === mid ? "gradient-warm text-primary-foreground shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{m.icon} M{m.number}</button> : null;
            })}
          </div>

          <div className="text-xs text-muted-foreground mb-6">Cenário {scenarioIdx + 1} de {scenarios.length}</div>

          <AnimatePresence mode="wait">
            <motion.div key={scenario.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="bg-card rounded-2xl p-8 shadow-warm">
              {mod && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold mb-3">{mod.icon} Módulo {mod.number}</span>}
              <h2 className="text-xl font-display font-bold mb-3">{scenario.title}</h2>
              <p className="text-foreground/90 leading-relaxed mb-8 p-4 rounded-xl bg-muted/50">{scenario.context}</p>

              <div className="space-y-3 mb-6">
                {scenario.options.map((opt, i) => {
                  const isSelected = selected === i;
                  const cfg = impactConfig[opt.impact];
                  const Icon = cfg.icon;
                  return (
                    <button key={i} onClick={() => handleSelect(i)} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selected === null ? "border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer" : isSelected ? `${cfg.border} ${cfg.bg}` : "border-border opacity-40"}`}>
                      <p className="text-sm font-medium">{opt.text}</p>
                      {selected !== null && isSelected && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3">
                          <div className="flex items-start gap-2 mb-2"><Icon className={`w-4 h-4 ${cfg.color} mt-0.5 shrink-0`} /><p className="text-sm">{opt.consequence}</p></div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cfg.bg} ${cfg.color}`}>{opt.impact}</span>
                            <span className="text-xs font-bold text-secondary">+{opt.xp} XP</span>
                          </div>
                          {opt.evidence && <p className="text-xs text-muted-foreground mt-2">📎 {opt.evidence}</p>}
                        </motion.div>
                      )}
                    </button>
                  );
                })}
              </div>

              {selected !== null && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Todas as consequências:</h4>
                  <div className="space-y-2">
                    {scenario.options.map((opt, i) => {
                      if (i === selected) return null;
                      const cfg = impactConfig[opt.impact]; const Icon = cfg.icon;
                      return <div key={i} className={`p-3 rounded-lg ${cfg.bg} text-sm`}><p className="font-medium mb-1">{opt.text}</p><div className="flex items-start gap-2"><Icon className={`w-3.5 h-3.5 ${cfg.color} mt-0.5 shrink-0`} /><p className="text-xs">{opt.consequence}</p></div></div>;
                    })}
                  </div>
                </motion.div>
              )}

              {selected !== null && (
                <div className="flex justify-end gap-3">
                  <button onClick={() => setSelected(null)} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-muted text-sm font-medium"><RotateCcw className="w-4 h-4" /> Refazer</button>
                  <button onClick={next} className="flex items-center gap-2 px-5 py-3 rounded-xl gradient-warm text-primary-foreground font-semibold shadow-warm text-sm">Próximo cenário <ArrowRight className="w-4 h-4" /></button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
