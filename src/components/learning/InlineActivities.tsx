import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronRight, RotateCcw, Sparkles, Trophy, X, XCircle, Zap, Layers, Bot, Target, Drama, Network, BarChart3, Gamepad2, Swords, Blocks, Wind, Compass, NotebookPen, Puzzle, Activity, CalendarDays, FlaskConical, Award } from "lucide-react";
import { quizQuestions, flashcards } from "@/data/courseData";
import { ALEGRIA_AVATAR_URL } from "@/components/AlegriaAvatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNeonFX } from "@/components/learning/NeonConfettiFX";
import { useProgress } from "@/hooks/useProgress";

type Props = {
  moduleId: string;
  /** Encoded `back` param so activity pages know how to return */
  backHref: string;
  backLabel: string;
};

const SHORTCUTS = [
  { Icon: Target, title: "Quiz", path: "/quiz", desc: "Teste o que aprendeu", accent: "text-orange-400" },
  { Icon: Layers, title: "Flashcards", path: "/flashcards", desc: "Revisar conceitos", accent: "text-amber-400" },
  { Icon: Drama, title: "Poesia", path: "/poetry", desc: "Reflexão criativa", accent: "text-pink-400" },
  { Icon: Bot, title: "AlegrIA", path: "/alegria", desc: "Pergunte à tutora", accent: "text-violet-400" },
  { Icon: Network, title: "Mapa Mental", path: "/mindmap", desc: "Visualizar conceitos", accent: "text-sky-400" },
];

const ALL_TOOLS = [
  { Icon: Target, title: "Quiz", path: "/quiz", desc: "Teste seus conhecimentos", accent: "text-orange-400" },
  { Icon: Layers, title: "Flashcards", path: "/flashcards", desc: "Repetição espaçada", accent: "text-amber-400" },
  { Icon: BarChart3, title: "Evidências", path: "/evidence", desc: "Base científica", accent: "text-blue-400" },
  { Icon: Gamepad2, title: "Simulador", path: "/simulator", desc: "Cenários de decisão", accent: "text-emerald-400" },
  { Icon: Swords, title: "Debate", path: "/debate", desc: "Arena de argumentos", accent: "text-red-400" },
  { Icon: Drama, title: "Poesia", path: "/poetry", desc: "Expressão criativa", accent: "text-pink-400" },
  { Icon: Blocks, title: "Co-design", path: "/codesign", desc: "Construção coletiva", accent: "text-indigo-400" },
  { Icon: Wind, title: "Respiração", path: "/breathing", desc: "Técnicas guiadas", accent: "text-teal-400" },
  { Icon: Compass, title: "Roda da Vida", path: "/lifewheel", desc: "Avaliação integral", accent: "text-emerald-400" },
  { Icon: NotebookPen, title: "Gratidão", path: "/gratitude", desc: "Diário guiado", accent: "text-yellow-400" },
  { Icon: Puzzle, title: "Memória", path: "/memory", desc: "Jogo cognitivo", accent: "text-purple-400" },
  { Icon: Network, title: "Mapa Mental", path: "/mindmap", desc: "Mapeamento conceitual", accent: "text-sky-400" },
  { Icon: Activity, title: "Emoções", path: "/emotions", desc: "Termômetro emocional", accent: "text-rose-400" },
  { Icon: CalendarDays, title: "21 Dias", path: "/challenge21", desc: "Micro-hábitos", accent: "text-lime-400" },
  { Icon: FlaskConical, title: "Hipóteses", path: "/hypothesis", desc: "Lab científico", accent: "text-cyan-400" },
  { Icon: Award, title: "Missões", path: "/missions", desc: "Desafios sociais", accent: "text-amber-400" },
  { Icon: Bot, title: "AlegrIA", path: "/alegria", desc: "Sua tutora do bem-estar", accent: "text-violet-400" },
];

function withCtx(path: string, moduleId: string, backHref: string, backLabel: string) {
  const p = new URLSearchParams();
  p.set("module", moduleId);
  p.set("back", encodeURIComponent(backHref));
  p.set("backLabel", encodeURIComponent(backLabel));
  return `${path}?${p.toString()}`;
}

