import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";
import { Brain, BookOpen, Sparkles, Users } from "lucide-react";

const stats = [
  { icon: Brain, value: "8", label: "Módulos" },
  { icon: BookOpen, value: "10", label: "Dinâmicas" },
  { icon: Sparkles, value: "16h", label: "Imersão" },
  { icon: Users, value: "2", label: "Dias" },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 gradient-hero" />
      </div>

      <div className="container relative z-10 py-20">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              Pós-Graduação • Curso Intensivo
            </span>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl font-display font-bold leading-[1.1] mb-6"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            Ciência da{" "}
            <span className="text-gradient">Felicidade</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 font-body leading-relaxed"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Da bússola filosófica ao GPS científico — uma jornada imersiva por psicologia positiva,
            neurociência afetiva e práticas baseadas em evidências para o florescimento humano.
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-8 mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-display font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <a href="#modules" className="inline-flex items-center px-8 py-4 rounded-xl gradient-warm text-primary-foreground font-semibold text-lg shadow-warm hover:shadow-glow transition-shadow">
              Explorar Módulos
            </a>
            <a href="#dynamics" className="inline-flex items-center px-8 py-4 rounded-xl border-2 border-primary/20 text-foreground font-semibold text-lg hover:bg-primary/5 transition-colors">
              10 Dinâmicas
            </a>
          </motion.div>
        </div>
      </div>

      {/* Floating orbs */}
      <motion.div
        className="absolute top-20 right-20 w-32 h-32 rounded-full bg-secondary/20 blur-3xl"
        animate={{ y: [-15, 15, -15] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-32 right-40 w-48 h-48 rounded-full bg-primary/10 blur-3xl"
        animate={{ y: [10, -10, 10] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
    </section>
  );
}
