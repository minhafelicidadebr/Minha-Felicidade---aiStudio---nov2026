import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Lightbulb, Target, Sparkles, Brain } from "lucide-react";

const dynamics = [
  { id: "chatbot", icon: "🤖", name: "AlegrIA", desc: "Tutora socrática com evidências científicas", color: "coral", detail: "Uma inteligência artificial treinada nos princípios da psicologia positiva e método socrático. Faça perguntas, explore conceitos e receba orientação personalizada com citações científicas reais.", features: ["Respostas baseadas em evidências", "Método socrático adaptativo", "Citações de estudos reais", "Personalizada ao seu progresso"] },
  { id: "quiz", icon: "🎯", name: "Quiz Adaptativo", desc: "3 níveis de dificuldade com feedback imediato", color: "gold", detail: "Sistema de avaliação inteligente que se adapta ao seu nível. Comece no básico e avance até o nível expert com feedback detalhado e explicações científicas.", features: ["3 níveis: Básico, Intermediário, Expert", "Feedback imediato com explicações", "Tracking de progresso por módulo", "+15 XP por resposta correta"] },
  { id: "flashcards", icon: "🃏", name: "Flashcards", desc: "Repetição espaçada para consolidação", color: "navy", detail: "Baseado no algoritmo de repetição espaçada de Leitner, os flashcards consolidam conceitos-chave da ciência do bem-estar na memória de longo prazo.", features: ["Algoritmo de repetição espaçada", "Categorias por módulo", "Flip interativo com animação", "Consolidação de memória"] },
  { id: "evidence", icon: "📊", name: "Evidence Explorer", desc: "Biblioteca científica curada por driver", color: "coral", detail: "Explore a base científica por trás de cada conceito. Artigos, estudos e meta-análises organizados por driver de felicidade com links diretos para fontes.", features: ["Estudos peer-reviewed", "Organizado por driver", "Links para fontes originais", "Filtros por módulo e tema"] },
  { id: "simulator", icon: "🎮", name: "Simulador de Decisões", desc: "Cenários com consequências reais", color: "gold", detail: "Cenários interativos onde suas decisões têm consequências. Explore dilemas reais da vida adolescente e veja como a ciência da felicidade se aplica na prática.", features: ["Cenários realistas", "Múltiplos desfechos", "Feedback baseado em ciência", "+20 XP por cenário"] },
  { id: "debate", icon: "⚔️", name: "Arena de Debate", desc: "Debate socrático + mapa de argumentos", color: "navy", detail: "Desenvolva pensamento crítico debatendo temas controversos da felicidade. Construa argumentos, refute posições e explore múltiplas perspectivas.", features: ["Temas provocativos", "Mapa de argumentos visual", "Contra-argumentos da IA", "Desenvolvimento de pensamento crítico"] },
  { id: "poetry", icon: "🎭", name: "Poesia Pedagógica", desc: "Poema + prática reflexiva", color: "coral", detail: "A arte como ferramenta de aprendizagem. Gere poesias personalizadas sobre os conceitos estudados e use como gatilho para reflexão profunda.", features: ["Geração com IA criativa", "Múltiplos estilos poéticos", "Prática reflexiva guiada", "Expressão artística"] },
  { id: "codesign", icon: "🏗️", name: "Estúdio de Co-design", desc: "Plano de intervenção com métricas", color: "gold", detail: "Crie seu próprio plano de intervenção em bem-estar. Use frameworks como WOOP e Implementation Intentions para desenhar ações mensuráveis.", features: ["Framework WOOP integrado", "Métricas personalizadas", "Plano de ação estruturado", "Transferência para vida real"] },
];

const iconMap: Record<string, React.ReactNode> = {
  coral: <Sparkles className="w-5 h-5" />,
  gold: <Target className="w-5 h-5" />,
  navy: <Brain className="w-5 h-5" />,
};

export default function DynamicsSection() {
  const [selected, setSelected] = useState<typeof dynamics[0] | null>(null);

  return (
    <section className="py-24 bg-muted/30" id="dinamicas">
      <div className="container max-w-6xl">
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
            10 Dinâmicas <span className="text-gradient">Gamificadas</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ensinar → Treinar → Transferir para a vida real. Cada dinâmica foi desenhada com design instrucional de ponta.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {dynamics.map((d, i) => (
            <motion.button
              key={d.id}
              className={`relative p-6 rounded-3xl text-left group cursor-pointer transition-all duration-500 hover:-translate-y-2 border border-border overflow-hidden ${
                d.color === "coral" ? "bg-coral-light hover:shadow-warm" :
                d.color === "gold" ? "bg-gold-light hover:shadow-warm" :
                "bg-navy-light hover:shadow-warm"
              }`}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setSelected(d)}
            >
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-primary" />
                </div>
              </div>
              <span className="text-4xl block mb-4">{d.icon}</span>
              <h4 className="font-display font-bold text-base mb-1">{d.name}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{d.desc}</p>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                <Lightbulb className="w-3.5 h-3.5" /> Explorar
              </div>
            </motion.button>
          ))}
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
            <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <motion.div
              className="relative w-full max-w-lg rounded-3xl bg-card border border-border shadow-premium overflow-hidden"
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
            >
              <div className={`p-8 ${
                selected.color === "coral" ? "bg-coral-light" :
                selected.color === "gold" ? "bg-gold-light" :
                "bg-navy-light"
              }`}>
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-5xl block mb-4">{selected.icon}</span>
                <h3 className="font-display font-bold text-2xl mb-2">{selected.name}</h3>
                <p className="text-sm text-muted-foreground">{selected.desc}</p>
              </div>
              <div className="p-8">
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">{selected.detail}</p>
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Recursos
                </h4>
                <ul className="space-y-2 mb-8">
                  {selected.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="/auth"
                  className="block w-full py-3.5 rounded-2xl gradient-institute text-primary-foreground text-center font-bold text-sm shadow-warm hover:shadow-glow transition-shadow"
                >
                  Acessar {selected.name} →
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
