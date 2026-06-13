import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, BookOpen, Sparkles, Users, Star, TrendingUp, Heart, ArrowRight, ArrowDown, Shield, Zap, GraduationCap } from "lucide-react";
import heroYouth from "@/assets/hero-youth-2026.jpg";
import logoIcon from "@/assets/logo-icon.png";
import logoLightBg from "@/assets/logo-light-bg.png";
import youthConnection from "@/assets/youth-connection.jpg";
import youthCelebration from "@/assets/youth-celebration.jpg";
import youthDiscovery from "@/assets/youth-discovery.jpg";
import CrisisDataSection from "@/components/landing/CrisisDataSection";
import DynamicsSection from "@/components/landing/DynamicsSection";
import InteractiveToolsShowcase from "@/components/landing/InteractiveToolsShowcase";
import CourseStructure from "@/components/landing/CourseStructure";
import ImpactNumbers from "@/components/landing/ImpactNumbers";
import InstituteSection from "@/components/landing/InstituteSection";
import LeadCaptureForm from "@/components/landing/LeadCaptureForm";
import PricingSection from "@/components/landing/PricingSection";
import SchoolCalculator from "@/components/landing/SchoolCalculator";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FAQSection from "@/components/landing/FAQSection";
import SocialProofBar from "@/components/landing/SocialProofBar";
import HeroAlegriaLive from "@/components/landing/HeroAlegriaLive";
import MoodCheckIn from "@/components/landing/MoodCheckIn";
import WellbeingScrollStory from "@/components/landing/WellbeingScrollStory";
import Footer from "@/components/Footer";

const stats = [
  { icon: Users, value: "+12k", label: "jovens transformados", delay: 0 },
  { icon: Star, value: "4.9★", label: "satisfação de escolas", delay: 0.1 },
  { icon: TrendingUp, value: "87%", label: "redução de ansiedade*", delay: 0.2 },
  { icon: Heart, value: "Yale", label: "currículo licenciado", delay: 0.3 },
];

