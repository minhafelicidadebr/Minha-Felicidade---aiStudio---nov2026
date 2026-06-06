import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { quizQuestions, modules } from "@/data/courseData";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Trophy, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
// AlegriaFAB import
import { useProgress } from "@/hooks/useProgress";
import { useXPBurst, ConfettiCelebration, EncouragementBubble } from "@/components/learning/LearningFX";
import { useNeonFX } from "@/components/learning/NeonConfettiFX";

export default function QuizPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeModule = searchParams.get("module");
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [finished, setFinished] = useState(false);
  const [encourageTrigger, setEncourageTrigger] = useState(0);
  const { trackActivity } = useProgress();
  const xpFx = useXPBurst();
  const neonFx = useNeonFX();
  const [wrongShake, setWrongShake] = useState(0);

  const questions = useMemo(() => quizQuestions.filter((q) => q.level === level && (!activeModule || q.module === activeModule)), [level, activeModule]);
  const current = questions[currentIdx];

  const handleSelect = (idx: number, e?: React.MouseEvent) => {
    if (showResult) return;
    setSelected(idx);
    setShowResult(true);
    const ev = e ? { clientX: e.clientX, clientY: e.clientY } : undefined;
    if (idx === current.correctIndex) {
      const gained = level * 10;
      setScore((s) => s + 1);
      setXp((x) => x + gained);
      xpFx.trigger(gained, ev);
      neonFx.correct(ev);
      setEncourageTrigger(t => t + 1);
    } else {
      neonFx.wrong(ev);
      setWrongShake(t => t + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setShowResult(false);
    } else {
      setFinished(true);
      // Track quiz completion
      const moduleId = activeModule || questions[0]?.module || "general";
      trackActivity({
        moduleId,
        activityType: "quiz",
        activityId: `quiz-l${level}-${moduleId}`,
        score: Math.round((score / questions.length) * 100),
        data: { level, score, total: questions.length },
      });
    }
  };

  const restart = (newLevel?: 1 | 2 | 3) => {
    if (newLevel) setLevel(newLevel);
    setCurrentIdx(0);
    setSelected(null);
    setShowResult(false);
    setScore(0);
    setFinished(false);
  };

  const availableModules = useMemo(() => [...new Set(quizQuestions.map(q => q.module))], []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-display font-bold">🎯 Quiz Adaptativo</h1>
              <p className="text-muted-foreground mt-1">Teste seus conhecimentos em 3 níveis</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20" aria-label={`${xp} pontos de experiência`}>
              <Zap className="w-4 h-4 text-secondary" />
              <span className="font-bold text-sm">{xp} XP</span>
            </div>
          </div>

          {/* Module filter */}
          <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filtrar por módulo">
            <button onClick={() => { setSearchParams({}); restart(); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!activeModule ? "gradient-warm text-primary-foreground shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>Todos</button>
            {availableModules.map(mid => {
              const m = modules.find(mod => mod.id === mid);
              return m ? <button key={mid} onClick={() => { setSearchParams({ module: mid }); restart(); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeModule === mid ? "gradient-warm text-primary-foreground shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`} aria-pressed={activeModule === mid}>{m.icon} M{m.number}</button> : null;
            })}
          </div>

          {/* Level selector */}
          <div className="flex gap-2 mb-8" role="group" aria-label="Selecionar nível de dificuldade">
            {([1, 2, 3] as const).map((l) => (
              <button key={l} onClick={() => restart(l)} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${level === l ? "gradient-warm text-primary-foreground shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`} aria-pressed={level === l}>Nível {l}</button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {questions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground" role="status">Nenhuma pergunta disponível para este filtro/nível.</div>
            ) : finished ? (
              <motion.div key="finished" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 bg-card rounded-2xl shadow-warm" role="status" aria-live="polite">
                <Trophy className="w-16 h-16 mx-auto text-secondary mb-4" />
                <h2 className="text-3xl font-display font-bold mb-2">{score}/{questions.length} corretas!</h2>
                <p className="text-muted-foreground mb-2">Nível {level} completado</p>
                <p className="text-lg font-semibold text-primary mb-8">+{xp} XP ganhos</p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => restart()} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors font-medium"><RotateCcw className="w-4 h-4" /> Refazer</button>
                  {level < 3 && <button onClick={() => restart((level + 1) as 1 | 2 | 3)} className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-warm text-primary-foreground font-semibold shadow-warm">Nível {level + 1} <ArrowRight className="w-4 h-4" /></button>}
                </div>
              </motion.div>
            ) : current ? (
              <motion.div
                key={current.id + "-" + wrongShake}
                initial={{ opacity: 0, x: 30 }}
                animate={wrongShake > 0 && showResult && selected !== current.correctIndex
                  ? { opacity: 1, x: [0, -12, 12, -8, 8, -4, 4, 0] }
                  : { opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: wrongShake > 0 ? 0.5 : 0.3 }}
                className="bg-card rounded-2xl p-8 shadow-warm"
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm text-muted-foreground">Pergunta {currentIdx + 1} de {questions.length}</span>
                  <span className="text-sm font-medium text-primary">{score} corretas</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full mb-8" role="progressbar" aria-valuenow={currentIdx + 1} aria-valuemax={questions.length}><div className="h-full gradient-warm rounded-full transition-all duration-500" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} /></div>
                {(() => { const m = modules.find(mod => mod.id === current.module); return m ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold mb-4">{m.icon} Módulo {m.number}</span> : null; })()}
                <h3 className="text-xl font-display font-bold mb-6">{current.question}</h3>
                <div className="space-y-3 mb-6" role="radiogroup" aria-label="Opções de resposta">
                  {current.options.map((opt, i) => {
                    let classes = "w-full text-left p-4 rounded-xl border-2 transition-all text-sm font-medium ";
                    if (!showResult) classes += "border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer";
                    else if (i === current.correctIndex) classes += "border-success bg-success/10 text-foreground";
                    else if (i === selected) classes += "border-destructive bg-destructive/10 text-foreground";
                    else classes += "border-border opacity-50";
                    return (
                      <button key={i} onClick={(e) => handleSelect(i, e)} className={classes} role="radio" aria-checked={selected === i} disabled={showResult}>
                        <div className="flex items-start gap-3">
                          {showResult && i === current.correctIndex && <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />}
                          {showResult && i === selected && i !== current.correctIndex && <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}
                          <span>{opt}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {showResult && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-muted rounded-xl p-4 mb-6" role="alert">
                    <p className="text-sm leading-relaxed">{current.explanation}</p>
                    {current.source && <a href={current.source} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 inline-block">📎 Fonte verificável</a>}
                  </motion.div>
                )}
                {showResult && (
                  <button onClick={handleNext} className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-warm text-primary-foreground font-semibold shadow-warm ml-auto">
                    {currentIdx < questions.length - 1 ? "Próxima" : "Ver resultado"} <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>
      {xpFx.node}
      {neonFx.node}
      <EncouragementBubble trigger={encourageTrigger} />
      <ConfettiCelebration active={finished && score / Math.max(1, questions.length) >= 0.7} />
    </div>
  );
}
