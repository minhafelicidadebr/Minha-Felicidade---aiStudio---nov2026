import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Sparkles, Heart, Calendar, Flame, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useProgress } from "@/hooks/useProgress";

const PROMPTS = [
  "Quem fez algo gentil por você recentemente?",
  "Qual foi um momento simples que te trouxe alegria hoje?",
  "O que no seu corpo funciona bem e você geralmente não percebe?",
  "Qual aprendizado recente você é grato(a) por ter?",
  "Que pessoa na sua vida merece um 'obrigado' que ainda não recebeu?",
  "Qual pequeno prazer cotidiano você pode saborear mais?",
  "O que aconteceu de bom esta semana que você quase não notou?",
  "Por qual desafio superado você é grato(a)?",
];

interface Entry { text: string; prompt: string; date: string; mood: number; }

export default function GratitudePage() {
  const navigate = useNavigate();
  const { trackActivity } = useProgress();
  const [entries, setEntries] = useState<Entry[]>(() => {
    const saved = localStorage.getItem("gratitude-journal");
    return saved ? JSON.parse(saved) : [];
  });
  const [text, setText] = useState("");
  const [mood, setMood] = useState(3);
  const [promptIdx, setPromptIdx] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => { setPromptIdx(Math.floor(Math.random() * PROMPTS.length)); }, []);
  useEffect(() => { localStorage.setItem("gratitude-journal", JSON.stringify(entries)); }, [entries]);

  const todayEntries = entries.filter(e => e.date === new Date().toISOString().split("T")[0]);
  const streak = (() => {
    let s = 0; const d = new Date();
    while (true) {
      const ds = d.toISOString().split("T")[0];
      if (entries.some(e => e.date === ds)) { s++; d.setDate(d.getDate() - 1); } else break;
    }
    return s;
  })();

  const handleSubmit = () => {
    if (!text.trim()) return;
    const entry: Entry = { text: text.trim(), prompt: PROMPTS[promptIdx], date: new Date().toISOString().split("T")[0], mood };
    setEntries(prev => [entry, ...prev]);
    trackActivity({ moduleId: "rewirements", activityType: "gratitude", activityId: `gratitude-${Date.now()}`, data: { mood, promptUsed: PROMPTS[promptIdx] } });
    setText(""); setShowSuccess(true);
    setPromptIdx(Math.floor(Math.random() * PROMPTS.length));
    setTimeout(() => setShowSuccess(false), 2500);
  };

  const moodEmojis = ["😔", "😕", "😐", "🙂", "😊"];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-2xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Premium header */}
          <div className="relative rounded-3xl p-8 mb-8 bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-border/30 overflow-hidden">
            <div className="absolute inset-0 noise opacity-30 pointer-events-none" />
            <div className="relative text-center">
              <span className="text-6xl mb-3 block">📝</span>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Diário de Gratidão</h1>
              <p className="text-muted-foreground text-sm">Emmons & McCullough (2003): praticar gratidão aumenta o bem-estar em 25%</p>
            </div>
          </div>

          {/* Stats with animations */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: <Flame className="w-5 h-5 text-destructive" />, value: streak, label: "Dias seguidos", glow: streak >= 7 },
              { icon: <Heart className="w-5 h-5 text-primary" />, value: todayEntries.length, label: "Hoje" },
              { icon: <Calendar className="w-5 h-5 text-secondary" />, value: entries.length, label: "Total" },
            ].map((s, i) => (
              <motion.div key={i} className={`glass-card rounded-2xl p-4 text-center border ${s.glow ? "border-destructive/30 shadow-warm" : "border-border/30"}`} whileHover={{ y: -2 }}>
                <div className="mb-1 flex justify-center">{s.icon}</div>
                <motion.span className="text-2xl font-bold font-display block" key={s.value} initial={{ scale: 1.2 }} animate={{ scale: 1 }}>{s.value}</motion.span>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Prompt — premium glass */}
          <div className="glass-card rounded-3xl p-6 mb-6 relative overflow-hidden border border-border/30">
            <div className="absolute top-0 left-0 w-full h-1 gradient-institute" />
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Prompt do Dia</span>
                <p className="font-display font-semibold text-lg mt-1">{PROMPTS[promptIdx]}</p>
              </div>
              <button onClick={() => setPromptIdx((promptIdx + 1) % PROMPTS.length)} className="p-2 rounded-lg glass hover:shadow-warm transition-all shrink-0" aria-label="Próximo prompt">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Mood picker — larger, more interactive */}
          <div className="glass-card rounded-2xl p-5 mb-4 border border-border/30">
            <span className="text-sm font-semibold mb-3 block">Como você está agora?</span>
            <div className="flex items-center justify-center gap-4">
              {moodEmojis.map((emoji, i) => (
                <motion.button
                  key={i} onClick={() => setMood(i + 1)}
                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                  className={`text-3xl p-2 rounded-xl transition-all ${mood === i + 1 ? "bg-primary/10 ring-2 ring-primary/30 scale-110" : "opacity-40 hover:opacity-80"}`}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Input — premium */}
          <div className="relative mb-6">
            <textarea
              value={text} onChange={e => setText(e.target.value)}
              placeholder="Escreva pelo que você é grato(a) hoje..."
              rows={4}
              className="w-full p-5 rounded-2xl glass-card border border-border/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none text-sm leading-relaxed"
            />
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handleSubmit} disabled={!text.trim()}
              className="absolute bottom-4 right-4 p-3 rounded-xl gradient-institute text-primary-foreground disabled:opacity-50 shadow-warm"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Success Animation */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div initial={{ opacity: 0, scale: 0.8, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} className="text-center mb-6">
                <motion.span className="text-5xl block" animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 0.5 }}>✨</motion.span>
                <p className="text-sm font-bold text-success mt-1">+10 XP — Gratidão registrada!</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History — premium timeline */}
          {entries.length > 0 && (
            <section>
              <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">📖 Histórico <span className="text-xs text-muted-foreground font-normal">({entries.length} entradas)</span></h2>
              <div className="space-y-3 relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-border/50" />
                {entries.slice(0, 10).map((entry, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="glass-card rounded-2xl p-4 ml-8 relative border border-border/30"
                  >
                    <div className="absolute -left-[1.4rem] top-4 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground font-medium">{entry.date}</span>
                      <span className="text-lg">{moodEmojis[entry.mood - 1]}</span>
                    </div>
                    <p className="text-sm leading-relaxed">{entry.text}</p>
                    <p className="text-[11px] text-muted-foreground mt-2 italic">💡 {entry.prompt}</p>
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
