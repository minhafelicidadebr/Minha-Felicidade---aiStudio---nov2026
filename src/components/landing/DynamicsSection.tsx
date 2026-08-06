import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Target, Sparkles, ArrowRight, Star, Bot, Layers, BarChart3,
  Gamepad2, Swords, Feather, Blocks, Check, RotateCcw, Compass, Lock, Trophy,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AlegriaAvatar from "@/components/AlegriaAvatar";
import {
  PHASE_META, readJourney, writeJourney, masteryFor,
  type Phase, type JourneyState,
} from "@/lib/dynamics-journey";

type Preview =
  | { kind: "quiz"; question: string; options: string[]; answer: number; why: string }
  | { kind: "flip"; front: string; back: string }
  | { kind: "choice"; scenario: string; options: { label: string; outcome: string }[] }
  | { kind: "prompt"; lines: string[] };

type Dynamic = {
  id: string;
  Icon: typeof Bot;
  name: string;
  desc: string;
  color: "coral" | "gold" | "navy";
  xp: string;
  phase: Phase;
  detail: string;
  features: string[];
  path: string;
  preview: Preview;
};

const dynamics: Dynamic[] = [
  {
    id: "chatbot", Icon: Bot, name: "AlegrIA", desc: "Sua tutora do bem-estar, com respostas baseadas em ciência",
    color: "coral", xp: "+variável", phase: "ensinar", path: "/alegria",
    detail: "Uma inteligência artificial que aprende com você: faça perguntas, explore os conceitos do curso e receba orientação personalizada — sempre mostrando de onde veio cada resposta.",
    features: ["Respostas baseadas em ciência", "Faz perguntas que te fazem pensar", "Mostra as fontes de cada resposta", "Se adapta ao seu progresso"],
    preview: { kind: "prompt", lines: ["Por que conquistar coisas não me deixa feliz por muito tempo?", "Comparação nas redes mexe comigo — o que a ciência diz?", "Como criar um hábito que eu não abandone em 3 dias?"] },
  },
  {
    id: "quiz", Icon: Target, name: "Quiz Adaptativo", desc: "3 níveis de dificuldade com feedback",
    color: "gold", xp: "+15 XP", phase: "treinar", path: "/quiz",
    detail: "Sistema de avaliação inteligente que se adapta ao seu nível. Comece no básico e avance até o expert com feedback detalhado e explicações.",
    features: ["3 níveis: Básico, Intermediário, Expert", "Feedback imediato com explicações", "Tracking de progresso por módulo", "+15 XP por resposta correta"],
    preview: {
      kind: "quiz",
      question: "O que a pesquisa chama de “miswanting”?",
      options: ["Querer o que os outros têm", "Errar ao prever o que vai te fazer feliz", "Não saber o que quer"],
      answer: 1,
      why: "Wilson & Gilbert (2003): erramos sistematicamente ao prever intensidade e duração do que sentiremos.",
    },
  },
  {
    id: "flashcards", Icon: Layers, name: "Flashcards", desc: "Repetição espaçada para consolidação",
    color: "navy", xp: "+5 XP", phase: "treinar", path: "/flashcards",
    detail: "Baseado no algoritmo de repetição espaçada de Leitner, os flashcards consolidam conceitos-chave na memória de longo prazo.",
    features: ["Algoritmo de repetição espaçada", "Categorias por módulo", "Flip interativo com animação", "+5 XP por card aprendido"],
    preview: { kind: "flip", front: "Adaptação hedônica", back: "A tendência de voltar ao nível-base de felicidade depois de qualquer ganho ou perda (Brickman & Campbell, 1971)." },
  },
  {
    id: "evidence", Icon: BarChart3, name: "Evidence Explorer", desc: "Biblioteca científica curada por driver",
    color: "coral", xp: "+10 XP", phase: "ensinar", path: "/evidence",
    detail: "Explore a base científica por trás de cada conceito. Artigos, estudos e meta-análises organizados por driver de felicidade.",
    features: ["Estudos peer-reviewed", "Organizado por driver", "Links para fontes originais", "Filtros por módulo e tema"],
    preview: { kind: "prompt", lines: ["Gratidão — Davis et al. (2016), meta-análise", "Conexão social — Diener & Seligman (2002)", "Gentileza e gasto pró-social — Dunn et al. (2008), Science"] },
  },
  {
    id: "simulator", Icon: Gamepad2, name: "Simulador", desc: "Cenários com consequências reais",
    color: "gold", xp: "+25 XP", phase: "transferir", path: "/simulator",
    detail: "Cenários interativos onde suas decisões têm consequências. Explore dilemas reais da vida adolescente com ciência.",
    features: ["Cenários realistas", "Múltiplos desfechos", "Feedback baseado em ciência", "+25 XP por cenário"],
    preview: {
      kind: "choice",
      scenario: "São 23h. Você prometeu dormir cedo, mas o feed está bom.",
      options: [
        { label: "Mais 20 minutos", outcome: "Custo real no dia seguinte: atenção e humor caem (Walker, 2017)." },
        { label: "Celular fora do quarto", outcome: "Design de ambiente vence força de vontade (Thaler & Sunstein, 2008)." },
      ],
    },
  },
  {
    id: "debate", Icon: Swords, name: "Arena de Debate", desc: "Debate socrático + argumentação",
    color: "navy", xp: "+20 XP", phase: "transferir", path: "/debate",
    detail: "Desenvolva pensamento crítico debatendo temas controversos da felicidade. Construa argumentos e explore perspectivas.",
    features: ["Temas provocativos", "Mapa de argumentos", "Pensamento crítico", "+20 XP por debate"],
    preview: { kind: "prompt", lines: ["“Dinheiro compra felicidade” — defenda e ataque", "“Rede social deveria ter idade mínima”", "“Sucesso escolar importa mais que amizade”"] },
  },
  {
    id: "poetry", Icon: Feather, name: "Poesia Pedagógica", desc: "Poema + prática reflexiva",
    color: "coral", xp: "+15 XP", phase: "ensinar", path: "/poetry",
    detail: "A arte como ferramenta de aprendizagem. Gere poesias personalizadas sobre os conceitos e use como gatilho reflexivo.",
    features: ["Geração com IA criativa", "Múltiplos estilos", "Prática reflexiva guiada", "Expressão artística"],
    preview: { kind: "prompt", lines: ["Um poema sobre recomeçar na segunda-feira", "Versos sobre gratidão que não soem clichê", "Cordel sobre ansiedade antes da prova"] },
  },
  {
    id: "codesign", Icon: Blocks, name: "Co-design", desc: "Plano de intervenção com métricas",
    color: "gold", xp: "+30 XP", phase: "transferir", path: "/codesign",
    detail: "Crie seu plano de intervenção em bem-estar usando frameworks como WOOP e Implementation Intentions.",
    features: ["Framework WOOP integrado", "Métricas personalizadas", "Plano de ação estruturado", "Transferência para vida real"],
    preview: { kind: "prompt", lines: ["Wish: o que eu quero mudar em 21 dias", "Obstacle: o que sempre me trava", "Plan: se ___ acontecer, então eu ___"] },
  },
];

