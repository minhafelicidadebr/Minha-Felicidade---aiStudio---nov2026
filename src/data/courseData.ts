export interface Module {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  icon: string;
  gradient: "coral" | "gold" | "navy";
  duration: string;
  day: 1 | 2;
  concepts: string[];
}

export interface QuizQuestion {
  id: string;
  level: 1 | 2 | 3;
  module: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  source?: string;
}

export interface Flashcard {
  id: string;
  module: string;
  front: string;
  back: string;
  category: string;
}

export interface EvidenceItem {
  id: string;
  driver: string;
  title: string;
  authors: string;
  year: number;
  summary: string;
  evidenceLevel: "alto" | "médio" | "exploratório";
  url: string;
  doi?: string;
}

export const modules: Module[] = [
  {
    id: "etymology",
    number: 1,
    title: "O que chamamos de Felicidade?",
    subtitle: "Etimologia, linguagem e método",
    icon: "🧭",
    gradient: "coral",
    duration: "75 min",
    day: 1,
    concepts: ["Felix = fecundo/fértil", "Hedonia vs Eudaimonia", "Bem-estar subjetivo"],
  },
  {
    id: "worldviews",
    number: 2,
    title: "Cosmovisões da Felicidade",
    subtitle: "Filosofia como bússola, espiritualidade como farol",
    icon: "🌍",
    gradient: "navy",
    duration: "105 min",
    day: 1,
    concepts: ["Aristóteles & eudaimonia", "Estoicismo", "Tradições orientais", "Diálogo ciência-espiritualidade"],
  },
  {
    id: "illusions",
    number: 3,
    title: "As Ilusões da Felicidade",
    subtitle: "Miswanting, dinheiro, consumo, corpo e performance",
    icon: "🎭",
    gradient: "gold",
    duration: "120 min",
    day: 1,
    concepts: ["Affective forecasting", "Paradoxo do dinheiro", "Materialismo e bem-estar"],
  },
  {
    id: "hedonic",
    number: 4,
    title: "Adaptação Hedônica",
    subtitle: "Por que 'volta ao normal' — e como quebrar o ciclo",
    icon: "🔄",
    gradient: "coral",
    duration: "120 min",
    day: 1,
    concepts: ["Hedonic treadmill", "Brickman & Campbell", "Práticas anti-adaptação"],
  },
  {
    id: "neuro",
    number: 5,
    title: "Neurociência do Bem-Estar",
    subtitle: "Plasticidade neural e treino de padrões cerebrais",
    icon: "🧠",
    gradient: "navy",
    duration: "105 min",
    day: 2,
    concepts: ["Davidson & neurociência afetiva", "Plasticidade neural", "Circuitos de recompensa"],
  },
  {
    id: "emotions",
    number: 6,
    title: "Ciência das Emoções",
    subtitle: "Corpo, linguagem e regulação emocional",
    icon: "💫",
    gradient: "gold",
    duration: "105 min",
    day: 2,
    concepts: ["Mapas corporais (Nummenmaa)", "Emoções como construção", "Regulação emocional (Gross)"],
  },
  {
    id: "perma",
    number: 7,
    title: "Estruturas do Bem-Estar",
    subtitle: "PERMA+V, SPIRE e práticas baseadas em evidências",
    icon: "🏛️",
    gradient: "coral",
    duration: "120 min",
    day: 2,
    concepts: ["PERMA (Seligman)", "SPIRE (Ben-Shahar)", "Gratidão", "Educação Positiva"],
  },
  {
    id: "work",
    number: 8,
    title: "Felicidade no Trabalho",
    subtitle: "Confiança, segurança psicológica e drivers organizacionais",
    icon: "🤝",
    gradient: "navy",
    duration: "120 min",
    day: 2,
    concepts: ["Segurança psicológica (Edmondson)", "Modelo de confiança", "Work Wellbeing Playbook"],
  },
];

export interface DynamicItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: "coral" | "gold" | "navy";
}

