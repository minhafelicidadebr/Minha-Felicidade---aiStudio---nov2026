/**
 * Espelho Cognitivo — Metacognitive AI Mirror
 * Aluno explica um conceito, IA devolve raio-X: profundidade, lacunas, vieses,
 * pergunta socrática, próximo passo, reescrita Feynman.
 * Ciência: Protégé Effect (Chase et al., 2009) + Generation Effect + Feynman Technique.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mic, Sparkles, Target, AlertTriangle, Lightbulb, Brain, Zap, RefreshCw, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NeuralBackground, useXPBurst, ConfettiCelebration, EncouragementBubble, ProgressRing } from "@/components/learning/LearningFX";
import { InsightDialog } from "@/components/learning/InsightDialog";
import { NarrativeJourney, COGNITIVE_MIRROR_CHAPTERS } from "@/components/learning/NarrativeJourney";
import { useProgress } from "@/hooks/useProgress";

const CONCEPTS = [
  "Miswanting", "Falácia G.I. Joe", "Adaptação Hedônica", "Impact Bias",
  "Comparação Social", "Conexão Social", "Atos de Bondade", "Gratidão",
  "Flow", "Savoring", "Visualização Negativa", "Mindfulness",
  "WOOP", "Implementation Intentions", "Growth Mindset",
];

type Analysis = {
  depth_score: number;
  depth_label: string;
  strengths: string[];
  gaps: { title: string; detail: string }[];
  biases_detected: { name: string; evidence: string; why: string }[];
  missing_evidence: string[];
  socratic_question: string;
  next_step: string;
  feynman_rewrite: string;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string } }>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

export default function CognitiveMirrorPage() {
  const [concept, setConcept] = useState(CONCEPTS[0]);
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [encouragement, setEncouragement] = useState(0);
  const [recording, setRecording] = useState(false);
  const { trigger: burstXP, node: xpNode } = useXPBurst();
  const { trackActivity } = useProgress();
  const { toast } = useToast();

  const wordCount = explanation.trim().split(/\s+/).filter(Boolean).length;

  const startVoice = () => {
    const speechWindow = window as SpeechRecognitionWindow;
    const SR = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SR) {
      toast({ title: "Reconhecimento de voz não suportado", description: "Use Chrome/Edge.", variant: "destructive" });
      return;
    }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let txt = "";
      for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setExplanation(prev => prev + " " + txt);
    };
    rec.onend = () => setRecording(false);
    rec.start();
    setRecording(true);
    setTimeout(() => rec.stop(), 60000);
  };

  const analyze = async () => {
    if (wordCount < 15) {
      toast({ title: "Explique com mais detalhes", description: "Pelo menos 15 palavras para uma análise rica.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke("cognitive-mirror", {
        body: { concept, explanation },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const result = data as Analysis;
      setAnalysis(result);
      burstXP(50, { clientX: window.innerWidth / 2, clientY: 200 });
      setEncouragement(t => t + 1);
      if (result.depth_score >= 70) setShowConfetti(true);
      trackActivity({
        moduleId: "all",
        activityType: "debate",
        activityId: `mirror-${concept}`,
        score: result.depth_score,
        data: { concept, explanation, analysis: result },
      });
      setTimeout(() => setShowConfetti(false), 4000);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Tente novamente.";
      toast({ title: "Erro na análise", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setAnalysis(null); setExplanation(""); };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <NeuralBackground />
      <Navbar />
      {xpNode}
      <ConfettiCelebration active={showConfetti} count={80} />
      <EncouragementBubble trigger={encouragement} />

      <div className="container mx-auto px-4 pt-24 pb-16 relative z-10 max-w-5xl">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Dashboard</Button>
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-primary/30 mb-4">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold tracking-wider uppercase">Estado da Arte • Protégé Effect + Feynman</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-black mb-3">
            <span className="holographic">Espelho Cognitivo</span> 🪞
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Ensine um conceito como se fosse para um amigo. A IA fará o raio-X da sua compreensão —
            lacunas, vieses, profundidade, e como um mestre explicaria.
          </p>

          {/* Mini CTAs — instructional design pop-outs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
            <NarrativeJourney chapters={COGNITIVE_MIRROR_CHAPTERS} cta="Modo História" emoji="📖" />
            <InsightDialog
              cta="Como funciona"
              emoji="🧭"
              variant="primary"
              subtitle="Guia rápido • 60s"
              title="3 passos para o raio-X cognitivo"
              intro="Você não está sendo testado. Está sendo escutado por um espelho que devolve metacognição em vez de reflexo."
              steps={[
                { icon: "🎯", title: "Escolha um conceito", body: "Comece pelo que você acha que domina. (Geralmente é onde os vieses se escondem melhor.)", evidence: "Dunning-Kruger Effect (1999)" },
                { icon: "🎤", title: "Explique como para um amigo", body: "Use texto OU microfone. Linguagem cotidiana > jargão acadêmico. Quanto mais simples, mais expõe lacunas reais.", evidence: "Feynman Technique" },
                { icon: "🔬", title: "Leia o raio-X com calma", body: "Pontuação, forças, lacunas, vieses citados com seu próprio texto. Releia 1×, ajuste sua próxima explicação.", evidence: "Hattie & Timperley (2007)" },
              ]}
              takeaway="Quem se ouve com clareza aprende com profundidade."
              citation="Self-Explanation Effect — Chi et al."
            />
            <InsightDialog
              cta="A ciência por trás"
              emoji="🧠"
              variant="secondary"
              subtitle="Metacognição aplicada"
              title="Por que ensinar é o melhor jeito de aprender"
              intro="Quando você se prepara para ensinar, seu cérebro entra em modo organizador. Ele para de armazenar e começa a estruturar."
              steps={[
                { icon: "👨‍🏫", title: "Protégé Effect", body: "Estudantes que estudaram para 'ensinar a outro' retiveram 28% mais que os que estudaram para uma prova. Mesmo conteúdo. Mesma duração.", evidence: "Fiorella & Mayer (2013)" },
                { icon: "🧩", title: "Self-Explanation", body: "Verbalizar o raciocínio expõe inconsistências invisíveis na leitura silenciosa. É a base da técnica Feynman.", evidence: "Chi et al. (1994)" },
                { icon: "🪞", title: "Espelhamento metacognitivo", body: "A IA devolve sua fala anotada com vieses e lacunas. Ver o próprio pensamento de fora é o motor do crescimento adulto.", evidence: "Flavell (1979) — Metacognition" },
                { icon: "📈", title: "Delta vence nota", body: "O score 0-100 importa menos que sua evolução entre tentativas. Refaça em 7 dias e compare.", evidence: "Dweck (2006) — Growth Mindset" },
              ]}
              takeaway="O espelho não corrige — ilumina. O resto é com você."
              citation="40 anos de literatura em metacognição"
            />
            <InsightDialog
              cta="E se for cringe?"
              emoji="🤗"
              variant="accent"
              subtitle="Permissão pra errar"
              title="Sim, vai parecer estranho falar sozinho"
              intro="Acolhe esse desconforto. Ele é o sinal de que circuitos novos estão sendo recrutados. (Cérebro adora reclamar antes de aprender.)"
              steps={[
                { icon: "😅", title: "Errar é o método", body: "Explicações ruins na primeira tentativa são dado, não fracasso. Elas dizem onde focar.", evidence: "Bjork — Desirable Difficulties" },
                { icon: "🎙️", title: "O microfone ajuda mesmo", body: "Se travar escrevendo, fala. A produção oral acessa memórias diferentes da escrita. Use as duas.", evidence: "Levelt (1989) — Speech Production" },
                { icon: "🔁", title: "Volte ao mesmo conceito", body: "A magia acontece na 3ª tentativa do mesmo conceito em dias diferentes. Score sobe, vieses caem.", evidence: "Spaced Practice" },
                { icon: "🧡", title: "Sem juízo, com curiosidade", body: "A IA é um espelho — não um professor severo. Trate o feedback como mapa, não como prova.", evidence: "Carl Rogers — Aprendizagem Significativa" },
              ]}
              takeaway="Ninguém aprendeu nada elegante de primeira. Todo mundo aprendeu de novo."
              citation="Brown, Roediger & McDaniel (2014)"
            />
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!analysis ? (
            <motion.div key="input" exit={{ opacity: 0, y: -20 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="p-6 glass border-primary/20">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Escolha um conceito
                </label>
                <div className="flex flex-wrap gap-2 mb-6">
                  {CONCEPTS.map(c => (
                    <button
                      key={c}
                      onClick={() => setConcept(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        concept === c
                          ? "gradient-institute text-primary-foreground shadow-warm scale-105"
                          : "bg-muted hover:bg-muted/70 text-muted-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Explique <strong className="text-primary">{concept}</strong> para um amigo
                  </label>
                  <Button
                    type="button"
                    onClick={startVoice}
                    size="sm"
                    variant={recording ? "destructive" : "outline"}
                    className="gap-2"
                  >
                    <Mic className={`w-3.5 h-3.5 ${recording ? "animate-pulse" : ""}`} />
                    {recording ? "Gravando..." : "Falar"}
                  </Button>
                </div>
                <Textarea
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  placeholder="Comece como se estivesse contando para um amigo num café... 'Sabe quando você acha que ganhar mais dinheiro vai te fazer feliz, mas não acontece? Então...'"
                  className="min-h-[200px] text-base bg-background/60 border-border focus:border-primary"
                />
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs ${wordCount >= 15 ? "text-primary" : "text-muted-foreground"}`}>
                    {wordCount} palavras {wordCount < 15 && `(mín. 15)`}
                  </span>
                  <Button
                    onClick={analyze}
                    disabled={loading || wordCount < 15}
                    className="gradient-institute gap-2"
                    size="lg"
                  >
                    {loading ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Analisando...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Espelhar minha mente</>
                    )}
                  </Button>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-xs font-bold text-primary mb-1">🧠 Por que isso funciona?</p>
                  <p className="text-xs text-muted-foreground">
                    O <strong>Protégé Effect</strong> (Chase et al., 2009) prova: ensinar algo gera 1.5–2x mais retenção
                    do que apenas estudar. A <strong>Técnica Feynman</strong> expõe lacunas que você nem sabia que tinha.
                  </p>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Score Header */}
              <Card className="p-6 glass border-primary/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -z-0" />
                <div className="relative z-10 flex items-center gap-6 flex-wrap">
                  <ProgressRing value={analysis.depth_score} size={120} label="Profundidade" />
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Diagnóstico</p>
                    <h3 className="font-display text-3xl font-black mb-2">{analysis.depth_label}</h3>
                    <p className="text-sm text-muted-foreground">
                      Você explicou <strong className="text-foreground">{concept}</strong>. Veja seu raio-X cognitivo abaixo.
                    </p>
                  </div>
                  <Button onClick={reset} variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="w-3.5 h-3.5" /> Nova explicação
                  </Button>
                </div>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Strengths */}
                {analysis.strengths?.length > 0 && (
                  <Card className="p-5 glass border-green-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <h4 className="font-display font-bold">O que você acertou</h4>
                    </div>
                    <ul className="space-y-2">
                      {analysis.strengths.map((s, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="text-green-500">✓</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* Gaps */}
                {analysis.gaps?.length > 0 && (
                  <Card className="p-5 glass border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-5 h-5 text-yellow-500" />
                      <h4 className="font-display font-bold">Lacunas detectadas</h4>
                    </div>
                    <ul className="space-y-3">
                      {analysis.gaps.map((g, i) => (
                        <li key={i} className="text-sm">
                          <p className="font-semibold">{g.title}</p>
                          <p className="text-muted-foreground text-xs mt-0.5">{g.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* Biases */}
                {analysis.biases_detected?.length > 0 && (
                  <Card className="p-5 glass border-orange-500/30 md:col-span-2">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      <h4 className="font-display font-bold">Vieses cognitivos no seu raciocínio</h4>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {analysis.biases_detected.map((b, i) => (
                        <div key={i} className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                          <p className="font-bold text-sm text-orange-500">{b.name}</p>
                          <p className="text-xs italic text-muted-foreground my-1">"{b.evidence}"</p>
                          <p className="text-xs">{b.why}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Missing Evidence */}
                {analysis.missing_evidence?.length > 0 && (
                  <Card className="p-5 glass border-blue-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-5 h-5 text-blue-500" />
                      <h4 className="font-display font-bold">Evidência que faltou citar</h4>
                    </div>
                    <ul className="space-y-1.5">
                      {analysis.missing_evidence.map((m, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="text-blue-500">📚</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* Socratic question */}
                <Card className="p-5 bg-gradient-to-br from-primary/15 to-secondary/10 border-primary/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    <h4 className="font-display font-bold">Pergunta poderosa</h4>
                  </div>
                  <p className="text-base font-medium italic">"{analysis.socratic_question}"</p>
                </Card>
              </div>

              {/* Feynman rewrite */}
              <Card className="p-6 bg-gradient-to-br from-card via-card/80 to-primary/5 border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h4 className="font-display font-bold">Como um mestre explicaria (Feynman)</h4>
                </div>
                <p className="text-base leading-relaxed font-medium">{analysis.feynman_rewrite}</p>
              </Card>

              {/* Next step */}
              <Card className="p-6 gradient-institute text-primary-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5" />
                  <h4 className="font-display font-bold uppercase text-xs tracking-widest">Próximas 24 horas</h4>
                </div>
                <p className="text-lg font-display font-bold">{analysis.next_step}</p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
