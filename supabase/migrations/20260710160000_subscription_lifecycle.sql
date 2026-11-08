-- Onda 1.5 Task 5 — ciclo de vida das assinaturas (job diário).
-- Toda a lógica em SQL (lê auth.users para e-mail, escreve outbox e estado):
--   1. Lembrete de renovação: assinaturas ativas que vencem em N dias, não
--      canceladas, 1x por ciclo (dedupe 'renewal:<id>:<YYYYMMDD>').
--   2. Expiração: assinaturas ativas vencidas -> status='expired' + aviso
--      (dedupe 'expired:<id>:<YYYYMMDD>'). get_my_plan já ignora não-ativas,
--      então o acesso cai para o gratuito automaticamente.
-- service_role-only; acionada pela edge function subscription-lifecycle (cron).

CREATE OR REPLACE FUNCTION public.run_subscription_lifecycle(_reminder_days integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _reminders integer := 0;
  _expired integer := 0;
BEGIN
  -- 1. Lembretes de renovação (best-effort, idempotente por ciclo).
  WITH due AS (
    SELECT us.id, us.user_id, us.current_period_end, us.billing_interval,
           u.email, sp.slug
    FROM public.user_subscriptions us
    JOIN auth.users u ON u.id = us.user_id
    JOIN public.subscription_plans sp ON sp.id = us.plan_id
    WHERE us.status = 'active'
      AND us.cancel_at_period_end = false
      AND us.current_period_end IS NOT NULL
      AND us.current_period_end >= now()
      AND us.current_period_end <= now() + make_interval(days => GREATEST(_reminder_days, 0))
      AND u.email IS NOT NULL
  ), ins_reminders AS (
    INSERT INTO public.notification_outbox (kind, recipient_email, user_id, payload, dedupe_key)
    SELECT 'renewal_reminder', d.email, d.user_id,
      jsonb_build_object('plan_slug', d.slug, 'billing_interval', d.billing_interval, 'period_end', d.current_period_end),
      'renewal:' || d.id::text || ':' || to_char(d.current_period_end, 'YYYYMMDD')
    FROM due d
    ON CONFLICT (dedupe_key) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO _reminders FROM ins_reminders;

  -- 2. Expiração de assinaturas vencidas + aviso.
  WITH expired_subs AS (
    UPDATE public.user_subscriptions us
    SET status = 'expired', updated_at = now()
    WHERE us.status = 'active'
      AND us.current_period_end IS NOT NULL
      AND us.current_period_end < now()
    RETURNING us.id, us.user_id, us.plan_id, us.current_period_end
  ), enq_expired AS (
    INSERT INTO public.notification_outbox (kind, recipient_email, user_id, payload, dedupe_key)
    SELECT 'subscription_expired', u.email, es.user_id,
      jsonb_build_object('plan_slug', sp.slug, 'period_end', es.current_period_end),
      'expired:' || es.id::text || ':' || to_char(es.current_period_end, 'YYYYMMDD')
    FROM expired_subs es
    JOIN auth.users u ON u.id = es.user_id
    JOIN public.subscription_plans sp ON sp.id = es.plan_id
    WHERE u.email IS NOT NULL
    ON CONFLICT (dedupe_key) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO _expired FROM expired_subs;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (NULL, 'UPDATE', 'user_subscriptions', 'subscription_lifecycle',
    jsonb_build_object('reminders', _reminders, 'expired', _expired), _expired);

  RETURN jsonb_build_object('ok', true, 'reminders', _reminders, 'expired', _expired);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_subscription_lifecycle(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_subscription_lifecycle(integer) TO service_role;

-- VERIFICAÇÃO (rodar após aplicar):
-- SELECT has_function_privilege('authenticated', 'public.run_subscription_lifecycle(integer)', 'EXECUTE'); -- false
-- SELECT has_function_privilege('service_role', 'public.run_subscription_lifecycle(integer)', 'EXECUTE');   -- true
