import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, ArrowRight, RefreshCw } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const MAX_POLLS = 4;
const POLL_INTERVAL_MS = 3000;

// Página de retorno para pagamentos pendentes OU recusados (cobre back_urls
// "pending" e "failure" do Mercado Pago). Nunca afirma ativação pela URL
// (Requirement 5.1): o plano só reflete quando o webhook confirmar a aprovação.
export default function SubscriptionPendingPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isPremium, refetch } = useSubscription();
    const [pollsDone, setPollsDone] = useState(0);
    const timerRef = useRef<number | null>(null);

    // O status vem da URL apenas para adaptar a mensagem — jamais para afirmar
    // ativação. "rejected"/"failure" = recusado; caso contrário, pendente.
    const rawStatus = (searchParams.get("status") ?? "").toLowerCase();
    const isRejected = rawStatus === "rejected" || rawStatus === "failure";

    useEffect(() => {
        if (isPremium || isRejected || pollsDone >= MAX_POLLS) {
            if (timerRef.current) window.clearTimeout(timerRef.current);
            return;
        }
        timerRef.current = window.setTimeout(async () => {
            await refetch();
            setPollsDone((n) => n + 1);
        }, POLL_INTERVAL_MS);
        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        };
    }, [isPremium, isRejected, pollsDone, refetch]);

    const confirmed = isPremium;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container max-w-2xl pt-28 pb-16 px-4">
                <motion.div
                    className="rounded-3xl border border-border p-8 md:p-12 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${confirmed ? "bg-success/10" : "bg-muted"
                            }`}
                    >
                        {confirmed ? (
                            <CheckCircle2 className="w-8 h-8 text-success" />
                        ) : (
                            <Clock className="w-8 h-8 text-muted-foreground" />
                        )}
                    </div>

                    {confirmed ? (
                        <>
                            <h1 className="text-2xl md:text-3xl font-display font-bold mb-3">Assinatura ativada! 🎉</h1>
                            <p className="text-muted-foreground mb-8">
                                Seu pagamento foi confirmado e o plano já está ativo.
                            </p>
                        </>
                    ) : isRejected ? (
                        <>
                            <h1 className="text-2xl md:text-3xl font-display font-bold mb-3">Pagamento não concluído</h1>
                            <p className="text-muted-foreground mb-8">
                                O pagamento não foi aprovado. Nenhuma cobrança foi feita e seu plano atual segue inalterado.
                                Você pode tentar novamente quando quiser.
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-2xl md:text-3xl font-display font-bold mb-3">Pagamento em processamento</h1>
                            <p className="text-muted-foreground mb-2">
                                Seu pagamento está sendo processado pelo Mercado Pago. Alguns métodos (como boleto ou Pix)
                                podem levar mais tempo para confirmar.
                            </p>
                            <p className="text-sm text-muted-foreground mb-8">
                                Assim que for aprovado, seu plano será ativado automaticamente. Você não precisa fazer nada.
                            </p>
                        </>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => navigate("/subscription")}
                            className="py-3 px-6 rounded-2xl gradient-institute text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-warm hover:shadow-glow transition-all"
                        >
                            {isRejected ? "Tentar novamente" : "Ver minha assinatura"} <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="py-3 px-6 rounded-2xl bg-muted hover:bg-muted/80 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" /> Ir para o Dashboard
                        </button>
                    </div>
                </motion.div>
            </div>
            <Footer />
        </div>
    );
}
