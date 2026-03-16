import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "O curso é realmente gratuito?",
    a: "Sim! O plano gratuito dá acesso completo aos 5 módulos, 32 vídeos com legendas em português, quiz nível 1, flashcards e AlegrIA (5 perguntas por dia). É baseado no curso aberto de Yale."
  },
  {
    q: "Preciso saber inglês para acompanhar?",
    a: "Não. Todos os vídeos possuem legendas em português geradas automaticamente. A interface, quizzes, flashcards e a AlegrIA funcionam 100% em português."
  },
  {
    q: "Qual a idade recomendada?",
    a: "O curso foi adaptado para adolescentes de 14 a 19 anos, mas é acessível para qualquer pessoa interessada em ciência do bem-estar. Professores e educadores também usam a plataforma."
  },
  {
    q: "O que é a AlegrIA?",
    a: "A AlegrIA é uma tutora de inteligência artificial treinada nos conteúdos dos 5 módulos do curso. Ela usa o método socrático para guiar seu aprendizado com citações científicas reais."
  },
  {
    q: "Como funciona a gamificação?",
    a: "Você ganha XP (pontos de experiência) ao completar atividades: assistir vídeos (+10 XP), fazer quizzes (+20 XP), usar o simulador (+25 XP), entre outras. O sistema de níveis, streaks e conquistas mantém sua motivação."
  },
  {
    q: "Posso usar a plataforma na minha escola?",
    a: "Sim! O plano Avançado inclui um painel de gestor com dados agregados de turma, relatórios e dashboards de engajamento. Preencha o formulário de parceiros para saber mais."
  },
  {
    q: "As fontes científicas são verificáveis?",
    a: "Absolutamente. Cada afirmação é acompanhada da citação (Autor, Ano) e link para o artigo original. A seção 'Auditoria Científica' em cada módulo classifica claims como verificado, parcial ou simplificação."
  },
  {
    q: "Quanto tempo leva para completar o curso?",
    a: "O curso é estruturado em 5 semanas (1 módulo por semana), com ~2-3 horas de conteúdo por semana incluindo vídeos e atividades. Mas você pode ir no seu ritmo."
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-24 bg-muted/30" id="faq">
      <div className="container max-w-3xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
            ❓ Dúvidas Frequentes
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Perguntas <span className="text-gradient">Frequentes</span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              className="rounded-2xl bg-card border border-border overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/50 transition-colors"
                aria-expanded={open === i}
              >
                <span className="font-display font-bold text-sm pr-4">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${open === i ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
