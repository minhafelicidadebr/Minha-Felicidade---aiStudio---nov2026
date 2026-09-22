import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, School, Users, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { institutionalQueryKeys } from "@/lib/institutional-query-keys";

interface OnboardingWizardProps {
    organizationId: string;
    orgName: string;
    onComplete: () => void;
}

type Step = "school" | "class" | "invite" | "done";

/**
 * ONDA 4 — Onboarding wizard for first-time org_admin.
 * Guides: create school → create class → invite first member.
 * Appears when the org has zero schools (first access).
 */
export default function OnboardingWizard({ organizationId, orgName, onComplete }: OnboardingWizardProps) {
    const { toast } = useToast();
    const { userId, activeOrganization } = useDashboardContext();
    const queryClient = useQueryClient();
    const [step, setStep] = useState<Step>("school");
    const [schoolName, setSchoolName] = useState("");
    const [municipality, setMunicipality] = useState("");
    const [schoolId, setSchoolId] = useState<string | null>(null);
    const [className, setClassName] = useState("");
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("educator");
    const [loading, setLoading] = useState(false);

    const isCurrentOrganization = activeOrganization?.id === organizationId;
    const invalidateOrganization = useCallback(
        () => queryClient.invalidateQueries({
            queryKey: institutionalQueryKeys.organization(userId, organizationId),
        }),
        [organizationId, queryClient, userId],
    );

    const handleCreateSchool = async () => {
        if (!isCurrentOrganization || !schoolName.trim()) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.from("schools").insert({
                organization_id: organizationId,
                name: schoolName.trim(),
                municipality: municipality.trim() || null,
            }).select("id").single();
            if (error) throw error;
            await invalidateOrganization();
            setSchoolId(data.id);
            setStep("class");
            toast({ title: "Escola criada! 🏫" });
        } catch (e) {
            toast({ title: "Erro", description: e instanceof Error ? e.message : "Tente novamente.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClass = async () => {
        if (!isCurrentOrganization || !className.trim() || !schoolId) return;
        setLoading(true);
        try {
            const { error } = await supabase.from("classes").insert({
                school_id: schoolId,
                name: className.trim(),
                year: new Date().getFullYear(),
            });
            if (error) throw error;
            await invalidateOrganization();
            setStep("invite");
            toast({ title: "Turma criada! 📚" });
        } catch (e) {
            toast({ title: "Erro", description: e instanceof Error ? e.message : "Tente novamente.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async () => {
        if (!isCurrentOrganization) return;
        if (!inviteEmail.trim()) { setStep("done"); return; }
        setLoading(true);
        try {
            const { error } = await supabase.rpc("invite_member", {
                _organization_id: organizationId,
                _invited_email: inviteEmail.trim(),
                _role: inviteRole,
            });
            if (error) throw error;
            await invalidateOrganization();
            toast({
                title: "Convite criado! ✉️",
                description: "O envio por e-mail foi colocado na fila. A entrega depende do serviço de notificações.",
            });
            setStep("done");
        } catch (e) {
            toast({ title: "Erro ao convidar", description: e instanceof Error ? e.message : "Tente novamente.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const steps: { key: Step; label: string; icon: typeof Building2 }[] = [
        { key: "school", label: "Escola", icon: School },
        { key: "class", label: "Turma", icon: Building2 },
        { key: "invite", label: "Convite", icon: Users },
        { key: "done", label: "Pronto", icon: CheckCircle2 },
    ];
    const currentIdx = steps.findIndex(s => s.key === step);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto p-8 rounded-3xl glass-card border border-primary/20 shadow-float"
        >
            {/* Progress */}
            <div className="flex items-center justify-between mb-8">
                {steps.map((s, i) => (
                    <div key={s.key} className="flex items-center gap-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= currentIdx ? "gradient-institute text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}>
                            {i < currentIdx ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`w-8 h-0.5 ${i < currentIdx ? "bg-primary" : "bg-muted"}`} />
                        )}
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {step === "school" && (
                    <motion.div key="school" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <div className="text-center mb-6">
                            <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
                            <h2 className="font-display font-bold text-xl mb-1">Bem-vindo(a), gestor!</h2>
                            <p className="text-sm text-muted-foreground">
                                Vamos configurar <strong>{orgName}</strong> em 3 passos rápidos.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nome da escola *</label>
                                <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Ex: EMEF Esperança" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" autoFocus />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Município (opcional)</label>
                                <input value={municipality} onChange={(e) => setMunicipality(e.target.value)} placeholder="Ex: São Paulo - SP" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                            </div>
                            <button onClick={handleCreateSchool} disabled={loading || !schoolName.trim()} className="w-full py-3.5 rounded-2xl gradient-institute text-primary-foreground font-bold text-sm shadow-warm hover:shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {loading ? "Criando..." : <>Criar escola <ArrowRight className="w-4 h-4" /></>}
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === "class" && (
                    <motion.div key="class" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <div className="text-center mb-6">
                            <School className="w-10 h-10 text-primary mx-auto mb-3" />
                            <h2 className="font-display font-bold text-xl mb-1">Agora crie a primeira turma</h2>
                            <p className="text-sm text-muted-foreground">Escola: <strong>{schoolName}</strong></p>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nome da turma *</label>
                                <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Ex: 9º Ano A" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" autoFocus />
                            </div>
                            <button onClick={handleCreateClass} disabled={loading || !className.trim()} className="w-full py-3.5 rounded-2xl gradient-institute text-primary-foreground font-bold text-sm shadow-warm hover:shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {loading ? "Criando..." : <>Criar turma <ArrowRight className="w-4 h-4" /></>}
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === "invite" && (
                    <motion.div key="invite" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <div className="text-center mb-6">
                            <Users className="w-10 h-10 text-primary mx-auto mb-3" />
                            <h2 className="font-display font-bold text-xl mb-1">Convide alguém da equipe</h2>
                            <p className="text-sm text-muted-foreground">Opcional — você pode fazer isso depois também.</p>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">E-mail</label>
                                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colega@escola.edu.br" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" autoFocus />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Papel</label>
                                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                                    <option value="educator">Educador(a)</option>
                                    <option value="school_admin">Coordenador(a)</option>
                                    <option value="student">Estudante</option>
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setStep("done")} className="flex-1 py-3.5 rounded-2xl bg-muted text-sm font-semibold">Pular</button>
                                <button onClick={handleInvite} disabled={loading} className="flex-1 py-3.5 rounded-2xl gradient-institute text-primary-foreground font-bold text-sm shadow-warm hover:shadow-glow transition-all disabled:opacity-50">
                                    {loading ? "..." : "Convidar"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === "done" && (
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <div className="text-center">
                            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
                            <h2 className="font-display font-bold text-xl mb-2">Tudo pronto! 🎉</h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Sua organização está configurada. Agora você pode acompanhar a jornada dos seus alunos pelo painel institucional.
                            </p>
                            <button onClick={onComplete} className="px-8 py-3.5 rounded-2xl gradient-institute text-primary-foreground font-bold text-sm shadow-warm hover:shadow-glow transition-all">
                                Abrir painel
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
