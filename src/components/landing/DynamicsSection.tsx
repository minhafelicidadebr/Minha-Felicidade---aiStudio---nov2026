import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Lightbulb, Target, Sparkles, Brain, ArrowRight, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

const dynamics = [
  { id: "chatbot", icon: "🤖", name: "AlegrIA", desc: "Tutora socrática com evidências científicas", color: "coral", xp: "+variável", detail: "Uma inteligência artificial treinada nos princípios da psicologia positiva e método socrático. Faça perguntas, explore conceitos e receba orientação personalizada com citações científicas reais.", features: ["Respostas baseadas em evidências", "Método socrático adaptativo", "Citações de estudos reais", "Personalizada ao seu progresso"], path: "/alegria" },
  { id: "quiz", icon: "🎯", name: "Quiz Adaptativo", desc: "3 níveis de dificuldade com feedback", color: "gold", xp: "+15 XP", detail: "Sistema de avaliação inteligente que se adapta ao seu nível. Comece no básico e avance até o expert com feedback detalhado e explicações.", features: ["3 níveis: Básico, Intermediário, Expert", "Feedback imediato com explicações", "Tracking de progresso por módulo", "+15 XP por resposta correta"], path: "/quiz" },
  { id: "flashcards", icon: "🃏", name: "Flashcards", desc: "Repetição espaçada para consolidação", color: "navy", xp: "+5 XP", detail: "Baseado no algoritmo de repetição espaçada de Leitner, os flashcards consolidam conceitos-chave na memória de longo prazo.", features: ["Algoritmo de repetição espaçada", "Categorias por módulo", "Flip interativo com animação", "+5 XP por card aprendido"], path: "/flashcards" },
  { id: "evidence", icon: "📊", name: "Evidence Explorer", desc: "Biblioteca científica curada por driver", color: "coral", xp: "+10 XP", detail: "Explore a base científica por trás de cada conceito. Artigos, estudos e meta-análises organizados por driver de felicidade.", features: ["Estudos peer-reviewed", "Organizado por driver", "Links para fontes originais", "Filtros por módulo e tema"], path: "/evidence" },
  { id: "simulator", icon: "🎮", name: "Simulador", desc: "Cenários com consequências reais", color: "gold", xp: "+25 XP", detail: "Cenários interativos onde suas decisões têm consequências. Explore dilemas reais da vida adolescente com ciência.", features: ["Cenários realistas", "Múltiplos desfechos", "Feedback baseado em ciência", "+25 XP por cenário"], path: "/simulator" },
  { id: "debate", icon: "⚔️", name: "Arena de Debate", desc: "Debate socrático + argumentação", color: "navy", xp: "+20 XP", detail: "Desenvolva pensamento crítico debatendo temas controversos da felicidade. Construa argumentos e explore perspectivas.", features: ["Temas provocativos", "Mapa de argumentos", "Pensamento crítico", "+20 XP por debate"], path: "/debate" },
  { id: "poetry", icon: "🎭", name: "Poesia Pedagógica", desc: "Poema + prática reflexiva", color: "coral", xp: "+15 XP", detail: "A arte como ferramenta de aprendizagem. Gere poesias personalizadas sobre os conceitos e use como gatilho reflexivo.", features: ["Geração com IA criativa", "Múltiplos estilos", "Prática reflexiva guiada", "Expressão artística"], path: "/poetry" },
  { id: "codesign", icon: "🏗️", name: "Co-design", desc: "Plano de intervenção com métricas", color: "gold", xp: "+30 XP", detail: "Crie seu plano de intervenção em bem-estar usando frameworks como WOOP e Implementation Intentions.", features: ["Framework WOOP integrado", "Métricas personalizadas", "Plano de ação estruturado", "Transferência para vida real"], path: "/codesign" },
];

const colorClasses: Record<string, { bg: string; badge: string }> = {
  coral: { bg: "bg-coral-light", badge: "bg-destructive/10 text-destructive" },
  gold: { bg: "bg-gold-light", badge: "bg-secondary/10 text-secondary-foreground" },
  navy: { bg: "bg-navy-light", badge: "bg-accent/10 text-accent" },
};

export default function DynamicsSection() {
  const [selected, setSelected] = useState<typeof dynamics[0] | null>(null);
  const navigate = useNavigate();

  return (
    <section className="py-24 relative overflow-hidden" id="dinamicas">
      <div className="absolute inset-0 gradient-mesh opacity-10" />
      <div className="container max-w-6xl relative">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
            🎮 Pipeline Pedagógico Completo
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            8 Dinâmicas <span className="text-gradient">Gamificadas</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ensinar → Treinar → Transferir para a vida real. Cada dinâmica desenhada com design instrucional de ponta.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {dynamics.map((d, i) => {
            const colors = colorClasses[d.color];
            return (
              <motion.button
                key={d.id}
                className={`relative p-6 rounded-3xl text-left group cursor-pointer transition-all duration-500 hover:-translate-y-2 border border-border/50 overflow-hidden ${colors.bg} hover:shadow-float`}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setSelected(d)}
              >
                {/* Shimmer on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />

                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center backdrop-blur-sm">
                    <Play className="w-3.5 h-3.5 text-primary" />
                  </div>
                </div>

                <span className="text-4xl block mb-4 group-hover:scale-110 transition-transform inline-block">{d.icon}</span>
                <h4 className="font-display font-bold text-base mb-1">{d.name}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{d.desc}</p>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.badge}`}>{d.xp}</span>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  <Lightbulb className="w-3.5 h-3.5" /> Explorar
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
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
              className="relative w-full max-w-lg rounded-3xl bg-card border border-border shadow-float overflow-hidden"
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
            >
              <div className={`p-8 ${colorClasses[selected.color].bg} relative overflow-hidden`}>
                <div className="absolute inset-0 gradient-mesh opacity-20" />
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-background transition-colors z-10"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-5xl block mb-4 relative z-10">{selected.icon}</span>
                <h3 className="font-display font-bold text-2xl mb-2 relative z-10">{selected.name}</h3>
                <div className="flex items-center gap-2 relative z-10">
                  <span className="text-sm text-muted-foreground">{selected.desc}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${colorClasses[selected.color].badge}`}>{selected.xp}</span>
                </div>
              </div>
              <div className="p-8">
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">{selected.detail}</p>
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" /> Recursos
                </h4>
                <ul className="space-y-2.5 mb-8">
                  {selected.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-success" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => { setSelected(null); navigate(selected.path); }}
                  className="w-full py-3.5 rounded-2xl gradient-institute text-primary-foreground font-bold text-sm shadow-warm hover:shadow-glow transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
                >
                  Acessar {selected.name} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
