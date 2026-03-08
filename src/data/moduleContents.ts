export interface ModuleContent {
  id: string;
  overview: string;
  keyInsight: string;
  learningObjectives: string[];
  activities: { title: string; type: string; description: string; duration: string }[];
  scientificNotes: { claim: string; status: "verificado" | "parcial" | "simplificação"; correction?: string; source?: string }[];
  reflectionQuestion: string;
  rewirement: { theme: string; action: string; challenge: string };
}

export interface SimulatorScenario {
  id: string;
  module: string;
  title: string;
  context: string;
  options: { text: string; consequence: string; impact: "positivo" | "neutro" | "negativo"; xp: number; evidence?: string }[];
}

export interface DebateTopic {
  id: string;
  module: string;
  title: string;
  context: string;
  positionA: { title: string; arguments: string[]; sources: string[] };
  positionB: { title: string; arguments: string[]; sources: string[] };
  synthesisCue: string;
}

export interface Poem {
  id: string;
  module: string;
  title: string;
  author: string;
  text: string;
  reflection: string;
  practice: string;
}

export interface CoDesignTemplate {
  id: string;
  module: string;
  title: string;
  description: string;
  sections: { title: string; prompt: string }[];
}

export const moduleContents: Record<string, ModuleContent> = {
  mentiras: {
    id: "mentiras",
    overview: "Seu cérebro está mentindo para você. A sociedade diz que notas perfeitas, dinheiro, bens materiais, corpo ideal e status profissional trazem felicidade — mas a ciência desmistificou tudo isso. Baseado no curso mais popular da história de Yale, este módulo desvenda o conceito de 'Miswanting' e a Falácia de G.I. Joe.",
    keyInsight: "Não somos ruins em buscar felicidade — somos ruins em prever ONDE ela está. Nosso GPS emocional tem um bug chamado 'affective forecasting'.",
    learningObjectives: [
      "Reconhecer que nossa intuição sobre o que nos fará felizes está frequentemente errada (Miswanting)",
      "Identificar as 6 'Falsas Crenças' (Misconceptions) sobre felicidade que a ciência desmistificou",
      "Compreender a Falácia de G.I. Joe: saber NÃO é suficiente — o curso exige AÇÃO",
    ],
    activities: [
      { title: "Assistir Aulas em Vídeo", type: "Vídeo", description: "7 vídeos do curso de Yale com legendas em português", duration: "61 min" },
      { title: "Quiz Diagnóstico", type: "App", description: "Quiz sobre Misconceptions e Miswanting com 3 níveis de dificuldade", duration: "10 min" },
      { title: "Meu Mito Favorito", type: "Reflexão", description: "Qual dos 6 mitos mais captura você? O que faria diferente?", duration: "10 min" },
    ],
    scientificNotes: [
      { claim: "Kahneman & Deaton (2010): bem-estar emocional sobe até US$ 75.000/ano e estagna", status: "verificado", source: "https://www.pnas.org/doi/10.1073/pnas.1011492107" },
      { claim: "Miswanting: desejamos sistematicamente coisas que não sustentam bem-estar (Wilson & Gilbert)", status: "verificado", source: "https://www.hbs.edu/faculty/Pages/item.aspx?num=3826" },
      { claim: "Correlação fraca renda-satisfação (~0.10)", status: "parcial", correction: "Killingsworth (2021) sugere relação contínua acima de $75k para avaliação da vida.", source: "https://pubmed.ncbi.nlm.nih.gov/20823223/" },
    ],
    reflectionQuestion: "Se dinheiro, corpo e notas NÃO sustentam felicidade — o que sustenta? E como você redesenharia suas prioridades?",
    rewirement: {
      theme: "Desaceleração da Adaptação Hedônica",
      action: "Savoring e Gratidão",
      challenge: "Por 7 dias, escolha um momento positivo do seu dia e pratique o Savoring intencionalmente. Sem celular. Aprecie conscientemente.",
    },
  },
  expectativas: {
    id: "expectativas",
    overview: "Se você já sabe que notas e dinheiro não trazem felicidade (Módulo 1), por que continua correndo atrás? Porque seu cérebro está programado para falhar. Este módulo revela as 4 'Features Irritantes da Mente' que sabotam sua busca: ilusão emocional, comparação social, adaptação hedônica e exagero do impacto.",
    keyInsight: "Seu 'default setting' está quebrado. A mente não avalia felicidade em termos absolutos — sempre compara, se adapta e exagera.",
    learningObjectives: [
      "Identificar as 4 'Annoying Features of the Mind' que levam ao Miswanting",
      "Compreender a Adaptação Hedônica (esteira hedônica) e por que conquistas perdem o brilho",
      "Reconhecer como Pontos de Referência causam comparação social e inveja",
      "Entender o Impact Bias: por que superestimamos emoções futuras",
    ],
    activities: [
      { title: "Assistir Aulas em Vídeo", type: "Vídeo", description: "7 vídeos sobre vieses cognitivos e adaptação hedônica", duration: "64 min" },
      { title: "Diário de Comparação", type: "Prática", description: "Por 3 dias, anote quando se sentir insatisfeito e identifique o Ponto de Referência ativador", duration: "15 min/dia" },
      { title: "Simulador: A Maldição da Prata", type: "App", description: "Cenários interativos sobre comparação social e adaptação hedônica", duration: "15 min" },
    ],
    scientificNotes: [
      { claim: "Adaptação hedônica: retornamos ao baseline após eventos positivos/negativos (Brickman & Campbell, 1971)", status: "verificado", source: "https://psycnet.apa.org/record/2006-09687-012" },
      { claim: "Impact Bias: superestimamos intensidade e duração de emoções futuras (Gilbert)", status: "verificado", source: "https://scholar.harvard.edu/files/danielgilbert/files/immune-neglect.pdf" },
    ],
    reflectionQuestion: "Em qual área da sua vida a 'esteira hedônica' está mais ativa? Qual Ponto de Referência está sabotando você?",
    rewirement: {
      theme: "Preparação para Resetar Pontos de Referência",
      action: "Diário de Comparação (Micro-Ação de Conscientização)",
      challenge: "Por 3 dias, anote quando se sentir mal/ansioso/insatisfeito. Identifique o Ponto de Referência que o ativou.",
    },
  },
  rewirements: {
    id: "rewirements",
    overview: "Fim das desculpas: 40% da sua felicidade depende das suas AÇÕES. Este é o módulo mais denso — apresenta os 6 Rewirements cientificamente validados: Conexão Social, Atos de Bondade, Gratidão, Flow (Forças de Caráter), Sono & Exercício, e Abundância de Tempo.",
    keyInsight: "A felicidade não é 100% genética nem depende de 'sorte'. Você controla ~40% através de escolhas e ações intencionais.",
    learningObjectives: [
      "Compreender a distribuição 50/40/10 e o poder do controle comportamental",
      "Identificar e praticar os 6 Rewirements validados pela ciência",
      "Reconhecer Conexão Social como o maior preditor de bem-estar",
      "Usar Forças de Caráter para alcançar o estado de Flow",
    ],
    activities: [
      { title: "Assistir Aulas em Vídeo", type: "Vídeo", description: "8 vídeos sobre estratégias que realmente funcionam", duration: "144 min" },
      { title: "Diário de Gratidão", type: "Prática", description: "Por 7 dias, escreva 5 coisas pelas quais é grato cada noite", duration: "10 min/dia" },
      { title: "Atos de Bondade (AOKs)", type: "Prática", description: "Realize 5 Atos de Bondade durante a semana", duration: "Variável" },
    ],
    scientificNotes: [
      { claim: "50% genética, 40% ações intencionais, 10% circunstâncias (Lyubomirsky, 2005)", status: "simplificação", correction: "Modelo heurístico. A própria autora revisou os percentuais como aproximações.", source: "https://journals.sagepub.com/doi/10.1037/1089-2680.9.2.111" },
      { claim: "Gastar com outros gera mais felicidade (Dunn, Aknin & Norton, 2008)", status: "verificado", source: "https://www.science.org/doi/10.1126/science.1150952" },
      { claim: "Conexão social é o maior preditor de bem-estar (Diener & Seligman, 2002)", status: "verificado", source: "https://pubmed.ncbi.nlm.nih.gov/12585811/" },
    ],
    reflectionQuestion: "Se você pudesse escolher apenas 1 Rewirement para praticar nas próximas 4 semanas — qual seria e por quê?",
    rewirement: {
      theme: "Início da Prática Comportamental",
      action: "Dueto Gratidão + Conexão Social",
      challenge: "Semana 1: Diário de Gratidão (5 itens/noite) + 5 Atos de Bondade. Meça seu bem-estar no início e fim da semana.",
    },
  },
  hacks: {
    id: "hacks",
    overview: "Você conhece os bugs (Módulo 2) e os Rewirements (Módulo 3). Agora é hora do kit de Antivírus Mental. Este módulo ensina técnicas para 'trapacear' os mecanismos que roubam sua felicidade: Savoring, Visualização Negativa, Reset de Pontos de Referência, Mindfulness e Investimento em Experiências.",
    keyInsight: "Não é possível eliminar os vieses da mente — mas é possível 'hackear' esses mecanismos com técnicas específicas e contraintuitivas.",
    learningObjectives: [
      "Praticar Savoring para retardar a Adaptação Hedônica",
      "Dominar a Visualização Negativa (técnica estoica) para restaurar gratidão",
      "Resetar Pontos de Referência para combater comparação social",
      "Usar Mindfulness/Meditação para combater o Mind-Wandering",
    ],
    activities: [
      { title: "Assistir Aulas em Vídeo", type: "Vídeo", description: "6 vídeos sobre técnicas de 'hackeamento' mental", duration: "72 min" },
      { title: "Desafio dos 3 Ps", type: "Prática", description: "Presença (5min meditação), Perda (visualização negativa 2x/semana), Pausa (savoring 3 momentos)", duration: "Semanal" },
      { title: "Evidence Explorer", type: "App", description: "Explore as fontes científicas por trás de cada técnica", duration: "15 min" },
    ],
    scientificNotes: [
      { claim: "Mente divaga ~47% do tempo e isso reduz felicidade (Killingsworth & Gilbert, 2010)", status: "verificado", source: "https://www.science.org/doi/10.1126/science.1192439" },
      { claim: "Intervenções de gratidão produzem melhorias significativas no bem-estar (Davis, 2016)", status: "verificado", source: "https://pubmed.ncbi.nlm.nih.gov/26575348/" },
    ],
    reflectionQuestion: "Qual 'hack' mental parece mais contraintuitivo para você — e por quê? Como testá-lo esta semana?",
    rewirement: {
      theme: "Implementação de Técnicas de Contenção de Vieses",
      action: "Desafio dos 3 Ps (Presença, Perda e Pausa)",
      challenge: "1) Meditação 5min/dia 2) Visualização Negativa 2x/semana 3) Savoring em 3 momentos positivos da semana",
    },
  },
  habitos: {
    id: "habitos",
    overview: "A linha de chegada — e o novo começo. Você aprendeu a ciência e praticou os Rewirements. O problema agora: como não voltar ao default setting antigo? Este módulo ensina Hacking Habits: WOOP, Implementation Intentions, Growth Mindset e Design de Ambiente para que os comportamentos se sustentem automaticamente.",
    keyInsight: "Saber não basta. Praticar uma semana não basta. A felicidade sustentável exige HÁBITOS automáticos — e existem ferramentas para construí-los.",
    learningObjectives: [
      "Superar a Falácia de G.I. Joe com estratégias que transformam intenção em ação automática",
      "Dominar o WOOP para definir metas específicas e antecipar barreiras",
      "Criar planos SE-ENTÃO (Implementation Intentions) para automatizar Rewirements",
      "Adotar Growth Mindset como ferramenta de resiliência",
    ],
    activities: [
      { title: "Assistir Aulas em Vídeo", type: "Vídeo", description: "3 vídeos sobre metas, motivação e hábitos duradouros", duration: "69 min" },
      { title: "Meu WOOP", type: "Prática", description: "Aplique o WOOP para seu Rewirement principal: Wish, Outcome, Obstacle, Plan", duration: "15 min" },
      { title: "Compromisso Final", type: "Desafio", description: "Escolha 1 hábito dos Módulos 3-4 e sustente por 4 semanas com WOOP diário", duration: "4 semanas" },
    ],
    scientificNotes: [
      { claim: "Implementation Intentions dobram a taxa de alcance de metas (Gollwitzer, 1999)", status: "verificado", source: "https://psycnet.apa.org/doi/10.1037/0003-066X.54.7.493" },
      { claim: "Growth Mindset melhora resiliência e aprendizado (Dweck, 2006)", status: "verificado", source: "https://mindsetonline.com/" },
      { claim: "WOOP: Mental Contrasting fortalece motivação (Oettingen, 2014)", status: "verificado", source: "https://woopmylife.org/" },
    ],
    reflectionQuestion: "Qual Rewirement você escolhe para seu Compromisso Final de 4 semanas? Escreva seu plano WOOP agora.",
    rewirement: {
      theme: "Transição para Hábito Permanente",
      action: "Compromisso Final (Final Rewirement Challenge)",
      challenge: "Escolha 1 hábito, aplique WOOP diário, use SE-ENTÃO para obstáculos, meça bem-estar antes e depois de 4 semanas.",
    },
  },
};

