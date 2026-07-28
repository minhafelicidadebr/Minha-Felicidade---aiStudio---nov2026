// UX-3 — Painel docente sobre a casca compartilhada, servido em `/professores`.
//
// Saiu de `/admin` (que passou a ser a Landing Administrativa, §D3/D51) e
// deixou de usar `Navbar`/`Footer`: a navegação agora é a do papel.
//
// Três correções de contrato feitas aqui:
//   • 401 e 403 eram o mesmo estado ("Acesso negado"); agora são distintos,
//     porque as ações da pessoa são diferentes (entrar vs. pedir permissão);
//   • `return null` silencioso foi substituído por estado explicado;
//   • amostra insuficiente não mostra `0` — mostra o motivo.

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { modules } from "@/data/courseData";
import RoleAwareAppShell from "@/components/dashboard/RoleAwareAppShell";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardErrorState from "@/components/dashboard/DashboardErrorState";
import PrivacyIndicator from "@/components/dashboard/PrivacyIndicator";
import { Activity, BarChart3, Lock, Shield, Trophy, Users } from "lucide-react";

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
  funnel: FunnelOverview | null;
}

interface FunnelOverview {
  counts: Record<string, number>;
  min_sample: number;
  days: number;
}

// Etapas do funil na ordem de conversão.
const FUNNEL_STEPS: { kind: string; label: string }[] = [
  { kind: "signup", label: "Cadastro" },
  { kind: "activation", label: "Ativação" },
  { kind: "lesson_completed", label: "Aula concluída" },
  { kind: "paywall_hit", label: "Paywall" },
  { kind: "checkout_started", label: "Checkout" },
  { kind: "upgrade", label: "Upgrade" },
];

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

/** Falha classificada: 401 e 403 pedem ações diferentes da pessoa. */
type AdminFailure =
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message: string }
  | { kind: "technical"; message: string };

