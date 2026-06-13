import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, MotionValue } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Quote } from "lucide-react";

const ACTS = [
  {
    n: "01",
    chapter: "A Dor",
    day: "Dia 0",
    title: "Você foi vendido um mapa errado.",
    body: "Mais notas, mais seguidores, mais conquistas. O ponteiro nunca se move. A adaptação hedônica engole tudo.",
    quote: "“Wanting is not the same as liking.”",
    quoteAuthor: "— Berridge, 1996",
    cite: "Brickman & Campbell (1971) · Hedonic Treadmill",
    accent: "from-rose-500/30 via-orange-500/20 to-transparent",
    metric: "73% dos jovens relatam ansiedade frequente",
  },
  {
    n: "02",
    chapter: "A Descoberta",
    day: "Dia 1",
    title: "Yale rastreou 50 anos de ciência.",
    body: "O curso mais popular da história da universidade encontrou 6 práticas com efeito clínico mensurável — chamou de Rewirements.",
    quote: "“What we think makes us happy is rarely what does.”",
    quoteAuthor: "— Laurie Santos, Yale",
    cite: "Santos (2018) · Yale OpenCourseWare",
    accent: "from-amber-500/30 via-yellow-500/20 to-transparent",
    metric: "+3.4 milhões de alunos · 6 práticas validadas",
  },
  {
    n: "03",
    chapter: "As Micro-Vitórias",
    day: "Dias 2-21",
    title: "30 dias. 6 práticas. Um cérebro novo.",
    body: "Gratidão, conexão, savoring, sono, exercício, bondade. Cada uma com edge function, evidência citada e gamificação que respeita sua autonomia.",
    quote: "“People do not decide to become extraordinary. They decide to accomplish extraordinary things.”",
    quoteAuthor: "— Edmund Hillary",
    cite: "Deci & Ryan (2000) · Self-Determination Theory",
    accent: "from-emerald-500/30 via-teal-500/20 to-transparent",
    metric: "58% de redução em ruminação aos 21 dias",
  },
  {
    n: "04",
    chapter: "A Identidade Nova",
    day: "Dia 30",
    title: "Você não 'tenta ser feliz'. Você vira alguém que pratica.",
    body: "Implementation Intentions + Growth Mindset + WOOP. Mudança que dura porque é arquitetura, não força de vontade.",
    quote: "“Every action you take is a vote for the type of person you wish to become.”",
    quoteAuthor: "— James Clear",
    cite: "Gollwitzer (1999) · Dweck (2006) · Oettingen (2014)",
    accent: "from-violet-500/30 via-fuchsia-500/20 to-transparent",
    metric: "3x mais adesão · efeito 18 meses depois",
  },
];