export const dynamics: DynamicItem[] = [
  { id: "chatbot", icon: "🤖", title: "Chatbot IA", description: "Assistente temático com tutoria socrática", color: "coral" },
  { id: "quiz", icon: "🎯", title: "Quiz Adaptativo", description: "3 níveis de dificuldade com feedback imediato", color: "gold" },
  { id: "flashcards", icon: "🃏", title: "Flashcards", description: "Repetição espaçada para consolidação", color: "navy" },
  { id: "videolab", icon: "🎬", title: "VideoLab", description: "Vídeos TED + quiz + prática + ação", color: "coral" },
  { id: "evidence", icon: "📊", title: "Evidence Explorer", description: "Biblioteca científica curada por driver", color: "gold" },
  { id: "trail", icon: "📋", title: "Trilha de Implementação", description: "Gera PDF técnico de 3+ páginas", color: "navy" },
  { id: "poetry", icon: "🎭", title: "Poesia Pedagógica", description: "Poema + prática reflexiva", color: "coral" },
  { id: "simulator", icon: "🎮", title: "Simulador de Decisões", description: "Cenários com consequências reais", color: "gold" },
  { id: "codesign", icon: "🏗️", title: "Estúdio de Co-design", description: "Plano de intervenção com métricas", color: "navy" },
  { id: "debate", icon: "⚔️", title: "Arena de Debate", description: "Debate socrático + mapa de argumentos", color: "coral" },
];

