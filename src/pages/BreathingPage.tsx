import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, Pause, RotateCcw, Wind, Timer, Sparkles, Info } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useProgress } from "@/hooks/useProgress";

const TECHNIQUES = [
  { id: "478", name: "4-7-8 Relaxante", description: "Inspire 4s, segure 7s, expire 8s. Ativa o sistema nervoso parassimpático.", inhale: 4, hold: 7, exhale: 8, color: "from-blue-500 to-indigo-600", bgColor: "from-blue-500/10 to-indigo-500/10", ringColor: "rgba(99,102,241,0.4)", science: "Reduz cortisol em até 23% (Ma et al., 2017)", benefit: "Ideal para dormir melhor e reduzir ansiedade" },
  { id: "box", name: "Box Breathing", description: "4 tempos iguais. Usado por Navy SEALs para manter calma sob pressão.", inhale: 4, hold: 4, exhale: 4, holdOut: 4, color: "from-emerald-500 to-teal-600", bgColor: "from-emerald-500/10 to-teal-500/10", ringColor: "rgba(20,184,166,0.4)", science: "Melhora variabilidade cardíaca (Zaccaro et al., 2018)", benefit: "Perfeito para foco e controle em momentos de pressão" },
  { id: "calm", name: "Respiração Calmante", description: "Expire o dobro do que inspira. Simples e poderoso.", inhale: 4, hold: 2, exhale: 8, color: "from-purple-500 to-pink-600", bgColor: "from-purple-500/10 to-pink-500/10", ringColor: "rgba(168,85,247,0.4)", science: "Ativa nervo vago e reduz ansiedade (Gerritsen & Band, 2018)", benefit: "Melhor para iniciantes e momentos de estresse agudo" },
];

