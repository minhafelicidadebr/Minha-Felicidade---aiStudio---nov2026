import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, RotateCcw, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useProgress } from "@/hooks/useProgress";

const DIMENSIONS = [
  { id: "social", label: "Conexões Sociais", icon: "👥", color: "hsl(25 95% 53%)", tip: "Qualidade dos relacionamentos e senso de pertencimento" },
  { id: "gratitude", label: "Gratidão", icon: "🙏", color: "hsl(45 100% 51%)", tip: "Prática ativa de reconhecer o que é bom" },
  { id: "flow", label: "Flow & Propósito", icon: "⚡", color: "hsl(197 71% 40%)", tip: "Engajamento em atividades significativas" },
  { id: "body", label: "Corpo & Sono", icon: "🏃", color: "hsl(152 60% 45%)", tip: "Exercício regular e sono de qualidade" },
  { id: "kindness", label: "Atos de Bondade", icon: "💝", color: "hsl(340 80% 55%)", tip: "Generosidade e impacto positivo nos outros" },
  { id: "mindful", label: "Presença Mental", icon: "🧘", color: "hsl(270 60% 55%)", tip: "Capacidade de estar no momento presente" },
  { id: "time", label: "Abundância de Tempo", icon: "⏰", color: "hsl(200 70% 50%)", tip: "Sensação de ter tempo suficiente para o que importa" },
  { id: "growth", label: "Mentalidade de Crescimento", icon: "🌱", color: "hsl(120 50% 45%)", tip: "Abertura para aprender e evoluir com desafios" },
];

export default function LifeWheelPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const moduleId = searchParams.get("module") || "mentiras";
  const { trackActivity } = useProgress();
  const [scores, setScores] = useState<Record<string, number>>(Object.fromEntries(DIMENSIONS.map(d => [d.id, 5])));
  const [saved, setSaved] = useState(false);

  const avg = Object.values(scores).reduce((a, b) => a + b, 0) / DIMENSIONS.length;

  const handleSave = () => {
    trackActivity({ moduleId, activityType: "lifewheel", activityId: "wheel-assessment", data: { scores, average: avg } });
    setSaved(true);
  };

  const handleReset = () => {
    setScores(Object.fromEntries(DIMENSIONS.map(d => [d.id, 5])));
    setSaved(false);
  };

  // SVG radar chart
  const size = 300;
  const center = size / 2;
  const maxR = 120;
  const angleStep = (2 * Math.PI) / DIMENSIONS.length;

  const getPoint = (idx: number, value: number) => {
    const angle = angleStep * idx - Math.PI / 2;
    const r = (value / 10) * maxR;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const polygonPoints = DIMENSIONS.map((_, i) => {
    const p = getPoint(i, scores[DIMENSIONS[i].id]);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-4xl">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <header className="text-center mb-8">
            <span className="text-5xl mb-3 block">🎯</span>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Roda da Vida — Bem-Estar</h1>
            <p className="text-muted-foreground">Avalie 8 dimensões baseadas na ciência da felicidade de Yale</p>
          </header>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Radar Chart */}
            <div className="glass-card rounded-2xl p-6 flex flex-col items-center">
              <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[300px]">
                {/* Grid circles */}
                {[2, 4, 6, 8, 10].map(v => (
                  <circle key={v} cx={center} cy={center} r={(v / 10) * maxR} fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4 4" />
                ))}
                {/* Axis lines */}
                {DIMENSIONS.map((_, i) => {
                  const p = getPoint(i, 10);
                  return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="hsl(var(--border))" strokeWidth="0.5" />;
                })}
                {/* Data polygon */}
                <motion.polygon
                  points={polygonPoints}
                  fill="hsl(25 95% 53% / 0.2)"
                  stroke="hsl(25 95% 53%)"
                  strokeWidth="2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                />
                {/* Data points */}
                {DIMENSIONS.map((d, i) => {
                  const p = getPoint(i, scores[d.id]);
                  return <circle key={d.id} cx={p.x} cy={p.y} r="5" fill={d.color} stroke="white" strokeWidth="2" />;
                })}
                {/* Labels */}
                {DIMENSIONS.map((d, i) => {
                  const p = getPoint(i, 12);
                  return (
                    <text key={d.id} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="text-[8px] fill-foreground font-medium">
                      {d.icon}
                    </text>
                  );
                })}
              </svg>
              <div className="mt-4 text-center">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Média Geral</span>
                <p className="text-4xl font-display font-bold text-primary">{avg.toFixed(1)}</p>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4">
              {DIMENSIONS.map((d) => (
                <div key={d.id} className="glass-card rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold flex items-center gap-2">
                      <span>{d.icon}</span> {d.label}
                    </span>
                    <span className="text-lg font-bold font-display" style={{ color: d.color }}>{scores[d.id]}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={scores[d.id]}
                    onChange={e => {
                      setScores(prev => ({ ...prev, [d.id]: Number(e.target.value) }));
                      setSaved(false);
                    }}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{d.tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-3 mt-8">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saved}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${saved ? "bg-success/20 text-success" : "gradient-institute text-primary-foreground shadow-warm hover:shadow-glow"}`}
            >
              {saved ? <TrendingUp className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Salvo! +15 XP" : "Salvar Avaliação"}
            </motion.button>
            <button onClick={handleReset} className="p-3 rounded-xl glass-card hover:shadow-warm transition-all">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
