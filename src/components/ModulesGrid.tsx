import { motion } from "framer-motion";
import { modules } from "@/data/courseData";
import { Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const gradientMap: Record<string, string> = {
  coral: "bg-card border border-border",
  gold: "bg-card border border-border",
  navy: "bg-card border border-border",
};

export default function ModulesGrid() {
  const navigate = useNavigate();

  return (
    <section id="modules" className="py-20">
      <div className="container">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">📚 Trilha de Aprendizagem</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">5 módulos baseados no curso mais popular de Yale</p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.id}
              className="bg-card border border-border rounded-2xl p-6 cursor-pointer group hover:shadow-warm transition-all duration-300"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              onClick={() => navigate(`/module/${mod.id}`)}
            >
              <div className="text-4xl mb-4">{mod.icon}</div>
              <div className="text-xs font-semibold text-primary mb-1">MÓDULO {mod.number} • SEMANA {mod.week}</div>
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
    </section>
  );
}
