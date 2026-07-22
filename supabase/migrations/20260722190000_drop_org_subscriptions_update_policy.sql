-- P0 corte 1.2 — Integridade da assinatura
-- Remove a policy de UPDATE de authenticated em organization_subscriptions.
-- Motivo: o owner_id poderia alterar plan_id, status, max_seats, current_period_end
-- diretamente pelo client (PostgREST). A ÚNICA escritora legítima do estado de
-- assinatura são as RPCs SECURITY DEFINER (activate_subscription_from_intent,
-- claim_escolar_subscription, claim_escolar_subscription_token, subscription_lifecycle,
-- request_subscription_cancellation). O gestor escolar não precisa de UPDATE direto.
--
-- Idempotente: IF EXISTS.
DROP POLICY IF EXISTS "Owners can update own org subscriptions" ON public.organization_subscriptions;

-- Verificação (rodar manualmente após aplicar):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'organization_subscriptions';
-- Esperado: SELECT policies only (Members can view..., etc.), NENHUM INSERT/UPDATE/DELETE.
