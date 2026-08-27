import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Sparkles, Brain, Heart, Gamepad2, Wind, Target, NotebookPen,
  Puzzle, Network, Activity, CalendarCheck, FlaskConical, HandHeart, CalendarDays, Stethoscope,
} from "lucide-react";
import { NeuralBackground, BrainPulse } from "@/components/learning/LearningFX";
import ToolMicroPractice from "@/components/landing/ToolMicroPractice";
import { STATE_META, type StateKey, readLab, writeLab, buildRitual } from "@/lib/tools-lab";

const tools = [
  {
    id: "breathing", Icon: Wind, name: "Respiração Consciente", route: "/breathing",
    desc: "3 técnicas com pacer visual de respiração",
    science: "Ma et al. (2017) — respiração e regulação do estresse",
    xp: "+5/ciclo", color: "from-blue-500/15 to-indigo-500/15", category: "corpo",
  },
  {
    id: "lifewheel", Icon: Target, name: "Roda da Vida", route: "/lifewheel",
    desc: "8 dimensões de bem-estar com radar interativo",
    science: "8 drivers científicos de felicidade",
    xp: "+15 XP", color: "from-orange-500/15 to-amber-500/15", category: "avaliacao",
  },
  {
    id: "gratitude", Icon: NotebookPen, name: "Diário de Gratidão", route: "/gratitude",
    desc: "Journaling com prompts, humor e streaks",
    science: "Emmons & McCullough (2003) — gratidão e bem-estar",
    xp: "+10 XP", color: "from-pink-500/15 to-rose-500/15", category: "reflexao",
  },
  {
    id: "memory", Icon: Puzzle, name: "Jogo da Memória", route: "/memory",
    desc: "Conceitos vs definições por módulo",
    science: "Karpicke & Roediger (2008) — recuperação ativa",
    xp: "+10-30 XP", color: "from-emerald-500/15 to-teal-500/15", category: "cognitivo",
  },
  {
    id: "mindmap", Icon: Network, name: "Mapa Mental", route: "/mindmap",
    desc: "Mapa conceitual expansível por módulo",
    science: "Novak & Cañas (2008) — mapas conceituais",
    xp: "Exploração", color: "from-violet-500/15 to-purple-500/15", category: "cognitivo",
  },
  {
    id: "emotions", Icon: Activity, name: "Termômetro Emocional", route: "/emotions",
    desc: "Tracker com gráfico de 7 dias",
    science: "Lieberman et al. (2007) — nomear para regular",
    xp: "+5 XP", color: "from-cyan-500/15 to-sky-500/15", category: "reflexao",
  },
  {
    id: "challenge21", Icon: CalendarCheck, name: "Desafio 21 Dias", route: "/challenge21",
    desc: "21 micro-ações com tracking de constância",
    science: "Lally et al. (2010) — formação de hábitos",
    xp: "+10/dia", color: "from-amber-500/15 to-yellow-500/15", category: "habito",
  },
  {
    id: "hypothesis", Icon: FlaskConical, name: "Lab de Hipóteses", route: "/hypothesis",
    desc: "Formule e teste hipóteses se-então",
    science: "Método científico pessoal (Popper)",
    xp: "+15 XP", color: "from-lime-500/15 to-green-500/15", category: "cognitivo",
  },
  {
    id: "missions", Icon: HandHeart, name: "Missões Sociais", route: "/missions",
    desc: "9 desafios colaborativos com evidências",
    science: "Lyubomirsky (2005) — atos pró-sociais",
    xp: "+15-50 XP", color: "from-red-500/15 to-orange-500/15", category: "social",
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

const STATES = Object.keys(STATE_META) as StateKey[];

export default function InteractiveToolsShowcase() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [lab, setLab] = useState(() => readLab());

  const update = (next: typeof lab) => { setLab(next); writeLab(next); };
  // Memoizado em `lab.state` porque o ramo `: []` criava um array novo a cada
  // render, invalidando o `useMemo` de `filtered` sempre — inclusive quando nada
  // havia mudado. A prescrição só muda quando o estado declarado muda.
  const prescribed = useMemo(
    () => (lab.state ? STATE_META[lab.state].tools : []),
    [lab.state],
  );

  const filtered = useMemo(() => {
    const base = filter === "all" ? tools : tools.filter((t) => t.category === filter);
    if (!prescribed.length) return base;
    return [...base].sort(
      (a, b) => (prescribed.indexOf(a.id) + 1 || 99) - (prescribed.indexOf(b.id) + 1 || 99)
    );
  }, [filter, prescribed]);

  const triedCount = Object.keys(lab.tried).length;
  const ritual = useMemo(() => buildRitual(tools.map((t) => t.id), lab), [lab]);

  return (
    <section className="py-24 relative overflow-hidden" id="ferramentas">
      <NeuralBackground />
      <div className="absolute inset-0 gradient-mesh opacity-10" />
      <div className="container max-w-6xl relative">
        <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="flex justify-center mb-4"><BrainPulse /></div>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-bold mb-4">
            <FlaskConical className="w-4 h-4" /> Laboratório de Aprendizagem Interativa
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            9 Ferramentas <span className="holographic">Científicas</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Não escolha no escuro: diga como você está agora e o laboratório prescreve a prática certa — e você já faz um pedaço dela aqui mesmo.
          </p>
        </motion.div>

        {/* 1 — Prescrição adaptativa */}
        <div className="glass-card rounded-3xl p-5 md:p-6 mb-8 border border-border/60">
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5" /> Como você está agora?
          </p>
          <div className="flex flex-wrap gap-2">
            {STATES.map((s) => (
              <button
                key={s}
                onClick={() => update({ ...lab, state: lab.state === s ? undefined : s })}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${lab.state === s
                  ? "gradient-institute text-primary-foreground shadow-warm"
                  : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40"}`}
              >
                {STATE_META[s].label}
                <span className="block text-[10px] font-normal opacity-70">{STATE_META[s].caption}</span>
              </button>
            ))}
          </div>
          <AnimatePresence>
            {lab.state && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/15">
                  <p className="text-xs leading-relaxed text-muted-foreground mb-3">
                    <strong className="text-foreground">Por que essa ordem: </strong>{STATE_META[lab.state].rationale}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {STATE_META[lab.state].tools.map((id, i) => {
                      const t = tools.find((x) => x.id === id);
                      return t ? (
                        <button key={id} onClick={() => { setFilter("all"); setOpenId(id); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-card border border-border/60 hover:border-primary/50 transition-colors">
                          <span className="text-primary">{i + 1}.</span> <t.Icon className="w-3.5 h-3.5 text-primary" /> {t.name}
                        </button>
                      ) : null;
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${filter === cat.id
                ? "gradient-institute text-primary-foreground shadow-warm"
                : "glass-card hover:shadow-warm text-muted-foreground hover:text-foreground"}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 2 — Grid com micro-prática dentro do card */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
          <AnimatePresence mode="popLayout">
            {filtered.map((tool, i) => {
              const isPrescribed = prescribed.includes(tool.id);
              const isOpen = openId === tool.id;
              return (
                <motion.div
                  key={tool.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className={`group relative p-6 rounded-3xl border overflow-hidden bg-gradient-to-br ${tool.color} ${isPrescribed ? "border-primary/50 shadow-warm" : "border-border/50"}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />

                  {isPrescribed && (
                    <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary">
                      Recomendado
                    </span>
                  )}

                  <div className="w-12 h-12 rounded-2xl icon-tile-premium flex items-center justify-center mb-4">
                    <tool.Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-display font-bold text-base mb-1">{tool.name}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{tool.desc}</p>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">{tool.xp}</span>
                    {lab.tried[tool.id] && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success">Já praticado</span>
                    )}
                  </div>

                  <div className="p-2 rounded-lg bg-background/50 backdrop-blur-sm border border-border/30">
                    <p className="text-[10px] text-muted-foreground">{tool.science}</p>
                  </div>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <ToolMicroPractice
                          toolId={tool.id}
                          onDone={() => update({ ...lab, tried: { ...lab.tried, [tool.id]: Date.now() } })}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => setOpenId(isOpen ? null : tool.id)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-card border border-border/60 hover:border-primary/50 transition-colors"
                    >
                      {isOpen ? "Fechar prática" : "Praticar 60s aqui"}
                    </button>
                    <button
                      onClick={() => navigate(tool.route)}
                      className="px-3 py-2 rounded-xl text-xs font-bold gradient-institute text-primary-foreground shadow-warm hover:shadow-glow transition-all"
                      aria-label={`Abrir ${tool.name}`}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* 3 — Ritual de 7 dias */}
        <AnimatePresence>
          {triedCount > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-12 glass-card rounded-3xl p-6 border border-border/60">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="w-4 h-4 text-primary" />
                <h3 className="font-display font-bold text-lg">Seu ritual de 7 dias</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-5">
                Montado a partir do que você acabou de praticar {lab.state ? `e do seu estado atual (${STATE_META[lab.state].label.toLowerCase()})` : ""} — prática curta, todo dia, na ordem que sustenta o hábito.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-5">
                {ritual.map(({ day, toolId }) => {
                  const t = tools.find((x) => x.id === toolId)!;
                  return (
                    <button key={day} onClick={() => navigate(t.route)} className="p-3 rounded-2xl bg-card border border-border/60 hover:border-primary/50 transition-colors text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{day}</p>
                      <t.Icon className="w-4 h-4 text-primary mb-1.5" />
                      <p className="text-[11px] font-semibold leading-tight">{t.name}</p>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => navigate("/auth")} className="px-6 py-3 rounded-2xl gradient-institute text-primary-foreground font-bold shadow-warm hover:shadow-glow transition-all inline-flex items-center gap-2">
                  Salvar meu ritual <ArrowRight className="w-4 h-4" />
                </button>
                <span className="text-[11px] text-muted-foreground">{triedCount} de 9 ferramentas experimentadas</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {triedCount === 0 && (
          <motion.div className="text-center mt-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <button
              onClick={() => navigate("/auth")}
              className="group px-8 py-4 rounded-2xl gradient-institute text-primary-foreground font-bold shadow-warm hover:shadow-glow transition-all hover:scale-[1.02] inline-flex items-center gap-2"
            >
              Acessar Todas as Ferramentas <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
