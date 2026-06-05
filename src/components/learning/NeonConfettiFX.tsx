/**
 * NeonConfettiFX — Global cinematic feedback layer
 * Style: Neon Confetti (cyan #67e8f9, violet #a78bfa, pink #f9a8d4)
 * Intensity: 5 (max) — combo counter, shockwave rings, neon particles, screen flash
 */
import { useState, useCallback, ReactNode, MouseEvent, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NEON = ["#67e8f9", "#a78bfa", "#f9a8d4", "#a5f3fc", "#c4b5fd"];

type Burst = {
  id: number;
  x: number;
  y: number;
  kind: "correct" | "wrong" | "combo";
  combo?: number;
};

/* -------- Single neon burst node -------- */
function NeonBurst({ burst, onDone }: { burst: Burst; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  const isWrong = burst.kind === "wrong";
  const particleCount = isWrong ? 8 : burst.kind === "combo" ? 28 : 18;

  return (
    <div className="fixed pointer-events-none z-[250]" style={{ left: burst.x, top: burst.y }}>
      {/* Shockwave rings */}
      {!isWrong && [0, 1, 2].map((i) => (
        <motion.span
          key={`ring-${i}`}
          className="absolute rounded-full border-2"
          style={{
            left: 0, top: 0, translate: "-50% -50%",
            borderColor: NEON[i % NEON.length],
            boxShadow: `0 0 24px ${NEON[i % NEON.length]}`,
          }}
          initial={{ width: 0, height: 0, opacity: 0.9 }}
          animate={{ width: 220 + i * 60, height: 220 + i * 60, opacity: 0 }}
          transition={{ duration: 1.1, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}

      {/* Wrong: red dissolve ring */}
      {isWrong && (
        <motion.span
          className="absolute rounded-full border-2"
          style={{
            left: 0, top: 0, translate: "-50% -50%",
            borderColor: "hsl(0 90% 65%)",
            boxShadow: "0 0 24px hsl(0 90% 65%)",
          }}
          initial={{ width: 0, height: 0, opacity: 0.9 }}
          animate={{ width: 140, height: 140, opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      )}

      {/* Particles */}
      {Array.from({ length: particleCount }).map((_, i) => {
        const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 70 + Math.random() * (isWrong ? 40 : 120);
        const color = isWrong ? "hsl(0 90% 65%)" : NEON[i % NEON.length];
        const size = isWrong ? 4 : 6 + Math.random() * 6;
        return (
          <motion.span
            key={i}
            className="absolute rounded-sm"
            style={{
              left: 0, top: 0,
              width: size, height: size,
              background: color,
              boxShadow: `0 0 ${size * 2}px ${color}`,
              translate: "-50% -50%",
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist + (isWrong ? 40 : 60),
              opacity: 0,
              scale: 0.3,
              rotate: 360 + Math.random() * 180,
            }}
            transition={{ duration: 1.2 + Math.random() * 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        );
      })}

      {/* Combo number popup */}
      {burst.kind === "combo" && burst.combo && burst.combo >= 2 && (
        <motion.div
          className="absolute font-display font-black text-5xl whitespace-nowrap"
          style={{
            left: 0, top: -20, translate: "-50% -100%",
            color: "#f9a8d4",
            textShadow: "0 0 24px #a78bfa, 0 0 48px #67e8f9",
          }}
          initial={{ scale: 0.3, opacity: 0, y: 20 }}
          animate={{ scale: [0.3, 1.4, 1], opacity: [0, 1, 0], y: -40 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        >
          x{burst.combo} COMBO!
        </motion.div>
      )}
    </div>
  );
}

/* -------- Screen edge flash on combo milestone -------- */
function ScreenFlash({ active, color }: { active: boolean; color: string }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-[240]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.4, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            background: `radial-gradient(circle at 50% 50%, transparent 40%, ${color} 100%)`,
          }}
        />
      )}
    </AnimatePresence>
  );
}

/* -------- Persistent combo badge (top-right) -------- */
export function ComboBadge({ combo }: { combo: number }) {
  return (
    <AnimatePresence>
      {combo >= 2 && (
        <motion.div
          initial={{ scale: 0, opacity: 0, x: 30 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 18 }}
          className="fixed top-24 right-6 z-[200] px-4 py-2 rounded-2xl font-display font-black text-lg flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, rgba(167,139,250,0.95), rgba(249,168,212,0.95))",
            color: "#0a0a1a",
            boxShadow: "0 0 32px rgba(103,232,249,0.6), 0 0 64px rgba(167,139,250,0.4)",
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          <motion.span
            animate={{ rotate: [0, -10, 10, -5, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.5 }}
          >
            ⚡
          </motion.span>
          <span>{combo}x COMBO</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* -------- Master hook -------- */
export function useNeonFX() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [combo, setCombo] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const comboRef = useRef(0);
  const idRef = useRef(0);

  const getXY = (e?: MouseEvent | { clientX: number; clientY: number }) => ({
    x: e?.clientX ?? window.innerWidth / 2,
    y: e?.clientY ?? window.innerHeight / 2,
  });

  const correct = useCallback((e?: MouseEvent | { clientX: number; clientY: number }) => {
    const { x, y } = getXY(e);
    comboRef.current += 1;
    const c = comboRef.current;
    setCombo(c);
    const id = ++idRef.current;
    setBursts((b) => [...b, { id, x, y, kind: c >= 2 ? "combo" : "correct", combo: c }]);
    if (c >= 3 && c % 3 === 0) {
      setFlash("rgba(167,139,250,0.5)");
      setTimeout(() => setFlash(null), 600);
    }
  }, []);

  const wrong = useCallback((e?: MouseEvent | { clientX: number; clientY: number }) => {
    const { x, y } = getXY(e);
    comboRef.current = 0;
    setCombo(0);
    const id = ++idRef.current;
    setBursts((b) => [...b, { id, x, y, kind: "wrong" }]);
  }, []);

  const reset = useCallback(() => {
    comboRef.current = 0;
    setCombo(0);
  }, []);

  const node: ReactNode = (
    <>
      <ComboBadge combo={combo} />
      <ScreenFlash active={!!flash} color={flash || "transparent"} />
      {bursts.map((b) => (
        <NeonBurst key={b.id} burst={b} onDone={() => setBursts((p) => p.filter((x) => x.id !== b.id))} />
      ))}
    </>
  );

  return { correct, wrong, reset, combo, node };
}
