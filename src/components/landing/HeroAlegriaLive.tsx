import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

const SUGGESTED = [
  "Estou ansioso com o vestibular",
  "Por que dinheiro não me faz feliz?",
  "Como criar um hábito que dure?",
  "Me ensine 1 prática Yale em 30s",
];

/**
 * Innovation #1 — Live AlegrIA inline on the hero.
 * Streams a real response from the aledria-chat edge function so visitors
 * feel the product in <10s without signing up. Anti-friction conversion.
 */
export default function HeroAlegriaLive() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = async (q: string) => {
    if (!q.trim() || streaming) return;
    setHasAsked(true);
    setResponse("");
    setStreaming(true);
    setInput("");
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aledria-chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: q }],
          moduleContext: "Demo público — landing page (visitante não autenticado)",
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setResponse("Hmm, deu um soluço aqui ✨ — tente de novo em instantes ou clique em **Iniciar Demo Gratuita** para abrir o app completo.");
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) setResponse((p) => p + delta);
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setResponse("Não consegui responder agora. Tente de novo em instantes 💛");
      }
    } finally {
      setStreaming(false);
    }
  };

  useEffect(() => {
    if (responseRef.current) responseRef.current.scrollTop = responseRef.current.scrollHeight;
  }, [response]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.8 }}
      className="relative max-w-2xl mx-auto w-full mt-10"
    >
      {/* Aurora glow behind card */}
      <div className="absolute -inset-6 bg-gradient-to-r from-primary/20 via-accent/10 to-secondary/20 blur-3xl opacity-60 pointer-events-none" />

      <div className="relative glass-card rounded-3xl p-5 md:p-6 shadow-float border border-primary/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <motion.div
              className="relative w-9 h-9 rounded-full gradient-institute flex items-center justify-center shadow-warm"
              animate={{ boxShadow: ["0 0 0 0 hsl(var(--primary)/0.4)", "0 0 0 12px hsl(var(--primary)/0)", "0 0 0 0 hsl(var(--primary)/0)"] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </motion.div>
            <div className="text-left">
              <div className="font-display font-bold text-sm leading-tight">AlegrIA · Demo ao vivo</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Cérebro do ecossistema · sem cadastro
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">Yale RAG</span>
        </div>

        {/* Response area */}
        <AnimatePresence mode="wait">
          {hasAsked && (
            <motion.div
              key="response"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                ref={responseRef}
                className="text-left text-sm md:text-[15px] leading-relaxed text-foreground/90 max-h-56 overflow-y-auto mb-4 px-1 prose prose-sm prose-invert max-w-none prose-strong:text-primary prose-a:text-accent"
              >
                {response ? (
                  <ReactMarkdown>{response}</ReactMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AlegrIA está pensando com rigor científico…</span>
                  </div>
                )}
                {streaming && response && (
                  <motion.span
                    className="inline-block w-1.5 h-4 bg-primary ml-0.5 align-middle"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); ask(input); }}
          className="flex gap-2 mb-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming}
            placeholder="O que está te incomodando hoje?"
            aria-label="Pergunte à AlegrIA"
            className="flex-1 px-4 py-3 rounded-xl bg-background/60 border border-border/50 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="px-4 py-3 rounded-xl gradient-institute text-primary-foreground shadow-warm hover:shadow-glow transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px]"
            aria-label="Enviar"
          >
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>

        {/* Quick suggestions */}
        <div className="flex flex-wrap gap-2 justify-center">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={streaming}
              className="text-[11px] px-3 py-1.5 rounded-full glass border border-border/40 hover:border-primary/40 hover:text-primary transition-all disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Conversion nudge after first answer */}
        {hasAsked && !streaming && response && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={() => navigate("/auth")}
            className="mt-4 w-full flex items-center justify-center gap-2 text-xs font-semibold text-primary hover:text-primary-glow transition-colors group"
          >
            Quer aprofundar? Abra o app completo
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
