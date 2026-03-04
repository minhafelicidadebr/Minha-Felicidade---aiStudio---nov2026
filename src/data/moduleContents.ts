export interface ModuleContent {
  id: string;
  overview: string;
  keyInsight: string;
  learningObjectives: string[];
  activities: {
    title: string;
    type: string;
    description: string;
    duration: string;
  }[];
  scientificNotes: {
    claim: string;
    status: "verificado" | "parcial" | "simplificação";
    correction?: string;
    source?: string;
  }[];
  reflectionQuestion: string;
}

export const moduleContents: Record<string, ModuleContent> = {
  etymology: {
    id: "etymology",
    overview: "Iniciamos desvendando o que realmente significa 'felicidade'. Do adjetivo latino 'felix' (fecundo, fértil, produtivo) até as distinções científicas modernas entre hedonia, eudaimonia, bem-estar subjetivo e florescimento. Este módulo estabelece o vocabulário preciso necessário para navegar o campo sem cair em armadilhas semânticas.",
    keyInsight: "Felicidade não é um sentimento passageiro — é a capacidade de tornar a vida fértil e produtiva, como sugere sua própria etimologia.",
    learningObjectives: [
      "Distinguir entre hedonia (prazer) e eudaimonia (florescimento) com precisão conceitual",
      "Identificar pelo menos 4 definições operacionais de bem-estar usadas na literatura científica",
      "Construir uma definição pessoal de felicidade com 3 indicadores observáveis",
      "Reconhecer armadilhas semânticas que confundem emoção, satisfação e florescimento",
    ],
    activities: [
      { title: "Mapa Semântico Vivo", type: "Colaborativa", description: "Em grupos de 4, criem um mapa visual conectando: felicidade, prazer, satisfação, bem-estar, florescimento, alegria.", duration: "20 min" },
      { title: "Minha Definição Operacional", type: "Individual", description: "Escreva sua definição de felicidade com 3 indicadores mensuráveis/observáveis.", duration: "10 min" },
      { title: "Quiz Diagnóstico Nível 1", type: "App", description: "Quiz adaptativo sobre conceitos básicos para baseline de conhecimento.", duration: "8 min" },
    ],
    scientificNotes: [
      { claim: "Felix = fecundo, fértil, produtivo (etimologia latina)", status: "verificado", source: "https://plato.stanford.edu/entries/happiness/" },
      { claim: "Raiz proto-indo-europeia *dhe(i)* = amamentar", status: "verificado", source: "Wiktionary / etimologia latina acadêmica" },
    ],
    reflectionQuestion: "Se felicidade vem de 'fértil' — o que você está tornando fértil na sua vida hoje?",
  },
  worldviews: {
    id: "worldviews",
    overview: "Antes da ciência, filósofos e tradições espirituais já mapeavam caminhos para a vida boa. Aristóteles propôs a eudaimonia como atividade virtuosa; os estoicos, a serenidade via controle interno; Buda, o desapego do sofrimento; Jesus, o amor ao próximo. Este módulo mapeia as 'famílias conceituais' da felicidade e mostra como dialogam com a ciência contemporânea.",
    keyInsight: "Filosofia e espiritualidade não competem com ciência — oferecem mapas complementares para o mesmo território humano.",
    learningObjectives: [
      "Identificar pelo menos 6 tradições filosófico-espirituais e suas visões de felicidade",
      "Classificar abordagens em famílias: virtude, prazer, serenidade, compaixão, sentido",
      "Articular como filosofia e ciência dialogam sem reducionismo",
      "Argumentar a favor e contra pelo menos 2 posições em debate estruturado",
    ],
    activities: [
      { title: "Arena de Debate Socrático", type: "App/Presencial", description: "'Felicidade é virtude, prazer ou sentido?' — debate estruturado.", duration: "30 min" },
      { title: "Galeria de Cosmovisões", type: "Grupos", description: "Cada grupo apresenta 2 tradições e como conectam com evidência contemporânea.", duration: "25 min" },
      { title: "Poesia Pedagógica", type: "App", description: "Leitura de poema reflexivo sobre 'bússolas e faróis' + prática de escrita contemplativa.", duration: "15 min" },
    ],
    scientificNotes: [
      { claim: "Aristóteles: eudaimonia como atividade virtuosa (384–322 a.C.)", status: "verificado", source: "https://plato.stanford.edu/entries/aristotle-ethics/" },
      { claim: "Platão: alma virtuosa e justa (428/427–348/347 a.C.)", status: "verificado", source: "https://plato.stanford.edu/entries/plato/" },
    ],
    reflectionQuestion: "Qual tradição filosófica ou espiritual mais ressoa com sua experiência pessoal de vida boa — e por quê?",
  },
  illusions: {
    id: "illusions",
    overview: "A mente humana é notoriamente ruim em prever o que nos fará felizes. Este módulo desmonta 6 mitos sustentados por vieses cognitivos: salário alto, dinheiro, bens materiais, corpo perfeito, notas perfeitas e amor romântico eterno. A base é o conceito de 'miswanting' (Wilson & Gilbert) e evidências de economia comportamental.",
    keyInsight: "Não somos ruins em buscar felicidade — somos ruins em prever onde ela está. O GPS emocional tem um bug chamado 'affective forecasting'.",
    learningObjectives: [
      "Explicar o conceito de 'miswanting' e 'affective forecasting' com exemplos",
      "Citar 3 estudos que desmontam mitos populares sobre felicidade",
      "Identificar o paradoxo de Easterlin e suas implicações",
      "Propor alternativas baseadas em evidências para cada mito",
    ],
    activities: [
      { title: "Simulador de Decisões", type: "App", description: "'Você recebeu um bônus de R$ 5.000 — como gastar?' Cenários com consequências baseadas em evidências.", duration: "20 min" },
      { title: "Meu Mito Favorito", type: "Individual", description: "'Qual desses 6 mitos mais me captura? O que eu faria diferente com essa consciência?'", duration: "10 min" },
    ],
    scientificNotes: [
      { claim: "Kahneman & Deaton (2010): bem-estar emocional aumenta até US$ 75.000/ano e estagna", status: "verificado", source: "https://www.pnas.org/doi/10.1073/pnas.1011492107" },
      { claim: "Gastar com outros gera mais felicidade (Dunn, Aknin & Norton, 2008)", status: "verificado", source: "https://www.science.org/doi/10.1126/science.1150952" },
      { claim: "Correlação fraca renda-satisfação (~0.10)", status: "parcial", correction: "O valor varia por estudo. Killingsworth (2021) sugere relação contínua acima de $75k para avaliação da vida.", source: "https://pubmed.ncbi.nlm.nih.gov/20823223/" },
    ],
    reflectionQuestion: "Se dinheiro, corpo e notas não sustentam felicidade — o que sustenta? E como você redesenharia suas prioridades?",
  },
  hedonic: {
    id: "hedonic",
    overview: "A adaptação hedônica é o mecanismo psicológico mais importante para entender por que conquistas não sustentam felicidade. Como uma esteira (treadmill), corremos atrás de metas sem sair do lugar emocional. Este módulo ensina a 'desacelerar a esteira' com estratégias baseadas em evidências.",
    keyInsight: "A adaptação hedônica não é defeito — é feature evolutiva. O desafio é aprender a projetar intervenções que a retardem.",
    learningObjectives: [
      "Definir adaptação hedônica e explicar o modelo de Brickman & Campbell",
      "Avaliar criticamente o modelo 50/40/10 de Lyubomirsky",
      "Projetar 2 intervenções anti-adaptação (1 pessoal, 1 organizacional)",
      "Identificar 4 estratégias de retardamento da adaptação com evidência",
    ],
    activities: [
      { title: "Estúdio de Co-design", type: "App", description: "Desenhe intervenções anti-adaptação com: objetivo, atividades, métricas, riscos e evidências.", duration: "30 min" },
      { title: "Flashcards de Gatilhos", type: "App", description: "Gatilhos de adaptação + 'antídotos' (variação, gratidão, novidade planejada, savoring).", duration: "10 min" },
      { title: "Plano Anti-Esteira 7 Dias", type: "Individual", description: "Crie um plano pessoal de 7 dias com uma prática anti-adaptação por dia.", duration: "15 min" },
    ],
    scientificNotes: [
      { claim: "50% genética, 40% atividades intencionais, 10% circunstâncias (Lyubomirsky, 2005)", status: "simplificação", correction: "O modelo é heurístico. A própria autora revisou, reconhecendo que os percentuais são aproximações de estudos de gêmeos.", source: "https://journals.sagepub.com/doi/10.1037/1089-2680.9.2.111" },
    ],
    reflectionQuestion: "Em qual área da sua vida a 'esteira hedônica' está mais ativa? Que experimento de 7 dias você desenharia?",
  },
  neuro: {
    id: "neuro",
    overview: "Richard Davidson demonstrou que o bem-estar é uma habilidade treinável com bases neurais identificáveis. Este módulo apresenta o framework de 4 dimensões (awareness, connection, insight, purpose) e corrige a simplificação dos '4 neurotransmissores da felicidade', mostrando que a neurobiologia é sistêmica, não linear.",
    keyInsight: "Bem-estar não é sorte genética — é uma habilidade treinável, com circuitos neurais identificáveis e plasticidade comprovada.",
    learningObjectives: [
      "Explicar o conceito de plasticidade neural aplicado ao bem-estar",
      "Identificar o framework de Davidson (awareness, connection, insight, purpose)",
      "Diferenciar metáfora popular de mecanismo neurobiológico real",
      "Avaliar criticamente a simplificação 'neurotransmissores da felicidade'",
    ],
    activities: [
      { title: "Quiz Nível 3: Metáfora vs Mecanismo", type: "App", description: "Diferencie linguagem popular de explicação científica.", duration: "12 min" },
      { title: "Treino de 4 Dimensões", type: "Prática", description: "Mini-prática de 2 min para cada dimensão de Davidson.", duration: "10 min" },
    ],
    scientificNotes: [
      { claim: "Neurotransmissores da felicidade (dopamina, serotonina, ocitocina, endorfina)", status: "simplificação", correction: "Sistemas neurobiológicos complexos envolvem circuitos distribuídos. Correlação ≠ causalidade.", source: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2944261/" },
      { claim: "Cérebro trino (3 regiões — Paul MacLean, 1990)", status: "simplificação", correction: "Modelo superado. O Projeto Conectoma Humano (2009) identificou 180+ regiões.", source: "https://www.nature.com/articles/nature18933" },
      { claim: "Davidson: plasticidade neural e bem-estar treinável", status: "verificado", source: "https://www.pnas.org/doi/10.1073/pnas.2014859117" },
    ],
    reflectionQuestion: "Se o bem-estar é treinável como uma habilidade — qual 'músculo' do bem-estar você mais precisa treinar?",
  },
  emotions: {
    id: "emotions",
    overview: "Emoções não existem 'só na cabeça' — provocam sensações físicas mensuráveis e universais. O estudo de Nummenmaa (2014) com 701 participantes criou mapas corporais de 14 emoções. Este módulo também aborda a teoria construcionista de Barrett e estratégias de regulação emocional de Gross.",
    keyInsight: "Seu corpo é um mapa de emoções. Aprender a lê-lo é a primeira ferramenta de regulação emocional.",
    learningObjectives: [
      "Descrever o estudo de Nummenmaa e seus achados sobre mapas corporais",
      "Comparar a visão 'universal' (Ekman) com a 'construcionista' (Barrett)",
      "Aplicar pelo menos 2 estratégias de regulação emocional (Gross)",
      "Usar o corpo como 'alerta precoce' para identificar emoções",
    ],
    activities: [
      { title: "Dinâmica Experiencial: Mapa do Corpo", type: "Presencial", description: "Olhos fechados, relembrar um momento de alegria e identificar onde sentiram calor ou frio no corpo.", duration: "10 min" },
      { title: "Arena de Debate", type: "App", description: "'Emoções são universais ou construídas culturalmente?' — debate com evidências.", duration: "20 min" },
      { title: "Poesia Pedagógica", type: "App", description: "'Onde a alegria mora no corpo' — poema + prática de escrita reflexiva.", duration: "12 min" },
    ],
    scientificNotes: [
      { claim: "701 participantes mapearam 14 emoções com padrões consistentes (Nummenmaa, 2014)", status: "verificado", source: "https://www.pnas.org/doi/10.1073/pnas.1321664111" },
    ],
    reflectionQuestion: "Feche os olhos por 30 segundos. Lembre de um momento de alegria. Onde no corpo você sente calor?",
  },
  perma: {
    id: "perma",
    overview: "PERMA (Seligman) e SPIRE (Ben-Shahar) são os dois modelos mais influentes de bem-estar estruturado. Este módulo detalha cada pilar, apresenta evidências de eficácia e conecta com práticas concretas — especialmente gratidão, cujos benefícios são sustentados por meta-análises.",
    keyInsight: "Modelos como PERMA+V não são receitas — são linguagens para diagnosticar e intervir em múltiplas dimensões do florescimento.",
    learningObjectives: [
      "Listar e explicar os 6 componentes do PERMA+V",
      "Comparar PERMA e SPIRE quanto a ênfases e aplicações",
      "Implementar uma prática de gratidão com fundamentação científica",
      "Criar um plano PERMA+V pessoal de 30 dias com métricas",
    ],
    activities: [
      { title: "Evidence Explorer", type: "App", description: "5 práticas (gratidão, gentileza, conexão, mindfulness, atividade física) com evidências.", duration: "15 min" },
      { title: "Flashcards PERMA+V", type: "App", description: "Cada pilar com definição, exemplo e evidência.", duration: "8 min" },
      { title: "Plano PERMA+V 30 Dias", type: "App/Individual", description: "Crie um plano pessoal com diagnóstico, ações e métricas.", duration: "25 min" },
    ],
    scientificNotes: [
      { claim: "Fonte: 'Harvard' (benefícios da gratidão)", status: "parcial", correction: "A referência genérica precisa ser especificada. Melhor fonte: Davis et al. (2016) meta-análise.", source: "https://pubmed.ncbi.nlm.nih.gov/26575348/" },
      { claim: "Gratidão ativa áreas do cérebro ligadas à recompensa e moralidade", status: "verificado", source: "https://pubmed.ncbi.nlm.nih.gov/26746580/" },
    ],
    reflectionQuestion: "Se você pudesse fortalecer apenas 1 pilar do PERMA+V nos próximos 30 dias — qual escolheria e por quê?",
  },
  work: {
    id: "work",
    overview: "Felicidade no trabalho não é pizza na sexta-feira — é propósito, engajamento genuíno e drivers organizacionais baseados em evidências. O Work Wellbeing Playbook (Oxford/WWM/Indeed) oferece um framework aplicável, e o Job Crafting (Wrzesniewski & Dutton) mostra como cada colaborador pode redesenhar seu próprio trabalho para criar significado.",
    keyInsight: "Bem-estar no trabalho é construído quando propósito pessoal e engajamento encontram práticas organizacionais baseadas em evidências.",
    learningObjectives: [
      "Identificar os principais drivers de bem-estar organizacional (Work Wellbeing Playbook)",
      "Aplicar o conceito de Job Crafting para redesenhar tarefas e relações no trabalho",
      "Diferenciar 'felicidade no trabalho' como modismo vs. prática baseada em evidências",
      "Projetar uma intervenção de bem-estar organizacional com métricas mensuráveis",
    ],
    activities: [
      { title: "Simulador: Decisões de Gestão", type: "App", description: "Cenários de liderança com consequências para engajamento e bem-estar da equipe.", duration: "15 min" },
      { title: "Estúdio de Co-design", type: "App", description: "Programa de bem-estar organizacional baseado em drivers do Work Wellbeing Playbook.", duration: "30 min" },
      { title: "Meu Job Crafting", type: "Individual", description: "Redesenhe 3 aspectos do seu trabalho (tarefas, relações, percepção) para criar mais significado.", duration: "15 min" },
    ],
    scientificNotes: [
      { claim: "Dados Gallup: +21% produtividade em equipes com alto bem-estar", status: "parcial", correction: "Os percentuais são frequentemente citados sem metodologia completa. Gallup State of the Global Workplace é a fonte mais confiável.", source: "https://www.gallup.com/workplace/349484/state-of-the-global-workplace.aspx" },
      { claim: "Job Crafting aumenta significado e engajamento (Wrzesniewski & Dutton, 2001)", status: "verificado", source: "https://positiveorgs.bus.umich.edu/wp-content/uploads/What-is-Job-Crafting-and-Why-Does-it-Matter1.pdf" },
    ],
    reflectionQuestion: "Se você pudesse redesenhar 3 aspectos do seu trabalho amanhã — quais seriam e por quê?",
  },
};

// ===================== SIMULATOR SCENARIOS =====================
export interface SimulatorScenario {
  id: string;
  module: string;
  title: string;
  context: string;
  options: {
    text: string;
    consequence: string;
    impact: "positivo" | "neutro" | "negativo";
    xp: number;
    evidence?: string;
  }[];
}

export const simulatorScenarios: SimulatorScenario[] = [
  {
    id: "s_ety", module: "etymology",
    title: "Definindo Felicidade no Workshop",
    context: "Você está facilitando um workshop e pede para o grupo definir 'felicidade'. A maioria diz 'estar sempre feliz e contente'. Como você responde?",
    options: [
      { text: "Concordar e seguir — 'estar feliz' é a definição correta", consequence: "Reforça a armadilha semântica de confundir felicidade com emoção positiva constante. Perde oportunidade pedagógica.", impact: "negativo", xp: 5 },
      { text: "Explorar a etimologia: 'felix' = fértil, e distinguir hedonia de eudaimonia", consequence: "Abre espaço para nuance. A etimologia surpreende e gera reflexão (Ryan & Deci, 2001). O grupo descobre que felicidade é mais do que emoção.", impact: "positivo", xp: 25 },
      { text: "Apresentar 4+ definições científicas e pedir que cada um escolha", consequence: "Bom uso de definições operacionais. Evita dogmatismo. Cada participante constrói sua própria definição com indicadores.", impact: "positivo", xp: 20 },
    ],
  },
  {
    id: "s_wv", module: "worldviews",
    title: "O Conselho dos Filósofos",
    context: "Um colega argumenta que filosofia antiga não tem relevância para o bem-estar moderno. Como você responde?",
    options: [
      { text: "Concordar — ciência moderna substituiu a filosofia", consequence: "Ignora 2.500 anos de sabedoria. Peterson & Seligman (2004) mostraram que virtudes são transculturais e atemporais.", impact: "negativo", xp: 5 },
      { text: "Mostrar como conceitos antigos (eudaimonia, ataraxia) fundamentam modelos modernos (PERMA, SDT)", consequence: "Cria pontes entre tradição e ciência. Ryan & Deci's Self-Determination Theory tem raízes diretas em Aristóteles.", impact: "positivo", xp: 25 },
      { text: "Dizer que ambas são importantes, sem aprofundar", consequence: "Resposta diplomática mas superficial. Perde a chance de demonstrar conexões concretas.", impact: "neutro", xp: 10 },
    ],
  },
  {
    id: "s1", module: "illusions",
    title: "O Bônus Inesperado",
    context: "Você recebeu um bônus de R$ 5.000. Baseado na ciência do bem-estar, como seria melhor investir para maximizar sua felicidade sustentável?",
    options: [
      { text: "Comprar o smartphone mais recente", consequence: "Prazer imediato, mas adaptação hedônica em 2-3 meses. Materialismo correlacionado com menor bem-estar (Kasser & Ryan, 1993).", impact: "negativo", xp: 5 },
      { text: "Gastar com experiências (viagem, curso, show) com pessoas queridas", consequence: "Experiências geram mais felicidade duradoura que bens materiais (Van Boven & Gilovich, 2003).", impact: "positivo", xp: 20 },
      { text: "Doar parte para uma causa e gastar o resto com amigos", consequence: "Gastar com outros gera maior aumento de felicidade (Dunn et al., 2008, Science). Combina gasto pró-social + experiencial.", impact: "positivo", xp: 25 },
      { text: "Guardar tudo na poupança 'para emergências'", consequence: "Segurança financeira é importante, mas acumular sem usufruir não gera bem-estar além do básico (Kahneman & Deaton, 2010).", impact: "neutro", xp: 10 },
    ],
  },
  {
    id: "s3", module: "hedonic",
    title: "A Promoção Esperada",
    context: "Depois de 2 anos de dedicação, você recebeu a promoção. A euforia é enorme. Baseado no que aprendeu sobre adaptação hedônica, o que faz?",
    options: [
      { text: "Celebrar intensamente e esperar que a felicidade dure naturalmente", consequence: "Sem estratégia anti-adaptação, a euforia retorna ao baseline em 2-6 meses (Brickman & Campbell, 1971).", impact: "negativo", xp: 5 },
      { text: "Praticar gratidão diária + variar rotinas + savoring consciente", consequence: "Tríade anti-adaptação: gratidão retarda habituação, variação mantém novidade, savoring prolonga emoção positiva (Lyubomirsky, 2011).", impact: "positivo", xp: 25 },
      { text: "Já começar a focar na próxima promoção", consequence: "Clássica esteira hedônica. A meta seguinte substitui a satisfação presente.", impact: "negativo", xp: 5 },
      { text: "Compartilhar a conquista com pessoas queridas", consequence: "Capitalização social (Gable et al., 2004): compartilhar positivamente aumenta emoções positivas e fortalece relações.", impact: "positivo", xp: 20 },
    ],
  },
  {
    id: "s_neuro", module: "neuro",
    title: "O Programa de Neuroplasticidade",
    context: "Seu RH quer implementar um programa de 'neurociência da felicidade' baseado em '4 hormônios da felicidade'. Como você orienta?",
    options: [
      { text: "Aprovar — '4 hormônios' é uma boa metáfora para engajar pessoas", consequence: "A simplificação gera falsas expectativas e reduz neurobiologia complexa a causalidade linear. Correlação ≠ causalidade.", impact: "negativo", xp: 5 },
      { text: "Sugerir o framework de Davidson (awareness, connection, insight, purpose) como alternativa científica", consequence: "Davidson (PNAS, 2020) oferece dimensões treináveis com bases neurais identificáveis, sem simplificação problemática.", impact: "positivo", xp: 25 },
      { text: "Propor que usem '4 hormônios' como linguagem popular, mas ensinem a versão correta em paralelo", consequence: "Abordagem pragmática. Usa metáfora como gancho pedagógico, mas corrige com precisão científica.", impact: "positivo", xp: 20 },
    ],
  },
  {
    id: "s4", module: "emotions",
    title: "A Ansiedade Antes da Apresentação",
    context: "Você está prestes a fazer uma apresentação importante. Sente o coração acelerado, palmas suando, tensão no peito. O que faz?",
    options: [
      { text: "Tentar suprimir a ansiedade ('não posso sentir isso agora')", consequence: "Supressão emocional é a estratégia menos eficaz (Gross, 1998). Aumenta ativação fisiológica e reduz performance.", impact: "negativo", xp: 5 },
      { text: "Reconhecer as sensações como 'energia' e redirecionar (reavaliação cognitiva)", consequence: "Reavaliação cognitiva é a estratégia mais eficaz de regulação (Gross, 1998). Nummenmaa: corpo como mapa emocional.", impact: "positivo", xp: 25 },
      { text: "Fazer 3 respirações profundas e nomear a emoção ('estou sentindo ansiedade')", consequence: "Naming emotions reduz ativação da amígdala (Lieberman et al., 2007). Respiração ativa parassimpático. Excelente combinação.", impact: "positivo", xp: 20 },
      { text: "Tomar um calmante e seguir em frente", consequence: "Pode ser necessário clinicamente, mas como estratégia padrão não desenvolve habilidades de regulação.", impact: "neutro", xp: 10 },
    ],
  },
  {
    id: "s_perma", module: "perma",
    title: "Implementação PERMA+V na Escola",
    context: "Você é convidado para implementar um programa de bem-estar em uma escola. Como estrutura a proposta?",
    options: [
      { text: "Focar apenas em 'atividades divertidas' para deixar alunos felizes", consequence: "Emoções positivas são 1 dos 5 pilares, não o programa inteiro. Ignora engajamento, relações, significado e realização.", impact: "negativo", xp: 5 },
      { text: "Usar PERMA+V como framework: diagnosticar cada pilar, criar intervenções específicas com métricas", consequence: "Abordagem sistêmica. Educação Positiva (Adler) mostra que escolas usando PERMA reportam melhores resultados acadêmicos e emocionais.", impact: "positivo", xp: 25 },
      { text: "Implementar gratidão como prática única para toda a escola", consequence: "Gratidão tem evidência (Davis et al., 2016), mas como única intervenção é insuficiente. PERMA+V requer ação em múltiplas dimensões.", impact: "neutro", xp: 15 },
    ],
  },
  {
    id: "s_work", module: "work",
    title: "Redesenhando o Trabalho",
    context: "Sua equipe apresenta sinais de desengajamento: apatia em reuniões, baixa iniciativa, rotatividade aumentando. Como líder, o que faz?",
    options: [
      { text: "Aumentar salários e bônus como incentivo principal", consequence: "Incentivos financeiros têm efeito limitado no engajamento intrínseco. Kahneman & Deaton: acima do limiar, mais dinheiro não aumenta bem-estar emocional.", impact: "neutro", xp: 10 },
      { text: "Implementar Job Crafting + conectar tarefas a propósito + usar drivers do Work Wellbeing Playbook", consequence: "Wrzesniewski (2001): Job Crafting aumenta significado. Work Wellbeing Playbook: propósito e pertencimento são drivers principais.", impact: "positivo", xp: 25 },
      { text: "Organizar happy hours e atividades de team building", consequence: "Cria momentos agradáveis, mas não endereça causas raiz do desengajamento (falta de propósito, autonomia, crescimento).", impact: "neutro", xp: 10 },
    ],
  },
];

// ===================== DEBATE TOPICS =====================
export interface DebateTopic {
  id: string;
  module: string;
  title: string;
  question: string;
  positionA: { name: string; arguments: string[]; sources: string[] };
  positionB: { name: string; arguments: string[]; sources: string[] };
  synthesisCue: string;
}

export const debateTopics: DebateTopic[] = [
  {
    id: "d_ety", module: "etymology",
    title: "Felicidade é Universal?",
    question: "Existe uma definição universal de felicidade ou ela é culturalmente construída?",
    positionA: {
      name: "Universalismo (Ryan & Deci)",
      arguments: ["Necessidades básicas (autonomia, competência, relação) são universais (SDT)", "Bem-estar subjetivo pode ser medido transculturalmente"],
      sources: ["https://selfdeterminationtheory.org/SDT/documents/2001_RyanDeci.pdf"],
    },
    positionB: {
      name: "Relativismo Cultural",
      arguments: ["Culturas coletivistas vs individualistas definem 'boa vida' de formas diferentes", "A palavra 'felicidade' não tem tradução direta em muitas línguas"],
      sources: ["https://plato.stanford.edu/entries/happiness/"],
    },
    synthesisCue: "Talvez haja componentes universais (necessidades básicas) dentro de manifestações culturalmente variáveis.",
  },
  {
    id: "d1", module: "worldviews",
    title: "O Grande Debate: Virtude vs. Prazer vs. Sentido",
    question: "Felicidade é virtude (Aristóteles), prazer (Epicuro) ou sentido (Frankl)?",
    positionA: {
      name: "Eudaimonia (Aristóteles/Seligman)",
      arguments: ["Felicidade duradoura vem do exercício de virtudes, não de prazeres momentâneos", "Eudaimonia está associada a maior resiliência (Ryan & Deci, 2001)", "PERMA confirma: meaning e accomplishment são tão importantes quanto emoções positivas"],
      sources: ["https://plato.stanford.edu/entries/aristotle-ethics/"],
    },
    positionB: {
      name: "Hedonismo Qualificado (Epicuro/Kahneman)",
      arguments: ["Sem emoções positivas, nenhum modelo de 'boa vida' se sustenta", "Kahneman: o 'eu experiencial' é tão válido quanto o 'eu avaliativo'", "Epicuro propunha prazer via simplicidade, amizade e ataraxia"],
      sources: ["https://plato.stanford.edu/entries/epicurus/"],
    },
    synthesisCue: "PERMA integra prazer (P), virtude/engajamento (E,A) e sentido (M). A dicotomia é falsa?",
  },
  {
    id: "d_ill", module: "illusions",
    title: "Dinheiro Compra Felicidade?",
    question: "O dinheiro pode comprar felicidade ou apenas eliminar infelicidade?",
    positionA: {
      name: "Sim, Parcialmente (Killingsworth)",
      arguments: ["Killingsworth (2021): felicidade continua aumentando com renda mesmo acima de $75k", "Dinheiro compra experiências, tempo e reduz stress financeiro"],
      sources: ["https://www.pnas.org/doi/10.1073/pnas.2016976118"],
    },
    positionB: {
      name: "Não, Além do Básico (Kahneman & Deaton)",
      arguments: ["Bem-estar emocional estagna acima de ~$75k/ano", "Paradoxo de Easterlin: PIB cresce, felicidade média não"],
      sources: ["https://www.pnas.org/doi/10.1073/pnas.1011492107"],
    },
    synthesisCue: "Kahneman & Killingsworth (2023) chegaram a uma síntese: dinheiro importa, mas menos para quem já é relativamente feliz.",
  },
  {
    id: "d_hed", module: "hedonic",
    title: "A Adaptação Hedônica é Benéfica?",
    question: "A adaptação hedônica é um mecanismo benéfico ou prejudicial para o ser humano?",
    positionA: {
      name: "Benéfico (Visão Evolutiva)",
      arguments: ["Protege contra devastação permanente após perdas", "Permite reequilíbrio emocional e funcionalidade"],
      sources: ["https://sonjalyubomirsky.com/wp-content/uploads/2024/03/Lyubomirsky-2011.pdf"],
    },
    positionB: {
      name: "Prejudicial (Visão Motivacional)",
      arguments: ["Impede que conquistas gerem satisfação duradoura", "Cria ciclo infinito de busca sem realização"],
      sources: ["https://journals.sagepub.com/doi/10.1037/1089-2680.9.2.111"],
    },
    synthesisCue: "A adaptação é neutra — é como a usamos que determina o resultado. Estratégias anti-adaptação retardam os efeitos negativos sem eliminar a proteção.",
  },
  {
    id: "d_neuro", module: "neuro",
    title: "Neurociência Explica a Felicidade?",
    question: "A neurociência pode explicar completamente a felicidade ou há limites metodológicos?",
    positionA: {
      name: "Sim, com Avanços (Davidson)",
      arguments: ["Neuroimagem identifica circuitos de bem-estar treináveis", "Plasticidade neural demonstra que bem-estar é skill, não trait"],
      sources: ["https://www.pnas.org/doi/10.1073/pnas.2014859117"],
    },
    positionB: {
      name: "Há Limites (Crítica Metodológica)",
      arguments: ["Correlação neural ≠ causalidade", "Experiência subjetiva (qualia) não se reduz a mapas cerebrais"],
      sources: ["https://pmc.ncbi.nlm.nih.gov/articles/PMC2944261/"],
    },
    synthesisCue: "A neurociência oferece um mapa parcial — valioso, mas incompleto. Filosofia e fenomenologia complementam o que a imagem cerebral não captura.",
  },
  {
    id: "d2", module: "emotions",
    title: "Emoções: Universais ou Construídas?",
    question: "As emoções são universais e biológicas (Ekman/Nummenmaa) ou construções culturais (Barrett)?",
    positionA: {
      name: "Universalismo (Ekman/Nummenmaa)",
      arguments: ["Expressões faciais de emoções básicas são reconhecidas transculturalmente (Ekman, 1972)", "Mapas corporais de Nummenmaa mostram padrões consistentes em 701 participantes", "Base evolutiva: emoções são sistemas adaptativos universais"],
      sources: ["https://www.pnas.org/doi/10.1073/pnas.1321664111"],
    },
    positionB: {
      name: "Construcionismo (Barrett)",
      arguments: ["Não existem 'assinaturas neurais' fixas para cada emoção", "Culturas categorizam experiências emocionais diferentemente", "A teoria da emoção construída é mais consistente com neurociência moderna"],
      sources: ["https://academic.oup.com/scan/article/12/1/1/2823712"],
    },
    synthesisCue: "Posição intermediária: componentes biológicos universais + experiência emocional co-construída pelo contexto, linguagem e cultura.",
  },
  {
    id: "d_perma", module: "perma",
    title: "PERMA é Suficiente?",
    question: "O modelo PERMA captura todas as dimensões do florescimento humano ou há lacunas importantes?",
    positionA: {
      name: "Sim, com PERMA+V (Seligman)",
      arguments: ["5 pilares cobrem emoções, engajamento, relações, significado e realização", "Adição de Vitalidade (V) cobre dimensão física"],
      sources: ["https://pubmed.ncbi.nlm.nih.gov/16045394/"],
    },
    positionB: {
      name: "Há Lacunas (Ben-Shahar/Críticos)",
      arguments: ["SPIRE adiciona dimensão espiritual que PERMA ignora", "PERMA não aborda diretamente saúde física e financeira", "Modelos ocidentais podem não capturar bem-estar coletivista"],
      sources: ["https://www.talbenshahar.com/"],
    },
    synthesisCue: "Nenhum modelo é completo. PERMA e SPIRE são lentes complementares — usar múltiplos frameworks enriquece diagnóstico e intervenção.",
  },
  {
    id: "d_work", module: "work",
    title: "Felicidade no Trabalho: Responsabilidade de Quem?",
    question: "Bem-estar no trabalho é responsabilidade da organização, do indivíduo ou de ambos?",
    positionA: {
      name: "Da Organização (Estrutura Importa)",
      arguments: ["Ambiente tóxico anula esforços individuais de bem-estar", "Work Wellbeing Playbook mostra que drivers organizacionais são determinantes"],
      sources: ["https://wellbeing.hmc.ox.ac.uk/publications/work-wellbeing-playbook/"],
    },
    positionB: {
      name: "Do Indivíduo (Job Crafting)",
      arguments: ["Job Crafting permite redesenhar o trabalho proativamente", "Práticas pessoais (gratidão, mindfulness) funcionam em qualquer contexto"],
      sources: ["https://positiveorgs.bus.umich.edu/wp-content/uploads/What-is-Job-Crafting-and-Why-Does-it-Matter1.pdf"],
    },
    synthesisCue: "Responsabilidade compartilhada: organizações criam condições, indivíduos aproveitam e moldam. Nenhum dos dois é suficiente sozinho.",
  },
];

// ===================== POEMS =====================
export interface PedagogicalPoem {
  id: string;
  module: string;
  title: string;
  poem: string;
  author: string;
  reflection: string;
  practice: string;
}

export const poems: PedagogicalPoem[] = [
  {
    id: "p1", module: "etymology",
    title: "Felix — A Semente",
    poem: `Felix, diziam os antigos,\nnão era riso, não era festa.\nEra a terra que se abre,\na semente que não protesta.\n\nFecundo, fértil, produtivo —\nfelicidade é verbo, é ação.\nNão é o que se encontra pronto,\nmas o que nasce da intenção.`,
    author: "Gerado para fins pedagógicos",
    reflection: "A palavra 'felicidade' carrega em si a ideia de fertilidade e cultivo. O que você está cultivando?",
    practice: "Escreva 3 frases que completem: 'Estou tornando fértil...'",
  },
  {
    id: "p2", module: "worldviews",
    title: "Bússolas e Faróis",
    poem: `Aristóteles me deu uma bússola:\n'Norte é a virtude', disse ele.\nBuda apontou para dentro:\n'O mapa é a mente serena.'\n\nJesus acendeu um farol:\n'Ama — e o caminho se ilumina.'\nTantos mapas, tantas rotas,\nmas o passo é sempre meu.`,
    author: "Gerado para fins pedagógicos",
    reflection: "Cada tradição oferece um 'mapa' diferente. Qual mais ressoa com seu momento atual?",
    practice: "Escolha uma frase de qualquer filósofo ou tradição. Escreva por que ressoa.",
  },
  {
    id: "p_ill", module: "illusions",
    title: "O GPS Emocional",
    poem: `O GPS dizia: 'Vire à direita\npara a felicidade em 500 metros.'\nMas quando cheguei, era só\num estacionamento de desejos.\n\nO mapa estava errado desde o início —\nconfundiu prazer com permanência.\nA felicidade não era destino.\nEra o modo como eu caminhava.`,
    author: "Gerado para fins pedagógicos",
    reflection: "Wilson & Gilbert chamaram de 'miswanting' — desejar o que não sustenta. Qual foi sua última 'chegada' que não trouxe o esperado?",
    practice: "Liste 3 coisas que você perseguiu achando que trariam felicidade. O que realmente trouxe?",
  },
  {
    id: "p_hed", module: "hedonic",
    title: "A Esteira Encantada",
    poem: `Corro, corro, corro —\na esteira gira sem parar.\nCada meta é uma paisagem\nque some ao se alcançar.\n\nMas hoje paro. Olho em volta.\nA vista daqui já é bonita.\nGratidão é o freio suave\nque a esteira não evita.`,
    author: "Gerado para fins pedagógicos",
    reflection: "A esteira hedônica (Brickman & Campbell) nos faz correr sem sair do lugar. E se parar fosse a estratégia?",
    practice: "Escreva 3 conquistas recentes que você não celebrou. Celebre agora, por escrito.",
  },
  {
    id: "p_neuro", module: "neuro",
    title: "O Cérebro que Aprende",
    poem: `Diziam que o cérebro era pedra —\nformado, fixo, sem retorno.\nMas Davidson mostrou ao mundo:\nele é jardim, não é contorno.\n\nAwareness, connection, insight,\npurpose — quatro sementes plantadas.\nO bem-estar não é sorte.\nÉ prática. São jornadas.`,
    author: "Gerado para fins pedagógicos",
    reflection: "Se o cérebro é jardim, que sementes você está plantando com seus hábitos diários?",
    practice: "Pratique 2 minutos de atenção plena (awareness). Depois escreva o que notou.",
  },
  {
    id: "p3", module: "emotions",
    title: "Onde a Alegria Mora no Corpo",
    poem: `Perguntei à alegria\nonde ela faz morada.\nEla disse: 'No peito quente,\nnas mãos que se abrem para nada.'\n\nPerguntei ao corpo todo:\n'De quem é esse mapa?'\nE ele disse, sem palavra:\n'Sou eu que sinto — e não escapo.'`,
    author: "Gerado para fins pedagógicos",
    reflection: "Nummenmaa mostrou que emoções têm 'endereço' no corpo. Onde a gratidão mora em você?",
    practice: "Por 2 min, escaneie seu corpo. Nomeie 3 sensações e associe a uma emoção.",
  },
  {
    id: "p_perma", module: "perma",
    title: "Cinco Pilares",
    poem: `Positive Emotions — o sol que nasce.\nEngagement — o flow que abraça.\nRelationships — a ponte que sustenta.\nMeaning — a bússola que não cansa.\n\nAccomplishment — a colheita merecida.\nVitality — o corpo que respira.\nSeis letras. Um florescimento.\nPERMA+V — a vida que inspira.`,
    author: "Gerado para fins pedagógicos",
    reflection: "Qual dos 6 pilares está mais forte em você? Qual precisa de atenção?",
    practice: "Dê uma nota de 0-10 para cada pilar. Escolha o mais baixo e escreva uma ação para fortalecê-lo.",
  },
  {
    id: "p_work", module: "work",
    title: "Segunda-Feira",
    poem: `Segunda-feira não precisa\nser o dia que a alma teme.\nPode ser o dia em que\nalgo em mim se move e geme.\n\nPropósito não é luxo.\nÉ combustível. É raiz.\nE o trabalho que faz sentido\né aquele que nos diz:\n\n'Aqui você importa.'`,
    author: "Gerado para fins pedagógicos",
    reflection: "Job Crafting nos ensina que podemos redesenhar nosso trabalho. O que você mudaria na sua segunda-feira?",
    practice: "Redesenhe 1 tarefa do seu trabalho para torná-la mais significativa. Escreva o 'antes' e o 'depois'.",
  },
];

// ===================== CO-DESIGN TEMPLATES =====================
export interface CoDesignTemplate {
  id: string;
  module: string;
  title: string;
  description: string;
  sections: {
    title: string;
    prompt: string;
    placeholder: string;
  }[];
}

export const coDesignTemplates: CoDesignTemplate[] = [
  {
    id: "cd_ety", module: "etymology",
    title: "Minha Definição Operacional de Felicidade",
    description: "Construa sua definição pessoal de felicidade com indicadores mensuráveis e fundamentação.",
    sections: [
      { title: "Definição Pessoal", prompt: "Escreva sua definição de felicidade em 1-2 frases", placeholder: "Ex: Felicidade é a capacidade de..." },
      { title: "3 Indicadores Observáveis", prompt: "Como você saberia que está 'feliz'? Liste indicadores mensuráveis", placeholder: "Ex: 1) Frequência de emoções positivas por semana; 2) Qualidade das relações..." },
      { title: "Fundamentação", prompt: "Qual tradição ou evidência sustenta sua definição?", placeholder: "Ex: Alinhada com eudaimonia (Aristóteles) + SDT (Ryan & Deci)..." },
    ],
  },
  {
    id: "cd_wv", module: "worldviews",
    title: "Mapa de Cosmovisões Pessoais",
    description: "Mapeie as tradições que mais influenciam sua visão de 'vida boa'.",
    sections: [
      { title: "Tradições que Ressoam", prompt: "Quais 2-3 tradições filosófico-espirituais mais influenciam sua visão?", placeholder: "Ex: Estoicismo (foco no controlável) + Budismo (mente treinada)..." },
      { title: "Conexões com Ciência", prompt: "Como essas tradições se conectam com evidências contemporâneas?", placeholder: "Ex: Estoicismo → Regulação emocional (Gross); Budismo → Mindfulness (Davidson)..." },
      { title: "Síntese Pessoal", prompt: "Crie sua 'filosofia de vida em 3 linhas'", placeholder: "Ex: Viver com virtude (Aristóteles), serenidade (Estoicismo) e compaixão (Buda)..." },
    ],
  },
  {
    id: "cd_ill", module: "illusions",
    title: "Auditoria de Mitos Pessoais",
    description: "Identifique e desmonte os mitos sobre felicidade que mais influenciam suas decisões.",
    sections: [
      { title: "Meus 3 Mitos Favoritos", prompt: "Quais mitos sobre felicidade mais capturam você?", placeholder: "Ex: 'Quando eu ganhar X, serei feliz'; 'Se eu tivesse o corpo ideal...'..." },
      { title: "Evidência Contra", prompt: "O que a ciência diz sobre cada mito?", placeholder: "Ex: Kahneman & Deaton (2010) — renda acima de $75k não aumenta bem-estar emocional..." },
      { title: "Redesign de Prioridades", prompt: "Como você redesenharia suas prioridades baseado nas evidências?", placeholder: "Ex: Trocar metas materiais por metas experienciais e pró-sociais..." },
    ],
  },
  {
    id: "cd1", module: "hedonic",
    title: "Intervenção Anti-Adaptação Hedônica",
    description: "Desenhe uma intervenção para retardar a adaptação hedônica.",
    sections: [
      { title: "Contexto e Diagnóstico", prompt: "Onde a adaptação hedônica está mais presente?", placeholder: "Ex: Após promoções, a satisfação cai em 3 meses..." },
      { title: "Hipótese", prompt: "Qual o mecanismo de adaptação neste contexto?", placeholder: "Ex: A falta de variação nas rotinas acelera a habituação..." },
      { title: "Intervenção Proposta", prompt: "3-5 atividades concretas com cronograma", placeholder: "Ex: Semana 1-2: Gratidão rotating nas reuniões..." },
      { title: "Métricas", prompt: "Como medir sucesso?", placeholder: "Ex: Leading: frequência de práticas | Lagging: NPS satisfação mensal" },
      { title: "Riscos e Mitigação", prompt: "O que pode dar errado?", placeholder: "Ex: Risco: fadiga da prática | Mitigação: variar formato a cada 2 semanas" },
      { title: "Evidências de Suporte", prompt: "Quais estudos sustentam a intervenção?", placeholder: "Ex: Lyubomirsky (2011) — variação e gratidão retardam adaptação..." },
    ],
  },
  {
    id: "cd_neuro", module: "neuro",
    title: "Programa de Treino Neural de Bem-Estar",
    description: "Projete um programa de 4 semanas baseado nas 4 dimensões de Davidson.",
    sections: [
      { title: "Semana 1: Awareness", prompt: "Que práticas de atenção plena implementar?", placeholder: "Ex: 5 min de meditação guiada; body scan antes de dormir..." },
      { title: "Semana 2: Connection", prompt: "Que práticas de conexão social implementar?", placeholder: "Ex: Prática de bondade amorosa; 1 ato de gentileza intencional por dia..." },
      { title: "Semana 3: Insight", prompt: "Que práticas de autoconhecimento implementar?", placeholder: "Ex: Journaling reflexivo; identificação de padrões automáticos..." },
      { title: "Semana 4: Purpose", prompt: "Que práticas de propósito implementar?", placeholder: "Ex: Revisão de valores pessoais; alinhamento tarefa-propósito..." },
    ],
  },
  {
    id: "cd_emo", module: "emotions",
    title: "Protocolo de Regulação Emocional",
    description: "Crie um protocolo pessoal de regulação emocional baseado em Gross e Nummenmaa.",
    sections: [
      { title: "Meus Gatilhos Emocionais", prompt: "Quais situações disparam emoções intensas?", placeholder: "Ex: Feedback negativo → vergonha; Prazos apertados → ansiedade..." },
      { title: "Mapa Corporal Pessoal", prompt: "Onde você sente cada emoção no corpo?", placeholder: "Ex: Ansiedade → peito e estômago; Raiva → mandíbula e punhos..." },
      { title: "Estratégias de Regulação", prompt: "Quais estratégias usar para cada gatilho? (Gross)", placeholder: "Ex: Reavaliação cognitiva para feedback negativo; Respiração para prazos..." },
    ],
  },
  {
    id: "cd_perma", module: "perma",
    title: "Plano PERMA+V de 30 Dias",
    description: "Crie um plano pessoal de florescimento baseado nos 6 pilares.",
    sections: [
      { title: "Diagnóstico PERMA+V (0-10)", prompt: "Avalie cada pilar de 0 a 10", placeholder: "P: _ | E: _ | R: _ | M: _ | A: _ | V: _" },
      { title: "Pilar Prioritário", prompt: "Qual pilar fortalecer primeiro? Por quê?", placeholder: "Ex: Engagement (4/10) — sinto falta de flow no trabalho..." },
      { title: "Plano de 30 Dias", prompt: "1 ação por semana para o pilar prioritário", placeholder: "S1: Identificar atividades de flow | S2: Bloquear tempo para prática | S3: Ajustar desafio-habilidade | S4: Avaliar progresso" },
      { title: "Métricas de Sucesso", prompt: "Como saber se está funcionando?", placeholder: "Ex: Frequência semanal de flow; Satisfação (0-10) quinzenal..." },
    ],
  },
  {
    id: "cd_work", module: "work",
    title: "Programa de Bem-Estar Organizacional",
    description: "Projete um programa baseado nos drivers do Work Wellbeing Playbook e Job Crafting.",
    sections: [
      { title: "Diagnóstico Organizacional", prompt: "Como está o bem-estar atual? Quais drivers estão fracos?", placeholder: "Ex: Propósito baixo; engajamento em queda; pertencimento razoável..." },
      { title: "Intervenções por Driver", prompt: "O que implementar para cada driver fraco?", placeholder: "Ex: Propósito → Conectar tarefas a impacto; Engajamento → Job Crafting workshops..." },
      { title: "Job Crafting Coletivo", prompt: "Como facilitar Job Crafting na equipe?", placeholder: "Ex: Workshop mensal onde cada membro redesenha 1 aspecto do trabalho..." },
      { title: "Métricas e Revisão", prompt: "Como medir progresso? Qual cadência?", placeholder: "Ex: Pesquisa trimestral de bem-estar; leading indicators mensais..." },
    ],
  },
];
