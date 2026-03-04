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
  module: string;
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
    subtitle: "Propósito, engajamento e drivers organizacionais",
    icon: "🤝",
    gradient: "navy",
    duration: "120 min",
    day: 2,
    concepts: ["Job Crafting (Wrzesniewski)", "Propósito no trabalho", "Work Wellbeing Playbook"],
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
  { id: "chatbot", icon: "🤖", title: "AlegrIA", description: "Tutora socrática com evidências científicas", color: "coral" },
  { id: "quiz", icon: "🎯", title: "Quiz Adaptativo", description: "3 níveis de dificuldade com feedback imediato", color: "gold" },
  { id: "flashcards", icon: "🃏", title: "Flashcards", description: "Repetição espaçada para consolidação", color: "navy" },
  { id: "evidence", icon: "📊", title: "Evidence Explorer", description: "Biblioteca científica curada por driver", color: "gold" },
  { id: "simulator", icon: "🎮", title: "Simulador de Decisões", description: "Cenários com consequências reais", color: "coral" },
  { id: "debate", icon: "⚔️", title: "Arena de Debate", description: "Debate socrático + mapa de argumentos", color: "navy" },
  { id: "poetry", icon: "🎭", title: "Poesia Pedagógica", description: "Poema + prática reflexiva", color: "coral" },
  { id: "codesign", icon: "🏗️", title: "Estúdio de Co-design", description: "Plano de intervenção com métricas", color: "gold" },
];

