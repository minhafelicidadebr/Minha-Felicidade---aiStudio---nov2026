import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { modules, videoLessons } from "@/data/courseData";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BookOpen, Play, Trophy, Flame, ArrowRight, LogOut, User, Download, Zap, Star, Calendar, BarChart3, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ACHIEVEMENTS = [
  { id: "first_video", icon: "🎬", title: "Primeira Aula", desc: "Assistiu seu primeiro vídeo", check: (p: any[]) => p.some(x => x.activity_type === "video" && x.completed) },
  { id: "quiz_master", icon: "🎯", title: "Quiz Master", desc: "Completou 5 quizzes", check: (p: any[]) => p.filter(x => x.activity_type === "quiz" && x.completed).length >= 5 },
  { id: "xp_100", icon: "⚡", title: "Centelha", desc: "Acumulou 100 XP", check: (p: any[]) => p.reduce((s: number, x: any) => s + (x.xp_earned || 0), 0) >= 100 },
  { id: "xp_500", icon: "🔥", title: "Em Chamas", desc: "Acumulou 500 XP", check: (p: any[]) => p.reduce((s: number, x: any) => s + (x.xp_earned || 0), 0) >= 500 },
  { id: "all_modules", icon: "🏆", title: "Explorador", desc: "Atividade em todos os módulos", check: (p: any[]) => new Set(p.map(x => x.module_id)).size >= 5 },
  { id: "poet", icon: "🎭", title: "Poeta", desc: "Completou uma poesia", check: (p: any[]) => p.some(x => x.activity_type === "poetry" && x.completed) },
  { id: "debater", icon: "⚔️", title: "Debatedor", desc: "Participou de um debate", check: (p: any[]) => p.some(x => x.activity_type === "debate" && x.completed) },
  { id: "streak_3", icon: "📅", title: "Consistente", desc: "3 dias seguidos de atividade", check: (p: any[]) => { const days = [...new Set(p.map((x: any) => x.created_at?.split("T")[0]))].sort().reverse(); let s = 0; for (let i = 0; i < days.length; i++) { const exp = new Date(Date.now() - i * 86400000).toISOString().split("T")[0]; if (days[i] === exp) s++; else break; } return s >= 3; } },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>("student");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).single();
      setProfile(prof);
      const { data: prog } = await supabase.from("user_progress").select("*").eq("user_id", session.user.id);
      setProgress(prog || []);
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      if (roles && roles.length > 0) setUserRole(roles[0].role);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => { if (!session) navigate("/auth"); });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const totalXp = progress.reduce((sum, p) => sum + (p.xp_earned || 0), 0);
  const completedActivities = progress.filter((p) => p.completed).length;
  const totalVideos = videoLessons.length;
  const watchedVideos = progress.filter((p) => p.activity_type === "video" && p.completed).length;

  // Streak
  const streak = useMemo(() => {
    const days = [...new Set(progress.map(p => p.created_at?.split("T")[0]))].sort().reverse();
    let s = 0;
    for (let i = 0; i < days.length; i++) {
      const exp = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      if (days[i] === exp) s++;
      else break;
    }
    return s;
  }, [progress]);

  // Level
  const level = Math.floor(totalXp / 100) + 1;
  const levelProgress = (totalXp % 100);

  // Achievements
  const earned = ACHIEVEMENTS.filter(a => a.check(progress));

  const getModuleProgress = (moduleId: string) => progress.filter((p) => p.module_id === moduleId && p.completed).length;

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  const handleDownloadReport = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!resp.ok) throw new Error("Erro ao gerar relatório");
      const report = await resp.json();

      // Generate readable text report
      const lines = [
        `═══════════════════════════════════════`,
        `  RELATÓRIO DE PROGRESSO — CIÊNCIA DO BEM-ESTAR`,
        `═══════════════════════════════════════`,
        ``,
        `Aluno: ${report.student.name}`,
        `Email: ${report.student.email}`,
        `Gerado em: ${new Date(report.generatedAt).toLocaleDateString("pt-BR")}`,
        ``,
        `─── RESUMO ───`,
        `XP Total: ${report.summary.totalXp}`,
        `Atividades Completas: ${report.summary.completedActivities}`,
        `Vídeos Assistidos: ${report.summary.videosWatched}`,
        `Dias Ativos: ${report.summary.totalDaysActive}`,
        `Sequência Atual: ${report.summary.currentStreak} dias`,
        `Nível: ${Math.floor(report.summary.totalXp / 100) + 1}`,
        ``,
        `─── PROGRESSO POR MÓDULO ───`,
        ...report.modules.map((m: any) => `${m.icon} Módulo ${m.number} — ${m.title}: ${m.completed} atividades, ${m.xp} XP`),
        ``,
        `─── CONQUISTAS ───`,
        ...earned.map(a => `${a.icon} ${a.title} — ${a.desc}`),
        ``,
        `─── ATIVIDADES RECENTES ───`,
        ...(report.recentActivity || []).slice(0, 10).map((a: any) =>
          `${new Date(a.date).toLocaleDateString("pt-BR")} | ${a.type} | ${a.module} | +${a.xp} XP`
        ),
        ``,
        `═══════════════════════════════════════`,
        `Gerado por Felicidade.lab — Ciência do Bem-Estar`,
        `Baseado em "Psychology and the Good Life" — Yale University`,
      ];

      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio_progresso_${profile?.full_name?.replace(/\s+/g, "_") || "aluno"}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Relatório baixado! 📄" });
    } catch {
      toast({ title: "Erro ao gerar relatório", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Estudante";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold">
                Olá, <span className="text-primary">{displayName}</span> 👋
              </h1>
              <p className="text-muted-foreground mt-1">Continue sua jornada de bem-estar</p>
            </div>
            <div className="flex items-center gap-3">
              {(userRole === "teacher" || userRole === "manager") && (
                <button onClick={() => navigate("/admin")} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-semibold">
                  <BarChart3 className="w-4 h-4" /> Painel
                </button>
              )}
              <button onClick={handleDownloadReport} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground hover:text-foreground text-sm font-medium" title="Baixar relatório de progresso">
                <Download className="w-4 h-4" /> Relatório
              </button>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 text-secondary-foreground">
                <Trophy className="w-4 h-4" />
                <span className="font-bold text-sm">{totalXp} XP</span>
              </div>
              <button onClick={handleSignOut} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Sair" aria-label="Sair da conta">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Level & XP Bar */}
          <div className="p-5 rounded-2xl gradient-card-gold mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl gradient-warm flex items-center justify-center shadow-warm">
                  <Star className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-display font-bold text-lg">Nível {level}</div>
                  <div className="text-xs text-muted-foreground">{totalXp} XP total</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-destructive" />
                  <span className="font-bold">{streak}</span>
                  <span className="text-muted-foreground">dias</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  className="h-full rounded-full gradient-warm"
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">{levelProgress}/100</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="p-5 rounded-2xl bg-card border border-border">
              <Trophy className="w-5 h-5 text-secondary mb-2" />
              <div className="text-2xl font-display font-bold">{totalXp}</div>
              <div className="text-xs text-muted-foreground">XP Total</div>
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <Target className="w-5 h-5 text-destructive mb-2" />
              <div className="text-2xl font-display font-bold">{completedActivities}</div>
              <div className="text-xs text-muted-foreground">Atividades completas</div>
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <Play className="w-5 h-5 text-primary mb-2" />
              <div className="text-2xl font-display font-bold">{watchedVideos}/{totalVideos}</div>
              <div className="text-xs text-muted-foreground">Vídeos assistidos</div>
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <BookOpen className="w-5 h-5 text-primary mb-2" />
              <div className="text-2xl font-display font-bold">{earned.length}/{ACHIEVEMENTS.length}</div>
              <div className="text-xs text-muted-foreground">Conquistas</div>
            </div>
          </div>

          {/* Achievements */}
          <h2 className="text-2xl font-display font-bold mb-4">🏅 Conquistas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {ACHIEVEMENTS.map((a) => {
              const unlocked = earned.some(e => e.id === a.id);
              return (
                <motion.div
                  key={a.id}
                  className={`p-4 rounded-2xl border text-center transition-all ${unlocked ? "bg-card border-secondary/30 shadow-warm" : "bg-muted/30 border-border opacity-50"}`}
                  whileHover={unlocked ? { scale: 1.05 } : {}}
                >
                  <span className="text-3xl block mb-2">{a.icon}</span>
                  <h4 className="font-display font-bold text-xs">{a.title}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.desc}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Module Trail */}
          <h2 className="text-2xl font-display font-bold mb-6">📚 Trilha de Aprendizagem</h2>
          <div className="space-y-4">
            {modules.map((mod, i) => {
              const modProgress = getModuleProgress(mod.id);
              const modVideos = videoLessons.filter((v) => v.module === mod.id).length;
              return (
                <motion.div key={mod.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} onClick={() => navigate(`/module/${mod.id}`)} className="group p-5 rounded-2xl bg-card border border-border hover:shadow-warm hover:-translate-y-0.5 transition-all cursor-pointer" role="button" tabIndex={0} aria-label={`Abrir Módulo ${mod.number}: ${mod.title}`} onKeyDown={(e) => e.key === "Enter" && navigate(`/module/${mod.id}`)}>
                  <div className="flex items-center gap-4">
                    <span className="text-3xl" aria-hidden="true">{mod.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-primary uppercase">Semana {mod.week} • Módulo {mod.number}</span>
                        <span className="text-xs text-muted-foreground">{mod.duration}</span>
                      </div>
                      <h3 className="font-display font-bold text-lg truncate">{mod.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{mod.subtitle}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={modProgress} aria-valuemax={modVideos + 4} aria-label={`Progresso do módulo ${mod.number}`}>
                          <div className="h-full rounded-full gradient-warm transition-all" style={{ width: `${Math.min((modProgress / Math.max(modVideos + 4, 1)) * 100, 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{modProgress} atividades</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Access */}
          <h2 className="text-2xl font-display font-bold mt-12 mb-6">🚀 Acesso Rápido</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: "🤖", title: "AlegrIA", path: "/alegria" },
              { icon: "🎯", title: "Quiz", path: "/quiz" },
              { icon: "🃏", title: "Flashcards", path: "/flashcards" },
              { icon: "📊", title: "Evidências", path: "/evidence" },
              { icon: "🎮", title: "Simulador", path: "/simulator" },
              { icon: "⚔️", title: "Debate", path: "/debate" },
              { icon: "🎭", title: "Poesia", path: "/poetry" },
              { icon: "🏗️", title: "Co-design", path: "/codesign" },
            ].map((d) => (
              <button key={d.title} onClick={() => navigate(d.path)} className="p-4 rounded-2xl bg-card border border-border hover:shadow-warm hover:-translate-y-1 transition-all text-left" aria-label={`Abrir ${d.title}`}>
                <span className="text-2xl block mb-2" aria-hidden="true">{d.icon}</span>
                <h4 className="font-display font-bold text-sm">{d.title}</h4>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
