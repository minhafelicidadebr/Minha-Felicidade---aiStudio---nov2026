import { motion } from "framer-motion";
import { BookOpen, ArrowRight } from "lucide-react";

export default function FloatingCourseCTA() {
  return (
    <motion.a
      href="#modulos"
      className="fixed bottom-6 right-6 z-40 group"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.2, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Soft ambient glow behind the button */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/40 via-accent/30 to-secondary/40 blur-xl opacity-60 group-hover:opacity-90 transition-opacity duration-500" />

      <div className="relative flex items-center gap-3 pl-4 pr-5 py-3 rounded-2xl glass-card border border-primary/20 shadow-float hover:shadow-glow transition-all duration-300 hover:scale-[1.03]">
        <span className="icon-tile-premium w-9 h-9 rounded-xl shrink-0">
          <BookOpen className="w-4 h-4" />
        </span>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Ir para</span>
          <span className="text-sm font-display font-bold text-foreground mt-0.5">Módulos do Curso</span>
        </div>
        <ArrowRight className="w-4 h-4 text-primary/70 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>

      {/* Subtle pulse ring */}
      <span className="absolute -top-1 -right-1 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
      </span>
    </motion.a>
  );
}
