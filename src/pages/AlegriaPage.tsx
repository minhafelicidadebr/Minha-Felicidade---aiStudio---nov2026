import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, BookOpen, Lightbulb, Heart, Brain, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import aledriaAvatar from "@/assets/aledria-avatar.png";
import { useToast } from "@/hooks/use-toast";
import { modules } from "@/data/courseData";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aledria-chat`;

const SUGGESTED_QUESTIONS = [
  { icon: Sparkles, text: "O que é felicidade segundo a ciência?", color: "from-amber-500/20 to-orange-500/20" },
  { icon: Brain, text: "Como funciona a adaptação hedônica?", color: "from-blue-500/20 to-indigo-500/20" },
  { icon: Heart, text: "Quais práticas aumentam o bem-estar?", color: "from-rose-500/20 to-pink-500/20" },
  { icon: Lightbulb, text: "Explique o modelo PERMA+V", color: "from-emerald-500/20 to-teal-500/20" },
  { icon: BookOpen, text: "O que é Job Crafting?", color: "from-violet-500/20 to-purple-500/20" },
];

const MODULE_QUESTIONS: Record<string, { text: string }[]> = {
  etymology: [{ text: "Qual a etimologia da palavra felicidade?" }, { text: "Qual a diferença entre hedonia e eudaimonia?" }],
  worldviews: [{ text: "O que Aristóteles dizia sobre felicidade?" }, { text: "Como o estoicismo se conecta com a ciência?" }],
  illusions: [{ text: "O que é miswanting?" }, { text: "Dinheiro compra felicidade?" }],
  hedonic: [{ text: "O que é a esteira hedônica?" }, { text: "Como retardar a adaptação hedônica?" }],
  neuro: [{ text: "Quais são as 4 dimensões de Davidson?" }, { text: "O que há de errado com os '4 hormônios da felicidade'?" }],
  emotions: [{ text: "O que são os mapas corporais das emoções?" }, { text: "Qual a melhor estratégia de regulação emocional?" }],
  perma: [{ text: "Explique o modelo PERMA+V" }, { text: "PERMA vs SPIRE — qual é melhor?" }],
  work: [{ text: "O que é Job Crafting?" }, { text: "Quais são os drivers de bem-estar no trabalho?" }],
};

const WELCOME_MESSAGE: Msg = {
  role: "assistant",
  content: "Olá! 🌟 Sou a **AlegrIA**, sua companheira de viagem pela ciência da felicidade.\n\nEstou aqui para explorar com você — de Aristóteles a neurociência, de gratidão a propósito no trabalho. Minhas respostas são sempre baseadas em **evidências científicas** do nosso Evidence Explorer.\n\nO que você gostaria de descobrir hoje?",
};

async function streamChat({ messages, onDelta, onDone, onError }: { messages: Msg[]; onDelta: (t: string) => void; onDone: () => void; onError: (msg: string) => void }) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    body: JSON.stringify({ messages }),
  });
  if (!resp.ok) { const body = await resp.json().catch(() => ({ error: "Erro de conexão" })); onError(body.error || `Erro ${resp.status}`); return; }
  if (!resp.body) { onError("Sem resposta do servidor"); return; }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) onDelta(c); } catch { buf = line + "\n" + buf; break; }
    }
  }
  onDone();
}

export default function AlegriaPage() {
  const [searchParams] = useSearchParams();
  const moduleId = searchParams.get("module");
  const mod = moduleId ? modules.find(m => m.id === moduleId) : null;

  const [messages, setMessages] = useState<Msg[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > 1 && prev[prev.length - 2]?.role === "user") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };
    try {
      await streamChat({
        messages: [...messages, userMsg].filter((m) => m !== WELCOME_MESSAGE),
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        onError: (msg) => { toast({ title: "Ops!", description: msg, variant: "destructive" }); setIsLoading(false); },
      });
    } catch {
      toast({ title: "Erro de conexão", description: "Verifique sua internet e tente novamente.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } };

  const showSuggestions = messages.length <= 1;
  const suggestions = moduleId && MODULE_QUESTIONS[moduleId] ? MODULE_QUESTIONS[moduleId] : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full pt-20 pb-4 px-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-4 px-2">
          <div className="relative">
            <img src={aledriaAvatar} alt="AlegrIA — Tutora socrática" className="w-14 h-14 rounded-2xl object-cover shadow-lg ring-2 ring-primary/20" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-background" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold flex items-center gap-2">AlegrIA <Sparkles className="w-4 h-4 text-primary" /></h1>
            <p className="text-xs text-muted-foreground">
              {mod ? `Módulo ${mod.number}: ${mod.title}` : "Tutora socrática · Evidências científicas · Ciência da Felicidade"}
            </p>
          </div>
        </motion.div>

        {/* Module tag */}
        {mod && (
          <div className="px-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {mod.icon} Módulo {mod.number} · {mod.title}
            </span>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 px-1 pb-4 scrollbar-thin" role="log" aria-label="Conversa com AlegrIA" aria-live="polite">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "assistant" && <img src={aledriaAvatar} alt="AlegrIA" className="w-9 h-9 rounded-xl object-cover shrink-0 mt-1 ring-1 ring-border" />}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border rounded-bl-md"}`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5 [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : <p>{msg.content}</p>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <img src={aledriaAvatar} alt="AlegrIA" className="w-9 h-9 rounded-xl object-cover shrink-0 mt-1 ring-1 ring-border" />
              <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /><span>Pensando...</span></div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Module-specific suggestions */}
        {showSuggestions && suggestions && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-2 mb-3">
            {suggestions.map((q, i) => (
              <button key={i} onClick={() => send(q.text)} className="px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 text-sm font-medium text-primary transition-all">
                {q.text}
              </button>
            ))}
          </motion.div>
        )}

        {/* General suggestions */}
        {showSuggestions && !suggestions && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button key={i} onClick={() => send(q.text)} className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${q.color} border border-border/50 hover:border-primary/30 hover:shadow-md transition-all text-left group`}>
                <q.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                <span className="text-sm font-medium text-foreground">{q.text}</span>
              </button>
            ))}
          </motion.div>
        )}

        <div className="relative bg-card border border-border rounded-2xl shadow-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Pergunte à AlegrIA sobre ciência da felicidade..." rows={1} disabled={isLoading} className="w-full resize-none bg-transparent px-4 py-3.5 pr-14 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50 max-h-32" aria-label="Digite sua mensagem para AlegrIA" />
          <button onClick={() => send(input)} disabled={!input.trim() || isLoading} className="absolute right-2 bottom-2 p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all" aria-label="Enviar mensagem">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2">AlegrIA usa IA com base de evidências curadas. Sempre verifique fontes no Evidence Explorer.</p>
      </div>
    </div>
  );
}
