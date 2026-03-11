import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { modules } from "@/data/courseData";
import Navbar from "@/components/Navbar";
import { Users, Trophy, Activity, BarChart3, ArrowLeft, Download, Search, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StudentData {
  userId: string;
  name: string;
  role: string;
  totalXp: number;
  completedActivities: number;
  videosWatched: number;
  modulesActive: number;
  lastActivity: string | null;
}

interface AdminData {
  role: string;
  global: {
    totalStudents: number;
    totalXp: number;
    totalActivitiesCompleted: number;
    averageXpPerStudent: number;
  };
  moduleEngagement: { moduleId: string; totalActivities: number; totalXp: number; uniqueStudents: number }[];
  activityDistribution: Record<string, number>;
  students: StudentData[];
}

const ACTIVITY_LABELS: Record<string, string> = {
  video: "📹 Vídeos",
  quiz: "🎯 Quiz",
  flashcard: "🃏 Flashcards",
  simulator: "🎮 Simulador",
  debate: "⚔️ Debate",
  poetry: "🎭 Poesia",
  codesign: "🏗️ Co-design",
  evidence: "📊 Evidências",
};

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        setError(body.error || "Acesso negado");
        setLoading(false);
        return;
      }

      setData(await resp.json());
      setLoading(false);
    };
    fetchData();
  }, [navigate]);

  const downloadReport = async (userId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: userId }),
      }
    );
    if (!resp.ok) {
      toast({ title: "Erro", description: "Não foi possível gerar o relatório", variant: "destructive" });
      return;
    }
    const report = await resp.json();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${report.student?.name?.replace(/\s+/g, "_") || "aluno"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Relatório gerado! 📄", description: "Download iniciado" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-24 text-center">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button onClick={() => navigate("/dashboard")} className="text-primary hover:underline">
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const filteredStudents = data.students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl gradient-warm flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold">Painel {data.role === "manager" ? "do Gestor" : "do Professor"}</h1>
              <p className="text-muted-foreground text-sm">Dados agregados da plataforma</p>
            </div>
          </div>

          {/* Global Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="p-5 rounded-2xl bg-card border border-border">
              <Users className="w-5 h-5 text-primary mb-2" />
              <div className="text-2xl font-display font-bold">{data.global.totalStudents}</div>
              <div className="text-xs text-muted-foreground">Alunos</div>
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <Trophy className="w-5 h-5 text-secondary mb-2" />
              <div className="text-2xl font-display font-bold">{data.global.totalXp.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">XP Total</div>
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <Activity className="w-5 h-5 text-success mb-2" />
              <div className="text-2xl font-display font-bold">{data.global.totalActivitiesCompleted}</div>
              <div className="text-xs text-muted-foreground">Atividades</div>
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <BarChart3 className="w-5 h-5 text-primary mb-2" />
              <div className="text-2xl font-display font-bold">{data.global.averageXpPerStudent}</div>
              <div className="text-xs text-muted-foreground">XP Médio/Aluno</div>
            </div>
          </div>

          {/* Module Engagement */}
          <h2 className="text-2xl font-display font-bold mb-4">📊 Engajamento por Módulo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-10">
            {data.moduleEngagement.map((me) => {
              const mod = modules.find((m) => m.id === me.moduleId);
              return (
                <div key={me.moduleId} className="p-4 rounded-2xl bg-card border border-border">
                  <span className="text-2xl">{mod?.icon || "📦"}</span>
                  <h4 className="font-display font-bold text-sm mt-2">M{mod?.number || "?"}</h4>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div>{me.uniqueStudents} alunos</div>
                    <div>{me.totalActivities} atividades</div>
                    <div>{me.totalXp} XP</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Activity Distribution */}
          <h2 className="text-2xl font-display font-bold mb-4">🎯 Distribuição por Atividade</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {Object.entries(data.activityDistribution).map(([type, count]) => (
              <div key={type} className="p-4 rounded-2xl bg-card border border-border text-center">
                <div className="text-sm font-medium mb-1">{ACTIVITY_LABELS[type] || type}</div>
                <div className="text-2xl font-display font-bold">{count}</div>
              </div>
            ))}
          </div>

          {/* Student List */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-display font-bold">👥 Alunos</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar aluno..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl bg-muted border border-border text-sm focus:ring-2 focus:ring-primary/20 outline-none w-64"
              />
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 font-semibold">Aluno</th>
                    <th className="text-center p-4 font-semibold">Papel</th>
                    <th className="text-center p-4 font-semibold">XP</th>
                    <th className="text-center p-4 font-semibold">Atividades</th>
                    <th className="text-center p-4 font-semibold">Vídeos</th>
                    <th className="text-center p-4 font-semibold">Módulos</th>
                    <th className="text-center p-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, i) => (
                    <tr key={student.userId} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="p-4 font-medium">{student.name}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                          student.role === "manager" ? "bg-destructive/10 text-destructive" :
                          student.role === "teacher" ? "bg-primary/10 text-primary" :
                          "bg-secondary/10 text-secondary-foreground"
                        }`}>
                          {student.role === "student" ? "Aluno" : student.role === "teacher" ? "Professor" : "Gestor"}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold text-secondary">{student.totalXp}</td>
                      <td className="p-4 text-center">{student.completedActivities}</td>
                      <td className="p-4 text-center">{student.videosWatched}</td>
                      <td className="p-4 text-center">{student.modulesActive}/5</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => downloadReport(student.userId)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="Baixar relatório"
                          aria-label={`Baixar relatório de ${student.name}`}
                        >
                          <Download className="w-4 h-4 text-primary" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredStudents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">Nenhum aluno encontrado.</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
