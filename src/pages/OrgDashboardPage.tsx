import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, School, Users, UserPlus, Mail, Clock, CheckCircle2, Loader2, Plus, BarChart3, Download } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useOrganization } from "@/hooks/useOrganization";
import OnboardingWizard from "@/components/org/OnboardingWizard";
import OperationalMetrics from "@/components/org/OperationalMetrics";
import EngagementMetrics from "@/components/org/EngagementMetrics";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function OrgDashboardPage() {
    const navigate = useNavigate();
    const { org, schools, classes, members, invitations, loading, error, refetch } = useOrganization();
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

    // Pilot report — aggregated only, no PII
    const handleDownloadReport = () => {
        if (!org) return;
        const roleCounts = members.reduce<Record<string, number>>((acc, m) => {
            acc[m.role] = (acc[m.role] || 0) + 1;
            return acc;
        }, {});
        const students = roleCounts["student"] || 0;
        const educators = (roleCounts["educator"] || 0) + (roleCounts["school_admin"] || 0);
        const totalInvited = members.length + invitations.length;
        const activationRate = totalInvited > 0 ? Math.round((members.length / totalInvited) * 100) : 0;
        const lines = [
            "═══════════════════════════════════════════",
            "  RELATÓRIO DO PILOTO — CIÊNCIA DO BEM-ESTAR",
            "  Instituto Felicidade Para Todos",
            "═══════════════════════════════════════════",
            "",
            `Organização: ${org.name}`,
            `Gerado em: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}`,
            "",
            "─── ESTRUTURA ───",
            `Escolas: ${schools.length}`,
            `Turmas: ${classes.length}`,
            ...schools.map((s) => {
                const cc = classes.filter((c) => c.school_id === s.id).length;
                return `  • ${s.name}${s.municipality ? ` (${s.municipality})` : ""} — ${cc} turma(s)`;
            }),
            "",
            "─── ADESÃO (agregada) ───",
            `Membros ativos: ${members.length}`,
            `  • Estudantes: ${students}`,
            `  • Educadores/Coordenadores: ${educators}`,
            `Convites pendentes: ${invitations.length}`,
            `Taxa de ativação: ${activationRate}% (${members.length}/${totalInvited} convidados aceitos)`,
            "",
            "─── PRIVACIDADE ───",
            "Este relatório contém apenas indicadores AGREGADOS.",
            "Nenhum dado pessoal, conversa com IA ou relato individual",
            "de estudante é incluído (LGPD art. 14 · proteção de menores).",
            "",
            "═══════════════════════════════════════════",
            "Relatório para devolutiva institucional.",
            "Instituto Felicidade Para Todos",
        ];
        const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `relatorio_piloto_${(org.slug || "organizacao")}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Relatório baixado! 📄", description: "Indicadores agregados, sem dados pessoais." });
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

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!org) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container max-w-2xl pt-24 pb-16 text-center">
                    <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h1 className="text-2xl font-display font-bold mb-2">Nenhuma organização encontrada</h1>
                    <p className="text-muted-foreground mb-6">
                        Você ainda não faz parte de uma organização. Se é gestor escolar, entre em contato para configurar seu piloto.
                    </p>
                    <button onClick={() => navigate("/dashboard")} className="px-5 py-3 rounded-xl bg-muted text-sm font-semibold">
                        Voltar ao Dashboard
                    </button>
                </div>
                <Footer />
            </div>
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
            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />
                <div className="flex-1 container pt-24 pb-16 max-w-5xl flex items-center justify-center">
                    <OnboardingWizard
                        organizationId={org.id}
                        orgName={org.name}
                        onComplete={() => { setWizardDismissed(true); refetch(); }}
                    />
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <div className="flex-1 container pt-24 pb-16 max-w-5xl">
                <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
                </button>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl gradient-institute flex items-center justify-center">
                                <Building2 className="w-7 h-7 text-primary-foreground" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-display font-bold">{org.name}</h1>
                                <p className="text-sm text-muted-foreground">Painel institucional</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleDownloadReport}
                                className="px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-semibold transition-all flex items-center gap-2"
                                title="Baixar relatório do piloto (dados agregados)"
                            >
                                <Download className="w-4 h-4" /> Relatório
                            </button>
                            <button
                                onClick={() => setShowInvite(!showInvite)}
                                className="px-4 py-2.5 rounded-xl gradient-institute text-primary-foreground text-sm font-bold shadow-warm hover:shadow-glow transition-all flex items-center gap-2"
                            >
                                <UserPlus className="w-4 h-4" /> Convidar
                            </button>
                        </div>
                    </div>

                    {/* Invite form */}
                    {showInvite && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mb-6 p-5 rounded-2xl glass-card border border-primary/20"
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
                                    className="px-5 py-2.5 rounded-xl gradient-institute text-primary-foreground text-sm font-bold disabled:opacity-50"
                                >
                                    {inviting ? "Enviando..." : "Enviar"}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { icon: School, label: "Escolas", value: schools.length, color: "text-primary" },
                            { icon: Users, label: "Membros", value: members.length, color: "text-secondary" },
                            { icon: Mail, label: "Convites pendentes", value: invitations.length, color: "text-accent" },
                            { icon: Building2, label: "Turmas", value: classes.length, color: "text-emerald-500" },
                        ].map((s) => (
                            <div key={s.label} className="p-4 rounded-2xl glass-card">
                                <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                                <div className="text-2xl font-display font-bold">{s.value}</div>
                                <div className="text-xs text-muted-foreground">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Aggregated metrics — role distribution + activation rate */}
                    {members.length > 0 && (
                        <section className="mb-8">
                            <h2 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-primary" /> Indicadores agregados
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {/* Role distribution */}
                                <div className="p-5 rounded-2xl glass-card">
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
                                                        <div className="h-full rounded-full gradient-institute" style={{ width: `${(count / members.length) * 100}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold w-6 text-right">{count}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Activation rate */}
                                <div className="p-5 rounded-2xl glass-card">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Taxa de ativação</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm">Convites aceitos</span>
                                                <span className="text-xs font-bold text-success">{members.length} de {members.length + invitations.length}</span>
                                            </div>
                                            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                                                <div className="h-full rounded-full bg-success" style={{ width: `${members.length + invitations.length > 0 ? (members.length / (members.length + invitations.length)) * 100 : 0}%` }} />
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
                            <h2 className="text-lg font-display font-bold flex items-center gap-2">
                                <School className="w-5 h-5 text-primary" /> Escolas
                            </h2>
                            <button onClick={() => setShowAddSchool(!showAddSchool)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                                <Plus className="w-3.5 h-3.5" /> Adicionar escola
                            </button>
                        </div>
                        {showAddSchool && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-4 p-4 rounded-2xl glass-card border border-primary/20">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Nome da escola" className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                    <input value={schoolMunicipality} onChange={(e) => setSchoolMunicipality(e.target.value)} placeholder="Município (opcional)" className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-48" />
                                    <button onClick={handleAddSchool} disabled={addingSchool || !schoolName.trim()} className="px-5 py-2.5 rounded-xl gradient-institute text-primary-foreground text-sm font-bold disabled:opacity-50">{addingSchool ? "Criando..." : "Criar"}</button>
                                </div>
                            </motion.div>
                        )}
                        {schools.length === 0 ? (
                            <p className="text-sm text-muted-foreground p-4 rounded-xl bg-muted/30">
                                Nenhuma escola cadastrada ainda. Clique em "Adicionar escola" acima.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {schools.map((s) => {
                                    const schoolClasses = classes.filter(c => c.school_id === s.id);
                                    return (
                                        <div key={s.id} className="p-4 rounded-2xl glass-card">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-bold text-sm">{s.name}</h3>
                                                    {s.municipality && <p className="text-xs text-muted-foreground">{s.municipality}{s.state_code ? ` — ${s.state_code}` : ""}</p>}
                                                </div>
                                                <button onClick={() => setAddingClassForSchool(addingClassForSchool === s.id ? null : s.id)} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                                                    <Plus className="w-3 h-3" /> Turma
                                                </button>
                                            </div>
                                            {addingClassForSchool === s.id && (
                                                <div className="mt-3 flex gap-2">
                                                    <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Nome da turma (ex: 9ºA)" className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                                    <button onClick={() => handleAddClass(s.id)} disabled={addingClass || !className.trim()} className="px-4 py-2 rounded-lg gradient-institute text-primary-foreground text-xs font-bold disabled:opacity-50">{addingClass ? "..." : "Criar"}</button>
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
                        <h2 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
                            <Users className="w-5 h-5 text-secondary" /> Membros ativos
                        </h2>
                        {members.length === 0 ? (
                            <p className="text-sm text-muted-foreground p-4 rounded-xl bg-muted/30">Nenhum membro além de você.</p>
                        ) : (
                            <div className="space-y-2">
                                {members.map((m) => (
                                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl glass-card">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                {m.role.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{m.user_id.slice(0, 8)}...</p>
                                                <p className="text-[11px] text-muted-foreground">{roleLabel[m.role] || m.role}</p>
                                            </div>
                                        </div>
                                        <CheckCircle2 className="w-4 h-4 text-success" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Pending invitations */}
                    {invitations.length > 0 && (
                        <section>
                            <h2 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
                                <Mail className="w-5 h-5 text-accent" /> Convites pendentes
                            </h2>
                            <div className="space-y-2">
                                {invitations.map((inv) => (
                                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl glass-card">
                                        <div>
                                            <p className="text-sm font-medium">{inv.invited_email}</p>
                                            <p className="text-[11px] text-muted-foreground">{roleLabel[inv.role] || inv.role}</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            Expira {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Engagement Metrics — ONDA 6 */}
                    <EngagementMetrics organizationId={org.id} />

                    {/* Operational Metrics — ONDA 5 */}
                    <OperationalMetrics organizationId={org.id} />

                    {error && (
                        <p className="mt-4 text-sm text-destructive">{error}</p>
                    )}
                </motion.div>
            </div>
            <Footer />
        </div>
    );
}
