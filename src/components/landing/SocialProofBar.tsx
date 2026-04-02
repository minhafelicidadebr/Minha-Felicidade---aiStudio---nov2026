import { motion } from "framer-motion";
import { Shield, Award, BookOpen, Globe, Zap } from "lucide-react";

const badges = [
  { icon: Shield, label: "Fontes Verificáveis" },
  { icon: Award, label: "Baseado em Yale" },
  { icon: BookOpen, label: "WCAG 2.2" },
  { icon: Zap, label: "IA Socrática" },
  { icon: Globe, label: "100% em Português" },
];

export default function SocialProofBar() {
  return (
    <motion.div
      className="py-5 glass border-y border-border/30 relative overflow-hidden"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <div className="container">
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
          {badges.map((b, i) => (
            <motion.div
              key={b.label}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center">
                <b.icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider">{b.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