type Phase = "inhale" | "hold" | "exhale" | "holdOut" | "idle";
const phaseLabel: Record<Phase, string> = { inhale: "Inspire", hold: "Segure", exhale: "Expire", holdOut: "Segure", idle: "Pronto?" };

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
  const [showTip, setShowTip] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseIdxRef = useRef(0);
  const tech = TECHNIQUES[techIdx];

  const phases = useMemo(() => {
    const techniquePhases: { phase: Phase; duration: number }[] = [
      { phase: "inhale", duration: tech.inhale },
      { phase: "hold", duration: tech.hold },
      { phase: "exhale", duration: tech.exhale },
    ];
    if ("holdOut" in tech && tech.holdOut) techniquePhases.push({ phase: "holdOut", duration: tech.holdOut });
    return techniquePhases;
  }, [tech]);

  useEffect(() => {
    if (!playing) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    phaseIdxRef.current = 0;
    setPhase(phases[0].phase);
    setSecondsLeft(phases[0].duration);
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          phaseIdxRef.current++;
          if (phaseIdxRef.current >= phases.length) { phaseIdxRef.current = 0; setCycles(c => c + 1); }
          const next = phases[phaseIdxRef.current];
          setPhase(next.phase);
          return next.duration;
        }
        return prev - 1;
      });
      setTotalSeconds(t => t + 1);
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, phases]);

  const handleStop = () => {
    setPlaying(false); setPhase("idle");
    if (cycles > 0) trackActivity({ moduleId, activityType: "breathing", activityId: tech.id, data: { cycles, totalSeconds, technique: tech.name } });
  };
  const handleReset = () => { handleStop(); setCycles(0); setTotalSeconds(0); };

  const circleScale = phase === "inhale" ? 1.5 : phase === "exhale" ? 0.65 : 1;
  const circleDuration = phase === "inhale" ? tech.inhale : phase === "exhale" ? tech.exhale : 0.5;

  // Progress ring for current phase
  const currentPhaseDef = phases[phaseIdxRef.current] || phases[0];
  const phaseProgress = playing ? 1 - (secondsLeft / currentPhaseDef.duration) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-3xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header with gradient background */}
          <div className={`relative rounded-3xl p-8 mb-8 bg-gradient-to-br ${tech.bgColor} border border-border/30 overflow-hidden`}>
            <div className="absolute inset-0 noise opacity-30 pointer-events-none" />
            <div className="relative text-center">
              <motion.span className="text-6xl mb-3 block" animate={{ rotateY: playing ? 360 : 0 }} transition={{ duration: 3, repeat: playing ? Infinity : 0 }}>🧘</motion.span>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Respiração Consciente</h1>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">Técnicas de respiração baseadas em neurociência para regular emoções e melhorar o foco</p>
            </div>
          </div>

          {/* Technique Selector — premium cards */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {TECHNIQUES.map((t, i) => (
              <motion.button
                key={t.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { if (!playing) setTechIdx(i); }}
                className={`relative p-4 rounded-2xl text-center transition-all overflow-hidden ${
                  i === techIdx
                    ? `bg-gradient-to-br ${t.bgColor} border-2 border-primary/30 shadow-warm`
                    : "glass-card hover:shadow-warm border border-border/30"
                }`}
              >
                {i === techIdx && <div className="absolute inset-0 shimmer pointer-events-none" />}
                <span className="font-display font-bold text-sm block relative z-10">{t.name}</span>
                <span className="text-[10px] text-muted-foreground block mt-1 relative z-10">{t.benefit}</span>
              </motion.button>
            ))}
          </div>

          {/* Breathing Circle — premium version */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-72 h-72 flex items-center justify-center">
              {/* Pulsing rings */}
              {[0, 1, 2].map(ring => (
                <motion.div
                  key={ring}
                  className="absolute rounded-full border"
                  style={{ borderColor: tech.ringColor, inset: `${ring * 12}px` }}
                  animate={playing ? { scale: [1, circleScale * (1 - ring * 0.05), 1], opacity: [0.3, 0.6 - ring * 0.15, 0.3] } : { scale: 1, opacity: 0.15 }}
                  transition={{ duration: circleDuration * 2, repeat: Infinity, ease: "easeInOut", delay: ring * 0.2 }}
                />
              ))}

              {/* Outer glow */}
              <motion.div
                className={`absolute inset-0 rounded-full bg-gradient-to-br ${tech.bgColor} blur-2xl`}
                animate={{ scale: circleScale * 1.1, opacity: playing ? 0.6 : 0.2 }}
                transition={{ duration: circleDuration, ease: "easeInOut" }}
              />

              {/* Main circle with progress ring */}
              <motion.div
                className="absolute inset-10 rounded-full glass-card border border-border/50 flex flex-col items-center justify-center z-10 shadow-lg"
                animate={{ scale: circleScale * 0.85 }}
                transition={{ duration: circleDuration, ease: "easeInOut" }}
              >
                {/* SVG progress ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--border))" strokeWidth="2" opacity="0.3" />
                  {playing && (
                    <motion.circle
                      cx="50" cy="50" r="46" fill="none"
                      stroke={tech.ringColor}
                      strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${phaseProgress * 289} 289`}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </svg>
                <motion.span
                  className="text-4xl font-bold font-display"
                  key={phase}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  {phaseLabel[phase]}
                </motion.span>
                {playing && (
                  <motion.span
                    className={`text-5xl font-bold bg-gradient-to-r ${tech.color} bg-clip-text text-transparent mt-1`}
                    key={secondsLeft}
                    initial={{ scale: 1.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    {secondsLeft}
                  </motion.span>
                )}
              </motion.div>

              {/* Orbiting particles */}
              {playing && [0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{ background: tech.ringColor, top: "50%", left: "50%", transformOrigin: `${50 + i * 15}px 0` }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "linear" }}
                />
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => playing ? handleStop() : setPlaying(true)}
              className={`flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-lg shadow-warm transition-all ${
                playing ? "bg-destructive text-destructive-foreground" : "gradient-institute text-primary-foreground hover:shadow-glow"
              }`}
            >
              {playing ? <><Pause className="w-5 h-5" /> Pausar</> : <><Play className="w-5 h-5" /> Iniciar</>}
            </motion.button>
            <button onClick={handleReset} className="p-4 rounded-2xl glass-card hover:shadow-warm transition-all" aria-label="Reiniciar">
              <RotateCcw className="w-5 h-5" />
            </button>
            <button onClick={() => setShowTip(!showTip)} className="p-4 rounded-2xl glass-card hover:shadow-warm transition-all" aria-label="Dicas">
              <Info className="w-5 h-5" />
            </button>
          </div>

          {/* Tip panel */}
          <AnimatePresence>
            {showTip && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6">
                <div className="glass-card rounded-2xl p-5 border border-primary/10">
                  <h3 className="font-display font-bold text-sm mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Dica de Prática</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Sente-se confortavelmente com a coluna ereta. Feche os olhos suavemente. Coloque a ponta da língua atrás dos dentes superiores. Respire pelo nariz e expire pela boca. Foque apenas no ritmo da respiração.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats — premium glass cards */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: <Wind className="w-5 h-5 text-primary" />, value: cycles, label: "Ciclos" },
              { icon: <Timer className="w-5 h-5 text-secondary" />, value: `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`, label: "Tempo total" },
              { icon: <Sparkles className="w-5 h-5 text-accent" />, value: `+${cycles * 5}`, label: "XP ganho" },
            ].map((s, i) => (
              <motion.div key={i} className="glass-card rounded-2xl p-4 text-center border border-border/30" whileHover={{ y: -2 }}>
                <div className="mb-1 flex justify-center">{s.icon}</div>
                <span className="text-2xl font-bold font-display block">{s.value}</span>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Science Note — premium */}
          <div className={`rounded-3xl p-6 bg-gradient-to-br ${tech.bgColor} border border-border/30 relative overflow-hidden`}>
            <div className="absolute inset-0 noise opacity-20 pointer-events-none" />
            <div className="relative">
              <h3 className="font-display font-bold text-lg mb-1">{tech.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{tech.description}</p>
              <div className="p-3 rounded-xl bg-background/60 backdrop-blur-sm border border-primary/10">
                <p className="text-xs font-semibold text-primary">📎 Evidência: {tech.science}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
