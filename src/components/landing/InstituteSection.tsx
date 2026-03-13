import { motion } from "framer-motion";
import logoLightBg from "@/assets/logo-light-bg.png";

export default function InstituteSection() {
  return (
    <section className="py-24 relative overflow-hidden" id="sobre">
      <div className="absolute inset-0 gradient-hero opacity-50" />
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
              {[
                { icon: "📊", title: "Mensuração", desc: "Dados e indicadores de bem-estar" },
                { icon: "📚", title: "Educação", desc: "Formação baseada em ciência" },
                { icon: "🔄", title: "Transformação", desc: "Intervenções de impacto" },
                { icon: "🚀", title: "Evolução", desc: "Desenvolvimento contínuo" },
              ].map((pillar) => (
                <motion.div
                  key={pillar.title}
                  className="p-4 rounded-2xl bg-card border border-border hover:shadow-warm transition-all"
                  whileHover={{ scale: 1.03 }}
                >
                  <span className="text-2xl block mb-2">{pillar.icon}</span>
                  <h4 className="font-display font-bold text-sm">{pillar.title}</h4>
                  <p className="text-xs text-muted-foreground">{pillar.desc}</p>
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
            <div className="p-8 rounded-3xl bg-card border border-border shadow-premium">
              <h3 className="font-display font-bold text-2xl mb-6 text-center">Nosso Ecossistema</h3>
              <div className="space-y-4">
                {[
                  { icon: "🎓", title: "Pesquisa FIB", desc: "Felicidade Interna Bruta — instrumento cientificamente validado" },
                  { icon: "🏛️", title: "Conferência Nacional", desc: "Maior evento de ciência da felicidade do Brasil" },
                  { icon: "💼", title: "Consultoria Organizacional", desc: "Programas para empresas e instituições públicas" },
                  { icon: "🌱", title: "Projetos Comunitários", desc: "Impacto direto em comunidades e territórios" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                    <span className="text-2xl shrink-0">{item.icon}</span>
                    <div>
                      <h4 className="font-bold text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
