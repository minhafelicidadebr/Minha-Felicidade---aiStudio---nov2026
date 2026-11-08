-- Onda 2 — Instrumentação do funil de conversão.
-- Tabela write-only do ponto de vista do cliente: anon/authenticated podem
-- INSERIR eventos, mas nunca ler/alterar/apagar. Leitura só agregada, via RPC
-- SECURITY DEFINER restrita a teacher/manager (get_funnel_overview). Sem PII:
-- só tipo de evento (lista fechada), session_id anônimo, user_id opcional e
-- metadata jsonb limitado.

CREATE TABLE IF NOT EXISTS public.landing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN (
    'signup', 'activation', 'lesson_completed',
    'paywall_hit', 'checkout_started', 'upgrade'
  )),
  session_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS landing_events_kind_created_at_idx
  ON public.landing_events (kind, created_at);
CREATE INDEX IF NOT EXISTS landing_events_session_id_idx
  ON public.landing_events (session_id);

ALTER TABLE public.landing_events ENABLE ROW LEVEL SECURITY;

-- Write-only para o cliente: pode INSERIR, nunca ler/alterar/apagar.
DROP POLICY IF EXISTS "Anyone can insert landing events" ON public.landing_events;
CREATE POLICY "Anyone can insert landing events"
  ON public.landing_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    -- metadata precisa ser um objeto jsonb (defesa em profundidade; a allowlist
    -- de chaves por kind é reforçada no cliente, em src/lib/analytics.ts).
    jsonb_typeof(metadata) = 'object'
  );

-- Nenhuma policy de SELECT/UPDATE/DELETE para o cliente.
REVOKE SELECT, UPDATE, DELETE ON public.landing_events FROM anon, authenticated;
GRANT SELECT ON public.landing_events TO service_role;

-- VERIFICAÇÃO (rodar após aplicar):
-- SELECT has_table_privilege('anon', 'public.landing_events', 'INSERT');  -- true
-- SELECT has_table_privilege('anon', 'public.landing_events', 'SELECT');  -- false
-- SELECT has_table_privilege('authenticated', 'public.landing_events', 'SELECT'); -- false
