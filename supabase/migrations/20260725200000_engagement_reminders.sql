-- ONDA 6+ — Lembretes de engajamento (retenção)
-- Estende o kind CHECK da notification_outbox e cria RPC para enfileirar lembretes.
-- Idempotente.

-- 1. Extend notification_outbox CHECK to accept 'engagement_reminder'
ALTER TABLE public.notification_outbox DROP CONSTRAINT IF EXISTS notification_outbox_kind_check;
ALTER TABLE public.notification_outbox ADD CONSTRAINT notification_outbox_kind_check
  CHECK (kind IN (
    'subscription_welcome',
    'renewal_reminder',
    'payment_failed',
    'subscription_expired',
    'subscription_canceled',
    'escolar_claim',
    'institutional_invite',
    'engagement_reminder'
  ));

-- 2. RPC: enqueue_engagement_reminders
-- Finds users who haven't had activity in 3+ days and enqueues a reminder.
-- Dedupe: max 1 reminder per user per 7 days.
-- Called by cron/admin (x-trigger-secret), not by client.
CREATE OR REPLACE FUNCTION public.enqueue_engagement_reminders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer := 0;
  _user record;
BEGIN
  -- Find users with engagement_events but no activity in last 3 days
  -- AND no engagement_reminder sent in last 7 days (dedupe)
  FOR _user IN
    SELECT DISTINCT ON (ee.user_id) ee.user_id, u.email
    FROM engagement_events ee
    JOIN auth.users u ON u.id = ee.user_id
    WHERE ee.created_at < now() - interval '3 days'
      AND NOT EXISTS (
        SELECT 1 FROM engagement_events recent
        WHERE recent.user_id = ee.user_id
          AND recent.created_at > now() - interval '3 days'
      )
      AND NOT EXISTS (
        SELECT 1 FROM notification_outbox no2
        WHERE no2.recipient_email = u.email
          AND no2.kind = 'engagement_reminder'
          AND no2.created_at > now() - interval '7 days'
      )
      AND u.email IS NOT NULL
    ORDER BY ee.user_id, ee.created_at DESC
    LIMIT 50
  LOOP
    INSERT INTO notification_outbox (kind, recipient_email, user_id, dedupe_key)
    VALUES (
      'engagement_reminder',
      _user.email,
      _user.user_id,
      'engage_reminder:' || _user.user_id || ':' || date_trunc('week', now())::text
    )
    ON CONFLICT (dedupe_key) DO NOTHING;

    _count := _count + 1;
  END LOOP;

  RETURN jsonb_build_object('enqueued', _count, 'generated_at', now());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_engagement_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_engagement_reminders() TO service_role;

-- Verificação:
-- SELECT public.enqueue_engagement_reminders(); -- (rodar como service_role)
