import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { modules, quizQuestions, flashcards, evidenceItems } from "@/data/courseData";
import { moduleContents, simulatorScenarios, debateTopics, poems, coDesignTemplates } from "@/data/moduleContents";
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, Info, Lightbulb, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";

const statusIcon = {
  verificado: <CheckCircle2 className="w-4 h-4 text-success shrink-0" />,
  parcial: <Info className="w-4 h-4 text-secondary shrink-0" />,
  simplificação: <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />,
};
const statusLabel = {
  verificado: "bg-success/10 text-success",
  parcial: "bg-secondary/20 text-secondary-foreground",
  simplificação: "bg-destructive/10 text-destructive",
};

const activityDefs = [
  { key: "alegria", icon: "🤖", title: "AlegrIA", path: "/alegria", check: () => true },
  { key: "quiz", icon: "🎯", title: "Quiz", path: "/quiz", check: (id: string) => quizQuestions.some(q => q.module === id) },
  { key: "flashcards", icon: "🃏", title: "Flashcards", path: "/flashcards", check: (id: string) => flashcards.some(f => f.module === id) },
  { key: "evidence", icon: "📊", title: "Evidências", path: "/evidence", check: (id: string) => evidenceItems.some(e => e.module === id) },
  { key: "simulator", icon: "🎮", title: "Simulador", path: "/simulator", check: (id: string) => simulatorScenarios.some(s => s.module === id) },
  { key: "debate", icon: "⚔️", title: "Debate", path: "/debate", check: (id: string) => debateTopics.some(d => d.module === id) },
  { key: "poetry", icon: "🎭", title: "Poesia", path: "/poetry", check: (id: string) => poems.some(p => p.module === id) },
  { key: "codesign", icon: "🏗️", title: "Co-design", path: "/codesign", check: (id: string) => coDesignTemplates.some(c => c.module === id) },
];

export default function ModulePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const mod = modules.find((m) => m.id === id);
  const content = id ? moduleContents[id] : undefined;

  if (!mod || !content) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-24 text-center">
          <h1 className="text-2xl font-display font-bold">Módulo não encontrado</h1>
          <button onClick={() => navigate("/")} className="mt-4 text-primary hover:underline">Voltar ao início</button>
        </div>
      </div>
    );
  }

  const available = activityDefs.filter(a => a.key === "alegria" || a.check(id!));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar à trilha
          </button>

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{mod.icon}</span>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Módulo {mod.number} • Dia {mod.day}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> {mod.duration}</span>
            </div>
            <h1 className="text-4xl font-display font-bold mb-2">{mod.title}</h1>
            <p className="text-lg text-muted-foreground">{mod.subtitle}</p>
          </div>

          {/* Key Insight */}
          <div className="gradient-card-gold rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-secondary mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary-foreground/70">Insight-Chave</span>
                <p className="font-display text-lg font-semibold mt-1">{content.keyInsight}</p>
              </div>
            </div>
          </div>

          {/* 🚀 Learning Activities CTAs */}
          <section className="mb-10">
            <h2 className="text-2xl font-display font-bold mb-4">🚀 Atividades de Aprendizagem</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {available.map((act) => (
                <button
                  key={act.key}
                  onClick={() => navigate(act.key === "alegria" ? act.path : `${act.path}?module=${id}`)}
                  className="group p-4 rounded-2xl bg-card border border-border hover:shadow-warm hover:-translate-y-1 transition-all text-left"
                >
                  <span className="text-2xl block mb-2">{act.icon}</span>
                  <h4 className="font-display font-bold text-sm">{act.title}</h4>
                </button>
              ))}
            </div>
          </section>

          {/* Overview */}
          <section className="mb-10">
            <h2 className="text-2xl font-display font-bold mb-3">Visão Geral</h2>
            <p className="leading-relaxed text-foreground/90">{content.overview}</p>
          </section>

          {/* Learning Objectives */}
          <section className="mb-10">
            <h2 className="text-2xl font-display font-bold mb-4">🎯 Objetivos de Aprendizagem</h2>
            <div className="space-y-3">
              {content.learningObjectives.map((obj, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                  <span className="w-6 h-6 rounded-full gradient-warm flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">{i + 1}</span>
                  <p className="text-sm">{obj}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Activities */}
          <section className="mb-10">
            <h2 className="text-2xl font-display font-bold mb-4">🛠️ Atividades</h2>
            <div className="grid gap-4">
              {content.activities.map((act, i) => (
                <div key={i} className="bg-card rounded-2xl p-5 border border-border hover:shadow-warm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-display font-bold">{act.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-primary/10 text-primary">{act.type}</span>
                      <span className="text-xs text-muted-foreground">{act.duration}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{act.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Scientific Audit */}
          <section className="mb-10">
            <h2 className="text-2xl font-display font-bold mb-4">🔬 Auditoria Científica</h2>
            <div className="space-y-4">
              {content.scientificNotes.map((note, i) => (
                <div key={i} className="bg-card rounded-2xl p-5 border border-border">
                  <div className="flex items-start gap-3 mb-2">
                    {statusIcon[note.status]}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${statusLabel[note.status]}`}>{note.status}</span>
                      </div>
                      <p className="text-sm font-medium">"{note.claim}"</p>
                    </div>
                  </div>
                  {note.correction && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground font-semibold mb-1">↳ Correção recomendada:</p>
                      <p className="text-sm">{note.correction}</p>
                    </div>
                  )}
                  {note.source && (
                    <a href={note.source.startsWith("http") ? note.source : "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 inline-block">
                      📎 {note.source}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Reflection */}
          <section className="mb-10">
            <div className="gradient-card-coral rounded-2xl p-6">
              <h3 className="font-display font-bold text-lg mb-2">💭 Pergunta Reflexiva</h3>
              <p className="text-foreground/90 italic">{content.reflectionQuestion}</p>
            </div>
          </section>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-6 border-t border-border">
            {mod.number > 1 && (
              <button onClick={() => navigate(`/module/${modules[mod.number - 2].id}`)} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium transition-colors">
                <ArrowLeft className="w-4 h-4" /> Módulo {mod.number - 1}
              </button>
            )}
            <div className="flex-1" />
            {mod.number < modules.length && (
              <button onClick={() => navigate(`/module/${modules[mod.number].id}`)} className="flex items-center gap-2 px-5 py-3 rounded-xl gradient-warm text-primary-foreground text-sm font-semibold shadow-warm transition-shadow">
                Módulo {mod.number + 1} <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
