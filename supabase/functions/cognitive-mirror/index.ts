import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { enforceAiUsageLimit, getEdgeErrorMessage, getEdgeErrorStatus } from "../_shared/ai-usage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `Você é o **Espelho Cognitivo** 🪞 — analista metacognitivo do curso Ciência do Bem-Estar (Yale / Laurie Santos).

O usuário vai EXPLICAR um conceito como se ensinasse a um amigo. Você fará um raio-X científico-pedagógico da explicação dele.

## Conceitos válidos e fontes
- Miswanting (Wilson & Gilbert, 2003)
- Falácia G.I. Joe (Santos, Yale)
- Adaptação Hedônica (Brickman & Campbell, 1971)
- Impact Bias (Gilbert et al., 1998)
- Comparação Social / Pontos de referência (Medvec et al., 1995)
- Conexão Social (Diener & Seligman, 2002)
- Atos de Bondade (Dunn et al., Science 2008)
- Gratidão (Davis et al., 2016)
- Flow (Csikszentmihalyi)
- Savoring (Bryant & Veroff, 2007)
- Visualização Negativa (estoicismo + Koo et al., 2008)
- Mindfulness (Killingsworth & Gilbert, 2010)
- WOOP (Oettingen, 2014)
- Implementation Intentions (Gollwitzer, 1999)
- Growth Mindset (Dweck, 2006)

## Regras
- Rigor científico absoluto. Nunca use "50/40/10" como lei. Nunca diga "dopamina = felicidade".
- Sem invenções: se faltar evidência, sinalize.
- Tom: gentil, encorajador, direto. Sem condescendência.
- Linguagem para adolescentes BR.

## OUTPUT — devolva APENAS JSON válido, sem markdown fence, neste schema EXATO:
{
  "depth_score": 0-100,
  "depth_label": "Superficial" | "Funcional" | "Conceitual" | "Mestre",
  "strengths": ["frase curta", "..."],   // 1-3 itens
  "gaps": [{"title": "Nome da lacuna", "detail": "1-2 frases"}],   // 0-3 itens
  "biases_detected": [{"name": "Viés", "evidence": "trecho da fala do usuário", "why": "por que é viés"}],  // 0-2 itens
  "missing_evidence": ["estudo/autor que falta", "..."],  // 0-3 itens
  "socratic_question": "uma pergunta poderosa que aprofunda",
  "next_step": "1 ação concreta de 24h",
  "feynman_rewrite": "como um mestre explicaria em 2-3 frases simples e precisas"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    await enforceAiUsageLimit(req.headers.get("Authorization"), "cognitive-mirror");

    const { concept, explanation } = await req.json();
    if (!explanation || explanation.length < 30) {
      return new Response(JSON.stringify({ error: "Explicação muito curta (mín. 30 caracteres)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const userMsg = `Conceito que tentei ensinar: **${concept || "(não especificado)"}**\n\nMinha explicação:\n"""${explanation}"""\n\nFaça o raio-X agora, devolvendo SOMENTE o JSON.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!r.ok) {
      if (r.status === 429) return new Response(JSON.stringify({ error: "Muitas requisições. Tente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await r.text();
      console.error("AI gateway error:", r.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await r.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed;
    try { parsed = JSON.parse(content); } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { error: "JSON inválido" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cognitive-mirror error:", e);
    return new Response(JSON.stringify({ error: getEdgeErrorMessage(e) }), {
      status: getEdgeErrorStatus(e), headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
