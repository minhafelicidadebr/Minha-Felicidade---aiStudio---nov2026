/**
 * SignatureStrengthsPage — "Forças de Assinatura"
 * Laboratório interativo baseado no VIA Inventory of Strengths
 * (Peterson & Seligman, 2004) com IA gerando uma Carta das Forças personalizada.
 *
 * Mecânica:
 *  1) 24 forças VIA agrupadas em 6 virtudes (cards arrastáveis para o pódio)
 *  2) Pódio top-5 com slots ordenados (âncora → suporte)
 *  3) IA gera carta científica + práticas de 7 dias + sombras de Aristóteles
 *  4) Reveal cinematográfico em 3 atos
 */
import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useProgress } from "@/hooks/useProgress";
import { InsightDialog } from "@/components/learning/InsightDialog";
import { NeuralBackground, useXPBurst, ConfettiCelebration, BrainPulse, EncouragementBubble } from "@/components/learning/LearningFX";
import { ArrowLeft, Sparkles, RotateCcw, Mail, Compass, Crown, Heart, Loader2 } from "lucide-react";

/* ===== 24 forças VIA agrupadas em 6 virtudes ===== */
const VIRTUES = [
  {
    name: "Sabedoria & Conhecimento",
    color: "from-amber-500/30 to-orange-500/10",
    icon: "📚",
    strengths: [
      { id: "creativity", emoji: "💡", name: "Criatividade", short: "Originalidade, ideias produtivas." },
      { id: "curiosity", emoji: "🔍", name: "Curiosidade", short: "Interesse pelo mundo, abertura ao novo." },
      { id: "open_mind", emoji: "🧭", name: "Mente Aberta", short: "Pensar sobre os dois lados." },
      { id: "love_learning", emoji: "🎓", name: "Amor pelo Aprender", short: "Buscar e dominar novas habilidades." },
      { id: "perspective", emoji: "🌅", name: "Perspectiva", short: "Sabedoria prática, visão de conjunto." },
    ],
  },
  {
    name: "Coragem",
    color: "from-red-500/30 to-pink-500/10",
    icon: "🦁",
    strengths: [
      { id: "bravery", emoji: "🛡️", name: "Bravura", short: "Não fugir de ameaça, dor ou crítica." },
      { id: "perseverance", emoji: "🏔️", name: "Perseverança", short: "Terminar o que começou, apesar de obstáculos." },
      { id: "honesty", emoji: "💎", name: "Honestidade", short: "Dizer a verdade, ser autêntico." },
      { id: "zest", emoji: "⚡", name: "Vitalidade", short: "Viver com entusiasmo e energia." },
    ],
  },
  {
    name: "Humanidade",
    color: "from-rose-500/30 to-fuchsia-500/10",
    icon: "💗",
    strengths: [
      { id: "love", emoji: "❤️", name: "Capacidade de Amar", short: "Valorizar relações próximas e mútuas." },
      { id: "kindness", emoji: "🤲", name: "Bondade", short: "Fazer favores, cuidar dos outros." },
      { id: "social_iq", emoji: "🧠", name: "Inteligência Social", short: "Perceber motivos e sentimentos." },
    ],
  },
  {
    name: "Justiça",
    color: "from-blue-500/30 to-cyan-500/10",
    icon: "⚖️",
    strengths: [
      { id: "teamwork", emoji: "🤝", name: "Trabalho em Equipe", short: "Lealdade, espírito de grupo." },
      { id: "fairness", emoji: "⚖️", name: "Imparcialidade", short: "Tratar todos com justiça igual." },
      { id: "leadership", emoji: "👑", name: "Liderança", short: "Organizar atividades coletivas." },
    ],
  },
  {
    name: "Temperança",
    color: "from-emerald-500/30 to-teal-500/10",
    icon: "🌿",
    strengths: [
      { id: "forgiveness", emoji: "🕊️", name: "Perdão", short: "Aceitar falhas, dar segundas chances." },
      { id: "humility", emoji: "🌱", name: "Humildade", short: "Realizações falam por si." },
      { id: "prudence", emoji: "🧩", name: "Prudência", short: "Cuidado nas escolhas; não arriscar à toa." },
      { id: "self_reg", emoji: "🧘", name: "Autorregulação", short: "Disciplinar emoções e impulsos." },
    ],
  },
  {
    name: "Transcendência",
    color: "from-violet-500/30 to-indigo-500/10",
    icon: "✨",
    strengths: [
      { id: "beauty", emoji: "🎨", name: "Apreço pela Beleza", short: "Notar e admirar excelência em tudo." },
      { id: "gratitude", emoji: "🙏", name: "Gratidão", short: "Consciência das coisas boas; agradecer." },
      { id: "hope", emoji: "🌈", name: "Esperança", short: "Esperar o melhor; trabalhar para isso." },
      { id: "humor", emoji: "😄", name: "Humor", short: "Brincadeira; trazer sorrisos." },
      { id: "spirituality", emoji: "🌌", name: "Espiritualidade", short: "Senso de propósito e significado." },
    ],
  },
];

