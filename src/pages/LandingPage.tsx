import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, BookOpen, Sparkles, Users, Star, TrendingUp, Heart, ArrowRight } from "lucide-react";
import heroYouthBg from "@/assets/hero-youth-bg.jpg";
import logoIcon from "@/assets/logo-icon.png";
import logoLightBg from "@/assets/logo-light-bg.png";
import DynamicsSection from "@/components/landing/DynamicsSection";
import CourseStructure from "@/components/landing/CourseStructure";
import ImpactNumbers from "@/components/landing/ImpactNumbers";
import InstituteSection from "@/components/landing/InstituteSection";
import LeadCaptureForm from "@/components/landing/LeadCaptureForm";
import PricingSection from "@/components/landing/PricingSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import Footer from "@/components/Footer";

const stats = [
  { icon: Users, value: "3.3M+", label: "alunos no Coursera" },
  { icon: Star, value: "#1", label: "aula mais popular de Yale" },
  { icon: TrendingUp, value: "40%", label: "da felicidade é controlável" },
  { icon: Heart, value: "5", label: "módulos baseados em ciência" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <img src={logoIcon} alt="Instituto" className="w-9 h-9 rounded-lg" />
            <span className="font-display font-bold text-lg">Ciência do <span className="text-primary">Bem-Estar</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#modulos" className="hover:text-foreground transition-colors">Módulos</a>
            <a href="#dinamicas" className="hover:text-foreground transition-colors">Dinâmicas</a>
            <a href="#sobre" className="hover:text-foreground transition-colors">Instituto</a>
            <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
            <a href="#parceiros" className="hover:text-foreground transition-colors">Parceiros</a>
          </div>
          <button
            onClick={() => navigate("/auth")}
            className="px-5 py-2.5 rounded-xl gradient-institute text-primary-foreground text-sm font-semibold shadow-warm hover:shadow-glow transition-all"
          >
            Começar Grátis
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-20 relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Youth background */}
        <div className="absolute inset-0">
          <img src={heroYouthBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-background/85" />
          <div className="absolute inset-0 gradient-hero opacity-80" />
        </div>

        <div className="container relative max-w-5xl text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="flex justify-center mb-8">
              <img src={logoLightBg} alt="Instituto Felicidade Para Todos" className="h-12 md:h-16 object-contain" />
            </div>
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-8">
              <Sparkles className="w-4 h-4" /> Baseado no curso de Yale — gratuito para adolescentes
            </span>
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
              A Ciência do{" "}
              <span className="text-gradient">Bem-Estar</span>
              <br />
              <span className="text-3xl md:text-4xl text-muted-foreground font-normal">para Adolescentes</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              A aula mais popular da história da Universidade de Yale.
              Agora <strong className="text-foreground">gratuita</strong>, gamificada e com tutoria de IA.
              Descubra o que a ciência diz sobre como ser realmente feliz.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button
                onClick={() => navigate("/auth")}
                className="px-8 py-4 rounded-2xl gradient-institute text-primary-foreground font-bold text-lg shadow-warm hover:shadow-glow transition-all flex items-center gap-2 justify-center"
              >
                <Play className="w-5 h-5" /> Começar Minha Jornada
              </button>
              <a
                href="#sobre"
                className="px-8 py-4 rounded-2xl bg-card/80 backdrop-blur border border-border hover:bg-card font-semibold text-lg transition-colors flex items-center gap-2 justify-center"
              >
                <BookOpen className="w-5 h-5" /> Saiba Mais
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {stats.map((s) => (
              <div key={s.label} className="p-5 rounded-2xl bg-card/80 backdrop-blur border border-border">
                <s.icon className="w-6 h-6 text-primary mb-2 mx-auto" />
                <div className="text-2xl font-display font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Floating orbs */}
        <motion.div
          className="absolute top-20 right-20 w-40 h-40 rounded-full bg-primary/10 blur-3xl"
          animate={{ y: [-15, 15, -15] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 left-20 w-56 h-56 rounded-full bg-secondary/10 blur-3xl"
          animate={{ y: [10, -10, 10] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </section>

      {/* Crisis */}
      <section className="py-20 bg-destructive/5">
        <div className="container max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Os adolescentes estão passando por uma <span className="text-destructive">crise de saúde mental</span>.
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Uma pesquisa recente revelou que <strong className="text-foreground">37% dos adolescentes</strong> afirmam ter problemas de saúde mental.
              Explore o que a psicologia nos ensina sobre como ser mais feliz, reduzir o estresse e prosperar.
            </p>
            <button
              onClick={() => navigate("/auth")}
              className="px-6 py-3 rounded-xl gradient-institute text-primary-foreground font-semibold shadow-warm hover:shadow-glow transition-all"
            >
              Explore Agora <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* What you'll learn */}
      <section className="py-24">
        <div className="container max-w-5xl">
          <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Sinta-se melhor. Desenvolva hábitos mais <span className="text-gradient">saudáveis</span>.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Em 5 módulos, a Dra. Laurie Santos reúne as melhores ideias do curso "Psychology and the Good Life" — reformulado para adolescentes.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: "🎭", title: "Conceitos Errôneos", desc: "Descubra por que dinheiro, notas e corpo perfeito NÃO sustentam felicidade." },
              { icon: "🐛", title: "Vieses Cognitivos", desc: "Entenda como a adaptação hedônica e a comparação social sabotam seu bem-estar." },
              { icon: "⚡", title: "Rewirements", desc: "6 práticas validadas pela ciência para reprogramar seu cérebro para felicidade." },
              { icon: "🚀", title: "Hábitos Duráveis", desc: "WOOP, Implementation Intentions e Growth Mindset para mudança permanente." },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-3xl bg-card border border-border hover:shadow-premium transition-all duration-500 group"
              >
                <span className="text-4xl mb-4 block">{f.icon}</span>
                <h3 className="font-display font-bold text-xl mb-2 group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <CourseStructure />
      <DynamicsSection />
      <ImpactNumbers />
      <InstituteSection />
      <PricingSection />
      <LeadCaptureForm />

      {/* CTA */}
      <section className="py-24 gradient-institute relative overflow-hidden">
        <motion.div
          className="absolute top-10 right-10 w-40 h-40 rounded-full bg-background/10 blur-3xl"
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <div className="container max-w-3xl text-center relative">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground mb-4">
            Você está pronto para se sentir melhor?
          </h2>
          <p className="text-primary-foreground/80 mb-10 text-lg">
            Comece sua jornada de bem-estar baseada em ciência. Gratuito. Gamificado. Com tutoria de IA.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="px-10 py-5 rounded-2xl bg-background text-foreground font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            Começar Agora — É Grátis ✨
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
