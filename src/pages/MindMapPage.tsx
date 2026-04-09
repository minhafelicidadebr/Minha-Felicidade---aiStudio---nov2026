import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { modules } from "@/data/courseData";

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

export default function MindMapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const moduleId = searchParams.get("module") || "mentiras";
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState<string[]>([]);

  const map = MIND_MAPS[moduleId] || MIND_MAPS.mentiras;
  const mod = modules.find(m => m.id === moduleId);
  const toggleBranch = (label: string) => setExpanded(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  const expandAll = () => setExpanded(expanded.length === map.branches.length ? [] : map.branches.map(b => b.label));

  const svgSize = 650;
  const cx = svgSize / 2;
  const cy = svgSize / 2;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-4xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative rounded-3xl p-8 mb-6 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-border/30 overflow-hidden">
            <div className="absolute inset-0 noise opacity-30 pointer-events-none" />
            <div className="relative text-center">
              <span className="text-6xl mb-3 block">🗺️</span>
              <h1 className="text-3xl font-display font-bold mb-1">Mapa Mental</h1>
              <p className="text-sm text-muted-foreground">{mod?.title || "Módulo"} — Novak & Cañas (2008)</p>
            </div>
          </div>

          {/* Module filter */}
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {modules.map(m => (
              <button key={m.id} onClick={() => { setSearchParams({ module: m.id }); setExpanded([]); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${m.id === moduleId ? "gradient-institute text-primary-foreground shadow-warm" : "glass-card hover:shadow-warm border border-border/30"}`}
              >
                {m.icon} {m.number}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-2 mb-4">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.15))} className="p-2 rounded-xl glass-card hover:shadow-warm border border-border/30"><ZoomOut className="w-4 h-4" /></button>
            <button onClick={() => setZoom(z => Math.min(1.5, z + 0.15))} className="p-2 rounded-xl glass-card hover:shadow-warm border border-border/30"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={expandAll} className="p-2 rounded-xl glass-card hover:shadow-warm border border-border/30"><Maximize2 className="w-4 h-4" /></button>
          </div>

          {/* Mind Map — premium */}
          <div className="glass-card rounded-3xl p-6 overflow-auto border border-border/30">
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.3s" }}>
              <svg viewBox={`0 0 ${svgSize} ${svgSize}`} className="w-full max-w-[650px] mx-auto">
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                {map.branches.map((branch, i) => {
                  const angle = (i / map.branches.length) * 2 * Math.PI - Math.PI / 2;
                  const bx = cx + 170 * Math.cos(angle);
                  const by = cy + 170 * Math.sin(angle);
                  return (
                    <g key={branch.label}>
                      <motion.path
                        d={`M ${cx} ${cy} Q ${(cx + bx) / 2 + 20} ${(cy + by) / 2 - 20} ${bx} ${by}`}
                        fill="none" stroke={branch.color} strokeWidth="2.5" strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.8, delay: i * 0.15 }}
                      />
                      {expanded.includes(branch.label) && branch.children.map((child, ci) => {
                        const childAngle = angle + ((ci - (branch.children.length - 1) / 2) * 0.35);
                        const childX = bx + 110 * Math.cos(childAngle);
                        const childY = by + 110 * Math.sin(childAngle);
                        return (
                          <motion.g key={child} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: ci * 0.08, type: "spring" }}>
                            <path d={`M ${bx} ${by} Q ${(bx + childX) / 2} ${(by + childY) / 2 - 10} ${childX} ${childY}`} fill="none" stroke={branch.color} strokeWidth="1" opacity="0.4" />
                            <rect x={childX - 50} y={childY - 14} width="100" height="28" rx="14" fill="hsl(var(--card))" stroke={branch.color} strokeWidth="1.5" className="drop-shadow-sm" />
                            <text x={childX} y={childY + 1} textAnchor="middle" dominantBaseline="middle" className="text-[9px] fill-foreground font-medium">{child}</text>
                          </motion.g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* Center node — premium */}
                <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}>
                  <circle cx={cx} cy={cy} r="52" fill="hsl(var(--primary))" opacity="0.08" filter="url(#glow)" />
                  <circle cx={cx} cy={cy} r="42" fill="hsl(var(--primary))" opacity="0.15" />
                  <circle cx={cx} cy={cy} r="34" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2.5" className="drop-shadow-lg" />
                  <text x={cx} y={cy - 3} textAnchor="middle" dominantBaseline="middle" className="text-[10px] fill-foreground font-bold">{map.center.split(" ").slice(0, 2).join(" ")}</text>
                  <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="middle" className="text-[9px] fill-muted-foreground">{map.center.split(" ").slice(2).join(" ")}</text>
                </motion.g>

                {/* Branch nodes — premium */}
                {map.branches.map((branch, i) => {
                  const angle = (i / map.branches.length) * 2 * Math.PI - Math.PI / 2;
                  const bx = cx + 170 * Math.cos(angle);
                  const by = cy + 170 * Math.sin(angle);
                  const isExpanded = expanded.includes(branch.label);
                  return (
                    <motion.g key={branch.label} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.1, type: "spring" }}
                      onClick={() => toggleBranch(branch.label)} className="cursor-pointer"
                    >
                      <circle cx={bx} cy={by} r="36" fill="hsl(var(--card))" stroke={branch.color} strokeWidth={isExpanded ? "3" : "2"} className="drop-shadow-md" />
                      {isExpanded && <circle cx={bx} cy={by} r="38" fill="none" stroke={branch.color} strokeWidth="1" opacity="0.3" />}
                      <text x={bx} y={by - 4} textAnchor="middle" dominantBaseline="middle" className="text-[9px] fill-foreground font-bold pointer-events-none">{branch.label}</text>
                      <text x={bx} y={by + 10} textAnchor="middle" className="text-[8px] fill-muted-foreground pointer-events-none">
                        {isExpanded ? "−" : `+${branch.children.length}`}
                      </text>
                    </motion.g>
                  );
                })}
              </svg>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">Clique nos nós para expandir • Teoria de Mapa Conceitual (Novak & Cañas, 2008)</p>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
