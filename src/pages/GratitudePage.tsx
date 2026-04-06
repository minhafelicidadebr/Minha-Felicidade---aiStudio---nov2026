import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Sparkles, Heart, Calendar, Flame } from "lucide-react";
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

interface Entry {
  text: string;
  prompt: string;
  date: string;
  mood: number;
}

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

  useEffect(() => {
    setPromptIdx(Math.floor(Math.random() * PROMPTS.length));
  }, []);

  useEffect(() => {
    localStorage.setItem("gratitude-journal", JSON.stringify(entries));
  }, [entries]);

  const todayEntries = entries.filter(e => e.date === new Date().toISOString().split("T")[0]);
  const streak = (() => {
    let s = 0;
    const d = new Date();
    while (true) {
      const ds = d.toISOString().split("T")[0];
      if (entries.some(e => e.date === ds)) { s++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return s;
  })();

  const handleSubmit = () => {
    if (!text.trim()) return;
    const entry: Entry = { text: text.trim(), prompt: PROMPTS[promptIdx], date: new Date().toISOString().split("T")[0], mood };
    setEntries(prev => [entry, ...prev]);
    trackActivity({ moduleId: "rewirements", activityType: "gratitude", activityId: `gratitude-${Date.now()}`, data: { mood, promptUsed: PROMPTS[promptIdx] } });
    setText("");
    setShowSuccess(true);
    setPromptIdx(Math.floor(Math.random() * PROMPTS.length));
    setTimeout(() => setShowSuccess(false), 2500);
  };

  const moodEmojis = ["😔", "😕", "😐", "🙂", "😊"];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-2xl">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <header className="text-center mb-8">
            <span className="text-5xl mb-3 block">📝</span>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Diário de Gratidão</h1>
            <p className="text-muted-foreground">Emmons & McCullough (2003): praticar gratidão aumenta o bem-estar em 25%</p>
          </header>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="glass-card rounded-2xl p-4 text-center">
              <Flame className="w-5 h-5 mx-auto mb-1 text-destructive" />
              <span className="text-2xl font-bold font-display">{streak}</span>
              <p className="text-xs text-muted-foreground">Dias seguidos</p>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center">
              <Heart className="w-5 h-5 mx-auto mb-1 text-primary" />
              <span className="text-2xl font-bold font-display">{todayEntries.length}</span>
              <p className="text-xs text-muted-foreground">Hoje</p>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center">
              <Calendar className="w-5 h-5 mx-auto mb-1 text-secondary" />
              <span className="text-2xl font-bold font-display">{entries.length}</span>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>

          {/* Prompt */}
          <div className="glass-card rounded-2xl p-5 mb-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 gradient-institute" />
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Prompt do Dia</span>
                <p className="font-display font-semibold text-lg mt-1">{PROMPTS[promptIdx]}</p>
              </div>
            </div>
          </div>

          {/* Mood */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-sm text-muted-foreground">Como você está?</span>
            {moodEmojis.map((emoji, i) => (
              <button key={i} onClick={() => setMood(i + 1)} className={`text-2xl transition-transform ${mood === i + 1 ? "scale-125" : "opacity-50 hover:opacity-80"}`}>
                {emoji}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="relative mb-6">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Escreva pelo que você é grato(a) hoje..."
              rows={4}
              className="w-full p-4 rounded-2xl glass-card border border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none text-sm"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="absolute bottom-3 right-3 p-2.5 rounded-xl gradient-institute text-primary-foreground disabled:opacity-50 shadow-warm"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Success Animation */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="text-center mb-6">
                <span className="text-4xl">✨</span>
                <p className="text-sm font-bold text-success mt-1">+10 XP — Gratidão registrada!</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History */}
          {entries.length > 0 && (
            <section>
              <h2 className="font-display font-bold text-lg mb-3">📖 Histórico</h2>
              <div className="space-y-3">
                {entries.slice(0, 10).map((entry, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{entry.date}</span>
                      <span>{moodEmojis[entry.mood - 1]}</span>
                    </div>
                    <p className="text-sm">{entry.text}</p>
                    <p className="text-xs text-muted-foreground mt-1 italic">Prompt: {entry.prompt}</p>
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
