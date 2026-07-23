-- P0 corte 1.4 — Proteção da data de nascimento (LGPD art. 14)
-- A policy "Users can update own profile" permite UPDATE em qualquer coluna.
-- Um adolescente poderia contornar set_my_birth_date (single-fill) e alterar
-- birth_date diretamente via PostgREST, escapando do gate de consentimento.
--
-- Correção: trigger BEFORE UPDATE que impede qualquer alteração de birth_date
-- uma vez que ela esteja preenchida. Funciona como defesa em profundidade —
-- mesmo service_role (que bypassa RLS) não consegue alterar acidentalmente.
-- A ÚNICA forma de corrigir seria um UPDATE direto na coluna com o trigger
-- temporariamente desabilitado (admin operacional documentado no runbook).
--
-- Idempotente: DROP IF EXISTS + CREATE.

CREATE OR REPLACE FUNCTION public.protect_birth_date_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se a birth_date anterior não era NULL e o novo valor é diferente, bloquear.
  IF OLD.birth_date IS NOT NULL AND NEW.birth_date IS DISTINCT FROM OLD.birth_date THEN
    RAISE EXCEPTION 'birth_date is immutable once set (LGPD art. 14 protection)'
      USING ERRCODE = '23514'; -- check_violation
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_birth_date ON public.profiles;

CREATE TRIGGER trg_protect_birth_date
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_birth_date_immutable();

-- Verificação manual pós-deploy:
-- 1. UPDATE profiles SET birth_date = '2000-01-01' WHERE user_id = '<uid_com_birth_date>';
--    → Deve retornar ERROR: birth_date is immutable once set
-- 2. UPDATE profiles SET full_name = 'Novo Nome' WHERE user_id = '<uid>';
--    → Deve funcionar normalmente (não bloqueia outras colunas)
-- 3. UPDATE profiles SET birth_date = '2000-01-01' WHERE user_id = '<uid_sem_birth_date>';
--    → Deve funcionar (preenchimento inicial continua permitido)
