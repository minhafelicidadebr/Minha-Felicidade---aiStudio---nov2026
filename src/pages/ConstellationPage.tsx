/**
 * Constelação de Conexões — State-of-the-Art Knowledge Graph
 * Visualização interativa do conhecimento como mapa estelar conectado.
 * Ciência da aprendizagem: schema-building, semantic networks, dual coding,
 * elaborative encoding e generation effect.
 */
import { useEffect, useMemo, useRef, useState, MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Network, Lightbulb, BookOpen, Target } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { NeuralBackground, useXPBurst, EncouragementBubble, AchievementToast } from "@/components/learning/LearningFX";
import { InsightDialog } from "@/components/learning/InsightDialog";
import { useProgress } from "@/hooks/useProgress";

/* ============= Knowledge Graph: Concepts × Modules × Edges ============= */
type Node = {
  id: string;
  label: string;
  module: 1 | 2 | 3 | 4 | 5;
  type: "concept" | "scientist" | "practice";
  short: string;
  evidence: string;
  insight: string;
};

type Edge = { from: string; to: string; relation: string };

const NODES: Node[] = [
  // M1 — Mentiras
  { id: "miswanting", label: "Miswanting", module: 1, type: "concept", short: "Desejamos errado o que não nos fará felizes.", evidence: "Wilson & Gilbert (2003)", insight: "Seu GPS emocional aponta para destinos errados." },
  { id: "gijoe", label: "Falácia G.I. Joe", module: 1, type: "concept", short: "Saber não é metade da batalha.", evidence: "Santos (Yale, 2018)", insight: "Conhecimento ≠ comportamento. Prática > teoria." },
  { id: "kahneman", label: "Kahneman & Deaton", module: 1, type: "scientist", short: "Bem-estar emocional estagna acima de ~US$75k.", evidence: "PNAS, 2010", insight: "Dinheiro compra estabilidade, não alegria." },
  // M2 — Expectativas
  { id: "adaptacao", label: "Adaptação Hedônica", module: 2, type: "concept", short: "Voltamos ao baseline emocional.", evidence: "Brickman & Campbell (1971)", insight: "A novidade vira norma. Por isso savoring importa." },
  { id: "impactbias", label: "Impact Bias", module: 2, type: "concept", short: "Superestimamos intensidade e duração emocional.", evidence: "Gilbert et al. (1998)", insight: "Tragédias e triunfos duram menos do que pensamos." },
  { id: "comparacao", label: "Comparação Social", module: 2, type: "concept", short: "Pontos de referência distorcem prazer.", evidence: "Medvec, Madey & Gilovich (1995)", insight: "Bronze > Prata: a referência é o que importa." },
  // M3 — Rewirements
  { id: "conexao", label: "Conexão Social", module: 3, type: "practice", short: "O preditor #1 de bem-estar.", evidence: "Diener & Seligman (2002)", insight: "Pessoas felizes têm relações profundas. Ponto." },
  { id: "bondade", label: "Atos de Bondade", module: 3, type: "practice", short: "Gastar com outros aumenta felicidade.", evidence: "Dunn et al., Science (2008)", insight: "Dar > receber. Cientificamente comprovado." },
  { id: "gratidao", label: "Gratidão", module: 3, type: "practice", short: "Diários de gratidão elevam bem-estar.", evidence: "Davis et al. (2016)", insight: "3 coisas/dia. Por 21 dias. Mensurável." },
  { id: "flow", label: "Flow", module: 3, type: "practice", short: "Engajamento total + forças de caráter.", evidence: "Csikszentmihalyi (1990)", insight: "Quando o tempo desaparece, você está vivo." },
  // M4 — Hacks
  { id: "savoring", label: "Savoring", module: 4, type: "practice", short: "Apreciar conscientemente o positivo.", evidence: "Bryant & Veroff (2007)", insight: "Antídoto direto à adaptação hedônica." },
  { id: "negviz", label: "Visualização Negativa", module: 4, type: "practice", short: "Imaginar perda restaura valor.", evidence: "Estoicismo + Koo et al. (2008)", insight: "Imaginar não ter te faz amar o que tem." },
  { id: "mindful", label: "Mindfulness", module: 4, type: "practice", short: "Mente divaga 47% do tempo — e isso reduz felicidade.", evidence: "Killingsworth & Gilbert, Science (2010)", insight: "Estar presente = estar mais feliz." },
  // M5 — Hábitos
  { id: "woop", label: "WOOP", module: 5, type: "practice", short: "Wish → Outcome → Obstacle → Plan.", evidence: "Oettingen (2014)", insight: "Mais eficaz que pensamento positivo simples." },
  { id: "ifthen", label: "Implementation Intentions", module: 5, type: "practice", short: "Se X, então Y. Dobra taxa de sucesso.", evidence: "Gollwitzer (1999)", insight: "O cérebro adora gatilhos pré-decididos." },
  { id: "growth", label: "Growth Mindset", module: 5, type: "concept", short: "Esforço > talento. Cérebro plástico.", evidence: "Dweck (2006)", insight: "Suas crenças sobre você mudam você." },
];