/* ---------------- Inline Quiz ---------------- */
function InlineQuiz({ moduleId, onOpenFull }: { moduleId: string; onOpenFull: () => void }) {
  const questions = useMemo(
    () => quizQuestions.filter((q) => q.module === moduleId && q.level === 1).slice(0, 5),
    [moduleId]
  );
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const fx = useNeonFX();
  const { trackActivity } = useProgress();

  if (questions.length === 0) {
    return <p className="text-xs text-muted-foreground p-4 text-center">Sem perguntas disponíveis para este módulo.</p>;
  }
  const q = questions[idx];
  const reveal = sel !== null;

  const choose = (i: number, e: React.MouseEvent) => {
    if (reveal) return;
    setSel(i);
    const correct = i === q.correctIndex;
    if (correct) { setScore((s) => s + 1); fx.correct({ clientX: e.clientX, clientY: e.clientY }); }
    else fx.wrong();
  };
  const advance = () => {
    if (idx + 1 < questions.length) { setIdx(idx + 1); setSel(null); }
    else {
      setDone(true); fx.correct();
      trackActivity({ moduleId, activityType: "quiz", activityId: `quiz-inline-${moduleId}`, score: Math.round((score / questions.length) * 100), data: { inline: true } });
    }
  };
  const restart = () => { setIdx(0); setSel(null); setScore(0); setDone(false); };

  if (done) {
    return (
      <div className="p-4 text-center space-y-3">
        <Trophy className="w-10 h-10 text-secondary mx-auto" />
        <p className="font-display font-bold text-lg">{score}/{questions.length} acertos</p>
        <p className="text-xs text-muted-foreground">+{score * 10} XP ganhos sem sair do vídeo ✨</p>
        <div className="flex gap-2">
          <button onClick={restart} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/70 flex items-center justify-center gap-1.5">
            <RotateCcw className="w-3 h-3" /> Refazer
          </button>
          <button onClick={onOpenFull} className="flex-1 py-2 rounded-xl text-xs font-semibold gradient-institute text-primary-foreground flex items-center justify-center gap-1.5">
            Quiz completo <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
        <span className="text-primary">Pergunta {idx + 1}/{questions.length}</span>
        <span className="text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3 text-secondary" /> {score * 10} XP</span>
      </div>
      <p className="text-sm font-semibold leading-snug">{q.question}</p>
      <div className="space-y-1.5">
        {q.options.map((opt, i) => {
          const isCorrect = reveal && i === q.correctIndex;
          const isWrong = reveal && i === sel && i !== q.correctIndex;
          return (
            <button
              key={i}
              onClick={(e) => choose(i, e)}
              disabled={reveal}
              className={`w-full text-left text-xs p-2.5 rounded-xl border transition-all ${isCorrect ? "bg-success/15 border-success text-foreground" :
                isWrong ? "bg-destructive/15 border-destructive text-foreground" :
                  "border-border/40 hover:border-primary/40 hover:bg-muted/40"
                }`}
            >
              <span className="inline-flex items-center gap-2">
                {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />}
                {isWrong && <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                <span>{opt}</span>
              </span>
            </button>
          );
        })}
      </div>
      {reveal && (
        <>
          {q.explanation && (
            <p className="text-[11px] text-muted-foreground p-2 rounded-lg bg-muted/40 border border-border/30">
              💡 {q.explanation}
            </p>
          )}
          <button onClick={advance} className="w-full py-2 rounded-xl text-xs font-bold gradient-institute text-primary-foreground flex items-center justify-center gap-1.5">
            {idx + 1 < questions.length ? <>Próxima <ChevronRight className="w-3 h-3" /></> : <>Ver resultado <Trophy className="w-3 h-3" /></>}
          </button>
        </>
      )}
    </div>
  );
}

/* ---------------- Inline Flashcards ---------------- */
function InlineFlashcards({ moduleId, onOpenFull }: { moduleId: string; onOpenFull: () => void }) {
  const cards = useMemo(() => flashcards.filter((f) => f.module === moduleId), [moduleId]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const fx = useNeonFX();

  if (cards.length === 0) {
    return <p className="text-xs text-muted-foreground p-4 text-center">Sem flashcards para este módulo.</p>;
  }
  const c = cards[idx];
  const next = () => { setFlipped(false); setTimeout(() => setIdx((i) => (i + 1) % cards.length), 150); };
  const mark = (e: React.MouseEvent) => {
    if (!known.has(c.id)) { setKnown((s) => new Set(s).add(c.id)); fx.correct({ clientX: e.clientX, clientY: e.clientY }); }
    next();
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
        <span className="text-primary">{idx + 1}/{cards.length}</span>
        <span className="text-success">{known.size} dominados</span>
      </div>
      <motion.button
        onClick={() => setFlipped(!flipped)}
        className="w-full min-h-[140px] p-4 rounded-2xl border border-border/40 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 flex items-center justify-center text-center text-sm font-medium relative"
        whileTap={{ scale: 0.98 }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={flipped ? "back" : "front"}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {flipped ? c.back : c.front}
          </motion.span>
        </AnimatePresence>
        <span className="absolute bottom-1.5 right-2 text-[9px] text-muted-foreground/70">{flipped ? "↺ frente" : "toque p/ virar"}</span>
      </motion.button>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={next} className="py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/70">Pular</button>
        <button onClick={mark} className="py-2 rounded-xl text-xs font-bold gradient-institute text-primary-foreground">Sei isso ✓</button>
      </div>
      <button onClick={onOpenFull} className="w-full text-[11px] text-primary hover:underline flex items-center justify-center gap-1">
        Abrir baralho completo <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

/* ---------------- Main panel ---------------- */
export default function InlineActivities({ moduleId, backHref, backLabel }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("atalhos");
  const go = (path: string) => navigate(withCtx(path, moduleId, backHref, backLabel));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-secondary" /> Aprender com o vídeo
        </h4>
        <Sheet>
          <SheetTrigger asChild>
            <button className="group relative px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 hover:border-primary/50 transition-all flex items-center gap-1.5">
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <Layers className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold text-primary uppercase tracking-wide">17 Ferramentas</span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-display flex items-center gap-2"><Layers className="w-5 h-5 text-primary" /> Todas as ferramentas</SheetTitle>
              <SheetDescription>17 ferramentas científicas. Tudo contextualizado para este módulo — você volta ao vídeo com 1 toque.</SheetDescription>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-2 mt-5">
              {ALL_TOOLS.map((t) => (
                <button
                  key={t.title + t.path}
                  onClick={() => go(t.path)}
                  className="p-3 rounded-2xl glass-card border border-border/30 hover:border-primary/40 hover:shadow-warm transition-all text-left"
                >
                  {t.title === "AlegrIA" ? (
                    <img src={ALEGRIA_AVATAR_URL} alt="AlegrIA" className="w-10 h-10 rounded-xl object-cover mb-2 ring-1 ring-primary/30" />
                  ) : (
                    <span className={`icon-tile-premium w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${t.accent}`}><t.Icon className="w-4 h-4" strokeWidth={1.75} /></span>
                  )}
                  <p className="font-display font-bold text-sm">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Value proposition strip — ToT: destaque do método pedagógico */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-3 p-2.5 rounded-xl bg-gradient-to-r from-primary/8 via-secondary/5 to-violet-500/8 border border-primary/15"
      >
        <Sheet>
          <SheetTrigger asChild>
            <button className="w-full flex items-center gap-2.5 text-left group">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-foreground leading-tight">
                  Aprenda fazendo, não só assistindo
                </p>
                <p className="text-[9px] text-muted-foreground leading-snug mt-0.5">
                  17 ferramentas científicas · Retenção 75% maior · Tudo conectado a este vídeo
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-display flex items-center gap-2"><Layers className="w-5 h-5 text-primary" /> Todas as ferramentas</SheetTitle>
              <SheetDescription>17 ferramentas científicas. Tudo contextualizado para este módulo — você volta ao vídeo com 1 toque.</SheetDescription>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-2 mt-5">
              {ALL_TOOLS.map((t) => (
                <button
                  key={t.title + t.path}
                  onClick={() => go(t.path)}
                  className="p-3 rounded-2xl glass-card border border-border/30 hover:border-primary/40 hover:shadow-warm transition-all text-left"
                >
                  {t.title === "AlegrIA" ? (
                    <img src={ALEGRIA_AVATAR_URL} alt="AlegrIA" className="w-10 h-10 rounded-xl object-cover mb-2 ring-1 ring-primary/30" />
                  ) : (
                    <span className={`icon-tile-premium w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${t.accent}`}><t.Icon className="w-4 h-4" strokeWidth={1.75} /></span>
                  )}
                  <p className="font-display font-bold text-sm">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1">
        <TabsList className="grid grid-cols-3 h-9 mb-2">
          <TabsTrigger value="atalhos" className="text-[11px]">Atalhos</TabsTrigger>
          <TabsTrigger value="quiz" className="text-[11px]">Quiz</TabsTrigger>
          <TabsTrigger value="flash" className="text-[11px]">Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="atalhos" className="m-0 space-y-1.5">
          {SHORTCUTS.map((act, i) => (
            <motion.button
              key={act.title}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => go(act.path)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-all text-left group border border-transparent hover:border-border/40"
            >
              {act.title === "AlegrIA" ? (
                <img src={ALEGRIA_AVATAR_URL} alt="AlegrIA" className="w-9 h-9 rounded-lg object-cover group-hover:scale-105 transition-transform ring-1 ring-primary/30" />
              ) : (
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center bg-muted/60 group-hover:scale-105 transition-transform ${act.accent}`}><act.Icon className="w-4 h-4" strokeWidth={1.75} /></span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">{act.title}</p>
                <p className="text-[11px] text-muted-foreground">{act.desc}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </motion.button>
          ))}
          <button
            onClick={() => go("/alegria")}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl gradient-institute text-primary-foreground text-xs font-bold shadow-warm hover:shadow-glow transition-shadow"
          >
            <img src={ALEGRIA_AVATAR_URL} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-primary-foreground/40" />
            Pergunte à AlegrIA sobre esta aula
          </button>
        </TabsContent>

        <TabsContent value="quiz" className="m-0 rounded-2xl border border-border/30 bg-muted/20">
          <InlineQuiz moduleId={moduleId} onOpenFull={() => go("/quiz")} />
        </TabsContent>

        <TabsContent value="flash" className="m-0 rounded-2xl border border-border/30 bg-muted/20">
          <InlineFlashcards moduleId={moduleId} onOpenFull={() => go("/flashcards")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
