/**
 * LearningFX — Master-plus instructional design effects kit
 * 18 sprints of disruptive visual learning components
 * Built with neuroscience-of-learning principles (dopamine loops, pattern recognition, peak-end rule)
 */
import { useEffect, useRef, useState, ReactNode, MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, Flame, Brain, Zap, Target, Star } from "lucide-react";

/* ============= Sprint 1: Neural Background ============= */
export function NeuralBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 -z-10 overflow-hidden pointer-events-none ${className}`}>
      <div className="absolute inset-0 neural-bg opacity-60" />
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="neural-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="30" cy="30" r="1.5" fill="hsl(var(--primary))" />
            <line x1="30" y1="30" x2="90" y2="30" stroke="hsl(var(--primary))" strokeWidth="0.3" />
            <line x1="30" y1="30" x2="30" y2="90" stroke="hsl(var(--primary))" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#neural-grid)" />
      </svg>
    </div>
  );
}

/* ============= Sprint 2: XP Burst Animation ============= */
export function XPBurst({ amount, x, y, onDone }: { amount: number; x: number; y: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed pointer-events-none z-[200]" style={{ left: x, top: y }}>
      <motion.div
        initial={{ y: 0, opacity: 1, scale: 0.8 }}
        animate={{ y: -80, opacity: 0, scale: 1.4 }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        className="font-display font-black text-2xl text-gradient-aurora drop-shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
      >
        +{amount} XP
      </motion.div>
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <span
            key={i}
            className="xp-particle"
            style={{
              left: 0, top: 0,
              ['--tx' as string]: `${Math.cos(angle) * 50}px`,
              ['--ty' as string]: `${Math.sin(angle) * 50}px`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ============= Sprint 3: Confetti Celebration ============= */
export function ConfettiCelebration({ active, count = 60 }: { active: boolean; count?: number }) {
  if (!active) return null;
  const colors = ['hsl(25 95% 53%)', 'hsl(45 100% 51%)', 'hsl(197 71% 40%)', 'hsl(152 60% 45%)'];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${Math.random() * 1.5}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </>
  );
}

/* ============= Sprint 4: Achievement Toast ============= */
export function AchievementToast({ title, description, icon, show, onClose }: {
  title: string; description: string; icon?: ReactNode; show: boolean; onClose: () => void;
}) {
  useEffect(() => {
    if (show) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }
  }, [show, onClose]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed top-24 right-6 z-[300] max-w-sm"
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="achievement-ring rounded-2xl">
            <div className="relative bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-premium">
              <div className="w-12 h-12 rounded-xl gradient-institute flex items-center justify-center text-primary-foreground glow-pulse shrink-0">
                {icon || <Trophy className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">🏆 Conquista desbloqueada</p>
                <h4 className="font-display font-bold text-sm">{title}</h4>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============= Sprint 5: Streak Fire Counter ============= */
export function StreakFire({ days }: { days: number }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/15 to-red-500/15 border border-orange-500/30">
      <span className="fire-flicker text-lg">🔥</span>
      <span className="font-display font-bold text-sm">{days} dias</span>
    </div>
  );
}

/* ============= Sprint 6: Animated Progress Ring ============= */
export function ProgressRing({ value, size = 80, label }: { value: number; size?: number; label?: string }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="progress-ring">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="url(#ring-gradient)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-lg">{Math.round(value)}%</span>
        {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}

/* ============= Sprint 7: Spotlight Follow Card ============= */
export function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    ref.current.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };
  return (
    <div ref={ref} onMouseMove={onMove} className={`spotlight relative ${className}`}>
      {children}
    </div>
  );
}

/* ============= Sprint 8: Encouragement Phrases (Neuromarketing) ============= */
const phrases = [
  "🧠 Seu cérebro está formando novas conexões neurais agora!",
  "⚡ Cada clique fortalece sua mielina cognitiva.",
  "🌱 Pequenos passos, transformações exponenciais.",
  "🎯 Você está no top 10% que escolhe crescer hoje.",
  "✨ Cientificamente comprovado: você está mais feliz após este momento.",
  "🚀 +1 micro-vitória. O efeito composto está trabalhando para você.",
  "💫 Esta sessão acabou de elevar sua dopamina de aprendizado.",
  "🏆 Resiliência se constrói exatamente assim — um momento por vez.",
];
export function EncouragementBubble({ trigger }: { trigger: number }) {
  const [phrase, setPhrase] = useState("");
  useEffect(() => {
    if (trigger > 0) setPhrase(phrases[Math.floor(Math.random() * phrases.length)]);
  }, [trigger]);
  return (
    <AnimatePresence>
      {phrase && (
        <motion.div
          key={trigger}
          initial={{ y: 30, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0 }}
          onAnimationComplete={() => setTimeout(() => setPhrase(""), 3500)}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] px-5 py-3 rounded-2xl glass shadow-premium border border-primary/20 max-w-md"
        >
          <p className="text-sm font-medium text-center">{phrase}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============= Sprint 9: Milestone Tracker ============= */
export function MilestoneTracker({ milestones, current }: { milestones: { label: string; value: number }[]; current: number }) {
  return (
    <div className="relative w-full py-4">
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2 rounded-full" />
      <div
        className="absolute top-1/2 left-0 h-1 gradient-institute -translate-y-1/2 rounded-full progress-shine transition-all duration-700"
        style={{ width: `${Math.min(100, (current / milestones[milestones.length - 1].value) * 100)}%` }}
      />
      <div className="relative flex justify-between">
        {milestones.map((m, i) => {
          const reached = current >= m.value;
          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                reached ? 'gradient-institute text-primary-foreground glow-pulse scale-110' : 'bg-muted text-muted-foreground border-2 border-border'
              }`}>
                {reached ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-semibold ${reached ? 'text-primary' : 'text-muted-foreground'}`}>{m.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============= Sprint 10: Brain Activity Pulse Icon ============= */
export function BrainPulse({ active = true }: { active?: boolean }) {
  return (
    <div className="relative inline-flex items-center justify-center w-12 h-12">
      {active && <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />}
      <Brain className="w-6 h-6 text-primary float-brain relative z-10" />
    </div>
  );
}

/* ============= Sprint 11-18 helpers exported for direct use ============= */
export { Sparkles, Trophy, Flame, Brain, Zap, Target, Star };

/* ============= Hook: useXPBurst ============= */
export function useXPBurst() {
  const [bursts, setBursts] = useState<{ id: number; amount: number; x: number; y: number }[]>([]);
  const trigger = (amount: number, e?: MouseEvent | { clientX: number; clientY: number }) => {
    const x = e?.clientX ?? window.innerWidth / 2;
    const y = e?.clientY ?? window.innerHeight / 2;
    const id = Date.now() + Math.random();
    setBursts(b => [...b, { id, amount, x, y }]);
  };
  const node = (
    <>
      {bursts.map(b => (
        <XPBurst key={b.id} amount={b.amount} x={b.x} y={b.y} onDone={() => setBursts(prev => prev.filter(p => p.id !== b.id))} />
      ))}
    </>
  );
  return { trigger, node };
}
