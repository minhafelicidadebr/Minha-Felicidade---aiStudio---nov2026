import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, TrendingUp, Calendar, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useProgress } from "@/hooks/useProgress";

const EMOTIONS = [
  { emoji: "😊", label: "Alegria", value: 5, color: "from-yellow-400 to-amber-500" },
  { emoji: "😌", label: "Serenidade", value: 4, color: "from-blue-400 to-cyan-500" },
  { emoji: "🤔", label: "Reflexão", value: 3, color: "from-violet-400 to-purple-500" },
  { emoji: "😐", label: "Neutro", value: 3, color: "from-gray-400 to-slate-500" },
  { emoji: "😤", label: "Frustração", value: 2, color: "from-orange-400 to-red-500" },
  { emoji: "😢", label: "Tristeza", value: 1, color: "from-blue-500 to-indigo-600" },
  { emoji: "😰", label: "Ansiedade", value: 1, color: "from-red-400 to-pink-500" },
  { emoji: "🥰", label: "Gratidão", value: 5, color: "from-pink-400 to-rose-500" },
];

interface EmotionEntry { emotion: string; emoji: string; value: number; note: string; date: string; time: string; }

export default function EmotionTrackerPage() {
  const navigate = useNavigate();
  const { trackActivity } = useProgress();
  const [entries, setEntries] = useState<EmotionEntry[]>(() => {
    const s = localStorage.getItem("emotion-tracker"); return s ? JSON.parse(s) : [];
  });
  const [selectedEmotion, setSelectedEmotion] = useState<typeof EMOTIONS[0] | null>(null);
  const [note, setNote] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => { localStorage.setItem("emotion-tracker", JSON.stringify(entries)); }, [entries]);

  const handleSave = () => {
    if (!selectedEmotion) return;
    const entry: EmotionEntry = {
      emotion: selectedEmotion.label, emoji: selectedEmotion.emoji, value: selectedEmotion.value,
      note, date: new Date().toISOString().split("T")[0], time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
    setEntries(prev => [entry, ...prev]);
    trackActivity({ moduleId: "hacks", activityType: "emotion-tracker", activityId: `emotion-${Date.now()}`, data: { emotion: selectedEmotion.label, value: selectedEmotion.value } });
    setSelectedEmotion(null); setNote(""); setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const todayEntries = entries.filter(e => e.date === new Date().toISOString().split("T")[0]);
  const last7 = entries.filter(e => (Date.now() - new Date(e.date).getTime()) / 86400000 < 7);
  const avgMood = last7.length ? (last7.reduce((a, e) => a + e.value, 0) / last7.length).toFixed(1) : "—";

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
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative rounded-3xl p-8 mb-8 bg-gradient-to-br from-cyan-500/10 to-sky-500/10 border border-border/30 overflow-hidden">
            <div className="absolute inset-0 noise opacity-30 pointer-events-none" />
            <div className="relative text-center">
              <span className="text-6xl mb-3 block">📊</span>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Termômetro Emocional</h1>
              <p className="text-muted-foreground text-sm">Auto-observação baseada em Russell's Circumplex Model</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: <TrendingUp className="w-5 h-5 text-primary" />, value: avgMood, label: "Média 7 dias" },
              { icon: <Calendar className="w-5 h-5 text-secondary" />, value: todayEntries.length, label: "Check-ins hoje" },
              { icon: <span className="text-xl">{todayEntries[0]?.emoji || "—"}</span>, value: "", label: "Última emoção" },
            ].map((s, i) => (
              <motion.div key={i} className="glass-card rounded-2xl p-4 text-center border border-border/30" whileHover={{ y: -2 }}>
                <div className="mb-1 flex justify-center">{s.icon}</div>
                {s.value !== "" && <span className="text-2xl font-bold font-display block">{s.value}</span>}
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Mini Chart — premium with gradient bars */}
          <div className="glass-card rounded-3xl p-5 mb-6 border border-border/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">📈 Últimos 7 dias</h3>
            <div className="flex items-end gap-3 h-28">
              {chartDays.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  {day.avg > 0 && <span className="text-[10px] font-bold text-muted-foreground">{day.avg.toFixed(1)}</span>}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: day.avg ? `${(day.avg / 5) * 90}px` : "4px" }}
                    transition={{ delay: i * 0.08, type: "spring", damping: 15 }}
                    className={`w-full rounded-xl ${
                      day.avg > 3.5 ? "bg-gradient-to-t from-emerald-500/80 to-emerald-400/40"
                        : day.avg > 2 ? "bg-gradient-to-t from-amber-500/80 to-amber-400/40"
                        : day.avg > 0 ? "bg-gradient-to-t from-red-500/60 to-red-400/30"
                        : "bg-muted"
                    }`}
                  />
                  <span className="text-[11px] font-medium text-muted-foreground">{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Emotion Picker — premium cards */}
          <div className="glass-card rounded-3xl p-6 mb-6 border border-border/30">
            <h3 className="font-display font-bold text-lg mb-4">Como você está agora?</h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {EMOTIONS.map(em => (
                <motion.button
                  key={em.label}
                  onClick={() => setSelectedEmotion(em)}
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all relative overflow-hidden ${
                    selectedEmotion?.label === em.label ? "ring-2 ring-primary bg-primary/10 shadow-warm" : "glass-card hover:shadow-warm border border-border/30"
                  }`}
                >
                  {selectedEmotion?.label === em.label && <div className="absolute inset-0 shimmer pointer-events-none" />}
                  <span className="text-3xl relative z-10">{em.emoji}</span>
                  <span className="text-[10px] font-semibold relative z-10">{em.label}</span>
                </motion.button>
              ))}
            </div>
            <AnimatePresence>
              {selectedEmotion && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <textarea
                    value={note} onChange={e => setNote(e.target.value)}
                    placeholder="O que está causando essa emoção? (opcional)"
                    rows={2}
                    className="w-full p-3 rounded-xl border border-border/30 bg-background/50 text-sm resize-none mb-3"
                  />
                  <button onClick={handleSave} className="w-full py-3.5 rounded-2xl gradient-institute text-primary-foreground font-bold shadow-warm hover:shadow-glow transition-all">
                    Registrar {selectedEmotion.emoji} +5 XP
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {showSaved && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center mt-3">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-success"><Sparkles className="w-3 h-3" /> Registrado com sucesso!</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* History — premium timeline */}
          {entries.length > 0 && (
            <section>
              <h2 className="font-display font-bold text-lg mb-4">📋 Registros Recentes</h2>
              <div className="space-y-2">
                {entries.slice(0, 15).map((entry, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="glass-card rounded-2xl p-3.5 flex items-center gap-3 border border-border/30"
                  >
                    <motion.span className="text-2xl" whileHover={{ scale: 1.2 }}>{entry.emoji}</motion.span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{entry.emotion}</span>
                        <span className="text-[10px] text-muted-foreground">{entry.date} {entry.time}</span>
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