export const quizQuestions: QuizQuestion[] = [
  {
    id: "q1",
    level: 1,
    module: "etymology",
    question: "Qual é a raiz etimológica da palavra 'felicidade' em latim?",
    options: [
      "Felicitas — do latim 'felix', significando fecundo/fértil/produtivo",
      "Gaudium — do latim para 'alegria intensa'",
      "Beatus — do latim para 'abençoado'",
      "Laetitia — do latim para 'contentamento'",
    ],
    correctIndex: 0,
    explanation: "A palavra 'felicidade' vem do adjetivo latino 'felix', que significa fecundo, fértil, produtivo. A raiz proto-indo-europeia *dhe(i)* significa 'amamentar', conectando felicidade à ideia de nutrir e gerar vida.",
  },
  {
    id: "q2",
    level: 1,
    module: "worldviews",
    question: "Segundo Aristóteles, o que constitui a verdadeira felicidade (eudaimonia)?",
    options: [
      "A maximização do prazer sensorial",
      "A atividade virtuosa ao longo da vida — o encontro do pensamento e da ação",
      "A ausência total de sofrimento",
      "A acumulação de riqueza e poder",
    ],
    correctIndex: 1,
    explanation: "Para Aristóteles, a felicidade (eudaimonia) é a atividade da alma em conformidade com a virtude (areté). Não é um estado passivo, mas uma prática ativa e contínua de excelência.",
    source: "https://plato.stanford.edu/entries/aristotle-ethics/",
  },
  {
    id: "q3",
    level: 1,
    module: "illusions",
    question: "De acordo com Kahneman & Deaton (2010), até qual valor aproximado de renda anual o bem-estar emocional aumenta significativamente?",
    options: [
      "US$ 30.000/ano",
      "US$ 75.000/ano",
      "US$ 150.000/ano",
      "Não há limite — sempre aumenta",
    ],
    correctIndex: 1,
    explanation: "O estudo de Kahneman & Deaton (2010) na PNAS mostrou que o bem-estar emocional cotidiano aumenta com a renda até cerca de US$ 75.000/ano, estagnando depois. Já a 'avaliação da vida' continua subindo.",
    source: "https://www.pnas.org/doi/10.1073/pnas.1011492107",
  },
  {
    id: "q4",
    level: 2,
    module: "hedonic",
    question: "O que é adaptação hedônica e por que é relevante para intervenções de bem-estar?",
    options: [
      "É a tendência de retornar a um nível basal de felicidade após eventos positivos ou negativos — intervenções precisam incluir variação para serem sustentáveis",
      "É o aumento progressivo e permanente da felicidade com cada conquista",
      "É a incapacidade biológica de sentir prazer por mais de 24 horas",
      "É um mito sem base científica",
    ],
    correctIndex: 0,
    explanation: "A adaptação hedônica (Brickman & Campbell, 1971) descreve como nos habituamos a mudanças positivas ou negativas, retornando ao 'set point' emocional. Estratégias como variação, gratidão e novidade planejada retardam a adaptação.",
  },
  {
    id: "q5",
    level: 2,
    module: "perma",
    question: "Quais são os 5 pilares do modelo PERMA de Martin Seligman?",
    options: [
      "Poder, Eficiência, Resultados, Motivação, Autonomia",
      "Positive Emotions, Engagement, Relationships, Meaning, Accomplishment",
      "Prazer, Equilíbrio, Resiliência, Meditação, Autoconhecimento",
      "Performance, Energia, Rotina, Mindfulness, Atitude",
    ],
    correctIndex: 1,
    explanation: "O PERMA (Seligman, 2011) propõe 5 elementos mensuráveis de florescimento: Emoções Positivas, Engajamento (Flow), Relacionamentos, Significado (Meaning) e Realização (Accomplishment). Com a adição de Vitalidade, torna-se PERMA+V.",
  },
  {
    id: "q6",
    level: 2,
    module: "emotions",
    question: "O que o estudo de Nummenmaa (PNAS, 2014) com 701 participantes demonstrou sobre emoções?",
    options: [
      "Que as emoções existem apenas no cérebro, sem correlatos corporais",
      "Que cada emoção gera padrões consistentes de ativação/desativação corporal, mapeáveis e universais",
      "Que apenas emoções negativas têm manifestação física",
      "Que emoções são culturalmente determinadas e não têm base biológica",
    ],
    correctIndex: 1,
    explanation: "Nummenmaa et al. (2014) mostraram que 14 emoções diferentes produzem 'mapas corporais' consistentes de calor (ativação) e frio (desativação), reprodutíveis entre culturas.",
    source: "https://www.pnas.org/doi/10.1073/pnas.1321664111",
  },
  {
    id: "q7",
    level: 3,
    module: "neuro",
    question: "Por que a metáfora dos '4 neurotransmissores da felicidade' (dopamina, serotonina, ocitocina, endorfina) é considerada uma simplificação problemática?",
    options: [
      "Porque esses neurotransmissores não existem",
      "Porque reduz sistemas neurobiológicos complexos (circuitos, receptores, contexto) a uma causalidade linear — correlação ≠ causalidade",
      "Porque a felicidade depende exclusivamente da genética",
      "Porque apenas a dopamina é relevante",
    ],
    correctIndex: 1,
    explanation: "[SIMPLIFICAÇÃO SINALIZADA] A neurobiologia do bem-estar envolve circuitos distribuídos (córtex pré-frontal, estriado, amígdala), múltiplos receptores e contexto. Reduzir a '4 hormônios' gera falsa causalidade linear.",
  },
  {
    id: "q8",
    level: 3,
    module: "work",
    question: "Segundo Edmondson (1999), o que define segurança psicológica em equipes?",
    options: [
      "A garantia de emprego vitalício",
      "A crença compartilhada de que o grupo é seguro para assumir riscos interpessoais sem punição",
      "A ausência total de conflitos no ambiente de trabalho",
      "A existência de um código de conduta formal",
    ],
    correctIndex: 1,
    explanation: "Amy Edmondson define segurança psicológica como 'a crença compartilhada de que a equipe é segura para assumir riscos interpessoais' — errar, questionar, propor sem medo de humilhação ou retaliação.",
    source: "https://journals.sagepub.com/doi/10.2307/2666999",
  },
];

