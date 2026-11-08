import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, BookOpen, Video, Brain, Sparkles, ArrowRight, Zap, Theater, Bug, Rocket } from "lucide-react";

const modules = [
  {
    n: 1, icon: Theater, tile: "module-tile-coral", title: "As Grandes Mentiras Sobre Ser Feliz",
    desc: "Misconceptions, Miswanting, Falácia de G.I. Joe",
    tag: "Diagnóstico",
    detail: "Neste módulo inaugural, você vai descobrir que quase tudo que acredita sobre felicidade está errado. Dinheiro não compra felicidade (acima de um limiar), notas perfeitas não garantem satisfação, e o corpo ideal não traz paz interior.",
    videos: 8,
    concepts: ["Miswanting", "Falácia de G.I. Joe", "Impacto hedônico", "Misconceptions sobre dinheiro"],
    practice: "Diário de 'Eu achava que...' — registre suas crenças sobre felicidade e confronte com evidências científicas.",
    gradient: "gradient-card-coral"
  },
  {
    n: 2, icon: Bug, tile: "module-tile-navy", title: "O Bug das Expectativas",
    desc: "Adaptação Hedônica, Pontos de Referência, Impact Bias",
    tag: "Diagnóstico",
    detail: "Seu cérebro tem bugs de fábrica. A adaptação hedônica faz você se acostumar com coisas boas, os pontos de referência distorcem comparações, e o impact bias faz você superestimar o impacto de eventos futuros.",
    videos: 5,
    concepts: ["Adaptação Hedônica", "Pontos de Referência", "Impact Bias", "Comparação Social"],
    practice: "Exercício de Visualização Negativa — imagine perder algo que valoriza para reativar a gratidão.",
    gradient: "gradient-card-navy"
  },
  {
    n: 3, icon: Zap, tile: "module-tile-gold", title: "O Que Realmente Funciona",
    desc: "6 Rewirements: Conexão, Bondade, Gratidão, Flow, Sono, Tempo",
    tag: "Intervenção",
    detail: "Agora que sabemos os bugs, é hora dos patches! Seis estratégias cientificamente validadas para reprogramar seu cérebro: investir em conexões sociais, praticar bondade, cultivar gratidão, buscar flow, priorizar sono e usar bem o tempo.",
    videos: 8,
    concepts: ["Conexões Sociais", "Atos de Bondade", "Gratidão", "Flow", "Sono", "Affluência de Tempo"],
    practice: "Desafio dos 7 dias de Gratidão — escreva 3 coisas boas por dia e observe a mudança.",
    gradient: "gradient-card-gold"
  },
  {
    n: 4, icon: Brain, tile: "module-tile-coral", title: "Hackeando o Cérebro para Sentir-se Melhor",
    desc: "Savoring, Visualização Negativa, Mindfulness, Experiências",
    tag: "Intervenção",
    detail: "Técnicas avançadas de neurociência afetiva para hackear seu sistema de recompensa. Aprenda savoring (saborear o momento), visualização negativa, mindfulness e por que experiências superam posses.",
    videos: 5,
    concepts: ["Savoring", "Visualização Negativa", "Mindfulness", "Experiências vs Posses"],
    practice: "Meditação de 5 minutos de Savoring — escolha uma experiência positiva e expanda cada sensação.",
    gradient: "gradient-card-coral"
  },
  {
    n: 5, icon: Rocket, tile: "module-tile-navy", title: "Virando o Jogo da Vida Real",
    desc: "WOOP, Implementation Intentions, Growth Mindset, Hábitos",
    tag: "Sustentação",
    detail: "O módulo final transforma conhecimento em ação duradoura. Use o framework WOOP para definir objetivos, Implementation Intentions para automatizar comportamentos, Growth Mindset para abraçar desafios e a ciência dos hábitos.",
    videos: 6,
    concepts: ["WOOP", "Implementation Intentions", "Growth Mindset", "Formação de Hábitos"],
    practice: "Plano WOOP pessoal — defina um Wish, Outcome, Obstacle e Plan para as próximas 2 semanas.",
    gradient: "gradient-card-navy"
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
    <section className="py-24 relative" id="modulos">
      <div className="absolute inset-0 gradient-mesh opacity-10" />
      <div className="container max-w-5xl relative">
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
            Ciência do bem-estar reformulada para adolescentes brasileiros, com atividades autorais, gamificação e tutoria de IA.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-secondary/30 to-accent/30 hidden sm:block" />

          <div className="space-y-4">
            {modules.map((m, i) => (
              <motion.button
                key={m.n}
                className={`w-full flex items-start gap-5 p-6 rounded-3xl ${m.gradient} border border-border/50 hover:shadow-float transition-all duration-500 text-left group relative hover:-translate-y-0.5`}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelected(m)}
              >
                {/* Shimmer */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-primary/3 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform relative z-10 ${m.tile}`}>
                  <m.icon className="w-7 h-7" strokeWidth={1.8} />
                </div>
                <div className="flex-1 relative z-10">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Semana {m.n}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${tagColors[m.tag]}`}>{m.tag}</span>
                  </div>
                  <h3 className="font-display font-bold text-lg mb-1 group-hover:text-primary transition-colors">{m.title}</h3>
                  <p className="text-sm text-muted-foreground">{m.desc}</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground shrink-0 mt-2">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/50">
                    <Video className="w-3.5 h-3.5" />
                    {m.videos}
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-foreground/60 backdrop-blur-md" onClick={() => setSelected(null)} />
            <motion.div
              className="relative w-full max-w-xl rounded-3xl bg-card border border-border shadow-float overflow-hidden max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
            >
              <div className="p-8 gradient-institute text-primary-foreground relative overflow-hidden">
                <div className="absolute inset-0 gradient-mesh opacity-15" />
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-background/40 transition-colors z-10"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="w-14 h-14 rounded-2xl bg-primary-foreground/15 backdrop-blur flex items-center justify-center mb-4 relative z-10">
                  <selected.icon className="w-7 h-7" strokeWidth={1.8} />
                </div>
                <div className="flex items-center gap-2 mb-2 relative z-10">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">Semana {selected.n}</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary-foreground/20 text-xs font-bold">{selected.tag}</span>
                </div>
                <h3 className="font-display font-bold text-2xl relative z-10">{selected.title}</h3>
              </div>
              <div className="p-8 space-y-6">
                <p className="text-sm text-muted-foreground leading-relaxed">{selected.detail}</p>

                <div>
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" /> Conceitos-Chave
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selected.concepts.map((c) => (
                      <span key={c} className="px-3 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-semibold border border-primary/10">{c}</span>
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
                    <span className="flex items-center gap-1"><Zap className="w-4 h-4" /> +XP</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl glass-card">
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-secondary" /> Prática da Semana
                  </h4>
                  <p className="text-sm text-muted-foreground">{selected.practice}</p>
                </div>

                <a
                  href="/auth"
                  className="block w-full py-3.5 rounded-2xl gradient-institute text-primary-foreground text-center font-bold text-sm shadow-warm hover:shadow-glow transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
                >
                  Começar Semana {selected.n} <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
