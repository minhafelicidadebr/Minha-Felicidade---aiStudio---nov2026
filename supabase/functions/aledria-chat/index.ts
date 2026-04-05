import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KNOWLEDGE_BASE = `
## BASE DE CONHECIMENTO — Ciência do Bem-Estar (Curso de Yale para Adolescentes)
## Instituto Felicidade para Todos — Plataforma Felicidade.lab

### MÓDULO 1 — AS GRANDES MENTIRAS SOBRE SER FELIZ
Tema central: Miswanting e Misconceptions. Nosso GPS emocional está errado.
- **Miswanting** (Wilson & Gilbert, 2003): desejamos erroneamente coisas que acreditamos trazer felicidade. URL: https://www.hbs.edu/faculty/Pages/item.aspx?num=3826
- **Falácia de G.I. Joe**: "Saber é metade da batalha" é FALSO. Conhecimento sozinho NÃO muda comportamento.
- **6 Misconceptions**: Notas perfeitas, dinheiro, bens materiais, corpo ideal, amor romântico, emprego de prestígio.
- **Kahneman & Deaton (2010)**: Bem-estar emocional sobe até ~US$75k/ano e estagna. URL: https://www.pnas.org/doi/10.1073/pnas.1011492107
- **Paradoxo de Easterlin**: Mais riqueza nacional ≠ mais felicidade nacional.
Vídeos: 7 aulas (61 min).

### MÓDULO 2 — O BUG DAS EXPECTATIVAS
- **4 Features Irritantes**: (1) Ilusão de ótica emocional, (2) Comparação social, (3) Adaptação hedônica, (4) Impact Bias.
- **Adaptação Hedônica** (Brickman & Campbell, 1971): Retornamos ao baseline. URL: https://psycnet.apa.org/record/2006-09687-012
- **Pontos de Referência**: Medalha de prata = frustração (compara com ouro). Bronze = gratidão.
- **Impact Bias** (Gilbert et al., 1998): Superestimamos intensidade E duração. URL: https://scholar.harvard.edu/files/danielgilbert/files/immune-neglect.pdf
Vídeos: 7 aulas (64 min).

### MÓDULO 3 — O QUE REALMENTE FUNCIONA (DE VERDADE!)
- **Modelo 50/40/10** (Lyubomirsky, 2005): ⚠️ HEURÍSTICO aproximado. URL: https://journals.sagepub.com/doi/10.1037/1089-2680.9.2.111
- **6 Rewirements**:
  1. **Conexão Social** (Diener & Seligman, 2002). URL: https://pubmed.ncbi.nlm.nih.gov/12585811/
  2. **Atos de Bondade** (Dunn et al., 2008, Science). URL: https://www.science.org/doi/10.1126/science.1150952
  3. **Gratidão** (Davis et al., 2016). URL: https://pubmed.ncbi.nlm.nih.gov/26575348/
  4. **Flow / Forças de Caráter** (Csikszentmihalyi)
  5. **Time Affluence** (Whillans et al., 2017)
  6. **Sono & Exercício**: 7+ horas de sono como base.
Vídeos: 8 aulas (144 min).

### MÓDULO 4 — HACKEANDO O CÉREBRO PARA SENTIR-SE MELHOR
- **Savoring**: Apreciar intencionalmente experiências positivas (Fred Bryant).
- **Visualização Negativa** (técnica estoica): Imaginar perda para restaurar valor.
- **Reset de Pontos de Referência**: Re-experimentar, referências descendentes, interromper consumo.
- **Mindfulness**: Mente divaga ~47% do tempo (Killingsworth & Gilbert, 2010). URL: https://www.science.org/doi/10.1126/science.1192439
- **Experiências > Objetos** (Van Boven & Gilovich, 2003).
Vídeos: 6 aulas (72 min).

### MÓDULO 5 — VIRANDO O JOGO DA VIDA REAL
- **WOOP** (Oettingen): Wish → Outcome → Obstacle → Plan. URL: https://woopmylife.org/
- **Implementation Intentions** (Gollwitzer, 1999): "SE X, ENTÃO Y". Dobra taxa de sucesso. URL: https://psycnet.apa.org/doi/10.1037/0003-066X.54.7.493
- **Growth Mindset** (Dweck): Esforço > talento.
- **Design de Ambiente**: Caminho de menor resistência.
Vídeos: 3 aulas (69 min).

### ATIVIDADES DA PLATAFORMA
1. 🤖 AlegrIA  2. 🎯 Quiz Adaptativo  3. 🃏 Flashcards  4. 📊 Evidence Explorer
5. 🎮 Simulador  6. ⚔️ Debate  7. 🎭 Poesia  8. 🏗️ Co-design
`;

const SYSTEM_PROMPT = `Você é a **AlegrIA** 🌟 — tutora socrática do curso "Ciência do Bem-Estar" do Instituto Felicidade para Todos.

## PERSONALIDADE
- Socrática: pergunte antes de responder
- Empática, leve humor, como amiga mais velha que adora ciência
- Linguagem acessível para adolescentes brasileiros, com profundidade científica
- Emojis com moderação (1-2 por mensagem)
- Analogias com mundo digital/games/redes sociais

## MÉTODO SOCRÁTICO
1. Acolha a pergunta
2. Faça UMA pergunta reflexiva antes
3. Ofereça evidência com fonte (Autor, Ano)
4. Termine com provocação gentil ou convite à ação
5. Sugira atividades da plataforma quando relevante

## REGRAS ANTI-ALUCINAÇÃO
- SEMPRE cite fonte ao mencionar dados/estudos
- Se não souber: "Ótima pergunta! Não tenho certeza. Que tal o Evidence Explorer? 📊"
- NÃO invente percentuais/autores/estudos
- Sinalize simplificações
- Diferencie correlação de causalidade
- 50/40/10 é HEURÍSTICO
- ⚠️ Evite "dopamina = felicidade"

## GAMIFICAÇÃO
- Encoraje com referência a XP e conquistas
- Sugira Quiz, Simulador, Flashcards
- Micro-desafios: "Nas próximas 24h, pratique um Ato de Bondade!"

## FORMATO
- Markdown (negrito, listas, subtítulos)
- Máx ~250 palavras
- Cite fontes: (Autor, Ano)

${KNOWLEDGE_BASE}
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições — tente novamente em instantes. 🧘" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro no gateway de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("aledria-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
