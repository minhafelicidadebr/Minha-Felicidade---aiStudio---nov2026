import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Sparkles, Users, TrendingUp, Heart, BookOpen, Play, ArrowRight, CheckCircle2, Star } from "lucide-react";

const stats = [
  { icon: Users, value: "3.3M+", label: "alunos no Coursera" },
  { icon: Star, value: "#1", label: "aula mais popular de Yale" },
  { icon: TrendingUp, value: "40%", label: "da felicidade é controlável" },
  { icon: Heart, value: "5", label: "módulos baseados em ciência" },
];

const features = [
  { icon: "🎭", title: "Conceitos Errôneos", desc: "Descubra por que dinheiro, notas e corpo perfeito NÃO sustentam felicidade." },
  { icon: "🐛", title: "Vieses Cognitivos", desc: "Entenda como a adaptação hedônica e a comparação social sabotam seu bem-estar." },
  { icon: "⚡", title: "Rewirements", desc: "6 práticas validadas pela ciência para reprogramar seu cérebro para felicidade." },
  { icon: "🚀", title: "Hábitos Duráveis", desc: "WOOP, Implementation Intentions e Growth Mindset para mudança permanente." },
];

const dynamics = [
  { icon: "🤖", name: "AlegrIA", desc: "Tutora IA socrática" },
  { icon: "🎯", name: "Quiz Adaptativo", desc: "3 níveis de dificuldade" },
  { icon: "🃏", name: "Flashcards", desc: "Repetição espaçada" },
  { icon: "📊", name: "Evidence Explorer", desc: "Fontes científicas curadas" },
  { icon: "🎮", name: "Simulador", desc: "Cenários com consequências" },
  { icon: "⚔️", name: "Arena de Debate", desc: "Debate socrático" },
  { icon: "🎭", name: "Poesia Pedagógica", desc: "Reflexão criativa" },
  { icon: "🏗️", name: "Co-design", desc: "Planos de intervenção" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-warm flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">Ciência do <span className="text-primary">Bem-Estar</span></span>
          </div>
          <button
            onClick={() => navigate("/auth")}
            className="px-5 py-2.5 rounded-xl gradient-warm text-primary-foreground text-sm font-semibold shadow-warm hover:shadow-lg transition-all"
          >
            Começar Grátis
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container relative max-w-5xl text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" /> Baseado no curso de Yale — gratuito para adolescentes
            </span>
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
              A Ciência do{" "}
              <span className="text-gradient">Bem-Estar</span>
              <br />
              <span className="text-3xl md:text-4xl text-muted-foreground font-normal">para Adolescentes</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              A aula mais popular da história da Universidade de Yale.
              Agora <strong className="text-foreground">gratuita</strong>, gamificada e com tutoria de IA.
              Descubra o que a ciência diz sobre como ser realmente feliz.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/auth")}
                className="px-8 py-4 rounded-2xl gradient-warm text-primary-foreground font-bold text-lg shadow-warm hover:shadow-lg transition-all flex items-center gap-2 justify-center"
              >
                <Play className="w-5 h-5" /> Começar Minha Jornada
              </button>
              <a
                href="#sobre"
                className="px-8 py-4 rounded-2xl bg-muted hover:bg-muted/80 font-semibold text-lg transition-colors flex items-center gap-2 justify-center"
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
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16"
          >
            {stats.map((s) => (
              <div key={s.label} className="p-5 rounded-2xl bg-card border border-border">
                <s.icon className="w-6 h-6 text-primary mb-2 mx-auto" />
                <div className="text-2xl font-display font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Crisis */}
      <section className="py-20 bg-destructive/5" id="sobre">
        <div className="container max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
            Os adolescentes estão passando por uma <span className="text-destructive">crise de saúde mental</span>.
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Uma pesquisa recente revelou que <strong className="text-foreground">37% dos adolescentes</strong> afirmam ter problemas de saúde mental.
            Explore o que a psicologia nos ensina sobre como ser mais feliz, reduzir o estresse e prosperar.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="px-6 py-3 rounded-xl gradient-warm text-primary-foreground font-semibold shadow-warm"
          >
            Explore Agora <ArrowRight className="w-4 h-4 inline ml-1" />
          </button>
        </div>
      </section>

      {/* What you'll learn */}
      <section className="py-20">
        <div className="container max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">
            Sinta-se melhor. Desenvolva hábitos mais saudáveis.
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Em 5 módulos, a Dra. Laurie Santos reúne as melhores ideias do curso "Psychology and the Good Life" — reformulado para adolescentes.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-card border border-border hover:shadow-warm transition-shadow"
              >
                <span className="text-3xl mb-3 block">{f.icon}</span>
                <h3 className="font-display font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 10 Dynamics */}
      <section className="py-20 bg-secondary/5">
        <div className="container max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">
            10 Dinâmicas Gamificadas
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            Pipeline pedagógico completo: ensinar → treinar → transferir para a vida real.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dynamics.map((d) => (
              <div key={d.name} className="p-5 rounded-2xl bg-card border border-border text-center hover:shadow-warm transition-shadow">
                <span className="text-3xl block mb-2">{d.icon}</span>
                <h4 className="font-display font-bold text-sm mb-1">{d.name}</h4>
                <p className="text-xs text-muted-foreground">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Course Structure */}
      <section className="py-20">
        <div className="container max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12">
            Estrutura do Curso — 5 Semanas
          </h2>
          <div className="space-y-4">
            {[
              { n: 1, icon: "🎭", title: "As Grandes Mentiras Sobre Ser Feliz", desc: "Misconceptions, Miswanting, Falácia de G.I. Joe", tag: "Diagnóstico" },
              { n: 2, icon: "🐛", title: "O Bug das Expectativas", desc: "Adaptação Hedônica, Pontos de Referência, Impact Bias", tag: "Diagnóstico" },
              { n: 3, icon: "⚡", title: "O Que Realmente Funciona", desc: "6 Rewirements: Conexão, Bondade, Gratidão, Flow, Sono, Tempo", tag: "Intervenção" },
              { n: 4, icon: "🧠", title: "Hackeando o Cérebro", desc: "Savoring, Visualização Negativa, Mindfulness, Experiências", tag: "Intervenção" },
              { n: 5, icon: "🚀", title: "Virando o Jogo da Vida Real", desc: "WOOP, Implementation Intentions, Growth Mindset, Hábitos", tag: "Sustentação" },
            ].map((m) => (
              <div key={m.n} className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border">
                <span className="text-3xl">{m.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary uppercase">Módulo {m.n}</span>
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-secondary/20 text-secondary-foreground">{m.tag}</span>
                  </div>
                  <h3 className="font-display font-bold">{m.title}</h3>
                  <p className="text-sm text-muted-foreground">{m.desc}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-muted-foreground/30 shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-warm">
        <div className="container max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
            Você está pronto para se sentir melhor?
          </h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Comece sua jornada de bem-estar baseada em ciência. Gratuito. Gamificado. Com tutoria de IA.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="px-8 py-4 rounded-2xl bg-background text-foreground font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Começar Agora — É Grátis ✨
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">
            Ciência do Bem-Estar — Plataforma de aprendizagem baseada em evidências científicas
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Baseado em "Psychology and the Good Life" — Yale University • Fontes auditáveis • WCAG 2.2 • Anti-alucinação
          </p>
        </div>
      </footer>
    </div>
  );
}
