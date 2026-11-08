-- Contas legadas (criadas antes da captura de data de nascimento) têm
-- profiles.birth_date = NULL. O gate de consentimento (fail-closed) as bloqueia
-- porque não consegue estabelecer se são menores ou adultas. Esta RPC dá um
-- caminho self-service de PREENCHIMENTO ÚNICO: a própria pessoa autenticada
-- informa a data uma vez, e só então o gate reavalia (adulto → libera; menor →
-- consentimento do responsável). Não reabre o fail-open: enquanto a data for
-- nula, nada é liberado; e a data não pode ser reescrita para burlar o gate.

CREATE OR REPLACE FUNCTION public.set_my_birth_date(_birth_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _current date;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  -- Validação de plausibilidade no servidor (defesa em profundidade; o cliente
  -- também valida). Data precisa ser passada e a idade < 120 anos.
  IF _birth_date IS NULL
     OR _birth_date >= current_date
     OR date_part('year', age(now(), _birth_date)) >= 120 THEN
    RAISE EXCEPTION 'Invalid birth_date' USING ERRCODE = '22023';
  END IF;

  SELECT birth_date INTO _current FROM public.profiles WHERE user_id = _uid;

  -- Preenchimento único: só grava quando ainda não há data. Não permite
  -- reescrever uma data existente (evita burlar o gate). Alteração de data já
  -- preenchida fica fora deste fluxo.
  IF _current IS NOT NULL THEN
    RAISE EXCEPTION 'birth_date already set' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles SET birth_date = _birth_date WHERE user_id = _uid;

  INSERT INTO public.data_access_logs (actor_user_id, action, resource, purpose, scope, row_count)
  VALUES (_uid, 'UPDATE', 'profiles.birth_date', 'lgpd_art14_age_determination',
          jsonb_build_object('scope_type', 'self'), 1);

  RETURN jsonb_build_object('birth_date', _birth_date);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_my_birth_date(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_birth_date(date) TO authenticated;

-- VERIFICAÇÃO (rodar após aplicar):
-- SELECT has_function_privilege('anon',          'public.set_my_birth_date(date)', 'EXECUTE'); -- false
-- SELECT has_function_privilege('authenticated', 'public.set_my_birth_date(date)', 'EXECUTE'); -- true
