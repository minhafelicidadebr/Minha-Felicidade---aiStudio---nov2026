import { useState } from "react";
import { motion } from "framer-motion";
import {
    Building2,
    School,
    Users,
    UserPlus,
    Mail,
    Clock,
    CheckCircle2,
    Plus,
    Download,
} from "lucide-react";
import RoleAwareAppShell from "@/components/dashboard/RoleAwareAppShell";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardErrorState from "@/components/dashboard/DashboardErrorState";
import MetricCard from "@/components/dashboard/MetricCard";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useOrganizationDetail } from "@/hooks/useOrganizationDetail";
import OnboardingWizard from "@/components/org/OnboardingWizard";
import OperationalMetrics from "@/components/org/OperationalMetrics";
import EngagementMetrics from "@/components/org/EngagementMetrics";
import EngagementChart from "@/components/org/EngagementChart";
import NpsEvolution from "@/components/org/NpsEvolution";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generatePilotReportPDF } from "@/lib/generate-pilot-report-pdf";

export default function OrgDashboardPage() {
    // Organização ativa vem do ContextSwitcher (shell) — reage à troca no switcher.
    const { activeOrganization } = useDashboardContext();
    const { org, schools, classes, members, invitations, loading, error, refetch } =
        useOrganizationDetail(activeOrganization?.id);
    const { toast } = useToast();

    // Invite form state
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("student");
    const [inviting, setInviting] = useState(false);

    // School creation
    const [showAddSchool, setShowAddSchool] = useState(false);
    const [schoolName, setSchoolName] = useState("");
    const [schoolMunicipality, setSchoolMunicipality] = useState("");
    const [addingSchool, setAddingSchool] = useState(false);

    // Class creation
    const [addingClassForSchool, setAddingClassForSchool] = useState<string | null>(null);
    const [className, setClassName] = useState("");
    const [addingClass, setAddingClass] = useState(false);

    // Onboarding wizard dismissal
    const [wizardDismissed, setWizardDismissed] = useState(false);

    // Pilot report — PDF with data visualization
    const handleDownloadReport = async () => {
        if (!org) return;
        const roleCounts = members.reduce<Record<string, number>>((acc, m) => {
            acc[m.role] = (acc[m.role] || 0) + 1;
            return acc;
        }, {});
        const students = roleCounts["student"] || 0;
        const educators = (roleCounts["educator"] || 0) + (roleCounts["school_admin"] || 0);
        const totalInvited = members.length + invitations.length;
        const activationRate = totalInvited > 0 ? Math.round((members.length / totalInvited) * 100) : 0;

        // Try to fetch engagement data
        let engagementData = undefined;
        try {
            const { data: eng } = await supabase.rpc("get_org_engagement_summary", { _org_id: org.id });
            if (eng && typeof eng === "object") {
                const e = eng as Record<string, unknown>;
                engagementData = {
                    totalSessions: (e.total_sessions as number) || 0,
                    totalExercises: (e.total_exercises as number) || 0,
                    totalAiInteractions: (e.total_ai_interactions as number) || 0,
                    activeUsers7d: (e.active_users_7d as number) || 0,
                    activeUsers30d: (e.active_users_30d as number) || 0,
                    npsAvg: (e.nps_avg as number) || null,
                    npsCount: (e.nps_count as number) || 0,
                    npsPromotors: (e.nps_promoters as number) || 0,
                    npsDetractors: (e.nps_detractors as number) || 0,
                };
            }
        } catch { /* best-effort */ }

        const doc = generatePilotReportPDF({
            orgName: org.name,
            generatedAt: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
            schools: schools.map((s) => ({
                name: s.name,
                municipality: s.municipality,
                classCount: classes.filter((c) => c.school_id === s.id).length,
            })),
            totalMembers: members.length,
            totalStudents: students,
            totalEducators: educators,
            totalInvitations: invitations.length,
            activationRate,
            engagementData,
        });

        doc.save(`relatorio_piloto_${org.slug || "organizacao"}.pdf`);
        toast({ title: "Relatório PDF baixado! 📄", description: "Design premium com indicadores agregados." });
    };

    const handleAddSchool = async () => {
        if (!org || !schoolName.trim()) return;
        setAddingSchool(true);
        try {
            const { error: err } = await supabase.from("schools").insert({
                organization_id: org.id,
                name: schoolName.trim(),
                municipality: schoolMunicipality.trim() || null,
            });
            if (err) throw err;
            toast({ title: "Escola criada!", description: schoolName.trim() });
            setSchoolName("");
            setSchoolMunicipality("");
            setShowAddSchool(false);
            refetch();
        } catch (e) {
            toast({ title: "Erro ao criar escola", description: e instanceof Error ? e.message : "Tente novamente.", variant: "destructive" });
        } finally {
            setAddingSchool(false);
        }
    };

    const handleAddClass = async (schoolId: string) => {
        if (!className.trim()) return;
        setAddingClass(true);
        try {
            const { error: err } = await supabase.from("classes").insert({
                school_id: schoolId,
                name: className.trim(),
                year: new Date().getFullYear(),
            });
            if (err) throw err;
            toast({ title: "Turma criada!", description: className.trim() });
            setClassName("");
            setAddingClassForSchool(null);
            refetch();
        } catch (e) {
            toast({ title: "Erro ao criar turma", description: e instanceof Error ? e.message : "Tente novamente.", variant: "destructive" });
        } finally {
            setAddingClass(false);
        }
    };

    const handleInvite = async () => {
        if (!org || !inviteEmail.trim()) return;
        setInviting(true);
        try {
            const { data, error: err } = await supabase.rpc("invite_member", {
                _organization_id: org.id,
                _invited_email: inviteEmail.trim(),
                _role: inviteRole,
            });
            if (err) throw err;
            const result = data as { created: boolean; token: string } | null;
            toast({
                title: result?.created ? "Convite enviado!" : "Convite já existe",
                description: result?.created
                    ? `${inviteEmail} receberá o convite como ${inviteRole}.`
                    : "Este e-mail já tem um convite pendente.",
            });
            setInviteEmail("");
            setShowInvite(false);
            refetch();
        } catch (e) {
            toast({
                title: "Erro ao convidar",
                description: e instanceof Error ? e.message : "Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setInviting(false);
        }
    };

    // ── Loading state (canonical) ─────────────────────────────────────────────
    if (loading) {
        return (
            <RoleAwareAppShell title="Visão da rede" subtitle="Carregando…">
                <DashboardSkeleton variant="page" label="Carregando dados da organização" />
            </RoleAwareAppShell>
        );
    }

    // ── Error state (canonical) ───────────────────────────────────────────────
    if (error) {
        return (
            <RoleAwareAppShell title="Visão da rede" subtitle="Implantação, adesão e decisões">
                <DashboardErrorState
                    title="Não conseguimos carregar a organização"
                    description="A falha é na leitura dos dados institucionais. Nada foi alterado."
                    detail={error}
                    onRetry={refetch}
                />
            </RoleAwareAppShell>
        );
    }

    // ── Empty state: no organization found ───────────────────────────────────
    if (!org) {
        return (
            <RoleAwareAppShell title="Visão da rede" subtitle="Implantação, adesão e decisões">
                <DashboardEmptyState
                    variant="empty"
                    title="Nenhuma organização encontrada"
                    description="Você ainda não faz parte de uma organização. Se é gestor escolar, entre em contato para configurar seu piloto."
                    icon={Building2}
                    action={{ label: "Voltar ao Dashboard", to: "/dashboard" }}
                />
            </RoleAwareAppShell>
        );
    }

    const roleLabel: Record<string, string> = {
        platform_admin: "Admin Plataforma",
        org_admin: "Gestor",
        school_admin: "Coord. Escola",
        educator: "Educador(a)",
        student: "Estudante",
        guardian: "Responsável",
    };

    // Show onboarding wizard on first access (no schools yet)
    const showWizard = schools.length === 0 && !wizardDismissed;

    if (showWizard) {
        return (
            <RoleAwareAppShell title="Visão da rede" subtitle="Configuração inicial">
                <div className="flex items-center justify-center py-12">
                    <OnboardingWizard
                        organizationId={org.id}
                        orgName={org.name}
                        onComplete={() => { setWizardDismissed(true); refetch(); }}
                    />
                </div>
            </RoleAwareAppShell>
        );
    }

    // ── Compute metrics ──────────────────────────────────────────────────────
    const totalInvited = members.length + invitations.length;
    const activationRate = totalInvited > 0 ? Math.round((members.length / totalInvited) * 100) : 0;
    const now = new Date().toISOString();

    // ── Action slot for the shell header ─────────────────────────────────────
    const headerActions = (
        <div className="flex items-center gap-2">
            <button
                onClick={handleDownloadReport}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border/60 px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                title="Baixar relatório do piloto (dados agregados)"
            >
                <Download className="w-4 h-4" aria-hidden="true" /> Relatório
            </button>
            <button
                onClick={() => setShowInvite(!showInvite)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
                <UserPlus className="w-4 h-4" aria-hidden="true" /> Convidar
            </button>
        </div>
    );

    return (
        <RoleAwareAppShell
            title="Visão da rede"
            subtitle="Implantação, adesão e decisões"
            action={headerActions}
        >
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {/* Invite form */}
                {showInvite && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mb-6 p-5 rounded-2xl border border-primary/20 bg-card/60"
                    >
                        <h3 className="font-display font-bold text-sm mb-3">Convidar membro</h3>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="Email do convidado"
                                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <select
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value)}
                                className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="student">Estudante</option>
                                <option value="educator">Educador(a)</option>
                                <option value="school_admin">Coord. Escola</option>
                                <option value="org_admin">Gestor</option>
                            </select>
                            <button
                                onClick={handleInvite}
                                disabled={inviting || !inviteEmail.trim()}
                                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
                            >
                                {inviting ? "Enviando..." : "Enviar"}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Stats — canonical MetricCards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-8">
                    <MetricCard
                        metricKey="org_schools_count"
                        label="Escolas"
                        value={schools.length}
                        icon={School}
                        period="acumulado"
                        formula="Contagem de escolas ativas vinculadas à organização"
                        source="tabela schools (organization_id)"
                        limitation="Não reflete escolas inativas ou removidas"
                        updatedAt={now}
                    />
                    <MetricCard
                        metricKey="org_members_count"
                        label="Membros"
                        value={members.length}
                        icon={Users}
                        period="acumulado"
                        formula="Contagem de membros com status ativo"
                        source="tabela institutional_memberships (status=active)"
                        limitation="Não inclui convites pendentes"
                        updatedAt={now}
                        action={{ label: "Ver membros", to: "/org" }}
                    />
                    <MetricCard
                        metricKey="org_invitations_pending"
                        label="Convites pendentes"
                        value={invitations.length}
                        icon={Mail}
                        period="acumulado"
                        formula="Contagem de convites sem accepted_at"
                        source="tabela institutional_invitations (accepted_at IS NULL)"
                        limitation="Convites expirados ainda contabilizados até limpeza"
                        updatedAt={now}
                    />
                    <MetricCard
                        metricKey="org_classes_count"
                        label="Turmas"
                        value={classes.length}
                        icon={Building2}
                        period="acumulado"
                        formula="Contagem de turmas vinculadas às escolas da organização"
                        source="tabela classes (school_id IN escolas da org)"
                        limitation="Não distingue turmas ativas de encerradas"
                        updatedAt={now}
                    />
                </div>

                {/* Activation rate + Role distribution */}
                {members.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-sm font-display font-bold mb-3 uppercase tracking-wider text-muted-foreground">
                            Indicadores agregados
                        </h2>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {/* Role distribution */}
                            <div className="p-5 rounded-2xl border border-border/50 bg-card/60">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Membros por papel</h3>
                                <div className="space-y-2">
                                    {Object.entries(
                                        members.reduce<Record<string, number>>((acc, m) => {
                                            acc[m.role] = (acc[m.role] || 0) + 1;
                                            return acc;
                                        }, {})
                                    ).sort((a, b) => b[1] - a[1]).map(([role, count]) => (
                                        <div key={role} className="flex items-center justify-between">
                                            <span className="text-sm">{roleLabel[role] || role}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                                                    <div className="h-full rounded-full bg-primary" style={{ width: `${(count / members.length) * 100}%` }} />
                                                </div>
                                                <span className="text-xs font-bold w-6 text-right">{count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Activation rate */}
                            <div className="p-5 rounded-2xl border border-border/50 bg-card/60">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Taxa de ativação</h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm">Convites aceitos</span>
                                            <span className="text-xs font-bold text-success">{members.length} de {totalInvited}</span>
                                        </div>
                                        <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                                            <div className="h-full rounded-full bg-success" style={{ width: `${activationRate}%` }} />
                                        </div>
                                    </div>
                                    <div className="pt-3 border-t border-border/30">
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            📊 Indicadores mostram apenas dados agregados. Conversas com a IA, relatos pessoais e dados individuais dos estudantes não são acessíveis neste painel.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Schools */}
                <section className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <School className="w-4 h-4 text-primary" aria-hidden="true" /> Escolas
                        </h2>
                        <button onClick={() => setShowAddSchool(!showAddSchool)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Adicionar escola
                        </button>
                    </div>
                    {showAddSchool && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-4 p-4 rounded-2xl border border-primary/20 bg-card/60">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Nome da escola" className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                <input value={schoolMunicipality} onChange={(e) => setSchoolMunicipality(e.target.value)} placeholder="Município (opcional)" className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-48" />
                                <button onClick={handleAddSchool} disabled={addingSchool || !schoolName.trim()} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">{addingSchool ? "Criando..." : "Criar"}</button>
                            </div>
                        </motion.div>
                    )}
                    {schools.length === 0 ? (
                        <DashboardEmptyState
                            variant="empty"
                            title="Nenhuma escola cadastrada"
                            description="Clique em 'Adicionar escola' acima para começar."
                            icon={School}
                        />
                    ) : (
                        <div className="space-y-3">
                            {schools.map((s) => {
                                const schoolClasses = classes.filter(c => c.school_id === s.id);
                                return (
                                    <div key={s.id} className="p-4 rounded-2xl border border-border/50 bg-card/60">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-sm">{s.name}</h3>
                                                {s.municipality && <p className="text-xs text-muted-foreground">{s.municipality}{s.state_code ? ` — ${s.state_code}` : ""}</p>}
                                            </div>
                                            <button onClick={() => setAddingClassForSchool(addingClassForSchool === s.id ? null : s.id)} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                                                <Plus className="w-3 h-3" aria-hidden="true" /> Turma
                                            </button>
                                        </div>
                                        {addingClassForSchool === s.id && (
                                            <div className="mt-3 flex gap-2">
                                                <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Nome da turma (ex: 9ºA)" className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                                <button onClick={() => handleAddClass(s.id)} disabled={addingClass || !className.trim()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50">{addingClass ? "..." : "Criar"}</button>
                                            </div>
                                        )}
                                        {schoolClasses.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {schoolClasses.map(c => (
                                                    <span key={c.id} className="px-2.5 py-1 rounded-lg bg-muted text-xs font-medium">
                                                        {c.name} ({c.year})
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Members */}
                <section className="mb-8">
                    <h2 className="text-sm font-display font-bold mb-3 uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-secondary" aria-hidden="true" /> Membros ativos
                    </h2>
                    {members.length === 0 ? (
                        <DashboardEmptyState
                            variant="empty"
                            title="Nenhum membro além de você"
                            description="Use o botão 'Convidar' para adicionar membros à sua organização."
                            icon={Users}
                        />
                    ) : (
                        <div className="space-y-2">
                            {members.map((m) => (
                                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card/60">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                            {m.role.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{m.user_id.slice(0, 8)}...</p>
                                            <p className="text-[11px] text-muted-foreground">{roleLabel[m.role] || m.role}</p>
                                        </div>
                                    </div>
                                    <CheckCircle2 className="w-4 h-4 text-success" aria-hidden="true" />
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Pending invitations */}
                {invitations.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-sm font-display font-bold mb-3 uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Mail className="w-4 h-4 text-accent" aria-hidden="true" /> Convites pendentes
                        </h2>
                        <div className="space-y-2">
                            {invitations.map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card/60">
                                    <div>
                                        <p className="text-sm font-medium">{inv.invited_email}</p>
                                        <p className="text-[11px] text-muted-foreground">{roleLabel[inv.role] || inv.role}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="w-3 h-3" aria-hidden="true" />
                                        Expira {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Engagement Metrics */}
                <EngagementMetrics organizationId={org.id} />

                {/* Engagement Evolution Chart */}
                <EngagementChart organizationId={org.id} />
                <NpsEvolution organizationId={org.id} />

                {/* Operational Metrics */}
                <OperationalMetrics organizationId={org.id} />
            </motion.div>
        </RoleAwareAppShell>
    );
}
