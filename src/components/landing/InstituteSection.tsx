import { motion } from "framer-motion";
import logoLightBg from "@/assets/logo-light-bg.png";
import { Sparkles, BarChart3, BookOpen, RefreshCw, Rocket } from "lucide-react";

const pillars = [
  { icon: BarChart3, title: "Mensuração", desc: "Dados e indicadores de bem-estar", color: "text-primary" },
  { icon: BookOpen, title: "Educação", desc: "Formação baseada em ciência", color: "text-accent" },
  { icon: RefreshCw, title: "Transformação", desc: "Intervenções de impacto", color: "text-secondary" },
  { icon: Rocket, title: "Evolução", desc: "Desenvolvimento contínuo", color: "text-success" },
];

const ecosystem = [
  { icon: "🎓", title: "Pesquisa FIB", desc: "Felicidade Interna Bruta — instrumento cientificamente validado" },
  { icon: "🏛️", title: "Conferência Nacional", desc: "Maior evento de ciência da felicidade do Brasil" },
  { icon: "💼", title: "Consultoria Organizacional", desc: "Programas para empresas e instituições públicas" },
  { icon: "🌱", title: "Projetos Comunitários", desc: "Impacto direto em comunidades e territórios" },
];

export default function InstituteSection() {
  return (
    <section className="py-24 relative overflow-hidden" id="sobre">
      <div className="absolute inset-0 gradient-mesh opacity-20" />
      <div className="container max-w-6xl relative">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <img src={logoLightBg} alt="Instituto Felicidade Para Todos" className="h-16 md:h-20 object-contain mb-8" />
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 leading-tight">
              Sobre o <span className="text-gradient">Instituto</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              O Instituto Felicidade Para Todos é uma organização de impacto social com a missão de
              <strong className="text-foreground"> ativar e animar ecossistemas sustentáveis</strong> de felicidade humana,
              socioambiental e organizacional.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Unimos <strong className="text-foreground">ciência, dados e tecnologia</strong> para transformar
              realidades por meio de quatro pilares fundamentais:
            </p>
            <div className="grid grid-cols-2 gap-4">
              {pillars.map((p, i) => (
                <motion.div
                  key={p.title}
                  className="p-4 rounded-2xl glass-card hover:shadow-float transition-all duration-500 group hover:-translate-y-1"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className={`w-9 h-9 rounded-xl bg-muted flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                    <p.icon className={`w-4.5 h-4.5 ${p.color}`} />
                  </div>
                  <h4 className="font-display font-bold text-sm">{p.title}</h4>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="p-8 rounded-3xl glass-card shadow-float">
              <h3 className="font-display font-bold text-2xl mb-6 text-center flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Nosso Ecossistema
              </h3>
              <div className="space-y-3">
                {ecosystem.map((item, i) => (
                  <motion.div
                    key={item.title}
                    className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-all group"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                  >
                    <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">{item.icon}</span>
                    <div>
                      <h4 className="font-bold text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
