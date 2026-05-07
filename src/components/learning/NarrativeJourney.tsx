/**
 * NarrativeJourney — Sheet-based animated story walkthrough.
 * Empathic, slightly humorous narrative that teaches the Constellation flow
 * through cinematic chapters. Built on Cognitive Load Theory (chunking),
 * Narrative Transportation (Green & Brock, 2000) and Dual Coding (Paivio, 1971).
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sparkles, ChevronRight, ChevronLeft, BookOpen, Microscope } from "lucide-react";

export type Chapter = {
  emoji: string;
  chapter: string;
  title: string;
  hook: string;
  story: string;
  science: string;
  evidence: string;
  visual: "stars" | "web" | "spark" | "trophy" | "compass" | "mirror" | "clock" | "letter";
};

const CONSTELLATION_chapters: Chapter[] = [
  { emoji: "🌌", chapter: "Capítulo 1", title: "Você está no escuro (e tudo bem)", hook: "Sim, o mapa começa apagado. Não é bug — é pedagogia. (E, vá lá, um pouquinho de drama.)", story: "Imagine entrar numa sala com 16 lâmpadas apagadas. Você não sabe onde estão os interruptores… mas seu cérebro adora um bom mistério. Cada estrela cinza é uma pergunta esperando resposta.", science: "O efeito da curiosidade ativa o circuito dopaminérgico do hipocampo, aumentando em até 30% a memorização do que vem depois. Aprender é detetive, não palestra.", evidence: "Gruber, Gelman & Ranganath (2014), Neuron", visual: "stars" },
  { emoji: "👆", chapter: "Capítulo 2", title: "Clique. (A mágica é literalmente no dedo.)", hook: "Você toca uma estrela e — pluf — ela acende. Parabéns: acabou de fazer ciência da memória sem perceber.", story: "Cada clique é um ato de recuperação ativa: seu cérebro pergunta 'o que será isso?' antes de receber a resposta. Esse mini-suspense vale mais do que reler 10 vezes o mesmo PDF.", science: "Recuperação ativa (testing effect) supera releitura passiva em todas as métricas de retenção a longo prazo.", evidence: "Karpicke & Roediger (2008), Science", visual: "spark" },
  { emoji: "🕸️", chapter: "Capítulo 3", title: "As linhas que você jurava serem decoração", hook: "Aquelas linhas tracejadas? Não são enfeite de festa junina. São pontes neurais reais.", story: "Quando duas estrelas próximas acendem, a linha entre elas vira sólida. Passe o mouse e descubra por que 'Gratidão' segura a mão de 'Adaptação Hedônica' há décadas na literatura.", science: "Conhecimento conectado a 3+ outros conceitos tem retenção até 7× maior que conhecimento isolado. Seu cérebro literalmente esquece o que vive sozinho.", evidence: "Collins & Loftus (1975) — Spreading Activation", visual: "web" },
  { emoji: "✍️", chapter: "Capítulo 4", title: "Escreva. Sim, com suas palavras (não as do Yale).", hook: "O campo de reflexão parece pequeno. Ele não é. É um músculo cognitivo disfarçado de textarea.", story: "Quando você descreve como aplicaria 'Savoring' no seu domingo, dois processos acontecem: o conceito vira pessoal e a memória vira biográfica. E memórias biográficas? Praticamente imortais.", science: "O Generation Effect mostra que produzir conteúdo (vs. ler) gera +50% de retenção. Vinte caracteres bem escritos valem mais que vinte páginas relidas.", evidence: "Bertsch et al. (2007), meta-análise (n=86 estudos)", visual: "spark" },
  { emoji: "🏆", chapter: "Capítulo 5", title: "5, 10, 16: o cérebro adora marcos", hook: "Sim, vão pipocar troféus. Não, não é infantil. É neurobiologia operando a seu favor.", story: "A cada 5 estrelas acesas, sua dopamina recebe um pequeno tapinha nas costas. Dopamina, ao contrário do que dizem por aí, não é a 'molécula do prazer' — é a molécula da motivação para repetir.", science: "Reforços intermitentes e marcos visíveis sustentam hábito mais que recompensas grandes e raras. É o mesmo princípio de jogos bem desenhados.", evidence: "Schultz (2016), Nature Reviews Neuroscience", visual: "trophy" },
  { emoji: "♻️", chapter: "Capítulo 6", title: "Volte amanhã. Sério, volte.", hook: "Sabe aquele 'depois eu vejo'? Aqui ele é cientificamente recomendado.", story: "Reabrir a constelação em dias diferentes ativa Spaced Repetition — o método mais documentado de retenção a longo prazo. Em 21 dias, esse mapa não está mais na tela: está em você.", science: "Intervalos crescentes entre revisões (1d → 3d → 7d) consolidam memória semântica de forma mais durável que estudo concentrado.", evidence: "Cepeda et al. (2006), Psychological Bulletin", visual: "compass" },
];

export const COGNITIVE_MIRROR_chapters: Chapter[] = [
  { emoji: "🪞", chapter: "Capítulo 1", title: "Bem-vindo ao espelho que não mente", hook: "Diferente do espelho do banheiro às 7h da manhã, este aqui não te bajula. (Mas também não te julga.)", story: "Você escolhe um conceito e explica em voz alta — como se um amigo curioso de 12 anos pedisse. A IA escuta cada palavra e devolve um raio-X da sua compreensão real, não da que você acha que tem.", science: "O 'Protégé Effect' mostra que ensinar gera 28% mais retenção que estudar para uma prova. Explicar em voz alta força o cérebro a organizar lacunas que ficariam invisíveis na leitura.", evidence: "Fiorella & Mayer (2013), Journal of Educational Psychology", visual: "mirror" },
  { emoji: "🎤", chapter: "Capítulo 2", title: "O microfone é seu melhor professor", hook: "Sim, é estranho falar sozinho. (Pergunte a qualquer cientista falando com ratos.)", story: "Quando você verbaliza, dois sistemas se ativam: o que produz a fala e o que escuta a si mesmo. Essa dupla checagem é exatamente o que Feynman fazia rabiscando em quadros vazios para sentir onde travava.", science: "Pensar em voz alta (think-aloud) revela vieses metacognitivos que escapam ao silêncio mental. É a base da técnica Feynman e do método socrático moderno.", evidence: "Chi et al. (1994) — Self-Explanation Effect", visual: "spark" },
  { emoji: "🔍", chapter: "Capítulo 3", title: "O raio-X dos seus vieses", hook: "Se aparecer 'viés do otimismo' no seu resultado, respira. Quase todo mundo aparece com pelo menos um. (Inclusive psicólogos.)", story: "A IA mapeia trechos exatos da sua fala para vieses cognitivos catalogados (confirmação, projeção, falácia G.I. Joe…). Ver o viés nomeado é o primeiro passo para desarmá-lo.", science: "Kahneman mostra que vieses não desaparecem com força de vontade — eles diminuem quando aprendemos a reconhecê-los em flagrante. Nomear é o antídoto.", evidence: "Kahneman (2011) — Thinking, Fast and Slow", visual: "web" },
  { emoji: "📊", chapter: "Capítulo 4", title: "Profundidade 0–100: nem nota, nem ego", hook: "Não é prova. Não vai pra escola. Ninguém te dá medalha por 98 — e ninguém te chama no Conselho por 42.", story: "O 'depth_score' mostra quão profunda foi sua explicação naquele momento, naquele conceito. Em 7 dias você refaz e vê movimento. Esse delta é o que importa.", science: "Crescimento mensurável + feedback específico = motivação intrínseca sustentável. Notas absolutas viram ranking; deltas viram identidade.", evidence: "Dweck (2006); Hattie & Timperley (2007) — Power of Feedback", visual: "trophy" },
  { emoji: "🔁", chapter: "Capítulo 5", title: "Reescreva no estilo Feynman", hook: "Quando a IA devolve uma versão Feynman da sua fala, é meio que humilhante e libertador ao mesmo tempo. (Muito útil.)", story: "A reescrita não é correção — é exemplo. Mostra como o mesmo conteúdo soa quando passa pelo crivo da clareza extrema. Você compara, ajusta sua próxima explicação, e o ciclo recomeça melhor.", science: "Worked examples reduzem carga cognitiva extrínseca e aceleram a transferência de habilidade do novato para o expert.", evidence: "Sweller, van Merriënboer & Paas (1998)", visual: "compass" },
];

export const FUTURE_SELF_chapters: Chapter[] = [
  { emoji: "⏳", chapter: "Capítulo 1", title: "O eu de daqui a 5 anos é um estranho", hook: "Sério: estudos de fMRI mostram que seu cérebro trata o 'eu futuro' como se fosse outra pessoa. Tipo, um colega de trabalho distante.", story: "É por isso que adiar economia, exercício e gratidão parece fácil — você está ajudando 'aquela outra pessoa lá no futuro'. Esta tela existe pra fazer essa pessoa virar você de novo.", science: "Quanto mais o córtex pré-frontal medial (mPFC) ativa pensando em si mesmo no futuro, mais decisões pró-futuro o presente toma. EFT é o ginásio desse músculo.", evidence: "Hershfield et al. (2011), Journal of Marketing Research", visual: "clock" },
  { emoji: "✍️", chapter: "Capítulo 2", title: "Específico vence inspirador", hook: "'Ser uma pessoa melhor' é lindo no Pinterest. Aqui, não funciona. ('Caminhar 20min/dia' funciona.)", story: "Quanto mais concreto o hábito, mais vívida a cena que a IA constrói. O cérebro precisa de detalhes sensoriais para 'visitar' o futuro — não de slogans motivacionais.", science: "Imagens mentais detalhadas ativam regiões sensoriais reais. Visualizar com nitidez muda escolhas tanto quanto experiências de fato vividas.", evidence: "Atance & O'Neill (2001) — Episodic Future Thinking", visual: "spark" },
  { emoji: "🌅", chapter: "Capítulo 3", title: "Cinco horizontes, cinco versões de você", hook: "1 semana, 1 mês, 6 meses, 1 ano, 5 anos. (Sim, 5 anos parece exagero. Não é.)", story: "Cada cena traz métrica mensurável e um risco realista. Não é otimismo cego — é Mental Contrasting: você sente o ganho e antecipa o tropeço, na mesma respiração.", science: "Apenas sonhar relaxa o cérebro e reduz ação. Sonhar + contrastar com obstáculos aumenta execução real. É a fórmula WOOP em ação.", evidence: "Oettingen (2014) — Rethinking Positive Thinking", visual: "stars" },
  { emoji: "💌", chapter: "Capítulo 4", title: "A carta do seu eu futuro (não chore)", hook: "Tudo bem chorar. (A gente não conta.)", story: "Cartas autobiográficas do futuro reduzem desconto temporal e aumentam comportamento pró-poupança em até 60% em estudos com fMRI. Aqui é a mesma técnica, em formato envelope animado.", science: "Quando o eu-futuro deixa de ser 'estranho' e vira 'amigo íntimo', o cérebro recalibra impulsos do presente automaticamente. Menos esforço, mais aderência.", evidence: "Hershfield (2011); Bartels & Urminsky (2011)", visual: "letter" },
  { emoji: "🎯", chapter: "Capítulo 5", title: "Se X, então Y: a frase mágica", hook: "Não é mantra de coach. É a sentença que dobra taxa de cumprimento de objetivos em 94 estudos.", story: "A 'frase-âncora' (Implementation Intention) ao final transforma intenção vaga em gatilho automático. 'Se forem 18h, então calço o tênis e saio.' Cérebro adora regras claras.", science: "Quando 'se X' acontece, o cérebro executa 'então Y' antes da racionalização entrar em cena. Pré-decisão > força de vontade.", evidence: "Gollwitzer & Sheeran (2006), meta-análise n>8.000", visual: "trophy" },
];



function ChapterVisual({ visual }: { visual: Chapter["visual"] }) {
  return (
    <div className="relative h-40 w-full rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-secondary/10 to-background border border-primary/20">
      {visual === "stars" && (
        <>
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary"
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
              animate={{ opacity: [0.1, 1, 0.1], scale: [0.5, 1.5, 0.5] }}
              transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
        </>
      )}
      {visual === "spark" && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-20 h-20 text-primary opacity-60" />
        </motion.div>
      )}
      {visual === "web" && (
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {[
            [30, 50, 100, 30],
            [100, 30, 170, 50],
            [30, 50, 100, 80],
            [100, 80, 170, 50],
            [100, 30, 100, 80],
          ].map(([x1, y1, x2, y2], i) => (
            <motion.line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="hsl(var(--primary))" strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: i * 0.15, repeat: Infinity, repeatType: "reverse", repeatDelay: 1 }}
            />
          ))}
          {[[30, 50], [100, 30], [170, 50], [100, 80]].map(([cx, cy], i) => (
            <motion.circle
              key={i} cx={cx} cy={cy} r="5" fill="hsl(var(--primary))"
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </svg>
      )}
      {visual === "trophy" && (
        <div className="absolute inset-0 flex items-center justify-center text-7xl">
          <motion.span animate={{ rotate: [-5, 5, -5], scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
            🏆
          </motion.span>
        </div>
      )}
      {visual === "compass" && (
        <div className="absolute inset-0 flex items-center justify-center text-7xl">
          <motion.span animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
            🧭
          </motion.span>
        </div>
      )}
      {visual === "mirror" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-24 h-32 rounded-full border-4 border-primary/60 bg-gradient-to-br from-primary/10 to-secondary/20"
            animate={{ boxShadow: ["0 0 20px hsl(var(--primary)/0.3)", "0 0 60px hsl(var(--primary)/0.7)", "0 0 20px hsl(var(--primary)/0.3)"] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          <motion.span className="absolute text-5xl" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.5, repeat: Infinity }}>🪞</motion.span>
        </div>
      )}
      {visual === "clock" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-32 h-32">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary)/0.4)" strokeWidth="2" />
            <motion.line x1="50" y1="50" x2="50" y2="20" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"
              style={{ originX: "50px", originY: "50px" }}
              animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
            <motion.line x1="50" y1="50" x2="50" y2="28" stroke="hsl(var(--secondary))" strokeWidth="1.5" strokeLinecap="round"
              style={{ originX: "50px", originY: "50px" }}
              animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} />
            <circle cx="50" cy="50" r="3" fill="hsl(var(--primary))" />
          </svg>
        </div>
      )}
      {visual === "letter" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div className="relative text-6xl" animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }} transition={{ duration: 3, repeat: Infinity }}>
            💌
            <motion.span className="absolute -top-2 -right-3 text-2xl" animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.5, repeat: Infinity }}>✨</motion.span>
          </motion.div>
        </div>
      )}
    </div>
  );
}

type Props = {
  chapters?: Chapter[];
  cta?: string;
  emoji?: string;
};

export function NarrativeJourney({ chapters = CONSTELLATION_chapters, cta = "Modo História", emoji = "📖" }: Props = {}) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const ch = chapters[i];
  const last = i === chapters.length - 1;

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (v) setI(0); }}>
      <SheetTrigger asChild>
        <button className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-500/5 border border-fuchsia-500/40 text-fuchsia-400 backdrop-blur text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-105 hover:shadow-lg">
          <span className="text-sm group-hover:rotate-12 transition-transform">📖</span>
          <span>Modo História</span>
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0 bg-gradient-to-br from-card via-card to-primary/5 border-primary/30">
        {/* Sticky chapter header */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-card/80 border-b border-border px-6 pt-6 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Jornada Narrada • {chapters.length} capítulos</p>
          </div>
          <div className="flex items-center gap-1">
            {chapters.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                className={`h-1.5 flex-1 rounded-full transition-all ${idx <= i ? "gradient-institute" : "bg-muted"}`}
                aria-label={`Capítulo ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35 }}
            className="px-6 py-5 space-y-4"
          >
            {/* Title block */}
            <div className="flex items-start gap-3">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-14 h-14 rounded-2xl gradient-institute flex items-center justify-center text-3xl shrink-0 shadow-premium"
              >
                {ch.emoji}
              </motion.div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{ch.chapter}</p>
                <h3 className="font-display text-2xl font-black leading-tight">{ch.title}</h3>
              </div>
            </div>

            {/* Visual */}
            <ChapterVisual visual={ch.visual} />

            {/* Hook (humor) */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm font-medium italic text-amber-300">💬 {ch.hook}</p>
            </div>

            {/* Story */}
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">A história</p>
              <p className="text-sm leading-relaxed text-foreground/90">{ch.story}</p>
            </div>

            {/* Science */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
              <div className="flex items-start gap-2">
                <Microscope className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">A ciência</p>
                  <p className="text-sm leading-relaxed">{ch.science}</p>
                  <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> {ch.evidence}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Sticky footer nav */}
        <div className="sticky bottom-0 backdrop-blur-xl bg-card/80 border-t border-border px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => setI(s => Math.max(0, s - 1))}
            disabled={i === 0}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="text-[10px] text-muted-foreground">{i + 1} / {chapters.length}</span>
          {!last ? (
            <button
              onClick={() => setI(s => Math.min(chapters.length - 1, s + 1))}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1 rounded-full gradient-institute text-primary-foreground text-xs font-bold"
            >
              Começar a explorar ✨
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
