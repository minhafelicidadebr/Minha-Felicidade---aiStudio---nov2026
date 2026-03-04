import { Module } from "./courseData";

export interface ModuleContent {
  id: string;
  overview: string;
  keyInsight: string;
  learningObjectives: string[];
  slideReferences: string[];
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
    slideReferences: ["Slide 1: Título e pilares (História, Fundamentos, Fórmulas, Práticas)", "Slide 2: Pergunta disparadora — 'O que é felicidade para vocês?'", "Slide 3: Etimologia — felix, fecundo, raiz *dhe(i)*"],
    activities: [
      { title: "Mapa Semântico Vivo", type: "Colaborativa", description: "Em grupos de 4, criem um mapa visual conectando: felicidade, prazer, satisfação, bem-estar, florescimento, alegria. Cada grupo apresenta e debate as diferenças.", duration: "20 min" },
      { title: "Minha Definição Operacional", type: "Individual", description: "Escreva sua definição de felicidade com 3 indicadores mensuráveis/observáveis. Ex: 'frequência de emoções positivas', 'senso de propósito diário', 'qualidade das relações'.", duration: "10 min" },
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
    overview: "Antes da ciência, filósofos e tradições espirituais já mapeavam caminhos para a vida boa. Aristóteles propôs a eudaimonia como atividade virtuosa; os estoicos, a serenidade via controle interno; Buda, o desapego do sofrimento; Jesus, o amor ao próximo. Este módulo mapeia as 'famílias conceituais' da felicidade e mostra como dialogam com a ciência contemporânea — sem reduzir espiritualidade a neuroquímica.",
    keyInsight: "Filosofia e espiritualidade não competem com ciência — oferecem mapas complementares para o mesmo território humano.",
    learningObjectives: [
      "Identificar pelo menos 6 tradições filosófico-espirituais e suas visões de felicidade",
      "Classificar abordagens em famílias: virtude, prazer, serenidade, compaixão, sentido",
      "Articular como filosofia e ciência dialogam sem reducionismo",
      "Argumentar a favor e contra pelo menos 2 posições em debate estruturado",
    ],
    slideReferences: ["Slide 4: Filosofia como bússola — Aristóteles e Platão", "Slide 5: Espiritualidade como farol — N. Sri Ram e Jesus Cristo"],
    activities: [
      { title: "Arena de Debate Socrático", type: "App/Presencial", description: "'Felicidade é virtude, prazer ou sentido?' — debate estruturado com mapa de argumentos, contra-argumentos e pressupostos.", duration: "30 min" },
      { title: "Galeria de Cosmovisões", type: "Grupos", description: "Cada grupo recebe 2 tradições e apresenta: ideia central, uma frase-chave, e como conecta com evidência contemporânea.", duration: "25 min" },
      { title: "Poesia Pedagógica", type: "App", description: "Leitura de poema reflexivo sobre 'bússolas e faróis' + prática de escrita contemplativa.", duration: "15 min" },
    ],
    scientificNotes: [
      { claim: "Aristóteles: 'A virtude das virtudes é a felicidade, o encontro do pensamento e da ação' (384 a.C.–322 a.C.)", status: "parcial", correction: "A citação é uma paráfrase do conceito de eudaimonia na Ética a Nicômaco. Datas de Platão e Aristóteles estão trocadas no slide 4.", source: "https://plato.stanford.edu/entries/aristotle-ethics/" },
      { claim: "Platão: 'A função da alma é ser virtuosa e justa' (384 a.C.–322 a.C.)", status: "parcial", correction: "As datas atribuídas a Platão estão erradas — Platão viveu de 428/427 a.C. a 348/347 a.C. As datas no slide são de Aristóteles.", source: "https://plato.stanford.edu/entries/plato/" },
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
    slideReferences: ["Slides 8-9: Yale — Ilusões da Felicidade", "Slide 10: Mito 1 — Salário alto", "Slide 11: Mito 2 — Mais dinheiro", "Slide 12: Gastar com outros", "Slide 13: Mito 3 — Materialismo", "Slide 14: Mito 4 — Corpo perfeito", "Slide 15: Mito 5 — Notas perfeitas", "Slide 16: Mito 6 — Amor eterno"],
    activities: [
      { title: "Simulador de Decisões", type: "App", description: "'Você recebeu um bônus de R$ 5.000 — como gastar?' Cenários com consequências baseadas em evidências (self vs others vs experiência vs tempo).", duration: "20 min" },
      { title: "VideoLab: Miswanting", type: "App", description: "Vídeo curto sobre affective forecasting + quiz de compreensão + prática reflexiva.", duration: "15 min" },
      { title: "Meu Mito Favorito", type: "Individual", description: "Reflexão: 'Qual desses 6 mitos mais me captura? O que eu faria diferente com essa consciência?'", duration: "10 min" },
    ],
    scientificNotes: [
      { claim: "Kahneman & Deaton (2010): bem-estar emocional aumenta até US$ 75.000/ano e estagna", status: "verificado", source: "https://www.pnas.org/doi/10.1073/pnas.1011492107" },
      { claim: "Gastar com outros gera mais felicidade (Dunn, Aknin & Norton, 2014)", status: "verificado", correction: "O estudo original é de 2008 (Science). 2014 refere-se a revisões/replicações.", source: "https://www.science.org/doi/10.1126/science.1150952" },
      { claim: "Correlação fraca renda-satisfação (~0.10)", status: "parcial", correction: "O valor exato varia por estudo e amostra. Revisões mais recentes (Killingsworth, 2021) sugerem que a relação pode continuar acima de $75k para avaliação da vida.", source: "https://pubmed.ncbi.nlm.nih.gov/20823223/" },
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
    slideReferences: ["Slide 17: Adaptação hedônica + exemplos", "Slide 26: Modelo 50/40/10 (Lyubomirsky)"],
    activities: [
      { title: "Estúdio de Co-design", type: "App", description: "Desenhe 2 intervenções anti-adaptação com: objetivo, atividades, métricas, riscos e evidências.", duration: "30 min" },
      { title: "Flashcards de Gatilhos", type: "App", description: "Gatilhos de adaptação + 'antídotos' (variação, gratidão, novidade planejada, savoring).", duration: "10 min" },
      { title: "Plano Anti-Esteira 7 Dias", type: "Individual", description: "Crie um plano pessoal de 7 dias com uma prática anti-adaptação por dia + métrica simples (0-10).", duration: "15 min" },
    ],
    scientificNotes: [
      { claim: "50% genética, 40% atividades intencionais, 10% circunstâncias (Lyubomirsky, 2005)", status: "simplificação", correction: "O modelo é heurístico e depende de método/amostra. Não deve ser interpretado como 'determinismo genético'. A própria autora revisou em publicações posteriores, reconhecendo que os percentuais são aproximações de estudos de gêmeos.", source: "https://journals.sagepub.com/doi/10.1037/1089-2680.9.2.111" },
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
    slideReferences: ["Slide 19: Felicidade pode ser aprendida — neurociência", "Slide 20: Cérebro trino vs Conectoma", "Slide 21: Davidson e plasticidade", "Slide 22: Neurotransmissores da felicidade"],
    activities: [
      { title: "Quiz Nível 3: Metáfora vs Mecanismo", type: "App", description: "Diferencie linguagem popular ('hormônio da felicidade') de explicação científica (circuitos distribuídos).", duration: "12 min" },
      { title: "VideoLab: Neuroplasticidade", type: "App", description: "Vídeo sobre Davidson + quiz + reflexão sobre treinabilidade do bem-estar.", duration: "15 min" },
    ],
    scientificNotes: [
      { claim: "Neurotransmissores da felicidade (dopamina, serotonina, ocitocina, endorfina)", status: "simplificação", correction: "Sistemas neurobiológicos complexos envolvem circuitos distribuídos (córtex pré-frontal, estriado, amígdala), múltiplos receptores e contexto. Correlação ≠ causalidade. Usar como 'linguagem popular' mas ensinar a versão correta.", source: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2944261/" },
      { claim: "Cérebro trino (3 regiões — Paul MacLean, 1990)", status: "simplificação", correction: "Modelo superado. O Projeto Conectoma Humano (2009) identificou 180+ regiões. Usar apenas como 'nota histórica', não como explicação neurocientífica atual.", source: "https://www.nature.com/articles/nature18933" },
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
    slideReferences: ["Slide 23: Mapas corporais das emoções (Nummenmaa)", "Slide 24: Por que importa — aplicação prática"],
    activities: [
      { title: "Dinâmica Experiencial: Mapa do Corpo", type: "Presencial", description: "Olhos fechados, relembrar um momento de alegria (ou medo) e identificar onde sentiram calor ou frio no corpo.", duration: "10 min" },
      { title: "Arena de Debate", type: "App", description: "'Emoções são universais ou construídas culturalmente?' — debate com evidências de ambos os lados.", duration: "20 min" },
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
    slideReferences: ["Slide 28: SPIRE (Tal Ben-Shahar)", "Slide 29: PERMA+V (Seligman)", "Slides 30-32: Educação Positiva (Adler)", "Slides 33-38: Detalhamento de cada pilar PERMA+V", "Slide 34: Benefícios da gratidão"],
    activities: [
      { title: "Trilha de Implementação", type: "App", description: "Gere um PDF técnico de 3+ páginas: 'Meu plano PERMA+V de 30 dias' com diagnóstico, ações, métricas e riscos.", duration: "25 min" },
      { title: "Evidence Explorer", type: "App", description: "5 práticas (gratidão, gentileza, conexão, mindfulness, atividade física) — cada uma com evidência + limitações.", duration: "15 min" },
      { title: "Flashcards PERMA+V", type: "App", description: "Cada pilar com definição, exemplo e evidência.", duration: "8 min" },
    ],
    scientificNotes: [
      { claim: "Fonte: Universidade de Harvard (benefícios da gratidão)", status: "parcial", correction: "A referência genérica 'Harvard' precisa ser especificada. Possíveis fontes: Harvard Health Publishing (2021) ou estudos de Emmons & McCullough (2003). Meta-análise de Davis et al. (2016) é a referência mais robusta.", source: "https://pubmed.ncbi.nlm.nih.gov/26575348/" },
      { claim: "Gratidão ativa áreas do cérebro ligadas à recompensa e moralidade", status: "verificado", source: "https://pubmed.ncbi.nlm.nih.gov/26746580/" },
    ],
    reflectionQuestion: "Se você pudesse fortalecer apenas 1 pilar do PERMA+V nos próximos 30 dias — qual escolheria e por quê?",
  },
  work: {
    id: "work",
    overview: "Felicidade no trabalho não é pizza na sexta-feira — é segurança psicológica (Edmondson), confiança organizacional (Mayer, Davis & Schoorman) e intervenções baseadas em evidências. O Work Wellbeing Playbook (Oxford/WWM/Indeed) oferece um framework aplicável de drivers organizacionais.",
    keyInsight: "Confiança organizacional é preditora de performance. Segurança psicológica é o solo onde inovação cresce.",
    learningObjectives: [
      "Definir segurança psicológica com precisão (Edmondson, 1999)",
      "Identificar os 3 componentes do modelo de confiança (ability, benevolence, integrity)",
      "Projetar uma intervenção de confiança em 90 dias com métricas",
      "Diferenciar 'felicidade no trabalho' como modismo vs. como prática baseada em evidências",
    ],
    slideReferences: ["Slide 18: Benefícios organizacionais (Gallup, Achor, Seligman)"],
    activities: [
      { title: "Simulador: Erro no Trabalho", type: "App", description: "'Um erro grave aconteceu na equipe — você pune ou aprende?' Cenários com consequências para segurança psicológica.", duration: "15 min" },
      { title: "Estúdio de Co-design", type: "App", description: "Intervenção de confiança em 90 dias: rituais, feedback, acordos de comunicação, gestão de conflitos.", duration: "30 min" },
      { title: "Trilha de Implementação", type: "App", description: "PDF técnico com escopo, ações, métricas (leading/lagging), evidências e plano de revisão.", duration: "20 min" },
    ],
    scientificNotes: [
      { claim: "Dados Gallup/Achor: +21% produtividade, +300% inovação, -37% absenteísmo", status: "parcial", correction: "Os percentuais são frequentemente citados sem a metodologia completa. Gallup State of the Global Workplace é a fonte mais confiável. Achor's numbers vêm de meta-análises variadas. Recomenda-se citar a fonte primária específica para cada número.", source: "https://www.gallup.com/workplace/349484/state-of-the-global-workplace.aspx" },
    ],
    reflectionQuestion: "Na sua equipe, o que acontece quando alguém comete um erro? Essa resposta revela o nível de segurança psicológica.",
  },
};

// Simulator scenarios
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
    id: "s1", module: "illusions",
    title: "O Bônus Inesperado",
    context: "Você recebeu um bônus de R$ 5.000. Baseado na ciência do bem-estar, como seria melhor investir para maximizar sua felicidade sustentável?",
    options: [
      { text: "Comprar o smartphone mais recente", consequence: "Prazer imediato, mas adaptação hedônica em 2-3 meses. Retorno ao nível basal. Materialismo correlacionado com menor bem-estar (Kasser & Ryan, 1993).", impact: "negativo", xp: 5 },
      { text: "Gastar com experiências (viagem, curso, show) com pessoas queridas", consequence: "Experiências geram mais felicidade duradoura que bens materiais. Compartilhar potencializa o efeito via conexão social (Van Boven & Gilovich, 2003).", impact: "positivo", xp: 20 },
      { text: "Doar parte para uma causa e gastar o resto com amigos", consequence: "Gastar com outros gera maior aumento de felicidade (Dunn et al., 2008, Science). Combina gasto pró-social + experiencial = máximo impacto.", impact: "positivo", xp: 25 },
      { text: "Guardar tudo na poupança 'para emergências'", consequence: "Segurança financeira é importante, mas acumular sem usufruir não gera bem-estar emocional além do básico (Kahneman & Deaton, 2010).", impact: "neutro", xp: 10 },
    ],
  },
  {
    id: "s2", module: "work",
    title: "O Erro na Reunião",
    context: "Durante uma apresentação importante, um membro da sua equipe apresenta dados incorretos. O cliente percebe. Você é o líder. Como reage?",
    options: [
      { text: "Repreender publicamente para mostrar que 'não tolera erros'", consequence: "Destrói segurança psicológica. A equipe aprende a esconder erros. Edmondson (1999): equipes com baixa PS têm menos aprendizagem e inovação.", impact: "negativo", xp: 5 },
      { text: "Assumir responsabilidade, corrigir com o cliente, e fazer retrospectiva privada", consequence: "Máxima segurança psicológica. Modela vulnerabilidade e aprendizagem. O erro vira oportunidade de melhoria sistêmica (Edmondson, 1999).", impact: "positivo", xp: 25 },
      { text: "Ignorar o erro e seguir a reunião", consequence: "Evitação de conflito ≠ segurança psicológica. O problema não é resolvido e pode se repetir. Falta de feedback construtivo.", impact: "negativo", xp: 5 },
      { text: "Conversar com o colaborador em particular depois, sem abordar com a equipe", consequence: "Melhor que repreensão pública, mas perde a oportunidade de modelar aprendizagem coletiva. Parcialmente eficaz.", impact: "neutro", xp: 15 },
    ],
  },
  {
    id: "s3", module: "hedonic",
    title: "A Promoção Esperada",
    context: "Depois de 2 anos de dedicação, você finalmente recebeu a promoção. A euforia é enorme. Baseado no que aprendeu sobre adaptação hedônica, o que faz para sustentar o bem-estar?",
    options: [
      { text: "Celebrar intensamente e esperar que a felicidade dure naturalmente", consequence: "Sem estratégia anti-adaptação, a euforia retorna ao baseline em 2-6 meses (Brickman & Campbell, 1971). Oportunidade desperdiçada.", impact: "negativo", xp: 5 },
      { text: "Praticar gratidão diária + variar rotinas + savoring consciente", consequence: "Tríade anti-adaptação: gratidão retarda habituação, variação mantém novidade, savoring prolonga emoção positiva (Lyubomirsky, 2011).", impact: "positivo", xp: 25 },
      { text: "Já começar a focar na próxima promoção", consequence: "Clássica esteira hedônica. A meta seguinte substitui a satisfação presente. Ciclo infinito sem florescimento.", impact: "negativo", xp: 5 },
      { text: "Compartilhar a conquista com pessoas queridas e refletir sobre o caminho", consequence: "Capitalização social (Gable et al., 2004): compartilhar positivamente aumenta emoções positivas e fortalece relações. Bom + poderia adicionar práticas de sustentação.", impact: "positivo", xp: 20 },
    ],
  },
  {
    id: "s4", module: "emotions",
    title: "A Ansiedade Antes da Apresentação",
    context: "Você está prestes a fazer uma apresentação importante. Sente o coração acelerado, palmas suando, tensão no peito. Usando o que aprendeu sobre ciência das emoções, o que faz?",
    options: [
      { text: "Tentar suprimir a ansiedade ('não posso sentir isso agora')", consequence: "Supressão emocional é a estratégia menos eficaz (Gross, 1998). Aumenta ativação fisiológica e reduz performance cognitiva.", impact: "negativo", xp: 5 },
      { text: "Reconhecer as sensações corporais como 'energia' e redirecionar (reavaliação cognitiva)", consequence: "Reavaliação cognitiva é a estratégia mais eficaz de regulação (Gross, 1998). Nummenmaa: reconhecer o corpo como mapa emocional é o primeiro passo.", impact: "positivo", xp: 25 },
      { text: "Fazer 3 respirações profundas e nomear a emoção ('estou sentindo ansiedade')", consequence: "Naming emotions reduz ativação da amígdala (Lieberman et al., 2007). Respiração ativa sistema nervoso parassimpático. Excelente combinação.", impact: "positivo", xp: 20 },
      { text: "Tomar um calmante e seguir em frente", consequence: "Solução farmacológica pode ser necessária em casos clínicos, mas como estratégia padrão não desenvolve habilidades de regulação. Dependência de recurso externo.", impact: "neutro", xp: 10 },
    ],
  },
];

// Debate topics
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
    id: "d1", module: "worldviews",
    title: "O Grande Debate: Virtude vs. Prazer vs. Sentido",
    question: "Felicidade é virtude (Aristóteles), prazer (Epicuro) ou sentido (Frankl)?",
    positionA: {
      name: "Eudaimonia (Aristóteles/Seligman)",
      arguments: [
        "Felicidade duradoura vem do exercício de virtudes e forças de caráter, não de prazeres momentâneos",
        "Eudaimonia está associada a maior resiliência e bem-estar sustentado (Ryan & Deci, 2001)",
        "O modelo PERMA confirma: meaning e accomplishment são tão importantes quanto emoções positivas",
      ],
      sources: ["https://plato.stanford.edu/entries/aristotle-ethics/", "https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf"],
    },
    positionB: {
      name: "Hedonismo Qualificado (Epicuro/Kahneman)",
      arguments: [
        "Sem emoções positivas, nenhum modelo de 'boa vida' se sustenta — prazer é fundamento, não capricho",
        "Kahneman mostrou que o 'eu experiencial' (momento a momento) é tão válido quanto o 'eu avaliativo'",
        "Epicuro não propunha hedonismo vulgar — propunha prazer via simplicidade, amizade e ataraxia",
      ],
      sources: ["https://plato.stanford.edu/entries/epicurus/", "https://www.pnas.org/doi/10.1073/pnas.1011492107"],
    },
    synthesisCue: "E se ambas as posições forem parcialmente corretas? PERMA integra prazer (P), virtude/engajamento (E,A) e sentido (M). A dicotomia é falsa?",
  },
  {
    id: "d2", module: "emotions",
    title: "Emoções: Universais ou Construídas?",
    question: "As emoções são universais e biológicas (Ekman/Nummenmaa) ou construções culturais (Barrett)?",
    positionA: {
      name: "Universalismo (Ekman/Nummenmaa)",
      arguments: [
        "Expressões faciais de 6 emoções básicas são reconhecidas transculturalmente (Ekman, 1972)",
        "Mapas corporais de Nummenmaa (2014) mostram padrões consistentes em 701 participantes de várias culturas",
        "Base evolutiva: emoções são sistemas adaptativos que existem em todos os mamíferos",
      ],
      sources: ["https://www.pnas.org/doi/10.1073/pnas.1321664111"],
    },
    positionB: {
      name: "Construcionismo (Barrett)",
      arguments: [
        "Não existem 'assinaturas neurais' fixas para cada emoção — o cérebro constrói emoções em contexto",
        "Culturas categorizam experiências emocionais de formas radicalmente diferentes",
        "A teoria da emoção construída (Barrett, 2017) é mais consistente com neurociência moderna",
      ],
      sources: ["https://academic.oup.com/scan/article/12/1/1/2823712"],
    },
    synthesisCue: "A maioria dos pesquisadores atuais adota uma posição intermediária: há componentes biológicos universais, mas a experiência emocional é co-construída pelo contexto, linguagem e cultura.",
  },
];

// Poems
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
    poem: `Felix, diziam os antigos,\nnão era riso, não era festa.\nEra a terra que se abre,\na semente que não protesta.\n\nFecundo, fértil, produtivo —\nfelicidade é verbo, é ação.\nNão é o que se encontra pronto,\nmas o que nasce da intenção.\n\nAmamentar, nutrir, gerar —\na raiz que o tempo escondeu.\nFelicidade não se acha:\nse cultiva. E depois, cresceu.`,
    author: "Gerado para fins pedagógicos",
    reflection: "A palavra 'felicidade' carrega em si a ideia de fertilidade e cultivo. O que você está cultivando na sua vida que pode florescer?",
    practice: "Escreva 3 frases que completem: 'Estou tornando fértil...' Podem ser relações, habilidades, projetos ou estados internos.",
  },
  {
    id: "p2", module: "worldviews",
    title: "Bússolas e Faróis",
    poem: `Aristóteles me deu uma bússola:\n'Norte é a virtude', disse ele.\nBuda apontou para dentro:\n'O mapa é a mente serena.'\n\nJesus acendeu um farol:\n'Ama — e o caminho se ilumina.'\nEpicuro sussurrou:\n'O simples é que sustenta.'\n\nTantos mapas, tantas rotas,\ntantas vozes nessa trilha.\nMas o passo é sempre meu —\ne a jornada, maravilha.`,
    author: "Gerado para fins pedagógicos",
    reflection: "Cada tradição oferece um 'mapa' diferente. Nenhum é completo sozinho. Qual tradição mais ressoa com seu momento atual?",
    practice: "Escolha uma frase de qualquer filósofo ou tradição espiritual que ressoe hoje. Escreva por que ressoa — e o que faria diferente se a levasse a sério.",
  },
  {
    id: "p3", module: "emotions",
    title: "Onde a Alegria Mora no Corpo",
    poem: `Perguntei à alegria\nonde ela faz morada.\nEla disse: 'No peito quente,\nnas mãos que se abrem para nada.'\n\nPerguntei à tristeza\nonde guarda seus pertences.\n'Nos ombros', ela respondeu,\n'e nos silêncios que são densos.'\n\nPerguntei ao corpo todo:\n'De quem é esse mapa?'\nE ele disse, sem palavra:\n'Sou eu que sinto — e não escapo.'`,
    author: "Gerado para fins pedagógicos",
    reflection: "Nummenmaa mostrou que emoções têm 'endereço' no corpo. Feche os olhos. Onde a gratidão mora em você agora?",
    practice: "Por 2 minutos, escaneie seu corpo da cabeça aos pés. Nomeie 3 sensações físicas e associe cada uma a uma emoção. Escreva em forma de haiku (5-7-5 sílabas).",
  },
];