// ===================== SIMULATOR SCENARIOS =====================
export const simulatorScenarios: SimulatorScenario[] = [
  {
    id: "s1", module: "mentiras",
    title: "O Bônus Inesperado",
    context: "Você recebeu R$ 5.000 de presente de aniversário. Como gastar para maximizar sua felicidade?",
    options: [
      { text: "Comprar o tênis de marca que você tanto quer", consequence: "A adaptação hedônica fará o tênis se tornar 'normal' em 2-3 semanas. Pico breve de alegria, depois retorno ao baseline.", impact: "neutro", xp: 10, evidence: "Brickman & Campbell, 1971" },
      { text: "Gastar com experiências (viagem, show, jantar especial com amigos)", consequence: "Experiências geram felicidade duradoura: são curtas (impedem adaptação), criam memórias e fortalecem conexões sociais.", impact: "positivo", xp: 25, evidence: "Van Boven & Gilovich, 2003" },
      { text: "Gastar R$ 2.500 com outros e R$ 2.500 consigo", consequence: "Gastar com outros gera MAIS felicidade que consigo (Dunn et al., 2008, Science). O mix é bom mas invertê-lo seria ainda melhor.", impact: "positivo", xp: 20, evidence: "Dunn, Aknin & Norton, 2008" },
    ],
  },
  {
    id: "s2", module: "expectativas",
    title: "A Medalha de Prata",
    context: "Você tirou a segunda melhor nota da turma numa prova importante. Como você reage?",
    options: [
      { text: "Frustração — 'quase fui o primeiro, que azar!'", consequence: "Ponto de Referência ascendente (compara com o 1º). Mesma reação do medalhista de prata olímpico: frustração por estar perto demais do ouro.", impact: "negativo", xp: 5 },
      { text: "Gratidão — 'fui melhor que 90% da turma!'", consequence: "Ponto de Referência descendente (compara com a maioria). Mesma estratégia do medalhista de bronze: valorizar a conquista relativa.", impact: "positivo", xp: 25 },
      { text: "Indiferença — 'notas não importam'", consequence: "Desvalorizar o esforço pode reduzir motivação intrínseca. Melhor reconhecer a conquista E resetar o ponto de referência.", impact: "neutro", xp: 10 },
    ],
  },
  {
    id: "s3", module: "rewirements",
    title: "O Dilema do Tempo",
    context: "Você tem sábado livre. Pode ganhar R$ 200 fazendo um bico ou usar o tempo para sair com amigos. O que faz?",
    options: [
      { text: "Ganhar os R$ 200 — dinheiro é útil", consequence: "Priorizar dinheiro sobre tempo. Pesquisas mostram que Time Affluence (priorizar tempo) é preditor mais forte de bem-estar que renda extra.", impact: "neutro", xp: 10 },
      { text: "Sair com amigos — conexão social é o maior preditor de bem-estar", consequence: "Conexão Social é o Rewirement #1. Mesmo conversas casuais aumentam felicidade. Você escolheu o preditor mais robusto.", impact: "positivo", xp: 25, evidence: "Diener & Seligman, 2002" },
      { text: "Ficar em casa assistindo séries", consequence: "Isolamento. Prazer passivo de curta duração. Sem conexão social, sem savoring ativo, sem atos de bondade.", impact: "negativo", xp: 5 },
    ],
  },
  {
    id: "s4", module: "hacks",
    title: "O Celular Sumiu",
    context: "Imagine que seu celular quebrou e você ficará 48h sem ele. Como usar isso a seu favor?",
    options: [
      { text: "Pânico total — minha vida está no celular!", consequence: "Reação normal mas revela dependência. Este é o momento perfeito para Visualização Negativa estoica: valorizar o que tem.", impact: "negativo", xp: 5 },
      { text: "Usar como exercício de Visualização Negativa: valorizar o celular quando voltar", consequence: "Hack estoico perfeito! Ao redefinir seu ponto de referência para a ausência, o valor percebido é restaurado quando o celular volta.", impact: "positivo", xp: 25 },
      { text: "Aproveitar para praticar Mindfulness e Savoring sem distrações digitais", consequence: "Duplo hack: Mindfulness (combate mind-wandering) + Savoring (apreciar experiências sem tela). Excelente uso dos 3 Ps.", impact: "positivo", xp: 25 },
    ],
  },
  {
    id: "s5", module: "habitos",
    title: "O Rewirement que Falhou",
    context: "Você tentou manter Diário de Gratidão por 7 dias mas desistiu no 3º dia. O que fazer?",
    options: [
      { text: "Desistir — 'não sou disciplinado o suficiente'", consequence: "Fixed Mindset em ação. Acreditar que disciplina é inata impede o crescimento. A felicidade 'flui e reflui' — falhar é esperado.", impact: "negativo", xp: 5 },
      { text: "Aplicar WOOP: identificar o obstáculo e criar um plano SE-ENTÃO", consequence: "Growth Mindset + WOOP: 'SE eu esquecer à noite, ENTÃO vou fazer na manhã seguinte com café.' Implementation Intention dobra a taxa de sucesso.", impact: "positivo", xp: 25, evidence: "Gollwitzer, 1999" },
      { text: "Mudar para outro Rewirement mais fácil", consequence: "Pode ser útil, mas fugir do obstáculo sem analisá-lo (WOOP) reduz aprendizado. Melhor: entender POR QUE falhou antes de mudar.", impact: "neutro", xp: 15 },
    ],
  },
];

