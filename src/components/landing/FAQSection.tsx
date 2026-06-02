import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

const faqs = [
  {
    q: "Existe versão gratuita e versão paga?",
    a: "Sim. Temos 3 planos: (1) Gratuito — 5 módulos completos, 32 vídeos com legendas em PT-BR, quiz nível 1, flashcards básicos, AlegrIA (5 perguntas/dia) e dashboard de progresso, para sempre, sem cartão. (2) Premium Individual (R$ 29/mês ou R$ 279/ano) — desbloqueia 19 dinâmicas interativas, AlegrIA ilimitada, certificado e relatório PDF. (3) Escolar — preço por aluno com descontos progressivos por volume e rede. Use a calculadora na seção Planos para simular.",
    icon: "💎"
  },
  {
    q: "Como funciona o plano Escolar e quem paga?",
    a: "A escola, secretaria de educação ou ONG contrata por aluno. Quanto maior a turma (e a rede), menor o preço por aluno — começa em R$ 19 e cai até R$ 7. Gestores e coordenadores são GRATUITOS (1 a cada 50 alunos). Escolas públicas e ONGs comprovadas têm 30% adicional de desconto. Use a calculadora ou agende uma apresentação para receber proposta formal.",
    icon: "🏫"
  },
  {
    q: "Preciso saber inglês para acompanhar?",
    a: "Não. Todos os vídeos possuem legendas em português. A interface, quizzes, flashcards e a AlegrIA funcionam 100% em português brasileiro.",
    icon: "🌎"
  },
  {
    q: "Qual a idade recomendada?",
    a: "Adaptado para adolescentes de 14 a 19 anos, mas acessível para qualquer pessoa interessada em ciência do bem-estar.",
    icon: "🎂"
  },
  {
    q: "O que é a AlegrIA?",
    a: "Tutora de inteligência artificial treinada nos conteúdos dos 5 módulos. Usa o método socrático para guiar seu aprendizado com citações científicas reais e auditáveis.",
    icon: "🤖"
  },
  {
    q: "Como funciona a gamificação?",
    a: "Você ganha XP completando atividades (vídeos +10, quizzes +15, simulador +25). Níveis, streaks e conquistas mantêm a motivação, baseados em Self-Determination Theory (Deci & Ryan).",
    icon: "🎮"
  },
  {
    q: "As fontes científicas são verificáveis?",
    a: "Absolutamente. Cada afirmação traz citação (Autor, Ano) e link para o artigo original. A seção 'Auditoria Científica' em cada módulo classifica claims como verificado, parcial ou simplificação.",
    icon: "🔬"
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Sem fidelidade. Cancele a qualquer momento e mantenha acesso até o fim do ciclo já pago. Garantia de devolução de 7 dias na primeira compra.",
    icon: "🔓"
  },
  {
    q: "Quanto tempo leva para completar o curso?",
    a: "5 semanas (1 módulo/semana), ~2-3 horas por semana. Vá no seu ritmo — o progresso fica salvo na sua conta.",
    icon: "⏱️"
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-24 relative overflow-hidden" id="faq">
      <div className="absolute inset-0 gradient-mesh opacity-10" />
      <div className="container max-w-3xl relative">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
            <HelpCircle className="w-4 h-4" /> Dúvidas Frequentes
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Perguntas <span className="text-gradient">Frequentes</span>
          </h2>
          <p className="text-muted-foreground">Tudo sobre planos, preços e funcionamento.</p>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              className={`rounded-2xl border overflow-hidden transition-all duration-300 ${open === i ? "glass-card shadow-warm border-primary/20" : "bg-card border-border hover:border-border/80"}`}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center gap-3 p-5 text-left hover:bg-muted/30 transition-colors"
                aria-expanded={open === i}
              >
                <span className="text-lg shrink-0">{faq.icon}</span>
                <span className="font-display font-bold text-sm flex-1 pr-4">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${open === i ? "rotate-180 text-primary" : ""}`} />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <p className="px-5 pb-5 pl-14 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
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
