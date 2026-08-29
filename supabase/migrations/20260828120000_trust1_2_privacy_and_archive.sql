-- ═══════════════════════════════════════════════════════════════════════════════
-- TRUST-1.2 — PRIVACIDADE CANÔNICA NO SERVIDOR + CONTRATO DE ARQUIVAMENTO (R23)
--
-- §1  R23 — ARCHIVE_INSTEAD_OF_HARD_DELETE.
-- §2  R10 — `eligible_universe` deixa de transportar o tamanho exato do grupo.
-- §3  R10/D6 — o canal de HEADCOUNT passa a ter proteção complementar.
-- §4  D5 — universo ZERO deixa de ser tratado como amostra insuficiente.
--
-- PRÉ-CONDIÇÕES verificadas em §0, com falha explícita.
-- Forward-only. Preserva dados. Sem `DROP ... CASCADE`. Sem secret.
-- Não altera o limiar canônico (`metric_minimum_group_size`), que continua sendo
-- a fonte única e é decisão de produto.
-- ═══════════════════════════════════════════════════════════════════════════════

DO $precheck$
BEGIN
  IF to_regclass('public.institutional_decision_events') IS NULL THEN
    RAISE EXCEPTION 'TRUST-1.2 pré-condição: ledger institutional_decision_events ausente.';
  END IF;
  IF to_regclass('public.schools') IS NULL OR to_regclass('public.classes') IS NULL THEN
    RAISE EXCEPTION 'TRUST-1.2 pré-condição: schools/classes ausentes. Aplique 20260722220000.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'metric_minimum_group_size'
  ) THEN
    RAISE EXCEPTION 'TRUST-1.2 pré-condição: metric_minimum_group_size ausente. Aplique 20260727120000.';
  END IF;
  -- A versão corrigida de get_school_metrics é pré-requisito: esta migration a
  -- substitui e não deve ser aplicada sobre a versão que lê `e.school_id`.
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_school_metrics'
      AND pg_get_functiondef(p.oid) LIKE '%e.school_id%'
  ) THEN
    RAISE EXCEPTION 'TRUST-1.2 pré-condição: get_school_metrics aplicada é a versão defeituosa. '
      'Aplique 20260731100000 antes desta migration.';
  END IF;
END;
$precheck$;

-- ─────────────────────────────────────────────────────────────────────────────
-- §1. R23 — ARQUIVAR EM VEZ DE APAGAR
--
-- O QUE FOI OBSERVADO EM EXECUÇÃO (TRUST-1.5):
-- as FKs do ledger (`organization_id ON DELETE CASCADE`,
-- `school_id`/`class_id ON DELETE SET NULL`) disparam ESCRITA na tabela, e os
-- gatilhos append-only rejeitam escrita — inclusive vinda de `service_role`.
-- Resultado: apagar uma escola com histórico de governança falhava com
-- "institutional_decision_events is append-only", mensagem que não diz nada
-- sobre a causa real.
--
-- E o hard delete É alcançável: `20260722220000` concede
-- `GRANT ... DELETE ... TO authenticated` e cria policies `FOR ALL` para
-- org_admin em `schools` e `classes`. (Em `organizations` só existe policy de
-- UPDATE, então ali o caminho já estava fechado para a API.)
--
-- DECISÃO: preservar a integridade referencial e o ledger. Entidade com
-- histórico auditável não é destruída — é ARQUIVADA. `organizations` já tinha
-- `status IN ('active','suspended','archived')`; `schools` e `classes` não
-- tinham modelo nenhum. Espelhamos o que já existe em vez de inventar outro.
--
-- ESCOPO DELIBERADAMENTE PEQUENO: nenhuma UI de exclusão existe hoje (o painel
-- só insere escola e turma). Esta migration formaliza o CONTRATO — coluna de
-- estado e erro de domínio compreensível — sem construir fluxo de retenção.
-- Nenhuma leitura passa a filtrar `archived`: quando o arquivamento virar
-- operação real, isso é trabalho da onda que o expor.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