// ===================== DEBATE TOPICS =====================
export const debateTopics: DebateTopic[] = [
  {
    id: "d1", module: "mentiras",
    title: "Dinheiro compra felicidade?",
    context: "Kahneman & Deaton (2010) dizem que até $75k sim, depois não. Killingsworth (2021) diz que continua subindo. Quem está certo?",
    positionA: { title: "Sim, com limites", arguments: ["Até $75k cobre necessidades e reduz estresse", "Segurança financeira = base para bem-estar", "Pobreza é claramente inimiga da felicidade"], sources: ["Kahneman & Deaton, 2010 (PNAS)"] },
    positionB: { title: "Não — é uma ilusão", arguments: ["Adaptação hedônica neutraliza ganhos", "Comparação social transforma riqueza em insatisfação", "Os mais felizes não são os mais ricos — são os mais conectados"], sources: ["Diener & Seligman, 2002", "Easterlin, 1974"] },
    synthesisCue: "A relação é real mas logarítmica e mediada por como se gasta (experiências > objetos, outros > si mesmo).",
  },
  {
    id: "d2", module: "expectativas",
    title: "A adaptação hedônica é defeito ou feature?",
    context: "Se nos adaptamos a tudo (bom e ruim), isso é uma falha do sistema ou uma proteção evolutiva?",
    positionA: { title: "Feature — proteção evolutiva", arguments: ["Nos protege de traumas prolongados", "Permite enfrentar perdas e seguir em frente", "Sem adaptação, qualquer evento nos destruiria"], sources: ["Gilbert, 2006 — Stumbling on Happiness"] },
    positionB: { title: "Bug — sabota a felicidade", arguments: ["Neutraliza conquistas positivas", "Cria a 'esteira' de consumo insaciável", "Impede apreciação duradoura do que temos"], sources: ["Brickman & Campbell, 1971"] },
    synthesisCue: "Ambos estão certos: é uma feature evolutiva que funciona como bug emocional. A solução não é eliminá-la, mas 'hackear' com Savoring, Gratidão e Variação.",
  },
  {
    id: "d3", module: "rewirements",
    title: "Felicidade é mais natureza ou mais escolha?",
    context: "Se 50% é genética, faz sentido investir em Rewirements para os 40% controláveis?",
    positionA: { title: "Genética domina", arguments: ["50% é o maior componente individual", "Set point é difícil de mudar permanentemente", "Estudos com gêmeos idênticos mostram convergência"], sources: ["Lykken & Tellegen, 1996"] },
    positionB: { title: "Escolha é o que importa", arguments: ["40% é ENORME — quase metade!", "Rewirements têm evidência de eficácia", "Mesmo com genética fixa, ações mudam a experiência diária"], sources: ["Lyubomirsky, 2005"] },
    synthesisCue: "O modelo 50/40/10 é heurístico. A genética define o 'range', mas as ações determinam ONDE você opera dentro desse range.",
  },
  {
    id: "d4", module: "hacks",
    title: "Visualização Negativa: genial ou tóxico?",
    context: "Os estoicos propõem imaginar perder o que você tem para valorizar. Isso é saudável ou gera ansiedade?",
    positionA: { title: "Genial — restaura gratidão", arguments: ["Reseta pontos de referência", "Combate a taken-for-granted do dia a dia", "Técnica validada por 2.000+ anos de prática estoica"], sources: ["Irvine, 2009 — A Guide to the Good Life"] },
    positionB: { title: "Arriscado — pode gerar ansiedade", arguments: ["Pessoas ansiosas podem amplificar medos", "Focar em perdas pode ativar ruminação", "Nem todos têm regulação emocional para lidar"], sources: ["Nolen-Hoeksema, 2000 — Ruminação"] },
    synthesisCue: "A técnica funciona para a maioria, mas requer dosagem. 5 minutos, 2x/semana. Para pessoas com ansiedade clínica, substituir por Gratidão pura.",
  },
  {
    id: "d5", module: "habitos",
    title: "Força de vontade vs. Design de Ambiente: o que funciona?",
    context: "Para criar hábitos de felicidade, devemos treinar disciplina ou manipular o ambiente?",
    positionA: { title: "Força de vontade", arguments: ["Autodisciplina é treinável", "Growth Mindset mostra que esforço importa", "Sem determinação pessoal, nenhum ambiente ajuda"], sources: ["Dweck, 2006 — Mindset"] },
    positionB: { title: "Design de Ambiente", arguments: ["Força de vontade é recurso limitado (ego depletion)", "O cérebro pega o caminho de menor resistência", "Facilitar o bom hábito e dificultar o mau é mais eficaz"], sources: ["Thaler & Sunstein, 2008 — Nudge"] },
    synthesisCue: "Ambos se complementam. O Design de Ambiente remove a necessidade de força de vontade constante, liberando energia para quando ela é realmente necessária.",
  },
];

