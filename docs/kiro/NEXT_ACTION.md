# NEXT_ACTION (uma única próxima ação)

## Concluído
- P0.0 (marca/PI/independência): **APROVADO**.
- ONDA 1 · Corte 1.1 (entitlement canônico): rotas premium agora exigem feature server-side;
  fail-open corrigido em `FeatureGate`. Ver `COMMERCIAL_GATES.md`.

## Próxima ação recomendada: ONDA 1 — Corte 1.2 (Integridade da assinatura)
Verificar (buscas direcionadas, sem reauditoria completa):
- Confirmar que `user_subscriptions`/`organization_subscriptions` não têm policy de
  INSERT/UPDATE para `authenticated` (contexto do produto diz que já foi removida em
  2026-06-13 — **confirmar no schema atual**, não assumir).
- Confirmar que a única escritora do estado de assinatura é
  `activate_subscription_from_intent` (SECURITY DEFINER, service_role, chamada pelo
  `mp-webhook`).
- Testar (ou escrever teste) que uma tentativa de update direto pelo client (`authenticated`)
  nessas tabelas falha por RLS.
- Critério de aceite do corte: "usuário institucional não consegue alterar diretamente seu
  plano, status, vigência ou número de licenças."

**Antes de editar:** ler `supabase/migrations/20260708120500_activate_subscription_from_intent.sql`
e as migrations mais recentes de RLS em `user_subscriptions`/`organization_subscriptions`;
não reabrir todo o histórico de migrations.
