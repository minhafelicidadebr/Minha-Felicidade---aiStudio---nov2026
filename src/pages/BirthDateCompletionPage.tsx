import { useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSafeRedirectPath } from "@/lib/redirect";
import { isValidPastDate } from "@/lib/guardian-consent";

/**
 * Alcançada quando o gate de consentimento identifica uma conta sem data de
 * nascimento (`needs_birth_date`). Pede a data uma única vez para estabelecer
 * a idade e, ao gravá-la (RPC self-scoped `set_my_birth_date`), devolve o
 * usuário à rota de origem — onde o próprio RequireGuardianConsent reavalia:
 * adulto → acesso liberado; menor → consentimento do responsável.
 *
 * Fica atrás de RequireAuth e FORA de RequireGuardianConsent (evita loop).
 */
export default function BirthDateCompletionPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const redirectPath = getSafeRedirectPath(searchParams.get("redirect"));

    const [birthDate, setBirthDate] = useState("");
    const [loading, setLoading] = useState(false);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const today = new Date().toISOString().split("T")[0];

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValidPastDate(birthDate)) {
            toast({ title: "Data de nascimento inválida", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.rpc("set_my_birth_date", { _birth_date: birthDate });
            if (error) throw error;
            navigate(redirectPath, { replace: true });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erro desconhecido";
            toast({ title: "Não foi possível salvar", description: message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
                <div className="bg-card rounded-3xl border border-border p-8 shadow-warm">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <CalendarCheck className="w-5 h-5" />
                        <h1 ref={headingRef} tabIndex={-1} className="font-display font-bold text-lg outline-none">
                            Confirme sua data de nascimento
                        </h1>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 mb-6">
                        Precisamos da sua data de nascimento para saber se é necessária a
                        autorização de um responsável (LGPD, art. 14). Sua conta foi criada
                        antes de pedirmos essa informação — por isso o acesso ficou pausado
                        até você confirmá-la.
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="birth-date" className="text-sm font-medium text-foreground mb-1.5 block">
                                Data de nascimento
                            </label>
                            <input
                                id="birth-date"
                                type="date"
                                value={birthDate}
                                max={today}
                                onChange={(e) => setBirthDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl gradient-institute text-primary-foreground font-semibold text-sm shadow-warm hover:shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            ) : (
                                "Continuar"
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