const ALL_STRENGTHS = VIRTUES.flatMap((v) => v.strengths.map((s) => ({ ...s, virtue: v.name })));

type Picked = { id: string; name: string; emoji: string };

type StrengthPractice = {
  day: string;
  strength: string;
  action: string;
  shadow: string;
};

type StrengthLetter = {
  title?: string;
  anchor_strength?: string;
  anchor_insight?: string;
  synergy?: string;
  practices?: StrengthPractice[];
  letter?: string;
  if_then_anchor?: string;
  scientific_basis?: string;
  error?: string;
};

export default function SignatureStrengthsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackActivity } = useProgress();
  const xp = useXPBurst();

  const [picked, setPicked] = useState<Picked[]>([]);
  const [name, setName] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [letter, setLetter] = useState<StrengthLetter | null>(null);
  const [act, setAct] = useState<1 | 2 | 3>(1); // 1: pick, 2: order, 3: reveal
  const [encore, setEncore] = useState(0);
  const podiumRef = useRef<HTMLDivElement>(null);

  const pickedIds = useMemo(() => new Set(picked.map((p) => p.id)), [picked]);

  const togglePick = (s: { id: string; name: string; emoji: string }, e?: React.MouseEvent) => {
    if (pickedIds.has(s.id)) {
      setPicked((p) => p.filter((x) => x.id !== s.id));
      return;
    }
    if (picked.length >= 5) {
      toast({ title: "Pódio cheio", description: "Remova uma força antes de adicionar outra." });
      return;
    }
    setPicked((p) => [...p, { id: s.id, name: s.name, emoji: s.emoji }]);
    setEncore((n) => n + 1);
    if (e) xp.trigger(5, e);
    if (picked.length === 4) {
      setTimeout(() => setAct(2), 400);
    }
  };

  const generate = async () => {
    if (picked.length !== 5) {
      toast({ title: "Faltam forças", description: "Selecione exatamente 5 forças." });
      return;
    }
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      toast({ title: "Login necessario", description: "Entre para gerar a carta com IA.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("signature-strengths", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          strengths: picked.map((p) => p.name),
          context,
          name,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLetter(data as StrengthLetter);
      setAct(3);
      await trackActivity({
        moduleId: "module-3",
        activityType: "evidence",
        activityId: "signature-strengths",
        completed: true,
        data: { top: picked.map((p) => p.id) },
      });
      xp.trigger(40);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Tente novamente.";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPicked([]);
    setLetter(null);
    setAct(1);
    setContext("");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <NeuralBackground />
      <Navbar />
      {xp.node}
      <ConfettiCelebration active={!!letter} count={80} />
      <EncouragementBubble trigger={encore} />

      <main className="container max-w-6xl mx-auto px-4 pt-28 pb-20 relative z-10">
        {/* Header */}
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao painel
        </button>

        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <Badge variant="outline" className="mb-3 border-primary/40 text-primary">
              <Sparkles className="w-3 h-3 mr-1" /> VIA Inventory · Peterson & Seligman, 2004
            </Badge>
            <h1 className="font-display font-black text-4xl md:text-5xl text-gradient-aurora">
              Forças de Assinatura
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Descubra suas 5 forças mais vivas — e receba uma carta científica do seu "eu mais forte",
              com práticas de 7 dias e os limites que cada virtude esconde.
            </p>
          </div>
          <BrainPulse />
        </div>

        {/* Mini-CTAs instrucionais */}
        <div className="flex flex-wrap gap-2 mb-8">
          <InsightDialog
            cta="Como funciona"
            emoji="🧭"
            variant="primary"
            title="3 atos, 5 minutos"
            subtitle="Sem teste de personalidade chato — só você escolhendo o que ressoa."
            steps={[
              { icon: "👆", title: "Ato 1 — Escolha 5", body: "Toque nas 5 forças VIA que mais soam como 'isso sou eu' (não 'isso queria ser')." },
              { icon: "🥇", title: "Ato 2 — Ordene", body: "Arraste o pódio: âncora no topo, suportes embaixo. A ordem importa pra IA." },
              { icon: "💌", title: "Ato 3 — Receba a carta", body: "A IA gera sinergia, práticas de 7 dias e a sombra (overuse) de cada força." },
            ]}
            takeaway="Forças usadas conscientemente por 1 semana aumentam felicidade mensurada por até 6 meses."
            citation="Seligman, Steen, Park & Peterson (2005), American Psychologist"
          />
          <InsightDialog
            cta="A ciência por trás"
            emoji="🧪"
            variant="secondary"
            title="VIA: o catálogo das virtudes humanas"
            steps={[
              { icon: "🌍", title: "55 culturas, 1 padrão", body: "Peterson & Seligman analisaram filosofia, religião e psicologia em 55 culturas e encontraram 24 forças universais sob 6 virtudes." },
              { icon: "🧠", title: "Forças de assinatura", body: "São o subconjunto que mais energiza você. Usá-las gera flow (Csikszentmihalyi), engajamento e sentido — os 3 pilares de PERMA.", evidence: "Seligman (2011), Flourish" },
              { icon: "⚖️", title: "Toda virtude tem sombra", body: "Aristóteles já sabia: virtude é o meio entre dois excessos. Coragem demais vira temeridade; humildade demais vira apagamento." },
            ]}
            citation="Peterson & Seligman (2004), Character Strengths and Virtues; Wood et al. (2011), Personality and Individual Differences."
          />
          <InsightDialog
            cta="E se eu travar?"
            emoji="🤝"
            variant="accent"
            title="Calma, isso é normal"
            steps={[
              { icon: "🪞", title: "Não é o que você 'deveria' ter", body: "Esqueça o que parece moralmente correto. Marque o que te energiza — o que te deixa cansado-mas-vivo, não exausto-e-vazio." },
              { icon: "🤷", title: "5 é pouco — propositalmente", body: "Forçar uma escolha cria clareza. Você terá outras forças (todos temos as 24 em algum grau). Aqui buscamos a assinatura, não o inventário." },
              { icon: "🔁", title: "Volte em 30 dias", body: "Sua assinatura muda com fases da vida. Refaça em um mês e compare — o delta diz mais do que a foto fixa." },
            ]}
          />
        </div>

        {/* ATO 1: Catálogo */}
        {act >= 1 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xl flex items-center gap-2">
                <Compass className="w-5 h-5 text-primary" /> Ato 1 · Catálogo das 24 Forças
              </h2>
              <Badge className="bg-primary/15 text-primary border-primary/30">
                {picked.length}/5 escolhidas
              </Badge>
            </div>

            <div className="space-y-6">
              {VIRTUES.map((v) => (
                <div key={v.name}>
                  <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                    <span className="text-base">{v.icon}</span> {v.name}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {v.strengths.map((s) => {
                      const isPicked = pickedIds.has(s.id);
                      return (
                        <motion.button
                          key={s.id}
                          onClick={(e) => togglePick(s, e)}
                          whileHover={{ y: -2, scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className={`relative text-left p-3 rounded-xl border transition-all bg-gradient-to-br ${v.color} ${
                            isPicked
                              ? "border-primary ring-2 ring-primary/40 shadow-warm"
                              : "border-border/40 hover:border-primary/40"
                          }`}
                          aria-pressed={isPicked}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-xl" aria-hidden>
                              {s.emoji}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm leading-tight">{s.name}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{s.short}</p>
                            </div>
                          </div>
                          {isPicked && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full gradient-institute flex items-center justify-center text-primary-foreground text-xs font-bold shadow-warm"
                            >
                              {picked.findIndex((p) => p.id === s.id) + 1}
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ATO 2: Pódio + contexto */}
        {act >= 2 && picked.length >= 1 && (
          <motion.section
            ref={podiumRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 p-6 rounded-3xl glass-card border border-primary/30"
          >
            <h2 className="font-display font-bold text-xl mb-2 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" /> Ato 2 · Ordene seu pódio
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Arraste para reordenar. <strong>#1 é sua âncora identitária</strong> — a que mais energiza.
            </p>

            <Reorder.Group
              axis="y"
              values={picked}
              onReorder={setPicked}
              className="space-y-2 mb-6"
            >
              {picked.map((p, i) => (
                <Reorder.Item
                  key={p.id}
                  value={p}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border cursor-grab active:cursor-grabbing hover:border-primary/40 transition"
                  whileDrag={{ scale: 1.03, boxShadow: "0 10px 30px hsl(var(--primary) / 0.3)" }}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-display font-black ${
                      i === 0
                        ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-warm"
                        : i === 1
                        ? "bg-gradient-to-br from-zinc-300 to-zinc-400 text-zinc-900"
                        : i === 2
                        ? "bg-gradient-to-br from-amber-700 to-amber-900 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="font-semibold flex-1">{p.name}</span>
                  <button
                    onClick={() => setPicked((arr) => arr.filter((x) => x.id !== p.id))}
                    className="text-xs text-muted-foreground hover:text-destructive transition px-2 py-1"
                    aria-label={`Remover ${p.name}`}
                  >
                    remover
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>

            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <Input
                placeholder="Seu nome (opcional, deixa a carta mais íntima)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Seu nome"
              />
              <Input
                placeholder="Contexto: 'fase de transição', 'maternidade nova'..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                aria-label="Contexto de vida"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={generate}
                disabled={loading || picked.length !== 5}
                className="gradient-institute text-primary-foreground"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando carta...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" /> Gerar minha Carta das Forças
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="w-4 h-4 mr-2" /> Recomeçar
              </Button>
            </div>
          </motion.section>
        )}

        {/* ATO 3: Carta */}
        <AnimatePresence>
          {act === 3 && letter && !letter.error && (
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Headline + âncora */}
              <Card className="p-8 bg-gradient-to-br from-primary/15 via-secondary/10 to-background border-primary/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/10 blur-3xl -z-10" />
                <Badge variant="outline" className="border-amber-500/40 text-amber-600 mb-3">
                  <Crown className="w-3 h-3 mr-1" /> Carta das Forças de Assinatura
                </Badge>
                <h2 className="font-display font-black text-2xl md:text-3xl text-gradient-aurora mb-4 leading-tight">
                  {letter.title}
                </h2>
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 rounded-2xl bg-background/60 backdrop-blur border border-primary/20">
                    <p className="text-xs uppercase tracking-wider text-primary font-bold mb-1">
                      ⚓ Sua âncora
                    </p>
                    <p className="font-display font-bold text-lg">{letter.anchor_strength}</p>
                    <p className="text-sm text-muted-foreground mt-2">{letter.anchor_insight}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-background/60 backdrop-blur border border-secondary/20">
                    <p className="text-xs uppercase tracking-wider text-secondary font-bold mb-1">
                      🕸️ Sinergia das 5
                    </p>
                    <p className="text-sm">{letter.synergy}</p>
                  </div>
                </div>
              </Card>

              {/* Práticas de 7 dias */}
              {Array.isArray(letter.practices) && (
                <div>
                  <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                    🌱 Práticas de 7 dias <Badge variant="secondary">para suas top 3 forças</Badge>
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {letter.practices.map((pr, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 * i }}
                      >
                        <Card className="p-5 h-full hover:shadow-warm transition border-border/60">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className="gradient-institute text-primary-foreground">#{i + 1}</Badge>
                            <span className="text-xs text-muted-foreground">{pr.day}</span>
                          </div>
                          <p className="font-display font-bold text-base mb-2">{pr.strength}</p>
                          <p className="text-sm leading-relaxed mb-3">{pr.action}</p>
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <p className="text-[11px] uppercase tracking-wider text-amber-600 font-bold mb-1">
                              ⚖️ Sombra (overuse)
                            </p>
                            <p className="text-xs text-muted-foreground italic">{pr.shadow}</p>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Letter */}
              {letter.letter && (
                <Card className="p-8 bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-background border-amber-500/30 relative">
                  <div className="absolute -top-3 left-6 px-3 py-1 rounded-full gradient-institute text-primary-foreground text-xs font-bold flex items-center gap-1 shadow-warm">
                    <Heart className="w-3 h-3" /> Do seu eu mais forte
                  </div>
                  <p className="font-serif italic text-lg leading-relaxed text-foreground/90 mt-2 whitespace-pre-wrap">
                    "{letter.letter}"
                  </p>
                </Card>
              )}

              {/* If-then anchor */}
              {letter.if_then_anchor && (
                <Card className="p-6 border-primary/30 bg-primary/5">
                  <p className="text-xs uppercase tracking-wider text-primary font-bold mb-2">
                    🎯 Frase-âncora · Implementation Intention
                  </p>
                  <p className="font-display font-bold text-lg leading-snug">{letter.if_then_anchor}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Gollwitzer & Sheeran (2006) — meta-análise n &gt; 8.000: "Se X, então Y" dobra taxa de
                    cumprimento.
                  </p>
                </Card>
              )}

              {/* Scientific basis */}
              {letter.scientific_basis && (
                <Card className="p-5 bg-muted/30 border-dashed">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">
                    📚 Base científica
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{letter.scientific_basis}</p>
                </Card>
              )}

              <div className="flex gap-2 flex-wrap pt-4">
                <Button onClick={reset} variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" /> Refazer com outras forças
                </Button>
                <Button onClick={() => navigate("/future-self")} className="gradient-institute text-primary-foreground">
                  Levar minha âncora para o Eu Futuro →
                </Button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
