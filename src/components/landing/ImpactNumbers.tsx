import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Trophy } from "lucide-react";

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
  { end: 219, prefix: "+", label: "Municípios impactados", icon: "🗺️" },
  { end: 700, prefix: "+", label: "Instituições e organizações", icon: "🏛️" },
  { end: 1300, prefix: "+", label: "Projetos classificados por ODS", icon: "🌱" },
];

export default function ImpactNumbers() {
  return (
    <section className="py-24 relative overflow-hidden" id="impacto">
      <div className="absolute inset-0 gradient-aurora" />
      <div className="container max-w-6xl relative">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-primary text-sm font-semibold mb-4">
            <Trophy className="w-4 h-4" /> Com Recorde Mundial
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Números que <span className="text-gradient">Inspiram</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Impacto real, mensurável e transformador em todo o Brasil.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {impactData.map((item, i) => (
            <motion.div
              key={item.label}
              className="relative p-8 rounded-3xl glass-card text-center group hover:shadow-float transition-all duration-500 hover:-translate-y-2"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
            >
              {item.badge && (
                <motion.span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full gradient-institute text-primary-foreground text-xs font-bold whitespace-nowrap shadow-warm"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, type: "spring" }}
                >
                  {item.badge}
                </motion.span>
              )}
              <span className="text-3xl block mb-3 group-hover:scale-110 transition-transform">{item.icon}</span>
              <AnimatedCounter end={item.end} prefix={item.prefix} />
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
