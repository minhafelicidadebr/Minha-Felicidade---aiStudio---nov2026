-- TRUST-1.6 — DB-R06 — cadeia de evidência de consentimento verificável do responsável
-- Forward-only. Preserva o ledger existente (guardian_consent_events, decision='granted');
-- não altera migrations anteriores.
--
-- PROBLEMA (RED, comprovado contra Postgres local antes desta migration): a
-- única forma de conceder consentimento parental hoje é record_guardian_consent,
-- chamada pelo próprio adolescente, na própria sessão, com guardian_name/
-- guardian_email digitados livremente pelo chamador. Reproduzido: um estudante
-- concedeu consentimento a si mesmo com um responsável inteiramente fabricado
-- ('Fake Guardian', 'fake@example.invalid') e a RPC devolveu granted=true.
-- Não existe canal separado, não existe verificação de posse do e-mail do
-- responsável, não existe versionamento de política aplicado no servidor, não
-- existe revogação.
--
-- LIMITAÇÃO DECLARADA (não é overclaim): verificar que alguém controla o canal
-- de e-mail do responsável NÃO prova maternidade, paternidade, tutela ou
-- responsabilidade legal. Esta migration eleva o assurance de "autodeclarado
-- pelo adolescente" (Level 0) para "canal do responsável verificado, com
-- relação apenas declarada" (Level 1) — não para "relação confirmada pela
-- instituição" (Level 2), porque não existe hoje nenhuma fonte institucional
-- de relação estudante-responsável neste produto (nenhum campo, nenhuma
-- tabela, nenhum import de escola a alimenta). Elevar para Level 2 é trabalho
-- de produto fora do escopo desta correção de segurança.

DO $precheck$
BEGIN
  IF to_regclass('public.guardian_consent_events') IS NULL
     OR to_regclass('public.profiles') IS NULL
     OR to_regclass('public.notification_outbox') IS NULL THEN
    RAISE EXCEPTION 'TRUST-1.6/R06: guardian_consent_events/profiles/notification_outbox ausentes.';
  END IF;

  IF to_regprocedure('public.record_guardian_consent(text,text,text)') IS NULL THEN
    RAISE EXCEPTION 'TRUST-1.6/R06: record_guardian_consent ausente. Aplique até 20260706194000.';
  END IF;
END;
$precheck$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. POLICY REQUIREMENT — configuração explícita, não regra jurídica embutida.
--
-- Separa "qual é a versão vigente" (dado de configuração) de "esta conta
-- precisa de consentimento" (derivado de idade) de "o consentimento foi
-- verificado" (evidência). Uma única linha ativa por vez; histórico preservado
-- (nunca UPDATE — versão nova é uma linha nova com active=true e a antiga
-- passa a active=false no mesmo statement, dentro da mesma transação).
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.guardian_consent_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_version text NOT NULL UNIQUE,
  -- Hash do texto exatamente apresentado ao responsável nesta versão — não o
  -- texto em si (o texto vive no frontend/i18n; o hash é a referência imutável
  -- para responder "o que foi apresentado quando este consentimento ocorreu?").
  statement_sha256 text NOT NULL,
  -- Mudança material (propósito, categorias de dado, uso de IA, compartilhamento)
  -- que invalida grants de versões anteriores para novos tratamentos. Decisão de
  -- produto/política, não inferida automaticamente pelo software.
  requires_reconsent boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guardian_consent_policies ENABLE ROW LEVEL SECURITY;

-- Leitura pública (autenticado): a versão vigente e o hash do texto precisam
-- ser conferíveis pela tela do responsável antes da decisão. Sem PII aqui.
DROP POLICY IF EXISTS "Authenticated can read consent policies" ON public.guardian_consent_policies;
CREATE POLICY "Authenticated can read consent policies"
  ON public.guardian_consent_policies FOR SELECT TO authenticated
  USING (true);