// ===================== QUIZ QUESTIONS =====================
export const quizQuestions: QuizQuestion[] = [
  // MODULE 1 — etymology
  {
    id: "q1", level: 1, module: "etymology",
    question: "Qual é a raiz etimológica da palavra 'felicidade' em latim?",
    options: ["Felicitas — do latim 'felix', significando fecundo/fértil/produtivo", "Gaudium — do latim para 'alegria intensa'", "Beatus — do latim para 'abençoado'", "Laetitia — do latim para 'contentamento'"],
    correctIndex: 0,
    explanation: "A palavra 'felicidade' vem do adjetivo latino 'felix', que significa fecundo, fértil, produtivo. A raiz proto-indo-europeia *dhe(i)* significa 'amamentar', conectando felicidade à ideia de nutrir e gerar vida.",
  },
  {
    id: "q1b", level: 2, module: "etymology",
    question: "Qual a diferença fundamental entre hedonia e eudaimonia?",
    options: ["Hedonia = prazer momentâneo; Eudaimonia = florescimento via virtude e propósito", "Ambas significam a mesma coisa em línguas diferentes", "Hedonia é oriental; Eudaimonia é ocidental", "Hedonia é científica; Eudaimonia é filosófica"],
    correctIndex: 0,
    explanation: "Hedonia refere-se ao prazer e satisfação sensorial (Kahneman), enquanto eudaimonia (Aristóteles) descreve o florescimento humano através da atividade virtuosa e do propósito de vida (Ryan & Deci, 2001).",
    source: "https://selfdeterminationtheory.org/SDT/documents/2001_RyanDeci.pdf",
  },
  // MODULE 2 — worldviews
  {
    id: "q2", level: 1, module: "worldviews",
    question: "Segundo Aristóteles, o que constitui a verdadeira felicidade (eudaimonia)?",
    options: ["A maximização do prazer sensorial", "A atividade virtuosa ao longo da vida — o encontro do pensamento e da ação", "A ausência total de sofrimento", "A acumulação de riqueza e poder"],
    correctIndex: 1,
    explanation: "Para Aristóteles, a felicidade (eudaimonia) é a atividade da alma em conformidade com a virtude (areté). Não é um estado passivo, mas uma prática ativa e contínua de excelência.",
    source: "https://plato.stanford.edu/entries/aristotle-ethics/",
  },
  {
    id: "q2b", level: 2, module: "worldviews",
    question: "O que Epicuro realmente propunha como caminho para a felicidade?",
    options: ["Busca desenfreada de prazeres sensoriais", "Ataraxia — serenidade através de prazeres simples, amizade e ausência de perturbação", "Acúmulo de riqueza material", "Isolamento total da sociedade"],
    correctIndex: 1,
    explanation: "Epicuro é frequentemente mal interpretado. Ele propunha a ataraxia (tranquilidade) através de prazeres simples, amizade profunda e libertação de medos. Seu 'hedonismo' era qualificado e moderado.",
    source: "https://plato.stanford.edu/entries/epicurus/",
  },
  // MODULE 3 — illusions
  {
    id: "q3", level: 1, module: "illusions",
    question: "De acordo com Kahneman & Deaton (2010), até qual valor aproximado de renda anual o bem-estar emocional aumenta significativamente?",
    options: ["US$ 30.000/ano", "US$ 75.000/ano", "US$ 150.000/ano", "Não há limite — sempre aumenta"],
    correctIndex: 1,
    explanation: "O estudo de Kahneman & Deaton (2010) na PNAS mostrou que o bem-estar emocional cotidiano aumenta com a renda até cerca de US$ 75.000/ano, estagnando depois. Já a 'avaliação da vida' continua subindo.",
    source: "https://www.pnas.org/doi/10.1073/pnas.1011492107",
  },
  {
    id: "q3b", level: 2, module: "illusions",
    question: "O que é 'miswanting' segundo Wilson & Gilbert?",
    options: ["Querer as coisas certas no momento errado", "Errar sistematicamente ao prever o que nos fará felizes — desejando coisas que não sustentam bem-estar", "Não querer nada na vida", "Querer demais e nunca estar satisfeito"],
    correctIndex: 1,
    explanation: "Miswanting (Wilson & Gilbert, 2003) é o fenômeno de desejar erroneamente coisas que acreditamos trazer felicidade, mas não trazem. Está ligado ao viés de affective forecasting — prever incorretamente emoções futuras.",
    source: "https://www.hbs.edu/faculty/Pages/item.aspx?num=3826",
  },
  // MODULE 4 — hedonic
  {
    id: "q4", level: 2, module: "hedonic",
    question: "O que é adaptação hedônica e por que é relevante para intervenções de bem-estar?",
    options: ["É a tendência de retornar a um nível basal de felicidade após eventos positivos ou negativos — intervenções precisam incluir variação para serem sustentáveis", "É o aumento progressivo e permanente da felicidade com cada conquista", "É a incapacidade biológica de sentir prazer por mais de 24 horas", "É um mito sem base científica"],
    correctIndex: 0,
    explanation: "A adaptação hedônica (Brickman & Campbell, 1971) descreve como nos habituamos a mudanças positivas ou negativas, retornando ao 'set point' emocional. Estratégias como variação, gratidão e novidade planejada retardam a adaptação.",
  },
  {
    id: "q4b", level: 3, module: "hedonic",
    question: "Quais são as 3 principais estratégias para retardar a adaptação hedônica segundo Lyubomirsky (2011)?",
    options: ["Meditação, exercício e dieta", "Variação nas experiências, gratidão e savoring (saborear consciente)", "Comprar coisas novas, mudar de emprego e viajar", "Terapia cognitiva, medicação e coaching"],
    correctIndex: 1,
    explanation: "Lyubomirsky (2011) identifica: (1) Variação — evitar rotina nas práticas positivas, (2) Gratidão — reconhecer ativamente o que já se tem, (3) Savoring — saborear conscientemente experiências positivas no momento presente.",
  },
  // MODULE 5 — neuro
  {
    id: "q5n", level: 1, module: "neuro",
    question: "O que Richard Davidson demonstrou sobre o bem-estar?",
    options: ["Que é impossível mudar o nível de felicidade", "Que o bem-estar é uma habilidade treinável com bases neurais identificáveis e plasticidade comprovada", "Que apenas medicamentos alteram o bem-estar", "Que o bem-estar depende 100% da genética"],
    correctIndex: 1,
    explanation: "Davidson (PNAS, 2020) demonstrou que bem-estar pode ser treinado como uma habilidade, com 4 dimensões: awareness, connection, insight e purpose. Estudos de neuroimagem mostram mudanças mensuráveis em praticantes de meditação.",
    source: "https://www.pnas.org/doi/10.1073/pnas.2014859117",
  },
  {
    id: "q7", level: 3, module: "neuro",
    question: "Por que a metáfora dos '4 neurotransmissores da felicidade' é considerada uma simplificação problemática?",
    options: ["Porque esses neurotransmissores não existem", "Porque reduz sistemas neurobiológicos complexos (circuitos, receptores, contexto) a uma causalidade linear — correlação ≠ causalidade", "Porque a felicidade depende exclusivamente da genética", "Porque apenas a dopamina é relevante"],
    correctIndex: 1,
    explanation: "[SIMPLIFICAÇÃO SINALIZADA] A neurobiologia do bem-estar envolve circuitos distribuídos (córtex pré-frontal, estriado, amígdala), múltiplos receptores e contexto. Reduzir a '4 hormônios' gera falsa causalidade linear.",
  },
  // MODULE 6 — emotions
  {
    id: "q6", level: 2, module: "emotions",
    question: "O que o estudo de Nummenmaa (PNAS, 2014) com 701 participantes demonstrou sobre emoções?",
    options: ["Que as emoções existem apenas no cérebro, sem correlatos corporais", "Que cada emoção gera padrões consistentes de ativação/desativação corporal, mapeáveis e universais", "Que apenas emoções negativas têm manifestação física", "Que emoções são culturalmente determinadas e não têm base biológica"],
    correctIndex: 1,
    explanation: "Nummenmaa et al. (2014) mostraram que 14 emoções diferentes produzem 'mapas corporais' consistentes de calor (ativação) e frio (desativação), reprodutíveis entre culturas.",
    source: "https://www.pnas.org/doi/10.1073/pnas.1321664111",
  },
  {
    id: "q6b", level: 3, module: "emotions",
    question: "Segundo James Gross, qual é a estratégia de regulação emocional mais eficaz?",
    options: ["Supressão emocional — esconder o que se sente", "Reavaliação cognitiva — reinterpretar o significado do evento emocional", "Distração — pensar em outra coisa", "Evitação — fugir de situações emocionais"],
    correctIndex: 1,
    explanation: "Gross (1998, 2002) demonstrou que a reavaliação cognitiva (cognitive reappraisal) é mais eficaz que a supressão, reduzindo tanto a experiência quanto a expressão emocional sem os custos cognitivos da supressão.",
  },
  // MODULE 7 — perma
  {
    id: "q5", level: 2, module: "perma",
    question: "Quais são os 5 pilares do modelo PERMA de Martin Seligman?",
    options: ["Poder, Eficiência, Resultados, Motivação, Autonomia", "Positive Emotions, Engagement, Relationships, Meaning, Accomplishment", "Prazer, Equilíbrio, Resiliência, Meditação, Autoconhecimento", "Performance, Energia, Rotina, Mindfulness, Atitude"],
    correctIndex: 1,
    explanation: "O PERMA (Seligman, 2011) propõe 5 elementos mensuráveis de florescimento: Emoções Positivas, Engajamento (Flow), Relacionamentos, Significado (Meaning) e Realização (Accomplishment). Com a adição de Vitalidade, torna-se PERMA+V.",
  },
  {
    id: "q5b", level: 3, module: "perma",
    question: "Qual a principal diferença entre PERMA (Seligman) e SPIRE (Ben-Shahar)?",
    options: ["SPIRE inclui dimensões Spiritual e Physical que PERMA não explicita; PERMA tem Accomplishment que SPIRE não inclui", "São modelos idênticos com nomes diferentes", "SPIRE é mais antigo que PERMA", "PERMA é para organizações e SPIRE para indivíduos"],
    correctIndex: 0,
    explanation: "PERMA foca em 5 elementos mensuráveis. SPIRE (Spiritual, Physical, Intellectual, Relational, Emotional) de Tal Ben-Shahar (Harvard) adiciona explicitamente as dimensões espiritual e física, oferecendo uma visão mais holística.",
  },
  // MODULE 8 — work
  {
    id: "q8w", level: 1, module: "work",
    question: "O que é 'Job Crafting' segundo Wrzesniewski & Dutton?",
    options: ["Mudar de emprego frequentemente", "Redesenhar proativamente as tarefas, relações e percepções do próprio trabalho para aumentar significado e engajamento", "Criar um negócio próprio", "Seguir exatamente o que a descrição de cargo determina"],
    correctIndex: 1,
    explanation: "Job Crafting (Wrzesniewski & Dutton, 2001) é o processo pelo qual colaboradores moldam proativamente seus trabalhos — alterando tarefas, relações ou a percepção cognitiva do trabalho — para criar mais propósito e engajamento.",
    source: "https://positiveorgs.bus.umich.edu/wp-content/uploads/What-is-Job-Crafting-and-Why-Does-it-Matter1.pdf",
  },
  {
    id: "q8wb", level: 2, module: "work",
    question: "Segundo o Work Wellbeing Playbook (Oxford/Indeed, 2024), quais são os principais drivers de bem-estar no trabalho?",
    options: ["Apenas salário e benefícios", "Propósito, engajamento, pertencimento, satisfação com o trabalho e energia/vitalidade", "Horário flexível e home office", "Festas corporativas e bônus anuais"],
    correctIndex: 1,
    explanation: "O Work Wellbeing Playbook identifica drivers multidimensionais: propósito, engajamento, pertencimento, satisfação e vitalidade — cada um com intervenções baseadas em evidências e métricas mensuráveis.",
    source: "https://wellbeing.hmc.ox.ac.uk/publications/work-wellbeing-playbook/",
  },
];

