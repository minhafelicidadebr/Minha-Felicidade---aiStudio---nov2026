import { motion } from "framer-motion";
import { modules } from "@/data/courseData";
import { Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const gradientMap = {
  coral: "gradient-card-coral",
  gold: "gradient-card-gold",
  navy: "gradient-card-navy",
};

export default function ModulesGrid() {
  const navigate = useNavigate();

  return (
    <section id="modules" className="py-24">
      <div className="container">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Trilha de <span className="text-gradient">Aprendizagem</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            8 módulos estruturados em 2 dias de imersão, da etimologia à aplicação organizacional.
          </p>
        </motion.div>

        {/* Day 1 */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg gradient-warm flex items-center justify-center text-primary-foreground font-bold">1</div>
            <h3 className="text-xl font-display font-semibold">Dia 1 — Fundamentos & Ilusões</h3>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {modules.filter(m => m.day === 1).map((mod, i) => (
              <motion.div
                key={mod.id}
                className={`${gradientMap[mod.gradient]} rounded-2xl p-6 cursor-pointer group hover:shadow-warm transition-all duration-300`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onClick={() => navigate(`/module/${mod.id}`)}
              >
                <div className="text-4xl mb-4">{mod.icon}</div>
                <div className="text-xs font-semibold text-primary mb-1">MÓDULO {mod.number}</div>
                <h4 className="font-display font-bold text-lg mb-2 leading-snug">{mod.title}</h4>
                <p className="text-sm text-muted-foreground mb-4">{mod.subtitle}</p>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> {mod.duration}
                  </span>
                  <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Day 2 */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-accent-foreground font-bold">2</div>
            <h3 className="text-xl font-display font-semibold">Dia 2 — Neurociência, Emoções & Aplicação</h3>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {modules.filter(m => m.day === 2).map((mod, i) => (
              <motion.div
                key={mod.id}
                className={`${gradientMap[mod.gradient]} rounded-2xl p-6 cursor-pointer group hover:shadow-warm transition-all duration-300`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onClick={() => navigate(`/module/${mod.id}`)}
              >
                <div className="text-4xl mb-4">{mod.icon}</div>
                <div className="text-xs font-semibold text-primary mb-1">MÓDULO {mod.number}</div>
                <h4 className="font-display font-bold text-lg mb-2 leading-snug">{mod.title}</h4>
                <p className="text-sm text-muted-foreground mb-4">{mod.subtitle}</p>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> {mod.duration}
                  </span>
                  <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