function Act({
  act, i, total, scrollYProgress, reduce,
}: {
  act: typeof ACTS[number];
  i: number;
  total: number;
  scrollYProgress: MotionValue<number>;
  reduce: boolean | null;
}) {
  const start = i / total;
  const peak = (i + 0.5) / total;
  const end = (i + 1) / total;
  const opacity = useTransform(
    scrollYProgress,
    [Math.max(0, start - 0.05), start, peak, end, Math.min(1, end + 0.05)],
    [0, 1, 1, 1, 0]
  );
  const y = useTransform(scrollYProgress, [start, peak, end], [50, 0, -50]);
  const scale = useTransform(scrollYProgress, [start, peak, end], [0.94, 1, 0.94]);

  return (
    <motion.div
      style={reduce ? undefined : { opacity, y, scale }}
      className={reduce ? "mb-24" : "absolute inset-0 flex flex-col items-center justify-center px-6"}
    >
      <div className={`absolute inset-0 bg-gradient-radial ${act.accent} opacity-50 pointer-events-none`} />
      <div className="relative max-w-3xl text-center">
        {/* Chapter header with day badge */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-[0.3em]">
            Ato {act.n} · {act.chapter}
          </span>
          <span className="w-px h-3 bg-border" />
          <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
            {act.day}
          </span>
        </div>

        <h3 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.05] mb-5 tracking-tight">
          {act.title}
        </h3>

        <p className="text-base md:text-lg text-foreground/75 max-w-2xl mx-auto leading-relaxed mb-6">
          {act.body}
        </p>

        {/* Floating quote card */}
        <motion.figure
          className="inline-flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl glass-card border border-primary/20 max-w-xl mb-5"
          whileHover={{ scale: 1.02 }}
        >
          <Quote className="w-4 h-4 text-primary/60" />
          <blockquote className="text-sm md:text-base italic text-foreground/85 leading-snug">
            {act.quote}
          </blockquote>
          <figcaption className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {act.quoteAuthor}
          </figcaption>
        </motion.figure>

        {/* Metric chip */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
          <span className="px-3 py-1.5 rounded-full bg-primary/15 text-primary border border-primary/25 font-bold uppercase tracking-wider">
            {act.metric}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-background/60 text-muted-foreground border border-border/40">
            {act.cite}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function RailMarker({ index, day, scrollYProgress }: { index: number; day: string; scrollYProgress: MotionValue<number> }) {
  const start = index / ACTS.length;
  const end = (index + 1) / ACTS.length;
  const opacity = useTransform(scrollYProgress, [start, (start + end) / 2, end], [0.4, 1, 0.4]);
  const scale = useTransform(scrollYProgress, [start, (start + end) / 2, end], [1, 1.6, 1]);

  return (
    <motion.div className="relative flex items-center gap-3 pl-1" style={{ opacity }}>
      <motion.div className="w-2 h-2 rounded-full bg-primary relative z-10" style={{ scale }} />
      <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/70 hidden md:block">
        {day}
      </div>
    </motion.div>
  );
}

function ScrollHint({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);

  return (
    <motion.div
      className="absolute bottom-24 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-2 pointer-events-none"
      style={{ opacity }}
    >
      <span>Role para viver a jornada</span>
      <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>â†“</motion.span>
    </motion.div>
  );
}

/**
 * Innovation #3 (v2) — Scroll-driven 4-act narrative with quote cards,
 * per-act metrics, labeled progress rail, and final CTA.
 */
export default function WellbeingScrollStory() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const hue = useTransform(scrollYProgress, [0, 1], [0, 280]);
  const bgGlow = useTransform(hue, (h) => `radial-gradient(circle at 50% 50%, hsl(${h}, 70%, 50%, 0.18), transparent 60%)`);
  const railProgress = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const ctaOpacity = useTransform(scrollYProgress, [0.85, 0.98], [0, 1]);
  const ctaY = useTransform(scrollYProgress, [0.85, 0.98], [30, 0]);

  return (
    <section
      ref={ref}
      className="relative"
      style={{ height: reduce ? "auto" : `${ACTS.length * 100}vh` }}
      aria-label="Trilha de transformação do bem-estar"
    >
      <div className={`${reduce ? "" : "sticky top-0"} h-screen overflow-hidden flex items-center justify-center`}>
        {/* Animated background */}
        <motion.div className="absolute inset-0 pointer-events-none" style={{ background: bgGlow }} />
        <div className="absolute inset-0 noise opacity-[0.08] mix-blend-overlay pointer-events-none" />

        {/* Progress rail (vertical) with chapter labels */}
        <div className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 z-20 hidden sm:flex flex-col gap-4">
          {/* Vertical bar */}
          <div className="absolute left-[3px] top-0 bottom-0 w-[2px] bg-border/40 rounded-full">
            <motion.div
              className="absolute top-0 left-0 right-0 bg-gradient-to-b from-primary via-accent to-secondary rounded-full"
              style={{ height: railProgress }}
            />
          </div>
          {ACTS.map((a, i) => (
            <RailMarker key={a.n} index={i} day={a.day} scrollYProgress={scrollYProgress} />
          ))}
        </div>

        {/* Acts — absolute layer fills the sticky viewport so each Act (inset-0) stacks correctly */}
        <div className={reduce ? "relative container max-w-4xl py-16" : "absolute inset-0"}>
          {ACTS.map((act, i) => (
            <Act key={act.n} act={act} i={i} total={ACTS.length} scrollYProgress={scrollYProgress} reduce={!!reduce} />
          ))}
        </div>

        {/* Final CTA — emerges on last act */}
        {!reduce && (
          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30"
            style={{ opacity: ctaOpacity, y: ctaY }}
          >
            <button
              onClick={() => navigate("/auth")}
              className="group flex items-center gap-2 px-6 py-3.5 rounded-2xl gradient-institute text-primary-foreground font-bold shadow-float hover:shadow-glow transition-all hover:scale-[1.04]"
            >
              Começar meus 30 dias
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}

        {/* Scroll hint (first act only) */}
        {!reduce && (
          <motion.div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-2 pointer-events-none"
            style={{ opacity: 1 }}
          >
            <span>Role para viver a jornada</span>
            <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>↓</motion.span>
          </motion.div>
        )}
      </div>

      {/* Reduced-motion fallback CTA */}
      {reduce && (
        <div className="container max-w-2xl text-center pb-16">
          <button
            onClick={() => navigate("/auth")}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl gradient-institute text-primary-foreground font-bold shadow-warm hover:shadow-glow transition-all"
          >
            Começar meus 30 dias
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
}