// Co-design templates
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
    id: "cd1", module: "hedonic",
    title: "Intervenção Anti-Adaptação Hedônica",
    description: "Desenhe uma intervenção para retardar a adaptação hedônica em um contexto pessoal ou organizacional.",
    sections: [
      { title: "Contexto e Diagnóstico", prompt: "Em qual área da vida/trabalho a adaptação hedônica está mais presente?", placeholder: "Ex: Após promoções, a satisfação da equipe cai em 3 meses..." },
      { title: "Hipótese", prompt: "Qual é sua hipótese sobre o mecanismo de adaptação neste contexto?", placeholder: "Ex: A falta de variação nas rotinas acelera a habituação..." },
      { title: "Intervenção Proposta", prompt: "Descreva 3-5 atividades concretas com cronograma", placeholder: "Ex: Semana 1-2: Implementar 'gratidão rotating' nas reuniões..." },
      { title: "Métricas", prompt: "Como você medirá o sucesso? (leading e lagging indicators)", placeholder: "Ex: Leading: frequência de práticas | Lagging: NPS de satisfação mensal" },
      { title: "Riscos e Mitigação", prompt: "O que pode dar errado? Como prevenir?", placeholder: "Ex: Risco: fadiga da prática | Mitigação: variar formato a cada 2 semanas" },
      { title: "Evidências de Suporte", prompt: "Quais estudos sustentam sua intervenção?", placeholder: "Ex: Lyubomirsky (2011) — variação e gratidão retardam adaptação..." },
    ],
  },
  {
    id: "cd2", module: "work",
    title: "Plano de Confiança Organizacional (90 dias)",
    description: "Projete uma intervenção de confiança para sua equipe/organização com base em Edmondson e no modelo de Mayer, Davis & Schoorman.",
    sections: [
      { title: "Diagnóstico Atual", prompt: "Como está a confiança hoje? Quais são os sintomas de baixa/alta confiança?", placeholder: "Ex: Membros da equipe não compartilham erros; conflitos são evitados..." },
      { title: "Componentes-Alvo", prompt: "Ability, Benevolence ou Integrity — qual foco?", placeholder: "Ex: Foco em benevolence — as pessoas não acreditam que o líder age no interesse delas..." },
      { title: "Rituais de Confiança", prompt: "Quais rituais implementar? (1:1, retros, check-ins, feedback)", placeholder: "Ex: Check-in emocional de 2 min no início de reuniões; retro mensal com protocolo de 'falhas celebradas'..." },
      { title: "Cronograma 30-60-90", prompt: "O que muda em cada fase?", placeholder: "30 dias: diagnóstico + primeiros rituais | 60 dias: ajuste + métricas | 90 dias: revisão + expansão..." },
      { title: "Métricas e Governança", prompt: "Como medir progresso? Qual cadência de revisão?", placeholder: "Ex: Pesquisa quinzenal de PS (3 perguntas); QBR trimestral de resultados..." },
      { title: "Evidências", prompt: "Quais fontes sustentam cada elemento?", placeholder: "Ex: Edmondson (1999) para PS; Dirks & Ferrin (2002) para confiança-performance..." },
    ],
  },
];
