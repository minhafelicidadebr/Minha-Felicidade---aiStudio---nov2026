# NEXT_ACTION (uma única próxima ação)

## Concluído
- P0.0 (marca/PI/independência): **APROVADO**.
- ONDA 1 · Corte 1.1 (entitlement canônico): rotas premium agora exigem feature server-side;
  fail-open corrigido em `FeatureGate`. Ver `COMMERCIAL_GATES.md`.
- ONDA 1 · Corte 1.2 (integridade da assinatura): `user_subscriptions` confirmada sem policy
  de escrita para `authenticated`; `organization_subscriptions` tinha UPDATE aberto — migration
  `20260722190000` remove essa policy. Ver `COMMERCIAL_GATES.md` e runbook item 21.

## Próxima ação recomendada: ONDA 1 — Corte 1.3 (Limites de IA centralizados)
Verificar (buscas direcionadas):
- Confirmar que a RPC `enforce_ai_usage_limit` é a fonte canônica dos limites de IA e que
  os limites lá correspondem ao que o landing/planos/frontend mostram.
- Confirmar que TODAS as edge functions de IA (`aledria-chat`, `cognitive-mirror`,
  `future-self`, `signature-strengths`) chamam `enforceAiUsageLimit` antes do gateway.
- Verificar que a mensagem de limite mostrada ao usuário reflete o plano real.
- Critério de aceite: "landing, banco, edge functions e frontend exibem exatamente a mesma
  regra de limites de IA."

**Antes de editar:** ler `supabase/functions/_shared/ai-usage.ts` e
`supabase/migrations/20260613190000_ai_usage_rate_limits.sql` (fonte canônica do limit).
Depois: comparar com `useSubscription` (client) e `PricingSection`/FAQ (landing).