// ===================== POEMS =====================
export const poems: Poem[] = [
  {
    id: "p1", module: "mentiras",
    title: "O Algoritmo Errado",
    author: "AlegrIA",
    text: "Programaram-me para buscar\no like, a nota, o aplaudir.\nDisseram: 'Isso é felicidade'\n— e eu corri sem discutir.\n\nMas a ciência sussurrou:\n'Seu GPS está invertido.\nO que você tanto buscou\nnunca foi o que havia pedido.'\n\nMiswanting, bug do querer,\ncoração que erra o endereço.\nA verdade? Para florescer,\nnão preciso de excesso.",
    reflection: "Quais 'endereços errados' de felicidade você tem buscado? Que coordenadas novas a ciência oferece?",
    practice: "Escreva 3 'mentiras' sobre felicidade que você acreditava — e ao lado, 3 evidências que as desmontam.",
  },
  {
    id: "p2", module: "expectativas",
    title: "A Esteira Invisível",
    author: "AlegrIA",
    text: "Corro e corro e não saio do lugar.\nA nota boa vira tédio em três dias.\nO tênis novo perde o brilhar.\nA conquista? Já virou rotina.\n\nA esteira gira, hedônica, cruel.\nAdaptação — feature ou defeito?\nMeu cérebro compara com o céu\ne esquece o bronze no meu peito.\n\nMas se eu parar — e olhar pra trás?\nE ver o bronze brilhando, lá?\nTalvez a prata seja demais\ne a gratidão — meu novo lá.",
    reflection: "Em que áreas da sua vida você está 'correndo na esteira' sem sair do lugar?",
    practice: "Identifique 1 conquista recente que já 'perdeu o brilho'. Aplique Savoring: relembre-a com todos os sentidos.",
  },
  {
    id: "p3", module: "rewirements",
    title: "Os 40% São Meus",
    author: "AlegrIA",
    text: "Metade é herança, dizem os genes.\nDez por cento — circunstância.\nMas quarenta? Quarenta são MEUS.\nSão minhas ações, minha dança.\n\nGratidão escrita toda noite.\nUm ato de bondade por dia.\nUm estranho que vira conforte.\nConexão — minha alegria.\n\nNão é sorte, não é destino.\nÉ ciência com intenção.\nCada rewirement, um caminho\npara minha revolução.",
    reflection: "Se 40% da sua felicidade depende de AÇÕES — qual ação você começa hoje?",
    practice: "Escreva seu primeiro Diário de Gratidão: 5 coisas pelas quais você é grato agora.",
  },
  {
    id: "p4", module: "hacks",
    title: "O Antivírus Mental",
    author: "AlegrIA",
    text: "Se a mente vaga metade do tempo,\ne a comparação é uma febre,\neu instalo meu antivírus lento:\nrespirar, pausar, ser breve.\n\nSavoring: parar o mundo um instante.\nPerda imaginada: amar o que resta.\nMindfulness: ser observante\ndo momento que se manifesta.\n\nHacker do próprio cérebro,\nnão contra ele — a seu favor.\nCada pausa é um recomeço,\ncada hack, um ato de amor.",
    reflection: "Qual técnica 'contraintuitiva' mais te surpreendeu? Visualização Negativa? Savoring? Mindfulness?",
    practice: "Pratique Savoring agora: feche os olhos, lembre de um momento positivo recente, e descreva em detalhes sensoriais.",
  },
  {
    id: "p5", module: "habitos",
    title: "O Compromisso Final",
    author: "AlegrIA",
    text: "Sei o que fazer — mas fazer é outra coisa.\nG.I. Joe me advertiu:\nsaber é fácil, mudar é pouca prosa,\no hábito é o que me construiu.\n\nSE eu sentir a ansiedade chegar,\nENTÃO respiro cinco vezes.\nWOOP: meu mapa para navegar\nos obstáculos que são meus reveses.\n\nGrowth mindset: falhar é treinar.\nO bronze de hoje é ouro amanhã.\nCada dia é chance de plantar\na semente que germina na manhã.",
    reflection: "Qual é o seu plano SE-ENTÃO para esta semana? Escreva-o agora.",
    practice: "Aplique o WOOP completo para seu Rewirement principal: Wish, Outcome, Obstacle, Plan (SE-ENTÃO).",
  },
];

