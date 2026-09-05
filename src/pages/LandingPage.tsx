import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Sparkles, Heart, ArrowRight, ArrowDown, Shield, GraduationCap, Drama, Brain, Compass, Rocket } from "lucide-react";
import heroYouth from "@/assets/hero-youth-2026.jpg";
import logoIcon from "@/assets/logo-mf-icon.png";
import DarkModeToggle from "@/components/DarkModeToggle";
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
import FloatingCourseCTA from "@/components/landing/FloatingCourseCTA";
import Footer from "@/components/Footer";


// Benefit pillars — honest value props, no fabricated metrics
const pillars = [
  { icon: Brain, value: "Autoconhecimento", label: "entenda como sua mente funciona", delay: 0 },
  { icon: Heart, value: "Menos ansiedade", label: "práticas de 60 segundos que acalmam", delay: 0.1 },
  { icon: Sparkles, value: "AlegrIA", label: "uma tutora com IA que escuta você", delay: 0.2 },
  { icon: GraduationCap, value: "Ciência de Yale", label: "inspirado no curso de bem-estar de Yale", delay: 0.3 },
];

const trustBadges = [
  { icon: Shield, label: "Fontes verificáveis" },
  { icon: GraduationCap, label: "Inspirado em Yale" },
  { icon: Heart, label: "Feito para adolescentes" },
  { icon: Sparkles, label: "Tutora com IA" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/50 via-secondary/40 to-accent/20 blur-md opacity-80" aria-hidden />
              <img src={logoIcon} alt="Minha Felicidade" className="relative w-9 h-9 object-contain drop-shadow-[0_2px_6px_rgba(242,101,34,0.35)]" />
            </div>
            <span className="hidden sm:flex flex-col leading-none">
              <span className="font-display font-bold text-lg tracking-tight">Minha <span className="text-gradient">Felicidade</span></span>
              <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">Floresce o nosso bem-estar</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#modulos" className="hover:text-foreground transition-colors">Módulos</a>
            <a href="#dinamicas" className="hover:text-foreground transition-colors">Dinâmicas</a>
            <a href="#ferramentas" className="hover:text-foreground transition-colors">Ferramentas</a>
            <a href="#sobre" className="hover:text-foreground transition-colors">Instituto</a>
            <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
          </div>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <button
              onClick={() => navigate("/auth")}
              className="px-5 py-2.5 rounded-xl gradient-institute text-primary-foreground text-sm font-semibold shadow-warm hover:shadow-glow transition-all hover:scale-[1.02]"
            >
              Começar Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero — 2026 editorial: organic photo blend, no boxed frames, premium SaaS conversion */}
      <section className="pt-20 relative overflow-hidden min-h-screen flex flex-col">
        {/* Background photo — organically blended, faces in lower third */}
        <div className="absolute inset-0">
          <img
            src={heroYouth}
            alt="Jovens diversos celebrando o bem-estar baseado em ciência"
            className="img-cinematic absolute inset-0 w-full h-full object-cover object-bottom opacity-90"
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
            {/* SaaS conversion badge — clarifies positioning */}
            <motion.span
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass text-primary text-sm font-bold mb-6 shadow-warm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Sparkles className="w-4 h-4" /> Ciência de Yale · Feito para adolescentes · Comece grátis
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
                ao alcance de cada jovem
              </motion.span>
            </h1>

            <motion.p
              className="text-lg md:text-xl text-foreground/75 max-w-2xl mx-auto mb-8 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Transformamos o curso de bem-estar mais procurado da Universidade de Yale em uma jornada viva:
              aulas curtas, práticas de 60 segundos e a AlegrIA, uma tutora com inteligência artificial que
              conversa, acolhe e ajuda cada jovem a lidar com a ansiedade e se sentir melhor.
              <strong className="text-foreground"> Comece grátis</strong> · planos a partir de R$ 29 por mês.
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
              Sem cartão de crédito · Cancele quando quiser · Comece em 2 minutos
            </motion.p>

            {/* Trust badges — premium chips */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-2.5 mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              {trustBadges.map((b) => (
                <div key={b.label} className="trust-chip text-foreground/75">
                  <span className="icon-tile-soft w-6 h-6 rounded-md">
                    <b.icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider">{b.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Benefit pillars — premium floating tiles (value props, not fabricated metrics) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto w-full">
            {pillars.map((s) => (
              <motion.div
                key={s.value}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + s.delay, duration: 0.6 }}
                className="stat-tile group p-4 md:p-5 rounded-2xl text-center"
              >
                <span className="icon-tile-premium w-11 h-11 rounded-xl mb-3 mx-auto group-hover:rotate-3 transition-transform">
                  <s.icon className="w-5 h-5" />
                </span>
                <div className="text-base md:text-lg font-display font-bold text-gradient-aurora leading-tight">{s.value}</div>
                <div className="text-[11px] md:text-xs text-muted-foreground leading-tight mt-1">{s.label}</div>
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
            className="img-frame-premium mb-16 aspect-[16/9] md:aspect-[21/9] group"
          >
            <img
              src={youthConnection}
              alt="Jovens brasileiros conectados, descobrindo a ciência do bem-estar juntos"
              width={1920}
              height={1080}
              loading="lazy"
              className="img-cinematic w-full h-full object-cover group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent" />

            <div className="absolute inset-0 flex items-end md:items-center p-8 md:p-16 z-10">
              <motion.div
                className="max-w-lg"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-primary text-xs font-bold mb-4 uppercase tracking-wider shadow-warm">
                  <Sparkles className="w-3.5 h-3.5" /> A transformação é real
                </span>
                <h2 className="text-3xl md:text-5xl font-display font-bold leading-[1.05] text-foreground drop-shadow-lg">
                  Sinta-se melhor.<br />
                  <span className="text-gradient-aurora">Hábitos saudáveis.</span>
                </h2>
                <p className="text-base md:text-lg text-foreground/85 mt-4 leading-relaxed">
                  Em 5 módulos, você mergulha nas ideias centrais do curso "Psychology and the Good Life", de Yale, adaptadas para a realidade dos jovens brasileiros.
                </p>
              </motion.div>
            </div>

            {/* Floating chip */}
            <motion.div
              className="absolute top-6 right-6 hidden md:flex items-center gap-2 glass-card px-4 py-2 rounded-full z-10 shadow-warm"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7 }}
            >
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-semibold">Bem-estar que se pratica</span>
            </motion.div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { Icon: Drama, title: "Conceitos Errôneos", desc: "Descubra por que dinheiro, notas e corpo perfeito NÃO sustentam felicidade.", accent: "text-pink-400" },
              { Icon: Brain, title: "Vieses Cognitivos", desc: "Entenda como a adaptação hedônica e a comparação social sabotam seu bem-estar.", accent: "text-violet-400" },
              { Icon: Compass, title: "Rewirements", desc: "6 práticas validadas pela ciência para reprogramar seu cérebro para felicidade.", accent: "text-emerald-400" },
              { Icon: Rocket, title: "Hábitos Duráveis", desc: "WOOP, Implementation Intentions e Growth Mindset para mudança permanente.", accent: "text-orange-400" },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card-premium p-8 rounded-3xl group"
              >
                <span className={`icon-tile-premium w-16 h-16 rounded-2xl mb-5 flex items-center justify-center group-hover:rotate-6 transition-transform ${f.accent}`}>
                  <f.Icon className="w-7 h-7" strokeWidth={1.5} />
                </span>
                <h3 className="font-display font-bold text-xl mb-2 group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <CourseStructure />
      <DynamicsSection />

      {/* Innovation #2 — Mood-driven personalization */}
      <MoodCheckIn />

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
              className="img-cinematic absolute inset-0 w-full h-full object-cover"
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
              <p className="text-xs font-bold text-primary mb-1">CIÊNCIA DE VERDADE</p>
              <p className="text-sm leading-snug text-foreground/90">transformada em prática para a sua vida real.</p>
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
                Comece sua jornada de bem-estar baseada em ciência.<br />
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
                ✓ Sem cartão · ✓ Comece grátis · ✓ Inspirado em Yale
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
