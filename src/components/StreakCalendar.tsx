import { useMemo } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface Props {
    /** Dates of activity as ISO strings (e.g. "2026-07-25T...") */
    activityDates: string[];
    currentStreak: number;
}

const MOTIVATIONAL = [
    "Sua mente agradece cada dia que você volta. 🧠",
    "Consistência transforma mais que intensidade.",
    "Pequenos passos, grandes mudanças. 🌱",
    "Hoje é um bom dia para florescer.",
    "Quem planta presença, colhe bem-estar. 🌻",
    "Cada dia conta. Você já está aqui. ✨",
    "A ciência da felicidade é feita de hábitos, não de momentos.",
];

/**
 * Visual streak calendar — shows last 28 days with heat-map style coloring.
 * Reinforces habit formation (Lally et al., 2010: avg 66 days to form a habit).
 */
export default function StreakCalendar({ activityDates, currentStreak }: Props) {
    const days = useMemo(() => {
        const result = [];
        const activeDaysSet = new Set(activityDates.map(d => d.split("T")[0]));
        for (let i = 27; i >= 0; i--) {
            const date = new Date(Date.now() - i * 86400000);
            const key = date.toISOString().split("T")[0];
            result.push({
                key,
                label: date.toLocaleDateString("pt-BR", { day: "numeric" }),
                weekday: date.toLocaleDateString("pt-BR", { weekday: "narrow" }),
                active: activeDaysSet.has(key),
                isToday: i === 0,
            });
        }
        return result;
    }, [activityDates]);

    const motivation = MOTIVATIONAL[currentStreak % MOTIVATIONAL.length];

    const streakEmoji = currentStreak >= 21 ? "🏆" : currentStreak >= 7 ? "🔥" : currentStreak >= 3 ? "✨" : "🌱";
    const streakLabel = currentStreak >= 21 ? "Hábito formado!" : currentStreak >= 7 ? "Semana completa!" : currentStreak >= 3 ? "Construindo ritmo" : "Primeiros passos";

    return (
        <div className="p-5 rounded-2xl glass-card">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-sm flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" /> Sequência de prática
                </h3>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                    <span className="text-sm">{streakEmoji}</span>
                    <span className="text-xs font-bold text-orange-400">{currentStreak} dias</span>
                </div>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1.5 mb-3">
                {days.map((d, i) => (
                    <motion.div
                        key={d.key}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.015 }}
                        className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-medium relative
                            ${d.active
                                ? "bg-primary/20 text-primary border border-primary/30"
                                : "bg-muted/30 text-muted-foreground border border-transparent"
                            }
                            ${d.isToday ? "ring-2 ring-primary/50 ring-offset-1 ring-offset-background" : ""}
                        `}
                        title={`${d.key}${d.active ? " — ativo" : ""}`}
                    >
                        {d.label}
                        {d.active && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Streak label + motivation */}
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{streakLabel}</span>
                <span className="text-[11px] text-muted-foreground italic">{motivation}</span>
            </div>
        </div>
    );
}
