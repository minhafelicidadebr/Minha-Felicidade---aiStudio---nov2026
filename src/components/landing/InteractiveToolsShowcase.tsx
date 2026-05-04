import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Brain, Heart, Gamepad2, X } from "lucide-react";
import { NeuralBackground, SpotlightCard, BrainPulse, MilestoneTracker } from "@/components/learning/LearningFX";

const tools = [
  {
    id: "breathing", icon: "🧘", name: "Respiração Consciente", route: "/breathing",
    desc: "3 técnicas com animação de círculo respiratório",
    science: "Ma et al. (2017) — reduz cortisol em 23%",
    xp: "+5/ciclo", color: "from-blue-500/15 to-indigo-500/15",
    preview: "Timer respiratório com partículas orbitais, fases animadas e tracking de ciclos",
    category: "corpo",
  },
  {
    id: "lifewheel", icon: "🎯", name: "Roda da Vida", route: "/lifewheel",
    desc: "8 dimensões de bem-estar com radar SVG",
    science: "8 drivers científicos de felicidade",
    xp: "+15 XP", color: "from-orange-500/15 to-amber-500/15",
    preview: "Gráfico radar interativo com sliders por dimensão e média calculada em tempo real",
    category: "avaliacao",
  },
  {
    id: "gratitude", icon: "📝", name: "Diário de Gratidão", route: "/gratitude",
    desc: "Journaling com prompts, mood e streaks",
    science: "Emmons & McCullough (2003) — +25% bem-estar",
    xp: "+10 XP", color: "from-pink-500/15 to-rose-500/15",
    preview: "Prompts diários de IA, tracker de humor com emojis e sistema de streaks gamificado",
    category: "reflexao",
  },
  {
    id: "memory", icon: "🧩", name: "Jogo da Memória", route: "/memory",
    desc: "Conceitos vs definições por módulo",
    science: "Repetição ativa para consolidação",
    xp: "+10-30 XP", color: "from-emerald-500/15 to-teal-500/15",
    preview: "Cards flip com conceitos científicos, sistema de estrelas e timer competitivo",
    category: "cognitivo",
  },
  {
    id: "mindmap", icon: "🗺️", name: "Mapa Mental", route: "/mindmap",
    desc: "SVG interativo expansível por módulo",
    science: "Novak & Cañas (2008) — mapas conceituais",
    xp: "Exploração", color: "from-violet-500/15 to-purple-500/15",
    preview: "Nós expansíveis com animação spring, zoom dinâmico e conexões por módulo",
    category: "cognitivo",
  },
  {
    id: "emotions", icon: "📊", name: "Termômetro Emocional", route: "/emotions",
    desc: "Tracker com gráfico de 7 dias",
    science: "Russell's Circumplex Model",
    xp: "+5 XP", color: "from-cyan-500/15 to-sky-500/15",
    preview: "8 emoções com picker visual, gráfico de barras semanal e histórico detalhado",
    category: "reflexao",
  },
  {
    id: "challenge21", icon: "🎲", name: "Desafio 21 Dias", route: "/challenge21",
    desc: "21 micro-ações com tracking",
    science: "Lally et al. (2010) — formação de hábitos",
    xp: "+10/dia", color: "from-amber-500/15 to-yellow-500/15",
    preview: "Checklist progressivo com categorias, barra de progresso animada e streaks",
    category: "habito",
  },
  {
    id: "hypothesis", icon: "🔬", name: "Lab de Hipóteses", route: "/hypothesis",
    desc: "Formule e teste hipóteses se-então",
    science: "Método científico pessoal (Popper)",
    xp: "+15 XP", color: "from-lime-500/15 to-green-500/15",
    preview: "Formulação guiada, sugestões por módulo, status de confirmação/refutação",
    category: "cognitivo",
  },
  {
    id: "missions", icon: "🏆", name: "Missões Sociais", route: "/missions",
    desc: "9 desafios colaborativos com evidências",
    science: "Lyubomirsky (2005) — impacto social",
    xp: "+15-50 XP", color: "from-red-500/15 to-orange-500/15",
    preview: "Missões com níveis de dificuldade, evidências científicas e XP variável",
    category: "social",
  },
];

