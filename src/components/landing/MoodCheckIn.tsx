import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Heart, Clock, Sparkles, CheckCircle2, Lightbulb, Check, BookOpen } from "lucide-react";
import { ConfettiCelebration } from "@/components/learning/LearningFX";

type Mood = {
  id: string;
  emoji: string;
  label: string;
  color: string;
  headline: string;
  /** Plain-language explanation of the science — no jargon. */
  evidence: string;
  /** Academic source, shown small as a credibility tag. */
  cite: string;
  module: string;
  moduleHref: string;
  plan: string;
  practice: {
    title: string;
    /** One-line "why it works" in plain language. */
    why: string;
    steps: string[];
    duration: string;
  };
  social: string;
};

const MOODS: Mood[] = [
  {
    id: "anxious", emoji: "😰", label: "Ansioso(a)", color: "from-blue-500/30 to-cyan-500/20",
    headline: "Sua mente está em alerta. Dá pra acalmar em poucos minutos.",
    evidence: "Nossa mente passa quase metade do tempo distraída — e quanto mais ela vagueia, pior a gente se sente. Focar na respiração traz a atenção de volta ao agora e acalma o corpo.",
    cite: "Killingsworth & Gilbert (2010) · Science",
    module: "Módulo 4 — Truques para o Cérebro", moduleHref: "/auth",
    plan: "Plano Aluno (R$ 29/mês)",
    practice: {
      title: "Respiração 4-4-4-4",
      why: "Respirar devagar avisa o corpo que está tudo bem — o coração desacelera.",
      duration: "90 segundos",
      steps: ["Inspire pelo nariz contando até 4", "Segure o ar contando até 4", "Solte o ar pela boca contando até 4", "Espere 4 e repita 4 vezes"],
    },
    social: "Uma prática simples pra começar agora",
  },
  {
    id: "overwhelmed", emoji: "🌪️", label: "Sobrecarregado(a)", color: "from-orange-500/30 to-red-500/20",
    headline: "Você não precisa de mais força — precisa de um plano melhor.",
    evidence: "Sentir que você tem tempo pesa mais na sua felicidade do que quanto você ganha. Ou seja: organizar o tempo ajuda mais do que só 'se esforçar mais'.",
    cite: "Whillans et al. (2017) · PNAS",
    module: "Módulo 5 — Virando o Jogo", moduleHref: "/auth",
    plan: "Plano Aluno (R$ 29/mês)",
    practice: {
      title: "Monte seu plano em 60s",
      why: "Imaginar o obstáculo antes faz o cérebro se preparar pra ele — você não é pego de surpresa.",
      duration: "1 minuto",
      steps: ["Desejo: o que você quer resolver hoje?", "Resultado: como seria bom se desse certo?", "Obstáculo: o que costuma te atrapalhar?", "Plano: 'se [obstáculo] acontecer, então eu faço ___'"],
    },
    social: "Um caminho pra quando tudo pesa",
  },
  {
    id: "curious", emoji: "🔍", label: "Curioso(a)", color: "from-violet-500/30 to-purple-500/20",
    headline: "Boa. Felicidade é a pergunta mais antiga — e dá pra estudar com ciência.",
    evidence: "O curso de bem-estar mais procurado da história de Yale reúne décadas de pesquisa sobre o que realmente deixa a gente bem. Spoiler: quase nada do que a gente imagina.",
    cite: "Santos (2018) · Yale",
    module: "Módulo 1 — As Grandes Mentiras", moduleHref: "/auth",
    plan: "Gratuito — comece pelo Módulo 1",
    practice: {
      title: "Saboreie um momento (30s)",
      why: "Prestar atenção nas coisas boas faz elas durarem mais na sua memória.",
      duration: "30 segundos",
      steps: ["Pare o que está fazendo", "Escolha 1 coisa boa do seu dia", "Reviva com 3 detalhes: o que viu, ouviu e sentiu", "Sorria — de verdade"],
    },
    social: "Comece pela pergunta mais antiga da humanidade",
  },
  {
    id: "transition", emoji: "🌱", label: "Em transição", color: "from-emerald-500/30 to-teal-500/20",
    headline: "Uma vida nova começa com um hábito pequeno, repetido todo dia.",
    evidence: "Quem decide antes 'em que momento e onde' vai agir tem muito mais chance de cumprir o plano do que quem confia só na força de vontade.",
    cite: "Gollwitzer (1999) · American Psychologist",
    module: "Módulo 5 — Hábitos que Duram", moduleHref: "/auth",
    plan: "Plano Aluno (R$ 29/mês)",
    practice: {
      title: "Seu primeiro 'depois de… eu vou…'",
      why: "Ligar o hábito novo a algo que você já faz funciona como um lembrete automático.",
      duration: "60 segundos",
      steps: ["Pense em algo que você já faz todo dia (ex: escovar os dentes)", "Complete: 'Depois de ___, eu vou ___'", "Ex: 'Depois de escovar os dentes, faço 3 respirações fundas'", "Repita por 7 dias — pequeno e constante"],
    },
    social: "Uma vida nova, um hábito pequeno por vez",
  },
  {
    id: "lonely", emoji: "🤝", label: "Sozinho(a)", color: "from-pink-500/30 to-rose-500/20",
    headline: "Conexão é o que mais alimenta a felicidade. E dá pra treinar.",
    evidence: "Num estudo com as pessoas mais felizes, a única coisa que todas tinham em comum era uma vida social rica — amigos e vínculos de verdade.",
    cite: "Diener & Seligman (2002) · Psychological Science",
    module: "Módulo 3 — Conexões que Importam", moduleHref: "/auth",
    plan: "Plano Aluno (R$ 29/mês)",
    practice: {
      title: "Mensagem de gratidão (2 min)",
      why: "Reconhecer alguém fortalece o vínculo e melhora o seu humor na hora.",
      duration: "2 minutos",
      steps: ["Pense em 1 pessoa importante pra você", "Mande um áudio ou mensagem agora", "Diga 1 coisa específica que ela faz e que te importa", "Perceba como você se sente depois"],
    },
    social: "Conexão é o que mais alimenta a felicidade — e dá pra treinar",
  },
  {
    id: "school", emoji: "🏫", label: "Sou escola/educador", color: "from-amber-500/30 to-yellow-500/20",
    headline: "Leve a ciência do bem-estar, com base em pesquisa, para a sua rede escolar.",
    evidence: "Programas estruturados de bem-estar nas escolas mostram efeitos que duram mais de um ano no ânimo e no engajamento dos alunos.",
    cite: "Seligman et al. (2009) · Oxford Review of Education",
    module: "Plano Institucional · Painel de Gestão", moduleHref: "#planos",
    plan: "Plano Escola (B2B · até 70% off)",
    practice: {
      title: "Diagnóstico rápido (5 min)",
      why: "Em poucos passos você já vê o investimento e o desconto da sua rede.",
      duration: "5 minutos",
      steps: ["Multiplique o nº de alunos × R$ 29", "Veja o desconto por volume (até 70%)", "Receba uma proposta sob medida", "Agende uma demonstração com nosso time"],
    },
    social: "Plano institucional com painel de gestão",
  },
];

