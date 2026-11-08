import { useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ZoomIn, ZoomOut, Maximize2, RotateCcw, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { modules } from "@/data/courseData";
import BackToVideoBanner from "@/components/learning/BackToVideoBanner";

const MIND_MAPS: Record<string, { center: string; branches: { label: string; children: string[]; color: string }[] }> = {
  mentiras: {
    center: "Mentiras da Felicidade",
    branches: [
      { label: "Miswanting", children: ["Desejos errados", "Previsão afetiva falha", "Ilusão de necessidade"], color: "hsl(25 95% 53%)" },
      { label: "Falácia G.I. Joe", children: ["Saber ≠ mudar", "Ação é essencial", "Hábito > conhecimento"], color: "hsl(45 100% 51%)" },
      { label: "Mitos Sociais", children: ["Dinheiro", "Status", "Corpo perfeito", "Notas"], color: "hsl(197 71% 40%)" },
      { label: "Motivação", children: ["Extrínseca vs Intrínseca", "Rendimentos decrescentes"], color: "hsl(152 60% 45%)" },
    ],
  },
  expectativas: {
    center: "Bug das Expectativas",
    branches: [
      { label: "Adaptação Hedônica", children: ["Baseline emocional", "Esteira hedônica", "Reajuste automático"], color: "hsl(25 95% 53%)" },
      { label: "Comparação Social", children: ["Medalha de prata", "Referências relativas", "Redes sociais"], color: "hsl(45 100% 51%)" },
      { label: "Impact Bias", children: ["Focalismo", "Negligência imune", "Superestimação"], color: "hsl(197 71% 40%)" },
      { label: "Features Irritantes", children: ["4 bugs da mente", "Ilusão de ótica emocional"], color: "hsl(152 60% 45%)" },
    ],
  },
  rewirements: {
    center: "6 Rewirements",
    branches: [
      { label: "Conexão Social", children: ["Amizades", "Interações com estranhos", "Pertencimento"], color: "hsl(25 95% 53%)" },
      { label: "Atos de Bondade", children: ["AOKs", "Helper's High", "Generosidade"], color: "hsl(45 100% 51%)" },
      { label: "Flow & Forças", children: ["Estado de flow", "Forças de caráter", "Propósito"], color: "hsl(197 71% 40%)" },
      { label: "Corpo & Tempo", children: ["Exercício", "Sono 7h+", "Time Affluence"], color: "hsl(152 60% 45%)" },
    ],
  },
  hacks: {
    center: "Hacks Cerebrais",
    branches: [
      { label: "Savoring", children: ["Saborear momentos", "Prolongar prazer", "Atenção plena"], color: "hsl(25 95% 53%)" },
      { label: "Mindfulness", children: ["Meditação", "Reduzir mind-wandering", "Foco no presente"], color: "hsl(45 100% 51%)" },
      { label: "Reset Referências", children: ["Visualização negativa", "Referências descendentes"], color: "hsl(197 71% 40%)" },
      { label: "Experiências", children: ["Vivências > objetos", "Investir em memórias"], color: "hsl(152 60% 45%)" },
    ],
  },
  habitos: {
    center: "Hábitos de Bem-Estar",
    branches: [
      { label: "WOOP", children: ["Wish", "Outcome", "Obstacle", "Plan"], color: "hsl(25 95% 53%)" },
      { label: "Implementation Intentions", children: ["Se X, então Y", "Automatizar ações"], color: "hsl(45 100% 51%)" },
      { label: "Growth Mindset", children: ["Esforço > talento", "Aprender com erros"], color: "hsl(197 71% 40%)" },
      { label: "Design de Ambiente", children: ["Pista → Rotina → Recompensa", "Situation modification"], color: "hsl(152 60% 45%)" },
    ],
  },
};

const MOTIVATIONAL = [
  "💡 Mapear conceitos fortalece sinapses — Ausubel (2000)",
  "🧠 Conexão visual acelera a memória de longo prazo",
  "✨ Cada nó expandido é uma nova conexão neural!",
  "🎯 Organize o conhecimento e domine o conteúdo",
];

export default function MindMapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const moduleId = searchParams.get("module") || "mentiras";
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  const map = MIND_MAPS[moduleId] || MIND_MAPS.mentiras;
  const mod = modules.find(m => m.id === moduleId);
  const toggleBranch = (label: string) => {
    setExpanded(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
    setSelectedBranch(label);
  };
  const expandAll = () => setExpanded(expanded.length === map.branches.length ? [] : map.branches.map(b => b.label));

  const svgW = 900;
  const svgH = 700;
  const cx = svgW / 2;
  const cy = svgH / 2;

  // Spread branches more — use specific quadrant positions instead of even radial
  const branchPositions = [
    { angle: -Math.PI * 0.75, radius: 200 }, // top-left
    { angle: -Math.PI * 0.25, radius: 200 }, // top-right
    { angle: Math.PI * 0.25, radius: 200 },  // bottom-right
    { angle: Math.PI * 0.75, radius: 200 },  // bottom-left
  ];

  const progressPercent = Math.round((expanded.length / map.branches.length) * 100);
  const motivationalIdx = expanded.length % MOTIVATIONAL.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <BackToVideoBanner />
      <div className="flex-1 container pt-24 pb-16 max-w-5xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="relative rounded-3xl p-8 mb-6 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-border/30 overflow-hidden">
            <div className="absolute inset-0 noise opacity-30 pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <span className="text-5xl mb-2 block">🗺️</span>
                <h1 className="text-3xl font-display font-bold mb-1">Mapa Mental Interativo</h1>
                <p className="text-sm text-muted-foreground">{mod?.title || "Módulo"} — Novak & Cañas (2008)</p>
              </div>
              {/* Progress ring */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                    <motion.circle
                      cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - progressPercent / 100) }}
                      transition={{ duration: 0.6, type: "spring" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">{progressPercent}%</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{expanded.length}/{map.branches.length} nós</span>
              </div>
            </div>
          </div>

          {/* Motivational bar */}
          <AnimatePresence mode="wait">
            <motion.div
              key={motivationalIdx}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-center py-2 px-4 rounded-xl bg-primary/5 border border-primary/10 mb-4"
            >
              <p className="text-xs font-medium text-primary">{MOTIVATIONAL[motivationalIdx]}</p>
            </motion.div>
          </AnimatePresence>

          {/* Module filter */}
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {modules.map(m => (
              <button key={m.id} onClick={() => { setSearchParams({ module: m.id }); setExpanded([]); setSelectedBranch(null); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${m.id === moduleId ? "gradient-institute text-primary-foreground shadow-warm" : "glass-card hover:shadow-warm border border-border/30"}`}
              >
                {m.icon} {m.number}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-2 mb-4">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.15))} className="p-2 rounded-xl glass-card hover:shadow-warm border border-border/30" title="Diminuir zoom"><ZoomOut className="w-4 h-4" /></button>
            <button onClick={() => setZoom(1)} className="p-2 rounded-xl glass-card hover:shadow-warm border border-border/30" title="Resetar zoom"><RotateCcw className="w-4 h-4" /></button>
            <button onClick={() => setZoom(z => Math.min(1.5, z + 0.15))} className="p-2 rounded-xl glass-card hover:shadow-warm border border-border/30" title="Aumentar zoom"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={expandAll} className="p-2 rounded-xl glass-card hover:shadow-warm border border-border/30" title="Expandir/Recolher tudo"><Maximize2 className="w-4 h-4" /></button>
          </div>

          {/* Mind Map SVG */}
          <div className="glass-card rounded-3xl p-4 sm:p-6 overflow-auto border border-border/30">
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.3s" }}>
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full mx-auto" style={{ maxWidth: 900 }}>
                <defs>
                  <filter id="glow"><feGaussianBlur stdDeviation="4" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                  <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" /></filter>
                  {map.branches.map((b, i) => (
                    <linearGradient key={`grad-${i}`} id={`branchGrad${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={b.color} stopOpacity="0.2" />
                      <stop offset="100%" stopColor={b.color} stopOpacity="0.05" />
                    </linearGradient>
                  ))}
                </defs>

                {/* Branch connections and nodes */}
                {map.branches.map((branch, i) => {
                  const pos = branchPositions[i] || { angle: (i / map.branches.length) * 2 * Math.PI - Math.PI / 2, radius: 200 };
                  const bx = cx + pos.radius * Math.cos(pos.angle);
                  const by = cy + pos.radius * Math.sin(pos.angle);
                  const isExpanded = expanded.includes(branch.label);
                  const isSelected = selectedBranch === branch.label;

                  // Children spread outward in a fan from the branch
                  const childRadius = 120;
                  const childSpread = 0.28; // radians between children

                  return (
                    <g key={branch.label}>
                      {/* Connection from center to branch */}
                      <motion.path
                        d={`M ${cx} ${cy} C ${cx + (bx - cx) * 0.4} ${cy + (by - cy) * 0.1}, ${cx + (bx - cx) * 0.6} ${by - (by - cy) * 0.1}, ${bx} ${by}`}
                        fill="none" stroke={branch.color} strokeWidth={isSelected ? "3.5" : "2.5"} strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: isSelected ? 1 : 0.7 }}
                        transition={{ duration: 0.8, delay: i * 0.15 }}
                      />

                      {/* Quadrant background zone */}
                      {isExpanded && (
                        <motion.circle
                          cx={bx} cy={by} r={childRadius + 30}
                          fill={`url(#branchGrad${i})`}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", damping: 15 }}
                        />
                      )}

                      {/* Children — spread radially outward from branch */}
                      {isExpanded && branch.children.map((child, ci) => {
                        const totalChildren = branch.children.length;
                        const startAngle = pos.angle - ((totalChildren - 1) * childSpread) / 2;
                        const childAngle = startAngle + ci * childSpread;
                        const childX = bx + childRadius * Math.cos(childAngle);
                        const childY = by + childRadius * Math.sin(childAngle);

                        // Clamp to SVG bounds
                        const clampedX = Math.max(70, Math.min(svgW - 70, childX));
                        const clampedY = Math.max(24, Math.min(svgH - 24, childY));

                        return (
                          <motion.g key={child} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: ci * 0.08, type: "spring", damping: 12 }}>
                            <path
                              d={`M ${bx} ${by} Q ${(bx + clampedX) / 2 + (ci % 2 === 0 ? 8 : -8)} ${(by + clampedY) / 2 + (ci % 2 === 0 ? -8 : 8)} ${clampedX} ${clampedY}`}
                              fill="none" stroke={branch.color} strokeWidth="1.5" opacity="0.5" strokeDasharray="4 2"
                            />
                            {/* Pill-shaped child node */}
                            <rect
                              x={clampedX - 55} y={clampedY - 16} width="110" height="32" rx="16"
                              fill="hsl(var(--card))" stroke={branch.color} strokeWidth="1.5" filter="url(#shadow)"
                            />
                            <text x={clampedX} y={clampedY + 1} textAnchor="middle" dominantBaseline="middle"
                              className="fill-foreground font-medium" style={{ fontSize: "10px" }}
                            >{child}</text>
                          </motion.g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* Center node */}
                <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}>
                  <circle cx={cx} cy={cy} r="58" fill="hsl(var(--primary))" opacity="0.06" filter="url(#glow)" />
                  <circle cx={cx} cy={cy} r="48" fill="hsl(var(--primary))" opacity="0.12" />
                  <circle cx={cx} cy={cy} r="40" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="3" filter="url(#shadow)" />
                  <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle" className="fill-foreground font-bold" style={{ fontSize: "11px" }}>
                    {map.center.split(" ").slice(0, 2).join(" ")}
                  </text>
                  <text x={cx} y={cy + 9} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground" style={{ fontSize: "10px" }}>
                    {map.center.split(" ").slice(2).join(" ")}
                  </text>
                </motion.g>

                {/* Branch nodes (on top) */}
                {map.branches.map((branch, i) => {
                  const pos = branchPositions[i] || { angle: (i / map.branches.length) * 2 * Math.PI - Math.PI / 2, radius: 200 };
                  const bx = cx + pos.radius * Math.cos(pos.angle);
                  const by = cy + pos.radius * Math.sin(pos.angle);
                  const isExpanded = expanded.includes(branch.label);
                  const isSelected = selectedBranch === branch.label;

                  return (
                    <motion.g
                      key={`node-${branch.label}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.1, type: "spring" }}
                      onClick={() => toggleBranch(branch.label)}
                      className="cursor-pointer"
                    >
                      {/* Glow ring on select */}
                      {isSelected && (
                        <motion.circle
                          cx={bx} cy={by} r="46"
                          fill="none" stroke={branch.color} strokeWidth="1.5" opacity="0.4"
                          animate={{ r: [44, 48, 44] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                      <circle cx={bx} cy={by} r="40" fill="hsl(var(--card))" stroke={branch.color}
                        strokeWidth={isExpanded ? "3.5" : "2"} filter="url(#shadow)"
                      />
                      {/* Label — multiline for long labels */}
                      {branch.label.length > 12 ? (
                        <>
                          <text x={bx} y={by - 8} textAnchor="middle" dominantBaseline="middle" className="fill-foreground font-bold pointer-events-none" style={{ fontSize: "9px" }}>
                            {branch.label.split(" ").slice(0, Math.ceil(branch.label.split(" ").length / 2)).join(" ")}
                          </text>
                          <text x={bx} y={by + 4} textAnchor="middle" dominantBaseline="middle" className="fill-foreground font-bold pointer-events-none" style={{ fontSize: "9px" }}>
                            {branch.label.split(" ").slice(Math.ceil(branch.label.split(" ").length / 2)).join(" ")}
                          </text>
                        </>
                      ) : (
                        <text x={bx} y={by - 4} textAnchor="middle" dominantBaseline="middle" className="fill-foreground font-bold pointer-events-none" style={{ fontSize: "10px" }}>
                          {branch.label}
                        </text>
                      )}
                      <text x={bx} y={by + (branch.label.length > 12 ? 16 : 12)} textAnchor="middle" className="fill-muted-foreground pointer-events-none" style={{ fontSize: "9px" }}>
                        {isExpanded ? "−" : `+${branch.children.length}`}
                      </text>
                    </motion.g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Selected branch detail card */}
          <AnimatePresence>
            {selectedBranch && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-4 glass-card rounded-2xl p-5 border border-border/30"
              >
                {(() => {
                  const b = map.branches.find(br => br.label === selectedBranch);
                  if (!b) return null;
                  return (
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: b.color }} />
                        <h3 className="font-display font-bold text-lg">{b.label}</h3>
                        <span className="text-xs text-muted-foreground ml-auto">{b.children.length} conceitos</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {b.children.map((child, ci) => (
                          <motion.span
                            key={child}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: ci * 0.05 }}
                            className="px-3 py-1.5 rounded-full text-xs font-medium border"
                            style={{ borderColor: b.color, backgroundColor: `${b.color}15` }}
                          >
                            {child}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-center gap-2 mt-4">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs text-muted-foreground">Clique nos nós para expandir • Teoria de Mapa Conceitual (Novak & Cañas, 2008)</p>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
