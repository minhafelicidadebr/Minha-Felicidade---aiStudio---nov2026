-- ═══════════════════════════════════════════════════════════════════════════════
-- ONDA UX-3 — Painel escolar, limiar canônico e governança
--
-- Contrato: docs/kiro/DASHBOARD_PRODUCT_CONTRACT.md (§D2, §D5, §D6, §D7, §D8)
-- Privacidade: docs/kiro/METRIC_PRIVACY_POLICY.md
-- Decisões: docs/kiro/DECISIONS.md (D50, D53, D54, D55, D56)
--
-- Idempotente: CREATE ... IF NOT EXISTS / CREATE OR REPLACE em tudo, porque em
-- Lovable Cloud esta migration às vezes é aplicada à mão no SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. LIMIAR MÍNIMO CANÔNICO (§D5/D53)
--
-- Uma ÚNICA fonte do número. Antes desta onda o 5 estava repetido dentro de
-- get_learning_progress_overview e get_funnel_overview; repetir a constante é
-- como o limiar se degrada em silêncio (basta um lugar ficar para trás).
-- O cliente NUNCA define nem aplica o limiar: ele apenas exibe o que a resposta
-- informou.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.metric_minimum_group_size()
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT 5 $$;

COMMENT ON FUNCTION public.metric_minimum_group_size() IS
  'Limiar mínimo canônico de agregação (N). Fonte única — ver METRIC_PRIVACY_POLICY.md.';

REVOKE EXECUTE ON FUNCTION public.metric_minimum_group_size() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.metric_minimum_group_size() TO authenticated, service_role;

-- Verificação após aplicar:
--   SELECT has_function_privilege('anon', 'public.metric_minimum_group_size()', 'EXECUTE');
--     -> esperado: false
--   SELECT has_function_privilege('authenticated', 'public.metric_minimum_group_size()', 'EXECUTE');
--     -> esperado: true

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. LEDGER DE GOVERNANÇA (§D2/D50)
--
-- Append-only. Reutilizar notification_outbox foi REPROVADO: envio de
-- comunicação e histórico de decisões têm responsabilidades diferentes, e
-- misturá-los deixaria o histórico de governança sujeito à limpeza da fila de
-- e-mails.
--
-- Sem coluna mutável de estado: o estado da fila de decisões é um fold destes
-- eventos, no mesmo padrão de guardian_consent_events.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.institutional_decision_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  school_id         uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  class_id          uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  -- Tipo do evento e entidade de origem (§D2).
  event_type        text NOT NULL CHECK (event_type IN (
                      'invitation_resend',
                      'invitation_resend_blocked',
                      'indicator_escalation',
                      'action_denied'
                    )),
  source_entity     text NOT NULL CHECK (source_entity IN (
                      'institutional_invitations',
                      'school_metrics',
                      'organization'
                    )),
  source_id         uuid,
  severity          text NOT NULL DEFAULT 'info'
                      CHECK (severity IN ('info', 'warning', 'critical')),
  -- Motivo é vocabulário CONTROLADO, não texto livre: §D2 proíbe texto livre
  -- sensível, e um campo aberto num produto de adolescentes acaba recebendo
  -- relato pessoal.
  reason            text NOT NULL CHECK (reason IN (
                      'pending_invitation',
                      'expired_invitation',
                      'resend_limit_reached',
                      'resend_cooldown',
                      'indicator_out_of_range',
                      'out_of_scope_organization',
                      'insufficient_permission'
                    )),
  actor_user_id     uuid NOT NULL,
  actor_role        text NOT NULL,
  result            text NOT NULL CHECK (result IN ('succeeded', 'denied')),
  -- Metadados MÍNIMOS. Nunca nome, e-mail ou relato de estudante.
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key   text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS institutional_decision_events_idempotency_idx
  ON public.institutional_decision_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS institutional_decision_events_org_created_idx
  ON public.institutional_decision_events (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS institutional_decision_events_source_idx
  ON public.institutional_decision_events (source_entity, source_id);

ALTER TABLE public.institutional_decision_events ENABLE ROW LEVEL SECURITY;

-- Leitura: só quem administra a organização. Sem policy de INSERT para
-- authenticated — a escrita passa obrigatoriamente pelas RPCs abaixo.
DROP POLICY IF EXISTS "Org admins read decision events" ON public.institutional_decision_events;
CREATE POLICY "Org admins read decision events"
  ON public.institutional_decision_events
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin(organization_id));

