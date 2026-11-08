-- Onda 1.5 (pós-compra) — cancelamento self-service da própria assinatura.
-- Marca cancel_at_period_end = true (sem novo débito no fim do ciclo); NÃO faz
-- reembolso automático (fora de escopo). Self-scoped: só a assinatura do
-- auth.uid(). É um SEGUNDO escritor de user_subscriptions além da ativação —
-- mas restrito: SECURITY DEFINER + WHERE user_id = auth.uid(), sem escrita
-- direta do cliente (a tabela continua sem policy de UPDATE para authenticated).

CREATE OR REPLACE FUNCTION public.request_subscription_cancellation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _updated integer := 0;
  _email text;
  _period_end timestamptz;
  _sub_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  UPDATE public.user_subscriptions
  SET cancel_at_period_end = true, updated_at = now()
  WHERE user_id = _uid AND status = 'active'
  RETURNING id, current_period_end INTO _sub_id, _period_end;
  GET DIAGNOSTICS _updated = ROW_COUNT;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'UPDATE', 'user_subscriptions', 'self_cancel_request',
    jsonb_build_object('scope_type', 'self'), _updated);

  -- Enfileira notificação de cancelamento (best-effort, idempotente por ciclo).
  IF _updated > 0 THEN
    SELECT email INTO _email FROM auth.users WHERE id = _uid;
    IF _email IS NOT NULL THEN
      INSERT INTO public.notification_outbox (kind, recipient_email, user_id, payload, dedupe_key)
      VALUES ('subscription_canceled', _email, _uid,
        jsonb_build_object('effective_until', _period_end),
        'canceled:' || _sub_id::text || ':' || COALESCE(to_char(_period_end, 'YYYYMMDD'), 'na'))
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', _updated > 0, 'effective_until', _period_end);
END;
$$;

-- Self-service: usuário autenticado cancela a PRÓPRIA assinatura. anon não.
REVOKE EXECUTE ON FUNCTION public.request_subscription_cancellation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_subscription_cancellation() TO authenticated;

-- VERIFICAÇÃO (rodar após aplicar):
-- SELECT has_function_privilege('anon', 'public.request_subscription_cancellation()', 'EXECUTE');          -- false
-- SELECT has_function_privilege('authenticated', 'public.request_subscription_cancellation()', 'EXECUTE'); -- true
-- SELECT prosecdef FROM pg_proc WHERE proname = 'request_subscription_cancellation';                       -- true
