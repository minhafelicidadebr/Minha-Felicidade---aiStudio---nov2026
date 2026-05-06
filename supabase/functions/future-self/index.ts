import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `Você é o **Cronista do Eu Futuro** — narrador científico-visual baseado em Episodic Future Thinking (Atance & O'Neill, 2001), Mental Contrasting (Oettingen, 2014) e Future Self-Continuity (Hershfield, 2011).

A tarefa: dado um HÁBITO/COMPROMISSO atual e um VALOR central do usuário, gere uma linha do tempo VÍVIDA em 5 horizontes: 1 semana, 1 mês, 6 meses, 1 ano, 5 anos.

REGRAS RÍGIDAS:
- Rigor científico. Sem misticismo, sem promessas absurdas, sem "manifestar".
- Realismo composto: pequenos efeitos × tempo (Atomic Habits / Clear, 2018).
- Cada cena com gatilho sensorial concreto (visão, som, sensação corporal) — isso ativa córtex pré-frontal medial e aumenta self-continuity (Hershfield et al., 2011 fMRI).
- Sem clichês. Sem "você acordará feliz". Mostre cenas específicas.
- Linguagem em 2ª pessoa, presente do indicativo, BR.

OUTPUT — apenas JSON válido, sem markdown:
{
  "headline": "1 frase poética que captura a transformação",
  "scientific_basis": "1 frase citando o estudo principal aplicável",
  "scenes": [
    {
      "horizon": "1 semana",
      "title": "título curto",
      "scene": "2-3 frases vívidas com sensação corporal/ambiente",
      "metric": "1 indicador mensurável (ex: '+3 horas de sono profundo')",
      "emotion": "uma emoção precisa (ex: 'leveza pós-decisão')",
      "risk": "1 obstáculo realista de mental contrasting"
    },
    { "horizon": "1 mês", ... },
    { "horizon": "6 meses", ... },
    { "horizon": "1 ano", ... },
    { "horizon": "5 anos", ... }
  ],
  "letter_from_future": "carta de 4-5 frases do seu eu de 5 anos para você hoje, em 1ª pessoa, citando o nome se foi dado",
  "if_then_plan": "1 implementation intention concreta no formato 'Se X, então Y'"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { habit, value, name, horizon_focus } = await req.json();
    if (!habit || habit.length < 5) {
      return new Response(JSON.stringify({ error: "Descreva o hábito (mín. 5 caracteres)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const userMsg = `Nome: ${name || "(anônimo)"}\nHábito/compromisso atual: "${habit}"\nValor central: "${value || "bem-estar"}"\nFoco extra: ${horizon_focus || "todos os horizontes"}\n\nGere a linha do tempo agora. APENAS JSON.`;

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
      if (r.status === 429) return new Response(JSON.stringify({ error: "Muitas requisições." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await r.text();
      console.error("future-self error:", r.status, t);
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
    console.error("future-self error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
