import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NpsSurveyProps {
    context?: "general" | "module_complete" | "week_end" | "pilot_end";
    onDismiss: () => void;
}

/**
 * Micro-survey NPS in-app.
 * Aparece após um evento significativo (fim de módulo, semana, etc.).
 * Armazena no ledger nps_responses (INSERT-only, sem PII exposta ao admin).
 */
export default function NpsSurvey({ context = "general", onDismiss }: NpsSurveyProps) {
    const [score, setScore] = useState<number | null>(null);
    const [feedback, setFeedback] = useState("");
    const [step, setStep] = useState<"score" | "feedback" | "done">("score");
    const [submitting, setSubmitting] = useState(false);
    const { toast } = useToast();

    const handleScoreSelect = (s: number) => {
        setScore(s);
        setStep("feedback");
    };

    const handleSubmit = async () => {
        if (score === null) return;
        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Não autenticado");

            // TRUST-1.4 (R11): grava via RPC `submit_nps_response`, não via
            // INSERT direto — a RPC resolve auth.uid() no servidor e não
            // aceita organization_id (este componente não declara tenant).
            const { error } = await supabase.rpc("submit_nps_response", {
                _score: score,
                _feedback: feedback.trim() || undefined,
                _context: context,
            });
            if (error) throw error;
            setStep("done");
            toast({ title: "Obrigado! 💛", description: "Sua opinião nos ajuda a melhorar." });
            setTimeout(onDismiss, 2000);
        } catch {
            toast({ title: "Erro ao enviar", description: "Tente novamente.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const getScoreColor = (s: number) => {
        if (s <= 6) return "bg-red-500/20 text-red-400 border-red-500/30";
        if (s <= 8) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    };

    const getScoreEmoji = (s: number) => {
        if (s <= 3) return "😔";
        if (s <= 6) return "😐";
        if (s <= 8) return "🙂";
        return "🤩";
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                className="fixed bottom-6 right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl glass-card border border-primary/20 shadow-xl p-5"
            >
                <button
                    onClick={onDismiss}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Fechar pesquisa"
                >
                    <X className="w-4 h-4" />
                </button>

                {step === "score" && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Star className="w-4 h-4 text-primary" />
                            <h3 className="text-sm font-display font-bold">Como está sua experiência?</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">
                            De 0 a 10, o quanto recomendaria esta plataforma a um(a) amigo(a)?
                        </p>
                        <div className="grid grid-cols-11 gap-1">
                            {Array.from({ length: 11 }, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleScoreSelect(i)}
                                    className={`w-full aspect-square rounded-lg border text-xs font-bold transition-all hover:scale-110 ${getScoreColor(i)}`}
                                >
                                    {i}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-between mt-1.5">
                            <span className="text-[10px] text-muted-foreground">Nada provável</span>
                            <span className="text-[10px] text-muted-foreground">Muito provável</span>
                        </div>
                    </div>
                )}

                {step === "feedback" && score !== null && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">{getScoreEmoji(score)}</span>
                            <h3 className="text-sm font-display font-bold">
                                Nota {score}/10
                            </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                            {score <= 6
                                ? "O que podemos melhorar?"
                                : score <= 8
                                    ? "O que falta para ser nota 10?"
                                    : "O que mais te marcou?"}
                        </p>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Opcional — escreva o que quiser..."
                            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-20"
                            maxLength={500}
                        />
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex-1 px-4 py-2.5 rounded-xl gradient-institute text-primary-foreground text-sm font-bold disabled:opacity-50"
                            >
                                {submitting ? "Enviando..." : "Enviar"}
                            </button>
                            <button
                                onClick={() => { setFeedback(""); handleSubmit(); }}
                                disabled={submitting}
                                className="px-4 py-2.5 rounded-xl bg-muted text-sm font-medium"
                            >
                                Pular
                            </button>
                        </div>
                    </div>
                )}

                {step === "done" && (
                    <div className="text-center py-4">
                        <span className="text-3xl mb-2 block">💛</span>
                        <p className="text-sm font-display font-bold">Obrigado!</p>
                        <p className="text-xs text-muted-foreground mt-1">Sua voz ajuda a construir algo melhor.</p>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
