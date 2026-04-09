import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, RotateCcw, TrendingUp, Sparkles } from "lucide-react";
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
  const [activeDim, setActiveDim] = useState<string | null>(null);

  const avg = Object.values(scores).reduce((a, b) => a + b, 0) / DIMENSIONS.length;
  const wellnessLevel = avg >= 8 ? "Excelente" : avg >= 6 ? "Bom" : avg >= 4 ? "Em desenvolvimento" : "Atenção";

  const handleSave = () => {
    trackActivity({ moduleId, activityType: "lifewheel", activityId: "wheel-assessment", data: { scores, average: avg } });
    setSaved(true);
  };
  const handleReset = () => { setScores(Object.fromEntries(DIMENSIONS.map(d => [d.id, 5]))); setSaved(false); };

  const size = 320;
  const center = size / 2;
  const maxR = 130;
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

  // Area calculation for visual feedback
  const idealArea = Math.PI * maxR * maxR;
  const currentPoints = DIMENSIONS.map((d, i) => getPoint(i, scores[d.id]));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-4xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative rounded-3xl p-8 mb-8 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-border/30 overflow-hidden">
            <div className="absolute inset-0 noise opacity-30 pointer-events-none" />
            <div className="relative text-center">
              <span className="text-6xl mb-3 block">🎯</span>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Roda da Vida — Bem-Estar</h1>
              <p className="text-muted-foreground text-sm">Avalie 8 dimensões baseadas na ciência da felicidade de Yale</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Radar Chart — premium */}
            <div className="glass-card rounded-3xl p-6 flex flex-col items-center border border-border/30">
              <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[320px]">
                <defs>
                  <radialGradient id="radarGradient">
                    <stop offset="0%" stopColor="hsl(25 95% 53%)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="hsl(25 95% 53%)" stopOpacity="0.05" />
                  </radialGradient>
                </defs>
                {[2, 4, 6, 8, 10].map(v => (
                  <circle key={v} cx={center} cy={center} r={(v / 10) * maxR} fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
                ))}
                {DIMENSIONS.map((d, i) => {
                  const p = getPoint(i, 10);
                  return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />;
                })}
                <motion.polygon
                  points={polygonPoints}
                  fill="url(#radarGradient)"
                  stroke="hsl(25 95% 53%)"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
                {DIMENSIONS.map((d, i) => {
                  const p = getPoint(i, scores[d.id]);
                  const isActive = activeDim === d.id;
                  return (
                    <motion.circle
                      key={d.id} cx={p.x} cy={p.y}
                      r={isActive ? 8 : 6}
                      fill={d.color} stroke="white" strokeWidth="2.5"
                      animate={{ r: isActive ? 8 : 6 }}
                      className="drop-shadow-lg"
                    />
                  );
                })}
                {DIMENSIONS.map((d, i) => {
                  const p = getPoint(i, 12.5);
                  return (
                    <text key={d.id} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="text-[10px] fill-foreground font-bold">
                      {d.icon}
                    </text>
                  );
                })}
              </svg>

              {/* Score indicator */}
              <div className="mt-4 text-center glass-card rounded-2xl p-4 w-full">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Média Geral</span>
                <motion.p
                  className="text-5xl font-display font-bold text-primary"
                  key={avg.toFixed(1)}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                >
                  {avg.toFixed(1)}
                </motion.p>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${avg >= 7 ? "bg-success/10 text-success" : avg >= 4 ? "bg-secondary/10 text-secondary-foreground" : "bg-destructive/10 text-destructive"}`}>
                  {wellnessLevel}
                </span>
              </div>
            </div>

            {/* Sliders — premium */}
            <div className="space-y-3">
              {DIMENSIONS.map((d) => (
                <motion.div
                  key={d.id}
                  className={`glass-card rounded-2xl p-4 border transition-all ${activeDim === d.id ? "border-primary/30 shadow-warm" : "border-border/30"}`}
                  onMouseEnter={() => setActiveDim(d.id)}
                  onMouseLeave={() => setActiveDim(null)}
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold flex items-center gap-2">
                      <span className="text-lg">{d.icon}</span> {d.label}
                    </span>
                    <motion.span
                      className="text-xl font-bold font-display"
                      style={{ color: d.color }}
                      key={scores[d.id]}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                    >
                      {scores[d.id]}
                    </motion.span>
                  </div>
                  <input
                    type="range" min="1" max="10"
                    value={scores[d.id]}
                    onChange={e => { setScores(prev => ({ ...prev, [d.id]: Number(e.target.value) })); setSaved(false); }}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">{d.tip}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-3 mt-8">
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleSave} disabled={saved}
              className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold transition-all ${saved ? "bg-success/20 text-success" : "gradient-institute text-primary-foreground shadow-warm hover:shadow-glow"}`}
            >
              {saved ? <><TrendingUp className="w-4 h-4" /> Salvo! +15 XP</> : <><Save className="w-4 h-4" /> Salvar Avaliação</>}
            </motion.button>
            <button onClick={handleReset} className="p-3.5 rounded-2xl glass-card hover:shadow-warm transition-all">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