const EDGES: Edge[] = [
  { from: "miswanting", to: "impactbias", relation: "Miswanting é alimentado pelo Impact Bias" },
  { from: "miswanting", to: "kahneman", relation: "Dados empíricos confirmam o miswanting do dinheiro" },
  { from: "gijoe", to: "ifthen", relation: "Implementation Intentions vencem a Falácia G.I. Joe" },
  { from: "adaptacao", to: "savoring", relation: "Savoring é o antídoto direto à adaptação" },
  { from: "adaptacao", to: "negviz", relation: "Visualização negativa reseta o baseline" },
  { from: "comparacao", to: "gratidao", relation: "Gratidão neutraliza comparação social" },
  { from: "impactbias", to: "savoring", relation: "Savoring corrige o impact bias positivo" },
  { from: "conexao", to: "bondade", relation: "Bondade fortalece conexão social" },
  { from: "conexao", to: "flow", relation: "Flow social amplia ambos" },
  { from: "gratidao", to: "savoring", relation: "Gratidão é uma forma de savoring" },
  { from: "mindful", to: "savoring", relation: "Mindfulness habilita o savoring" },
  { from: "woop", to: "ifthen", relation: "WOOP usa Implementation Intentions" },
  { from: "growth", to: "woop", relation: "Growth mindset sustenta o WOOP" },
  { from: "kahneman", to: "comparacao", relation: "Renda alta gera comparação ascendente" },
  { from: "flow", to: "growth", relation: "Flow desenvolve growth mindset" },
  { from: "bondade", to: "gratidao", relation: "Bondade gera gratidão recíproca" },
];

/* ============= Polar layout: 5 module clusters around the sun ============= */
const W = 1100, H = 720, CX = W / 2, CY = H / 2;
const moduleAngles: Record<number, number> = { 1: -Math.PI / 2, 2: -Math.PI / 2 + (2 * Math.PI) / 5, 3: -Math.PI / 2 + (4 * Math.PI) / 5, 4: -Math.PI / 2 + (6 * Math.PI) / 5, 5: -Math.PI / 2 + (8 * Math.PI) / 5 };
const moduleColor: Record<number, string> = { 1: "hsl(15 90% 60%)", 2: "hsl(220 70% 60%)", 3: "hsl(45 95% 55%)", 4: "hsl(280 70% 65%)", 5: "hsl(160 65% 50%)" };
const moduleName: Record<number, string> = { 1: "Mentiras", 2: "Expectativas", 3: "Rewirements", 4: "Hacks", 5: "Hábitos" };

