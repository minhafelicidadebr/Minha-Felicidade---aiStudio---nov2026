-- Onda 1.5 (ajuste) — limpa o histórico "Faturas e pagamentos".
-- Antes retornava TODAS as intents, inclusive checkouts abandonados (status
-- 'pending' que ninguém concluiu), poluindo a lista. Agora mostra só o
-- relevante: 'approved' e 'rejected' sempre; 'pending' apenas se recente
-- (últimas 24h — um Pix/boleto que a pessoa ainda pode pagar). Esconde
-- pendentes antigos (carrinho abandonado) e 'expired'.
-- Self-scoped e SECURITY DEFINER, igual antes.

CREATE OR REPLACE FUNCTION public.get_my_payment_history()
RETURNS TABLE (
  created_at timestamptz,
  kind text,
  plan_slug text,
  plan_name text,
  billing_interval text,
  amount_brl_cents integer,
  status text,
  payment_ref text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pi.created_at,
    pi.kind,
    pi.plan_slug,
    sp.name AS plan_name,
    pi.billing_interval,
    pi.amount_brl_cents,
    pi.status,
    pi.mp_payment_id AS payment_ref
  FROM public.purchase_intents pi
  LEFT JOIN public.subscription_plans sp ON sp.slug = pi.plan_slug
  WHERE pi.user_id = auth.uid()
    AND (
      pi.status IN ('approved', 'rejected')
      OR (pi.status = 'pending' AND pi.created_at > now() - interval '24 hours')
    )
  ORDER BY pi.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_payment_history() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_payment_history() TO authenticated;
