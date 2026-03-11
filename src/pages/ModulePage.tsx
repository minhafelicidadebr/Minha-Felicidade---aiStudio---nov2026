import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { modules, quizQuestions, flashcards, evidenceItems, videoLessons } from "@/data/courseData";
import { moduleContents, simulatorScenarios, debateTopics, poems, coDesignTemplates } from "@/data/moduleContents";
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, Info, Lightbulb, ArrowRight, Play, ExternalLink, Zap, Eye } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useProgress } from "@/hooks/useProgress";

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
  const videos = id ? videoLessons.filter((v) => v.module === id) : [];
  const [selectedVideo, setSelectedVideo] = useState<typeof videoLessons[0] | null>(null);
  const { trackActivity } = useProgress();

  if (!mod || !content) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-24 text-center">
          <h1 className="text-2xl font-display font-bold">Módulo não encontrado</h1>
          <button onClick={() => navigate("/dashboard")} className="mt-4 text-primary hover:underline">Voltar ao dashboard</button>
        </div>
      </div>
    );
  }

  const available = activityDefs.filter(a => a.key === "alegria" || a.check(id!));

  const handleWatchVideo = (video: typeof videoLessons[0]) => {
    setSelectedVideo(video);
    // Track video view
    trackActivity({
      moduleId: id!,
      activityType: "video",
      activityId: video.id,
      data: { title: video.titlePt },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar ao dashboard
          </button>

          {/* Header */}
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl" aria-hidden="true">{mod.icon}</span>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Módulo {mod.number} • Semana {mod.week}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> {mod.duration}</span>
            </div>
            <h1 className="text-4xl font-display font-bold mb-2">{mod.title}</h1>
            <p className="text-lg text-muted-foreground">{mod.subtitle}</p>
          </header>

          {/* Key Insight */}
          <div className="gradient-card-gold rounded-2xl p-6 mb-8" role="note">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-secondary mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary-foreground/70">Insight-Chave</span>
                <p className="font-display text-lg font-semibold mt-1">{content.keyInsight}</p>
              </div>
            </div>
          </div>

          {/* 📹 VIDEO LESSONS */}
          <section className="mb-10" aria-label="Aulas em vídeo">
            <h2 className="text-2xl font-display font-bold mb-4">📹 Aulas em Vídeo</h2>
            <div className="space-y-3">
              {videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => handleWatchVideo(video)}
                  className="w-full group p-4 rounded-2xl bg-card border border-border hover:shadow-warm hover:-translate-y-0.5 transition-all text-left flex items-center gap-4"
                  aria-label={`Assistir aula ${video.order}: ${video.titlePt}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Play className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-primary">Aula {video.order}</span>
                      {video.duration && <span className="text-xs text-muted-foreground">{video.duration}</span>}
                    </div>
                    <h4 className="font-display font-bold text-sm truncate">{video.titlePt}</h4>
                    <p className="text-xs text-muted-foreground truncate">{video.summary}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </section>

          {/* 🚀 Learning Activities CTAs */}
          <section className="mb-10" aria-label="Atividades de aprendizagem">
            <h2 className="text-2xl font-display font-bold mb-4">🚀 Atividades de Aprendizagem</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {available.map((act) => (
                <button
                  key={act.key}
                  onClick={() => navigate(act.key === "alegria" ? `${act.path}?module=${id}` : `${act.path}?module=${id}`)}
                  className="group p-4 rounded-2xl bg-card border border-border hover:shadow-warm hover:-translate-y-1 transition-all text-left"
                  aria-label={`Abrir ${act.title} para módulo ${mod.number}`}
                >
                  <span className="text-2xl block mb-2" aria-hidden="true">{act.icon}</span>
                  <h4 className="font-display font-bold text-sm">{act.title}</h4>
                </button>
              ))}
            </div>
          </section>

          {/* Rewirement */}
          <section className="mb-10" aria-label="Desafio de ação">
            <div className="gradient-card-coral rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Rewirement — Desafio de Ação</span>
                  <h3 className="font-display font-bold text-lg mt-1 mb-2">{content.rewirement.theme}</h3>
                  <p className="text-sm font-medium mb-2">🎯 {content.rewirement.action}</p>
                  <p className="text-sm text-foreground/80">{content.rewirement.challenge}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Overview */}
          <section className="mb-10">
            <h2 className="text-2xl font-display font-bold mb-3">Visão Geral</h2>
            <p className="leading-relaxed text-foreground/90">{content.overview}</p>
          </section>

          {/* Learning Objectives */}
          <section className="mb-10" aria-label="Objetivos de aprendizagem">
            <h2 className="text-2xl font-display font-bold mb-4">🎯 Objetivos de Aprendizagem</h2>
            <div className="space-y-3">
              {content.learningObjectives.map((obj, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                  <span className="w-6 h-6 rounded-full gradient-warm flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0" aria-hidden="true">{i + 1}</span>
                  <p className="text-sm">{obj}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Scientific Audit */}
          <section className="mb-10" aria-label="Auditoria científica">
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
          <nav className="flex justify-between items-center pt-6 border-t border-border" aria-label="Navegação entre módulos">
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
          </nav>
        </motion.div>
      </div>

      {/* Video Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl">
          {selectedVideo && (
            <>
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="font-display text-lg">
                  Aula {selectedVideo.order}: {selectedVideo.titlePt}
                </DialogTitle>
                <DialogDescription className="text-sm">{selectedVideo.summary}</DialogDescription>
              </DialogHeader>
              <div className="px-6 pt-4">
                <div className="aspect-video rounded-xl overflow-hidden bg-black">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?cc_load_policy=1&hl=pt&cc_lang_pref=pt`}
                    title={selectedVideo.titlePt}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
                <div className="mt-4 p-4 rounded-xl bg-muted">
                  <h4 className="text-sm font-semibold mb-2">🌐 Legendas em Português</h4>
                  <p className="text-xs text-muted-foreground">
                    As legendas em português são carregadas automaticamente. Se não aparecerem:
                    clique em ⚙️ (configurações) → Legendas → Português (geradas automaticamente).
                  </p>
                </div>
              </div>
              <div className="p-6 pt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <a href={`https://www.youtube.com/watch?v=${selectedVideo.youtubeId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors">
                    <Play className="w-3 h-3" /> Ver no YouTube
                  </a>
                  <button onClick={() => { setSelectedVideo(null); navigate(`/quiz?module=${id}`); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                    🎯 Quiz do Módulo
                  </button>
                  <button onClick={() => { setSelectedVideo(null); navigate(`/flashcards?module=${id}`); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary-foreground text-xs font-semibold hover:bg-secondary/20 transition-colors">
                    🃏 Flashcards
                  </button>
                  <button onClick={() => { setSelectedVideo(null); navigate(`/poetry?module=${id}`); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                    🎭 Poesia
                  </button>
                  <button onClick={() => { setSelectedVideo(null); navigate(`/alegria?module=${id}`); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors">
                    🤖 Perguntar à AlegrIA
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
