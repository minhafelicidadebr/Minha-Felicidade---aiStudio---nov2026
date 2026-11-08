-- ═══════════════════════════════════════════════════════════════════════════════
-- TRUST-1.5 — R21: LEITURA DO LEDGER DE GOVERNANÇA POR RPC DEDICADA
--
-- DECISÃO CANÔNICA: `authenticated` NÃO recebe `GRANT SELECT` bruto sobre
-- `public.institutional_decision_events`. A leitura passa por uma RPC dedicada,
-- no mesmo padrão já usado para `guardian_consent_events` — escrita por RPC,
-- leitura por RPC, tabela sem privilégio de DML para os papéis da API.
--
-- ESTADO ANTERIOR (achado da TRUST-1.1B, comprovado no ambiente):
-- a policy `"Org admins read decision events"` existia, mas `authenticated`
-- nunca teve `GRANT SELECT` na tabela. Em PostgreSQL, RLS RESTRINGE um
-- privilégio existente; não o concede. A policy era inerte — declarava no schema
-- um acesso que nunca acontecia.
--
-- Evidência: docs/kiro/trust-1/evidence/finding-03-ledger-policy-sem-grant.md
--
-- O QUE ESTA MIGRATION FAZ
--   §1 Remove a policy inerte e reafirma a ausência de DML para a API.
--   §2 Cria `get_institutional_decision_events(...)` — leitura paginada,
--      escopada por organização, autorizada contra o banco.
--   §3 Grants mínimos.
--
-- O QUE ELA NÃO FAZ
--   • Não concede `SELECT` da tabela a `anon`, `authenticated` nem `service_role`.
--   • Não altera os gatilhos append-only.
--   • Não devolve `metadata` cru: `recipient_hash` e `idempotency_key` ficam
--     fora da projeção (§D2 — não devolver dado pessoal desnecessário).
--   • Não remove nem altera nenhuma linha do ledger.
--   • Não usa `DROP ... CASCADE`.
--
-- Forward-only. Preserva dados.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- §0. PRÉ-CONDIÇÕES — falhar explicitamente diante de estado incompatível
-- ─────────────────────────────────────────────────────────────────────────────
DO $precheck$
BEGIN
  IF to_regclass('public.institutional_decision_events') IS NULL THEN
    RAISE EXCEPTION 'TRUST-1.5 pré-condição: ledger institutional_decision_events ausente. '
      'Aplique 20260727120000 antes desta migration.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_org_admin'
  ) THEN
    RAISE EXCEPTION 'TRUST-1.5 pré-condição: helper is_org_admin ausente. '
      'Aplique 20260722220000 antes desta migration.';
  END IF;

  IF to_regclass('public.data_access_logs') IS NULL THEN
    RAISE EXCEPTION 'TRUST-1.5 pré-condição: data_access_logs ausente; a RPC audita toda leitura.';
  END IF;

  -- Os gatilhos append-only precisam continuar existindo: esta migration abre um
  -- caminho de LEITURA e não deve ser aplicada num ledger que perdeu a proteção
  -- de escrita.
  IF (SELECT count(*) FROM pg_trigger
      WHERE tgrelid = 'public.institutional_decision_events'::regclass
        AND NOT tgisinternal
        AND tgname IN ('trg_decision_events_no_update', 'trg_decision_events_no_delete')) <> 2 THEN
    RAISE EXCEPTION 'TRUST-1.5 pré-condição: gatilhos append-only do ledger ausentes ou incompletos.';
  END IF;
END;
$precheck$;

-- ─────────────────────────────────────────────────────────────────────────────
-- §1. REMOVER A POLICY INERTE
--
-- Ela não tem função contratual: sem `GRANT SELECT` nunca foi avaliada. Mantê-la
-- seria manter uma afirmação falsa no schema — alguém lê a policy e conclui que
-- org_admin acessa a tabela diretamente, o que não é verdade e não passará a ser.
--
-- A tabela continua com RLS habilitada. Sem policy e sem grant de DML para os
-- papéis da API, o acesso direto fica fechado por dois motivos independentes.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Org admins read decision events" ON public.institutional_decision_events;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public.institutional_decision_events
  FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- §2. RPC DEDICADA DE LEITURA
