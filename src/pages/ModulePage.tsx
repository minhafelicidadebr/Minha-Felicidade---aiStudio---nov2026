import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { modules, quizQuestions, flashcards, evidenceItems, videoLessons } from "@/data/courseData";
import { moduleContents, simulatorScenarios, debateTopics, poems, coDesignTemplates } from "@/data/moduleContents";
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, Info, Lightbulb, ArrowRight, Play, ExternalLink, Zap, Download } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
  { key: "breathing", icon: "🧘", title: "Respiração", path: "/breathing", check: () => true },
  { key: "lifewheel", icon: "🎯", title: "Roda da Vida", path: "/lifewheel", check: () => true },
  { key: "gratitude", icon: "📝", title: "Gratidão", path: "/gratitude", check: () => true },
  { key: "memory", icon: "🧩", title: "Memória", path: "/memory", check: () => true },
  { key: "mindmap", icon: "🗺️", title: "Mapa Mental", path: "/mindmap", check: () => true },
  { key: "emotions", icon: "📊", title: "Emoções", path: "/emotions", check: () => true },
  { key: "challenge21", icon: "🎲", title: "21 Dias", path: "/challenge21", check: () => true },
  { key: "hypothesis", icon: "🔬", title: "Hipóteses", path: "/hypothesis", check: () => true },
  { key: "missions", icon: "🏆", title: "Missões", path: "/missions", check: () => true },
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
    trackActivity({ moduleId: id!, activityType: "video", activityId: video.id, data: { title: video.titlePt } });
  };

  const gradientMap = { coral: "gradient-card-coral", gold: "gradient-card-gold", navy: "gradient-card-navy" };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar ao dashboard
          </button>

          {/* Header */}
          <header className="mb-10">
            <div className={`p-8 rounded-3xl ${gradientMap[mod.gradient]} relative overflow-hidden noise`}>
              <motion.div className="absolute top-4 right-4 w-24 h-24 rounded-full bg-background/10 blur-2xl" animate={{ y: [-5, 5, -5] }} transition={{ duration: 4, repeat: Infinity }} />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-5xl" aria-hidden="true">{mod.icon}</span>
                  <div>
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Módulo {mod.number} • Semana {mod.week}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{mod.duration}</span>
                    </div>
                  </div>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">{mod.title}</h1>
                <p className="text-lg text-muted-foreground">{mod.subtitle}</p>
              </div>
            </div>
          </header>

          {/* Key Insight */}
          <motion.div className="glass-card rounded-2xl p-6 mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} role="note">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
                <Lightbulb className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">Insight-Chave</span>
                <p className="font-display text-lg font-semibold mt-1">{content.keyInsight}</p>
              </div>
            </div>
          </motion.div>

          {/* Videos */}
          <section className="mb-10" aria-label="Aulas em vídeo">
            <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">📹 Aulas em Vídeo <span className="text-sm font-normal text-muted-foreground">({videos.length})</span></h2>
            <div className="space-y-3">
              {videos.map((video, i) => (
                <motion.button
                  key={video.id}
                  onClick={() => handleWatchVideo(video)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="w-full group p-4 rounded-2xl glass-card hover:shadow-warm hover:-translate-y-0.5 transition-all text-left flex items-center gap-4"
                  aria-label={`Assistir aula ${video.order}: ${video.titlePt}`}
                >
                  <div className="w-12 h-12 rounded-xl gradient-institute flex items-center justify-center shrink-0 group-hover:shadow-glow transition-shadow">
                    <Play className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-primary">Aula {video.order}</span>
                      {video.duration && <span className="text-xs text-muted-foreground">{video.duration}</span>}
                    </div>
                    <h4 className="font-display font-bold text-sm truncate">{video.titlePt}</h4>
                    <p className="text-xs text-muted-foreground truncate">{video.summary}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </motion.button>
              ))}
            </div>
          </section>

          {/* Activities */}
          <section className="mb-10" aria-label="Atividades de aprendizagem">
            <h2 className="text-2xl font-display font-bold mb-4">🚀 Atividades de Aprendizagem</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {available.map((act) => (
                <motion.button
                  key={act.key}
                  onClick={() => navigate(`${act.path}?module=${id}`)}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="group p-4 rounded-2xl glass-card hover:shadow-warm transition-all text-left"
                  aria-label={`Abrir ${act.title} para módulo ${mod.number}`}
                >
                  <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform inline-block" aria-hidden="true">{act.icon}</span>
                  <h4 className="font-display font-bold text-sm">{act.title}</h4>
                </motion.button>
              ))}
            </div>
          </section>

          {/* Rewirement */}
          <section className="mb-10" aria-label="Desafio de ação">
            <div className="gradient-card-coral rounded-2xl p-6 relative overflow-hidden noise">
              <div className="flex items-start gap-3 relative">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/70">Rewirement — Desafio de Ação</span>
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
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3 p-3 rounded-xl glass-card">
                  <span className="w-7 h-7 rounded-full gradient-institute flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0" aria-hidden="true">{i + 1}</span>
                  <p className="text-sm">{obj}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Scientific Audit */}
          <section className="mb-10" aria-label="Auditoria científica">
            <h2 className="text-2xl font-display font-bold mb-4">🔬 Auditoria Científica</h2>
            <div className="space-y-4">
              {content.scientificNotes.map((note, i) => (
                <div key={i} className="glass-card rounded-2xl p-5">
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
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
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
            <div className="gradient-card-navy rounded-2xl p-6 relative overflow-hidden noise">
              <h3 className="font-display font-bold text-lg mb-2">💭 Pergunta Reflexiva</h3>
              <p className="text-foreground/90 italic text-lg">{content.reflectionQuestion}</p>
            </div>
          </section>

          {/* Navigation */}
          <nav className="flex justify-between items-center pt-6 border-t border-border" aria-label="Navegação entre módulos">
            {mod.number > 1 && (
              <button onClick={() => navigate(`/module/${modules[mod.number - 2].id}`)} className="flex items-center gap-2 px-5 py-3 rounded-xl glass hover:shadow-warm text-sm font-medium transition-all">
                <ArrowLeft className="w-4 h-4" /> Módulo {mod.number - 1}
              </button>
            )}
            <div className="flex-1" />
            {mod.number < modules.length && (
              <button onClick={() => navigate(`/module/${modules[mod.number].id}`)} className="flex items-center gap-2 px-5 py-3 rounded-xl gradient-institute text-primary-foreground text-sm font-semibold shadow-warm hover:shadow-glow transition-shadow">
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
                <div className="mt-4 p-4 rounded-xl bg-muted/50">
                  <h4 className="text-sm font-semibold mb-2">🌐 Legendas em Português</h4>
                  <p className="text-xs text-muted-foreground">
                    Legendas em português carregadas automaticamente. Se não aparecerem: ⚙️ → Legendas → Português.
                  </p>
                </div>
              </div>
              <div className="p-6 pt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <a href={`https://www.youtube.com/watch?v=${selectedVideo.youtubeId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors">
                    <Play className="w-3 h-3" /> YouTube
                  </a>
                  <button onClick={() => { setSelectedVideo(null); navigate(`/quiz?module=${id}`); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                    🎯 Quiz
                  </button>
                  <button onClick={() => { setSelectedVideo(null); navigate(`/flashcards?module=${id}`); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary-foreground text-xs font-semibold hover:bg-secondary/20 transition-colors">
                    🃏 Flashcards
                  </button>
                  <button onClick={() => { setSelectedVideo(null); navigate(`/poetry?module=${id}`); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                    🎭 Poesia
                  </button>
                  <button onClick={() => { setSelectedVideo(null); navigate(`/alegria?module=${id}`); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors">
                    🤖 AlegrIA
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
