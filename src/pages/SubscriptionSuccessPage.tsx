import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const MAX_POLLS = 6;
const POLL_INTERVAL_MS = 2500;

// Página de retorno de sucesso do Mercado Pago.
// IMPORTANTE (Requirement 5.1): NUNCA afirma "assinatura ativada" só com base
// no redirecionamento/URL. A confirmação real vem do webhook, que pode chegar
// alguns segundos depois — então aqui checamos get_my_plan (via useSubscription)
// com um poll curto e mostramos "processando" enquanto o plano não reflete.
export default function SubscriptionSuccessPage() {
    const navigate = useNavigate();
    const { isPremium, refetch } = useSubscription();
    const [pollsDone, setPollsDone] = useState(0);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (isPremium) {
            if (timerRef.current) window.clearTimeout(timerRef.current);
            return;
        }
        if (pollsDone >= MAX_POLLS) return;

        timerRef.current = window.setTimeout(async () => {
            await refetch();
            setPollsDone((n) => n + 1);
        }, POLL_INTERVAL_MS);

        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        };
    }, [isPremium, pollsDone, refetch]);

    const stillProcessing = !isPremium && pollsDone < MAX_POLLS;
    const confirmed = isPremium;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container max-w-2xl pt-28 pb-16 px-4">
                <motion.div
                    className="rounded-3xl border border-border p-8 md:p-12 text-center relative overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-success/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                            {confirmed ? (
                                <CheckCircle2 className="w-8 h-8 text-success" />
                            ) : (
                                <Loader2 className="w-8 h-8 text-success animate-spin" />
                            )}
                        </div>

                        {confirmed ? (
                            <>
                                <h1 className="text-2xl md:text-3xl font-display font-bold mb-3">Assinatura ativada! 🎉</h1>
                                <p className="text-muted-foreground mb-8">
                                    Seu plano já está ativo e os recursos premium foram desbloqueados. Bons estudos!
                                </p>
                            </>
                        ) : (
                            <>
                                <h1 className="text-2xl md:text-3xl font-display font-bold mb-3">Pagamento recebido</h1>
                                <p className="text-muted-foreground mb-2">
                                    Obrigado! Estamos confirmando seu pagamento com o Mercado Pago.
                                </p>
                                <p className="text-sm text-muted-foreground mb-8">
                                    {stillProcessing
                                        ? "Isso costuma levar alguns segundos — seu plano será refletido automaticamente aqui."
                                        : "A confirmação pode levar um pouco mais que o esperado. Assim que o pagamento for aprovado, seu plano será atualizado. Você já pode seguir para o painel."}
                                </p>
                            </>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => navigate("/dashboard")}
                                className="py-3 px-6 rounded-2xl gradient-institute text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-warm hover:shadow-glow transition-all"
                            >
                                Ir para o Dashboard <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => navigate("/subscription")}
                                className="py-3 px-6 rounded-2xl bg-muted hover:bg-muted/80 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <Sparkles className="w-4 h-4" /> Ver minha assinatura
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
            <Footer />
        </div>
    );
}
