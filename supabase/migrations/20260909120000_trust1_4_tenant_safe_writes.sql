-- TRUST-1.4 — DB-R02/R11 — escrita tenant-safe em engagement_events/nps_responses
-- Forward-only. Preserva linhas existentes; não altera migrations anteriores.
--
-- PROBLEMA (RED, comprovado contra Postgres real antes desta migration):
-- As policies de INSERT criadas em 20260725100000 validam apenas
-- `user_id = auth.uid()`. `organization_id` chega inteiramente do payload do
-- cliente, sem nenhuma verificação de membership. Um usuário autenticado com
-- QUALQUER conta válida pode gravar `engagement_events`/`nps_responses` em
-- qualquer organização, inclusive sem nunca ter sido membro dela — data
-- poisoning institucional (§ risk register R02/R11), incluindo o vetor de
-- "threshold poisoning" (inflar count(DISTINCT user_id) de uma organização
-- alheia até estourar o k_min=5 e forçar divulgação de métrica suprimida).
--
-- CORREÇÃO: mesma forma já usada em escalate_indicator/invite_member/
-- archive_institutional_entity — RPC SECURITY DEFINER resolve auth.uid() e
-- valida is_org_member(_organization_id) internamente (o que já nega
-- membership revogada/inativa e organização archived/suspended via R29,
-- sem duplicar essa lógica). O client nunca autoriza tenant, só declara a
-- intenção. INSERT direto client-side é revogado depois que a RPC existe.

DO $precheck$
BEGIN
  IF to_regclass('public.engagement_events') IS NULL
     OR to_regclass('public.nps_responses') IS NULL THEN
    RAISE EXCEPTION 'TRUST-1.4/R02-R11: engagement_events/nps_responses ausentes.';
  END IF;

  IF to_regprocedure('public.is_org_member(uuid)') IS NULL THEN
    RAISE EXCEPTION 'TRUST-1.4/R02-R11: is_org_member ausente. Aplique até 20260902120000.';
  END IF;
END;
$precheck$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. record_engagement_event — única porta de escrita para engagement_events
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.record_engagement_event(
  _organization_id uuid,
  _event_type text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _safe_metadata jsonb := coalesce(_metadata, '{}'::jsonb);
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  -- organization_id é opcional (uso individual sem organização), mas se o
  -- cliente declarar um, a membership é verificada no servidor. is_org_member
  -- já nega organização archived/suspended e membership inativa (R29).
  IF _organization_id IS NOT NULL AND NOT public.is_org_member(_organization_id) THEN
    RAISE EXCEPTION 'Organization not available for this account' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(_safe_metadata) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'metadata must be a JSON object' USING ERRCODE = '22023';
  END IF;

  -- Defesa em profundidade: o client já limita a 5 chaves/valores escalares
  -- curtos (src/lib/engagement.ts:sanitize), mas nada impedia um chamador
  -- direto de enviar um payload arbitrariamente grande.
  IF octet_length(_safe_metadata::text) > 2000 THEN
    RAISE EXCEPTION 'metadata payload too large' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.engagement_events (user_id, organization_id, event_type, metadata)
  VALUES (_uid, _organization_id, _event_type, _safe_metadata)
  RETURNING id INTO _id;

  RETURN jsonb_build_object(
    'id', _id,
    'organization_id', _organization_id,
    'event_type', _event_type
  );
END;
$$;

COMMENT ON FUNCTION public.record_engagement_event(uuid, text, jsonb) IS
  'TRUST-1.4/R02: única porta de escrita de engagement_events; resolve auth.uid() e valida membership no servidor.';

REVOKE EXECUTE ON FUNCTION public.record_engagement_event(uuid, text, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_engagement_event(uuid, text, jsonb)
  TO authenticated;

-- Verificação:
-- SELECT has_function_privilege('anon','public.record_engagement_event(uuid,text,jsonb)','EXECUTE'),
--        has_function_privilege('authenticated','public.record_engagement_event(uuid,text,jsonb)','EXECUTE');
-- esperado: false | true

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. submit_nps_response — única porta de escrita para nps_responses
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.submit_nps_response(
  _score smallint,
  _organization_id uuid DEFAULT NULL,
  _feedback text DEFAULT NULL,
  _context text DEFAULT 'general'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _safe_feedback text := _feedback;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF _organization_id IS NOT NULL AND NOT public.is_org_member(_organization_id) THEN
    RAISE EXCEPTION 'Organization not available for this account' USING ERRCODE = '42501';
  END IF;

  IF _safe_feedback IS NOT NULL AND char_length(_safe_feedback) > 2000 THEN
    RAISE EXCEPTION 'feedback exceeds maximum length' USING ERRCODE = '22023';
  END IF;

  -- score/context permanecem validados pelos CHECK constraints da tabela
  -- (0–10 / vocabulário fechado) — não duplicados aqui.
  INSERT INTO public.nps_responses (user_id, organization_id, score, feedback, context)
  VALUES (_uid, _organization_id, _score, _safe_feedback, coalesce(_context, 'general'))
  RETURNING id INTO _id;

  RETURN jsonb_build_object(
    'id', _id,
    'organization_id', _organization_id,
    'score', _score
  );
END;
$$;

COMMENT ON FUNCTION public.submit_nps_response(smallint, uuid, text, text) IS
  'TRUST-1.4/R11: única porta de escrita de nps_responses; resolve auth.uid() e valida membership no servidor.';

REVOKE EXECUTE ON FUNCTION public.submit_nps_response(smallint, uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_nps_response(smallint, uuid, text, text)
  TO authenticated;

-- Verificação:
-- SELECT has_function_privilege('anon','public.submit_nps_response(smallint,uuid,text,text)','EXECUTE'),
--        has_function_privilege('authenticated','public.submit_nps_response(smallint,uuid,text,text)','EXECUTE');
-- esperado: false | true

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Fecha o INSERT direto client-side. A escrita passa obrigatoriamente pelas
-- RPCs acima — mesmo padrão de institutional_decision_events (sem policy de
-- INSERT para authenticated). SELECT (self-read) não é alterado.
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can log own engagement" ON public.engagement_events;
DROP POLICY IF EXISTS "Users can submit own NPS" ON public.nps_responses;

REVOKE INSERT ON TABLE public.engagement_events FROM authenticated;
REVOKE INSERT ON TABLE public.nps_responses FROM authenticated;

-- Verificação:
-- SELECT has_table_privilege('authenticated','public.engagement_events','INSERT'),
--        has_table_privilege('authenticated','public.nps_responses','INSERT');
-- esperado: false | false
--
-- SELECT count(*) FROM pg_policies
--  WHERE schemaname='public' AND tablename IN ('engagement_events','nps_responses') AND cmd='INSERT';
-- esperado: 0
