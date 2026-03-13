import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, BookOpen, Video, Brain, Sparkles } from "lucide-react";

const modules = [
  {
    n: 1, icon: "🎭", title: "As Grandes Mentiras Sobre Ser Feliz",
    desc: "Misconceptions, Miswanting, Falácia de G.I. Joe",
    tag: "Diagnóstico",
    detail: "Neste módulo inaugural, você vai descobrir que quase tudo que acredita sobre felicidade está errado. Dinheiro não compra felicidade (acima de um limiar), notas perfeitas não garantem satisfação, e o corpo ideal não traz paz interior.",
    videos: 8,
    concepts: ["Miswanting", "Falácia de G.I. Joe", "Impacto hedônico", "Misconceptions sobre dinheiro"],
    practice: "Diário de 'Eu achava que...' — registre suas crenças sobre felicidade e confronte com evidências científicas."
  },
  {
    n: 2, icon: "🐛", title: "O Bug das Expectativas",
    desc: "Adaptação Hedônica, Pontos de Referência, Impact Bias",
    tag: "Diagnóstico",
    detail: "Seu cérebro tem bugs de fábrica. A adaptação hedônica faz você se acostumar com coisas boas, os pontos de referência distorcem comparações, e o impact bias faz você superestimar o impacto de eventos futuros.",
    videos: 5,
    concepts: ["Adaptação Hedônica", "Pontos de Referência", "Impact Bias", "Comparação Social"],
    practice: "Exercício de Visualização Negativa — imagine perder algo que valoriza para reativar a gratidão."
  },
  {
    n: 3, icon: "⚡", title: "O Que Realmente Funciona",
    desc: "6 Rewirements: Conexão, Bondade, Gratidão, Flow, Sono, Tempo",
    tag: "Intervenção",
    detail: "Agora que sabemos os bugs, é hora dos patches! Seis estratégias cientificamente validadas para reprogramar seu cérebro: investir em conexões sociais, praticar bondade, cultivar gratidão, buscar flow, priorizar sono e usar bem o tempo.",
    videos: 8,
    concepts: ["Conexões Sociais", "Atos de Bondade", "Gratidão", "Flow", "Sono", "Affluência de Tempo"],
    practice: "Desafio dos 7 dias de Gratidão — escreva 3 coisas boas por dia e observe a mudança."
  },
  {
    n: 4, icon: "🧠", title: "Hackeando o Cérebro para Sentir-se Melhor",
    desc: "Savoring, Visualização Negativa, Mindfulness, Experiências",
    tag: "Intervenção",
    detail: "Técnicas avançadas de neurociência afetiva para hackear seu sistema de recompensa. Aprenda savoring (saborear o momento), visualização negativa, mindfulness e por que experiências superam posses.",
    videos: 5,
    concepts: ["Savoring", "Visualização Negativa", "Mindfulness", "Experiências vs Posses"],
    practice: "Meditação de 5 minutos de Savoring — escolha uma experiência positiva e expanda cada sensação."
  },
  {
    n: 5, icon: "🚀", title: "Virando o Jogo da Vida Real",
    desc: "WOOP, Implementation Intentions, Growth Mindset, Hábitos",
    tag: "Sustentação",
    detail: "O módulo final transforma conhecimento em ação duradoura. Use o framework WOOP para definir objetivos, Implementation Intentions para automatizar comportamentos, Growth Mindset para abraçar desafios e a ciência dos hábitos.",
    videos: 6,
    concepts: ["WOOP", "Implementation Intentions", "Growth Mindset", "Formação de Hábitos"],
    practice: "Plano WOOP pessoal — defina um Wish, Outcome, Obstacle e Plan para as próximas 2 semanas."
  },
];

const tagColors: Record<string, string> = {
  "Diagnóstico": "bg-destructive/10 text-destructive",
  "Intervenção": "bg-accent/10 text-accent",
  "Sustentação": "bg-success/10 text-success",
};

export default function CourseStructure() {
  const [selected, setSelected] = useState<typeof modules[0] | null>(null);

  return (
    <section className="py-24" id="modulos">
      <div className="container max-w-5xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary-foreground text-sm font-semibold mb-4">
            📚 Baseado em Yale
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Estrutura do Curso — <span className="text-gradient">5 Semanas</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Da Dra. Laurie Santos para você — reformulado para adolescentes com gamificação e tutoria de IA.
          </p>
        </motion.div>

        <div className="space-y-4">
          {modules.map((m, i) => (
            <motion.button
              key={m.n}
              className="w-full flex items-start gap-5 p-6 rounded-3xl bg-card border border-border hover:shadow-premium transition-all duration-500 text-left group"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelected(m)}
            >
              <div className="w-14 h-14 rounded-2xl gradient-institute flex items-center justify-center shrink-0">
                <span className="text-2xl">{m.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Semana {m.n}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${tagColors[m.tag]}`}>{m.tag}</span>
                </div>
                <h3 className="font-display font-bold text-lg mb-1 group-hover:text-primary transition-colors">{m.title}</h3>
                <p className="text-sm text-muted-foreground">{m.desc}</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground shrink-0 mt-2">
                <Video className="w-4 h-4" />
                {m.videos} vídeos
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Module Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <motion.div
              className="relative w-full max-w-xl rounded-3xl bg-card border border-border shadow-premium overflow-hidden max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
            >
              <div className="p-8 gradient-institute text-primary-foreground">
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/20 flex items-center justify-center hover:bg-background/40 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-5xl block mb-4">{selected.icon}</span>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">Semana {selected.n}</span>
                  <span className="px-2 py-0.5 rounded-full bg-background/20 text-xs font-bold">{selected.tag}</span>
                </div>
                <h3 className="font-display font-bold text-2xl">{selected.title}</h3>
              </div>
              <div className="p-8 space-y-6">
                <p className="text-sm text-muted-foreground leading-relaxed">{selected.detail}</p>

                <div>
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" /> Conceitos-Chave
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selected.concepts.map((c) => (
                      <span key={c} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">{c}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <Video className="w-4 h-4 text-accent" /> Conteúdo
                  </h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Video className="w-4 h-4" /> {selected.videos} vídeos</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> Quiz + Flashcards</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-muted/50 border border-border">
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-secondary" /> Prática da Semana
                  </h4>
                  <p className="text-sm text-muted-foreground">{selected.practice}</p>
                </div>

                <a
                  href="/auth"
                  className="block w-full py-3.5 rounded-2xl gradient-institute text-primary-foreground text-center font-bold text-sm shadow-warm hover:shadow-glow transition-shadow"
                >
                  Começar Semana {selected.n} →
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
