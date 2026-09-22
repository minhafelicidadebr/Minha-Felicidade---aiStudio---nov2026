import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle2, BookOpen, Video, Brain, Sparkles, ArrowRight,
  Zap, Theater, Bug, Rocket, PlayCircle, Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const modules = [
  {
    n: 1, icon: Theater, tile: "module-tile-coral", title: "As Grandes Mentiras Sobre Ser Feliz",
    desc: "Misconceptions, Miswanting, Falácia de G.I. Joe", tag: "Diagnóstico", videos: 8,
    detail: "Neste módulo inaugural, você vai descobrir que quase tudo que acredita sobre felicidade está errado. Dinheiro não compra felicidade (acima de um limiar), notas perfeitas não garantem satisfação, e o corpo ideal não traz paz interior.",
    concepts: ["Miswanting", "Falácia de G.I. Joe", "Impacto hedônico", "Crenças sobre dinheiro"],
    practice: "Diário de ‘Eu achava que...’ — registre suas crenças sobre felicidade e confronte com evidências científicas.",
  },
  {
    n: 2, icon: Bug, tile: "module-tile-navy", title: "O Bug das Expectativas",
    desc: "Adaptação Hedônica, Pontos de Referência, Impact Bias", tag: "Diagnóstico", videos: 5,
    detail: "Seu cérebro tem bugs de fábrica. A adaptação hedônica faz você se acostumar com coisas boas, os pontos de referência distorcem comparações, e o impact bias faz você superestimar o impacto de eventos futuros.",
    concepts: ["Adaptação Hedônica", "Pontos de Referência", "Impact Bias", "Comparação Social"],
    practice: "Exercício de Visualização Negativa — imagine perder algo que valoriza para reativar a gratidão.",
  },
  {
    n: 3, icon: Zap, tile: "module-tile-gold", title: "O Que Realmente Funciona",
    desc: "6 Rewirements: Conexão, Bondade, Gratidão, Flow, Sono, Tempo", tag: "Intervenção", videos: 8,
    detail: "Agora que sabemos os bugs, é hora dos patches! Seis estratégias cientificamente validadas para reprogramar seu cérebro: investir em conexões sociais, praticar bondade, cultivar gratidão, buscar flow, priorizar sono e usar bem o tempo.",
    concepts: ["Conexões Sociais", "Atos de Bondade", "Gratidão", "Flow", "Sono", "Tempo"],
    practice: "Desafio dos 7 dias de Gratidão — escreva 3 coisas boas por dia e observe a mudança.",
  },
  {
    n: 4, icon: Brain, tile: "module-tile-coral", title: "Hackeando o Cérebro para Sentir-se Melhor",
    desc: "Savoring, Visualização Negativa, Mindfulness, Experiências", tag: "Intervenção", videos: 5,
    detail: "Técnicas avançadas de neurociência afetiva para hackear seu sistema de recompensa. Aprenda savoring, visualização negativa, mindfulness e por que experiências superam posses.",
    concepts: ["Savoring", "Visualização Negativa", "Mindfulness", "Experiências vs Posses"],
    practice: "Meditação de 5 minutos de Savoring — escolha uma experiência positiva e expanda cada sensação.",
  },
  {
    n: 5, icon: Rocket, tile: "module-tile-navy", title: "Virando o Jogo da Vida Real",
    desc: "WOOP, Implementation Intentions, Growth Mindset, Hábitos", tag: "Sustentação", videos: 6,
    detail: "O módulo final transforma conhecimento em ação duradoura. Use o framework WOOP para definir objetivos, Implementation Intentions para automatizar comportamentos, Growth Mindset para abraçar desafios e a ciência dos hábitos.",
    concepts: ["WOOP", "Implementation Intentions", "Growth Mindset", "Formação de Hábitos"],
    practice: "Plano WOOP pessoal — defina um Wish, Outcome, Obstacle e Plan para as próximas 2 semanas.",
  },
];

type Module = (typeof modules)[number];

const tagColors: Record<string, string> = {
  Diagnóstico: "chip-coral",
  Intervenção: "chip-navy",
  Sustentação: "bg-success/15 text-success border-success/20",
};

