import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, BookOpen, Lightbulb, Heart, Brain, Loader2, Zap, Users, MessageCircle, RotateCcw } from "lucide-react";
import Navbar from "@/components/Navbar";
import AiSafetyNotice from "@/components/AiSafetyNotice";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { modules } from "@/data/courseData";
import BackToVideoBanner from "@/components/learning/BackToVideoBanner";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aledria-chat`;

const AVATAR_URL = "https://static.wixstatic.com/media/575677_d1cc9ff366794d83a8095092ca1a82fe~mv2.png/v1/fill/w_648,h_648,al_c,lg_1,q_90,enc_avif,quality_auto/avatares%20AI%20(6).png";

const SUGGESTED_QUESTIONS = [
  { icon: Sparkles, text: "O que é felicidade segundo a ciência?", color: "from-primary/20 to-secondary/20" },
  { icon: Brain, text: "Como funciona a adaptação hedônica?", color: "from-accent/20 to-primary/20" },
  { icon: Heart, text: "Quais são os 6 Rewirements?", color: "from-destructive/20 to-primary/20" },
  { icon: Lightbulb, text: "O que é o método WOOP?", color: "from-secondary/20 to-accent/20" },
  { icon: Users, text: "Por que conexão social é o maior preditor de bem-estar?", color: "from-accent/20 to-secondary/20" },
  { icon: Zap, text: "Dinheiro compra felicidade?", color: "from-primary/20 to-destructive/20" },
];

const MODULE_QUESTIONS: Record<string, { text: string }[]> = {
  mentiras: [
    { text: "O que é miswanting?" },
    { text: "Por que a Falácia de G.I. Joe é importante?" },
    { text: "Quais são as 6 misconceptions sobre felicidade?" },
    { text: "Até que valor o dinheiro aumenta o bem-estar?" },
  ],
  expectativas: [
    { text: "Quais são os 4 'bugs' da mente?" },
    { text: "O que é adaptação hedônica?" },
    { text: "Como os pontos de referência distorcem nossa percepção?" },
    { text: "O que é Impact Bias?" },
  ],
  rewirements: [
    { text: "Quais são os 6 Rewirements?" },
    { text: "O que diz Diener & Seligman sobre conexão social?" },
    { text: "Como atos de bondade aumentam o bem-estar?" },
    { text: "O que é Time Affluence?" },
  ],
  hacks: [
    { text: "O que é Savoring?" },
    { text: "Como funciona a Visualização Negativa?" },
    { text: "Por que a mente divaga 47% do tempo?" },
    { text: "Por que experiências superam posses?" },
  ],
  habitos: [
    { text: "Como funciona o framework WOOP?" },
    { text: "O que são Implementation Intentions?" },
    { text: "Como o Growth Mindset ajuda na mudança?" },
    { text: "Como fazer Design de Ambiente para hábitos?" },
  ],
};

const WELCOME_MESSAGE: Msg = {
  role: "assistant",
  content: "Olá! 🌟 Sou a **AlegrIA**, sua companheira de viagem pela ciência do bem-estar.\n\nEstou aqui para explorar com você os 5 módulos do curso de Yale — de misconceptions sobre felicidade a como formar hábitos duradouros. Minhas respostas são baseadas em **evidências científicas** com citações verificáveis.\n\nO que você gostaria de descobrir hoje?",
};

async function streamChat({ messages, moduleContext, onDelta, onDone, onError }: { messages: Msg[]; moduleContext?: string; onDelta: (t: string) => void; onDone: () => void; onError: (msg: string) => void }) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    onError("Faca login para usar a AlegrIA.");
    return;
  }

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ messages, moduleContext }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: "Erro de conexão" }));
    onError(body.error || `Erro ${resp.status}`);
    return;
  }
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

  // Auto-send when navigated with ?q=
  const presetQ = searchParams.get("q");
  useEffect(() => {
    if (presetQ && messages.length === 1 && !isLoading) {
      send(presetQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetQ]);

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
        moduleContext: mod ? `Módulo ${mod.number}: ${mod.title}` : undefined,
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
  const resetChat = () => { setMessages([WELCOME_MESSAGE]); setInput(""); };

  const showSuggestions = messages.length <= 1;
  const suggestions = moduleId && MODULE_QUESTIONS[moduleId] ? MODULE_QUESTIONS[moduleId] : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <BackToVideoBanner />
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full pt-20 pb-4 px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-4 px-2">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-warm ring-2 ring-primary/20">
              <img src={AVATAR_URL} alt="AlegrIA — Tutora socrática" className="w-full h-full object-cover" />
            </div>
            <motion.div
              className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-background"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold flex items-center gap-2">
              AlegrIA <Sparkles className="w-4 h-4 text-primary" />
            </h1>
            <p className="text-xs text-muted-foreground">
              {mod ? `Módulo ${mod.number}: ${mod.title}` : "Tutora socrática · 5 módulos de Yale · Ciência do Bem-Estar"}
            </p>
          </div>
          <button onClick={resetChat} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all" title="Nova conversa" aria-label="Iniciar nova conversa">
            <RotateCcw className="w-4 h-4" />
          </button>
        </motion.div>

        <div className="px-2 mb-3">
          <AiSafetyNotice />
        </div>

        {/* Module tag */}
        {mod && (
          <div className="px-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {mod.icon} Módulo {mod.number} · {mod.title}
            </span>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 px-1 pb-4 scrollbar-thin" role="log" aria-label="Conversa com AlegrIA" aria-live="polite">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 mt-1 ring-1 ring-border shadow-sm">
                    <img src={AVATAR_URL} alt="AlegrIA" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "gradient-institute text-primary-foreground rounded-br-md shadow-warm"
                    : "glass-card rounded-bl-md"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5 [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : <p>{msg.content}</p>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 mt-1 ring-1 ring-border">
                <img src={AVATAR_URL} alt="AlegrIA" className="w-full h-full object-cover" />
              </div>
              <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <motion.div className="w-2 h-2 rounded-full bg-primary" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                  <motion.div className="w-2 h-2 rounded-full bg-primary/70" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }} />
                  <motion.div className="w-2 h-2 rounded-full bg-primary/40" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Module-specific suggestions */}
        {showSuggestions && suggestions && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-2 mb-3">
            {suggestions.map((q, i) => (
              <button key={i} onClick={() => send(q.text)} className="px-3 py-2 rounded-xl glass border border-primary/20 hover:bg-primary/10 text-sm font-medium text-primary transition-all hover:shadow-warm">
                {q.text}
              </button>
            ))}
          </motion.div>
        )}

        {/* General suggestions */}
        {showSuggestions && !suggestions && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button key={i} onClick={() => send(q.text)} className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${q.color} border border-border/50 hover:border-primary/30 hover:shadow-warm transition-all text-left group`}>
                <q.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                <span className="text-sm font-medium text-foreground">{q.text}</span>
              </button>
            ))}
          </motion.div>
        )}

        {/* Input */}
        <div className="relative glass-card rounded-2xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte à AlegrIA sobre os 5 módulos de Yale..."
            rows={1}
            disabled={isLoading}
            className="w-full resize-none bg-transparent px-4 py-3.5 pr-14 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50 max-h-32"
            aria-label="Digite sua mensagem para AlegrIA"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2.5 rounded-xl gradient-institute text-primary-foreground hover:shadow-glow disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Enviar mensagem"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1">
          <MessageCircle className="w-3 h-3" />
          AlegrIA usa IA com base nos 5 módulos de Yale. Sempre verifique fontes no Evidence Explorer.
        </p>
      </div>
      <Footer />
    </div>
  );
}