/**
 * Innovation #2 (v2) — Mood-driven personalization with embedded
 * 60-second micro-practice, social proof, and clear journey progress.
 */
export default function MoodCheckIn() {
  const [selected, setSelected] = useState<Mood | null>(null);
  const [committed, setCommitted] = useState(false);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);
  const navigate = useNavigate();

  const handleSelect = (m: Mood) => {
    setSelected(m);
    setCommitted(false);
    setDoneSteps([]);
    setTimeout(() => {
      document.getElementById("mood-result")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const toggleStep = (i: number) =>
    setDoneSteps((prev) => (prev.includes(i) ? prev.filter((n) => n !== i) : [...prev, i]));

  const totalSteps = selected?.practice.steps.length ?? 0;
  const doneCount = doneSteps.length;
  const allDone = totalSteps > 0 && doneCount === totalSteps;

  return (
    <section className="py-24 relative overflow-hidden" id="mood">
      <div className="absolute inset-0 gradient-mesh opacity-20" />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <div className="container max-w-5xl relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-primary text-xs font-bold mb-4 uppercase tracking-wider">
            <Heart className="w-3.5 h-3.5" /> Check-in emocional · 1 toque · 60 s
          </span>
          <h2 className="text-4xl md:text-6xl font-display font-bold mb-4 leading-[1.05]">
            O que você sente agora <span className="text-gradient-aurora">importa</span>.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Escolha o que mais combina com esse momento. Temos uma <strong className="text-foreground">prática de 60 segundos</strong>, uma aula e um caminho feitos pra isso.
          </p>
        </motion.div>

        {/* Mood grid — premium design */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 max-w-3xl mx-auto mb-6">
          {MOODS.map((m, i) => (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -6, scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(m)}
              className={`relative p-6 rounded-3xl backdrop-blur-md bg-card/60 border-2 transition-all duration-300 group shadow-sm hover:shadow-float ${selected?.id === m.id
                ? "border-primary shadow-glow scale-[1.02]"
                : "border-border/30 hover:border-primary/50"
                }`}
              aria-pressed={selected?.id === m.id}
            >
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${m.color} opacity-40 group-hover:opacity-70 transition-opacity duration-300`} />
              <div className="relative flex flex-col items-center text-center gap-2">
                <motion.div
                  className="text-5xl md:text-6xl"
                  animate={selected?.id === m.id ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
                  transition={{ duration: 0.6 }}
                >{m.emoji}</motion.div>
                <div className="text-sm font-bold">{m.label}</div>
                <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1">
                  Explorar <ArrowRight className="w-3 h-3" />
                </span>
                {selected?.id === m.id && (
                  <motion.div
                    layoutId="mood-check"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full gradient-institute flex items-center justify-center shadow-warm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        {/* CTA sutil animado */}
        {!selected && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-muted-foreground mb-10"
          >
            <motion.span
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block"
            >
              ↓
            </motion.span>{" "}
            toque no que você sente
          </motion.p>
        )}

        {/* Personalized roteiro */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              id="mood-result"
              key={selected.id}
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative max-w-3xl mx-auto"
            >
              <div className={`absolute -inset-4 bg-gradient-to-r ${selected.color} blur-3xl opacity-60 pointer-events-none`} />
              <div className="relative glass-card rounded-3xl p-8 md:p-10 border border-primary/30 shadow-float">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="text-5xl">{selected.emoji}</div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    {selected.social}
                  </div>
                </div>

                <h3 className="text-2xl md:text-3xl font-display font-bold mb-4 leading-tight">
                  {selected.headline}
                </h3>

                {/* What science says — plain language + source tag */}
                <div className="p-4 rounded-2xl bg-background/50 border border-border/40 mb-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5">
                    <BookOpen className="w-3 h-3" /> O que a ciência diz
                  </div>
                  <p className="text-sm md:text-base text-foreground/85 leading-relaxed mb-2.5">{selected.evidence}</p>
                  <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
                    <span className="font-semibold not-italic text-foreground/60">Fonte:</span>
                    <span className="italic">{selected.cite}</span>
                  </div>
                </div>

                {/* 60-second micro-practice (instructional design) */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/30 mb-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Faça agora</span>
                    </div>
                    <span className="text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded-full bg-background/60 text-foreground/70">
                      <Clock className="w-3 h-3" /> {selected.practice.duration}
                    </span>
                  </div>
                  <div className="font-display font-bold text-lg mb-2">{selected.practice.title}</div>

                  {/* Why it works — plain-language nudge */}
                  <div className="flex items-start gap-2 mb-4 text-xs text-foreground/70 bg-primary/5 rounded-xl px-3 py-2 border border-primary/15">
                    <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="leading-relaxed"><strong className="text-foreground/85">Por que funciona:</strong> {selected.practice.why}</span>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {allDone ? "Você fez todos os passos! 🎉" : `Passo ${Math.min(doneCount + 1, totalSteps)} de ${totalSteps} · toque para marcar`}
                    </span>
                    <span className="text-[11px] font-bold text-primary">{doneCount}/{totalSteps}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-background/60 overflow-hidden mb-4">
                    <motion.div
                      className="h-full rounded-full gradient-institute"
                      initial={false}
                      animate={{ width: `${totalSteps ? (doneCount / totalSteps) * 100 : 0}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>

                  {/* Interactive checkable steps */}
                  <ol className="space-y-2 mb-4">
                    {selected.practice.steps.map((step, i) => {
                      const done = doneSteps.includes(i);
                      return (
                        <li key={i}>
                          <button
                            onClick={() => toggleStep(i)}
                            aria-pressed={done}
                            className={`w-full flex items-center gap-3 text-left text-sm px-3 py-2.5 rounded-xl border transition-all ${done
                              ? "bg-success/10 border-success/40 text-foreground/70"
                              : "bg-background/40 border-border/40 hover:border-primary/50 hover:bg-primary/5 text-foreground/90"
                              }`}
                          >
                            <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${done ? "bg-success text-white" : "bg-primary/20 text-primary"
                              }`}>
                              {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                            </span>
                            <span className={`leading-relaxed ${done ? "line-through decoration-success/50" : ""}`}>{step}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>

                  <div className="relative">
                    <AnimatePresence>
                      {allDone && !committed && (
                        <motion.p
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-center text-xs font-semibold text-primary mb-2"
                        >
                          Boa! Agora é só se comprometer 👇
                        </motion.p>
                      )}
                    </AnimatePresence>
                    <button
                      onClick={() => setCommitted(true)}
                      className={`w-full text-sm font-bold px-4 py-3 rounded-xl transition-all border ${committed
                        ? "bg-success/15 text-success border-success/40 scale-[1.02]"
                        : allDone
                          ? "gradient-institute text-primary-foreground border-transparent shadow-warm hover:shadow-glow hover:scale-[1.01] animate-pulse"
                          : "bg-background/60 hover:bg-primary/10 border-border/40 hover:border-primary/50 hover:scale-[1.01]"
                        }`}
                    >
                      {committed ? "✓ Compromisso registrado — você acabou de praticar ciência 🎉" : "✨ Me comprometo a tentar agora"}
                    </button>
                    <ConfettiCelebration active={committed} count={80} />
                  </div>
                </motion.div>

                {/* Module + plan */}
                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Por onde começar</div>
                    <div className="font-semibold text-sm">{selected.module}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                    <div className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">Plano recomendado</div>
                    <div className="font-semibold text-sm">{selected.plan}</div>
                  </div>
                </div>

                <button
                  onClick={() => selected.moduleHref.startsWith("#")
                    ? document.querySelector(selected.moduleHref)?.scrollIntoView({ behavior: "smooth" })
                    : navigate(selected.moduleHref)}
                  className="w-full group px-6 py-4 rounded-2xl gradient-institute text-primary-foreground font-bold shadow-warm hover:shadow-glow transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  Começar minha jornada personalizada
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