export const flashcards: Flashcard[] = [
  { id: "f1", module: "etymology", front: "Felix (latim)", back: "Fecundo, fértil, produtivo — raiz etimológica de 'felicidade'. Proto-indo-europeia *dhe(i)* = amamentar.", category: "Etimologia" },
  { id: "f2", module: "etymology", front: "Eudaimonia", back: "Conceito aristotélico: florescimento humano pela atividade virtuosa. Diferente de hedonia (prazer momentâneo).", category: "Filosofia" },
  { id: "f3", module: "illusions", front: "Affective Forecasting", back: "Tendência a prever incorretamente a intensidade e duração de emoções futuras (Wilson & Gilbert). Base do 'miswanting'.", category: "Ilusões" },
  { id: "f4", module: "illusions", front: "Paradoxo de Easterlin", back: "Apesar do crescimento econômico, os níveis médios de felicidade permanecem estáveis desde 1940 (Myers, 2010).", category: "Economia" },
  { id: "f5", module: "hedonic", front: "Hedonic Treadmill", back: "Metáfora de Brickman & Campbell (1971): como uma esteira, corremos atrás de metas sem sair do mesmo nível de felicidade.", category: "Adaptação" },
  { id: "f6", module: "hedonic", front: "Modelo 50/40/10", back: "Lyubomirsky (2005): ~50% genética, ~40% atividades intencionais, ~10% circunstâncias. [SIMPLIFICAÇÃO — modelo heurístico, não determinístico]", category: "Modelos" },
  { id: "f7", module: "perma", front: "PERMA+V", back: "P=Positive Emotions, E=Engagement, R=Relationships, M=Meaning, A=Accomplishment, V=Vitality (Seligman + extensão).", category: "Modelos" },
  { id: "f8", module: "perma", front: "SPIRE", back: "Spiritual, Physical, Intellectual, Relational, Emotional — modelo de Tal Ben-Shahar (Harvard) para bem-estar integral.", category: "Modelos" },
  { id: "f9", module: "neuro", front: "Plasticidade Neural", back: "Capacidade do cérebro de se reorganizar. Davidson (PNAS, 2020): bem-estar pode ser treinado como uma habilidade.", category: "Neurociência" },
  { id: "f10", module: "emotions", front: "Mapas Corporais das Emoções", back: "Nummenmaa (PNAS, 2014): 701 participantes, 14 emoções, padrões consistentes de ativação corporal universal.", category: "Emoções" },
  { id: "f11", module: "work", front: "Segurança Psicológica", back: "Edmondson (1999): crença compartilhada de que a equipe é segura para riscos interpessoais. Base da confiança organizacional.", category: "Trabalho" },
  { id: "f12", module: "perma", front: "Gratidão (efeitos)", back: "Meta-análises: ativa circuitos de recompensa, libera dopamina/serotonina, melhora sono, fortalece imunidade e relações sociais.", category: "Práticas" },
];