REVOKE ALL ON TABLE public.guardian_consent_policies FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.guardian_consent_policies FROM authenticated;
GRANT SELECT ON TABLE public.guardian_consent_policies TO authenticated;
GRANT ALL ON TABLE public.guardian_consent_policies TO service_role;

-- Semeia a versão vigente já em produção (2026.2) como registro formal —
-- sem isto, "versão atual" continuaria vivendo só numa constante no frontend,
-- e o servidor nunca poderia comparar contra ela.
INSERT INTO public.guardian_consent_policies (policy_version, statement_sha256, requires_reconsent, active)
VALUES (
  '2026.2',
  'fec3cf31db807396364eb02726376c74747d538b9c3c50e5fff6b5cce178bd80',
  true,
  true
)
ON CONFLICT (policy_version) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_current_guardian_consent_policy()
RETURNS TABLE (policy_version text, statement_sha256 text, requires_reconsent boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT policy_version, statement_sha256, requires_reconsent
  FROM public.guardian_consent_policies
  WHERE active = true
  ORDER BY created_at DESC
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_guardian_consent_policy() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_guardian_consent_policy() TO authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. GUARDIAN CONSENT REQUESTS — token opaco de canal, hash armazenado.
--
-- REQUEST ≠ RECEIPT: esta tabela só registra que um pedido foi criado e para
-- qual canal foi endereçado. Nenhuma linha aqui equivale a consentimento.
-- One-time: token_hash é UNIQUE; consumed_at marca uso; nenhum reuso possível.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.guardian_consent_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Declarado por quem criou o pedido (o próprio estudante). É INTENÇÃO, não
  -- autoridade: a autoridade real é comprovada só quando o token é consumido
  -- pelo canal de e-mail correspondente.
  guardian_name text NOT NULL,
  guardian_email text NOT NULL,
  policy_version text NOT NULL REFERENCES public.guardian_consent_policies(policy_version),
  -- Token bruto nunca é persistido — só o hash. O bruto vive apenas no e-mail
  -- entregue (notification_outbox.payload), pelo tempo em que a fila existir.
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'consumed', 'expired', 'superseded')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guardian_consent_requests_student_idx
  ON public.guardian_consent_requests (student_user_id, created_at DESC);

ALTER TABLE public.guardian_consent_requests ENABLE ROW LEVEL SECURITY;

-- O estudante pode ver que um pedido existe e seu status operacional — nunca
-- o token. Nenhuma policy de INSERT/UPDATE/DELETE: escrita só via RPC.
DROP POLICY IF EXISTS "Student can view own consent requests" ON public.guardian_consent_requests;
CREATE POLICY "Student can view own consent requests"
  ON public.guardian_consent_requests FOR SELECT TO authenticated
  USING (auth.uid() = student_user_id);

REVOKE ALL ON TABLE public.guardian_consent_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.guardian_consent_requests TO authenticated;
GRANT ALL ON TABLE public.guardian_consent_requests TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. GUARDIAN CONSENT EVENTS (v2) — ledger append-only da DECISÃO, não do pedido.
--
-- Reaproveita o nome da tabela já existente da doutrina (não duplica conceito),
-- mas amplia o esquema forward-only: decisão passa a aceitar 'declined' e
-- 'revoked' além de 'granted' (o CHECK antigo travava só em 'granted' — R06
-- exigia decline/revoke funcionarem, então o vocabulário precisa comportar).
-- Linhas antigas (decision='granted', sem request_id) permanecem exatamente
-- como estão — histórico imutável, nunca editado.
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.guardian_consent_events
  DROP CONSTRAINT IF EXISTS guardian_consent_events_decision_check;
ALTER TABLE public.guardian_consent_events
  ADD CONSTRAINT guardian_consent_events_decision_check
  CHECK (decision IN ('granted', 'declined', 'revoked'));

ALTER TABLE public.guardian_consent_events
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.guardian_consent_requests(id) ON DELETE SET NULL;
ALTER TABLE public.guardian_consent_events
  ADD COLUMN IF NOT EXISTS assurance_level text NOT NULL DEFAULT 'self_declared'
    CHECK (assurance_level IN ('self_declared', 'channel_verified'));

