// UX-3 — Landing Administrativa da plataforma, servida em `/admin` (§D3/D51).
//
// Por que esta página existe: eu havia proposto redirecionar `platform_admin`
// para `/org` até `/admin/operacao` ficar pronto. O humano REPROVOU, com razão —
// mandar um administrador de plataforma para o painel de gestor de organização
// confunde papel, pode mascarar falha de autorização e cria uma dívida que
// tende a durar mais que o previsto.
//
// Nota de guarda de rota: `RequireRole` só entende os papéis de APLICAÇÃO
// (student/teacher/manager). `platform_admin` existe apenas em
// `institutional_memberships`, então não há como expressá-lo em
// `allowedRoles`. Por isso a checagem de papel acontece aqui, sobre o papel
// derivado no servidor por `useDashboardContext` — e quem não é administrador
// de plataforma é levado à própria home em vez de ver conteúdo administrativo.

import { Navigate } from "react-router-dom";
import { Building2, Construction, CreditCard, ShieldCheck, Users } from "lucide-react";
import RoleAwareAppShell from "@/components/dashboard/RoleAwareAppShell";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import DashboardErrorState from "@/components/dashboard/DashboardErrorState";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { DASHBOARD_ROLE_LABEL } from "@/lib/role-home";
import { formatFreshness } from "@/lib/dashboard-format";

const TITLE = "Administração da Plataforma";

/** Áreas administrativas que JÁ existem. Nada aqui é link morto. */
const EXISTING_AREAS = [
    {
        label: "Visão da rede",
        to: "/org",
        icon: Building2,
        description: "Implantação, adesão e decisões das organizações",
    },
    {
        label: "Painel pedagógico",
        to: "/professores",
        icon: Users,
        description: "Indicadores agregados de turmas",
    },
    {
        label: "Assinatura",
        to: "/subscription",
        icon: CreditCard,
        description: "Plano atual e recursos liberados",
    },
] as const;

/**
 * O que ainda NÃO existe. Listado explicitamente porque a doutrina §1 manda
 * documentar o que falta em vez de deixar implícito que a página está completa.
 */
const UNDER_CONSTRUCTION = [
    "Operação: saúde, filas e erros da plataforma",
    "Tenants: portfólio de organizações e contratos",
    "Segurança: auditoria de acessos e invariantes",
    "IA e custos: consumo por organização e teto de gasto",
    "Conteúdos e claims: proveniência e revisão de alegações",
] as const;

export default function AdminOperacaoPage() {
    const { role, roleHomePath, organizations, fetchedAt, isLoading, isError, error, refetch } =
        useDashboardContext();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background p-4 sm:p-6">
                <DashboardSkeleton variant="page" label="Verificando seu acesso administrativo" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="min-h-screen bg-background p-4 sm:p-6">
                <DashboardErrorState
                    title="Não conseguimos confirmar seu acesso administrativo"
                    description="Sem resolver o papel não é seguro mostrar conteúdo administrativo. Nada foi alterado."
                    detail={error?.message ?? null}
                    onRetry={refetch}
                />
            </div>
        );
    }

    // Quem não é administrador de plataforma vai para a própria home. Não é um
    // erro da pessoa — é apenas a rota errada para o papel dela.
    if (role !== "platform_admin") {
        return <Navigate to={roleHomePath} replace state={{ accessDenied: true }} />;
    }

    return (
        <RoleAwareAppShell title={TITLE} subtitle="Estado operacional e áreas administrativas">
            <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
                Você está autenticado como <strong>{DASHBOARD_ROLE_LABEL[role]}</strong>. Esta é a
                entrada administrativa da plataforma — deliberadamente separada do painel de gestor
                de organização, para que os dois papéis não se confundam.
            </p>

            <section className="mb-8" aria-labelledby="admin-state">
                <h2
                    id="admin-state"
                    className="mb-3 text-sm font-display font-bold uppercase tracking-wider text-muted-foreground"
                >
                    Estado operacional
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <article className="rounded-2xl border border-border/50 bg-card/60 p-4">
                        <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Organizações visíveis
                        </h3>
                        <p className="font-display text-2xl font-bold leading-none">
                            {organizations.length}
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                            Contagem de organizações ativas que sua conta pode ler.
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground/80">
                            Fonte: tabela <code>organizations</code> (status ativo) ·{" "}
                            {formatFreshness(fetchedAt)}
                        </p>
                    </article>

                    <article className="rounded-2xl border border-border/50 bg-card/60 p-4">
                        <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                            Invariantes de leitura
                        </h3>
                        <p className="text-sm font-semibold">Supressão N mínimo ativa</p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                            Indicadores de estudante passam por limiar mínimo por grupo, aplicado no
                            servidor.
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground/80">
                            Descreve o mecanismo técnico aplicado; não constitui afirmação de
                            conformidade legal.
                        </p>
                    </article>
                </div>
            </section>

            <section className="mb-8" aria-labelledby="admin-areas">
                <h2
                    id="admin-areas"
                    className="mb-3 text-sm font-display font-bold uppercase tracking-wider text-muted-foreground"
                >
                    Áreas administrativas disponíveis
                </h2>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {EXISTING_AREAS.map((area) => {
                        const Icon = area.icon;
                        return (
                            <li key={area.to}>
                                <a
                                    href={area.to}
                                    className="flex min-h-11 flex-col gap-1 rounded-2xl border border-border/50 bg-card/60 p-4 transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                >
                                    <span className="flex items-center gap-2 text-sm font-bold">
                                        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                                        {area.label}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        {area.description}
                                    </span>
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </section>

            <section aria-labelledby="admin-pending">
                <h2
                    id="admin-pending"
                    className="mb-3 flex items-center gap-2 text-sm font-display font-bold uppercase tracking-wider text-muted-foreground"
                >
                    <Construction className="h-4 w-4 text-secondary" aria-hidden="true" />
                    Ainda em construção
                </h2>
                <div className="rounded-2xl border border-secondary/40 bg-secondary/5 p-4">
                    <p className="mb-2 text-sm text-muted-foreground">
                        Esta landing é provisória. As áreas abaixo estão previstas e{" "}
                        <strong>ainda não existem</strong> — nenhuma delas tem link nesta página
                        porque link para tela inexistente é pior que ausência de link.
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-[11px] text-muted-foreground">
                        {UNDER_CONSTRUCTION.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>
            </section>
        </RoleAwareAppShell>
    );
}
