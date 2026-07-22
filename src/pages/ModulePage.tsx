import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { modules, quizQuestions, flashcards, evidenceItems, videoLessons } from "@/data/courseData";
import { moduleContents, simulatorScenarios, debateTopics, poems, coDesignTemplates } from "@/data/moduleContents";
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, Info, Lightbulb, ArrowRight, Play, ExternalLink, Zap, X, Sparkles, Trophy, Star, Rocket, Maximize2, Bot, Target, Layers, BarChart3, Gamepad2, Swords, Drama, Blocks, Wind, Compass, NotebookPen, Puzzle, Network, Activity, CalendarDays, FlaskConical, Award, Brain, Dumbbell, TrendingUp, Lock, Crown } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ALEGRIA_AVATAR_URL } from "@/components/AlegriaAvatar";
import ExternalResourceNotice from "@/components/learning/ExternalResourceNotice";
import { AlegriaFAB } from "@/components/AlegriaCTA";
import InlineActivities from "@/components/learning/InlineActivities";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useProgress } from "@/hooks/useProgress";
import { useSubscription } from "@/hooks/useSubscription";

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
  { key: "alegria", Icon: Bot, title: "AlegrIA", path: "/alegria", check: () => true, desc: "Sua tutora do bem-estar", color: "from-violet-500/15 to-purple-500/10", accent: "text-violet-400" },
  { key: "quiz", Icon: Target, title: "Quiz", path: "/quiz", check: (id: string) => quizQuestions.some(q => q.module === id), desc: "Avaliação ativa", color: "from-orange-500/15 to-red-500/10", accent: "text-orange-400" },
  { key: "flashcards", Icon: Layers, title: "Flashcards", path: "/flashcards", check: (id: string) => flashcards.some(f => f.module === id), desc: "Repetição espaçada", color: "from-amber-500/15 to-yellow-500/10", accent: "text-amber-400" },
  { key: "evidence", Icon: BarChart3, title: "Evidências", path: "/evidence", check: (id: string) => evidenceItems.some(e => e.module === id), desc: "Base científica", color: "from-blue-500/15 to-cyan-500/10", accent: "text-blue-400" },
  { key: "simulator", Icon: Gamepad2, title: "Simulador", path: "/simulator", check: (id: string) => simulatorScenarios.some(s => s.module === id), desc: "Decisões reais", color: "from-green-500/15 to-emerald-500/10", accent: "text-emerald-400" },
  { key: "debate", Icon: Swords, title: "Debate", path: "/debate", check: (id: string) => debateTopics.some(d => d.module === id), desc: "Arena dialética", color: "from-red-500/15 to-pink-500/10", accent: "text-red-400" },
  { key: "poetry", Icon: Drama, title: "Poesia", path: "/poetry", check: (id: string) => poems.some(p => p.module === id), desc: "Expressão criativa", color: "from-pink-500/15 to-rose-500/10", accent: "text-pink-400" },
  { key: "codesign", Icon: Blocks, title: "Co-design", path: "/codesign", check: (id: string) => coDesignTemplates.some(c => c.module === id), desc: "Construção coletiva", color: "from-indigo-500/15 to-blue-500/10", accent: "text-indigo-400" },
  { key: "breathing", Icon: Wind, title: "Respiração", path: "/breathing", check: () => true, desc: "Regulação somática", color: "from-teal-500/15 to-cyan-500/10", accent: "text-teal-400" },
  { key: "lifewheel", Icon: Compass, title: "Roda da Vida", path: "/lifewheel", check: () => true, desc: "Diagnóstico integral", color: "from-emerald-500/15 to-green-500/10", accent: "text-emerald-400" },
  { key: "gratitude", Icon: NotebookPen, title: "Gratidão", path: "/gratitude", check: () => true, desc: "Journaling guiado", color: "from-yellow-500/15 to-amber-500/10", accent: "text-yellow-400" },
  { key: "memory", Icon: Puzzle, title: "Memória", path: "/memory", check: () => true, desc: "Cognição lúdica", color: "from-purple-500/15 to-violet-500/10", accent: "text-purple-400" },
  { key: "mindmap", Icon: Network, title: "Mapa Mental", path: "/mindmap", check: () => true, desc: "Mapeamento conceitual", color: "from-sky-500/15 to-blue-500/10", accent: "text-sky-400" },
  { key: "emotions", Icon: Activity, title: "Emoções", path: "/emotions", check: () => true, desc: "Termômetro afetivo", color: "from-rose-500/15 to-pink-500/10", accent: "text-rose-400" },
  { key: "challenge21", Icon: CalendarDays, title: "21 Dias", path: "/challenge21", check: () => true, desc: "Micro-hábitos", color: "from-lime-500/15 to-green-500/10", accent: "text-lime-400" },
  { key: "hypothesis", Icon: FlaskConical, title: "Hipóteses", path: "/hypothesis", check: () => true, desc: "Lab científico", color: "from-cyan-500/15 to-teal-500/10", accent: "text-cyan-400" },
  { key: "missions", Icon: Award, title: "Missões", path: "/missions", check: () => true, desc: "Desafios sociais", color: "from-amber-500/15 to-orange-500/10", accent: "text-amber-400" },
];