-- Append-only por construção: ZERO policy de UPDATE e ZERO de DELETE para
-- authenticated. Um estado que muda vira um evento novo, nunca a edição da
-- linha antiga.
REVOKE UPDATE, DELETE ON TABLE public.institutional_decision_events FROM authenticated, anon;

-- Defesa em profundidade: mesmo service_role (ou um bug em função DEFINER) não
-- reescreve histórico de governança.
CREATE OR REPLACE FUNCTION public.reject_decision_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'institutional_decision_events is append-only: state changes are new events, never edits'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_decision_events_no_update ON public.institutional_decision_events;
CREATE TRIGGER trg_decision_events_no_update
  BEFORE UPDATE ON public.institutional_decision_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_decision_event_mutation();

DROP TRIGGER IF EXISTS trg_decision_events_no_delete ON public.institutional_decision_events;
CREATE TRIGGER trg_decision_events_no_delete
  BEFORE DELETE ON public.institutional_decision_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_decision_event_mutation();

COMMENT ON TABLE public.institutional_decision_events IS
  'Ledger append-only de decisões institucionais (UX-3, D50). Sem UPDATE/DELETE. Estado derivado por fold.';

-- Verificação após aplicar:
--   SELECT has_table_privilege('authenticated', 'public.institutional_decision_events', 'UPDATE');
--     -> esperado: false
--   SELECT has_table_privilege('authenticated', 'public.institutional_decision_events', 'DELETE');
--     -> esperado: false

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. AUTORIZAÇÃO DE ESCOLA (escopo visível, derivado no servidor)
--
-- Nunca aceita organization_id/role do cliente. Deriva tudo de auth.uid() e de
-- institutional_memberships com status = 'active'.
--
-- Regras (§2 do spec):
--   • school_admin com school_id preenchido → só aquelas escolas;
--   • school_admin com school_id NULO       → nenhuma escola por esse vínculo;
--   • org_admin                             → qualquer escola da organização;
--   • platform_admin                        → qualquer escola.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.can_read_school(_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institutional_memberships m
    JOIN public.schools s ON s.id = _school_id
    WHERE m.user_id = auth.uid()
      AND m.status = 'active'
      AND (
        m.role = 'platform_admin'
        OR (m.role = 'org_admin' AND m.organization_id = s.organization_id)
        OR (m.role = 'school_admin' AND m.school_id IS NOT NULL AND m.school_id = _school_id)
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_read_school(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_school(uuid) TO authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. INDICADORES AGREGADOS DA ESCOLA (§D5, §D6, §D7)
--
-- A supressão é aplicada AQUI, antes de compor a resposta. Esconder no cliente
-- deixaria o valor real no payload, legível em DevTools, em log de rede e em
-- qualquer export — o que §D6 proíbe explicitamente.
--
-- Forma da resposta para grupo abaixo do limiar (§D7/D55): apenas
-- {suppressed, reason, minimum_group_size}. Sem value, sem count, sem
-- porcentagem. Consequência aceita: grupo suprimido devolve MENOS campos que
-- grupo divulgado, e o consumidor trata campo ausente como suprimido.
--
-- Erro de autorização é INDISTINGUÍVEL de escola inexistente e de sessão
-- ausente, para que a resposta não sirva de sonda de quais ids existem.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_school_metrics(
  _school_id uuid,
  _period text DEFAULT '30d'
)
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
  -- Marca que o total caiu por supressão complementar, não por limiar.
  _totals_suppressed_by_inference boolean := false;
BEGIN
  -- Período validado contra o vocabulário canônico. Erro de parâmetro é
  -- distinto do erro de autorização (contrato R4 item 2).
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

  -- Autorização. Uma única mensagem para: sem sessão, escola inexistente e
  -- escola fora do escopo.
  IF _uid IS NULL OR NOT public.can_read_school(_school_id) THEN
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

  -- Universo elegível da escola: estudantes ativos vinculados.
  SELECT count(DISTINCT m.user_id) INTO _eligible
  FROM public.institutional_memberships m
  WHERE m.school_id = _school_id AND m.status = 'active' AND m.role = 'student';

  -- Atividade agregada no período.
  SELECT
    count(*) FILTER (WHERE e.event_type = 'session_start'),
    count(*) FILTER (WHERE e.event_type IN ('exercise_complete','quiz_complete','dynamic_complete','flashcard_session')),
    count(*) FILTER (WHERE e.event_type = 'ai_interaction'),
    count(DISTINCT e.user_id) FILTER (WHERE e.created_at >= _generated_at - interval '7 days')
  INTO _sessions, _exercises, _ai, _active_7d
  FROM public.engagement_events e
  WHERE e.organization_id = _org_id
    AND e.school_id = _school_id
    AND e.created_at >= _since;

  -- Turmas: cada subdivisão sob o MESMO limiar, avaliado por subdivisão.
  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.label), '[]'::jsonb)
  INTO _classes
  FROM (
    SELECT
      c.id::text AS key,
      c.name     AS label,
      CASE WHEN cnt.eligible >= _min
        THEN jsonb_build_object('suppressed', false, 'value', coalesce(act.total, 0),
                                'count', cnt.eligible, 'isEmpty', cnt.eligible = 0)
        WHEN cnt.eligible = 0
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
      SELECT e.class_id, count(*) AS total
      FROM public.engagement_events e
      WHERE e.created_at >= _since
      GROUP BY e.class_id
    ) act ON act.class_id = c.id
    WHERE c.school_id = _school_id
  ) t;

  -- SUPRESSÃO COMPLEMENTAR (§D6/D54).
  --
  -- Com exatamente UMA turma suprimida e o total da escola divulgado, o valor
  -- da turma suprimida é recuperável por subtração. Não é ataque teórico: é
  -- aritmética de primeiro grau feita na própria tela.
  --
  -- Regra determinística (mesma de src/lib/metric-privacy.ts, para que servidor
  -- e cliente concordem):
  --   • sobram 2+ turmas divulgadas → suprime a MENOR delas (mantém o total e a
  --     comparação entre as maiores);
  --   • sobra 1 turma divulgada     → suprimir a única deixaria o conjunto sem
  --     detalhe, então quem cai é o total.
  -- Empate de valor resolve pela chave, para a mesma entrada dar sempre a mesma
  -- saída (sem isso, dois renders esconderiam turmas diferentes).
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

    IF _eligible >= _min AND _suppressed_count = 1 THEN
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
        -- Só uma turma divulgada: esconder o total preserva mais utilidade.
        _totals_suppressed_by_inference := true;
      END IF;
    END IF;
  END;

  -- Série diária. Cada ponto sob o mesmo limiar de participantes distintos.
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
      WHERE e.school_id = _school_id AND e.created_at >= _since
      GROUP BY 1
    ) s ON s.day = d.day
  ) p;

  -- Auditoria da leitura autorizada. Sem dado nominal.
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
    'eligible_universe', _eligible,
    'generated_at', _generated_at,
    -- §D5/D53: escola com universo elegível < N mantém os dados OPERACIONAIS
    -- (que vivem noutras leituras) e perde só o analytics de estudante.
    'analytics_suppressed', _eligible < _min,
    'totals', CASE WHEN _totals_suppressed_by_inference
      THEN jsonb_build_object(
             'sessions',  jsonb_build_object('suppressed', true, 'reason', 'complementary', 'minimumGroupSize', _min),
             'exercises', jsonb_build_object('suppressed', true, 'reason', 'complementary', 'minimumGroupSize', _min),
             'ai',        jsonb_build_object('suppressed', true, 'reason', 'complementary', 'minimumGroupSize', _min),
             'active_7d', jsonb_build_object('suppressed', true, 'reason', 'complementary', 'minimumGroupSize', _min)
           )
      WHEN _eligible >= _min
      THEN jsonb_build_object(
             'sessions',   jsonb_build_object('suppressed', false, 'value', coalesce(_sessions, 0),  'count', _eligible, 'isEmpty', false),
             'exercises',  jsonb_build_object('suppressed', false, 'value', coalesce(_exercises, 0), 'count', _eligible, 'isEmpty', false),
             'ai',         jsonb_build_object('suppressed', false, 'value', coalesce(_ai, 0),        'count', _eligible, 'isEmpty', false),
             'active_7d',  jsonb_build_object('suppressed', false, 'value', coalesce(_active_7d, 0), 'count', _eligible, 'isEmpty', false)
           )
      ELSE jsonb_build_object(
             'sessions',  jsonb_build_object('suppressed', true, 'reason', 'below_threshold', 'minimumGroupSize', _min),
             'exercises', jsonb_build_object('suppressed', true, 'reason', 'below_threshold', 'minimumGroupSize', _min),
             'ai',        jsonb_build_object('suppressed', true, 'reason', 'below_threshold', 'minimumGroupSize', _min),
             'active_7d', jsonb_build_object('suppressed', true, 'reason', 'below_threshold', 'minimumGroupSize', _min)
           )
      END,
    'classes', CASE WHEN _eligible >= _min THEN _classes ELSE '[]'::jsonb END,
    'series',  CASE WHEN _eligible >= _min THEN _series  ELSE '[]'::jsonb END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_school_metrics(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_school_metrics(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.get_school_metrics(uuid, text) IS
  'Indicadores agregados de uma escola, com supressão N>=5 aplicada no servidor (UX-3, D53/D55).';

-- Verificação após aplicar:
--   SELECT has_function_privilege('anon', 'public.get_school_metrics(uuid, text)', 'EXECUTE');
--     -> esperado: false
--   SELECT has_function_privilege('authenticated', 'public.get_school_metrics(uuid, text)', 'EXECUTE');
--     -> esperado: true

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. REENVIO DE CONVITE COM LIMITE E ANTIBURLA (§D8/D56)
--
-- Regra: até 3 reenvios ALÉM do envio inicial, com 24 h entre reenvios.
--
-- O ponto delicado é a antiburla. Contar reenvios na linha do convite seria
-- trivialmente derrotado: `invite_member` é idempotente por
-- (email, org, role), então bastaria cancelar e recriar o convite para zerar o
-- contador. Por isso a contagem é feita no LEDGER, agrupada por organização +
-- destinatário — que é o par que importa, porque é a caixa de entrada de uma
-- pessoa (possivelmente adolescente) que recebe o e-mail.
--
-- O destinatário é guardado no ledger como HASH, não em claro: o ledger é lido
-- por qualquer org_admin, e §D2 manda não guardar dado pessoal desnecessário.
-- O hash permite contar sem expor o e-mail.
-- ═══════════════════════════════════════════════════════════════════════════════
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

  _recipient_hash := encode(digest(lower(trim(_inv.invited_email)), 'sha256'), 'hex');

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

REVOKE EXECUTE ON FUNCTION public.resend_invitation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resend_invitation(uuid) TO authenticated;

-- Verificação após aplicar:
--   SELECT has_function_privilege('anon', 'public.resend_invitation(uuid)', 'EXECUTE');
--     -> esperado: false

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. ESCALONAMENTO DE INDICADOR (§D2/D50)
--
-- Alvo fora da organização do solicitante é NEGADO e a negativa é registrada.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.escalate_indicator(
  _organization_id uuid,
  _school_id uuid,
  _indicator text,
  _severity text DEFAULT 'warning'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF _severity NOT IN ('info', 'warning', 'critical') THEN
    RAISE EXCEPTION 'Invalid severity' USING ERRCODE = '22023';
  END IF;

  -- Escopo verificado contra o banco, ignorando qualquer papel que o cliente
  -- tenha afirmado ter.
  IF NOT public.is_org_admin(_organization_id) THEN
    BEGIN
      INSERT INTO public.institutional_decision_events (
        organization_id, event_type, source_entity, severity, reason,
        actor_user_id, actor_role, result, metadata
      )
      SELECT _organization_id, 'action_denied', 'organization', 'warning',
             'out_of_scope_organization', _uid, 'unknown', 'denied',
             jsonb_build_object('indicator', _indicator)
      WHERE EXISTS (SELECT 1 FROM public.organizations WHERE id = _organization_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RAISE EXCEPTION 'Organization not available for this account' USING ERRCODE = '42501';
  END IF;

  -- Escola informada precisa pertencer à organização informada.
  IF _school_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.schools
    WHERE id = _school_id AND organization_id = _organization_id
  ) THEN
    RAISE EXCEPTION 'School does not belong to the given organization' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.institutional_decision_events (
    organization_id, school_id, event_type, source_entity, source_id,
    severity, reason, actor_user_id, actor_role, result, metadata
  ) VALUES (
    _organization_id, _school_id, 'indicator_escalation', 'school_metrics', _school_id,
    _severity, 'indicator_out_of_range', _uid, 'org_admin', 'succeeded',
    jsonb_build_object('indicator', _indicator)
  );

  RETURN jsonb_build_object('escalated', true, 'indicator', _indicator, 'severity', _severity);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.escalate_indicator(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_indicator(uuid, uuid, text, text) TO authenticated;

-- Verificação após aplicar:
--   SELECT has_function_privilege('anon', 'public.escalate_indicator(uuid, uuid, text, text)', 'EXECUTE');
--     -> esperado: false
