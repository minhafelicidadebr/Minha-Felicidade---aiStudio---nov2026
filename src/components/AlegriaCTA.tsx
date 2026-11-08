import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, MessageCircle, Brain } from "lucide-react";
import AlegriaAvatar from "@/components/AlegriaAvatar";

type Ctx = {
  moduleId?: string;
  /** Optional pre-filled question that auto-sends on AlegrIA page */
  prompt?: string;
};

function buildHref({ moduleId, prompt }: Ctx) {
  const params = new URLSearchParams();
  if (moduleId) params.set("module", moduleId);
  if (prompt) params.set("q", prompt);
  const qs = params.toString();
  return `/alegria${qs ? `?${qs}` : ""}`;
}

/**
 * Floating Action Button — drop on any learning page.
 * Fixed bottom-right; glass + neon pulse; respects module/context.
 */
export function AlegriaFAB({ moduleId, prompt, label = "Pergunte à AlegrIA" }: Ctx & { label?: string }) {
  const navigate = useNavigate();
  return (
    <motion.button
      onClick={() => navigate(buildHref({ moduleId, prompt }))}
      initial={{ opacity: 0, scale: 0.6, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 22 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.96 }}
      className="fixed bottom-5 right-5 z-40 group flex items-center gap-3 pl-2 pr-4 py-2 rounded-full glass-card shadow-float hover:shadow-glow border border-primary/30 backdrop-blur-xl"
      aria-label={label}
    >
      <AlegriaAvatar size={40} radius="rounded-full" showStatus alt="" />

      <span className="hidden sm:flex flex-col items-start leading-tight">
        <span className="text-[10px] font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> AlegrIA
        </span>
        <span className="text-xs font-bold text-foreground">{label}</span>
      </span>
    </motion.button>
  );
}

/**
 * Inline pill — drop next to module/activity headers.
 */
export function AlegriaTag({ moduleId, prompt, label = "Discutir com AlegrIA" }: Ctx & { label?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigate(buildHref({ moduleId, prompt })); }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold glass border border-primary/30 text-primary hover:bg-primary/10 hover:shadow-warm transition-all"
      aria-label={label}
    >
      <MessageCircle className="w-3 h-3" /> {label}
    </button>
  );
}

/**
 * Big hero card — drop at top of dashboard / module page.
 */
export function AlegriaHeroCard({ moduleId, suggestions }: { moduleId?: string; suggestions?: string[] }) {
  const navigate = useNavigate();
  const chips = suggestions ?? [
    "O que é miswanting e como me afeta?",
    "Quais Rewirements posso aplicar hoje?",
    "Monte um plano WOOP comigo",
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden p-5 sm:p-6 rounded-3xl glass-card border border-primary/20 mb-6"
    >
      <motion.div
        className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-primary/20 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-accent/20 blur-3xl"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 7, repeat: Infinity }}
      />
      <div className="relative flex items-start gap-4">
        <AlegriaAvatar size={76} active alt="AlegrIA" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary flex items-center gap-1">
              <Brain className="w-3 h-3" /> Cérebro do ecossistema
            </span>
            <span className="text-[10px] font-semibold text-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> online
            </span>
          </div>
          <h3 className="font-display font-bold text-lg sm:text-xl">
            Converse com a <span className="text-gradient">AlegrIA</span>
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-lg">
            Sua companheira de estudo que sabe tudo sobre felicidade, bem-estar e como o cérebro funciona.
            Faz perguntas que te fazem pensar, mostra <strong>de onde veio cada resposta</strong> e te ajuda a aplicar na sua vida real.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((q) => (
              <button
                key={q}
                onClick={() => navigate(buildHref({ moduleId, prompt: q }))}
                className="text-[11px] px-2.5 py-1 rounded-full bg-background/60 hover:bg-primary/10 border border-border hover:border-primary/40 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate(buildHref({ moduleId }))}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-institute text-primary-foreground text-sm font-semibold shadow-warm hover:shadow-glow transition-all"
          >
            <Sparkles className="w-4 h-4" /> Abrir AlegrIA
          </button>
        </div>
      </div>
    </motion.div>
  );
}
