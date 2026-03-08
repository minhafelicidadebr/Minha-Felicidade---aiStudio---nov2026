export interface Module {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  icon: string;
  gradient: "coral" | "gold" | "navy";
  duration: string;
  week: 1 | 2 | 3 | 4 | 5;
  concepts: string[];
}

export interface VideoLesson {
  id: string;
  module: string;
  order: number;
  title: string;
  titlePt: string;
  youtubeId: string;
  duration?: string;
  summary: string;
  rewirement?: string;
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
    id: "mentiras",
    number: 1,
    title: "As Grandes Mentiras Sobre Ser Feliz",
    subtitle: "O Falso Algoritmo da Vida Perfeita: Desvendando o Miswanting",
    icon: "🎭",
    gradient: "coral",
    duration: "61 min vídeo",
    week: 1,
    concepts: ["Miswanting", "Misconceptions", "Falácia de G.I. Joe", "Motivação extrínseca vs intrínseca"],
  },
  {
    id: "expectativas",
    number: 2,
    title: "O Bug das Expectativas",
    subtitle: "As 'Features Irritantes' que Sabotam Sua Satisfação",
    icon: "🐛",
    gradient: "navy",
    duration: "64 min vídeo",
    week: 2,
    concepts: ["Annoying Features of the Mind", "Adaptação Hedônica", "Pontos de Referência", "Impact Bias"],
  },
  {
    id: "rewirements",
    number: 3,
    title: "O Que Realmente Funciona (De Verdade!)",
    subtitle: "Os 6 Rewirements que a Ciência Prova Aumentarem sua Felicidade",
    icon: "⚡",
    gradient: "gold",
    duration: "144 min vídeo",
    week: 3,
    concepts: ["Regra do 40%", "Conexão Social", "Atos de Bondade", "Gratidão", "Flow", "Sono & Exercício", "Time Affluence"],
  },
  {
    id: "hacks",
    number: 4,
    title: "Hackeando o Cérebro para Sentir-se Melhor",
    subtitle: "Cheat Codes para a Mente: Estratégias para Proteger Sua Alegria",
    icon: "🧠",
    gradient: "coral",
    duration: "72 min vídeo",
    week: 4,
    concepts: ["Savoring", "Visualização Negativa", "Reset de Pontos de Referência", "Mindfulness", "Investir em Experiências"],
  },
  {
    id: "habitos",
    number: 5,
    title: "Virando o Jogo da Vida Real",
    subtitle: "Hacking Hábito: O Setup de Resiliência Para Manter o Bem-Estar Para Sempre",
    icon: "🚀",
    gradient: "navy",
    duration: "69 min vídeo",
    week: 5,
    concepts: ["WOOP", "Implementation Intentions", "Growth Mindset", "Hacking Habits", "Design de Ambiente"],
  },
];