function layoutNodes() {
  const grouped: Record<number, Node[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  NODES.forEach(n => grouped[n.module].push(n));
  const positions: Record<string, { x: number; y: number }> = {};
  Object.entries(grouped).forEach(([mod, nodes]) => {
    const center = moduleAngles[+mod];
    const R = 250;
    nodes.forEach((n, i) => {
      const spread = (Math.PI * 2) / 5 * 0.85;
      const a = center - spread / 2 + (spread * i) / Math.max(nodes.length - 1, 1);
      const r = R + (i % 2 === 0 ? 0 : 55);
      positions[n.id] = { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r };
    });
  });
  return positions;
}

export default function ConstellationPage() {
  const positions = useMemo(layoutNodes, []);
  const [selected, setSelected] = useState<Node | null>(null);
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());
  const [hoveredEdge, setHoveredEdge] = useState<Edge | null>(null);
  const [encouragementTrigger, setEncouragementTrigger] = useState(0);
  const [achievement, setAchievement] = useState<{ title: string; desc: string } | null>(null);
  const [reflection, setReflection] = useState("");
  const [submittedReflections, setSubmittedReflections] = useState<string[]>([]);
  const { trigger: burstXP, node: xpNode } = useXPBurst();
  const { trackActivity } = useProgress();
  const svgRef = useRef<SVGSVGElement>(null);

  const handleNodeClick = (n: Node, e: MouseEvent) => {
    setSelected(n);
    if (!discovered.has(n.id)) {
      const next = new Set(discovered).add(n.id);
      setDiscovered(next);
      burstXP(15, e);
      setEncouragementTrigger(t => t + 1);
      // Milestones
      if (next.size === 5) setAchievement({ title: "Explorador Iniciante", desc: "5 conceitos descobertos!" });
      if (next.size === 10) setAchievement({ title: "Cartógrafo Cognitivo", desc: "10 conexões reveladas!" });
      if (next.size === NODES.length) {
        setAchievement({ title: "Mestre da Constelação", desc: "Mapa completo! +200 XP" });
        trackActivity({ moduleId: "all", activityType: "simulator", activityId: "constellation-complete", score: 100 });
      }
    }
  };

  const submitReflection = () => {
    if (reflection.trim().length < 20) return;
    setSubmittedReflections(s => [...s, reflection]);
    setReflection("");
    burstXP(25, { clientX: window.innerWidth / 2, clientY: 200 });
    setEncouragementTrigger(t => t + 1);
    trackActivity({ moduleId: selected?.module ? `m${selected.module}` : "all", activityType: "evidence", activityId: `reflect-${selected?.id}`, data: { reflection } });
  };

  const connectedEdges = (id: string) => EDGES.filter(e => e.from === id || e.to === id);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <NeuralBackground />
      <Navbar />
      {xpNode}
      <EncouragementBubble trigger={encouragementTrigger} />
      <AchievementToast
        show={!!achievement}
        title={achievement?.title || ""}
        description={achievement?.desc || ""}
        onClose={() => setAchievement(null)}
      />

      <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Dashboard</Button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-primary/30 mb-4">
            <Network className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold tracking-wider uppercase">Estado da Arte • Schema Building</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-black mb-3">
            <span className="holographic">Constelação de Conexões</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Cada conceito é uma estrela. Cada linha, uma conexão científica real.
            Explore o mapa do conhecimento e descubra como tudo se entrelaça.
          </p>

          {/* Progress */}
          <div className="mt-6 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-card/60 backdrop-blur border border-border">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{discovered.size}</span>
            <span className="text-xs text-muted-foreground">/ {NODES.length} conceitos descobertos</span>
            <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full gradient-institute transition-all duration-700"
                style={{ width: `${(discovered.size / NODES.length) * 100}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Constellation Map */}
        <div className="relative rounded-3xl overflow-hidden border border-border bg-gradient-to-br from-card/40 to-card/10 backdrop-blur-sm shadow-premium">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            style={{ maxHeight: "70vh" }}
          >
            <defs>
              <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </radialGradient>
              <filter id="node-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {Object.entries(moduleColor).map(([m, c]) => (
                <radialGradient key={m} id={`grad-${m}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={c} stopOpacity="1" />
                  <stop offset="100%" stopColor={c} stopOpacity="0.4" />
                </radialGradient>
              ))}
            </defs>

            {/* Background stars */}
            {Array.from({ length: 80 }).map((_, i) => (
              <circle
                key={i}
                cx={Math.random() * W}
                cy={Math.random() * H}
                r={Math.random() * 1.2 + 0.3}
                fill="hsl(var(--foreground))"
                opacity={Math.random() * 0.5 + 0.1}
              >
                <animate attributeName="opacity" values="0.1;0.6;0.1" dur={`${2 + Math.random() * 4}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* Central sun */}
            <circle cx={CX} cy={CY} r="60" fill="url(#sun-glow)" />
            <circle cx={CX} cy={CY} r="22" fill="hsl(var(--primary))" filter="url(#node-glow)">
              <animate attributeName="r" values="22;26;22" dur="3s" repeatCount="indefinite" />
            </circle>
            <text x={CX} y={CY + 5} textAnchor="middle" className="fill-primary-foreground font-bold text-sm" pointerEvents="none">
              BEM-ESTAR
            </text>

            {/* Edges */}
            {EDGES.map((e, i) => {
              const a = positions[e.from];
              const b = positions[e.to];
              if (!a || !b) return null;
              const isActive = hoveredEdge === e || (selected && (e.from === selected.id || e.to === selected.id));
              const bothDiscovered = discovered.has(e.from) && discovered.has(e.to);
              return (
                <line
                  key={i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={isActive ? "hsl(var(--primary))" : bothDiscovered ? "hsl(var(--primary) / 0.45)" : "hsl(var(--muted-foreground) / 0.15)"}
                  strokeWidth={isActive ? 2.5 : bothDiscovered ? 1.5 : 0.8}
                  strokeDasharray={bothDiscovered ? "0" : "4 4"}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredEdge(e)}
                  onMouseLeave={() => setHoveredEdge(null)}
                  style={{ filter: isActive ? "drop-shadow(0 0 6px hsl(var(--primary)))" : "none" }}
                />
              );
            })}

            {/* Module labels */}
            {[1, 2, 3, 4, 5].map(m => {
              const a = moduleAngles[m];
              const r = 380;
              const x = CX + Math.cos(a) * r;
              const y = CY + Math.sin(a) * r;
              return (
                <g key={m}>
                  <text x={x} y={y} textAnchor="middle" className="fill-foreground/60 font-display text-xs uppercase tracking-widest font-bold">
                    M{m} · {moduleName[m]}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {NODES.map(n => {
              const p = positions[n.id];
              const isDiscovered = discovered.has(n.id);
              const isSelected = selected?.id === n.id;
              const isConnected = selected && connectedEdges(selected.id).some(e => e.from === n.id || e.to === n.id);
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x}, ${p.y})`}
                  className="cursor-pointer group"
                  onClick={(e) => handleNodeClick(n, e as any)}
                >
                  {(isSelected || isConnected) && (
                    <circle r="32" fill={moduleColor[n.module]} opacity="0.15">
                      <animate attributeName="r" values="28;38;28" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    r={isSelected ? 18 : isDiscovered ? 14 : 10}
                    fill={isDiscovered ? `url(#grad-${n.module})` : "hsl(var(--muted))"}
                    stroke={moduleColor[n.module]}
                    strokeWidth={isSelected ? 3 : isDiscovered ? 2 : 1}
                    filter={isDiscovered ? "url(#node-glow)" : "none"}
                    className="transition-all group-hover:opacity-90"
                  />
                  {!isDiscovered && (
                    <text textAnchor="middle" y="4" className="fill-muted-foreground text-[10px] font-bold" pointerEvents="none">?</text>
                  )}
                  <text
                    textAnchor="middle"
                    y={isSelected ? 36 : 28}
                    className={`font-semibold text-[11px] pointer-events-none transition-all ${isDiscovered ? "fill-foreground" : "fill-muted-foreground"}`}
                  >
                    {isDiscovered ? n.label : "???"}
                  </text>
                </g>
              );
            })}

            {/* Edge tooltip */}
            {hoveredEdge && positions[hoveredEdge.from] && positions[hoveredEdge.to] && (
              <g pointerEvents="none">
                <rect
                  x={(positions[hoveredEdge.from].x + positions[hoveredEdge.to].x) / 2 - 140}
                  y={(positions[hoveredEdge.from].y + positions[hoveredEdge.to].y) / 2 - 22}
                  width="280" height="32" rx="8"
                  fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="1"
                  opacity="0.95"
                />
                <text
                  x={(positions[hoveredEdge.from].x + positions[hoveredEdge.to].x) / 2}
                  y={(positions[hoveredEdge.from].y + positions[hoveredEdge.to].y) / 2 - 2}
                  textAnchor="middle"
                  className="fill-foreground text-[11px] font-medium"
                >
                  {hoveredEdge.relation}
                </text>
              </g>
            )}
          </svg>

          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 max-w-md">
            {[1, 2, 3, 4, 5].map(m => (
              <div key={m} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 backdrop-blur border border-border text-[10px]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: moduleColor[m] }} />
                <span className="font-semibold">{moduleName[m]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="mt-8 grid md:grid-cols-3 gap-6"
            >
              {/* Concept card */}
              <div className="md:col-span-2 p-6 rounded-2xl glass border border-border shadow-premium">
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 glow-pulse"
                    style={{ background: moduleColor[selected.module] }}
                  >
                    {selected.type === "concept" ? "💡" : selected.type === "scientist" ? "🔬" : "✨"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">
                      Módulo {selected.module} · {selected.type === "concept" ? "Conceito" : selected.type === "scientist" ? "Evidência" : "Prática"}
                    </p>
                    <h3 className="font-display text-2xl font-bold">{selected.label}</h3>
                  </div>
                </div>
                <p className="text-base mb-3">{selected.short}</p>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 mb-3">
                  <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm italic">{selected.insight}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BookOpen className="w-3 h-3" />
                  <span>Evidência: <strong>{selected.evidence}</strong></span>
                </div>

                {/* Connections list */}
                <div className="mt-5 pt-5 border-t border-border">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Conexões neurais</p>
                  <div className="space-y-1.5">
                    {connectedEdges(selected.id).map((e, i) => {
                      const otherId = e.from === selected.id ? e.to : e.from;
                      const other = NODES.find(n => n.id === otherId);
                      if (!other) return null;
                      return (
                        <button
                          key={i}
                          onClick={(ev) => handleNodeClick(other, ev as any)}
                          className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: moduleColor[other.module] }} />
                          <span className="text-sm font-semibold">{other.label}</span>
                          <span className="text-xs text-muted-foreground flex-1">— {e.relation}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Reflection / Generation Effect */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-primary" />
                  <h4 className="font-display font-bold">Efeito de Geração</h4>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  A ciência mostra: explicar com suas palavras consolida 2x mais. Como você aplicaria <strong>{selected.label}</strong> na sua semana?
                </p>
                <textarea
                  value={reflection}
                  onChange={e => setReflection(e.target.value)}
                  placeholder="Em pelo menos 20 caracteres..."
                  className="w-full h-28 p-3 text-sm rounded-xl bg-background/60 border border-border focus:border-primary outline-none resize-none"
                />
                <Button
                  onClick={submitReflection}
                  disabled={reflection.trim().length < 20}
                  className="w-full mt-3 gradient-institute"
                  size="sm"
                >
                  Consolidar (+25 XP)
                </Button>
                {submittedReflections.length > 0 && (
                  <p className="text-xs text-primary mt-3 text-center">
                    ✨ {submittedReflections.length} reflexão(ões) registrada(s)
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!selected && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-muted-foreground mt-8 text-sm"
          >
            👆 Clique em uma estrela para revelar o conceito e suas conexões
          </motion.p>
        )}
      </div>
    </div>
  );
}
