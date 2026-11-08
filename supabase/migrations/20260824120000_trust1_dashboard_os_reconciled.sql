-- ═══════════════════════════════════════════════════════════════════════════════
-- TRUST-1.1B — RECONCILIAÇÃO FORWARD-ONLY DO DASHBOARD OPERATING SYSTEM
--
-- FINALIDADE
-- Consolidar o estado final necessário ao Dashboard OS depois do ensaio de
-- reconstrução integral do banco em staging local (42 migrations desde zero).
-- Esta migration é a MENOR reconciliação segura possível: corrige um defeito
-- comprovado em execução e trava as pré-condições que o ensaio validou.
--
-- Receipt: docs/kiro/trust-1/TRUST_1_1B_LOCAL_RESET_RECEIPT.md
-- Diff:    docs/kiro/trust-1/TRUST_1_1B_SCHEMA_DIFF.md
--
-- PRÉ-CONDIÇÕES (verificadas em execução no bloco §0; falham explicitamente)
--   1. `public.get_school_metrics(uuid, text)` existe e NÃO referencia
--      `e.school_id`/`e.class_id` — ou seja, `20260731100000` já foi aplicada.
--   2. `public.institutional_decision_events` existe com os gatilhos append-only.
--   3. `public.metric_minimum_group_size()` existe (limiar canônico de privacidade).
--   4. pgcrypto está instalado e `digest` é resolvível por schema qualificado.
--
-- O QUE ESTA MIGRATION FAZ
--   §1  Corrige `resend_invitation`: `digest` → `extensions.digest` (R20, P0).
--   §2  Reafirma os grants mínimos das funções do domínio (idempotente).
--   §3  Verifica e AVISA (sem remover) sobre resíduo das migrations contaminantes.
--
-- O QUE ESTA MIGRATION NÃO FAZ — e por quê
--   • Não redeclara `get_school_metrics`. O estado final já está correto desde
--     `20260731100000`. Redeclarar criaria uma terceira cópia de ~200 linhas do
--     mesmo corpo, que é dívida, não reconciliação. Em vez disso, §0 FALHA se o
--     estado aplicado for o defeituoso.
--   • Não altera o limiar de privacidade. É configuração canônica de produto
--     (METRIC_PRIVACY_POLICY.md), não item de reconciliação técnica.
--   • Não concede nem remove privilégio em `institutional_decision_events`.
--     A policy de leitura declarada em `20260727120000` é inerte por falta de
--     GRANT SELECT (R21, P1). Resolver isso é decisão de contrato — alargar
--     privilégio de auditoria ou remover a policy — registrada em
--     docs/kiro/trust-1/evidence/finding-03-ledger-policy-sem-grant.md.
--   • Não cria conta de teste, não define credencial, não contém secret.
--   • Não usa `DROP ... CASCADE`. Não remove nenhum objeto.
--   • Não toca objeto fora do domínio Dashboard OS.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- §0. PRÉ-CONDIÇÕES — falhar explicitamente diante de estado incompatível
-- ─────────────────────────────────────────────────────────────────────────────
DO $precheck$
DECLARE
  _def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO _def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'get_school_metrics';

  IF _def IS NULL THEN
    RAISE EXCEPTION 'TRUST-1 pré-condição 1: public.get_school_metrics ausente. '
      'Aplique 20260727120000 e 20260731100000 antes desta migration.';
  END IF;

  IF _def LIKE '%e.school_id%' OR _def LIKE '%e.class_id%' THEN
    RAISE EXCEPTION 'TRUST-1 pré-condição 1: get_school_metrics aplicada é a versão '
      'defeituosa (referencia coluna inexistente em engagement_events). '
      'Aplique 20260731100000 antes desta migration.';
  END IF;

  IF to_regclass('public.institutional_decision_events') IS NULL THEN
    RAISE EXCEPTION 'TRUST-1 pré-condição 2: ledger institutional_decision_events ausente.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.institutional_decision_events'::regclass
      AND NOT tgisinternal
      AND tgname IN ('trg_decision_events_no_update', 'trg_decision_events_no_delete')
    HAVING count(*) = 2
  ) THEN
    RAISE EXCEPTION 'TRUST-1 pré-condição 2: gatilhos append-only do ledger ausentes ou incompletos.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'metric_minimum_group_size'
  ) THEN
    RAISE EXCEPTION 'TRUST-1 pré-condição 3: metric_minimum_group_size ausente.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'TRUST-1 pré-condição 4: pgcrypto não instalado; resend_invitation '
      'depende de digest() para o hash do destinatário.';
  END IF;