// ===================== VIDEO LESSONS =====================
export const videoLessons: VideoLesson[] = [
  // MODULE 1 — mentiras
  { id: "v1", module: "mentiras", order: 1, title: "Become Happier by Learning & Applying Psychological Science", titlePt: "Fique Mais Feliz Aprendendo e Aplicando a Ciência Psicológica", youtubeId: "s-00jpvglb8", duration: "12 min", summary: "Abertura do curso de Yale: por que estamos buscando felicidade nos lugares errados e como a ciência pode nos guiar melhor que a intuição." },
  { id: "v2", module: "mentiras", order: 2, title: "Why This Course Exists", titlePt: "Por Que Este Curso Existe", youtubeId: "y5s3uunbnSQ", duration: "8 min", summary: "A Dra. Laurie Santos explica a crise de bem-estar entre estudantes e por que a aula mais popular de Yale nasceu." },
  { id: "v3", module: "mentiras", order: 3, title: "What is the G.I. Joe Fallacy?", titlePt: "O que é a Falácia de G.I. Joe?", youtubeId: "YslKo9KkNi4", duration: "6 min", summary: "Saber não é suficiente: por que o conhecimento sozinho não muda comportamento. Esta aula não é sobre saber, é sobre FAZER." },
  { id: "v4", module: "mentiras", order: 4, title: "What We Get Wrong About Happiness: A Good Job", titlePt: "O Que Erramos Sobre Felicidade: Um Bom Emprego", youtubeId: "A7jW_h6b6RM", duration: "10 min", summary: "A ciência mostra que buscar um emprego apenas pelo status ou salário tem rendimentos decrescentes sobre a satisfação de vida." },
  { id: "v5", module: "mentiras", order: 5, title: "What We Get Wrong About Happiness: Money", titlePt: "O Que Erramos Sobre Felicidade: Dinheiro", youtubeId: "ReN52M1gO4Q", duration: "11 min", summary: "Acima de um nível que cobre necessidades básicas, ganhar mais dinheiro tem impacto limitado no bem-estar emocional (Kahneman & Deaton)." },
  { id: "v6", module: "mentiras", order: 6, title: "Awesome Stuff, True Love, Perfect Body & Good Grades", titlePt: "Coisas Incríveis, Amor Verdadeiro, Corpo Perfeito e Notas Perfeitas", youtubeId: "ScoBnbxg_JU", duration: "14 min", summary: "As 6 coisas que a sociedade diz que trazem felicidade — mas que os dados desmentem. Bens materiais, corpo ideal, notas, status." },
  { id: "v8", module: "mentiras", order: 7, title: "Happiness Misconceptions Q&A", titlePt: "Perguntas e Respostas: Equívocos Sobre Felicidade", youtubeId: "hx1juaJLcA4", duration: "10 min", summary: "Sessão de perguntas e respostas sobre os principais mitos da felicidade desmontados neste módulo." },
  // MODULE 2 — expectativas
  { id: "v7", module: "expectativas", order: 1, title: "Annoying Features of The Mind", titlePt: "As 'Features Irritantes' da Mente", youtubeId: "ZI_Q5NGtSik", duration: "15 min", summary: "Quatro características da mente que sabotam nossa felicidade: ilusão de ótica emocional, comparação social, adaptação hedônica e exagero fatal." },
  { id: "v9", module: "expectativas", order: 2, title: "Miswanting: The Bias That's Sabotaging Your Happiness", titlePt: "Miswanting: O Viés que Sabota Sua Felicidade", youtubeId: "tH5fwcIitIU", duration: "12 min", summary: "Como nosso cérebro cria ilusões sobre o futuro e nos faz desejar coisas que não trazem felicidade sustentável." },
  { id: "v10", module: "expectativas", order: 3, title: "Why Having More Doesn't Make You Happier", titlePt: "Por Que Ter Mais Não Te Faz Mais Feliz", youtubeId: "_5qGVpy4-mc", duration: "10 min", summary: "A esteira hedônica em ação: por que cada conquista perde o brilho e buscamos sempre a próxima coisa." },
  { id: "v11", module: "expectativas", order: 4, title: "The Science of Hedonic Adaptation", titlePt: "A Ciência da Adaptação Hedônica", youtubeId: "MJr-43grEzw", duration: "11 min", summary: "O mecanismo psicológico que faz nosso baseline emocional se reajustar após eventos positivos ou negativos." },
  { id: "v12", module: "expectativas", order: 5, title: "Focalism and Immune Neglect", titlePt: "Focalismo e Negligência Imunológica", youtubeId: "hCzm1XvxRPg", duration: "9 min", summary: "Por que superestimamos o impacto emocional de eventos futuros (Impact Bias) — tanto em tragédias quanto em triunfos." },
  { id: "v13", module: "expectativas", order: 6, title: "Miswanting: How Your Mind Tricks You into Wanting the Wrong Stuff", titlePt: "Miswanting: Como Sua Mente Te Engana para Desejar as Coisas Erradas", youtubeId: "megBHgELA88", duration: "13 min", summary: "Aprofundamento em como o affective forecasting nos faz prever incorretamente nossas emoções futuras." },
  { id: "v14", module: "expectativas", order: 7, title: "How Social Comparison Impacts Our Happiness", titlePt: "Como a Comparação Social Impacta Nossa Felicidade", youtubeId: "ba4Q_S6cFEI", duration: "10 min", summary: "O paradoxo da medalha de prata: por que seu cérebro pensa em termos relativos e como isso gera inveja e insatisfação." },
  // MODULE 3 — rewirements
  { id: "v19", module: "rewirements", order: 1, title: "Use Your Signature Strengths", titlePt: "Use Suas Forças de Caráter", youtubeId: "tteShB3_EnA", duration: "12 min", summary: "Descubra suas forças de caráter e como usá-las leva ao estado de Flow — quando o tempo 'derrete' porque a atividade é intrinsecamente recompensadora." },
  { id: "v20", module: "rewirements", order: 2, title: "Want to Be Happier? Do Kind Things", titlePt: "Quer Ser Mais Feliz? Faça Coisas Gentis", youtubeId: "A3CKhwB7LTU", duration: "10 min", summary: "Atos de Bondade Aleatórios (AOKs) proporcionam aumento de bem-estar maior do que gastar dinheiro consigo mesmo." },
  { id: "v21", module: "rewirements", order: 3, title: "Interview with Elizabeth Dunn", titlePt: "Entrevista com Elizabeth Dunn", youtubeId: "f6rAQt-iwA8", duration: "15 min", summary: "Pesquisadora explica por que gastar com outros gera mais felicidade — a ciência da generosidade e do dinheiro bem gasto." },
  { id: "v22", module: "rewirements", order: 4, title: "More Friends, More Happiness?", titlePt: "Mais Amigos, Mais Felicidade?", youtubeId: "nbrCu6pliu0", duration: "11 min", summary: "Conexão social é o maior preditor de bem-estar. Até interações superficiais com estranhos aumentam a felicidade." },
  { id: "v23", module: "rewirements", order: 5, title: "Interview with Nicholas Epley", titlePt: "Entrevista com Nicholas Epley", youtubeId: "y9oq2X9RPlM", duration: "14 min", summary: "O psicólogo social explica por que subestimamos o prazer de conversar com estranhos — e como conexão real combate isolamento." },
  { id: "v24", module: "rewirements", order: 6, title: "The Psychology of Time Affluence", titlePt: "A Psicologia da Abundância de Tempo", youtubeId: "ilRNAQ76Vsg", duration: "10 min", summary: "Priorizar tempo sobre dinheiro. Abundância de tempo (Time Affluence) como recurso hedônico supremo." },
  { id: "v26", module: "rewirements", order: 7, title: "Want to Be Happier? Prioritize Exercise and Sleep", titlePt: "Quer Ser Mais Feliz? Priorize Exercício e Sono", youtubeId: "m3C5elUqIjU", duration: "12 min", summary: "Exercício como modulador de humor e sono (7+ horas) como base crítica para saúde mental e autorregulação." },
  { id: "v27", module: "rewirements", order: 8, title: "Happiness Q&A: Why Helping Others Helps You Too", titlePt: "Por Que Ajudar os Outros Ajuda Você Também", youtubeId: "0o5yvyRy_vI", duration: "9 min", summary: "O altruísmo é um hack para felicidade imediata — a ciência explica o 'helper's high' e seus benefícios duradouros." },
  // MODULE 4 — hacks
  { id: "v15", module: "hacks", order: 1, title: "Rethink 'Awesome Stuff'", titlePt: "Repense 'Coisas Incríveis'", youtubeId: "Ukux0tFLPfA", duration: "8 min", summary: "Como contramedida ao materialismo: investir em experiências ao invés de objetos para combater a adaptação hedônica." },
  { id: "v16", module: "hacks", order: 2, title: "Want to Be Happier? Thwart Hedonic Adaptation", titlePt: "Quer Ser Mais Feliz? Frustre a Adaptação Hedônica", youtubeId: "yTNcCnZBXd0", duration: "11 min", summary: "Savoring: o ato de sair de uma experiência para revisá-la e apreciá-la intencionalmente, prolongando emoções positivas." },
  { id: "v17", module: "hacks", order: 3, title: "Reset Your Reference Points", titlePt: "Resete Seus Pontos de Referência", youtubeId: "NzkVWHyBH70", duration: "12 min", summary: "Técnicas para combater a comparação social: re-experimentar concretamente, observar referências descendentes, interromper consumo." },
  { id: "v18", module: "hacks", order: 4, title: "Q&A: How Can We Overcome Our Biases?", titlePt: "Como Superar Nossos Vieses?", youtubeId: "xNiMxUHtd1c", duration: "10 min", summary: "Perguntas e respostas sobre estratégias práticas para neutralizar os vieses cognitivos que minam o bem-estar." },
  { id: "v25", module: "hacks", order: 5, title: "Mind Wandering and Happiness", titlePt: "Divagação Mental e Felicidade", youtubeId: "q_4PWjrNpns", duration: "10 min", summary: "A mente divaga ~50% do tempo e isso reduz a felicidade. Meditação/Mindfulness treina a atenção e combate o mind-wandering." },
  { id: "v31", module: "hacks", order: 6, title: "Are Some Meditation Techniques Better Than Others?", titlePt: "Algumas Técnicas de Meditação São Melhores Que Outras?", youtubeId: "yArW8yxtBas", duration: "8 min", summary: "Comparação de técnicas de meditação e seus efeitos diferenciais no bem-estar, atenção e regulação emocional." },
  // MODULE 5 — habitos
  { id: "v28", module: "habitos", order: 1, title: "Why Knowing What Makes You Happy Isn't Enough", titlePt: "Por Que Saber o Que Te Faz Feliz Não é Suficiente", youtubeId: "w98MSEWJWFs", duration: "13 min", summary: "A Falácia de G.I. Joe na prática: como transformar intenções em ações automáticas com estratégias de hacking de hábitos." },
  { id: "v29", module: "habitos", order: 2, title: "How to Achieve Your Goals", titlePt: "Como Alcançar Seus Objetivos", youtubeId: "u1fryeGFJCs", duration: "11 min", summary: "WOOP (Wish, Outcome, Obstacle, Plan) e Implementation Intentions: ferramentas para transformar metas abstratas em ações concretas." },
  { id: "v30", module: "habitos", order: 3, title: "The Science of Motivation with Gabriele Oettingen", titlePt: "A Ciência da Motivação com Gabriele Oettingen", youtubeId: "5BKv43oOz4g", duration: "15 min", summary: "A criadora do WOOP explica Mental Contrasting e como visualizar obstáculos (não apenas resultados) fortalece a motivação." },
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
  // MODULE 1 — mentiras
  {
    id: "q1a", level: 1, module: "mentiras",
    question: "Segundo a Dra. Laurie Santos, por que nosso 'GPS emocional' está errado?",
    options: ["Porque somos preguiçosos demais para buscar felicidade", "Porque nossa intuição sobre o que nos fará felizes está frequentemente errada (Miswanting)", "Porque a felicidade não existe realmente", "Porque só a genética determina nossa felicidade"],
    correctIndex: 1,
    explanation: "Miswanting (Wilson & Gilbert, 2003) é o fenômeno de desejar erroneamente coisas que acreditamos trazer felicidade. Nossa intuição sobre o que nos fará felizes é frequentemente equivocada — buscamos nos lugares errados.",
    source: "https://www.hbs.edu/faculty/Pages/item.aspx?num=3826",
  },
  {
    id: "q1b", level: 2, module: "mentiras",
    question: "O que é a 'Falácia de G.I. Joe'?",
    options: ["A crença de que filmes de ação aumentam a felicidade", "A ideia de que 'saber já é metade da batalha' — quando na verdade saber NÃO é suficiente para mudar comportamento", "Uma técnica militar de autocontrole", "A crença de que homens são mais felizes que mulheres"],
    correctIndex: 1,
    explanation: "A Falácia de G.I. Joe refere-se ao lema 'knowing is half the battle' (saber é metade da batalha). Na realidade, saber que dinheiro não compra felicidade não impede você de sentir inveja ao ver posts de luxo no Instagram. Conhecimento é MENOS da metade da batalha.",
  },
  {
    id: "q1c", level: 2, module: "mentiras",
    question: "De acordo com Kahneman & Deaton (2010), até qual valor aproximado de renda anual o bem-estar emocional aumenta?",
    options: ["US$ 30.000/ano", "US$ 75.000/ano", "US$ 150.000/ano", "Não há limite — sempre aumenta"],
    correctIndex: 1,
    explanation: "O estudo mostrou que o bem-estar emocional cotidiano aumenta com a renda até cerca de US$ 75.000/ano, estagnando depois. Já a 'avaliação da vida' continua subindo.",
    source: "https://www.pnas.org/doi/10.1073/pnas.1011492107",
  },
  {
    id: "q1d", level: 3, module: "mentiras",
    question: "Quais são as 6 principais 'Falsas Crenças' (Misconceptions) sobre felicidade que a ciência desmistificou?",
    options: ["Meditação, exercício, dieta, sono, amigos, viagens", "Notas perfeitas, dinheiro, bens materiais, corpo ideal, amor romântico e emprego de prestígio", "Religião, família, saúde, juventude, beleza, inteligência", "Liberdade, democracia, igualdade, educação, tecnologia, progresso"],
    correctIndex: 1,
    explanation: "O curso de Yale demonstra com dados que notas perfeitas (Good Grades), dinheiro (Money), bens materiais (Awesome Stuff), corpo ideal (Perfect Body), amor romântico e status profissional (Good Job) não sustentam felicidade duradoura.",
  },
  // MODULE 2 — expectativas
  {
    id: "q2a", level: 1, module: "expectativas",
    question: "O que é a 'Adaptação Hedônica'?",
    options: ["A tendência de retornar a um nível basal de felicidade após eventos positivos ou negativos", "O aumento progressivo da felicidade com cada conquista", "A capacidade de se adaptar a qualquer clima", "Um tipo de meditação oriental"],
    correctIndex: 0,
    explanation: "A adaptação hedônica (Brickman & Campbell, 1971) descreve como nos habituamos a mudanças positivas ou negativas. O carro novo, a nota máxima — tudo perde o brilho e voltamos ao 'baseline'.",
  },
  {
    id: "q2b", level: 2, module: "expectativas",
    question: "Por que o medalhista de prata geralmente está mais infeliz que o de bronze?",
    options: ["Porque a prata é um metal menos bonito", "Porque o cérebro pensa em termos RELATIVOS — prata compara-se ao ouro (acima), bronze compara-se aos que perderam (abaixo)", "Porque ganhar bronze dá mais dinheiro em patrocínios", "Porque o de prata treinou menos"],
    correctIndex: 1,
    explanation: "Pontos de Referência: o cérebro não avalia em termos absolutos. O prata faz comparação ascendente (com o ouro), gerando frustração. O bronze faz comparação descendente (com os que não subiram ao pódio), gerando gratidão.",
  },
  {
    id: "q2c", level: 2, module: "expectativas",
    question: "Quais são as 4 'Annoying Features of the Mind' que levam ao Miswanting?",
    options: ["Preguiça, medo, raiva e tristeza", "Ilusão de ótica emocional, comparação social, adaptação hedônica e exagero do impacto (Impact Bias)", "Fome, sono, estresse e solidão", "Inveja, ciúme, orgulho e vaidade"],
    correctIndex: 1,
    explanation: "As 4 características irritantes: (1) A mente erra sobre o que vê/sente, (2) Pensa em termos relativos (comparação), (3) Acostuma-se com tudo (adaptação hedônica), (4) Superestima o impacto de eventos futuros (Impact Bias).",
  },
  {
    id: "q2d", level: 3, module: "expectativas",
    question: "O que é 'Impact Bias' segundo Daniel Gilbert?",
    options: ["O viés de dar mais peso a informações recentes", "A tendência a superestimar a intensidade E a duração do impacto emocional de eventos futuros", "O viés de considerar apenas impactos negativos", "A tendência de impactar negativamente os outros"],
    correctIndex: 1,
    explanation: "Impact Bias: pensamos que uma tragédia ou um sucesso estrondoso mudará tudo para sempre, mas a vida se estabiliza. Focalism + Immune Neglect: focamos demais no evento e esquecemos que continuaremos vivendo normalmente.",
  },
  // MODULE 3 — rewirements
  {
    id: "q3a", level: 1, module: "rewirements",
    question: "Segundo Lyubomirsky, qual é a distribuição aproximada dos fatores de felicidade?",
    options: ["100% genética", "50% genética, 10% circunstâncias, 40% ações e pensamentos intencionais", "33% genética, 33% circunstâncias, 33% escolhas", "80% circunstâncias, 20% genética"],
    correctIndex: 1,
    explanation: "O modelo heurístico de Lyubomirsky (2005) sugere: ~50% setpoint genético, ~10% circunstâncias de vida, ~40% atividades intencionais. Isso significa que temos PODER sobre quase metade da nossa felicidade. [Nota: modelo aproximado, a própria autora revisou os percentuais]",
    source: "https://journals.sagepub.com/doi/10.1037/1089-2680.9.2.111",
  },
  {
    id: "q3b", level: 2, module: "rewirements",
    question: "Qual é o maior preditor de bem-estar segundo a pesquisa?",
    options: ["Renda acima de US$100.000/ano", "Conexão Social — ter laços sociais fortes", "Exercício diário de 2 horas", "Meditação avançada"],
    correctIndex: 1,
    explanation: "A pesquisa é inequívoca: conexão social é o preditor mais robusto de felicidade e longevidade. Até conversas com estranhos aumentam o bem-estar — o oposto do que as pessoas esperam.",
  },
  {
    id: "q3c", level: 2, module: "rewirements",
    question: "O que são os 'Rewirements' no contexto do curso?",
    options: ["Equipamentos tecnológicos para o cérebro", "Desafios práticos de mudança de hábitos — o 'dever de casa' é ação, não leitura", "Reconexão de fios neurais através de cirurgia", "Revisão de conteúdo para provas"],
    correctIndex: 1,
    explanation: "Rewirements são desafios comportamentais práticos: Gratidão, Sono, Gentileza, Conexão Social, Exercício. O 'dever de casa' do curso não é leitura, é mudança de hábitos. Ação > Conhecimento.",
  },
  {
    id: "q3d", level: 3, module: "rewirements",
    question: "Gastar dinheiro com outros vs. consigo mesmo — o que a pesquisa de Dunn, Aknin & Norton mostra?",
    options: ["Gastar consigo sempre traz mais felicidade", "Gastar com outros gera mais felicidade que gastar consigo mesmo", "Não há diferença mensurável", "Depende inteiramente da cultura"],
    correctIndex: 1,
    explanation: "Dunn, Aknin & Norton (2008, Science) demonstraram que gastar dinheiro com outros proporciona aumento de bem-estar maior do que gastar consigo. Atos de Bondade (AOKs) são um 'hack' para felicidade imediata.",
    source: "https://www.science.org/doi/10.1126/science.1150952",
  },
  // MODULE 4 — hacks
  {
    id: "q4a", level: 1, module: "hacks",
    question: "O que é 'Savoring'?",
    options: ["Comer devagar para perder peso", "O ato de sair de uma experiência para revisá-la e apreciá-la intencionalmente, prolongando emoções positivas", "Um tipo de meditação budista", "Guardar comida para depois"],
    correctIndex: 1,
    explanation: "Savoring é a prática intencional de apreciar conscientemente uma experiência positiva. Ao invés de apenas comer o sorvete, você para, cheira, saboreia e pensa em como é sortudo. Isso retarda a adaptação hedônica.",
  },
  {
    id: "q4b", level: 2, module: "hacks",
    question: "O que é a 'Visualização Negativa' (técnica estoica) e como ela aumenta a felicidade?",
    options: ["Pensar em coisas ruins para se sentir mal", "Imaginar a perda de algo positivo na sua vida para restaurar o valor percebido e sentir gratidão", "Visualizar cenários de catástrofe para se preparar", "Imaginar que você é melhor que os outros"],
    correctIndex: 1,
    explanation: "Técnica estoica: imagine perder seu celular, seu melhor amigo ou sua casa para sempre. Ao redefinir seu ponto de referência para a perda, o valor percebido é restaurado. Isso 'resetar' o cérebro para valorizar o que já tem.",
  },
  {
    id: "q4c", level: 2, module: "hacks",
    question: "A mente divaga cerca de que percentual do tempo, e como isso afeta a felicidade?",
    options: ["10% — e não afeta a felicidade", "~50% do tempo — e isso está negativamente correlacionado com a felicidade", "90% — mas isso é bom para criatividade", "25% — e é neutro"],
    correctIndex: 1,
    explanation: "Killingsworth & Gilbert (2010, Science): a mente divaga quase 50% do tempo, e o mind-wandering está negativamente correlacionado com a felicidade. Meditação/Mindfulness treina a atenção para combater isso.",
  },
  {
    id: "q4d", level: 3, module: "hacks",
    question: "Quais são os 3 métodos para resetar Pontos de Referência?",
    options: ["Dormir mais, comer melhor, exercitar", "Re-experimentar concretamente o passado, observar referências descendentes, interromper o consumo", "Meditar, respirar, correr", "Comprar coisas novas, mudar de cidade, trocar amigos"],
    correctIndex: 1,
    explanation: "Reset de Pontos de Referência: (1) Re-experimentar concretamente como era antes da conquista, (2) Encontrar referências descendentes (sem maldade), (3) Interromper o consumo e retomar — o prazer 'salta' novamente.",
  },
  // MODULE 5 — habitos
  {
    id: "q5a", level: 1, module: "habitos",
    question: "O que significa a sigla WOOP?",
    options: ["Work Out Or Perish", "Wish, Outcome, Obstacle, Plan — um framework para definir metas específicas", "Welcome Others, Open Possibilities", "Worry Over, Optimize Performance"],
    correctIndex: 1,
    explanation: "WOOP (Gabriele Oettingen): Wish (desejo específico), Outcome (resultados positivos), Obstacle (barreiras internas/externas), Plan (plano SE-ENTÃO). Framework para transformar metas abstratas em ações concretas.",
  },
  {
    id: "q5b", level: 2, module: "habitos",
    question: "O que é uma 'Implementation Intention' (Intenção de Implementação)?",
    options: ["Uma lista de desejos para o ano novo", "Um plano de autorregulação no formato 'SE [evento X acontecer], ENTÃO eu farei [ação Y]'", "Uma intenção de começar um novo negócio", "Um contrato legal com um coach"],
    correctIndex: 1,
    explanation: "Implementation Intention (Peter Gollwitzer): plano no formato 'SE-ENTÃO' que programa o cérebro para responder automaticamente a um obstáculo. Ex: 'SE eu me sentir ansioso antes da prova, ENTÃO farei 5 respirações lentas.'",
  },
  {
    id: "q5c", level: 2, module: "habitos",
    question: "Qual a diferença entre Fixed Mindset e Growth Mindset?",
    options: ["Fixed = cérebro parado; Growth = cérebro crescendo fisicamente", "Fixed = acreditar que habilidades são inatas e imutáveis; Growth = acreditar que esforço e dedicação melhoram habilidades", "Fixed = foco em matemática; Growth = foco em artes", "São a mesma coisa com nomes diferentes"],
    correctIndex: 1,
    explanation: "Carol Dweck: Fixed Mindset acredita que falhar significa 'não ser inteligente'. Growth Mindset foca no esforço e processo, não no resultado. Crucial para Resiliência e sustentação do bem-estar.",
  },
  {
    id: "q5d", level: 3, module: "habitos",
    question: "Qual é a estratégia mais eficaz para criar um novo hábito segundo a ciência?",
    options: ["Ter muita força de vontade", "Facilitar o hábito desejado (torná-lo visível e conveniente) e dificultar o indesejado (remover tentações) — Design de Ambiente", "Punir-se quando falhar", "Esperar a motivação chegar naturalmente"],
    correctIndex: 1,
    explanation: "O cérebro pega o caminho de menor resistência. Design de Ambiente: deixar o tênis ao lado da cama facilita correr; colocar o celular fora do quarto facilita dormir. Manipule o ambiente, não a força de vontade.",
  },
];

