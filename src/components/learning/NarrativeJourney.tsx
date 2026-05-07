/**
 * NarrativeJourney — Sheet-based animated story walkthrough.
 * Empathic, slightly humorous narrative that teaches the Constellation flow
 * through cinematic chapters. Built on Cognitive Load Theory (chunking),
 * Narrative Transportation (Green & Brock, 2000) and Dual Coding (Paivio, 1971).
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sparkles, ChevronRight, ChevronLeft, BookOpen, Microscope } from "lucide-react";

export type Chapter = {
  emoji: string;
  chapter: string;
  title: string;
  hook: string;          // empathic, slightly humorous opening
  story: string;         // 2-3 sentences narrative
  science: string;       // the science explained simply
  evidence: string;      // citation
  visual: "stars" | "web" | "spark" | "trophy" | "compass";
};

const CHAPTERS: Chapter[] = [
  {
    emoji: "🌌",
    chapter: "Capítulo 1",
    title: "Você está no escuro (e tudo bem)",
    hook: "Sim, o mapa começa apagado. Não é bug — é pedagogia. (E, vá lá, um pouquinho de drama.)",
    story: "Imagine entrar numa sala com 16 lâmpadas apagadas. Você não sabe onde estão os interruptores… mas seu cérebro adora um bom mistério. Cada estrela cinza é uma pergunta esperando resposta.",
    science: "O efeito da curiosidade ativa o circuito dopaminérgico do hipocampo, aumentando em até 30% a memorização do que vem depois. Aprender é detetive, não palestra.",
    evidence: "Gruber, Gelman & Ranganath (2014), Neuron",
    visual: "stars",
  },
  {
    emoji: "👆",
    chapter: "Capítulo 2",
    title: "Clique. (A mágica é literalmente no dedo.)",
    hook: "Você toca uma estrela e — pluf — ela acende. Parabéns: acabou de fazer ciência da memória sem perceber.",
    story: "Cada clique é um ato de recuperação ativa: seu cérebro pergunta 'o que será isso?' antes de receber a resposta. Esse mini-suspense vale mais do que reler 10 vezes o mesmo PDF.",
    science: "Recuperação ativa (testing effect) supera releitura passiva em todas as métricas de retenção a longo prazo. É o motor invisível de toda app de flashcards séria.",
    evidence: "Karpicke & Roediger (2008), Science",
    visual: "spark",
  },
  {
    emoji: "🕸️",
    chapter: "Capítulo 3",
    title: "As linhas que você jurava serem decoração",
    hook: "Aquelas linhas tracejadas? Não são enfeite de festa junina. São pontes neurais reais.",
    story: "Quando duas estrelas próximas acendem, a linha entre elas vira sólida. Passe o mouse e descubra por que 'Gratidão' segura a mão de 'Adaptação Hedônica' há décadas na literatura científica.",
    science: "Conhecimento conectado a 3+ outros conceitos tem retenção até 7× maior que conhecimento isolado. Seu cérebro literalmente esquece o que vive sozinho.",
    evidence: "Collins & Loftus (1975) — Spreading Activation",
    visual: "web",
  },
  {
    emoji: "✍️",
    chapter: "Capítulo 4",
    title: "Escreva. Sim, com suas palavras (não as do Yale).",
    hook: "O campo de reflexão parece pequeno. Ele não é. É um músculo cognitivo disfarçado de textarea.",
    story: "Quando você descreve como aplicaria 'Savoring' no seu domingo, dois processos acontecem: o conceito vira pessoal e a memória vira biográfica. E memórias biográficas? Praticamente imortais.",
    science: "O Generation Effect mostra que produzir conteúdo (vs. ler) gera +50% de retenção. Vinte caracteres bem escritos valem mais que vinte páginas relidas.",
    evidence: "Bertsch et al. (2007), meta-análise (n=86 estudos)",
    visual: "spark",
  },
  {
    emoji: "🏆",
    chapter: "Capítulo 5",
    title: "5, 10, 16: o cérebro adora marcos",
    hook: "Sim, vão pipocar troféus. Não, não é infantil. É neurobiologia operando a seu favor.",
    story: "A cada 5 estrelas acesas, sua dopamina recebe um pequeno tapinha nas costas. E dopamina, ao contrário do que dizem por aí, não é a 'molécula do prazer' — é a molécula da motivação para repetir.",
    science: "Reforços intermitentes e marcos visíveis sustentam hábito mais que recompensas grandes e raras. É o mesmo princípio de jogos bem desenhados.",
    evidence: "Schultz (2016), Nature Reviews Neuroscience",
    visual: "trophy",
  },
  {
    emoji: "♻️",
    chapter: "Capítulo 6",
    title: "Volte amanhã. Sério, volte.",
    hook: "Sabe aquele 'depois eu vejo'? Aqui ele é cientificamente recomendado.",
    story: "Reabrir a constelação em dias diferentes ativa Spaced Repetition — o método mais documentado de retenção a longo prazo. Em 21 dias, esse mapa não está mais na tela: está em você.",
    science: "Intervalos crescentes entre revisões (1d → 3d → 7d) consolidam memória semântica de forma mais durável que estudo concentrado.",
    evidence: "Cepeda et al. (2006), Psychological Bulletin",
    visual: "compass",
  },
];

function ChapterVisual({ visual }: { visual: Chapter["visual"] }) {
  return (
    <div className="relative h-40 w-full rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-secondary/10 to-background border border-primary/20">
      {visual === "stars" && (
        <>
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary"
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
              animate={{ opacity: [0.1, 1, 0.1], scale: [0.5, 1.5, 0.5] }}
              transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
        </>
      )}
      {visual === "spark" && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-20 h-20 text-primary opacity-60" />
        </motion.div>
      )}
      {visual === "web" && (
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {[
            [30, 50, 100, 30],
            [100, 30, 170, 50],
            [30, 50, 100, 80],
            [100, 80, 170, 50],
            [100, 30, 100, 80],
          ].map(([x1, y1, x2, y2], i) => (
            <motion.line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="hsl(var(--primary))" strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: i * 0.15, repeat: Infinity, repeatType: "reverse", repeatDelay: 1 }}
            />
          ))}
          {[[30, 50], [100, 30], [170, 50], [100, 80]].map(([cx, cy], i) => (
            <motion.circle
              key={i} cx={cx} cy={cy} r="5" fill="hsl(var(--primary))"
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </svg>
      )}
      {visual === "trophy" && (
        <div className="absolute inset-0 flex items-center justify-center text-7xl">
          <motion.span animate={{ rotate: [-5, 5, -5], scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
            🏆
          </motion.span>
        </div>
      )}
      {visual === "compass" && (
        <div className="absolute inset-0 flex items-center justify-center text-7xl">
          <motion.span animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
            🧭
          </motion.span>
        </div>
      )}
    </div>
  );
}

export function NarrativeJourney() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const ch = CHAPTERS[i];
  const last = i === CHAPTERS.length - 1;

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (v) setI(0); }}>
      <SheetTrigger asChild>
        <button className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-500/5 border border-fuchsia-500/40 text-fuchsia-400 backdrop-blur text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-105 hover:shadow-lg">
          <span className="text-sm group-hover:rotate-12 transition-transform">📖</span>
          <span>Modo História</span>
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0 bg-gradient-to-br from-card via-card to-primary/5 border-primary/30">
        {/* Sticky chapter header */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-card/80 border-b border-border px-6 pt-6 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Jornada Narrada • {CHAPTERS.length} capítulos</p>
          </div>
          <div className="flex items-center gap-1">
            {CHAPTERS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                className={`h-1.5 flex-1 rounded-full transition-all ${idx <= i ? "gradient-institute" : "bg-muted"}`}
                aria-label={`Capítulo ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35 }}
            className="px-6 py-5 space-y-4"
          >
            {/* Title block */}
            <div className="flex items-start gap-3">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-14 h-14 rounded-2xl gradient-institute flex items-center justify-center text-3xl shrink-0 shadow-premium"
              >
                {ch.emoji}
              </motion.div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{ch.chapter}</p>
                <h3 className="font-display text-2xl font-black leading-tight">{ch.title}</h3>
              </div>
            </div>

            {/* Visual */}
            <ChapterVisual visual={ch.visual} />

            {/* Hook (humor) */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm font-medium italic text-amber-300">💬 {ch.hook}</p>
            </div>

            {/* Story */}
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">A história</p>
              <p className="text-sm leading-relaxed text-foreground/90">{ch.story}</p>
            </div>

            {/* Science */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
              <div className="flex items-start gap-2">
                <Microscope className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">A ciência</p>
                  <p className="text-sm leading-relaxed">{ch.science}</p>
                  <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> {ch.evidence}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Sticky footer nav */}
        <div className="sticky bottom-0 backdrop-blur-xl bg-card/80 border-t border-border px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => setI(s => Math.max(0, s - 1))}
            disabled={i === 0}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="text-[10px] text-muted-foreground">{i + 1} / {CHAPTERS.length}</span>
          {!last ? (
            <button
              onClick={() => setI(s => Math.min(CHAPTERS.length - 1, s + 1))}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1 rounded-full gradient-institute text-primary-foreground text-xs font-bold"
            >
              Começar a explorar ✨
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