// ===================== FLASHCARDS =====================
export const flashcards: Flashcard[] = [
  { id: "f1", module: "etymology", front: "Felix (latim)", back: "Fecundo, fértil, produtivo — raiz etimológica de 'felicidade'. Proto-indo-europeia *dhe(i)* = amamentar.", category: "Etimologia" },
  { id: "f2", module: "etymology", front: "Eudaimonia", back: "Conceito aristotélico: florescimento humano pela atividade virtuosa. Diferente de hedonia (prazer momentâneo).", category: "Filosofia" },
  { id: "f13", module: "worldviews", front: "Estoicismo", back: "Filosofia de Epicteto, Sêneca e Marco Aurélio: serenidade via foco no controlável. 'Não são as coisas que nos perturbam, mas nossas opiniões sobre elas.'", category: "Filosofia" },
  { id: "f14", module: "worldviews", front: "Ataraxia (Epicuro)", back: "Estado de tranquilidade alcançado por prazeres simples, amizade profunda e libertação de medos. O hedonismo epicurista era moderado, não vulgar.", category: "Filosofia" },
  { id: "f3", module: "illusions", front: "Affective Forecasting", back: "Tendência a prever incorretamente a intensidade e duração de emoções futuras (Wilson & Gilbert). Base do 'miswanting'.", category: "Ilusões" },
  { id: "f4", module: "illusions", front: "Paradoxo de Easterlin", back: "Apesar do crescimento econômico, os níveis médios de felicidade permanecem estáveis desde 1940 (Myers, 2010).", category: "Economia" },
  { id: "f5", module: "hedonic", front: "Hedonic Treadmill", back: "Metáfora de Brickman & Campbell (1971): como uma esteira, corremos atrás de metas sem sair do mesmo nível de felicidade.", category: "Adaptação" },
  { id: "f6", module: "hedonic", front: "Modelo 50/40/10", back: "Lyubomirsky (2005): ~50% genética, ~40% atividades intencionais, ~10% circunstâncias. [SIMPLIFICAÇÃO — modelo heurístico, não determinístico]", category: "Modelos" },
  { id: "f9", module: "neuro", front: "Plasticidade Neural", back: "Capacidade do cérebro de se reorganizar. Davidson (PNAS, 2020): bem-estar pode ser treinado como uma habilidade.", category: "Neurociência" },
  { id: "f17", module: "neuro", front: "4 Dimensões de Davidson", back: "Awareness (atenção plena), Connection (conexão social), Insight (autoconhecimento), Purpose (propósito). Bases neurais identificáveis e treináveis.", category: "Neurociência" },
  { id: "f10", module: "emotions", front: "Mapas Corporais das Emoções", back: "Nummenmaa (PNAS, 2014): 701 participantes, 14 emoções, padrões consistentes de ativação corporal universal.", category: "Emoções" },
  { id: "f18", module: "emotions", front: "Reavaliação Cognitiva (Gross)", back: "Estratégia de regulação emocional mais eficaz: reinterpretar o significado de um evento. Reduz emoção negativa sem custos da supressão.", category: "Emoções" },
  { id: "f7", module: "perma", front: "PERMA+V", back: "P=Positive Emotions, E=Engagement, R=Relationships, M=Meaning, A=Accomplishment, V=Vitality (Seligman + extensão).", category: "Modelos" },
  { id: "f8", module: "perma", front: "SPIRE", back: "Spiritual, Physical, Intellectual, Relational, Emotional — modelo de Tal Ben-Shahar (Harvard) para bem-estar integral.", category: "Modelos" },
  { id: "f12", module: "perma", front: "Gratidão (efeitos)", back: "Meta-análises: ativa circuitos de recompensa, melhora sono, fortalece imunidade e relações sociais (Davis et al., 2016).", category: "Práticas" },
  { id: "f20", module: "work", front: "Job Crafting", back: "Wrzesniewski & Dutton (2001): redesenhar proativamente tarefas, relações e percepções do trabalho para criar significado e engajamento.", category: "Trabalho" },
  { id: "f21", module: "work", front: "Drivers de Bem-Estar no Trabalho", back: "Work Wellbeing Playbook (Oxford/Indeed, 2024): propósito, engajamento, pertencimento, satisfação e vitalidade — com intervenções baseadas em evidências.", category: "Trabalho" },
];

