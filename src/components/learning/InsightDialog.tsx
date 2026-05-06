/**
 * InsightDialog — Mini-CTA pop-out for instructional design
 * Animated scientific knowledge transmission. Built on the science of learning:
 * dual coding (image + text), elaborative encoding, chunking and worked examples.
 */
import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Brain, Lightbulb, Microscope, Sparkles } from "lucide-react";

export type InsightStep = {
  icon?: string;
  title: string;
  body: string;
  evidence?: string;
};

type Props = {
  cta: string;
  emoji?: string;
  variant?: "primary" | "secondary" | "accent";
  title: string;
  subtitle?: string;
  intro?: string;
  steps: InsightStep[];
  takeaway?: string;
  citation?: string;
};

const variantStyles = {
  primary: "from-primary/20 to-primary/5 border-primary/40 text-primary hover:from-primary/30",
  secondary: "from-secondary/20 to-secondary/5 border-secondary/40 text-secondary hover:from-secondary/30",
  accent: "from-amber-500/20 to-amber-500/5 border-amber-500/40 text-amber-500 hover:from-amber-500/30",
};

export function InsightDialog({ cta, emoji = "🧪", variant = "primary", title, subtitle, intro, steps, takeaway, citation }: Props) {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setActiveStep(0); }}>
      <DialogTrigger asChild>
        <button
          className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br ${variantStyles[variant]} border backdrop-blur text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-105 hover:shadow-lg`}
        >
          <span className="text-sm group-hover:rotate-12 transition-transform">{emoji}</span>
          <span>{cta}</span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-border overflow-hidden">
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-secondary/30 blur-3xl" />
          </div>
          <DialogHeader className="relative">
            <div className="flex items-center gap-3 mb-2">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-12 h-12 rounded-2xl gradient-institute flex items-center justify-center text-2xl shrink-0 shadow-premium"
              >
                {emoji}
              </motion.div>
              <div>
                {subtitle && <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{subtitle}</p>}
                <DialogTitle className="font-display text-xl font-black">{title}</DialogTitle>
              </div>
            </div>
            {intro && <DialogDescription className="text-sm leading-relaxed">{intro}</DialogDescription>}
          </DialogHeader>
        </div>

        {/* Steps stepper */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-1 mb-4">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`h-1.5 flex-1 rounded-full transition-all ${i <= activeStep ? "gradient-institute" : "bg-muted"}`}
                aria-label={`Passo ${i + 1}`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="min-h-[180px]"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-lg shrink-0">
                  {steps[activeStep].icon || "💡"}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Passo {activeStep + 1} de {steps.length}</p>
                  <h4 className="font-display font-bold text-base">{steps[activeStep].title}</h4>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-12">{steps[activeStep].body}</p>
              {steps[activeStep].evidence && (
                <div className="mt-3 ml-12 inline-flex items-center gap-1.5 text-[11px] text-primary">
                  <Microscope className="w-3 h-3" />
                  <span className="italic">{steps[activeStep].evidence}</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <button
              onClick={() => setActiveStep(s => Math.max(0, s - 1))}
              disabled={activeStep === 0}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-[10px] text-muted-foreground">{activeStep + 1} / {steps.length}</span>
            {activeStep < steps.length - 1 ? (
              <button
                onClick={() => setActiveStep(s => Math.min(steps.length - 1, s + 1))}
                className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
              >
                Próximo →
              </button>
            ) : (
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1 rounded-full gradient-institute text-primary-foreground text-xs font-bold"
              >
                Entendi ✨
              </button>
            )}
          </div>
        </div>

        {/* Takeaway */}
        {takeaway && (
          <div className="m-6 mt-3 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Takeaway científico</p>
                <p className="text-sm font-medium italic leading-relaxed">{takeaway}</p>
                {citation && (
                  <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> {citation}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { Brain, Sparkles };
