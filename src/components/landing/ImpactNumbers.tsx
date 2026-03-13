import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface CounterProps {
  end: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}

function AnimatedCounter({ end, prefix = "", suffix = "", duration = 2 }: CounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

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
  { end: 110000, prefix: "+", label: "Aplicação Pesquisa FIB com lideranças e colaboradores", badge: "Recorde Mundial" },
  { end: 219, prefix: "+", label: "Municípios impactados" },
  { end: 700, prefix: "+", label: "Instituições e organizações" },
  { end: 1300, prefix: "+", label: "Projetos classificados por ODS" },
];

export default function ImpactNumbers() {
  return (
    <section className="py-24 bg-card" id="impacto">
      <div className="container max-w-6xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            🏆 Com Recorde Mundial
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
              className="relative p-8 rounded-3xl bg-background border border-border text-center group hover:shadow-premium transition-all duration-500"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              {item.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-institute text-primary-foreground text-xs font-bold whitespace-nowrap">
                  {item.badge}
                </span>
              )}
              <AnimatedCounter end={item.end} prefix={item.prefix} />
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
