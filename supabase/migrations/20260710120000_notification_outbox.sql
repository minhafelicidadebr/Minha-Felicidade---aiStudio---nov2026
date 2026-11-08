-- Onda 1.5 (pós-compra) — fila de notificações a enviar (transactional outbox).
-- Desacopla a ATIVAÇÃO da assinatura (fonte de verdade, Onda 1) do ENVIO de
-- e-mail: a ativação/ciclo de vida apenas enfileira aqui; a edge function
-- process-notifications envia depois via provedor (Resend). Isso dá:
--   - idempotência (dedupe_key UNIQUE → mesmo evento nunca gera 2 e-mails);
--   - não-bloqueio (falha de e-mail nunca reverte a ativação);
--   - resiliência (reprocessa pendentes/falhas).
--
-- Sem policy de cliente: leitura/escrita só via service_role (edge functions).

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN (
    'subscription_welcome',
    'renewal_reminder',
    'payment_failed',
    'subscription_expired',
    'subscription_canceled'
  )),
  recipient_email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Idempotência: ex. 'welcome:<mp_payment_id>'. Enfileirar o mesmo evento
  -- duas vezes falha no conflito (ON CONFLICT DO NOTHING) e não duplica envio.
  dedupe_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

-- Índice para o worker varrer pendentes de forma barata.
CREATE INDEX IF NOT EXISTS notification_outbox_pending_idx
  ON public.notification_outbox (created_at)
  WHERE status = 'pending';

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy de cliente: anon/authenticated não leem nem escrevem.
REVOKE ALL ON public.notification_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.notification_outbox TO service_role;

-- VERIFICAÇÃO (rodar após aplicar):
-- SELECT has_table_privilege('anon', 'public.notification_outbox', 'SELECT');          -- false
-- SELECT has_table_privilege('authenticated', 'public.notification_outbox', 'INSERT'); -- false
-- SELECT has_table_privilege('service_role', 'public.notification_outbox', 'INSERT');  -- true
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'notification_outbox';           -- true