const TITLE = "Painel pedagógico";
const SUBTITLE = "Indicadores agregados, sem identificação de estudante";

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<AdminFailure | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setFailure({ kind: "unauthenticated" });
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
        const message = typeof body.error === "string" ? body.error : "";
        if (resp.status === 401) {
          setFailure({ kind: "unauthenticated" });
        } else if (resp.status === 403) {
          setFailure({ kind: "forbidden", message });
        } else {
          setFailure({ kind: "technical", message: message || `Falha ${resp.status} na leitura.` });
        }
        return;
      }

      setData((await resp.json()) as AdminData);
    } catch (caught) {
      setFailure({
        kind: "technical",
        message: caught instanceof Error ? caught.message : "Falha de rede.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <RoleAwareAppShell title={TITLE} subtitle="Carregando…">
        <DashboardSkeleton variant="page" label="Carregando indicadores pedagógicos agregados" />
      </RoleAwareAppShell>
    );
  }

  // 401 — a pessoa precisa entrar. Não é falta de permissão.
  if (failure?.kind === "unauthenticated") {
    return (
      <RoleAwareAppShell title={TITLE} subtitle={SUBTITLE}>
        <DashboardEmptyState
          variant="denied"
          title="Sua sessão expirou"
          description="Entre novamente para ver os indicadores pedagógicos."
          icon={Lock}
          action={{ label: "Entrar", to: "/auth" }}
        />
      </RoleAwareAppShell>
    );
  }

  // 403 — a pessoa está autenticada, mas o papel não alcança este painel.
  if (failure?.kind === "forbidden") {
    return (
      <RoleAwareAppShell title={TITLE} subtitle={SUBTITLE}>
        <DashboardEmptyState
          variant="denied"
          title="Este painel exige papel de docente ou gestor"
          description={
            failure.message ||
            "Sua conta está autenticada, mas não tem o papel exigido para ler indicadores agregados."
          }
          hint="Se você deveria ter acesso, peça à gestão da rede para ajustar o papel da sua conta."
          icon={Shield}
        />
      </RoleAwareAppShell>
    );
  }

  if (failure?.kind === "technical") {
    return (
      <RoleAwareAppShell title={TITLE} subtitle={SUBTITLE}>
        <DashboardErrorState
          title="Não conseguimos carregar os indicadores"
          description="A falha é na leitura dos indicadores. Nada foi alterado."
          detail={failure.message}
          onRetry={() => void fetchData()}
        />
      </RoleAwareAppShell>
    );
  }

  // Sem dado e sem falha classificada: estado explicado, nunca `return null`.
  if (!data) {
    return (
      <RoleAwareAppShell title={TITLE} subtitle={SUBTITLE}>
        <DashboardEmptyState
          variant="empty"
          title="Sem indicadores para exibir"
          description="A leitura foi concluída, mas não veio nenhum indicador. Isso acontece quando ainda não há atividade registrada no escopo da sua conta."
          icon={BarChart3}
        />
      </RoleAwareAppShell>
    );
  }

  return (
    <RoleAwareAppShell title={TITLE} subtitle={SUBTITLE}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <>
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

          {/* Amostra insuficiente NÃO exibe `0`: exibe o motivo. Um zero aqui
              faria o docente concluir "ninguém participou" quando a verdade é
              "há gente, mas são poucas para divulgar com segurança". */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { icon: Users, tone: "text-primary", label: "Participantes", value: data.global.totalStudents },
              { icon: Trophy, tone: "text-secondary", label: "XP coletivo", value: data.global.totalXp },
              { icon: Activity, tone: "text-success", label: "Atividades", value: data.global.totalActivitiesCompleted },
              { icon: BarChart3, tone: "text-primary", label: "XP medio", value: data.global.averageXpPerStudent },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="p-5 rounded-2xl bg-card border border-border">
                  <Icon className={`w-5 h-5 ${card.tone} mb-2`} aria-hidden="true" />
                  {data.insufficientSample ? (
                    <div
                      className="flex items-start gap-1.5 text-xs text-muted-foreground"
                      data-testid="admin-suppressed-value"
                    >
                      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>Amostra insuficiente para exibição segura.</span>
                    </div>
                  ) : (
                    <div className="text-2xl font-display font-bold">
                      {card.value.toLocaleString("pt-BR")}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">{card.label}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground/80">
                    Fonte: <code>admin-dashboard</code> · Limitação: mede uso, não bem-estar.
                  </div>
                </div>
              );
            })}
          </div>

          <PrivacyIndicator
            scope="threshold"
            minimumGroupSize={data.minimumSample}
            period="acumulado"
            className="mb-10"
          />

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

          {data.funnel && (
            <>
              <h2 className="text-2xl font-display font-bold mb-1">Funil de conversao</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Sessoes distintas por etapa nos ultimos {data.funnel.days} dias. Etapas com menos de{" "}
                {data.funnel.min_sample} sessoes aparecem como "amostra insuficiente".
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                {FUNNEL_STEPS.map((step) => {
                  const raw = data.funnel!.counts[step.kind] ?? 0;
                  const enough = raw >= data.funnel!.min_sample;
                  return (
                    <div key={step.kind} className="p-4 rounded-2xl bg-card border border-border text-center">
                      <div className="text-xs font-medium text-muted-foreground mb-1">{step.label}</div>
                      <div className="text-2xl font-display font-bold">
                        {enough ? raw : <span className="text-base text-muted-foreground">amostra insuf.</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 mb-10">
                {FUNNEL_STEPS.slice(1).map((step, i) => {
                  const prev = data.funnel!.counts[FUNNEL_STEPS[i].kind] ?? 0;
                  const curr = data.funnel!.counts[step.kind] ?? 0;
                  const bothEnough = prev >= data.funnel!.min_sample && curr >= data.funnel!.min_sample;
                  const rate = bothEnough && prev > 0 ? Math.round((curr / prev) * 100) : null;
                  return (
                    <span key={step.kind} className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
                      {FUNNEL_STEPS[i].label} → {step.label}:{" "}
                      <strong className="text-foreground">{rate === null ? "—" : `${rate}%`}</strong>
                    </span>
                  );
                })}
              </div>
            </>
          )}

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
              <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-display font-bold mb-1">Invariante de privacidade ativa</h2>
                <p className="text-sm text-muted-foreground">
                  Este painel nao retorna nome, email, user_id ou relatorio individual de estudante. As leituras passam
                  por RPC agregada, aplicam N minimo e registram acesso em auditoria.
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground/80">
                  A descrição acima é do mecanismo técnico aplicado. Não constitui afirmação de
                  conformidade legal.
                </p>
              </div>
            </div>
          </div>
        </>
      </motion.div>
    </RoleAwareAppShell>
  );
}