// ===================== EVIDENCE ITEMS =====================
export const evidenceItems: EvidenceItem[] = [
  {
    id: "e13", module: "etymology", driver: "Definições de Felicidade",
    title: "On Happiness and Human Potentials: A Review of Research on Hedonic and Eudaimonic Well-Being",
    authors: "Ryan & Deci", year: 2001,
    summary: "Revisão fundacional que distingue duas tradições: hedônica (prazer, satisfação) e eudaimônica (florescimento, propósito). Base conceitual para o campo.",
    evidenceLevel: "alto",
    url: "https://selfdeterminationtheory.org/SDT/documents/2001_RyanDeci.pdf",
  },
  {
    id: "e14", module: "worldviews", driver: "Virtudes e Forças de Caráter",
    title: "Character Strengths and Virtues: A Handbook and Classification",
    authors: "Peterson & Seligman", year: 2004,
    summary: "Classificação de 24 forças de caráter organizadas em 6 virtudes universais, encontradas em tradições filosóficas e espirituais de todas as culturas.",
    evidenceLevel: "alto",
    url: "https://www.viacharacter.org/character-strengths",
  },
  {
    id: "e15", module: "illusions", driver: "Previsão Afetiva",
    title: "Affective Forecasting: Knowing What to Want",
    authors: "Wilson & Gilbert", year: 2003,
    summary: "Revisão seminal sobre como humanos erram sistematicamente ao prever emoções futuras — o 'impact bias' leva ao miswanting.",
    evidenceLevel: "alto",
    url: "https://www.danielgilbert.com/Wilson%20&%20Gilbert%20(Advances).pdf",
  },
  {
    id: "e1", module: "perma", driver: "Emoções Positivas",
    title: "Positive Psychology Interventions: A Meta-Analysis of Randomized Controlled Trials",
    authors: "Bolier et al.", year: 2013,
    summary: "Meta-análise de 39 ECRs mostrando que intervenções de psicologia positiva melhoram significativamente bem-estar subjetivo e reduzem sintomas depressivos.",
    evidenceLevel: "alto",
    url: "https://pubmed.ncbi.nlm.nih.gov/23312004/",
  },
  {
    id: "e2", module: "perma", driver: "Emoções Positivas",
    title: "Positive Psychology Progress: Empirical Validation of Interventions",
    authors: "Seligman, Steen, Park & Peterson", year: 2005,
    summary: "Estudo seminal demonstrando eficácia de intervenções como 'três coisas boas' e 'uso de forças de caráter' na elevação da felicidade.",
    evidenceLevel: "alto",
    url: "https://pubmed.ncbi.nlm.nih.gov/16045394/",
  },
  {
    id: "e3", module: "perma", driver: "Engajamento / Flow",
    title: "Flow: The Psychology of Optimal Experience",
    authors: "Csikszentmihalyi", year: 1990,
    summary: "Obra fundacional sobre estados de flow: engajamento total em atividades desafiadoras que correspondem às habilidades do indivíduo.",
    evidenceLevel: "alto",
    url: "https://www.harpercollins.com/products/flow-mihaly-csikszentmihalyi",
  },
  {
    id: "e4", module: "perma", driver: "Relacionamentos",
    title: "Social Relationships and Mortality Risk: A Meta-analytic Review",
    authors: "Holt-Lunstad, Smith & Layton", year: 2010,
    summary: "Meta-análise de 148 estudos (308.849 participantes): relações sociais fortes aumentam chances de sobrevivência em 50%.",
    evidenceLevel: "alto",
    url: "https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1000316",
  },
  {
    id: "e5", module: "perma", driver: "Propósito / Significado",
    title: "Purpose in Life as a Predictor of Mortality",
    authors: "Hill & Turiano", year: 2014,
    summary: "Propósito de vida associado a menor mortalidade por todas as causas, independente da idade ou do status de aposentadoria.",
    evidenceLevel: "alto",
    url: "https://pubmed.ncbi.nlm.nih.gov/24630946/",
  },
  {
    id: "e6", module: "perma", driver: "Gratidão",
    title: "A Meta-Analytic Review of the Relationship Between Gratitude and Well-Being",
    authors: "Davis et al.", year: 2016,
    summary: "Intervenções de gratidão demonstram efeitos pequenos mas consistentes sobre bem-estar, mais eficazes em populações clínicas.",
    evidenceLevel: "alto",
    url: "https://pubmed.ncbi.nlm.nih.gov/26575348/",
  },
  {
    id: "e7", module: "neuro", driver: "Neurociência do Bem-Estar",
    title: "A Framework for the Neuroscience of Well-Being",
    authors: "Davidson & Schuyler (em Dahl et al., PNAS 2020)", year: 2020,
    summary: "Framework de 4 dimensões treináveis do bem-estar: awareness, connection, insight e purpose. Bases neurais identificáveis e treináveis.",
    evidenceLevel: "alto",
    url: "https://www.pnas.org/doi/10.1073/pnas.2014859117",
  },
  {
    id: "e8", module: "hedonic", driver: "Adaptação Hedônica",
    title: "Hedonic Adaptation to Positive and Negative Experiences",
    authors: "Lyubomirsky", year: 2011,
    summary: "Revisão abrangente dos mecanismos de adaptação hedônica e estratégias para retardá-la (variação, gratidão, novidade).",
    evidenceLevel: "alto",
    url: "https://sonjalyubomirsky.com/wp-content/uploads/2024/03/Lyubomirsky-2011.pdf",
  },
  {
    id: "e9", module: "emotions", driver: "Ciência das Emoções",
    title: "Bodily Maps of Emotions",
    authors: "Nummenmaa, Glerean, Hari & Hietanen", year: 2014,
    summary: "701 participantes mapearam sensações corporais para 14 emoções, revelando padrões universais e consistentes de ativação/desativação.",
    evidenceLevel: "alto",
    url: "https://www.pnas.org/doi/10.1073/pnas.1321664111",
    doi: "10.1073/pnas.1321664111",
  },
  {
    id: "e12", module: "work", driver: "Bem-Estar Organizacional",
    title: "Work Wellbeing Playbook",
    authors: "Oxford University / World Wellbeing Movement / Indeed", year: 2024,
    summary: "Playbook baseado em evidências para intervenções de bem-estar no trabalho, organizado por drivers com métricas e protocolos.",
    evidenceLevel: "alto",
    url: "https://wellbeing.hmc.ox.ac.uk/publications/work-wellbeing-playbook/",
  },
  {
    id: "e16", module: "work", driver: "Job Crafting",
    title: "Crafting a Job: Revisioning Employees as Active Crafters of Their Work",
    authors: "Wrzesniewski & Dutton", year: 2001,
    summary: "Estudo fundacional sobre como colaboradores redesenham proativamente suas tarefas, relações e percepções para criar significado no trabalho.",
    evidenceLevel: "alto",
    url: "https://positiveorgs.bus.umich.edu/wp-content/uploads/What-is-Job-Crafting-and-Why-Does-it-Matter1.pdf",
  },
];
