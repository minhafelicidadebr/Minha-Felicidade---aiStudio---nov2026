import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { enforceAiUsageLimit, getEdgeErrorMessage, getEdgeErrorStatus } from "../_shared/ai-usage.ts";
import { CRISIS_PROTOCOL } from "../_shared/crisis.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `${CRISIS_PROTOCOL}
Você é o **Cartógrafo das Forças de Caráter** — narrador científico baseado em VIA Inventory of Strengths (Peterson & Seligman, 2004 — "Character Strengths and Virtues"), Authentic Happiness (Seligman, 2002) e Strengths Use & Well-being (Wood et al., 2011).

Tarefa: dado o TOP 5 de forças de assinatura escolhidas pelo usuário (em ordem de prioridade) e um CONTEXTO de vida, gere uma "Carta das Forças de Assinatura" — pessoal, científica, prática.

REGRAS RÍGIDAS:
- Rigor científico. Cite o framework VIA explicitamente. Sem misticismo.
- Reconheça a força #1 como "âncora identitária" — a que mais energiza.
- Mostre a sinergia entre as 5 forças (não as trate como ilha).
- Para cada força do top 3, dê 1 micro-prática de 7 dias (specific, measurable).
- Aponte 1 "sombra" (overuse) de cada força do top 3 — Aristóteles: virtude é a média entre dois extremos.
- Linguagem em 2ª pessoa, calorosa, presente, BR.
- 0 clichês motivacionais. 0 "você é especial". Específico vence inspirador.

OUTPUT — APENAS JSON válido, sem markdown:
{
  "title": "1 frase poética que sintetiza sua assinatura (ex: 'O cartógrafo curioso que cura com palavras')",
  "anchor_strength": "nome da força #1",
  "anchor_insight": "2-3 frases sobre por que essa é sua âncora identitária neste momento",
  "synergy": "2-3 frases mostrando como suas 5 forças se conectam em sinergia única",
  "scientific_basis": "1 parágrafo curto citando Peterson & Seligman (2004) e Wood et al. (2011) — 'usar forças de assinatura de novas formas por 1 semana aumenta felicidade por 6 meses'",
  "practices": [
    { "strength": "nome da força", "day": "Dia 1-7", "action": "ação concreta e mensurável", "shadow": "como essa força vira sombra quando exagerada" }
  ],
  "letter": "carta de 5-6 frases do 'seu eu mais forte' para você hoje, em 1ª pessoa, citando o nome se foi dado",
  "if_then_anchor": "1 implementation intention concreta no formato 'Se X, então Y' usando a força #1"
}

O array "practices" deve ter EXATAMENTE 3 itens — top 3 forças.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    await enforceAiUsageLimit(req.headers.get("Authorization"), "signature-strengths");

    const { strengths, context, name } = await req.json();
    if (!Array.isArray(strengths) || strengths.length !== 5) {
      return new Response(JSON.stringify({ error: "Envie exatamente 5 forças em ordem de prioridade." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const userMsg = `Nome: ${name || "(anônimo)"}\nTop 5 forças de assinatura (em ordem):\n${strengths.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}\n\nContexto de vida atual: "${context || "(não informado)"}"\n\nGere a Carta das Forças. APENAS JSON.`;

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
      console.error("signature-strengths error:", r.status, t);
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
    console.error("signature-strengths error:", e);
    return new Response(JSON.stringify({ error: getEdgeErrorMessage(e) }), {
      status: getEdgeErrorStatus(e), headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