export const evidenceItems: EvidenceItem[] = [
  {
    id: "e1", driver: "Emoções Positivas",
    title: "Positive Psychology Interventions: A Meta-Analysis of Randomized Controlled Trials",
    authors: "Bolier et al.", year: 2013,
    summary: "Meta-análise de 39 ECRs mostrando que intervenções de psicologia positiva melhoram significativamente bem-estar subjetivo e reduzem sintomas depressivos.",
    evidenceLevel: "alto",
    url: "https://pubmed.ncbi.nlm.nih.gov/23312004/",
  },
  {
    id: "e2", driver: "Emoções Positivas",
    title: "Positive Psychology Progress: Empirical Validation of Interventions",
    authors: "Seligman, Steen, Park & Peterson", year: 2005,
    summary: "Estudo seminal demonstrando eficácia de intervenções como 'três coisas boas' e 'uso de forças de caráter' na elevação da felicidade.",
    evidenceLevel: "alto",
    url: "https://pubmed.ncbi.nlm.nih.gov/16045394/",
  },
  {
    id: "e3", driver: "Engajamento / Flow",
    title: "Flow: The Psychology of Optimal Experience",
    authors: "Csikszentmihalyi", year: 1990,
    summary: "Obra fundacional sobre estados de flow: engajamento total em atividades desafiadoras que correspondem às habilidades do indivíduo.",
    evidenceLevel: "alto",
    url: "https://www.harpercollins.com/products/flow-mihaly-csikszentmihalyi",
  },
  {
    id: "e4", driver: "Relacionamentos",
    title: "Social Relationships and Mortality Risk: A Meta-analytic Review",
    authors: "Holt-Lunstad, Smith & Layton", year: 2010,
    summary: "Meta-análise de 148 estudos (308.849 participantes): relações sociais fortes aumentam chances de sobrevivência em 50%.",
    evidenceLevel: "alto",
    url: "https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1000316",
  },
  {
    id: "e5", driver: "Propósito / Significado",
    title: "Purpose in Life as a Predictor of Mortality",
    authors: "Hill & Turiano", year: 2014,
    summary: "Propósito de vida associado a menor mortalidade por todas as causas, independente da idade ou do status de aposentadoria.",
    evidenceLevel: "alto",
    url: "https://pubmed.ncbi.nlm.nih.gov/24630946/",
  },
  {
    id: "e6", driver: "Gratidão",
    title: "A Meta-Analytic Review of the Relationship Between Gratitude and Well-Being",
    authors: "Davis et al.", year: 2016,
    summary: "Intervenções de gratidão demonstram efeitos pequenos mas consistentes sobre bem-estar, mais eficazes em populações clínicas.",
    evidenceLevel: "alto",
    url: "https://pubmed.ncbi.nlm.nih.gov/26575348/",
  },
  {
    id: "e7", driver: "Neurociência do Bem-Estar",
    title: "A Framework for the Neuroscience of Well-Being",
    authors: "Davidson & Schuyler (em Dahl et al., PNAS 2020)", year: 2020,
    summary: "Framework de 4 dimensões treináveis do bem-estar: awareness, connection, insight e purpose. Bases neurais identificáveis e treináveis.",
    evidenceLevel: "alto",
    url: "https://www.pnas.org/doi/10.1073/pnas.2014859117",
  },
  {
    id: "e8", driver: "Adaptação Hedônica",
    title: "Hedonic Adaptation to Positive and Negative Experiences",
    authors: "Lyubomirsky", year: 2011,
    summary: "Revisão abrangente dos mecanismos de adaptação hedônica e estratégias para retardá-la (variação, gratidão, novidade).",
    evidenceLevel: "alto",
    url: "https://sonjalyubomirsky.com/wp-content/uploads/2024/03/Lyubomirsky-2011.pdf",
  },
  {
    id: "e9", driver: "Ciência das Emoções",
    title: "Bodily Maps of Emotions",
    authors: "Nummenmaa, Glerean, Hari & Hietanen", year: 2014,
    summary: "701 participantes mapearam sensações corporais para 14 emoções, revelando padrões universais e consistentes de ativação/desativação.",
    evidenceLevel: "alto",
    url: "https://www.pnas.org/doi/10.1073/pnas.1321664111",
    doi: "10.1073/pnas.1321664111",
  },
  {
    id: "e10", driver: "Confiança / Trabalho",
    title: "Psychological Safety and Learning Behavior in Work Teams",
    authors: "Edmondson", year: 1999,
    summary: "Estudo fundacional mostrando que segurança psicológica é preditora de aprendizagem e performance em equipes.",
    evidenceLevel: "alto",
    url: "https://journals.sagepub.com/doi/10.2307/2666999",
  },
  {
    id: "e11", driver: "Confiança / Trabalho",
    title: "Trust in Leadership: Meta-Analytic Findings",
    authors: "Dirks & Ferrin", year: 2002,
    summary: "Meta-análise: confiança na liderança está positivamente associada a satisfação no trabalho, comprometimento organizacional e performance.",
    evidenceLevel: "alto",
    url: "https://pubmed.ncbi.nlm.nih.gov/12184567/",
  },
  {
    id: "e12", driver: "Vitalidade",
    title: "Work Wellbeing Playbook",
    authors: "Oxford University / World Wellbeing Movement / Indeed", year: 2024,
    summary: "Playbook baseado em evidências para intervenções de bem-estar no trabalho, organizado por drivers com métricas e protocolos.",
    evidenceLevel: "alto",
    url: "https://wellbeing.hmc.ox.ac.uk/publications/work-wellbeing-playbook/",
  },
];
