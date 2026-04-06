import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, Calendar } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useProgress } from "@/hooks/useProgress";

const EMOTIONS = [
  { emoji: "😊", label: "Alegria", value: 5, color: "hsl(45 100% 51%)" },
  { emoji: "😌", label: "Serenidade", value: 4, color: "hsl(197 71% 40%)" },
  { emoji: "🤔", label: "Reflexão", value: 3, color: "hsl(270 60% 55%)" },
  { emoji: "😐", label: "Neutro", value: 3, color: "hsl(220 10% 60%)" },
  { emoji: "😤", label: "Frustração", value: 2, color: "hsl(25 95% 53%)" },
  { emoji: "😢", label: "Tristeza", value: 1, color: "hsl(200 70% 50%)" },
  { emoji: "😰", label: "Ansiedade", value: 1, color: "hsl(0 84% 60%)" },
  { emoji: "🥰", label: "Gratidão", value: 5, color: "hsl(340 80% 55%)" },
];

interface EmotionEntry {
  emotion: string;
  emoji: string;
  value: number;
  note: string;
  date: string;
  time: string;
}

export default function EmotionTrackerPage() {
  const navigate = useNavigate();
  const { trackActivity } = useProgress();
  const [entries, setEntries] = useState<EmotionEntry[]>(() => {
    const s = localStorage.getItem("emotion-tracker");
    return s ? JSON.parse(s) : [];
  });
  const [selectedEmotion, setSelectedEmotion] = useState<typeof EMOTIONS[0] | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => { localStorage.setItem("emotion-tracker", JSON.stringify(entries)); }, [entries]);

  const handleSave = () => {
    if (!selectedEmotion) return;
    const entry: EmotionEntry = {
      emotion: selectedEmotion.label, emoji: selectedEmotion.emoji, value: selectedEmotion.value,
      note, date: new Date().toISOString().split("T")[0], time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
    setEntries(prev => [entry, ...prev]);
    trackActivity({ moduleId: "hacks", activityType: "emotion-tracker", activityId: `emotion-${Date.now()}`, data: { emotion: selectedEmotion.label, value: selectedEmotion.value } });
    setSelectedEmotion(null);
    setNote("");
  };

  const todayEntries = entries.filter(e => e.date === new Date().toISOString().split("T")[0]);
  const last7 = entries.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return (now.getTime() - d.getTime()) / 86400000 < 7;
  });
  const avgMood = last7.length ? (last7.reduce((a, e) => a + e.value, 0) / last7.length).toFixed(1) : "—";

  // Mini chart data
  const chartDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split("T")[0];
    const dayEntries = entries.filter(e => e.date === ds);
    const avg = dayEntries.length ? dayEntries.reduce((a, e) => a + e.value, 0) / dayEntries.length : 0;
    return { label: d.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3), avg, count: dayEntries.length };
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-2xl">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <header className="text-center mb-8">
            <span className="text-5xl mb-3 block">📊</span>
            <h1 className="text-3xl font-display font-bold mb-2">Termômetro Emocional</h1>
            <p className="text-muted-foreground">Auto-observação emocional baseada em Russell's Circumplex Model</p>
          </header>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="glass-card rounded-2xl p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
              <span className="text-2xl font-bold font-display">{avgMood}</span>
              <p className="text-xs text-muted-foreground">Média 7 dias</p>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center">
              <Calendar className="w-5 h-5 mx-auto mb-1 text-secondary" />
              <span className="text-2xl font-bold font-display">{todayEntries.length}</span>
              <p className="text-xs text-muted-foreground">Check-ins hoje</p>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center">
              <span className="text-xl block mb-1">{todayEntries[0]?.emoji || "—"}</span>
              <p className="text-xs text-muted-foreground">Última emoção</p>
            </div>
          </div>

          {/* Mini Chart */}
          <div className="glass-card rounded-2xl p-4 mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Últimos 7 dias</h3>
            <div className="flex items-end gap-2 h-24">
              {chartDays.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: day.avg ? `${(day.avg / 5) * 80}px` : "4px" }}
                    transition={{ delay: i * 0.05, type: "spring" }}
                    className={`w-full rounded-t-lg ${day.avg > 3.5 ? "bg-success/60" : day.avg > 2 ? "bg-secondary/60" : day.avg > 0 ? "bg-destructive/40" : "bg-muted"}`}
                  />
                  <span className="text-[10px] text-muted-foreground">{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Emotion Picker */}
          <div className="glass-card rounded-2xl p-5 mb-6">
            <h3 className="font-display font-bold mb-3">Como você está agora?</h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {EMOTIONS.map(em => (
                <motion.button
                  key={em.label}
                  onClick={() => setSelectedEmotion(em)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${selectedEmotion?.label === em.label ? "ring-2 ring-primary bg-primary/10" : "glass-card hover:shadow-warm"}`}
                >
                  <span className="text-2xl">{em.emoji}</span>
                  <span className="text-[10px] font-medium">{em.label}</span>
                </motion.button>
              ))}
            </div>
            {selectedEmotion && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="O que está causando essa emoção? (opcional)"
                  rows={2}
                  className="w-full p-3 rounded-xl border border-border/50 bg-background/50 text-sm resize-none mb-3"
                />
                <button onClick={handleSave} className="w-full py-3 rounded-xl gradient-institute text-primary-foreground font-bold shadow-warm hover:shadow-glow transition-shadow">
                  Registrar {selectedEmotion.emoji} +5 XP
                </button>
              </motion.div>
            )}
          </div>

          {/* History */}
          {entries.length > 0 && (
            <section>
              <h2 className="font-display font-bold text-lg mb-3">📋 Registros Recentes</h2>
              <div className="space-y-2">
                {entries.slice(0, 15).map((entry, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="glass-card rounded-xl p-3 flex items-center gap-3">
                    <span className="text-2xl">{entry.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{entry.emotion}</span>
                        <span className="text-xs text-muted-foreground">{entry.date} {entry.time}</span>
                      </div>
                      {entry.note && <p className="text-xs text-muted-foreground truncate">{entry.note}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
