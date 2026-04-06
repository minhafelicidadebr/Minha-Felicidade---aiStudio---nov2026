import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, Pause, RotateCcw, Wind, Timer, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useProgress } from "@/hooks/useProgress";

const TECHNIQUES = [
  { id: "478", name: "4-7-8 Relaxante", description: "Inspire 4s, segure 7s, expire 8s. Ativa o sistema nervoso parassimpático.", inhale: 4, hold: 7, exhale: 8, color: "from-blue-500/20 to-indigo-500/20", science: "Reduz cortisol em até 23% (Ma et al., 2017)" },
  { id: "box", name: "Box Breathing", description: "4 tempos iguais. Usado por Navy SEALs para manter calma sob pressão.", inhale: 4, hold: 4, exhale: 4, holdOut: 4, color: "from-emerald-500/20 to-teal-500/20", science: "Melhora variabilidade cardíaca (Zaccaro et al., 2018)" },
  { id: "calm", name: "Respiração Calmante", description: "Expire o dobro do que inspira. Simples e poderoso.", inhale: 4, hold: 2, exhale: 8, color: "from-purple-500/20 to-pink-500/20", science: "Ativa nervo vago e reduz ansiedade (Gerritsen & Band, 2018)" },
];

type Phase = "inhale" | "hold" | "exhale" | "holdOut" | "idle";

const phaseLabel: Record<Phase, string> = { inhale: "Inspire", hold: "Segure", exhale: "Expire", holdOut: "Segure (vazio)", idle: "Pronto?" };
const phaseEmoji: Record<Phase, string> = { inhale: "🌬️", hold: "✨", exhale: "💨", holdOut: "🫧", idle: "🧘" };

export default function BreathingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const moduleId = searchParams.get("module") || "mentiras";
  const { trackActivity } = useProgress();
  const [techIdx, setTechIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tech = TECHNIQUES[techIdx];

  const getPhases = () => {
    const phases: { phase: Phase; duration: number }[] = [
      { phase: "inhale", duration: tech.inhale },
      { phase: "hold", duration: tech.hold },
      { phase: "exhale", duration: tech.exhale },
    ];
    if (tech.holdOut) phases.push({ phase: "holdOut", duration: tech.holdOut });
    return phases;
  };

  const phaseIdxRef = useRef(0);

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    const phases = getPhases();
    phaseIdxRef.current = 0;
    setPhase(phases[0].phase);
    setSecondsLeft(phases[0].duration);

    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          phaseIdxRef.current++;
          if (phaseIdxRef.current >= phases.length) {
            phaseIdxRef.current = 0;
            setCycles(c => c + 1);
          }
          const next = phases[phaseIdxRef.current];
          setPhase(next.phase);
          return next.duration;
        }
        return prev - 1;
      });
      setTotalSeconds(t => t + 1);
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, techIdx]);

  const handleStop = () => {
    setPlaying(false);
    setPhase("idle");
    if (cycles > 0) {
      trackActivity({ moduleId, activityType: "breathing", activityId: tech.id, data: { cycles, totalSeconds, technique: tech.name } });
    }
  };

  const handleReset = () => {
    handleStop();
    setCycles(0);
    setTotalSeconds(0);
  };

  const circleScale = phase === "inhale" ? 1.4 : phase === "exhale" ? 0.7 : 1;
  const circleDuration = phase === "inhale" ? tech.inhale : phase === "exhale" ? tech.exhale : 0.5;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-3xl">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <header className="text-center mb-8">
            <span className="text-5xl mb-3 block">🧘</span>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Respiração Consciente</h1>
            <p className="text-muted-foreground">Técnicas de respiração baseadas em neurociência para regular emoções</p>
          </header>

          {/* Technique Selector */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {TECHNIQUES.map((t, i) => (
              <button
                key={t.id}
                onClick={() => { if (!playing) setTechIdx(i); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${i === techIdx ? "bg-primary text-primary-foreground shadow-warm" : "glass-card hover:shadow-warm"}`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* Breathing Circle */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-64 h-64 flex items-center justify-center">
              {/* Outer glow rings */}
              <motion.div
                className={`absolute inset-0 rounded-full bg-gradient-to-br ${tech.color} blur-xl`}
                animate={{ scale: circleScale * 1.2, opacity: playing ? 0.5 : 0.2 }}
                transition={{ duration: circleDuration, ease: "easeInOut" }}
              />
              <motion.div
                className={`absolute inset-4 rounded-full bg-gradient-to-br ${tech.color}`}
                animate={{ scale: circleScale, opacity: playing ? 0.7 : 0.3 }}
                transition={{ duration: circleDuration, ease: "easeInOut" }}
              />
              {/* Inner circle */}
              <motion.div
                className="absolute inset-8 rounded-full glass-card border border-border/50 flex flex-col items-center justify-center z-10"
                animate={{ scale: circleScale * 0.9 }}
                transition={{ duration: circleDuration, ease: "easeInOut" }}
              >
                <span className="text-3xl mb-1">{phaseEmoji[phase]}</span>
                <span className="font-display font-bold text-xl">{phaseLabel[phase]}</span>
                {playing && <span className="text-3xl font-bold text-primary mt-1">{secondsLeft}</span>}
              </motion.div>
              {/* Orbiting particles */}
              {playing && [0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full bg-primary/40"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "linear" }}
                  style={{ top: "50%", left: "50%", transformOrigin: `${60 + i * 20}px 0` }}
                />
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {!playing ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPlaying(true)}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl gradient-institute text-primary-foreground font-bold shadow-warm hover:shadow-glow transition-shadow"
              >
                <Play className="w-5 h-5" /> Iniciar
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStop}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-destructive text-destructive-foreground font-bold shadow-warm transition-shadow"
              >
                <Pause className="w-5 h-5" /> Pausar
              </motion.button>
            )}
            <button onClick={handleReset} className="p-3 rounded-xl glass-card hover:shadow-warm transition-all">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="glass-card rounded-2xl p-4 text-center">
              <Wind className="w-5 h-5 mx-auto mb-1 text-primary" />
              <span className="text-2xl font-bold font-display">{cycles}</span>
              <p className="text-xs text-muted-foreground">Ciclos</p>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center">
              <Timer className="w-5 h-5 mx-auto mb-1 text-secondary" />
              <span className="text-2xl font-bold font-display">{Math.floor(totalSeconds / 60)}:{String(totalSeconds % 60).padStart(2, "0")}</span>
              <p className="text-xs text-muted-foreground">Tempo total</p>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center">
              <Sparkles className="w-5 h-5 mx-auto mb-1 text-accent" />
              <span className="text-2xl font-bold font-display">+{cycles * 5}</span>
              <p className="text-xs text-muted-foreground">XP ganho</p>
            </div>
          </div>

          {/* Science Note */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display font-bold mb-1">{tech.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">{tech.description}</p>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-xs font-semibold text-primary">📎 Evidência: {tech.science}</p>
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
