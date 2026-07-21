import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Trophy, ExternalLink, Instagram } from "lucide-react";
import logoLightBg from "@/assets/logo-light-bg.png";
import logoIcon from "@/assets/logo-icon.png";

interface CounterProps {
  end: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}

function AnimatedCounter({ end, prefix = "", suffix = "", duration = 2.5 }: CounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = end / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, end, duration]);

  return (
    <span ref={ref} className="text-4xl md:text-5xl font-display font-bold text-gradient">
      {prefix}{count.toLocaleString("pt-BR")}{suffix}
    </span>
  );
}

const impactData = [
  { end: 110000, prefix: "+", label: "Aplicação Pesquisa FIB com lideranças e colaboradores", badge: "Recorde Mundial", icon: "🏆" },
  { end: 219, prefix: "+", label: "Municípios impactados em todo o Brasil", icon: "🗺️" },
  { end: 700, prefix: "+", label: "Instituições e organizações parceiras", icon: "🏛️" },
  { end: 1300, prefix: "+", label: "Projetos classificados por ODS da ONU", icon: "🌱" },
];

export default function ImpactNumbers() {
  return (
    <section className="py-28 relative overflow-hidden" id="impacto">
      {/* Background com efeito de profundidade */}
      <div className="absolute inset-0 gradient-aurora" />
      <motion.div
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[120px] pointer-events-none"
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-secondary/8 blur-[100px] pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, delay: 2 }}
      />

      <div className="container max-w-6xl relative">
        {/* Header: Instituto como proponente */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          {/* Logo do Instituto */}
          <motion.div
            className="flex items-center justify-center gap-3 mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <img
              src={logoIcon}
              alt="Instituto Felicidade Para Todos"
              className="w-12 h-12 rounded-xl shadow-warm"
            />
            <img
              src={logoLightBg}
              alt="Instituto Felicidade Para Todos"
              className="h-8 object-contain"
            />
          </motion.div>

          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass text-primary text-xs font-bold mb-5 uppercase tracking-widest shadow-sm">
            <Trophy className="w-4 h-4" /> Com Recorde Mundial
          </span>
          <h2 className="text-4xl md:text-6xl font-display font-bold mb-4 leading-tight">
            Números que <span className="text-gradient">Inspiram</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Impacto real, mensurável e transformador em todo o Brasil.
            <br className="hidden md:block" />
            <span className="text-foreground/80 font-medium">Uma iniciativa do Instituto Felicidade Para Todos.</span>
          </p>
        </motion.div>

        {/* Cards de impacto — design premium */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 mb-14">
          {impactData.map((item, i) => (
            <motion.div
              key={item.label}
              className="relative p-8 rounded-3xl backdrop-blur-md bg-card/50 border-2 border-border/30 text-center group hover:shadow-float hover:border-primary/40 transition-all duration-500"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              {/* Glow de fundo no hover */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {item.badge && (
                <motion.span
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full gradient-institute text-primary-foreground text-[11px] font-bold whitespace-nowrap shadow-warm tracking-wide"
                  initial={{ scale: 0, rotate: -5 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.1, type: "spring", stiffness: 200 }}
                >
                  🏅 {item.badge}
                </motion.span>
              )}

              <div className="relative">
                <motion.span
                  className="text-4xl block mb-4"
                  whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  {item.icon}
                </motion.span>
                <AnimatedCounter end={item.end} prefix={item.prefix} />
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{item.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA institucional + links sociais */}
        <motion.div
          className="flex flex-col items-center gap-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-sm text-muted-foreground text-center max-w-lg">
            O Instituto Felicidade Para Todos é o proponente desta plataforma — ativando ecossistemas
            sustentáveis de felicidade humana, socioambiental e organizacional desde 2018.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://www.felicidadeparatodos.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card/80 backdrop-blur border border-border/50 text-sm font-medium text-foreground hover:border-primary/50 hover:shadow-warm transition-all duration-300"
            >
              <ExternalLink className="w-4 h-4 text-primary" />
              felicidadeparatodos.com.br
            </a>
            <a
              href="https://instagram.com/felicidadeparatodosbr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card/80 backdrop-blur border border-border/50 text-sm font-medium text-foreground hover:border-primary/50 hover:shadow-warm transition-all duration-300"
            >
              <Instagram className="w-4 h-4 text-primary" />
              @felicidadeparatodosbr
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