--
-- `SECURITY DEFINER` é necessário porque a tabela não tem grant para
-- `authenticated`. Toda a autorização, portanto, é feita aqui dentro — e é feita
-- contra o BANCO, nunca contra valor vindo do cliente.
--
-- Contrato:
--   • organização validada por `is_org_admin` (mesmo papel que a UX-3 exige para
--     reenviar convite e escalar indicador: quem decide pode auditar);
--   • período limitado a 180 dias;
--   • paginação obrigatória com teto rígido de 100 linhas;
--   • ordenação determinística `created_at DESC, id DESC` — o `id` desempata
--     timestamps iguais, senão a paginação repete ou perde linhas;
--   • projeção fechada: `metadata` não sai cru. Sem `recipient_hash`, sem
--     `idempotency_key`;
--   • `actor_user_id` é devolvido porque auditoria de governança precisa saber
--     QUEM decidiu, e quem lê é administrador da própria organização;
--   • negativa idêntica para organização inexistente e fora de escopo, para não
--     servir de sonda de existência de tenant.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_institutional_decision_events(
  _organization_id uuid,
  _limit           integer DEFAULT 50,
  _offset          integer DEFAULT 0,
  _days            integer DEFAULT 90
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid        uuid := auth.uid();
  _max_limit  constant integer := 100;
  _max_days   constant integer := 180;
  _eff_limit  integer;
  _eff_offset integer;
  _eff_days   integer;
  _since      timestamptz;
  _total      integer;
  _events     jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF _organization_id IS NULL OR NOT public.is_org_admin(_organization_id) THEN
    -- ATENÇÃO — R24 (comprovado em execução na TRUST-1.5): esta linha de
    -- auditoria NÃO PERSISTE. O `RAISE EXCEPTION` abaixo aborta a transação e
    -- desfaz o INSERT junto. O mesmo vale para o caminho de negativa de
    -- `get_school_metrics`, que segue este padrão desde a UX-3.
    --
    -- O INSERT é mantido de propósito: quando o R24 for resolvido (registro fora
    -- da transação), este é o ponto de captura correto. Enquanto não for, NÃO
    -- trate `data_access_logs` como registro de tentativas negadas — só o
    -- caminho de sucesso persiste.
    BEGIN
      INSERT INTO public.data_access_logs
        (actor_user_id, action, resource, purpose, scope, row_count)
      VALUES (_uid, 'SELECT', 'institutional_decision_events',
              'get_institutional_decision_events_denied',
              jsonb_build_object('scope_type', 'organization',
                                 'organization_id', _organization_id,
                                 'reason', 'out_of_scope_or_missing'), 0);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RAISE EXCEPTION 'Organization not available for this account' USING ERRCODE = '42501';
  END IF;

  -- O cliente pode PEDIR qualquer coisa; o servidor decide. Valores inválidos
  -- são normalizados, não aceitos, e nunca ultrapassam os tetos.
  _eff_limit  := least(greatest(coalesce(_limit, 50), 1), _max_limit);
  _eff_offset := greatest(coalesce(_offset, 0), 0);
  _eff_days   := least(greatest(coalesce(_days, 90), 1), _max_days);
  _since      := now() - make_interval(days => _eff_days);

  SELECT count(*) INTO _total
  FROM public.institutional_decision_events e
  WHERE e.organization_id = _organization_id
    AND e.created_at >= _since;

  SELECT coalesce(
           jsonb_agg(row_to_json(p)::jsonb ORDER BY p.created_at DESC, p.id DESC),
           '[]'::jsonb)
  INTO _events
  FROM (
    SELECT
      e.id,
      e.created_at,
      e.event_type,
      e.source_entity,
      e.source_id,
      e.severity,
      e.reason,
      e.result,
      e.actor_user_id,
      e.actor_role,
      e.school_id,
      e.class_id,
      e.metadata->>'role'                AS target_role,
      (e.metadata->>'resend')::integer   AS resend,
      (e.metadata->>'resends')::integer  AS resends
    FROM public.institutional_decision_events e
    WHERE e.organization_id = _organization_id
      AND e.created_at >= _since
    -- Ordenação na subquery define QUAIS linhas entram na página;
    -- a ordenação no `jsonb_agg` acima garante a ordem DO RESULTADO.
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT _eff_limit OFFSET _eff_offset
  ) p;

  INSERT INTO public.data_access_logs
    (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'SELECT', 'institutional_decision_events',
          'get_institutional_decision_events',
          jsonb_build_object('scope_type', 'organization',
                             'organization_id', _organization_id,
                             'days', _eff_days, 'limit', _eff_limit,
                             'offset', _eff_offset),
          jsonb_array_length(_events));

  RETURN jsonb_build_object(
    'organization_id', _organization_id,
    'days', _eff_days,
    'limit', _eff_limit,
    'offset', _eff_offset,
    'total', _total,
    'has_more', (_eff_offset + jsonb_array_length(_events)) < _total,
    'events', _events
  );
END;
$$;

COMMENT ON FUNCTION public.get_institutional_decision_events(uuid, integer, integer, integer) IS
  'TRUST-1.5 (R21): leitura auditada do ledger de decisões institucionais. '
  'Única porta de leitura — a tabela não tem GRANT SELECT para anon/authenticated. '
  'Escopo validado por is_org_admin; projeção fechada; metadata não sai cru.';

-- ─────────────────────────────────────────────────────────────────────────────
-- §3. GRANTS MÍNIMOS
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.get_institutional_decision_events(uuid, integer, integer, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_institutional_decision_events(uuid, integer, integer, integer)
  TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO APÓS APLICAR
--
--   -- a tabela NÃO é legível diretamente pela API (esperado: false | false)
--   SELECT has_table_privilege('anon',          'public.institutional_decision_events', 'SELECT'),
--          has_table_privilege('authenticated', 'public.institutional_decision_events', 'SELECT');
--
--   -- a policy inerte não existe mais (esperado: 0)
--   SELECT count(*) FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'institutional_decision_events';
--
--   -- a RPC é executável só por authenticated (esperado: false | true)
--   SELECT has_function_privilege('anon',          'public.get_institutional_decision_events(uuid, integer, integer, integer)', 'EXECUTE'),
--          has_function_privilege('authenticated', 'public.get_institutional_decision_events(uuid, integer, integer, integer)', 'EXECUTE');
--
--   -- gatilhos append-only intactos (esperado: 2)
--   SELECT count(*) FROM pg_trigger
--    WHERE tgrelid = 'public.institutional_decision_events'::regclass AND NOT tgisinternal;
-- ═══════════════════════════════════════════════════════════════════════════════