// ===================== FLASHCARDS =====================
export const flashcards: Flashcard[] = [
  // MODULE 1
  { id: "f1a", module: "mentiras", front: "Miswanting", back: "Fenômeno de desejar erroneamente coisas que acreditamos trazer felicidade, mas não trazem (Wilson & Gilbert, 2003). Base: affective forecasting incorreto.", category: "Conceitos" },
  { id: "f1b", module: "mentiras", front: "Falácia de G.I. Joe", back: "'Saber é metade da batalha' é FALSO. Saber que dinheiro não compra felicidade não impede você de sentir inveja. Conhecimento é menos da metade da batalha.", category: "Conceitos" },
  { id: "f1c", module: "mentiras", front: "6 Misconceptions", back: "Notas perfeitas, dinheiro, bens materiais, corpo ideal, amor romântico eterno e emprego de prestígio — nenhum sustenta felicidade duradoura.", category: "Mitos" },
  { id: "f1d", module: "mentiras", front: "Paradoxo de Easterlin", back: "Apesar do crescimento econômico, os níveis médios de felicidade permanecem estáveis. Mais riqueza nacional ≠ mais felicidade nacional.", category: "Economia" },
  // MODULE 2
  { id: "f2a", module: "expectativas", front: "Adaptação Hedônica", back: "Mecanismo que faz nosso baseline emocional se reajustar após eventos positivos ou negativos. 'Esteira hedônica' — corremos sem sair do lugar emocional (Brickman & Campbell, 1971).", category: "Vieses" },
  { id: "f2b", module: "expectativas", front: "Pontos de Referência", back: "O cérebro não avalia em termos absolutos, mas relativos. Prata = frustração (compara com ouro). Bronze = gratidão (compara com quem perdeu). Gera comparação social e inveja.", category: "Vieses" },
  { id: "f2c", module: "expectativas", front: "Impact Bias", back: "Tendência a superestimar a intensidade E duração do impacto emocional de eventos futuros. Achamos que tragédias/triunfos mudam tudo para sempre — mas a vida se estabiliza.", category: "Vieses" },
  { id: "f2d", module: "expectativas", front: "4 Annoying Features", back: "(1) Ilusão de ótica emocional, (2) Pensamento relativo (comparação), (3) Adaptação hedônica (tédio), (4) Exagero do impacto futuro. Todas sabotam nossa busca por felicidade.", category: "Vieses" },
  // MODULE 3
  { id: "f3a", module: "rewirements", front: "Regra do 40%", back: "~50% genética, ~10% circunstâncias, ~40% ações intencionais. Temos poder sobre quase metade da nossa felicidade (Lyubomirsky, 2005). [Modelo heurístico aproximado]", category: "Modelos" },
  { id: "f3b", module: "rewirements", front: "Conexão Social", back: "Maior preditor de bem-estar e longevidade. Não precisa ser extrovertido — interações intencionais bastam. Até conversar com estranhos aumenta felicidade.", category: "Rewirements" },
  { id: "f3c", module: "rewirements", front: "Atos de Bondade (AOKs)", back: "Atos de Bondade Aleatórios: geram aumento de bem-estar maior do que gastar dinheiro consigo mesmo (Dunn, Aknin & Norton, 2008).", category: "Rewirements" },
  { id: "f3d", module: "rewirements", front: "Gratidão", back: "Antídoto para adaptação hedônica. Diário de Gratidão reseta Pontos de Referência: foco muda do que falta para o que já se possui.", category: "Rewirements" },
  { id: "f3e", module: "rewirements", front: "Flow (Engajamento)", back: "Estado onde o tempo 'derrete' porque a atividade é intrinsecamente recompensadora. Alcançado usando Forças de Caráter em tarefas desafiadoras. Transforma trabalho em 'chamado'.", category: "Rewirements" },
  { id: "f3f", module: "rewirements", front: "Time Affluence", back: "Abundância de Tempo: priorizar tempo livre sobre acúmulo de dinheiro. Recurso hedônico supremo — usar tempo para Rewirements.", category: "Rewirements" },
  // MODULE 4
  { id: "f4a", module: "hacks", front: "Savoring", back: "Prática intencional de apreciar conscientemente uma experiência positiva. Prolonga e intensifica emoções positivas, retardando a adaptação hedônica.", category: "Técnicas" },
  { id: "f4b", module: "hacks", front: "Visualização Negativa", back: "Técnica estoica: imaginar a perda de algo positivo para restaurar o valor percebido. Redefine o ponto de referência para a ausência → gera gratidão.", category: "Técnicas" },
  { id: "f4c", module: "hacks", front: "Mindfulness", back: "Meditação treina a atenção para combater mind-wandering (~50% do tempo). Não é 'limpar a mente', mas treinar o foco em um ponto (respiração, som).", category: "Técnicas" },
  { id: "f4d", module: "hacks", front: "Investir em Experiências", back: "Experiências > objetos para felicidade. São curtas (impedem adaptação hedônica) e fornecem prazer posterior quando recordadas ou compartilhadas.", category: "Técnicas" },
  // MODULE 5
  { id: "f5a", module: "habitos", front: "WOOP", back: "Wish (desejo específico) → Outcome (resultados positivos) → Obstacle (barreiras) → Plan (plano SE-ENTÃO). Framework de Gabriele Oettingen para metas concretas.", category: "Ferramentas" },
  { id: "f5b", module: "habitos", front: "Implementation Intention", back: "Plano 'SE [evento X], ENTÃO [ação Y]'. Programa o cérebro para resposta automática a obstáculos. A ferramenta mais poderosa do WOOP.", category: "Ferramentas" },
  { id: "f5c", module: "habitos", front: "Growth Mindset", back: "Carol Dweck: acreditar que esforço e dedicação melhoram habilidades. Foco no processo, não resultado. Crucial para resiliência e sustentação de hábitos.", category: "Mentalidade" },
  { id: "f5d", module: "habitos", front: "Design de Ambiente", back: "Facilitar o hábito desejado (torná-lo visível/conveniente) e dificultar o indesejado (remover tentações). O cérebro pega o caminho de menor resistência.", category: "Ferramentas" },
];

