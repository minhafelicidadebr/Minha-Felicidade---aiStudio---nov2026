import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { modules } from "@/data/courseData";
import Navbar from "@/components/Navbar";
import { Activity, ArrowLeft, BarChart3, Lock, Shield, Trophy, Users } from "lucide-react";

interface AdminData {
  role: string;
  scopeType: string;
  insufficientSample: boolean;
  minimumSample: number;
  global: {
    totalStudents: number;
    totalXp: number;
    totalActivitiesCompleted: number;
    averageXpPerStudent: number;
  };
  moduleEngagement: { moduleId: string; totalActivities: number; totalXp: number; uniqueStudents: number }[];
  activityDistribution: Record<string, number>;
}

const ACTIVITY_LABELS: Record<string, string> = {
  video: "Videos",
  quiz: "Quiz",
  flashcard: "Flashcards",
  simulator: "Simulador",
  debate: "Debate",
  poetry: "Poesia",
  codesign: "Co-design",
  evidence: "Evidencias",
};

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

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
          <h1 className="text-2xl font-display font-bold mb-2">Acesso restrito</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button onClick={() => navigate("/dashboard")} className="text-primary hover:underline">
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl gradient-warm flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold">
                Painel {data.role === "manager" ? "do Gestor" : "do Professor"}
              </h1>
              <p className="text-muted-foreground text-sm">
                Dados agregados, com N minimo e sem exposicao nominal de estudantes
              </p>
            </div>
          </div>

          {data.insufficientSample && (
            <div className="p-5 rounded-2xl bg-card border border-border mb-8 flex gap-3">
              <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display font-bold text-lg mb-1">Amostra insuficiente</h2>
                <p className="text-sm text-muted-foreground">
                  O painel so exibe metricas agregadas quando ha pelo menos {data.minimumSample} estudantes com
                  atividade. Esta regra reduz risco de reidentificacao.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="p-5 rounded-2xl bg-card border border-border">
              <Users className="w-5 h-5 text-primary mb-2" />
              <div className="text-2xl font-display font-bold">{data.global.totalStudents}</div>
              <div className="text-xs text-muted-foreground">Participantes</div>
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <Trophy className="w-5 h-5 text-secondary mb-2" />
              <div className="text-2xl font-display font-bold">{data.global.totalXp.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">XP coletivo</div>
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <Activity className="w-5 h-5 text-success mb-2" />
              <div className="text-2xl font-display font-bold">{data.global.totalActivitiesCompleted}</div>
              <div className="text-xs text-muted-foreground">Atividades</div>
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <BarChart3 className="w-5 h-5 text-primary mb-2" />
              <div className="text-2xl font-display font-bold">{data.global.averageXpPerStudent}</div>
              <div className="text-xs text-muted-foreground">XP medio</div>
            </div>
          </div>

          <h2 className="text-2xl font-display font-bold mb-4">Engajamento por modulo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-10">
            {data.moduleEngagement.map((moduleEngagement) => {
              const courseModule = modules.find((moduleItem) => moduleItem.id === moduleEngagement.moduleId);
              return (
                <div key={moduleEngagement.moduleId} className="p-4 rounded-2xl bg-card border border-border">
                  <span className="text-2xl">{courseModule?.icon || "M"}</span>
                  <h4 className="font-display font-bold text-sm mt-2">M{courseModule?.number || "?"}</h4>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div>{moduleEngagement.uniqueStudents} participantes</div>
                    <div>{moduleEngagement.totalActivities} atividades</div>
                    <div>{moduleEngagement.totalXp} XP</div>
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="text-2xl font-display font-bold mb-4">Distribuicao por atividade</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {Object.entries(data.activityDistribution).map(([type, count]) => (
              <div key={type} className="p-4 rounded-2xl bg-card border border-border text-center">
                <div className="text-sm font-medium mb-1">{ACTIVITY_LABELS[type] || type}</div>
                <div className="text-2xl font-display font-bold">{count}</div>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-display font-bold mb-1">Invariante de privacidade ativa</h2>
                <p className="text-sm text-muted-foreground">
                  Este painel nao retorna nome, email, user_id ou relatorio individual de estudante. As leituras passam
                  por RPC agregada, aplicam N minimo e registram acesso em auditoria.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
