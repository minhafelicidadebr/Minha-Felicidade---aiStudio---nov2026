import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { modules, videoLessons } from "@/data/courseData";
import Navbar from "@/components/Navbar";
import { BookOpen, Play, Trophy, Flame, ArrowRight, LogOut, User } from "lucide-react";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      // fetch profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      setProfile(prof);
      // fetch progress
      const { data: prog } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", session.user.id);
      setProgress(prog || []);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const totalXp = progress.reduce((sum, p) => sum + (p.xp_earned || 0), 0);
  const completedActivities = progress.filter((p) => p.completed).length;
  const totalVideos = videoLessons.length;
  const watchedVideos = progress.filter((p) => p.activity_type === "video" && p.completed).length;

  const getModuleProgress = (moduleId: string) => {
    const moduleProgress = progress.filter((p) => p.module_id === moduleId && p.completed);
    return moduleProgress.length;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16 max-w-5xl">
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
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 text-secondary-foreground">
                <Trophy className="w-4 h-4" />
                <span className="font-bold text-sm">{totalXp} XP</span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
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
              <Flame className="w-5 h-5 text-destructive mb-2" />
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
              <div className="text-2xl font-display font-bold">{modules.length}</div>
              <div className="text-xs text-muted-foreground">Módulos disponíveis</div>
            </div>
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
                  transition={{ delay: i * 0.1 }}
                  onClick={() => navigate(`/module/${mod.id}`)}
                  className="group p-5 rounded-2xl bg-card border border-border hover:shadow-warm hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{mod.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-primary uppercase">Semana {mod.week} • Módulo {mod.number}</span>
                        <span className="text-xs text-muted-foreground">{mod.duration}</span>
                      </div>
                      <h3 className="font-display font-bold text-lg truncate">{mod.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{mod.subtitle}</p>
                      {/* Progress bar */}
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full gradient-warm transition-all"
                            style={{ width: `${Math.min((modProgress / Math.max(modVideos + 4, 1)) * 100, 100)}%` }}
                          />
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
              <button
                key={d.title}
                onClick={() => navigate(d.path)}
                className="p-4 rounded-2xl bg-card border border-border hover:shadow-warm hover:-translate-y-1 transition-all text-left"
              >
                <span className="text-2xl block mb-2">{d.icon}</span>
                <h4 className="font-display font-bold text-sm">{d.title}</h4>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