END;
$precheck$;

-- ─────────────────────────────────────────────────────────────────────────────
-- §1. R20 (P0) — `resend_invitation` nunca conseguiu resolver `digest`
--
-- A função é pinada em `SET search_path = public`, como a doutrina exige. O
-- pgcrypto do Supabase mora no schema `extensions`. Logo `digest(...)` não
-- qualificado NUNCA resolveu: a função abortava em toda invocação, antes de
-- qualquer escrita, com "function digest(text, unknown) does not exist".
--
-- Comprovado em execução no Postgres local (teste T15 da TRUST-1.1B).
-- Consumidor ativo: src/hooks/useDecisionActions.ts → botão "Reenviar convite".
--
-- Correção: qualificar a chamada. O `search_path` pinado permanece `public`.
-- Nada mais no corpo muda — mesma política de antiburla (§D56: 3 reenvios além
-- do inicial, 24h de intervalo, contagem por organização + destinatário).
--
-- Evidência: docs/kiro/trust-1/evidence/reset-failure-02-pgcrypto-search-path.md
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resend_invitation(_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid            uuid := auth.uid();
  _inv            record;
  _recipient_hash text;
  _resends        integer;
  _last_resend    timestamptz;
  _max_resends    constant integer := 3;
  _cooldown       constant interval := interval '24 hours';
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO _inv FROM public.institutional_invitations WHERE id = _invitation_id;

  -- Convite inexistente e convite fora do escopo devolvem a MESMA negativa,
  -- para não servir de sonda.
  IF _inv IS NULL OR NOT public.is_org_admin(_inv.organization_id) THEN
    RAISE EXCEPTION 'Invitation not available for this account' USING ERRCODE = '42501';
  END IF;

  -- §D8: só convite pendente, não aceito, não revogado e dentro da validade.
  IF _inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation already accepted' USING ERRCODE = '22023';
  END IF;
  IF _inv.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation expired: cancel and issue a new one' USING ERRCODE = '22023';
  END IF;

  -- TRUST-1.1B (R20): schema-qualificado. pgcrypto vive em `extensions` e o
  -- search_path desta função é pinado em `public` por exigência de segurança.
  _recipient_hash := encode(extensions.digest(lower(trim(_inv.invited_email)), 'sha256'), 'hex');

  -- Contagem por ORGANIZAÇÃO + DESTINATÁRIO, atravessando recriações de convite.
  SELECT count(*), max(created_at)
  INTO _resends, _last_resend
  FROM public.institutional_decision_events
  WHERE organization_id = _inv.organization_id
    AND event_type = 'invitation_resend'
    AND result = 'succeeded'
    AND metadata->>'recipient_hash' = _recipient_hash;

  IF _resends >= _max_resends THEN
    INSERT INTO public.institutional_decision_events (
      organization_id, school_id, class_id, event_type, source_entity, source_id,
      severity, reason, actor_user_id, actor_role, result, metadata
    ) VALUES (
      _inv.organization_id, _inv.school_id, _inv.class_id,
      'invitation_resend_blocked', 'institutional_invitations', _inv.id,
      'warning', 'resend_limit_reached', _uid, 'org_admin', 'denied',
      jsonb_build_object('recipient_hash', _recipient_hash, 'resends', _resends,
                         'max_resends', _max_resends, 'role', _inv.role)
    );
    RAISE EXCEPTION 'Resend limit reached (% of %) for this recipient in this organization',
      _resends, _max_resends USING ERRCODE = '22023';
  END IF;

  IF _last_resend IS NOT NULL AND _last_resend > now() - _cooldown THEN
    INSERT INTO public.institutional_decision_events (
      organization_id, school_id, class_id, event_type, source_entity, source_id,
      severity, reason, actor_user_id, actor_role, result, metadata
    ) VALUES (
      _inv.organization_id, _inv.school_id, _inv.class_id,
      'invitation_resend_blocked', 'institutional_invitations', _inv.id,
      'info', 'resend_cooldown', _uid, 'org_admin', 'denied',
      jsonb_build_object('recipient_hash', _recipient_hash, 'resends', _resends,
                         'last_resend_at', _last_resend, 'role', _inv.role)
    );
    RAISE EXCEPTION 'Resend blocked: minimum interval of 24 hours between resends'
      USING ERRCODE = '22023';
  END IF;

  -- Enfileira o envio (best-effort: a fila de e-mail não bloqueia a decisão).
  BEGIN
    INSERT INTO public.notification_outbox (kind, recipient_email, body_html, dedupe_key, metadata)
    VALUES (
      'institutional_invite',
      lower(trim(_inv.invited_email)),
      '<p>Lembrete: você tem um convite pendente como <strong>' || _inv.role || '</strong>.</p>',
      'invite-resend:' || _inv.id::text || ':' || (_resends + 1)::text,
      jsonb_build_object('invitation_id', _inv.id, 'token', _inv.token,
                         'organization_id', _inv.organization_id, 'resend', _resends + 1)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  INSERT INTO public.institutional_decision_events (
    organization_id, school_id, class_id, event_type, source_entity, source_id,
    severity, reason, actor_user_id, actor_role, result, metadata, idempotency_key
  ) VALUES (
    _inv.organization_id, _inv.school_id, _inv.class_id,
    'invitation_resend', 'institutional_invitations', _inv.id,
    'info', 'pending_invitation', _uid, 'org_admin', 'succeeded',
    jsonb_build_object('recipient_hash', _recipient_hash, 'resend', _resends + 1,
                       'role', _inv.role),
    'invite-resend:' || _inv.id::text || ':' || (_resends + 1)::text
  );

  RETURN jsonb_build_object(
    'invitation_id', _inv.id,
    'resend', _resends + 1,
    'remaining', _max_resends - (_resends + 1)
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- §2. GRANTS MÍNIMOS DO DOMÍNIO — reafirmação idempotente
--
-- `CREATE OR REPLACE FUNCTION` preserva os grants existentes, mas a reafirmação
-- torna o estado esperado explícito e verificável nesta migration.
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.resend_invitation(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.resend_invitation(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_school_metrics(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_school_metrics(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.escalate_indicator(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.escalate_indicator(uuid, uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_read_school(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.can_read_school(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.metric_minimum_group_size() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.metric_minimum_group_size() TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- §3. CONTAMINANTES — verificação sem remoção
--
-- `20260728194005` cria e `20260728194702` remove objetos de outro produto
-- (`runtime_gates`, `gate_enabled`, `compute_cycle_risk`), além de emitir
-- `DROP ... IF EXISTS` sobre tabelas que nunca pertenceram a este projeto.
--
-- No ensaio local, após as 42 migrations, o estado final ficou LIMPO: nenhum
-- desses objetos existe. Não há resíduo a neutralizar, então esta migration não
-- remove nada — apenas AVISA se algum ambiente divergir. Remoção silenciosa de
-- objeto não inventariado seria destrutiva e está fora do mandato TRUST-1.
-- ─────────────────────────────────────────────────────────────────────────────
DO $contaminants$
DECLARE
  _residual text;
BEGIN
  SELECT string_agg(obj, ', ' ORDER BY obj) INTO _residual
  FROM (
    SELECT table_name AS obj FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('runtime_gates', 'ergonomic_assessments',
                         'contextual_risk_reviews', 'risk_criteria_versions',
                         'membership_invites', 'platform_admins',
                         'instrument_versions')
    UNION ALL
    SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('gate_enabled', 'compute_cycle_risk')
  ) r;

  IF _residual IS NOT NULL THEN
    RAISE WARNING 'TRUST-1: resíduo de migration contaminante presente neste ambiente: %. '
      'Não removido por esta migration. Inventariar antes de decidir.', _residual;
  ELSE
    RAISE NOTICE 'TRUST-1: nenhum resíduo de migration contaminante neste ambiente.';
  END IF;
END;
$contaminants$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO APÓS APLICAR
--
--   -- §1: a correção do digest está no corpo aplicado
--   SELECT position('extensions.digest' in pg_get_functiondef(p.oid)) > 0 AS corrigida
--     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public' AND p.proname = 'resend_invitation';
--   -- esperado: true
--
--   -- §2: grants mínimos
--   SELECT has_function_privilege('anon',          'public.resend_invitation(uuid)', 'EXECUTE') AS anon,
--          has_function_privilege('authenticated', 'public.resend_invitation(uuid)', 'EXECUTE') AS authd;
--   -- esperado: false | true
--
--   SELECT has_function_privilege('anon',          'public.get_school_metrics(uuid, text)', 'EXECUTE') AS anon,
--          has_function_privilege('authenticated', 'public.get_school_metrics(uuid, text)', 'EXECUTE') AS authd;
--   -- esperado: false | true
--
--   -- §0/§3: pinning de search_path preservado
--   SELECT array_to_string(p.proconfig, ',') FROM pg_proc p
--     JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public' AND p.proname = 'resend_invitation';
--   -- esperado: search_path=public
-- ═══════════════════════════════════════════════════════════════════════════════
