import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle2, Clock } from "lucide-react";

const DAILY_CHALLENGES = [
    { action: "Agradeça 3 coisas específicas de hoje", science: "Gratidão: Davis et al. (2016)", category: "Gratidão", duration: "2 min" },
    { action: "Mande uma mensagem gentil para alguém", science: "Atos de bondade: Dunn et al. (2008)", category: "Conexão", duration: "1 min" },
    { action: "Respire fundo 4-7-8 por 1 minuto", science: "Regulação vagal: Gerritsen & Band (2018)", category: "Presença", duration: "1 min" },
    { action: "Note 3 sensações corporais agora", science: "Mindfulness: Killingsworth & Gilbert (2010)", category: "Presença", duration: "1 min" },
    { action: "Faça algo gentil para seu eu de amanhã", science: "Future self-continuity: Hershfield (2011)", category: "Propósito", duration: "3 min" },
    { action: "Encontre flow: 15 min em algo que absorve você", science: "Flow: Csikszentmihalyi (1990)", category: "Flow", duration: "15 min" },
    { action: "Escreva uma coisa boa que aconteceu esta semana", science: "Savoring: Bryant & Veroff (2007)", category: "Savoring", duration: "2 min" },
    { action: "Convide alguém para uma caminhada de 10 min", science: "Conexão social: Diener & Seligman (2002)", category: "Conexão", duration: "10 min" },
    { action: "Imagine seu eu de 1 ano fazendo algo que admira", science: "Mental contrasting: Oettingen (2014)", category: "Propósito", duration: "2 min" },
    { action: "Defina uma intention: 'Se X, então Y' para amanhã", science: "Implementation intentions: Gollwitzer (1999)", category: "Hábito", duration: "2 min" },
    { action: "Desligue notificações por 1 hora", science: "Time affluence: Whillans et al. (2017)", category: "Presença", duration: "1h passiva" },
    { action: "Pense num obstáculo atual e uma ação 'se-então'", science: "WOOP: Oettingen (2014)", category: "Hábito", duration: "3 min" },
    { action: "Elogie uma qualidade específica de alguém", science: "Character strengths: Peterson & Seligman (2004)", category: "Conexão", duration: "1 min" },
    { action: "Escreva uma emoção que sentiu hoje sem julgá-la", science: "Labeling emocional: Lieberman et al. (2007)", category: "Autoconsciência", duration: "1 min" },
];

/**
 * Daily challenge card — one micro-action per day, science-backed.
 * Reinforces daily return habit. Uses day-of-year as stable index.
 */
export default function DailyChallenge() {
    const [completed, setCompleted] = useState(() => {
        const key = `daily_challenge_${new Date().toISOString().split("T")[0]}`;
        return localStorage.getItem(key) === "done";
    });

    const today = Math.floor(Date.now() / 86400000);
    const challenge = DAILY_CHALLENGES[today % DAILY_CHALLENGES.length];

    const markDone = () => {
        const key = `daily_challenge_${new Date().toISOString().split("T")[0]}`;
        localStorage.setItem(key, "done");
        setCompleted(true);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-2xl border transition-all ${completed
                ? "glass-card border-emerald-500/30 bg-emerald-500/5"
                : "glass-card border-primary/20"
                }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-primary uppercase tracking-wider">Microação do dia</span>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                            <Clock className="w-3 h-3" /> {challenge.duration}
                        </span>
                    </div>
                    <p className={`font-display font-bold text-sm ${completed ? "line-through text-muted-foreground" : ""}`}>
                        {challenge.action}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                        📚 {challenge.science}
                    </p>
                </div>
                {completed ? (
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                ) : (
                    <button
                        onClick={markDone}
                        className="shrink-0 px-3 py-2 rounded-xl gradient-institute text-primary-foreground text-xs font-bold shadow-warm hover:shadow-glow transition-all"
                    >
                        Feito ✓
                    </button>
                )}
            </div>
        </motion.div>
    );
}