// ===================== EVIDENCE ITEMS =====================
export const evidenceItems: EvidenceItem[] = [
  { id: "e1", module: "mentiras", driver: "Miswanting", title: "Miswanting: Some Problems in the Forecasting of Future Affective States", authors: "Wilson, T. D., & Gilbert, D. T.", year: 2003, summary: "Demonstra como erramos sistematicamente ao prever o que nos fará felizes — base científica para os 'misconceptions' sobre felicidade.", evidenceLevel: "alto", url: "https://www.hbs.edu/faculty/Pages/item.aspx?num=3826" },
  { id: "e2", module: "mentiras", driver: "Dinheiro & Felicidade", title: "High Income Improves Evaluation of Life but Not Emotional Well-Being", authors: "Kahneman, D., & Deaton, A.", year: 2010, summary: "Bem-estar emocional sobe até ~US$75k/ano e estagna. Avaliação de vida continua subindo. Marco no debate renda-felicidade.", evidenceLevel: "alto", url: "https://www.pnas.org/doi/10.1073/pnas.1011492107" },
  { id: "e3", module: "expectativas", driver: "Adaptação Hedônica", title: "Hedonic Relativism and Planning the Good Society", authors: "Brickman, P., & Campbell, D. T.", year: 1971, summary: "Trabalho seminal que cunhou o conceito de 'hedonic treadmill' — retornamos ao baseline emocional após eventos positivos ou negativos.", evidenceLevel: "alto", url: "https://psycnet.apa.org/record/2006-09687-012" },
  { id: "e4", module: "expectativas", driver: "Impact Bias", title: "Immune Neglect: A Source of Durability Bias in Affective Forecasting", authors: "Gilbert, D. T., et al.", year: 1998, summary: "Superestimamos intensidade e duração de emoções futuras. Nosso 'sistema imunológico psicológico' nos adapta, mas não prevemos isso.", evidenceLevel: "alto", url: "https://scholar.harvard.edu/files/danielgilbert/files/immune-neglect.pdf" },
  { id: "e5", module: "rewirements", driver: "Generosidade", title: "Spending Money on Others Promotes Happiness", authors: "Dunn, E. W., Aknin, L. B., & Norton, M. I.", year: 2008, summary: "Gastar com outros gera mais felicidade que gastar consigo (Science). Base empírica para Atos de Bondade como Rewirement.", evidenceLevel: "alto", url: "https://www.science.org/doi/10.1126/science.1150952" },
  { id: "e6", module: "rewirements", driver: "Conexão Social", title: "Very Happy People", authors: "Diener, E., & Seligman, M. E. P.", year: 2002, summary: "Pessoas muito felizes têm relações sociais ricas e satisfatórias — o fator mais consistente entre os 'muito felizes'.", evidenceLevel: "alto", url: "https://pubmed.ncbi.nlm.nih.gov/12585811/" },
  { id: "e7", module: "rewirements", driver: "Modelo 50/40/10", title: "Pursuing Happiness: The Architecture of Sustainable Change", authors: "Lyubomirsky, S., Sheldon, K. M., & Schkade, D.", year: 2005, summary: "Modelo heurístico: ~50% genética, ~40% atividades intencionais, ~10% circunstâncias. Moldou o campo mas é aproximação.", evidenceLevel: "médio", url: "https://journals.sagepub.com/doi/10.1037/1089-2680.9.2.111" },
  { id: "e8", module: "hacks", driver: "Mind-Wandering", title: "A Wandering Mind Is an Unhappy Mind", authors: "Killingsworth, M. A., & Gilbert, D. T.", year: 2010, summary: "Mente divaga ~47% do tempo e isso reduz felicidade. Mindfulness é ferramenta direta de combate.", evidenceLevel: "alto", url: "https://www.science.org/doi/10.1126/science.1192439" },
  { id: "e9", module: "hacks", driver: "Gratidão", title: "Counting Blessings vs Burdens: Meta-analysis", authors: "Davis, D. E., et al.", year: 2016, summary: "Meta-análise confirmando que intervenções de gratidão produzem melhorias significativas no bem-estar subjetivo.", evidenceLevel: "alto", url: "https://pubmed.ncbi.nlm.nih.gov/26575348/" },
  { id: "e10", module: "habitos", driver: "WOOP & Metas", title: "Rethinking Positive Thinking: Inside the New Science of Motivation", authors: "Oettingen, G.", year: 2014, summary: "Gabriele Oettingen apresenta WOOP e Mental Contrasting: visualizar obstáculos (não apenas resultados) fortalece motivação e alcance de metas.", evidenceLevel: "alto", url: "https://woopmylife.org/" },
  { id: "e11", module: "habitos", driver: "Growth Mindset", title: "Mindset: The New Psychology of Success", authors: "Dweck, C. S.", year: 2006, summary: "Fixed vs Growth Mindset: acreditar que habilidades são treináveis (vs inatas) melhora resiliência, aprendizado e bem-estar.", evidenceLevel: "alto", url: "https://mindsetonline.com/" },
  { id: "e12", module: "habitos", driver: "Implementation Intentions", title: "Implementation Intentions: Strong Effects of Simple Plans", authors: "Gollwitzer, P. M.", year: 1999, summary: "Planos SE-ENTÃO dobram a taxa de alcance de metas. A ferramenta mais poderosa para transformar intenção em ação automática.", evidenceLevel: "alto", url: "https://psycnet.apa.org/doi/10.1037/0003-066X.54.7.493" },
];