const colorClasses: Record<string, { bg: string; badge: string; ring: string; tile: string }> = {
  coral: { bg: "bg-coral-light", badge: "bg-destructive/10 text-destructive", ring: "ring-destructive/30", tile: "from-destructive/20 to-destructive/5 text-destructive" },
  gold: { bg: "bg-gold-light", badge: "bg-secondary/10 text-secondary-foreground", ring: "ring-secondary/40", tile: "from-secondary/25 to-secondary/5 text-secondary-foreground" },
  navy: { bg: "bg-navy-light", badge: "bg-accent/10 text-accent", ring: "ring-accent/30", tile: "from-accent/20 to-accent/5 text-accent" },
};

const PHASES: Phase[] = ["ensinar", "treinar", "transferir"];

/** Regra de roteamento adaptativo (Coach de Próximo Passo). */
function recommend(state: JourneyState): { d: Dynamic; reason: string; source: string } {
  const touched = (id: string) => Boolean(state[id]?.touched);
  const byId = (id: string) => dynamics.find((d) => d.id === id)!;

  if (state.quiz?.touched && state.quiz.correct === false) {
    return { d: byId("evidence"), reason: "Você errou o conceito no preview do Quiz — antes de treinar de novo, vale ver a evidência original.", source: "Bjork & Bjork (2011), dificuldade desejável" };
  }
  if (!touched("chatbot") && !touched("quiz")) {
    return { d: byId("chatbot"), reason: "Comece construindo o conceito com alguém que te faz perguntas — depois a prática rende muito mais.", source: "Chi & Wylie (2014), aprendizagem interativa" };
  }
  if (touched("chatbot") && !touched("quiz")) {
    return { d: byId("quiz"), reason: "Você já explorou o conceito. Recuperar da memória agora consolida mais que reler.", source: "Roediger & Karpicke (2006), testing effect" };
  }
  if (touched("quiz") && !touched("flashcards")) {
    return { d: byId("flashcards"), reason: "Sem revisão espaçada, boa parte disso some em 48h. 5 minutos hoje valem por 30 depois.", source: "Cepeda et al. (2006), spacing effect" };
  }
  if (!touched("simulator")) {
    return { d: byId("simulator"), reason: "Teoria consolidada pede decisão sob pressão: é onde o conhecimento vira comportamento.", source: "Santos & Gendler (2014), falácia de G.I. Joe" };
  }
  if (!touched("codesign")) {
    return { d: byId("codesign"), reason: "Hora de transformar tudo num plano com gatilho: “se X, então Y”.", source: "Gollwitzer (1999), implementation intentions" };
  }
  return { d: byId("debate"), reason: "Você percorreu a trilha. Defender e atacar a mesma tese é o teste final de compreensão.", source: "Kuhn (1991), argumentação e pensamento crítico" };
}

