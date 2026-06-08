import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

const ACTS = [
  {
    n: "01",
    chapter: "A Dor",
    title: "Você foi vendido um mapa errado.",
    body: "Mais notas, mais seguidores, mais conquistas. O ponteiro nunca se move. A adaptação hedônica engole tudo (Brickman & Campbell, 1971).",
    accent: "from-rose-500/30 via-orange-500/20 to-transparent",
  },
  {
    n: "02",
    chapter: "A Descoberta",
    title: "Yale rastreou 50 anos de ciência.",
    body: "O curso mais popular da história da universidade encontrou 6 práticas com efeito clínico mensurável — chamou de Rewirements.",
    accent: "from-amber-500/30 via-yellow-500/20 to-transparent",
  },
  {
    n: "03",
    chapter: "As Micro-Vitórias",
    title: "30 dias. 6 práticas. Um cérebro novo.",
    body: "Gratidão, conexão, savoring, sono, exercício, bondade. Cada uma com edge function, evidência citada e gamificação que respeita sua autonomia (SDT · Deci & Ryan).",
    accent: "from-emerald-500/30 via-teal-500/20 to-transparent",
  },
  {
    n: "04",
    chapter: "A Identidade Nova",
    title: "Você não 'tenta ser feliz'. Você vira alguém que pratica.",
    body: "Implementation Intentions (Gollwitzer, 1999) + Growth Mindset (Dweck, 2006) + WOOP (Oettingen, 2014). Mudança que dura porque é arquitetura, não força de vontade.",
    accent: "from-violet-500/30 via-fuchsia-500/20 to-transparent",
  },
];

/**
 * Innovation #3 — Scroll-driven narrative (Apple-style).
 * Four acts: Pain → Discovery → Micro-victories → New identity.
 * Uses scroll progress to scrub between chapters, ending with emotional CTA.
 */
export default function WellbeingScrollStory() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Background hue rotates with progress
  const hue = useTransform(scrollYProgress, [0, 1], [0, 280]);
  const bgGlow = useTransform(hue, (h) => `radial-gradient(circle at 50% 50%, hsl(${h}, 70%, 50%, 0.18), transparent 60%)`);

  return (
    <section
      ref={ref}
      className="relative"
      style={{ height: reduce ? "auto" : `${ACTS.length * 100}vh` }}
      aria-label="Trilha de transformação do bem-estar"
    >
      <div className={`${reduce ? "" : "sticky top-0"} h-screen overflow-hidden flex items-center justify-center`}>
        {/* Animated background */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: bgGlow }}
        />
        <div className="absolute inset-0 noise opacity-[0.08] mix-blend-overlay pointer-events-none" />

        {/* Progress rail */}
        <div className="absolute left-6 md:left-12 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
          {ACTS.map((_, i) => {
            const start = i / ACTS.length;
            const end = (i + 1) / ACTS.length;
            const opacity = useTransform(scrollYProgress, [start, (start + end) / 2, end], [0.3, 1, 0.3]);
            const scale = useTransform(scrollYProgress, [start, (start + end) / 2, end], [1, 1.5, 1]);
            return (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-primary"
                style={{ opacity, scale }}
              />
            );
          })}
        </div>

        {/* Acts */}
        <div className="relative container max-w-4xl text-center px-6">
          {ACTS.map((act, i) => {
            const start = i / ACTS.length;
            const peak = (i + 0.5) / ACTS.length;
            const end = (i + 1) / ACTS.length;
            const opacity = useTransform(
              scrollYProgress,
              [Math.max(0, start - 0.05), start, peak, end, Math.min(1, end + 0.05)],
              [0, 1, 1, 1, 0]
            );
            const y = useTransform(scrollYProgress, [start, peak, end], [40, 0, -40]);
            const scale = useTransform(scrollYProgress, [start, peak, end], [0.95, 1, 0.95]);

            return (
              <motion.div
                key={act.n}
                style={reduce ? undefined : { opacity, y, scale }}
                className={reduce ? "mb-24" : "absolute inset-0 flex flex-col items-center justify-center"}
              >
                {/* Soft accent wash */}
                <div className={`absolute inset-0 bg-gradient-radial ${act.accent} opacity-50 pointer-events-none`} />
                <div className="relative">
                  <div className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-[0.3em] mb-3">
                    Ato {act.n} · {act.chapter}
                  </div>
                  <h3 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.05] mb-6 tracking-tight">
                    {act.title}
                  </h3>
                  <p className="text-base md:text-xl text-foreground/75 max-w-2xl mx-auto leading-relaxed">
                    {act.body}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Scroll hint (only on first act) */}
        {!reduce && (
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-2"
            style={{ opacity: useTransform(scrollYProgress, [0, 0.1], [1, 0]) }}
          >
            <span>Role para viver a jornada</span>
            <motion.span
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >↓</motion.span>
          </motion.div>
        )}
      </div>
    </section>
  );
}
