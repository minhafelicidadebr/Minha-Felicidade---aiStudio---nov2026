import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, ArrowRight, Brain, BookOpen, Quote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

const SUGGESTED = [
  { q: "Estou ansioso com o vestibular", tag: "Ansiedade" },
  { q: "Por que dinheiro não me faz feliz?", tag: "Hedonismo" },
  { q: "Como criar um hábito que dure?", tag: "Hábitos" },
  { q: "Me ensine 1 prática Yale em 30s", tag: "Rewirement" },
];

// Cognitive scaffolding — what AlegrIA does while it "thinks" (ToT visible).
const THINK_STEPS = [
  { icon: Brain, label: "Identificando o nó emocional" },
  { icon: BookOpen, label: "Consultando RAG: Yale, PERMA-V, PNAS" },
  { icon: Sparkles, label: "Compondo resposta socrática" },
];

// Sample mini-conversations shown before user asks (instructional priming).
const PREVIEW_BUBBLES = [
  "É natural sentir isso ✨ Vamos por partes…",
  "A ciência mostra que pequenos rituais reorganizam o cérebro (Killingsworth, 2010).",
  "Posso te sugerir 1 prática de 90 segundos?",
];

/**
 * Innovation #1 (v2) — Live AlegrIA hero with ToT-visible reasoning,
 * citation auto-extraction, and instructional priming. <10s proof-of-value.
 */
export default function HeroAlegriaLive() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);
  const [thinkIdx, setThinkIdx] = useState(0);
  const [previewIdx, setPreviewIdx] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => () => abortRef.current?.abort(), []);

  // Rotate priming bubbles while idle (instructional design).
  useEffect(() => {
    if (hasAsked) return;
    const id = setInterval(() => setPreviewIdx((i) => (i + 1) % PREVIEW_BUBBLES.length), 3200);
    return () => clearInterval(id);
  }, [hasAsked]);

  // Rotate ToT steps while streaming (cognitive scaffolding visible).
  useEffect(() => {
    if (!streaming || response.length > 20) return;
    const id = setInterval(() => setThinkIdx((i) => (i + 1) % THINK_STEPS.length), 1100);
    return () => clearInterval(id);
  }, [streaming, response.length]);

  // Auto-extract first citation (Author, Year) for ribbon badge.
  const citation = useMemo(() => {
    const m = response.match(/\(([A-Z][A-Za-zÀ-ÿ.&\s]+,\s*\d{4})[a-z]?\)/);
    return m?.[1] ?? null;
  }, [response]);

  const ask = async (q: string) => {
    if (!q.trim() || streaming) return;
    setHasAsked(true);
    setResponse("");
    setThinkIdx(0);
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
          moduleContext: "Demo público — landing page (visitante não autenticado). Responda em ≤120 palavras, com 1 evidência citada (Autor, Ano) e 1 micro-prática de 30s.",
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setResponse("Hmm, deu um soluço aqui ✨ — tente de novo em instantes ou clique em **Abrir o app completo** para conhecer todas as práticas.");
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

  const ThinkIcon = THINK_STEPS[thinkIdx].icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.8 }}
      className="relative max-w-2xl mx-auto w-full mt-10"
    >
      {/* Aurora glow + animated halo */}
      <motion.div
        className="absolute -inset-8 bg-gradient-to-r from-primary/25 via-accent/15 to-secondary/25 blur-3xl pointer-events-none"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      <div className="relative glass-card rounded-3xl p-5 md:p-6 shadow-float border border-primary/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <motion.div
              className="relative w-10 h-10 rounded-full gradient-institute flex items-center justify-center shadow-warm"
              animate={{ boxShadow: ["0 0 0 0 hsl(var(--primary)/0.45)", "0 0 0 14px hsl(var(--primary)/0)", "0 0 0 0 hsl(var(--primary)/0)"] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </motion.div>
            <div className="text-left">
              <div className="font-display font-bold text-sm leading-tight flex items-center gap-1.5">
                AlegrIA <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase tracking-wider">live</span>
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Cérebro do ecossistema · ToT + RAG Yale
              </div>
            </div>
          </div>
          <AnimatePresence>
            {citation && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-accent/15 text-accent border border-accent/30 uppercase tracking-wider flex items-center gap-1"
              >
                <Quote className="w-2.5 h-2.5" /> {citation}
              </motion.span>
            )}
            {!citation && (
              <motion.span
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider"
              >
                Yale RAG
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Idle priming — rotating preview bubbles to teach what AlegrIA does */}
        <AnimatePresence mode="wait">
          {!hasAsked && (
            <motion.div
              key={previewIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="mb-4 px-4 py-3 rounded-2xl bg-primary/5 border border-primary/15 text-sm text-foreground/85 italic"
            >
              "{PREVIEW_BUBBLES[previewIdx]}"
            </motion.div>
          )}
        </AnimatePresence>

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
              {/* ToT-visible reasoning while waiting first tokens */}
              {streaming && response.length < 20 && (
                <motion.div
                  key={thinkIdx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2.5 px-3 py-2.5 mb-3 rounded-xl bg-background/40 border border-border/30"
                >
                  <ThinkIcon className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-xs text-foreground/75">{THINK_STEPS[thinkIdx].label}…</span>
                  <div className="ml-auto flex gap-1">
                    {THINK_STEPS.map((_, i) => (
                      <span key={i} className={`w-1 h-1 rounded-full transition-colors ${i <= thinkIdx ? "bg-primary" : "bg-border"}`} />
                    ))}
                  </div>
                </motion.div>
              )}

              <div
                ref={responseRef}
                className="text-left text-sm md:text-[15px] leading-relaxed text-foreground/90 max-h-64 overflow-y-auto mb-4 px-1 prose prose-sm prose-invert max-w-none prose-strong:text-primary prose-a:text-accent prose-p:my-2"
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

        {/* Quick suggestions — now with categorical tags (instructional priming) */}
        <div className="flex flex-wrap gap-2 justify-center">
          {SUGGESTED.map((s) => (
            <motion.button
              key={s.q}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => ask(s.q)}
              disabled={streaming}
              className="group text-[11px] pl-2 pr-3 py-1.5 rounded-full glass border border-border/40 hover:border-primary/50 hover:text-primary transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary uppercase tracking-wider group-hover:bg-primary/25 transition-colors">{s.tag}</span>
              {s.q}
            </motion.button>
          ))}
        </div>

        {/* Conversion nudge after first answer */}
        <AnimatePresence>
          {hasAsked && !streaming && response && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-4 pt-4 border-t border-border/30"
            >
              <div className="text-[11px] text-center text-muted-foreground mb-2">
                Essa foi a versão demo — no app completo são <strong className="text-foreground">19 práticas + 5 módulos Yale + relatórios PDF</strong>.
              </div>
              <button
                onClick={() => navigate("/auth")}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl gradient-institute text-primary-foreground text-sm font-bold shadow-warm hover:shadow-glow hover:scale-[1.02] transition-all group"
              >
                Abrir o app completo · 14 dias grátis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