function PreviewPanel({ d, onDone }: { d: Dynamic; onDone: (correct?: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const p = d.preview;

  if (p.kind === "quiz") {
    return (
      <div className="space-y-2.5">
        <p className="text-xs font-semibold leading-snug">{p.question}</p>
        <div className="space-y-1.5">
          {p.options.map((o, i) => {
            const isRight = i === p.answer;
            const show = picked !== null;
            return (
              <button
                key={o}
                onClick={(e) => { e.stopPropagation(); if (picked === null) { setPicked(i); onDone(isRight); } }}
                className={`w-full text-left text-[11px] px-3 py-2 rounded-xl border transition-all ${
                  show && isRight ? "border-success/50 bg-success/10" :
                  show && picked === i ? "border-destructive/50 bg-destructive/10" :
                  "border-border/60 bg-background/60 hover:border-primary/40"
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
        {picked !== null && <p className="text-[11px] text-muted-foreground leading-relaxed">{p.why}</p>}
      </div>
    );
  }

  if (p.kind === "flip") {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setFlipped((f) => !f); onDone(); }}
        className="w-full min-h-[92px] rounded-2xl border border-border/60 bg-background/60 p-4 text-left transition-all hover:border-primary/40"
      >
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {flipped ? "Verso" : "Frente — toque para virar"}
        </span>
        <p className={`mt-1.5 leading-snug ${flipped ? "text-[11px] text-muted-foreground" : "text-sm font-semibold"}`}>
          {flipped ? p.back : p.front}
        </p>
        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
          <RotateCcw className="w-3 h-3" /> {flipped ? "Voltar" : "Virar card"}
        </span>
      </button>
    );
  }

  if (p.kind === "choice") {
    return (
      <div className="space-y-2.5">
        <p className="text-xs font-semibold leading-snug">{p.scenario}</p>
        <div className="space-y-1.5">
          {p.options.map((o, i) => (
            <button
              key={o.label}
              onClick={(e) => { e.stopPropagation(); setPicked(i); onDone(); }}
              className={`w-full text-left text-[11px] px-3 py-2 rounded-xl border transition-all ${
                picked === i ? "border-primary/50 bg-primary/10" : "border-border/60 bg-background/60 hover:border-primary/40"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {picked !== null && <p className="text-[11px] text-muted-foreground leading-relaxed">{p.options[picked].outcome}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {p.lines.map((l) => (
        <button
          key={l}
          onClick={(e) => { e.stopPropagation(); onDone(); }}
          className="w-full text-left text-[11px] px-3 py-2 rounded-xl border border-border/60 bg-background/60 hover:border-primary/40 transition-all"
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export default function DynamicsSection() {
  const [selected, setSelected] = useState<Dynamic | null>(null);
  const [openPreview, setOpenPreview] = useState<string | null>(null);
  const [journey, setJourney] = useState<JourneyState>({});
  const navigate = useNavigate();

  useEffect(() => { setJourney(readJourney()); }, []);

  const mark = (id: string, correct?: boolean) => {
    setJourney((prev) => {
      const next = { ...prev, [id]: { touched: true, correct: correct ?? prev[id]?.correct } };
      writeJourney(next);
      return next;
    });
  };

  const completed = Object.values(journey).filter((v) => v.touched).length;
  const overall = Math.round((completed / dynamics.length) * 100);
  const coach = useMemo(() => recommend(journey), [journey]);

  return (
    <section className="py-24 relative overflow-hidden" id="dinamicas">
      <div className="absolute inset-0 gradient-mesh opacity-10" />
      <div className="container max-w-6xl relative">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
            <Compass className="w-4 h-4" /> Passaporte de Aprendizagem
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            8 Dinâmicas <span className="text-gradient">Gamificadas</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Uma trilha, não um catálogo: <strong>Ensinar → Treinar → Transferir</strong>. Experimente cada dinâmica aqui mesmo antes de entrar.
          </p>
        </motion.div>

        {/* ── Coach de Próximo Passo ─────────────────────────────── */}
        <motion.div
          className="mb-10 rounded-3xl border border-border/60 bg-card/70 backdrop-blur-sm p-6 md:p-7 shadow-soft"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className={`w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br ${colorClasses[coach.d.color].tile} flex items-center justify-center`}>
              <coach.d.Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Seu próximo passo</span>
              <h3 className="font-display font-bold text-lg leading-tight">{coach.d.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">{coach.reason}</p>
              <p className="text-[11px] text-muted-foreground/80 mt-1.5 italic">Base: {coach.source}</p>
            </div>
            <button
              onClick={() => navigate(coach.d.path)}
              className="shrink-0 px-5 py-3 rounded-2xl gradient-institute text-primary-foreground font-bold text-sm shadow-warm hover:shadow-glow transition-all hover:scale-[1.02] inline-flex items-center justify-center gap-2"
            >
              Começar <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-border/50">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold inline-flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-secondary-foreground" /> Passaporte
              </span>
              <span className="text-muted-foreground">{completed} de {dynamics.length} dinâmicas experimentadas</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full gradient-institute rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${overall}%` }}
                transition={{ type: "spring", stiffness: 60, damping: 18 }}
              />
            </div>
          </div>
        </motion.div>

        {/* ── Trilha por fase ────────────────────────────────────── */}
        <div className="space-y-10">
          {PHASES.map((phase, pi) => {
            const items = dynamics.filter((d) => d.phase === phase);
            const mastery = masteryFor(items.map((d) => d.id), journey);
            const prevItems = PHASES.slice(0, pi).flatMap((ph) => dynamics.filter((d) => d.phase === ph).map((d) => d.id));
            const gated = pi > 0 && masteryFor(prevItems, journey) === 0;

            return (
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-display font-bold text-sm flex items-center justify-center">
                      {pi + 1}
                    </span>
                    <div>
                      <h3 className="font-display font-bold text-lg leading-none">{PHASE_META[phase].label}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{PHASE_META[phase].caption}</p>
                    </div>
                  </div>
                  <div className="flex-1 h-px bg-border/60" />
                  <span className="text-[11px] font-bold text-muted-foreground shrink-0">{mastery}% maestria</span>
                </div>

                <div className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity ${gated ? "opacity-70" : ""}`}>
                  {items.map((d, i) => {
                    const colors = colorClasses[d.color];
                    const done = Boolean(journey[d.id]?.touched);
                    const isOpen = openPreview === d.id;
                    return (
                      <motion.div
                        key={d.id}
                        className={`relative p-6 rounded-3xl border overflow-hidden transition-all duration-500 ${colors.bg} ${
                          done ? `border-transparent ring-2 ${colors.ring}` : "border-border/50"
                        } ${isOpen ? "shadow-float" : "hover:-translate-y-1.5 hover:shadow-float"}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <div className="flex items-start justify-between gap-3 mb-4">
                          {d.id === "chatbot" ? (
                            <AlegriaAvatar size={48} radius="rounded-2xl" />
                          ) : (
                            <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors.tile} flex items-center justify-center`}>
                              <d.Icon className="w-5 h-5" />
                            </span>
                          )}
                          {done ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-1 rounded-full">
                              <Check className="w-3 h-3" /> Experimentado
                            </span>
                          ) : gated ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                              <Lock className="w-3 h-3" /> Etapa {pi + 1}
                            </span>
                          ) : null}
                        </div>

                        <h4 className="font-display font-bold text-base mb-1">{d.name}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{d.desc}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.badge}`}>{d.xp}</span>

                        {/* Preview jogável */}
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 pt-4 border-t border-border/50">
                                <PreviewPanel d={d} onDone={(c) => mark(d.id, c)} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="mt-4 flex items-center gap-2">
                          <button
                            onClick={() => setOpenPreview(isOpen ? null : d.id)}
                            className="flex-1 py-2 rounded-xl bg-background/70 border border-border/60 text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:border-primary/50 transition-all"
                          >
                            <Play className="w-3.5 h-3.5 text-primary" /> {isOpen ? "Fechar" : "Experimentar aqui"}
                          </button>
                          <button
                            onClick={() => setSelected(d)}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-all inline-flex items-center gap-1"
                          >
                            Detalhes <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-foreground/60 backdrop-blur-md" onClick={() => setSelected(null)} />
            <motion.div
              className="relative w-full max-w-lg rounded-3xl bg-card border border-border shadow-float overflow-hidden max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
            >
              <div className={`p-8 ${colorClasses[selected.color].bg} relative overflow-hidden`}>
                <div className="absolute inset-0 gradient-mesh opacity-20" />
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-background transition-colors z-10"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
                {selected.id === "chatbot" ? (
                  <span className="block mb-4 relative z-10 w-fit"><AlegriaAvatar size={64} radius="rounded-2xl" active /></span>
                ) : (
                  <span className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colorClasses[selected.color].tile} flex items-center justify-center mb-4 relative z-10`}>
                    <selected.Icon className="w-7 h-7" />
                  </span>
                )}
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary relative z-10">
                  Etapa: {PHASE_META[selected.phase].label}
                </span>
                <h3 className="font-display font-bold text-2xl mb-2 relative z-10">{selected.name}</h3>
                <div className="flex items-center gap-2 relative z-10">
                  <span className="text-sm text-muted-foreground">{selected.desc}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${colorClasses[selected.color].badge}`}>{selected.xp}</span>
                </div>
              </div>
              <div className="p-8">
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">{selected.detail}</p>
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" /> Recursos
                </h4>
                <ul className="space-y-2.5 mb-6">
                  {selected.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-success" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mb-6 rounded-2xl border border-border/60 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> Prévia jogável
                  </span>
                  <div className="mt-3">
                    <PreviewPanel d={selected} onDone={(c) => mark(selected.id, c)} />
                  </div>
                </div>

                <button
                  onClick={() => { setSelected(null); navigate(selected.path); }}
                  className="w-full py-3.5 rounded-2xl gradient-institute text-primary-foreground font-bold text-sm shadow-warm hover:shadow-glow transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
                >
                  Acessar {selected.name} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