DO $status_checks$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_status_check') THEN
    ALTER TABLE public.schools ADD CONSTRAINT schools_status_check
      CHECK (status IN ('active', 'suspended', 'archived'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classes_status_check') THEN
    ALTER TABLE public.classes ADD CONSTRAINT classes_status_check
      CHECK (status IN ('active', 'suspended', 'archived'));
  END IF;
END;
$status_checks$;

COMMENT ON COLUMN public.schools.status IS
  'TRUST-1.2 (R23): ciclo de vida da unidade. Entidade com histórico no ledger de '
  'governança é arquivada (archived), nunca apagada.';
COMMENT ON COLUMN public.classes.status IS
  'TRUST-1.2 (R23): ciclo de vida da turma. Ver comentário de schools.status.';

-- Erro de domínio compreensível no lugar do erro obscuro do gatilho append-only.
-- Roda ANTES da ação da FK, então é esta mensagem que a pessoa vê.
-- SECURITY DEFINER é necessário: desde a TRUST-1.5 nem `authenticated` nem
-- `service_role` têm SELECT em `institutional_decision_events` — a leitura passa
-- por RPC. Um gatilho INVOKER falharia com "permission denied for table", que é
-- justamente o tipo de erro obscuro que esta função existe para eliminar.
-- Ela não devolve dado do ledger: só conta e recusa.
CREATE OR REPLACE FUNCTION public.reject_delete_with_governance_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _events integer;
BEGIN
  IF TG_TABLE_NAME = 'organizations' THEN
    SELECT count(*) INTO _events FROM public.institutional_decision_events
     WHERE organization_id = OLD.id;
  ELSIF TG_TABLE_NAME = 'schools' THEN
    SELECT count(*) INTO _events FROM public.institutional_decision_events
     WHERE school_id = OLD.id;
  ELSE
    SELECT count(*) INTO _events FROM public.institutional_decision_events
     WHERE class_id = OLD.id;
  END IF;

  IF _events > 0 THEN
    RAISE EXCEPTION
      '% has auditable governance history (% event(s)) and cannot be deleted. '
      'Archive it instead: UPDATE public.% SET status = ''archived'' WHERE id = %.',
      TG_TABLE_NAME, _events, TG_TABLE_NAME, quote_literal(OLD.id)
      USING ERRCODE = '23001',
            HINT = 'O histórico de decisões institucionais é append-only por '
                   'design. Arquivar preserva a auditoria e remove a entidade '
                   'da operação.';
  END IF;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.reject_delete_with_governance_history() IS
  'TRUST-1.2 (R23): traduz a rejeição do ledger append-only num erro de domínio '
  'legível e aponta o caminho de arquivamento. ERRCODE 23001 (restrict violation).';

-- Gatilho não precisa de EXECUTE para disparar; ninguém deve poder invocá-la
-- diretamente. Verificação:
--   SELECT has_function_privilege('authenticated',
--     'public.reject_delete_with_governance_history()', 'EXECUTE');  -- false
REVOKE EXECUTE ON FUNCTION public.reject_delete_with_governance_history()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_organizations_no_delete_with_history ON public.organizations;
CREATE TRIGGER trg_organizations_no_delete_with_history
  BEFORE DELETE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.reject_delete_with_governance_history();

DROP TRIGGER IF EXISTS trg_schools_no_delete_with_history ON public.schools;
CREATE TRIGGER trg_schools_no_delete_with_history
  BEFORE DELETE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.reject_delete_with_governance_history();

DROP TRIGGER IF EXISTS trg_classes_no_delete_with_history ON public.classes;
CREATE TRIGGER trg_classes_no_delete_with_history
  BEFORE DELETE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.reject_delete_with_governance_history();

-- ─────────────────────────────────────────────────────────────────────────────
-- §2 a §4. PRIVACIDADE CANÔNICA EM `get_school_metrics`
--
-- Três correções, todas comprovadas como necessárias por execução real
-- (ver TRUST_1_2_PRIVACY_TEST_RECEIPT.md):
--
-- (a) R10 — `eligible_universe` transportava o tamanho EXATO do grupo mesmo com
--     `analytics_suppressed = true`. Escola com 4 estudantes devolvia
--     `"eligible_universe": 4`. A supressão escondia os valores e revelava o
--     tamanho do grupo, que é justamente o que o limiar protege.
--
-- (b) R10/D6 — o CANAL DE HEADCOUNT permitia reconstrução por subtração.
--     Medido: escola de 20 estudantes com turma de 17 (divulgada, `count: 17`) e
--     turma de 3 (suprimida) devolvia `eligible_universe: 20`. 20 − 17 = 3. A
--     supressão complementar existente protegia o `value` (eventos) e deixava o
--     `count` (pessoas) aberto.
--
-- (c) D5 — universo ZERO era tratado como amostra insuficiente
--     (`analytics_suppressed: true`, totais `below_threshold`). Zero não expõe
--     ninguém, e o próprio projeto distingue "ninguém participou" de "sem dados"
--     no nível da turma (`isEmpty`). O nível da escola contradizia isso.
--
-- O VOCABULÁRIO NÃO MUDA: continua `suppressed` / `reason` / `minimumGroupSize`,
-- que é o contrato canônico deste projeto (D53–D55) e o que `metric-privacy.ts`
-- já lê. Introduzir `status`/`threshold` em paralelo criaria dois dialetos.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_school_metrics(_school_id uuid, _period text DEFAULT '30d')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid          uuid := auth.uid();
  _min          integer := public.metric_minimum_group_size();
  _days         integer;
  _since        timestamptz;
  _org_id       uuid;
  _eligible     integer;
  _sessions     integer;
  _exercises    integer;
  _ai           integer;
  _active_7d    integer;
  _classes      jsonb;
  _series       jsonb;
  _generated_at timestamptz := now();
  _totals_suppressed_by_inference boolean := false;
  -- TRUST-1.2: zero é divulgável; 1..k-1 não é.
  _school_disclosed boolean;
  -- Quantos grupos de turma seguem suprimidos DEPOIS da passagem complementar.
  _still_suppressed integer := 0;
  _eligible_group jsonb;
BEGIN
  _days := CASE _period
    WHEN '7d'  THEN 7
    WHEN '30d' THEN 30
    WHEN '90d' THEN 90
    WHEN NULL  THEN 30
    ELSE NULL
  END;

  IF _days IS NULL THEN
    RAISE EXCEPTION 'Invalid period: expected 7d, 30d or 90d' USING ERRCODE = '22023';
  END IF;

  _since := _generated_at - make_interval(days => _days);

  IF _uid IS NULL OR NOT public.can_read_school(_school_id) THEN
    -- ATENÇÃO — R24 (comprovado em execução): esta linha de auditoria NÃO
    -- PERSISTE. O `RAISE EXCEPTION` abaixo aborta a transação e desfaz o INSERT.
    -- `data_access_logs` registra acessos CONCEDIDOS. Tentativas negadas
    -- pertencem a um canal independente e ainda inexistente
    -- (`security_denied_access_events`). Ver TRUST_1_5_R24_DECISION.md.
    -- Mantido porque é o ponto de captura correto quando esse canal existir.
    BEGIN
      INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
      VALUES (_uid, 'SELECT', 'school_metrics', 'get_school_metrics_denied',
        jsonb_build_object('scope_type', 'school', 'school_id', _school_id,
          'reason', 'out_of_scope_or_missing', 'period', _period), 0);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RAISE EXCEPTION 'School not available for this account' USING ERRCODE = '42501';
  END IF;

  SELECT organization_id INTO _org_id FROM public.schools WHERE id = _school_id;

  -- Universo elegível: estudantes ativos vinculados A ESTA ESCOLA.
  SELECT count(DISTINCT m.user_id) INTO _eligible
  FROM public.institutional_memberships m
  WHERE m.school_id = _school_id AND m.status = 'active' AND m.role = 'student';

  -- §4/D5: zero participantes não expõe pessoa alguma. `0` é resposta honesta;
  -- tratá-lo como "amostra insuficiente" faria o gestor ler "sem dados" onde a
  -- resposta correta é "ninguém participou".
  _school_disclosed := (_eligible = 0 OR _eligible >= _min);

  -- Atividade agregada: filtrar por user_ids da escola (engagement_events não
  -- tem school_id — só organization_id e user_id).
  SELECT
    count(*) FILTER (WHERE e.event_type = 'session_start'),
    count(*) FILTER (WHERE e.event_type IN ('exercise_complete','quiz_complete','dynamic_complete','flashcard_session')),
    count(*) FILTER (WHERE e.event_type = 'ai_interaction'),
    count(DISTINCT e.user_id) FILTER (WHERE e.created_at >= _generated_at - interval '7 days')
  INTO _sessions, _exercises, _ai, _active_7d
  FROM public.engagement_events e
  WHERE e.organization_id = _org_id
    AND e.user_id IN (
      SELECT m.user_id FROM public.institutional_memberships m
      WHERE m.school_id = _school_id AND m.status = 'active' AND m.role = 'student'
    )
    AND e.created_at >= _since;

  -- Turmas: atividade por alunos DAQUELA turma.
  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.label), '[]'::jsonb)
  INTO _classes
  FROM (
    SELECT
      c.id::text AS key,
      c.name     AS label,
      CASE WHEN cnt.eligible >= _min
        THEN jsonb_build_object('suppressed', false, 'value', coalesce(act.total, 0),
                                'count', cnt.eligible, 'isEmpty', cnt.eligible = 0)
        WHEN coalesce(cnt.eligible, 0) = 0
        THEN jsonb_build_object('suppressed', false, 'value', 0, 'count', 0, 'isEmpty', true)
        ELSE jsonb_build_object('suppressed', true, 'reason', 'below_threshold',
                                'minimumGroupSize', _min)
      END AS "group"
    FROM public.classes c
    LEFT JOIN (
      SELECT m.class_id, count(DISTINCT m.user_id) AS eligible
      FROM public.institutional_memberships m
      WHERE m.status = 'active' AND m.role = 'student'
      GROUP BY m.class_id
    ) cnt ON cnt.class_id = c.id
    LEFT JOIN (
      SELECT m.class_id, count(*) AS total
      FROM public.engagement_events e
      JOIN public.institutional_memberships m
        ON m.user_id = e.user_id AND m.status = 'active' AND m.role = 'student'
      WHERE e.created_at >= _since AND e.organization_id = _org_id
      GROUP BY m.class_id
    ) act ON act.class_id = c.id
    WHERE c.school_id = _school_id
  ) t;

  -- Supressão complementar do canal de VALOR (§D6/D54).
  DECLARE
    _suppressed_count integer;
    _disclosed_count  integer;
    _victim_key       text;
  BEGIN
    SELECT
      count(*) FILTER (WHERE (c->'group'->>'suppressed')::boolean),
      count(*) FILTER (WHERE NOT (c->'group'->>'suppressed')::boolean)
    INTO _suppressed_count, _disclosed_count
    FROM jsonb_array_elements(_classes) AS c;

    IF _school_disclosed AND _suppressed_count = 1 THEN
      IF _disclosed_count >= 2 THEN
        SELECT c->>'key' INTO _victim_key
        FROM jsonb_array_elements(_classes) AS c
        WHERE NOT (c->'group'->>'suppressed')::boolean
        ORDER BY (c->'group'->>'value')::numeric ASC, c->>'key' ASC
        LIMIT 1;

        SELECT jsonb_agg(
                 CASE WHEN c->>'key' = _victim_key
                   THEN jsonb_set(c, '{group}', jsonb_build_object(
                          'suppressed', true, 'reason', 'complementary',
                          'minimumGroupSize', _min))
                   ELSE c
                 END
                 ORDER BY c->>'label')
        INTO _classes
        FROM jsonb_array_elements(_classes) AS c;
      ELSE
        _totals_suppressed_by_inference := true;
      END IF;
    END IF;
  END;

  -- ───────────────────────────────────────────────────────────────────────────
  -- §3. PROTEÇÃO DO CANAL DE HEADCOUNT (novo)
  --
  -- ALGORITMO, determinístico e independente da ordem do retorno:
  --
  --   1. Recontar quantos grupos de turma seguem suprimidos DEPOIS da passagem
  --      complementar de valor.
  --   2. Se sobrou EXATAMENTE UM grupo suprimido, o `count` dele é a única
  --      incógnita da equação
  --          eligible_universe = Σ(counts divulgados) + count_suprimido
  --      e portanto é recuperável por subtração. Nesse caso, suprimir
  --      `eligible_universe` (reason `complementary`) transforma a equação em
  --      duas incógnitas e fecha o canal.
  --   3. Com ZERO grupos suprimidos não há o que proteger. Com DOIS ou mais, a
  --      soma já é indeterminada.
  --
  -- Por que suprimir o TOTAL e não mais um `count`: o total é um único número,
  -- enquanto esconder outro `count` cegaria uma turma inteira que atingiu o
  -- limiar. Preserva mais utilidade e é a mesma lógica de `suppress_total` já
  -- documentada em `metric-privacy.ts`.
  --
  -- O caso 2 só ocorre quando a passagem de valor caiu no ramo
  -- `_disclosed_count < 2` — ou seja, quando os totais JÁ foram suprimidos por
  -- inferência. A linha de guarda abaixo garante a coerência de qualquer forma,
  -- para que uma alteração futura na passagem de valor não reabra o canal.
  -- ───────────────────────────────────────────────────────────────────────────
  SELECT count(*) FILTER (WHERE (c->'group'->>'suppressed')::boolean)
  INTO _still_suppressed
  FROM jsonb_array_elements(_classes) AS c;

  IF _school_disclosed AND _eligible > 0 AND _still_suppressed = 1 THEN
    _totals_suppressed_by_inference := true;  -- guarda de coerência
  END IF;

  _eligible_group := CASE
    WHEN _eligible = 0
      THEN jsonb_build_object('suppressed', false, 'value', 0, 'count', 0, 'isEmpty', true)
    WHEN _eligible < _min
      THEN jsonb_build_object('suppressed', true, 'reason', 'below_threshold',
                              'minimumGroupSize', _min)
    WHEN _still_suppressed = 1
      THEN jsonb_build_object('suppressed', true, 'reason', 'complementary',
                              'minimumGroupSize', _min)
    ELSE jsonb_build_object('suppressed', false, 'value', _eligible,
                            'count', _eligible, 'isEmpty', false)
  END;

  -- Série diária: filtrar por user_ids da escola.
  SELECT coalesce(jsonb_agg(row_to_json(p)::jsonb ORDER BY p.day), '[]'::jsonb)
  INTO _series
  FROM (
    SELECT
      to_char(d.day, 'YYYY-MM-DD') AS day,
      CASE WHEN coalesce(s.people, 0) >= _min
        THEN jsonb_build_object('suppressed', false, 'value', coalesce(s.total, 0),
                                'count', coalesce(s.people, 0), 'isEmpty', false)
        WHEN coalesce(s.people, 0) = 0
        THEN jsonb_build_object('suppressed', false, 'value', 0, 'count', 0, 'isEmpty', true)
        ELSE jsonb_build_object('suppressed', true, 'reason', 'below_threshold',
                                'minimumGroupSize', _min)
      END AS "group"
    FROM generate_series(date_trunc('day', _since), date_trunc('day', _generated_at), interval '1 day') AS d(day)
    LEFT JOIN (
      SELECT date_trunc('day', e.created_at) AS day,
             count(*) AS total,
             count(DISTINCT e.user_id) AS people
      FROM public.engagement_events e
      WHERE e.user_id IN (
        SELECT m.user_id FROM public.institutional_memberships m
        WHERE m.school_id = _school_id AND m.status = 'active' AND m.role = 'student'
      )
      AND e.organization_id = _org_id
      AND e.created_at >= _since
      GROUP BY 1
    ) s ON s.day = d.day
  ) p;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'SELECT', 'school_metrics', 'get_school_metrics',
    jsonb_build_object('scope_type', 'school', 'school_id', _school_id,
      'organization_id', _org_id, 'period', _period, 'minimum_group_size', _min), 1);

  RETURN jsonb_build_object(
    'school_id', _school_id,
    'organization_id', _org_id,
    'period', _period,
    'days', _days,
    'minimum_group_size', _min,
    -- TRUST-1.2 (R10): deixou de ser um inteiro cru. Agora é um MetricGroup, com
    -- o mesmo vocabulário de qualquer outro grupo do payload.
    'eligible_universe', _eligible_group,
    'generated_at', _generated_at,
    'analytics_suppressed', NOT _school_disclosed,
    'totals', CASE WHEN _totals_suppressed_by_inference
      THEN jsonb_build_object(
        'sessions',  jsonb_build_object('suppressed', true, 'reason', 'complementary', 'minimumGroupSize', _min),
        'exercises', jsonb_build_object('suppressed', true, 'reason', 'complementary', 'minimumGroupSize', _min),
        'ai',        jsonb_build_object('suppressed', true, 'reason', 'complementary', 'minimumGroupSize', _min),
        'active_7d', jsonb_build_object('suppressed', true, 'reason', 'complementary', 'minimumGroupSize', _min)
        )
      WHEN _school_disclosed
      THEN jsonb_build_object(
        'sessions',   jsonb_build_object('suppressed', false, 'value', coalesce(_sessions, 0),  'count', _eligible, 'isEmpty', _eligible = 0),
        'exercises',  jsonb_build_object('suppressed', false, 'value', coalesce(_exercises, 0), 'count', _eligible, 'isEmpty', _eligible = 0),
        'ai',         jsonb_build_object('suppressed', false, 'value', coalesce(_ai, 0),        'count', _eligible, 'isEmpty', _eligible = 0),
        'active_7d',  jsonb_build_object('suppressed', false, 'value', coalesce(_active_7d, 0), 'count', _eligible, 'isEmpty', _eligible = 0)
        )
      ELSE jsonb_build_object(
        'sessions',  jsonb_build_object('suppressed', true, 'reason', 'below_threshold', 'minimumGroupSize', _min),
        'exercises', jsonb_build_object('suppressed', true, 'reason', 'below_threshold', 'minimumGroupSize', _min),
        'ai',        jsonb_build_object('suppressed', true, 'reason', 'below_threshold', 'minimumGroupSize', _min),
        'active_7d', jsonb_build_object('suppressed', true, 'reason', 'below_threshold', 'minimumGroupSize', _min)
        )
      END,
    'classes', CASE WHEN _school_disclosed THEN _classes ELSE '[]'::jsonb END,
    'series',  CASE WHEN _school_disclosed THEN _series  ELSE '[]'::jsonb END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_school_metrics(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_school_metrics(uuid, text) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO APÓS APLICAR
--
--   -- §1: gatilhos de arquivamento (esperado: 3)
--   SELECT count(*) FROM pg_trigger
--    WHERE tgname LIKE 'trg_%_no_delete_with_history' AND NOT tgisinternal;
--
--   -- §1: colunas de estado (esperado: 2)
--   SELECT count(*) FROM information_schema.columns
--    WHERE table_schema='public' AND table_name IN ('schools','classes') AND column_name='status';
--
--   -- §2: eligible_universe deixou de ser inteiro cru (esperado: object)
--   -- (rodar autenticado como org_admin de uma escola com <5 estudantes)
--   SELECT jsonb_typeof(public.get_school_metrics('<school_uuid>','30d')->'eligible_universe');
--
--   -- grants mínimos (esperado: false | true)
--   SELECT has_function_privilege('anon','public.get_school_metrics(uuid, text)','EXECUTE'),
--          has_function_privilege('authenticated','public.get_school_metrics(uuid, text)','EXECUTE');
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- §5. D5/D8 — `get_org_engagement_summary` NÃO APLICAVA LIMIAR NENHUM
--
-- ACHADO DESTA ONDA, comprovado no corpo aplicado: a RPC devolvia contagens
-- cruas de atividade e o bloco INTEIRO de NPS — `nps_avg`, `nps_count`,
-- `nps_promoters`, `nps_detractors` — sem qualquer supressão.
--
-- Por que isso é grave: esses números alimentam o painel institucional E o PDF
-- do relatório piloto (`OrgDashboardPage` → `generate-pilot-report-pdf`). Uma
-- rede com 2 estudantes que responderam NPS exportava `nps_count: 2`,
-- `nps_avg: 9.0`, `nps_promoters: 2` — média e distribuição de um grupo de duas
-- pessoas, num arquivo que o gestor manda por e-mail. §D5 nomeia exatamente
-- isso: `percentage`, `score`, `average`, `distribuição`.
--
-- O universo elegível da organização passa a ser o gate, com a MESMA regra do
-- nível da escola:
--   • 0 estudantes  → divulgado (zero não expõe ninguém)
--   • 1..k-1        → métricas derivadas de estudantes SUPRIMIDAS
--   • >= k          → divulgado
--
-- FORMA DA RESPOSTA: as chaves numéricas passam a vir `null` quando suprimidas,
-- acompanhadas de `analytics_suppressed` e `minimum_group_size` — o mesmo par
-- que `get_school_metrics` já publica. Não se introduz um segundo dialeto de
-- grupo aqui: a supressão é do BLOCO, não de grupos nomeados, porque esta RPC
-- não devolve grupos.
--
-- `null` e não `0`: zero fabricado é o erro que a doutrina §1 proíbe. O cliente
-- precisa poder distinguir "ninguém" de "não podemos dizer".
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_org_engagement_summary(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _min       integer := public.metric_minimum_group_size();
  _eligible  integer;
  _disclosed boolean;
BEGIN
  IF NOT public.is_org_admin(_org_id) THEN
    RAISE EXCEPTION 'Acesso negado: requer org_admin' USING ERRCODE = '42501';
  END IF;

  SELECT count(DISTINCT m.user_id) INTO _eligible
  FROM public.institutional_memberships m
  WHERE m.organization_id = _org_id AND m.status = 'active' AND m.role = 'student';

  _disclosed := (_eligible = 0 OR _eligible >= _min);

  RETURN jsonb_build_object(
    'organization_id', _org_id,
    'generated_at', now(),
    'period_days', 30,
    'minimum_group_size', _min,
    'analytics_suppressed', NOT _disclosed,
    -- O tamanho do universo segue a mesma regra do nível da escola (R10): não
    -- pode trafegar exato quando está entre 1 e k-1.
    'eligible_universe', CASE WHEN _disclosed THEN to_jsonb(_eligible) ELSE 'null'::jsonb END,
    'total_sessions', CASE WHEN _disclosed THEN to_jsonb(COALESCE((
        SELECT count(*) FROM public.engagement_events
         WHERE organization_id = _org_id AND event_type = 'session_start'
           AND created_at > now() - interval '30 days'), 0)) ELSE 'null'::jsonb END,
    'total_exercises', CASE WHEN _disclosed THEN to_jsonb(COALESCE((
        SELECT count(*) FROM public.engagement_events
         WHERE organization_id = _org_id
           AND event_type IN ('exercise_complete', 'dynamic_complete', 'quiz_complete')
           AND created_at > now() - interval '30 days'), 0)) ELSE 'null'::jsonb END,
    'total_ai_interactions', CASE WHEN _disclosed THEN to_jsonb(COALESCE((
        SELECT count(*) FROM public.engagement_events
         WHERE organization_id = _org_id AND event_type = 'ai_interaction'
           AND created_at > now() - interval '30 days'), 0)) ELSE 'null'::jsonb END,
    'active_users_7d', CASE WHEN _disclosed THEN to_jsonb(COALESCE((
        SELECT count(DISTINCT user_id) FROM public.engagement_events
         WHERE organization_id = _org_id
           AND created_at > now() - interval '7 days'), 0)) ELSE 'null'::jsonb END,
    'active_users_30d', CASE WHEN _disclosed THEN to_jsonb(COALESCE((
        SELECT count(DISTINCT user_id) FROM public.engagement_events
         WHERE organization_id = _org_id
           AND created_at > now() - interval '30 days'), 0)) ELSE 'null'::jsonb END,
    -- NPS: média e distribuição de um grupo pequeno identificam a pessoa.
    'nps_avg', CASE WHEN _disclosed THEN COALESCE(to_jsonb((
        SELECT round(avg(score)::numeric, 1) FROM public.nps_responses
         WHERE organization_id = _org_id
           AND created_at > now() - interval '30 days')), 'null'::jsonb) ELSE 'null'::jsonb END,
    'nps_count', CASE WHEN _disclosed THEN to_jsonb(COALESCE((
        SELECT count(*) FROM public.nps_responses
         WHERE organization_id = _org_id
           AND created_at > now() - interval '30 days'), 0)) ELSE 'null'::jsonb END,
    'nps_promoters', CASE WHEN _disclosed THEN to_jsonb(COALESCE((
        SELECT count(*) FROM public.nps_responses
         WHERE organization_id = _org_id AND score >= 9
           AND created_at > now() - interval '30 days'), 0)) ELSE 'null'::jsonb END,
    'nps_detractors', CASE WHEN _disclosed THEN to_jsonb(COALESCE((
        SELECT count(*) FROM public.nps_responses
         WHERE organization_id = _org_id AND score <= 6
           AND created_at > now() - interval '30 days'), 0)) ELSE 'null'::jsonb END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_org_engagement_summary(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_org_engagement_summary(uuid) TO authenticated, service_role;

-- Verificação:
--   SELECT (public.get_org_engagement_summary('<org>')->>'analytics_suppressed')::boolean;
--   -- true numa organização com 1..4 estudantes; e nesse caso nps_avg,
--   -- nps_count, active_users_* devem vir null.