function ModuleMeta({ module }: { module: Module }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-primary uppercase">Semana {module.n}</span>
      <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${tagColors[module.tag]}`}>{module.tag}</span>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/70 border border-border/50 text-[11px] font-semibold text-muted-foreground">
        <Video className="w-3.5 h-3.5" /> {module.videos} vídeos
      </span>
    </div>
  );
}

export default function CourseStructure() {
  const [selected, setSelected] = useState<Module | null>(null);
  const featured = modules[0];
  const FeaturedIcon = featured.icon;
  const SelectedIcon = selected?.icon;

  return (
    <section className="py-24 md:py-32 relative overflow-hidden" id="modulos">
      <div className="absolute inset-0 gradient-mesh opacity-20" />
      <div className="container max-w-6xl relative">
        <motion.header
          className="max-w-3xl mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 text-secondary-foreground text-sm font-semibold mb-5">
            <BookOpen className="w-4 h-4" /> Baseado em Yale · 5 semanas
          </span>
          <h2 className="text-4xl md:text-6xl font-display font-bold mb-5 leading-[1.05]">
            Uma jornada para entender sua mente — <span className="text-gradient">e transformar sua vida.</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Cada semana abre uma nova camada: primeiro você reconhece os padrões, depois pratica o que a ciência mostra que funciona.
          </p>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
          <motion.article
            className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-primary/25 bg-card/80 backdrop-blur-xl shadow-float min-h-[370px] p-6 md:p-9 group"
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/8 opacity-80" />
            <div className="absolute -right-8 -top-12 font-display text-[13rem] leading-none text-foreground/[0.035] select-none" aria-hidden>01</div>
            <div className="relative h-full flex flex-col">
              <div className="flex items-start justify-between gap-4 mb-10">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${featured.tile}`}>
                  <FeaturedIcon className="w-8 h-8" strokeWidth={1.7} />
                </div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Comece por aqui
                </span>
              </div>
              <ModuleMeta module={featured} />
              <h3 className="font-display font-bold text-3xl md:text-4xl mt-5 mb-3 max-w-xl leading-tight">{featured.title}</h3>
              <p className="text-muted-foreground leading-relaxed max-w-xl">{featured.desc}</p>
              <div className="mt-auto pt-8 flex flex-col sm:flex-row sm:items-center gap-4">
                <Button onClick={() => setSelected(featured)} size="lg" className="rounded-xl shadow-warm group/cta">
                  Explorar a semana <ArrowRight className="group-hover/cta:translate-x-1 transition-transform" />
                </Button>
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="w-4 h-4" /> Aulas curtas + prática guiada</span>
              </div>
            </div>
          </motion.article>

          {modules.slice(1).map((module, index) => {
            const Icon = module.icon;
            const isFinal = module.n === 5;
            return (
              <motion.article
                key={module.n}
                className={`${isFinal ? "lg:col-span-2" : ""} relative overflow-hidden rounded-3xl border border-border/70 bg-card/65 backdrop-blur-xl p-6 md:p-7 group hover:border-primary/35 hover:shadow-float transition-all duration-500`}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: (index + 1) * 0.08 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.035] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex flex-col h-full min-h-[260px]">
                  <div className="flex items-start justify-between gap-3 mb-6">
                    <div className={`w-13 h-13 min-w-13 rounded-2xl flex items-center justify-center ${module.tile}`}>
                      <Icon className="w-6 h-6" strokeWidth={1.8} />
                    </div>
                    <span className="font-display text-5xl leading-none text-foreground/[0.07]">0{module.n}</span>
                  </div>
                  <ModuleMeta module={module} />
                  <h3 className="font-display font-bold text-xl md:text-2xl mt-4 mb-2 leading-tight">{module.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{module.desc}</p>
                  <Button
                    variant="ghost"
                    onClick={() => setSelected(module)}
                    className="mt-auto pt-6 px-0 h-auto justify-start text-primary hover:bg-transparent hover:text-primary group/cta"
                  >
                    Ver conteúdo <ArrowRight className="group-hover/cta:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.article>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <PlayCircle className="w-4 h-4 text-primary" />
          <span>32 vídeos · quizzes · flashcards · práticas para a vida real</span>
        </div>
      </div>

      <AnimatePresence>
        {selected && SelectedIcon && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-foreground/60 backdrop-blur-md" onClick={() => setSelected(null)} />
            <motion.div
              role="dialog" aria-modal="true" aria-label={`Detalhes da semana ${selected.n}`}
              className="relative w-full max-w-xl rounded-3xl bg-card border border-border shadow-float overflow-hidden max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.94, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 24 }}
            >
              <div className="p-7 md:p-9 gradient-institute text-primary-foreground relative overflow-hidden">
                <Button variant="ghost" size="icon" onClick={() => setSelected(null)} className="absolute top-4 right-4 rounded-full text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground z-10" aria-label="Fechar">
                  <X />
                </Button>
                <div className="w-14 h-14 rounded-2xl bg-primary-foreground/15 flex items-center justify-center mb-5 relative z-10">
                  <SelectedIcon className="w-7 h-7" strokeWidth={1.8} />
                </div>
                <ModuleMeta module={selected} />
                <h3 className="font-display font-bold text-2xl md:text-3xl relative z-10 mt-4">{selected.title}</h3>
              </div>
              <div className="p-7 md:p-9 space-y-6">
                <p className="text-sm text-muted-foreground leading-relaxed">{selected.detail}</p>
                <div>
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Conceitos-chave</h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {selected.concepts.map((concept) => (
                      <span key={concept} className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="w-4 h-4 text-success shrink-0" />{concept}</span>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-muted/60 border border-border/60">
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-secondary" /> Prática da semana</h4>
                  <p className="text-sm text-muted-foreground">{selected.practice}</p>
                </div>
                <Button asChild size="lg" className="w-full rounded-xl shadow-warm">
                  <a href="/auth">Começar Semana {selected.n} <ArrowRight /></a>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
