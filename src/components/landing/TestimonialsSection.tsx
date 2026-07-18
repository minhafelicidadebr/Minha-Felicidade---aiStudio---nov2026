import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    name: "Maria, 16 anos",
    role: "Estudante — Brasília/DF",
    text: "Antes do curso eu achava que felicidade era tirar nota 10. Agora entendo que conexão social e gratidão fazem muito mais diferença. A AlegrIA me ajudou a entender conceitos que pareciam difíceis!",
    rating: 5,
    avatar: "🎓",
  },
  {
    name: "Prof. Ricardo",
    role: "Coordenador Pedagógico — Recife/PE",
    text: "Implementamos o curso em 3 turmas do ensino médio. O engajamento foi surpreendente — os alunos pedem para fazer as dinâmicas! O dashboard de gestor nos dá visibilidade real do progresso.",
    rating: 5,
    avatar: "👨‍🏫",
  },
  {
    name: "Ana Beatriz, 17 anos",
    role: "Estudante — São Paulo/SP",
    text: "O Simulador de Decisões é incrível! Eu tomei decisões que nunca tomaria na vida real e vi as consequências. Aprendi mais sobre mim mesma em 5 semanas do que em anos de escola.",
    rating: 5,
    avatar: "✨",
  },
  {
    name: "Dra. Fernanda",
    role: "Psicóloga Escolar — Curitiba/PR",
    text: "A base científica é sólida e as fontes são verificáveis. É raro encontrar uma plataforma educacional que une gamificação com rigor acadêmico. Recomendo para todas as escolas.",
    rating: 5,
    avatar: "🧠",
  },
  {
    name: "Lucas, 15 anos",
    role: "Estudante — Belo Horizonte/MG",
    text: "Os flashcards me ajudaram a lembrar dos conceitos para a prova. E o sistema de XP me faz querer estudar todo dia — nunca achei que ia dizer isso sobre matéria de escola!",
    rating: 5,
    avatar: "🎮",
  },
  {
    name: "Profa. Carla",
    role: "Diretora — Fortaleza/CE",
    text: "A poesia pedagógica surpreendeu todos nós. Os alunos expressaram emoções que nunca conseguiram em aula tradicional. Uma revolução no ensino socioemocional.",
    rating: 5,
    avatar: "🎭",
  },
];

export default function TestimonialsSection() {
  const [page, setPage] = useState(0);
  const perPage = 2;
  const maxPage = Math.ceil(testimonials.length / perPage) - 1;
  const visible = testimonials.slice(page * perPage, page * perPage + perPage);

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-20" />
      <div className="container max-w-6xl relative">
        <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary-foreground text-sm font-semibold mb-4">
            💬 Exemplos ilustrativos
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Como a plataforma <span className="text-gradient">pode ser usada</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cenários ilustrativos de uso por estudantes e educadores. Não são
            depoimentos verificados — publicaremos relatos reais, com
            consentimento, conforme forem coletados.
          </p>
        </motion.div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              className="grid md:grid-cols-2 gap-6"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4 }}
            >
              {visible.map((t) => (
                <div
                  key={t.name}
                  className="relative p-8 rounded-3xl glass-card hover:shadow-float transition-all duration-500 group"
                >
                  <Quote className="absolute top-6 right-6 w-10 h-10 text-primary/8" />
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-secondary fill-secondary" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed mb-6 text-muted-foreground italic">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-institute flex items-center justify-center text-lg">
                      {t.avatar}
                    </div>
                    <div>
                      <div className="font-display font-bold text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-card disabled:opacity-30 transition-all"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              {Array.from({ length: maxPage + 1 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${i === page ? "bg-primary w-8" : "bg-muted-foreground/20 hover:bg-muted-foreground/40"}`}
                  aria-label={`Página ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={() => setPage(Math.min(maxPage, page + 1))}
              disabled={page === maxPage}
              className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-card disabled:opacity-30 transition-all"
              aria-label="Próximo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
