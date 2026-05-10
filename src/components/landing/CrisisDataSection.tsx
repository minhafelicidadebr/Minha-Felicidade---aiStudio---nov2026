import { useState, useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, GraduationCap, Users, ExternalLink, Heart, ArrowRight, TrendingDown, Brain, Sparkles, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import youthReflection from "@/assets/youth-reflection.jpg";
import teacherExhausted from "@/assets/teacher-exhausted.jpg";

/* ---------- Animated Counter ---------- */
function Counter({ to, suffix = "", duration = 2 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => `${Math.round(v)}${suffix}`);

  useEffect(() => {
    if (inView) {
      const controls = animate(count, to, { duration, ease: [0.25, 0.46, 0.45, 0.94] });
      return controls.stop;
    }
  }, [inView, to, duration, count]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

/* ---------- Data ---------- */
const studentStats = [
  { value: 41, suffix: "%", label: "das meninas se sentem tristes na maioria dos dias", impact: "alto" },
  { value: 43, suffix: "%", label: "relataram ideação de autolesão nos últimos 12 meses", impact: "critico" },
  { value: 61, suffix: "%", label: "vivem com preocupação excessiva diária", impact: "alto" },
  { value: 33, suffix: "%", label: "sentem que ninguém se preocupa com elas", impact: "medio" },
];

const teacherStats = [
  { value: 97, suffix: "%", label: "associam adoecimento mental ao trabalho", impact: "critico" },
  { value: 72, suffix: "%", label: "relatam exaustão emocional severa", impact: "alto" },
  { value: 28, suffix: "%", label: "tiveram pensamentos suicidas", impact: "critico" },
  { value: 800, suffix: "%", label: "aumento de Burnout em 4 anos no Brasil", impact: "alto" },
];

const studentDetails = [
  {
    title: "Tristeza & Sofrimento",
    icon: "😔",
    fact: "30% dos estudantes de 13 a 17 anos sentem-se tristes sempre ou na maioria das vezes. Entre meninas, esse número sobe para 41% — quase 2,5x mais que meninos.",
    source: "PeNSE/IBGE 2024",
  },
  {
    title: "Desesperança",
    icon: "💔",
    fact: "25% das meninas dizem acreditar que a vida não vale a pena ser vivida — o dobro dos meninos (12%).",
    source: "PeNSE/IBGE 2024",
  },
  {
    title: "Imagem Corporal",
    icon: "🪞",
    fact: "Mais de 40% dos adolescentes estão insatisfeitos com a própria imagem corporal — uma piora contínua desde 2015.",
    source: "PeNSE/IBGE 2024",
  },
  {
    title: "Redes Sociais & Bem-estar",
    icon: "📱",
    fact: "Geração Z em países ocidentais registra a maior queda de felicidade em 15 anos. O uso passivo de redes está fortemente correlacionado com piora do bem-estar.",
    source: "World Happiness Report 2024 (Oxford + Gallup)",
  },
];

const teacherDetails = [
  {
    title: "Adoecimento Estrutural",
    icon: "🏫",
    fact: "97,6% dos profissionais da educação pública estadual de SP associam seu adoecimento mental ao ambiente de trabalho. Mais de 150 mil professores foram afastados em 2023.",
    source: "Apeoesp / Ministério da Previdência (2026)",
  },
  {
    title: "Síndrome de Burnout",
    icon: "🔥",
    fact: "A síndrome de Burnout cresceu mais de 800% no Brasil em 4 anos. 72% dos professores relatam exaustão emocional. Afastamentos por saúde mental subiram 15% entre 2024 e 2025.",
    source: "DIEESE / Fundacentro / G1 (2025)",
  },
  {
    title: "Sofrimento Silencioso",
    icon: "🌑",
    fact: "28% dos professores relataram pensamentos suicidas. Ansiedade (60,1%), cansaço excessivo (48,1%) e distúrbios do sono (41,1%) são os sintomas mais comuns.",
    source: "5ª Pesquisa de Saúde Docente CNTE/Fiocruz (2025)",
  },
  {
    title: "Apagão Docente",
    icon: "📉",
    fact: "Metade dos professores não recomendaria a carreira. Projeção de déficit de até 235 mil professores na educação básica até 2040.",
    source: "Revista Educação / CNTE (2026)",
  },
];

/* ---------- Sub-component: Stat Pill ---------- */
function StatPill({ stat, index }: { stat: typeof studentStats[0]; index: number }) {
  const colorMap = {
    critico: "from-destructive/20 to-destructive/5 border-destructive/40 text-destructive",
    alto: "from-orange-500/20 to-orange-500/5 border-orange-500/40 text-orange-500",
    medio: "from-amber-500/20 to-amber-500/5 border-amber-500/40 text-amber-500",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      className={`relative p-5 rounded-2xl border bg-gradient-to-br ${colorMap[stat.impact as keyof typeof colorMap]} backdrop-blur-sm hover:scale-[1.02] transition-transform`}
    >
      <div className="text-4xl md:text-5xl font-display font-bold mb-2 tabular-nums">
        <Counter to={stat.value} suffix={stat.suffix} />
      </div>
      <p className="text-xs md:text-sm text-foreground/80 leading-snug">{stat.label}</p>
    </motion.div>
  );
}

/* ---------- Sub-component: Detail Dialog ---------- */
function DataDialog({
  trigger,
  title,
  subtitle,
  details,
  image,
  accent,
  ctaLabel,
  onCta,
}: {
  trigger: React.ReactNode;
  title: string;
  subtitle: string;
  details: typeof studentDetails;
  image: string;
  accent: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border/50">
        {/* Hero image */}
        <div className="relative h-48 md:h-56 overflow-hidden rounded-t-lg">
          <img src={image} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6">
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-2 ${accent}`}>
              <AlertTriangle className="w-3 h-3" /> DADOS CIENTÍFICOS
            </span>
            <DialogTitle className="text-2xl md:text-3xl font-display font-bold text-foreground">{title}</DialogTitle>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <DialogDescription className="text-base text-muted-foreground mb-6 leading-relaxed">
            {subtitle}
          </DialogDescription>

          <div className="space-y-4">
            {details.map((d, i) => (
              <motion.div
                key={d.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/40 transition-colors"
              >
                <div className="flex gap-3">
                  <span className="text-2xl shrink-0" aria-hidden>{d.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-display font-bold text-foreground mb-1">{d.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-2">{d.fact}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                      <ExternalLink className="w-3 h-3" /> Fonte: {d.source}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Hopeful turn — neuromarketing pattern: dor → esperança → ação */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 p-6 rounded-2xl gradient-institute relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary-foreground/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary-foreground/90">
                  Mas há uma saída baseada em ciência
                </span>
              </div>
              <h4 className="text-xl md:text-2xl font-display font-bold text-primary-foreground mb-3 leading-tight">
                40% da nossa felicidade é controlável.
              </h4>
              <p className="text-primary-foreground/85 text-sm leading-relaxed mb-5">
                Yale provou: pequenos hábitos científicos reduzem ansiedade, aumentam conexão e devolvem propósito.
                Este app aplica essa ciência — gratuita, gamificada e adaptada à realidade brasileira.
              </p>
              <button
                onClick={onCta}
                className="group inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-background text-foreground font-bold text-sm shadow-lg hover:scale-[1.02] transition-transform"
              >
                {ctaLabel}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Main Section ---------- */
export default function CrisisDataSection() {
  const navigate = useNavigate();
  const [audience, setAudience] = useState<"students" | "teachers">("students");

  const stats = audience === "students" ? studentStats : teacherStats;

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background mood */}
      <div className="absolute inset-0 bg-destructive/5" />
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-destructive/10 blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      <div className="container max-w-6xl relative">
        {/* Pre-header — neuromarketing: pattern interrupt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/15 text-destructive text-sm font-bold mb-6 border border-destructive/30">
            <AlertTriangle className="w-4 h-4" /> Urgência Real • Dados oficiais 2024–2026
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold mb-4 leading-[1.05] max-w-4xl mx-auto">
            Há uma <span className="text-destructive">crise silenciosa</span> nas escolas brasileiras.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Os números que você está prestes a ver vêm do <strong className="text-foreground">IBGE, Oxford, CNTE e Fiocruz</strong>.
            Não são opinião. São o retrato de quem precisa de você — e de quem cuida deles.
          </p>
        </motion.div>

        {/* Audience toggle — separates UX as requested */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1.5 rounded-2xl glass-card border border-border/50">
            <button
              onClick={() => setAudience("students")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                audience === "students"
                  ? "gradient-institute text-primary-foreground shadow-warm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" /> Adolescentes
            </button>
            <button
              onClick={() => setAudience("teachers")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                audience === "teachers"
                  ? "gradient-institute text-primary-foreground shadow-warm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="w-4 h-4" /> Professores
            </button>
          </div>
        </div>

        {/* Animated stat grid */}
        <motion.div
          key={audience}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10"
        >
          {stats.map((s, i) => (
            <StatPill key={`${audience}-${i}`} stat={s} index={i} />
          ))}
        </motion.div>

        {/* CTA cards — Students & Teachers detailed dialogs */}
        <div className="grid md:grid-cols-2 gap-5 mb-12">
          {/* Students card */}
          <DataDialog
            title="Adolescentes em silêncio"
            subtitle="O que a Pesquisa Nacional de Saúde Escolar do IBGE e o World Happiness Report de Oxford revelam sobre a geração que mais sofre — e por quê meninas estão na linha de frente da dor."
            details={studentDetails}
            image={youthReflection}
            accent="bg-destructive/20 text-destructive"
            ctaLabel="Começar a cuidar — Grátis"
            onCta={() => navigate("/auth")}
            trigger={
              <motion.button
                whileHover={{ y: -4 }}
                className="group relative text-left p-6 rounded-3xl glass-card border border-border/50 hover:border-destructive/40 hover:shadow-float transition-all overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-destructive/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-destructive/15 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-destructive mb-1">Fonte: IBGE / Oxford</p>
                    <h3 className="font-display font-bold text-xl mb-2 group-hover:text-destructive transition-colors">
                      Adolescentes em silêncio
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      Tristeza, autolesão, desesperança. <strong className="text-foreground">3 em cada 10 jovens</strong> sofrem em silêncio no Brasil.
                    </p>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-destructive group-hover:gap-2 transition-all">
                      Ver dados completos <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </motion.button>
            }
          />

          {/* Teachers card */}
          <DataDialog
            title="Professores no limite"
            subtitle="A pesquisa da Apeoesp e da CNTE/Fiocruz mostram um colapso silencioso: quem cuida dos jovens está adoecendo na mesma proporção. Cuidar de quem ensina é cuidar do futuro."
            details={teacherDetails}
            image={teacherExhausted}
            accent="bg-orange-500/20 text-orange-400"
            ctaLabel="Programa para escolas"
            onCta={() => {
              const el = document.getElementById("planos");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            trigger={
              <motion.button
                whileHover={{ y: -4 }}
                className="group relative text-left p-6 rounded-3xl glass-card border border-border/50 hover:border-orange-500/40 hover:shadow-float transition-all overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-orange-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/15 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-6 h-6 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-1">Fonte: Apeoesp / CNTE</p>
                    <h3 className="font-display font-bold text-xl mb-2 group-hover:text-orange-400 transition-colors">
                      Professores no limite
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      Burnout cresceu <strong className="text-foreground">800% em 4 anos</strong>. Quem cuida do futuro precisa de cuidado também.
                    </p>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-400 group-hover:gap-2 transition-all">
                      Ver dados completos <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </motion.button>
            }
          />
        </div>

        {/* Hopeful pivot — neuromarketing: dor → esperança → CTA principal */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative p-8 md:p-12 rounded-[2rem] gradient-institute overflow-hidden text-center"
        >
          <motion.div
            className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-primary-foreground/10 blur-3xl"
            animate={{ y: [-20, 20, -20], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full bg-primary-foreground/10 blur-3xl"
            animate={{ y: [10, -10, 10] }}
            transition={{ duration: 6, repeat: Infinity }}
          />

          <div className="relative max-w-3xl mx-auto">
            <div className="flex justify-center gap-3 mb-6">
              {[Brain, Heart, Shield].map((Icon, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: -45 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, type: "spring" }}
                  className="w-12 h-12 rounded-2xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center"
                >
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </motion.div>
              ))}
            </div>

            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-foreground/15 text-primary-foreground text-xs font-bold mb-5 uppercase tracking-wider">
              <TrendingDown className="w-3 h-3 rotate-180" /> A boa notícia que a ciência confirma
            </span>

            <h3 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground mb-5 leading-[1.05]">
              <span className="text-3xl md:text-4xl block opacity-90 font-normal">Os dados doem.</span>
              <span className="block">Mas <span className="underline decoration-primary-foreground/40 underline-offset-8 decoration-4">40% da felicidade é treinável.</span></span>
            </h3>

            <p className="text-primary-foreground/85 text-base md:text-lg leading-relaxed mb-8 max-w-xl mx-auto">
              É exatamente isso que Yale ensinou para 3,3 milhões de pessoas. Agora, é gratuito,
              em português, gamificado — e desenhado para a realidade do adolescente brasileiro.
            </p>

            <button
              onClick={() => navigate("/auth")}
              className="group relative px-8 py-4 rounded-2xl bg-background text-foreground font-bold text-base md:text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-[1.03] inline-flex items-center gap-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Sparkles className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Começar minha transformação — É grátis</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            </button>

            <p className="text-xs text-primary-foreground/60 mt-4">
              ✓ Sem cartão de crédito · ✓ +12.000 jovens já começaram · ✓ Baseado em ciência de Yale
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
