import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, XCircle, ArrowRight, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoIcon from "@/assets/logo-icon.png";

/**
 * ONDA 4 — Student/educator onboarding: accept invitation page.
 * URL: /aceitar-convite?token=<uuid>
 * Flow: validates token via accept_invitation RPC → shows success → redirects to dashboard.
 * Requires authenticated user with confirmed email matching the invitation.
 */
export default function AcceptInvitePage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const token = params.get("token");

    const [status, setStatus] = useState<"loading" | "success" | "error" | "no_token">(token ? "loading" : "no_token");
    const [errorMsg, setErrorMsg] = useState("");
    const [result, setResult] = useState<{ organization_id: string; role: string } | null>(null);

    useEffect(() => {
        if (!token) return;

        async function accept() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // Redirect to auth with return URL
                navigate(`/auth?redirect=${encodeURIComponent(`/aceitar-convite?token=${token}`)}`);
                return;
            }

            const { data, error } = await supabase.rpc("accept_invitation", { _token: token });
            if (error) {
                setStatus("error");
                setErrorMsg(error.message || "Não foi possível aceitar o convite.");
                return;
            }

            setResult(data as { organization_id: string; role: string });
            setStatus("success");
        }

        accept();
    }, [token, navigate]);

    const roleLabel: Record<string, string> = {
        org_admin: "Gestor",
        school_admin: "Coordenador(a)",
        educator: "Educador(a)",
        student: "Estudante",
        guardian: "Responsável",
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full p-8 rounded-3xl glass-card border border-border shadow-float text-center"
            >
                <img src={logoIcon} alt="Instituto" className="w-12 h-12 rounded-xl mx-auto mb-4" />

                {status === "loading" && (
                    <>
                        <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
                        <h1 className="font-display font-bold text-xl mb-2">Aceitando convite...</h1>
                        <p className="text-sm text-muted-foreground">Validando seu acesso à organização.</p>
                    </>
                )}

                {status === "success" && result && (
                    <>
                        <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
                        <h1 className="font-display font-bold text-xl mb-2">Convite aceito! 🎉</h1>
                        <p className="text-sm text-muted-foreground mb-6">
                            Você agora é <strong>{roleLabel[result.role] || result.role}</strong> na organização.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => navigate("/dashboard")}
                                className="w-full py-3.5 rounded-2xl gradient-institute text-primary-foreground font-bold text-sm shadow-warm hover:shadow-glow transition-all flex items-center justify-center gap-2"
                            >
                                Começar minha jornada <ArrowRight className="w-4 h-4" />
                            </button>
                            {(result.role === "org_admin" || result.role === "school_admin" || result.role === "educator") && (
                                <button
                                    onClick={() => navigate("/org")}
                                    className="w-full py-3 rounded-2xl bg-muted text-sm font-semibold flex items-center justify-center gap-2"
                                >
                                    <Building2 className="w-4 h-4" /> Ver painel institucional
                                </button>
                            )}
                        </div>
                    </>
                )}

                {status === "error" && (
                    <>
                        <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                        <h1 className="font-display font-bold text-xl mb-2">Não foi possível aceitar</h1>
                        <p className="text-sm text-muted-foreground mb-6">{errorMsg}</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => navigate("/auth")} className="w-full py-3 rounded-2xl gradient-institute text-primary-foreground font-bold text-sm">
                                Fazer login com outro e-mail
                            </button>
                            <button onClick={() => navigate("/")} className="w-full py-3 rounded-2xl bg-muted text-sm font-semibold">
                                Voltar ao início
                            </button>
                        </div>
                    </>
                )}

                {status === "no_token" && (
                    <>
                        <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h1 className="font-display font-bold text-xl mb-2">Link inválido</h1>
                        <p className="text-sm text-muted-foreground mb-6">Este link de convite está incompleto ou foi digitado incorretamente.</p>
                        <button onClick={() => navigate("/")} className="w-full py-3 rounded-2xl bg-muted text-sm font-semibold">
                            Voltar ao início
                        </button>
                    </>
                )}
            </motion.div>
        </div>
    );
}