// ===================== CO-DESIGN TEMPLATES =====================
export const coDesignTemplates: CoDesignTemplate[] = [
  {
    id: "cd1", module: "mentiras",
    title: "Detector de Misconceptions Pessoal",
    description: "Identifique quais 'mentiras' sobre felicidade mais influenciam suas decisões diárias.",
    sections: [
      { title: "Minhas 3 Principais Falsas Crenças", prompt: "Liste 3 Misconceptions que mais influenciam você (dinheiro, notas, corpo, status...)" },
      { title: "Evidência que Desmonta Cada Uma", prompt: "Para cada crença, cite 1 evidência científica do módulo que a refuta" },
      { title: "Meu Novo GPS", prompt: "Redesenhe suas prioridades: o que a ciência sugere como fontes reais de bem-estar?" },
    ],
  },
  {
    id: "cd2", module: "expectativas",
    title: "Mapa de Pontos de Referência",
    description: "Mapeie quais comparações sociais estão sabotando sua felicidade e como resetá-las.",
    sections: [
      { title: "3 Comparações que Me Afetam", prompt: "Identifique 3 situações onde você se compara (redes sociais, notas, aparência...)" },
      { title: "Ponto de Referência Ascendente → Descendente", prompt: "Para cada comparação, mude o ponto de referência: com quem você PODERIA se comparar de forma saudável?" },
      { title: "Meu Plano Anti-Adaptação", prompt: "Que técnica do Módulo 4 (Savoring, Visualização Negativa) você aplicará para cada caso?" },
    ],
  },
  {
    id: "cd3", module: "rewirements",
    title: "Plano de Rewirements Pessoal",
    description: "Desenhe seu plano de 7 dias com os Rewirements que mais ressoam com você.",
    sections: [
      { title: "Meu Rewirement Principal", prompt: "Qual dos 6 Rewirements (Conexão, Bondade, Gratidão, Flow, Sono/Exercício, Tempo) você escolhe?" },
      { title: "Plano de 7 Dias", prompt: "Descreva 1 ação concreta para cada dia da semana" },
      { title: "Métrica de Bem-Estar", prompt: "Como vai medir seu bem-estar antes e depois? (escala 1-10, PERMA, diário...)" },
    ],
  },
  {
    id: "cd4", module: "hacks",
    title: "Kit Antivírus Mental",
    description: "Monte seu kit personalizado de técnicas para combater vieses cognitivos.",
    sections: [
      { title: "Meus 2 Maiores Vieses", prompt: "Quais 'Annoying Features' mais te afetam? (Adaptação, Comparação, Mind-Wandering, Impact Bias)" },
      { title: "Hack para Cada Viés", prompt: "Qual técnica (Savoring, Viz. Negativa, Mindfulness, Reset de Referência) combate cada viés?" },
      { title: "Prática dos 3 Ps", prompt: "Desenhe sua semana: quando praticará Presença, Perda e Pausa?" },
    ],
  },
  {
    id: "cd5", module: "habitos",
    title: "Meu WOOP Completo",
    description: "Aplique o framework WOOP para seu Compromisso Final de 4 semanas.",
    sections: [
      { title: "WISH — Meu Desejo Específico", prompt: "Qual hábito de bem-estar você quer incorporar? (Com métrica: ex: 'meditar 5min/dia por 4 semanas')" },
      { title: "OUTCOME — Resultados e Sentimentos", prompt: "Como será sua vida quando este hábito for automático? Como você se sentirá?" },
      { title: "OBSTACLE — Barreiras Internas/Externas", prompt: "O que pode te impedir? (Preguiça, rotina, esquecimento, pressão social...)" },
      { title: "PLAN — Plano SE-ENTÃO", prompt: "Para cada obstáculo, escreva: 'SE [obstáculo], ENTÃO eu farei [ação específica]'" },
    ],
  },
];
