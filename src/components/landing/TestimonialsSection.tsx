import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Maria, 16 anos",
    role: "Estudante — Brasília/DF",
    text: "Antes do curso eu achava que felicidade era tirar nota 10. Agora entendo que conexão social e gratidão fazem muito mais diferença. A AlegrIA me ajudou a entender conceitos que pareciam difíceis!",
    rating: 5,
  },
  {
    name: "Prof. Ricardo",
    role: "Coordenador Pedagógico — Recife/PE",
    text: "Implementamos o curso em 3 turmas do ensino médio. O engajamento foi surpreendente — os alunos pedem para fazer as dinâmicas! O dashboard de gestor nos dá visibilidade real do progresso.",
    rating: 5,
  },
  {
    name: "Ana Beatriz, 17 anos",
    role: "Estudante — São Paulo/SP",
    text: "O Simulador de Decisões é incrível! Eu tomei decisões que nunca tomaria na vida real e vi as consequências. Aprendi mais sobre mim mesma em 5 semanas do que em anos de escola.",
    rating: 5,
  },
  {
    name: "Dra. Fernanda",
    role: "Psicóloga Escolar — Curitiba/PR",
    text: "A base científica é sólida e as fontes são verificáveis. É raro encontrar uma plataforma educacional que une gamificação com rigor acadêmico. Recomendo para todas as escolas.",
    rating: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container max-w-6xl">
        <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary-foreground text-sm font-semibold mb-4">
            💬 Depoimentos
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Quem já <span className="text-gradient">experimentou</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Estudantes, professores e psicólogos compartilham suas experiências com a plataforma.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              className="relative p-8 rounded-3xl bg-card border border-border hover:shadow-premium transition-all duration-500"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/10" />
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-secondary fill-secondary" />
                ))}
              </div>
              <p className="text-sm leading-relaxed mb-6 text-muted-foreground italic">"{t.text}"</p>
              <div>
                <div className="font-display font-bold text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
