-- Onda 1.5 (pós-compra) — histórico de pagamentos do próprio usuário.
-- purchase_intents é service_role-only (o cliente não lê a tabela direto).
-- Esta RPC SECURITY DEFINER, self-scoped, é a ÚNICA forma do cliente ver seus
-- pagamentos: retorna apenas as linhas do auth.uid() e só os campos necessários
-- (sem expor dados de terceiros nem colunas internas além da referência do MP).

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
  ORDER BY pi.created_at DESC;
$$;

-- Self-service: qualquer usuário autenticado lê o PRÓPRIO histórico (a função
-- filtra por auth.uid()). anon não acessa.
REVOKE EXECUTE ON FUNCTION public.get_my_payment_history() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_payment_history() TO authenticated;

-- VERIFICAÇÃO (rodar após aplicar):
-- SELECT has_function_privilege('anon', 'public.get_my_payment_history()', 'EXECUTE');          -- false
-- SELECT has_function_privilege('authenticated', 'public.get_my_payment_history()', 'EXECUTE'); -- true
-- SELECT prosecdef FROM pg_proc WHERE proname = 'get_my_payment_history';                       -- true