const STIMULUS_PHRASES = [
  { text: "Cada atividade concluída fortalece suas conexões neurais.", Icon: Brain },
  { text: "Você está construindo hábitos que duram toda a vida.", Icon: Dumbbell },
  { text: "Aprender ativamente aumenta a retenção em 75%.", Icon: TrendingUp },
  { text: "Explore, pratique, domine — aprendizado é jornada.", Icon: Rocket },
  { text: "Seu cérebro agradece cada desafio que você aceita.", Icon: Sparkles },
];

export default function ModulePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasFeature, loading: subLoading } = useSubscription();
  const mod = modules.find((m) => m.id === id);
  const content = id ? moduleContents[id] : undefined;
  const videos = id ? videoLessons.filter((v) => v.module === id) : [];
  const [selectedVideo, setSelectedVideo] = useState<typeof videoLessons[0] | null>(null);
  const [showVideoPanel, setShowVideoPanel] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const { trackActivity } = useProgress();
  const [stimulusIdx] = useState(() => Math.floor(Math.random() * STIMULUS_PHRASES.length));

  // Gate de módulo: plano gratuito só acessa o Módulo 1 ("mentiras").
  // Planos pagos têm a feature "modules" que libera todos.
  const moduleAllowed =
    subLoading || hasFeature("modules") || (id === "mentiras" && hasFeature("module_1"));

  // Auto-open the panel when arriving back from an activity via ?video=<youtubeId>
  useEffect(() => {
    const videoParam = searchParams.get("video");
    if (videoParam && !showVideoPanel) {
      const v = videos.find((x) => x.youtubeId === videoParam);
      if (v) {
        setSelectedVideo(v);
        setActiveVideoId(v.youtubeId);
        setShowVideoPanel(true);
        // smooth scroll into view after mount
        setTimeout(() => {
          document.getElementById("video-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, videos.length]);

  // Gate de módulo (após todos os hooks): plano gratuito só acessa Módulo 1.
  if (!subLoading && !moduleAllowed) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-2xl pt-24 pb-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Módulo Premium</h1>
          <p className="text-muted-foreground mb-6">
            Este módulo faz parte dos planos pagos. Faça upgrade para desbloquear
            todos os módulos, ferramentas avançadas e AlegrIA ilimitada.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/#planos")}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl gradient-institute text-primary-foreground font-bold text-sm shadow-warm hover:shadow-glow transition-all"
            >
              <Crown className="w-4 h-4" /> Ver Planos
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-muted text-foreground font-medium text-sm transition-colors hover:bg-muted/80"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

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
    setActiveVideoId(video.youtubeId);
    setShowVideoPanel(true);
    // reflect in URL so back-from-activity works deterministically
    const p = new URLSearchParams(searchParams);
    p.set("video", video.youtubeId);
    setSearchParams(p, { replace: true });
    trackActivity({ moduleId: id!, activityType: "video", activityId: video.id, data: { title: video.titlePt } });
    setTimeout(() => document.getElementById("video-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const closeVideoPanel = () => {
    setShowVideoPanel(false);
    const p = new URLSearchParams(searchParams);
    p.delete("video");
    setSearchParams(p, { replace: true });
  };

  const gradientMap = { coral: "gradient-card-coral", gold: "gradient-card-gold", navy: "gradient-card-navy" };
  const stimulus = STIMULUS_PHRASES[stimulusIdx];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-5xl">
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

          {/* Motivational stimulus banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 border border-primary/10 mb-8"
          >
            <motion.span
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary shrink-0"
              animate={{ rotate: [0, 6, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
            ><stimulus.Icon className="w-5 h-5" /></motion.span>
            <p className="text-sm font-medium text-foreground/80">{stimulus.text}</p>
            <Sparkles className="w-4 h-4 text-primary ml-auto shrink-0" />
          </motion.div>

          {/* Persistent Video Panel + Activities Side by Side */}
          <AnimatePresence>
            {showVideoPanel && activeVideoId && selectedVideo && (
              <motion.section
                id="video-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-10 glass-card rounded-3xl overflow-hidden border border-primary/20 shadow-warm scroll-mt-24"
              >
                <div className="flex items-center justify-between gap-3 px-4 sm:px-6 pt-5 pb-3 border-b border-border/20">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider">▶ Assistindo • Aula {selectedVideo.order}</span>
                    <h3 className="font-display font-bold text-base sm:text-lg truncate">{selectedVideo.titlePt}</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`https://www.youtube.com/watch?v=${activeVideoId}`}
                      target="_blank" rel="noopener noreferrer"
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                      aria-label="Abrir no YouTube em tela cheia"
                    >
                      <Maximize2 className="w-3 h-3" /> YouTube
                    </a>
                    <button
                      onClick={closeVideoPanel}
                      className="p-2 rounded-xl hover:bg-muted transition-colors"
                      aria-label="Fechar painel do vídeo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
                  {/* Video */}
                  <div className="lg:col-span-3 px-4 sm:px-6 pt-4 pb-5">
                    <div className="aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
                      <iframe
                        width="100%" height="100%"
                        src={`https://www.youtube.com/embed/${activeVideoId}?cc_load_policy=1&hl=pt&cc_lang_pref=pt&rel=0`}
                        title={selectedVideo.titlePt}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                    <ExternalResourceNotice
                      title={selectedVideo.titlePt}
                      platform="YouTube"
                      sourceUrl={`https://www.youtube.com/watch?v=${activeVideoId}`}
                    />
                    <details className="mt-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-primary/5 to-purple-500/10 border border-primary/10 group">
                      <summary className="cursor-pointer p-3 list-none flex items-center gap-2 text-xs font-semibold">
                        <span className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center text-sm">🌐</span>
                        Ativar legendas em Português
                        <ArrowRight className="w-3 h-3 ml-auto transition-transform group-open:rotate-90" />
                      </summary>
                      <div className="px-3 pb-3 space-y-1.5">
                        {[
                          ["1", <>No player, clique em <strong className="text-foreground">⚙️ Configurações</strong></>],
                          ["2", <>Selecione <strong className="text-foreground">Legendas/CC</strong> → ative em inglês</>],
                          ["3", <>Em <strong className="text-foreground">Tradução Automática</strong> escolha <strong className="text-foreground">Português</strong></>],
                        ].map(([n, txt]) => (
                          <div key={n as string} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[10px]">{n}</span>
                            <span>{txt}</span>
                          </div>
                        ))}
                        <p className="text-[10px] text-muted-foreground/70 italic">💡 O YouTube lembra sua preferência nos próximos vídeos.</p>
                      </div>
                    </details>
                    <button
                      onClick={closeVideoPanel}
                      className="mt-3 w-full lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3" /> Voltar ao conteúdo do módulo
                    </button>
                  </div>
                  {/* Inline learning activities */}
                  <div className="lg:col-span-2 px-4 sm:px-6 pt-4 pb-5 lg:border-l border-t lg:border-t-0 border-border/20 bg-muted/10">
                    <InlineActivities
                      moduleId={id!}
                      backHref={`/module/${id}?video=${activeVideoId}`}
                      backLabel={`Aula ${selectedVideo.order}: ${selectedVideo.titlePt}`}
                    />
                    <button
                      onClick={closeVideoPanel}
                      className="mt-3 hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3" /> Voltar ao módulo
                    </button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

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
                  className={`w-full group p-4 rounded-2xl glass-card hover:shadow-warm hover:-translate-y-0.5 transition-all text-left flex items-center gap-4 ${activeVideoId === video.youtubeId ? "ring-2 ring-primary/50 shadow-warm" : ""}`}
                  aria-label={`Assistir aula ${video.order}: ${video.titlePt}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-shadow ${activeVideoId === video.youtubeId ? "gradient-institute shadow-glow" : "gradient-institute group-hover:shadow-glow"}`}>
                    <Play className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-primary">Aula {video.order}</span>
                      {video.duration && <span className="text-xs text-muted-foreground">{video.duration}</span>}
                      {activeVideoId === video.youtubeId && <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">▶ Assistindo</span>}
                    </div>
                    <h4 className="font-display font-bold text-sm truncate">{video.titlePt}</h4>
                    <p className="text-xs text-muted-foreground truncate">{video.summary}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </motion.button>
              ))}
            </div>
          </section>

          {/* Activities — Premium Grid */}
          <section className="mb-10" aria-label="Atividades de aprendizagem">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                <Rocket className="w-6 h-6 text-primary" /> Atividades de Aprendizagem
              </h2>
              <span className="text-xs text-muted-foreground font-semibold bg-muted/50 px-3 py-1 rounded-full">{available.length} ferramentas</span>
            </div>

            {/* Progress stimulus */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-success/5 to-primary/5 border border-success/10 mb-4"
            >
              <Trophy className="w-4 h-4 text-success shrink-0" />
              <p className="text-xs text-foreground/70">
                <span className="font-bold text-success">+5 XP</span> por atividade • Complete todas para dominar este módulo!
              </p>
              <Star className="w-3.5 h-3.5 text-secondary ml-auto shrink-0" />
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {available.map((act, i) => (
                <motion.button
                  key={act.key}
                  onClick={() => navigate(`${act.path}?module=${id}`)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={`group p-4 rounded-2xl bg-gradient-to-br ${act.color} border border-border/20 hover:shadow-warm transition-all text-left relative overflow-hidden`}
                  aria-label={`Abrir ${act.title} para módulo ${mod.number}`}
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-background/5 rounded-full -translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500" />
                  {act.key === "alegria" ? (
                    <img src={ALEGRIA_AVATAR_URL} alt="" aria-hidden="true" className="w-11 h-11 rounded-xl object-cover mb-3 ring-1 ring-primary/30 group-hover:scale-105 transition-transform relative" />
                  ) : (
                    <span className={`icon-tile-premium w-11 h-11 rounded-xl mb-3 flex items-center justify-center ${act.accent} group-hover:scale-105 transition-transform relative`} aria-hidden="true">
                      <act.Icon className="w-5 h-5" strokeWidth={1.75} />
                    </span>
                  )}
                  <h4 className="font-display font-bold text-sm relative">{act.title}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 relative">{act.desc}</p>
                  <ArrowRight className="w-3 h-3 text-muted-foreground absolute bottom-3 right-3 group-hover:text-primary transition-colors" />
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

      {/* Video Modal (fallback for first click) */}
      <Dialog open={!!selectedVideo && !showVideoPanel} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl">
          {selectedVideo && (
            <>
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="font-display text-lg">Aula {selectedVideo.order}: {selectedVideo.titlePt}</DialogTitle>
                <DialogDescription className="text-sm">{selectedVideo.summary}</DialogDescription>
              </DialogHeader>
              <div className="p-6">
                <div className="aspect-video rounded-xl overflow-hidden bg-black">
                  <iframe width="100%" height="100%"
                    src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?cc_load_policy=1&hl=pt&cc_lang_pref=pt&rel=0`}
                    title={selectedVideo.titlePt} frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin" allowFullScreen
                  />
                </div>
                <ExternalResourceNotice
                  title={selectedVideo.titlePt}
                  platform="YouTube"
                  sourceUrl={`https://www.youtube.com/watch?v=${selectedVideo.youtubeId}`}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlegriaFAB moduleId={id} />
      <Footer />
    </div>
  );
}