const categories = [
  { id: "all", label: "Todos", icon: Sparkles },
  { id: "corpo", label: "Corpo & Mente", icon: Heart },
  { id: "cognitivo", label: "Cognitivo", icon: Brain },
  { id: "reflexao", label: "Reflexão", icon: Heart },
  { id: "habito", label: "Hábitos", icon: Gamepad2 },
  { id: "social", label: "Social", icon: Heart },
];

export default function InteractiveToolsShowcase() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<typeof tools[0] | null>(null);

  const filtered = filter === "all" ? tools : tools.filter(t => t.category === filter);

  return (
    <section className="py-24 relative overflow-hidden" id="ferramentas">
      <NeuralBackground />
      <div className="absolute inset-0 gradient-mesh opacity-10" />
      <div className="container max-w-6xl relative">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex justify-center mb-4"><BrainPulse /></div>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-bold mb-4">
            🧪 Laboratório de Aprendizagem Interativa
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            9 Ferramentas <span className="holographic">Científicas</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Cada ferramenta foi desenhada com neurociência aplicada para transformar conhecimento em prática real.
          </p>
          <div className="max-w-2xl mx-auto">
            <MilestoneTracker
              milestones={[
                { label: "Iniciante", value: 0 },
                { label: "Explorador", value: 100 },
                { label: "Praticante", value: 300 },
                { label: "Mestre", value: 600 },
              ]}
              current={120}
            />
          </div>
        </motion.div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                filter === cat.id
                  ? "gradient-institute text-primary-foreground shadow-warm"
                  : "glass-card hover:shadow-warm text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tools Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {filtered.map((tool, i) => (
              <motion.div
                key={tool.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                onMouseEnter={() => setHoveredId(tool.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setSelectedTool(tool)}
                className={`group relative p-6 rounded-3xl cursor-pointer magnetic-lift tilt-3d border border-border/50 overflow-hidden bg-gradient-to-br ${tool.color}`}
              >
                {/* Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />

                {/* Floating particles on hover */}
                {hoveredId === tool.id && (
                  <>
                    <motion.div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary/30" animate={{ y: [-5, 5, -5] }} transition={{ duration: 2, repeat: Infinity }} />
                    <motion.div className="absolute bottom-8 right-8 w-1.5 h-1.5 rounded-full bg-accent/40" animate={{ y: [3, -3, 3] }} transition={{ duration: 1.5, repeat: Infinity }} />
                  </>
                )}

                <span className="text-4xl block mb-4 group-hover:scale-110 transition-transform duration-300">{tool.icon}</span>
                <h4 className="font-display font-bold text-base mb-1">{tool.name}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{tool.desc}</p>

                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">{tool.xp}</span>
                </div>

                {/* Science badge */}
                <div className="p-2 rounded-lg bg-background/50 backdrop-blur-sm border border-border/30">
                  <p className="text-[10px] text-muted-foreground">📎 {tool.science}</p>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  <Sparkles className="w-3.5 h-3.5" /> Experimentar
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* CTA */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <button
            onClick={() => navigate("/auth")}
            className="group px-8 py-4 rounded-2xl gradient-institute text-primary-foreground font-bold shadow-warm hover:shadow-glow transition-all hover:scale-[1.02] inline-flex items-center gap-2"
          >
            Acessar Todas as Ferramentas <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedTool && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-foreground/60 backdrop-blur-md" onClick={() => setSelectedTool(null)} />
            <motion.div
              className="relative w-full max-w-md rounded-3xl bg-card border border-border shadow-float overflow-hidden"
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
            >
              <div className={`p-8 bg-gradient-to-br ${selectedTool.color} relative`}>
                <button onClick={() => setSelectedTool(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-background transition-colors" aria-label="Fechar">
                  <X className="w-4 h-4" />
                </button>
                <span className="text-5xl block mb-3">{selectedTool.icon}</span>
                <h3 className="font-display font-bold text-2xl mb-1">{selectedTool.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedTool.desc}</p>
              </div>
              <div className="p-6">
                <p className="text-sm text-muted-foreground mb-4">{selectedTool.preview}</p>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 mb-6">
                  <p className="text-xs font-semibold text-primary">📎 {selectedTool.science}</p>
                </div>
                <button
                  onClick={() => { setSelectedTool(null); navigate(selectedTool.route); }}
                  className="w-full py-3.5 rounded-2xl gradient-institute text-primary-foreground font-bold shadow-warm hover:shadow-glow transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
                >
                  Experimentar {selectedTool.name} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
