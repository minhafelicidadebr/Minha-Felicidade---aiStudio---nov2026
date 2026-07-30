import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { modules, videoLessons } from "@/data/courseData";
import { parseProfileRoles, type AppRole, type ProfileRolesPayload } from "@/lib/auth-profile";
import RoleAwareAppShell from "@/components/dashboard/RoleAwareAppShell";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import { BookOpen, Play, Trophy, ArrowRight, Download, Star, BarChart3, Target, Crown, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { AlegriaHeroCard, AlegriaTag } from "@/components/AlegriaCTA";
import { ALEGRIA_AVATAR_URL } from "@/components/AlegriaAvatar";
import { useNpsTrigger } from "@/hooks/useNpsTrigger";
import NpsSurvey from "@/components/NpsSurvey";
import StreakCalendar from "@/components/StreakCalendar";
import DailyChallenge from "@/components/DailyChallenge";
import { trackEngagement } from "@/lib/engagement";
import Certificate from "@/components/Certificate";

type ProgressRecord = Tables<"user_progress">;
type ProfileRecord = Tables<"profiles">;
type DashboardProfilePayload = ProfileRolesPayload & {
  profile?: ProfileRecord | null;
};
type ProgressReport = {
  generatedAt: string;
  student: { name: string };
  summary: {
    totalXp: number;
    completedActivities: number;
    videosWatched: number;
    currentStreak: number;
  };
  modules: { icon: string; number: number; title: string; completed: number; xp: number }[];
};

const ACHIEVEMENTS = [
  { id: "first_video", icon: "🎬", title: "Primeira Aula", desc: "Assistiu seu primeiro vídeo", check: (p: ProgressRecord[]) => p.some(x => x.activity_type === "video" && x.completed) },
  { id: "quiz_master", icon: "🎯", title: "Quiz Master", desc: "Completou 5 quizzes", check: (p: ProgressRecord[]) => p.filter(x => x.activity_type === "quiz" && x.completed).length >= 5 },
  { id: "xp_100", icon: "⚡", title: "Centelha", desc: "Acumulou 100 XP", check: (p: ProgressRecord[]) => p.reduce((s, x) => s + (x.xp_earned || 0), 0) >= 100 },
  { id: "xp_500", icon: "🔥", title: "Em Chamas", desc: "Acumulou 500 XP", check: (p: ProgressRecord[]) => p.reduce((s, x) => s + (x.xp_earned || 0), 0) >= 500 },
  { id: "all_modules", icon: "🏆", title: "Explorador", desc: "Atividade em todos os módulos", check: (p: ProgressRecord[]) => new Set(p.map(x => x.module_id)).size >= 5 },
  { id: "poet", icon: "🎭", title: "Poeta", desc: "Completou uma poesia", check: (p: ProgressRecord[]) => p.some(x => x.activity_type === "poetry" && x.completed) },
  { id: "debater", icon: "⚔️", title: "Debatedor", desc: "Participou de um debate", check: (p: ProgressRecord[]) => p.some(x => x.activity_type === "debate" && x.completed) },
  { id: "streak_3", icon: "📅", title: "Consistente", desc: "3 dias seguidos", check: (p: ProgressRecord[]) => { const days = [...new Set(p.map((x) => x.created_at?.split("T")[0]))].sort().reverse(); let s = 0; for (let i = 0; i < days.length; i++) { const exp = new Date(Date.now() - i * 86400000).toISOString().split("T")[0]; if (days[i] === exp) s++; else break; } return s >= 3; } },
];

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push({ key: d.toISOString().split("T")[0], label: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "") });
  }
  return days;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPremiumTour, setShowPremiumTour] = useState(false);
  const { toast } = useToast();
  const { plan, isPremium } = useSubscription();
  const { shouldShow: showNps, dismiss: dismissNps } = useNpsTrigger();

  // Feature discovery: destaca uma vez os recursos recém-desbloqueados a quem
  // virou premium, levando ao valor que acabou de pagar (Requirement 5.1).
  useEffect(() => {
    if (isPremium && !localStorage.getItem("felicidade_premium_tour_seen")) {
      setShowPremiumTour(true);
    }
  }, [isPremium]);

  const dismissPremiumTour = () => {
    localStorage.setItem("felicidade_premium_tour_seen", "1");
    setShowPremiumTour(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      const [{ data: profilePayload }, { data: prog }] = await Promise.all([
        supabase.rpc("get_my_profile"),
        supabase.from("user_progress").select("*").eq("user_id", session.user.id),
      ]);
      const profileResult = profilePayload as DashboardProfilePayload | null;
      setProfile(profileResult?.profile ?? null);
      setRoles(parseProfileRoles(profileResult));
      setProgress(prog || []);
      if (!prog || prog.length === 0) {
        const shown = localStorage.getItem("felicidade_welcome_shown");
        if (!shown) { setShowWelcome(true); localStorage.setItem("felicidade_welcome_shown", "1"); }
      }
      setLoading(false);
      // Track session start (once per page load)
      void trackEngagement("session_start");
    });
    supabase.auth.getSession().then(({ data: { session } }) => { if (!session) navigate("/auth"); });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const totalXp = progress.reduce((sum, p) => sum + (p.xp_earned || 0), 0);
  const completedActivities = progress.filter((p) => p.completed).length;
  const totalVideos = videoLessons.length;
  const watchedVideos = progress.filter((p) => p.activity_type === "video" && p.completed).length;

  const streak = useMemo(() => {
    const days = [...new Set(progress.map(p => p.created_at?.split("T")[0]))].sort().reverse();
    let s = 0;
    for (let i = 0; i < days.length; i++) {
      const exp = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      if (days[i] === exp) s++; else break;
    }
    return s;
  }, [progress]);

  const level = Math.floor(totalXp / 100) + 1;
  const levelProgress = (totalXp % 100);
  const earned = ACHIEVEMENTS.filter(a => a.check(progress));
  const getModuleProgress = (moduleId: string) => progress.filter((p) => p.module_id === moduleId && p.completed).length;

  const weekData = useMemo(() => {
    const days = getLast7Days();
    return days.map(d => {
      const dayProgress = progress.filter(p => p.created_at?.split("T")[0] === d.key);
      return { ...d, xp: dayProgress.reduce((s, p) => s + (p.xp_earned || 0), 0), count: dayProgress.length };
    });
  }, [progress]);
  const maxXp = Math.max(...weekData.map(d => d.xp), 10);

  const handleDownloadReport = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!resp.ok) throw new Error("Erro");
      const report = (await resp.json()) as ProgressReport;
      const lines = [
        `═══════════════════════════════════════`,
        `  RELATÓRIO DE PROGRESSO — CIÊNCIA DO BEM-ESTAR`,
        `  Instituto Felicidade Para Todos`,
        `═══════════════════════════════════════`, ``,
        `Olá, ${report.student.name}! 🌟`, ``,
        `Gerado em: ${new Date(report.generatedAt).toLocaleDateString("pt-BR")}`, ``,
        `─── SEU RESUMO ───`,
        `⚡ XP Total: ${report.summary.totalXp}`,
        `🎯 Atividades: ${report.summary.completedActivities}`,
        `📹 Vídeos: ${report.summary.videosWatched}`,
        `🔥 Sequência: ${report.summary.currentStreak} dias`,
        `⭐ Nível: ${Math.floor(report.summary.totalXp / 100) + 1}`, ``,
        `─── MÓDULOS ───`,
        ...report.modules.map((m) => `${m.icon} M${m.number} — ${m.title}: ${m.completed} atividades, ${m.xp} XP`), ``,
        `─── CONQUISTAS ───`,
        ...earned.map(a => `${a.icon} ${a.title} — ${a.desc}`), ``,
        `═══════════════════════════════════════`,
        `Continue sua jornada! 🌟`,
        `Instituto Felicidade Para Todos`,
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `relatorio_${profile?.full_name?.replace(/\s+/g, "_") || "aluno"}.txt`;
      a.click(); URL.revokeObjectURL(url);
      toast({ title: "Relatório baixado! 📄" });
    } catch { toast({ title: "Erro ao gerar relatório", variant: "destructive" }); }
  };

  if (loading) {
    return (
      <RoleAwareAppShell title="Minha jornada" subtitle="Carregando…">
        <DashboardSkeleton variant="page" label="Carregando sua jornada de bem-estar" />
      </RoleAwareAppShell>
    );
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Estudante";

  // Ação do cabeçalho da casca
  const headerAction = (
    <button
      onClick={handleDownloadReport}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border/60 px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      title="Baixar relatório de progresso"
    >
      <Download className="w-4 h-4" aria-hidden="true" /> Relatório
    </button>
  );

  return (
    <RoleAwareAppShell
      title="Minha jornada"
      subtitle={`Olá, ${displayName} 👋`}
      action={headerAction}
    >
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {showNps && <NpsSurvey context="general" onDismiss={dismissNps} />}

        {/* Welcome */}
        {showWelcome && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-8 p-8 rounded-3xl gradient-institute text-primary-foreground relative overflow-hidden noise">
            <motion.div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-background/10 blur-3xl" animate={{ y: [-10, 10, -10] }} transition={{ duration: 6, repeat: Infinity }} />
            <h2 className="font-display text-2xl font-bold mb-2">Bem-vindo(a) à sua jornada! 🌟</h2>
            <p className="text-primary-foreground/80 mb-4 max-w-xl">
              5 módulos baseados no curso mais popular de Yale, com quizzes, simuladores e uma IA tutora chamada AlegrIA.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setShowWelcome(false); navigate("/module/mentiras"); }} className="px-5 py-2.5 rounded-xl bg-background text-foreground font-semibold text-sm hover:shadow-lg transition-all">
                Começar pelo Módulo 1
              </button>
              <button onClick={() => setShowWelcome(false)} className="px-5 py-2.5 rounded-xl bg-background/20 text-primary-foreground font-medium text-sm hover:bg-background/30 transition-colors">
                Explorar sozinho
              </button>
            </div>
          </motion.div>
        )}

        {/* Plano do usuário — afirma o plano (premium) ou convida a assinar (grátis) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-5 rounded-2xl glass-card flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between"
        >
          {isPremium ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl gradient-institute flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Seu plano</p>
                  <p className="font-display font-bold">Plano {plan.plan_name} ativo ✨</p>
                  {plan.current_period_end && (
                    <p className="text-xs text-muted-foreground">
                      Renova em {new Date(plan.current_period_end).toLocaleDateString("pt-BR")}
                      {plan.source === "organization" && plan.org_name ? ` • via ${plan.org_name}` : ""}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate("/subscription")}
                className="px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Gerenciar assinatura
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plano Gratuito</p>
                  <p className="font-display font-bold">Desbloqueie tudo com o Premium</p>
                  <p className="text-xs text-muted-foreground">AlegrIA ilimitada, simulador, certificado e mais</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/subscription")}
                className="px-4 py-2.5 rounded-xl gradient-institute text-primary-foreground text-sm font-bold shadow-warm hover:shadow-glow transition-all whitespace-nowrap flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" /> Ver planos
              </button>
            </>
          )}
        </motion.div>

        {/* Feature discovery — celebra e guia o novo assinante premium */}
        {showPremiumTour && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 rounded-2xl border border-secondary/30 bg-secondary/5 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">🎉</span>
              <div>
                <p className="font-display font-bold">Bem-vindo(a) ao plano {plan.plan_name}!</p>
                <p className="text-sm text-muted-foreground">
                  Você desbloqueou AlegrIA ilimitada, simulador de decisões, arena de debate, certificado digital e mais.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => { dismissPremiumTour(); navigate("/alegria"); }}
                className="px-4 py-2.5 rounded-xl gradient-institute text-primary-foreground text-sm font-bold shadow-warm hover:shadow-glow transition-all whitespace-nowrap"
              >
                Explorar AlegrIA
              </button>
              <button
                onClick={dismissPremiumTour}
                className="px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-semibold transition-colors"
              >
                Depois
              </button>
            </div>
          </motion.div>
        )}

        {/* Daily Challenge — microação do dia */}
        <div className="mb-6">
          <DailyChallenge />
        </div>

        {/* AlegrIA — cérebro do ecossistema */}
        <AlegriaHeroCard />

        {/* Level & XP */}
        <div className="p-6 rounded-3xl glass-card mb-6 relative overflow-hidden">
          <motion.div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/5 blur-3xl" animate={{ y: [-5, 5, -5] }} transition={{ duration: 4, repeat: Infinity }} />
          <div className="flex items-center justify-between mb-3 relative">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl gradient-institute flex items-center justify-center shadow-warm">
                <Star className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <div className="font-display font-bold text-xl">Nível {level}</div>
                <div className="text-xs text-muted-foreground">{totalXp} XP acumulados</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
                <span className="fire-flicker text-base leading-none">🔥</span>
                <span className="font-bold text-destructive">{streak}</span>
                <span className="text-destructive/70 text-xs">dias</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 relative">
            <div className="flex-1 h-3 rounded-full bg-muted/50 overflow-hidden">
              <motion.div className="h-full rounded-full gradient-warm" initial={{ width: 0 }} animate={{ width: `${levelProgress}%` }} transition={{ duration: 1.2, ease: "easeOut" }} />
            </div>
            <span className="text-xs font-bold text-muted-foreground">{levelProgress}/100</span>
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="p-5 rounded-2xl glass-card mb-6">
          <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Últimos 7 dias
          </h3>
          <div className="flex items-end gap-2 h-24">
            {weekData.map((d) => (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-primary">{d.xp > 0 ? `+${d.xp}` : ""}</span>
                <motion.div
                  className="w-full rounded-t-lg gradient-warm min-h-[4px]"
                  initial={{ height: 4 }}
                  animate={{ height: d.xp > 0 ? Math.max((d.xp / maxXp) * 80, 8) : 4 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ opacity: d.xp > 0 ? 1 : 0.2 }}
                />
                <span className="text-[10px] text-muted-foreground capitalize">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Streak Calendar — 28 days visual */}
        <div className="mb-6">
          <StreakCalendar
            activityDates={progress.map(p => p.created_at || "")}
            currentStreak={streak}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: Trophy, color: "text-secondary", value: totalXp, label: "XP Total" },
            { icon: Target, color: "text-destructive", value: completedActivities, label: "Atividades" },
            { icon: Play, color: "text-primary", value: `${watchedVideos}/${totalVideos}`, label: "Vídeos" },
            { icon: BookOpen, color: "text-primary", value: `${earned.length}/${ACHIEVEMENTS.length}`, label: "Conquistas" },
          ].map((s) => (
            <motion.div key={s.label} whileHover={{ y: -2 }} className="p-5 rounded-2xl glass-card hover:shadow-warm transition-all">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <div className="text-2xl font-display font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Certificate — shows when all 5 modules have at least 1 activity */}
        {new Set(progress.filter(p => p.completed).map(p => p.module_id)).size >= 5 && (
          <div className="mb-10">
            <Certificate
              studentName={displayName}
              completionDate={new Date().toLocaleDateString("pt-BR")}
              totalXp={totalXp}
              modulesCompleted={5}
            />
          </div>
        )}

        {/* Achievements */}
        <h2 className="text-2xl font-display font-bold mb-4">🏅 Conquistas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = earned.some(e => e.id === a.id);
            return (
              <motion.div
                key={a.id}
                className={`p-4 rounded-2xl border text-center transition-all ${unlocked ? "glass-card border-secondary/30 shadow-warm" : "bg-muted/20 border-border opacity-40 grayscale"}`}
                whileHover={unlocked ? { scale: 1.05, rotate: 1 } : {}}
              >
                <span className={`text-3xl block mb-2 ${unlocked ? "" : "opacity-50"}`}>{a.icon}</span>
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
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => navigate(`/module/${mod.id}`)}
                className="group p-5 rounded-2xl glass-card hover:shadow-float hover:-translate-y-0.5 transition-all cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Abrir Módulo ${mod.number}: ${mod.title}`}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/module/${mod.id}`)}
              >
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
                      <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden" role="progressbar" aria-valuenow={modProgress} aria-valuemax={modVideos + 4}>
                        <motion.div className="h-full rounded-full gradient-warm" initial={{ width: 0 }} animate={{ width: `${Math.min((modProgress / Math.max(modVideos + 4, 1)) * 100, 100)}%` }} transition={{ duration: 1 }} />
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{modProgress} atividades</span>
                    </div>
                    <div className="mt-2">
                      <AlegriaTag moduleId={mod.id} prompt={`Me explique o módulo "${mod.title}" começando por uma pergunta socrática.`} />
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
            { icon: "✨", title: "Constelação", path: "/constellation" },
            { icon: "🪞", title: "Espelho", path: "/mirror" },
            { icon: "⏳", title: "Eu Futuro", path: "/future-self" },
            { icon: "👑", title: "Forças VIA", path: "/strengths" },
          ].map((d) => (
            <motion.button
              key={d.title}
              onClick={() => navigate(d.path)}
              whileHover={{ y: -4, scale: 1.02 }}
              className="p-4 rounded-2xl glass-card hover:shadow-warm transition-all text-left"
              aria-label={`Abrir ${d.title}`}
            >
              {d.title === "AlegrIA" ? (
                <img src={ALEGRIA_AVATAR_URL} alt="" aria-hidden="true" className="w-9 h-9 rounded-xl object-cover mb-2 ring-1 ring-primary/30" />
              ) : (
                <span className="text-2xl block mb-2" aria-hidden="true">{d.icon}</span>
              )}
              <h4 className="font-display font-bold text-sm">{d.title}</h4>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </RoleAwareAppShell>
  );
}