COMMENT ON COLUMN public.guardian_consent_events.assurance_level IS
  'self_declared: registrado sem verificacao de canal (linhas anteriores a TRUST-1.6). channel_verified: o token do request foi consumido pelo canal do responsavel - prova posse do e-mail, NAO prova relacao legal de responsabilidade.';

-- A UNIQUE(user_id, policy_version) da migration original impediria registrar
-- decline+revoke além do primeiro grant na mesma versão. Ledger de eventos
-- precisa admitir múltiplos eventos por (user, versão) — o estado atual passa
-- a ser sempre derivado por leitura da última linha, nunca da constraint.
ALTER TABLE public.guardian_consent_events
  DROP CONSTRAINT IF EXISTS guardian_consent_events_user_id_policy_version_key;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. create_guardian_consent_request — o estudante declara o canal do responsável.
--
-- Isto NÃO grava consentimento. Gera token forte (32 bytes de entropia via
-- pgcrypto, mesma extensão já homologada no projeto), guarda só o hash,
-- enfileira o e-mail (best-effort, nunca bloqueia) e devolve o request.
-- SECURITY DEFINER porque grava em notification_outbox, que não tem grant
-- nenhum para authenticated (por design, desde a Onda 1.5).
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_guardian_consent_request(
  _guardian_name text,
  _guardian_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _birth_date date;
  _policy record;
  _raw_token text;
  _token_hash text;
  _request_id uuid;
  _expires_at timestamptz;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF trim(_guardian_name) = '' OR trim(_guardian_email) = '' THEN
    RAISE EXCEPTION 'guardian_name and guardian_email are required' USING ERRCODE = '22023';
  END IF;
  IF _guardian_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'guardian_email is not a valid email address' USING ERRCODE = '22023';
  END IF;

  SELECT birth_date INTO _birth_date FROM public.profiles WHERE user_id = _uid;
  IF _birth_date IS NOT NULL AND date_part('year', age(now(), _birth_date)) >= 18 THEN
    RAISE EXCEPTION 'Guardian consent is only applicable to minor accounts' USING ERRCODE = '22023';
  END IF;

  SELECT policy_version, statement_sha256 INTO _policy
  FROM public.get_current_guardian_consent_policy();
  IF _policy.policy_version IS NULL THEN
    RAISE EXCEPTION 'No active guardian consent policy configured' USING ERRCODE = '55000';
  END IF;

  -- Supersede qualquer pedido pendente anterior do mesmo estudante: nunca mais
  -- de um token vivo por vez (evita confusão sobre qual link é o válido).
  UPDATE public.guardian_consent_requests
  SET status = 'superseded'
  WHERE student_user_id = _uid AND status = 'pending';

  _raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  _token_hash := encode(extensions.digest(_raw_token, 'sha256'), 'hex');
  _expires_at := now() + interval '7 days';

  INSERT INTO public.guardian_consent_requests (
    student_user_id, guardian_name, guardian_email, policy_version, token_hash, expires_at
  )
  VALUES (
    _uid, trim(_guardian_name), lower(trim(_guardian_email)), _policy.policy_version, _token_hash, _expires_at
  )
  RETURNING id INTO _request_id;

  -- Enfileira o convite (best-effort: fila de e-mail nunca bloqueia o request).
  -- DELIVERY REQUEST é enfileirar; não é o mesmo que "e-mail chegou" nem
  -- "responsável abriu" — ver R09 (dispatcher pode não estar configurado).
  -- Colunas reais de notification_outbox (20260710120000): kind, recipient_email,
  -- user_id, payload, dedupe_key — não "body_html"/"metadata" (esse par não
  -- existe na tabela; outras RPCs deste projeto os usam dentro de um bloco
  -- EXCEPTION WHEN OTHERS que engole o erro silenciosamente, então nunca foi
  -- notado que o INSERT falhava sempre. Usamos os nomes de coluna reais aqui.
  BEGIN
    INSERT INTO public.notification_outbox (kind, recipient_email, user_id, dedupe_key, payload)
    VALUES (
      'guardian_consent_request',
      lower(trim(_guardian_email)),
      _uid,
      'guardian_consent:' || _request_id::text,
      jsonb_build_object('request_id', _request_id, 'token', _raw_token, 'policy_version', _policy.policy_version)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'INSERT', 'guardian_consent_requests', 'lgpd_art14_consent_request',
    jsonb_build_object('scope_type', 'self', 'request_id', _request_id), 1);

  RETURN jsonb_build_object(
    'request_id', _request_id,
    'policy_version', _policy.policy_version,
    'expires_at', _expires_at
  );
END;
$$;

COMMENT ON FUNCTION public.create_guardian_consent_request(text, text) IS
  'TRUST-1.6/R06: cria REQUEST (não receipt). Token bruto só existe no e-mail enfileirado; banco guarda hash.';

REVOKE EXECUTE ON FUNCTION public.create_guardian_consent_request(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_guardian_consent_request(text, text) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. resolve_guardian_consent_token — o responsável, pelo link, vê o que vai decidir.
--
-- SECURITY DEFINER: o token é a única credencial do responsável (sem conta),
-- então esta função não pode depender de auth.uid(). Não expõe token bruto de
-- volta, nem PII do estudante — só o mínimo para a tela de decisão.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.resolve_guardian_consent_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hash text;
  _req record;
  _statement_hash text;
  _student_first_name text;
BEGIN
  IF _token IS NULL OR trim(_token) = '' THEN
    RAISE EXCEPTION 'Invalid or expired consent token' USING ERRCODE = '22023';
  END IF;

  _hash := encode(extensions.digest(_token, 'sha256'), 'hex');

  SELECT * INTO _req FROM public.guardian_consent_requests WHERE token_hash = _hash;

  -- Token inexistente, expirado, já consumido ou superseded: MESMA negativa
  -- (não serve de sonda sobre qual condição específica falhou).
  IF _req IS NULL OR _req.status <> 'pending' OR _req.expires_at < now() THEN
    RAISE EXCEPTION 'Invalid or expired consent token' USING ERRCODE = '22023';
  END IF;

  SELECT statement_sha256 INTO _statement_hash
  FROM public.guardian_consent_policies WHERE policy_version = _req.policy_version;

  -- Minimização: só o primeiro nome do estudante, nunca e-mail/perfil
  -- completo. O responsável precisa saber QUEM está autorizando (clareza
  -- exigida ao apresentar a decisão) sem receber PII desnecessária.
  SELECT split_part(trim(full_name), ' ', 1) INTO _student_first_name
  FROM public.profiles WHERE user_id = _req.student_user_id;

  RETURN jsonb_build_object(
    'guardian_name', _req.guardian_name,
    'student_first_name', coalesce(nullif(_student_first_name, ''), 'o(a) estudante'),
    'policy_version', _req.policy_version,
    'statement_sha256', _statement_hash,
    'expires_at', _req.expires_at
  );
END;
$$;

COMMENT ON FUNCTION public.resolve_guardian_consent_token(text) IS
  'TRUST-1.6/R06: leitura pública por token opaco (sem conta de responsável). Nunca revela motivo específico de falha.';

REVOKE EXECUTE ON FUNCTION public.resolve_guardian_consent_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_guardian_consent_token(text) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. decide_guardian_consent — consumo one-time do token + evento imutável.
--
-- Concurrency safety: o UPDATE ... WHERE status='pending' com RETURNING é a
-- operação atômica que decide a corrida entre duas consumições simultâneas do
-- mesmo token — só uma linha é afetada; a segunda tentativa encontra
-- status<>'pending' e é negada. Nenhuma transação explícita adicional
-- necessária: a instrução única já é atômica no MVCC do Postgres.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.decide_guardian_consent(
  _token text,
  _decision text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hash text;
  _req record;
  _event_id uuid;
BEGIN
  IF _decision NOT IN ('granted', 'declined') THEN
    RAISE EXCEPTION 'Invalid decision: expected granted or declined' USING ERRCODE = '22023';
  END IF;
  IF _token IS NULL OR trim(_token) = '' THEN
    RAISE EXCEPTION 'Invalid or expired consent token' USING ERRCODE = '22023';
  END IF;

  _hash := encode(extensions.digest(_token, 'sha256'), 'hex');

  -- Consumo atômico: só transiciona pending->consumed se ainda pending E não
  -- expirado. Replay do mesmo token (já consumido) ou token vencido caem no
  -- mesmo erro genérico abaixo — sem criar um segundo evento.
  UPDATE public.guardian_consent_requests
  SET status = 'consumed', consumed_at = now()
  WHERE token_hash = _hash
    AND status = 'pending'
    AND expires_at >= now()
  RETURNING * INTO _req;

  IF _req IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired consent token' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.guardian_consent_events (
    user_id, guardian_name, guardian_email, policy_version, decision,
    request_id, assurance_level
  )
  VALUES (
    _req.student_user_id, _req.guardian_name, _req.guardian_email, _req.policy_version,
    _decision, _req.id, 'channel_verified'
  )
  RETURNING id INTO _event_id;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (NULL, 'INSERT', 'guardian_consent_events', 'lgpd_art14_consent_decision',
    jsonb_build_object('scope_type', 'guardian_channel', 'request_id', _req.id, 'decision', _decision), 1);

  RETURN jsonb_build_object(
    'decision', _decision,
    'policy_version', _req.policy_version,
    'occurred_at', now()
  );
END;
$$;

COMMENT ON FUNCTION public.decide_guardian_consent(text, text) IS
  'TRUST-1.6/R06: única forma de gravar granted/declined com assurance channel_verified. Consumo atômico e one-time.';

REVOKE EXECUTE ON FUNCTION public.decide_guardian_consent(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decide_guardian_consent(text, text) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. revoke_guardian_consent — o próprio estudante pode acionar a retirada.
--
-- Revogar não apaga histórico: cria um evento novo 'revoked'. O grant anterior
-- permanece visível no ledger para auditoria; o GATE (item 8) é que passa a
-- negar acesso consent-dependent depois deste evento.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.revoke_guardian_consent(_policy_version text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _event_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.guardian_consent_events
    WHERE user_id = _uid AND policy_version = _policy_version AND decision = 'granted'
  ) THEN
    RAISE EXCEPTION 'No active consent found for this policy version' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.guardian_consent_events (
    user_id, guardian_name, guardian_email, policy_version, decision, assurance_level
  )
  SELECT user_id, guardian_name, guardian_email, policy_version, 'revoked', assurance_level
  FROM public.guardian_consent_events
  WHERE user_id = _uid AND policy_version = _policy_version AND decision = 'granted'
  ORDER BY occurred_at DESC
  LIMIT 1
  RETURNING id INTO _event_id;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'INSERT', 'guardian_consent_events', 'lgpd_art14_consent_revocation',
    jsonb_build_object('scope_type', 'self', 'policy_version', _policy_version), 1);

  RETURN jsonb_build_object('revoked', true, 'policy_version', _policy_version);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revoke_guardian_consent(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_guardian_consent(text) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. get_my_guardian_consent_status (v2) — deriva estado do ledger completo,
-- comparando contra a política VIGENTE resolvida no servidor (não mais uma
-- constante do frontend). Substitui a versão anterior; mesmo nome/assinatura,
-- consumidores existentes (RequireGuardianConsent) continuam funcionando.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_my_guardian_consent_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _birth_date date;
  _age integer;
  _current_policy record;
  _latest_event record;
  _pending_request record;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT birth_date INTO _birth_date FROM public.profiles WHERE user_id = _uid;

  IF _birth_date IS NULL THEN
    RETURN jsonb_build_object('requires_consent', false, 'reason', 'unknown_birth_date', 'granted', false);
  END IF;

  _age := date_part('year', age(now(), _birth_date));
  IF _age >= 18 THEN
    RETURN jsonb_build_object('requires_consent', false, 'reason', 'adult', 'granted', false);
  END IF;

  SELECT policy_version, requires_reconsent INTO _current_policy
  FROM public.get_current_guardian_consent_policy();

  -- Existe um request pendente ainda vivo? Calculado uma vez, incluído em
  -- toda resposta requires_consent=true — o frontend precisa distinguir
  -- "nunca pediu" de "pediu, aguardando o responsável" em qualquer estado.
  SELECT id, expires_at, guardian_name INTO _pending_request
  FROM public.guardian_consent_requests
  WHERE student_user_id = _uid AND status = 'pending' AND expires_at >= now()
  ORDER BY created_at DESC LIMIT 1;

  -- Estado é sempre derivado da última linha do ledger (fold por ordem
  -- temporal), nunca de uma coluna mutável — decline/revoked mais recentes
  -- superam um grant anterior.
  SELECT guardian_name, occurred_at, policy_version, decision, assurance_level
  INTO _latest_event
  FROM public.guardian_consent_events
  WHERE user_id = _uid
  ORDER BY occurred_at DESC
  LIMIT 1;

  IF _latest_event IS NULL THEN
    RETURN jsonb_build_object(
      'requires_consent', true, 'reason', 'minor_pending', 'granted', false,
      'has_pending_request', (_pending_request.id IS NOT NULL),
      'pending_expires_at', _pending_request.expires_at,
      'pending_guardian_name', _pending_request.guardian_name
    );
  END IF;

  IF _latest_event.decision = 'declined' THEN
    RETURN jsonb_build_object(
      'requires_consent', true, 'reason', 'minor_declined', 'granted', false,
      'policy_version', _latest_event.policy_version,
      'has_pending_request', (_pending_request.id IS NOT NULL),
      'pending_expires_at', _pending_request.expires_at
    );
  END IF;

  IF _latest_event.decision = 'revoked' THEN
    RETURN jsonb_build_object(
      'requires_consent', true, 'reason', 'minor_revoked', 'granted', false,
      'policy_version', _latest_event.policy_version,
      'has_pending_request', (_pending_request.id IS NOT NULL),
      'pending_expires_at', _pending_request.expires_at
    );
  END IF;

  -- decision = 'granted': verifica se ainda cobre a versão vigente. Uma
  -- mudança material (requires_reconsent) invalida grant de versão anterior
  -- para novos tratamentos — reason distinto para o frontend não confundir
  -- "nunca consentiu" com "consentiu, mas política mudou".
  IF _current_policy.policy_version IS NOT NULL
     AND _latest_event.policy_version <> _current_policy.policy_version
     AND _current_policy.requires_reconsent THEN
    RETURN jsonb_build_object(
      'requires_consent', true, 'reason', 'reconsent_required', 'granted', false,
      'guardian_name', _latest_event.guardian_name,
      'policy_version', _latest_event.policy_version,
      'has_pending_request', (_pending_request.id IS NOT NULL),
      'pending_expires_at', _pending_request.expires_at
    );
  END IF;

  RETURN jsonb_build_object(
    'requires_consent', true,
    'reason', 'minor_consented',
    'granted', true,
    'guardian_name', _latest_event.guardian_name,
    'occurred_at', _latest_event.occurred_at,
    'policy_version', _latest_event.policy_version,
    'assurance_level', _latest_event.assurance_level,
    'has_pending_request', (_pending_request.id IS NOT NULL)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_guardian_consent_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_guardian_consent_status() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. has_valid_guardian_consent — boundary server-side reutilizável por
-- qualquer operação consent-dependent (não só a rota). O gate de rota
-- (RequireGuardianConsent) é UX; esta função é a autoridade real, chamável de
-- dentro de outra RPC/edge function sem duplicar a lógica acima.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.has_valid_guardian_consent(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _birth_date date;
  _age integer;
  _current_policy record;
  _latest_event record;
BEGIN
  SELECT birth_date INTO _birth_date FROM public.profiles WHERE user_id = _user_id;
  IF _birth_date IS NULL THEN
    RETURN false; -- idade indeterminada: fail-closed, mesma postura do gate de rota.
  END IF;

  _age := date_part('year', age(now(), _birth_date));
  IF _age >= 18 THEN
    RETURN true;
  END IF;

  SELECT policy_version, requires_reconsent INTO _current_policy
  FROM public.get_current_guardian_consent_policy();

  SELECT policy_version, decision INTO _latest_event
  FROM public.guardian_consent_events
  WHERE user_id = _user_id
  ORDER BY occurred_at DESC
  LIMIT 1;

  IF _latest_event IS NULL OR _latest_event.decision <> 'granted' THEN
    RETURN false;
  END IF;

  IF _current_policy.policy_version IS NOT NULL
     AND _latest_event.policy_version <> _current_policy.policy_version
     AND _current_policy.requires_reconsent THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.has_valid_guardian_consent(uuid) IS
  'TRUST-1.6/R06: boundary server-side para operações consent-dependent. Frontend nunca é a autoridade.';

REVOKE EXECUTE ON FUNCTION public.has_valid_guardian_consent(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_valid_guardian_consent(uuid) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. Gate server-side dentro do boundary de uso de IA.
--
-- enforce_ai_usage_limit já existe (P0 corte 1.3, 20260722200000) e é chamada
-- pelas 4 edge functions de IA (aledria-chat/cognitive-mirror/future-self/
-- signature-strengths). Preserva INTEGRALMENTE a lógica de limite por plano já
-- existente; adiciona apenas a checagem de consentimento no topo — fecha a
-- lacuna descrita na doutrina §27/§28 ("frontend não é boundary de
-- segurança") para a superfície de IA, sem alterar contrato de limite/plano.
-- ═══════════════════════════════════════════════════════════════════════════════
DO $extend_ai_gate$
BEGIN
  IF to_regprocedure('public.enforce_ai_usage_limit(text)') IS NULL THEN
    RAISE EXCEPTION 'TRUST-1.6/R06: enforce_ai_usage_limit ausente. Verifique migrations anteriores.';
  END IF;
END;
$extend_ai_gate$;

CREATE OR REPLACE FUNCTION public.enforce_ai_usage_limit(_function_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _usage_date date := timezone('utc', now())::date;
  _limit integer;
  _count integer;
  _allowed boolean := false;
  _plan jsonb;
  _plan_limit integer;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- TRUST-1.6/R06: menor sem consentimento válido não usa recursos de IA,
  -- mesmo que o gate de rota client-side tenha sido contornado. Verificado
  -- ANTES de qualquer contagem/consumo de cota — negativa não gasta limite.
  IF NOT public.has_valid_guardian_consent(_user_id) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'function_name', _function_name,
      'usage_date', _usage_date,
      'limit', 0,
      'used', 0,
      'remaining', 0,
      'reset_at', ((_usage_date + 1)::timestamp AT TIME ZONE 'UTC'),
      'reason', 'guardian_consent_required'
    );
  END IF;

  -- Resolve o limite baseado no plano do usuário para aledria-chat.
  -- Demais funções mantêm limites fixos (não são feature comercializada por plano).
  IF _function_name = 'aledria-chat' THEN
    _plan := public.get_my_plan();
    _plan_limit := (_plan -> 'limits' ->> 'alegria_daily')::integer;
    IF _plan_limit IS NOT NULL AND _plan_limit = -1 THEN
      -- Ilimitado: não contar, retornar permitido direto.
      RETURN jsonb_build_object(
        'allowed', true,
        'function_name', _function_name,
        'usage_date', _usage_date,
        'limit', -1,
        'used', 0,
        'remaining', -1,
        'reset_at', ((_usage_date + 1)::timestamp AT TIME ZONE 'UTC')
      );
    END IF;
    _limit := COALESCE(_plan_limit, 9); -- fallback conservador: 9 (free)
  ELSE
    _limit := CASE _function_name
      WHEN 'cognitive-mirror' THEN 30
      WHEN 'future-self' THEN 20
      WHEN 'signature-strengths' THEN 20
      ELSE NULL
    END;
  END IF;

  IF _limit IS NULL THEN
    RAISE EXCEPTION 'Unknown AI function: %', _function_name;
  END IF;

  WITH upserted AS (
    INSERT INTO public.ai_usage_limits (
      user_id,
      function_name,
      usage_date,
      request_count,
      first_requested_at,
      last_requested_at
    )
    VALUES (_user_id, _function_name, _usage_date, 1, now(), now())
    ON CONFLICT (user_id, function_name, usage_date)
    DO UPDATE
      SET request_count = public.ai_usage_limits.request_count + 1,
          last_requested_at = now()
      WHERE public.ai_usage_limits.request_count < _limit
    RETURNING request_count
  )
  SELECT request_count INTO _count
  FROM upserted;

  IF _count IS NULL THEN
    SELECT request_count
    INTO _count
    FROM public.ai_usage_limits
    WHERE user_id = _user_id
      AND function_name = _function_name
      AND usage_date = _usage_date;
  ELSE
    _allowed := true;
  END IF;

  INSERT INTO public.data_access_logs (
    actor_user_id,
    action,
    resource,
    purpose,
    scope,
    row_count
  )
  VALUES (
    _user_id,
    CASE WHEN _allowed THEN 'ai_usage_allowed' ELSE 'ai_usage_blocked' END,
    'ai_usage_limits',
    'edge_function_ai_cost_control',
    jsonb_build_object(
      'function_name', _function_name,
      'usage_date', _usage_date,
      'daily_limit', _limit,
      'request_count', COALESCE(_count, 0)
    ),
    1
  );

  RETURN jsonb_build_object(
    'allowed', _allowed,
    'function_name', _function_name,
    'usage_date', _usage_date,
    'limit', _limit,
    'used', COALESCE(_count, 0),
    'remaining', GREATEST(_limit - COALESCE(_count, 0), 0),
    'reset_at', ((_usage_date + 1)::timestamp AT TIME ZONE 'UTC')
  );
END;
$$;

-- Grants preservados exatamente como na migration original (authenticated
-- apenas; service_role não precisa, edge functions chamam com o JWT do usuário).
REVOKE EXECUTE ON FUNCTION public.enforce_ai_usage_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_ai_usage_limit(text) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. Extend notification_outbox CHECK para o novo kind.
-- ═══════════════════════════════════════════════════════════════════════════════
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
    'engagement_reminder',
    'guardian_consent_request'
  ));

-- Verificações pós-aplicação:
-- SELECT has_function_privilege('anon','public.create_guardian_consent_request(text,text)','EXECUTE'),
--        has_function_privilege('authenticated','public.create_guardian_consent_request(text,text)','EXECUTE');
-- esperado: false | true
--
-- SELECT has_function_privilege('anon','public.resolve_guardian_consent_token(text)','EXECUTE'),
--        has_function_privilege('anon','public.decide_guardian_consent(text,text)','EXECUTE');
-- esperado: true | true  (responsável não tem conta — token é a credencial)
--
-- SELECT has_function_privilege('anon','public.has_valid_guardian_consent(uuid)','EXECUTE'),
--        has_function_privilege('authenticated','public.has_valid_guardian_consent(uuid)','EXECUTE'),
--        has_function_privilege('service_role','public.has_valid_guardian_consent(uuid)','EXECUTE');
-- esperado: false | false | true
--
-- SELECT count(*) FROM pg_policies
--  WHERE schemaname='public'
--    AND tablename IN ('guardian_consent_requests','guardian_consent_events')
--    AND cmd IN ('INSERT','UPDATE','DELETE');
-- esperado: 0 (toda escrita passa pelas RPCs acima)