const trustBadges = [
  { icon: Shield, label: "Fontes Verificáveis" },
  { icon: GraduationCap, label: "Baseado em Yale" },
  { icon: Zap, label: "IA Socrática" },
  { icon: BookOpen, label: "WCAG 2.2" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <img src={logoIcon} alt="Instituto" className="w-9 h-9 rounded-lg" />
            <span className="font-display font-bold text-lg hidden sm:inline">Ciência do <span className="text-primary">Bem-Estar</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#modulos" className="hover:text-foreground transition-colors">Módulos</a>
            <a href="#dinamicas" className="hover:text-foreground transition-colors">Dinâmicas</a>
            <a href="#ferramentas" className="hover:text-foreground transition-colors">Ferramentas</a>
            <a href="#sobre" className="hover:text-foreground transition-colors">Instituto</a>
            <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
          </div>
          <button
            onClick={() => navigate("/auth")}
            className="px-5 py-2.5 rounded-xl gradient-institute text-primary-foreground text-sm font-semibold shadow-warm hover:shadow-glow transition-all hover:scale-[1.02]"
          >
            Começar Grátis
          </button>
        </div>
      </nav>

      {/* Hero — 2026 editorial: organic photo blend, no boxed frames, premium SaaS conversion */}
      <section className="pt-20 relative overflow-hidden min-h-screen flex flex-col">
        {/* Background photo — organically blended, faces in lower third */}
        <div className="absolute inset-0">
          <img
            src={heroYouth}
            alt="Jovens diversos celebrando o bem-estar baseado em ciência"
            className="absolute inset-0 w-full h-full object-cover object-bottom"
            loading="eager"
            fetchPriority="high"
          />
          {/* Editorial gradient — top reads clean, photo dissolves up into aurora */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/85 via-40% to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/70 via-background/20 to-transparent" />
          <div className="absolute inset-0 gradient-aurora opacity-30 mix-blend-soft-light" />
          <div className="absolute inset-0 noise opacity-[0.12] mix-blend-overlay" />
        </div>

        {/* Aurora orbs — premium drifting lights */}
        <div className="orb-aurora top-32 right-[8%] w-80 h-80 bg-primary/35" />
        <div className="orb-aurora top-1/4 left-[6%] w-96 h-96 bg-secondary/30" style={{ animationDelay: "-4s", animationDuration: "18s" }} />
        <div className="orb-aurora top-40 left-1/3 w-56 h-56 bg-accent/30" style={{ animationDelay: "-8s", animationDuration: "16s" }} />
        <div className="orb-aurora bottom-20 right-1/4 w-72 h-72 bg-primary/20" style={{ animationDelay: "-2s", animationDuration: "20s" }} />

        <div className="container relative max-w-5xl text-center pt-8 pb-32 flex-1 flex flex-col justify-center">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}>
            <div className="flex justify-center mb-6">
              <motion.img
                src={logoLightBg}
                alt="Instituto Felicidade Para Todos"
                className="h-12 md:h-14 object-contain"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              />
            </div>

            {/* SaaS conversion badge — clarifies positioning */}
            <motion.span
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass text-primary text-sm font-bold mb-6 shadow-warm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Sparkles className="w-4 h-4" /> SaaS Educacional · Currículo Yale · Demo gratuita
            </motion.span>

            <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-display font-bold leading-[1.02] mb-6 tracking-tight">
              A Ciência da{" "}
              <span className="text-gradient-aurora">Felicidade</span>
              <br />
              <motion.span
                className="text-3xl md:text-4xl text-foreground/70 font-normal block mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                que sua escola pode adotar hoje
              </motion.span>
            </h1>

            <motion.p
              className="text-lg md:text-xl text-foreground/75 max-w-2xl mx-auto mb-8 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Plataforma SaaS que transforma o currículo #1 de Yale em jornada gamificada com IA socrática.
              <strong className="text-foreground"> Teste grátis 14 dias</strong> · planos a partir de R$ 29/mês · descontos B2B para redes escolares.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <button
                onClick={() => navigate("/auth")}
                className="group relative px-8 py-4 rounded-2xl gradient-institute text-primary-foreground font-bold text-lg shadow-warm hover:shadow-glow transition-all hover:scale-[1.03] flex items-center gap-2 justify-center overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <Play className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Iniciar Demo Gratuita</span>
                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#planos"
                className="px-8 py-4 rounded-2xl glass hover:bg-card/90 font-semibold text-lg transition-all flex items-center gap-2 justify-center hover:shadow-warm border border-border/40"
              >
                Ver Planos & Preços
              </a>
            </motion.div>

            <motion.p
              className="text-xs text-muted-foreground/80 mb-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85 }}
            >
              Sem cartão de crédito · Cancele quando quiser · Adotado por +120 escolas
            </motion.p>

            {/* Trust badges */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              {trustBadges.map((b) => (
                <div key={b.label} className="flex items-center gap-1.5 text-foreground/60">
                  <b.icon className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold uppercase tracking-wider">{b.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Stats — floating glass tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto w-full">
            {stats.map((s) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + s.delay, duration: 0.6 }}
                className="group p-4 md:p-5 rounded-2xl glass-card hover:shadow-float transition-all duration-500 hover:-translate-y-1"
              >
                <s.icon className="w-6 h-6 text-primary mb-2 mx-auto group-hover:scale-110 transition-transform" />
                <div className="text-xl md:text-2xl font-display font-bold">{s.value}</div>
                <div className="text-[11px] md:text-xs text-muted-foreground leading-tight">{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Innovation #1 — Live AlegrIA demo inline */}
          <HeroAlegriaLive />
        </div>

        {/* Scroll cue — fixed at bottom */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <a href="#modulos" className="w-10 h-10 rounded-full glass flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors" aria-label="Scroll">
            <ArrowDown className="w-5 h-5" />
          </a>
        </motion.div>
      </section>

      <SocialProofBar />

      {/* Crisis section — neuromarketing data storytelling with sourced stats */}
      {/* Innovation #2 — Mood-driven personalization */}
      <MoodCheckIn />

      <CrisisDataSection />

      {/* Innovation #3 — Scroll-driven transformation narrative */}
      <WellbeingScrollStory />

      {/* What you'll learn — with editorial transformation photo */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-30" />
        <div className="container max-w-6xl relative">
          {/* Cinematic hero photo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative rounded-[2rem] overflow-hidden shadow-float mb-16 aspect-[16/9] md:aspect-[21/9]"
          >
            <img
              src={youthConnection}
              alt="Jovens brasileiros conectados, descobrindo a ciência do bem-estar juntos"
              width={1920}
              height={1080}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent" />

            <div className="absolute inset-0 flex items-end md:items-center p-8 md:p-16">
              <motion.div
                className="max-w-lg"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-primary text-xs font-bold mb-4 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> A transformação é real
                </span>
                <h2 className="text-3xl md:text-5xl font-display font-bold leading-[1.05] text-foreground drop-shadow-lg">
                  Sinta-se melhor.<br />
                  <span className="text-gradient-aurora">Hábitos saudáveis.</span>
                </h2>
                <p className="text-base md:text-lg text-foreground/85 mt-4 leading-relaxed">
                  Em 5 módulos, a Dra. Laurie Santos reúne as melhores ideias do curso "Psychology and the Good Life".
                </p>
              </motion.div>
            </div>

            {/* Floating chip */}
            <motion.div
              className="absolute top-6 right-6 hidden md:flex items-center gap-2 glass-card px-4 py-2 rounded-full"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7 }}
            >
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-semibold">+12.000 jovens já começaram</span>
            </motion.div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: "🎭", title: "Conceitos Errôneos", desc: "Descubra por que dinheiro, notas e corpo perfeito NÃO sustentam felicidade.", gradient: "gradient-card-coral" },
              { icon: "🐛", title: "Vieses Cognitivos", desc: "Entenda como a adaptação hedônica e a comparação social sabotam seu bem-estar.", gradient: "gradient-card-navy" },
              { icon: "⚡", title: "Rewirements", desc: "6 práticas validadas pela ciência para reprogramar seu cérebro para felicidade.", gradient: "gradient-card-gold" },
              { icon: "🚀", title: "Hábitos Duráveis", desc: "WOOP, Implementation Intentions e Growth Mindset para mudança permanente.", gradient: "gradient-card-coral" },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`p-8 rounded-3xl ${f.gradient} border border-border/50 hover:shadow-float transition-all duration-500 group hover:-translate-y-1`}
              >
                <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform inline-block">{f.icon}</span>
                <h3 className="font-display font-bold text-xl mb-2 group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <CourseStructure />
      <DynamicsSection />
      <InteractiveToolsShowcase />
      <ImpactNumbers />
      <TestimonialsSection />
      <InstituteSection />
      <PricingSection />
      <SchoolCalculator />
      <FAQSection />
      <LeadCaptureForm />

      {/* Final CTA — cinematic split with celebration photo */}
      <section className="relative overflow-hidden">
        <div className="grid lg:grid-cols-2 min-h-[600px]">
          {/* Image side */}
          <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative min-h-[400px] lg:min-h-full overflow-hidden"
          >
            <img
              src={youthCelebration}
              alt="Jovens brasileiros vivendo a transformação do bem-estar baseado em ciência"
              width={1600}
              height={1067}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-primary/20" />
            <div className="absolute inset-0 lg:hidden bg-gradient-to-b from-transparent to-background/80" />

            {/* Floating proof chips */}
            <motion.div
              className="absolute top-6 left-6 glass-card px-4 py-2.5 rounded-2xl flex items-center gap-2"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-semibold">Felicidade é treinável</span>
            </motion.div>
            <motion.div
              className="absolute bottom-8 right-8 glass-card p-4 rounded-2xl max-w-[220px]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-xs font-bold text-primary mb-1">+12.000 JOVENS</p>
              <p className="text-sm leading-snug text-foreground/90">já reescreveram a própria história com ciência.</p>
            </motion.div>
          </motion.div>

          {/* Content side */}
          <div className="gradient-institute noise relative flex items-center px-8 md:px-16 py-20">
            <motion.div
              className="absolute top-10 right-10 w-48 h-48 rounded-full bg-primary-foreground/10 blur-3xl pointer-events-none"
              animate={{ y: [-15, 15, -15], scale: [1, 1.2, 1] }}
              transition={{ duration: 6, repeat: Infinity }}
            />

            {/* Discovery image — floating mini, premium detail */}
            <motion.div
              className="hidden xl:block absolute -left-20 top-1/2 -translate-y-1/2 w-40 h-56 rounded-3xl overflow-hidden shadow-float border-4 border-background/20"
              initial={{ opacity: 0, x: -40, rotate: -8 }}
              whileInView={{ opacity: 1, x: 0, rotate: -6 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <img
                src={youthDiscovery}
                alt="Jovem descobrindo o app de bem-estar"
                width={1080}
                height={1500}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative max-w-md"
            >
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-foreground/15 text-primary-foreground text-xs font-bold mb-5 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> A escolha que muda tudo
              </span>
              <h2 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground mb-5 leading-[1.05]">
                Você está pronto para se sentir <em className="not-italic underline decoration-primary-foreground/40 underline-offset-4">melhor</em>?
              </h2>
              <p className="text-primary-foreground/85 mb-8 text-base md:text-lg leading-relaxed">
                Comece sua jornada de bem-estar baseada em ciência.<br/>
                <strong>Gratuito. Gamificado. Com tutoria de IA.</strong>
              </p>
              <button
                onClick={() => navigate("/auth")}
                className="group relative px-8 py-4 rounded-2xl bg-background text-foreground font-bold text-base md:text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-[1.03] overflow-hidden inline-flex items-center gap-2"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative z-10">Começar Agora — É Grátis</span>
                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-xs text-primary-foreground/60 mt-4">
                ✓ Sem cartão · ✓ +12.000 jovens · ✓ Ciência de Yale
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
