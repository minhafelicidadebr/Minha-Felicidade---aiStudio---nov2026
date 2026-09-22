import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getConsentStatementText } from "@/lib/guardian-consent";
import logoIcon from "@/assets/logo-icon.png";

interface ResolvedToken {
    guardian_name: string;
    student_first_name: string;
    policy_version: string;
    statement_sha256: string;
    expires_at: string;
}

type PageState = "loading" | "invalid" | "ready" | "granted" | "declined" | "deciding";

/**
 * TRUST-1.6 (R06) — página vista pelo RESPONSÁVEL, alcançada pelo link do
 * e-mail (?token=...). Nunca exige conta: o token é a credencial. Não usa
 * <RequireAuth> nem <RequireGuardianConsent> — está fora da sessão do
 * estudante por definição.
 *
 * Não usa checkbox pré-marcada. A decisão é uma ação positiva explícita
 * (dois botões: autorizar / não autorizar), sem dark pattern de estado
 * default favorecendo uma opção.
 */
export default function GuardianDecisionPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [state, setState] = useState<PageState>(token ? "loading" : "invalid");
    const [resolved, setResolved] = useState<ResolvedToken | null>(null);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        if (!token) return;
        let active = true;
        supabase.rpc("resolve_guardian_consent_token", { _token: token }).then(({ data, error }) => {
            if (!active) return;
            if (error || !data) {
                setState("invalid");
                setErrorMsg("Este link não é mais válido. Ele pode ter expirado, já ter sido usado, ou ter sido substituído por um link mais recente.");
                return;
            }
            setResolved(data as unknown as ResolvedToken);
            setState("ready");
        });
        return () => {
            active = false;
        };
    }, [token]);

    const decide = async (decision: "granted" | "declined") => {
        if (!token) return;
        setState("deciding");
        try {
            const { error } = await supabase.rpc("decide_guardian_consent", { _token: token, _decision: decision });
            if (error) throw error;
            setState(decision === "granted" ? "granted" : "declined");
        } catch {
            setState("invalid");
            setErrorMsg("Não foi possível registrar sua decisão. O link pode ter expirado ou já ter sido usado — solicite um novo link à plataforma, se necessário.");
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full p-6 sm:p-8 rounded-3xl glass-card border border-border shadow-float"
            >
                <div className="flex flex-col items-center text-center mb-6">
                    <img src={logoIcon} alt="Instituto Felicidade Para Todos" className="w-12 h-12 rounded-xl mb-3" />
                    <div className="flex items-center gap-2 text-primary">
                        <ShieldCheck className="w-5 h-5" />
                        <h1 className="font-display font-bold text-lg">Autorização de responsável</h1>
                    </div>
                </div>

                {state === "loading" && (
                    <div className="flex flex-col items-center gap-3 py-8" role="status" aria-live="polite">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Carregando o pedido de autorização...</p>
                    </div>
                )}

                {state === "invalid" && (
                    <div className="text-center py-4">
                        <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                        <p className="text-sm text-foreground font-medium mb-1">Link inválido ou expirado</p>
                        <p className="text-sm text-muted-foreground">{errorMsg}</p>
                    </div>
                )}

                {(state === "ready" || state === "deciding") && resolved && (
                    <div className="space-y-5">
                        <p className="text-sm text-foreground">
                            Olá, <strong>{resolved.guardian_name}</strong>. Você foi indicado(a) como responsável por{" "}
                            <strong>{resolved.student_first_name}</strong> na plataforma Ciência do Bem-Estar
                            (Instituto Felicidade Para Todos).
                        </p>

                        <div className="bg-muted rounded-2xl p-4 text-sm text-foreground leading-relaxed">
                            {getConsentStatementText(resolved.policy_version)}
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Versão do termo: {resolved.policy_version}. Você pode retirar esta autorização a
                            qualquer momento — basta pedir para {resolved.student_first_name} acessar as
                            configurações da conta e solicitar a revogação.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={() => decide("declined")}
                                disabled={state === "deciding"}
                                className="flex-1 py-3.5 rounded-2xl border border-input bg-background text-foreground font-semibold text-sm hover:bg-accent transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <XCircle className="w-4 h-4" /> Não autorizar
                            </button>
                            <button
                                type="button"
                                onClick={() => decide("granted")}
                                disabled={state === "deciding"}
                                className="flex-1 py-3.5 rounded-2xl gradient-institute text-primary-foreground font-bold text-sm shadow-warm hover:shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {state === "deciding" ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <><CheckCircle2 className="w-4 h-4" /> Autorizar</>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {state === "granted" && (
                    <div className="text-center py-4">
                        <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                        <p className="text-sm text-foreground font-medium mb-1">Autorização confirmada 🎉</p>
                        <p className="text-sm text-muted-foreground">
                            Obrigado. {resolved?.student_first_name ?? "O(a) estudante"} já pode acessar a
                            plataforma normalmente.
                        </p>
                    </div>
                )}

                {state === "declined" && (
                    <div className="text-center py-4">
                        <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-foreground font-medium mb-1">Decisão registrada</p>
                        <p className="text-sm text-muted-foreground">
                            Você optou por não autorizar neste momento. Isso pode ser alterado depois, se você
                            decidir enviar uma nova autorização.
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
