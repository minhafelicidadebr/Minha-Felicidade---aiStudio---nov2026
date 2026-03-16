import { motion } from "framer-motion";
import { Shield, Award, BookOpen, Globe } from "lucide-react";

const badges = [
  { icon: Shield, label: "Fontes Verificáveis" },
  { icon: Award, label: "Baseado em Yale" },
  { icon: BookOpen, label: "WCAG 2.2" },
  { icon: Globe, label: "100% em Português" },
];

export default function SocialProofBar() {
  return (
    <motion.div
      className="py-6 bg-card border-y border-border"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <div className="container flex flex-wrap items-center justify-center gap-8 md:gap-16">
        {badges.map((b) => (
          <div key={b.label} className="flex items-center gap-2 text-muted-foreground">
            <b.icon className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">{b.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
