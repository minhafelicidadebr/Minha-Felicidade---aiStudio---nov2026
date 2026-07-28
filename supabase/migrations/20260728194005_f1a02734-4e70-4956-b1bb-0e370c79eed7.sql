CREATE TABLE IF NOT EXISTS public.runtime_gates (
  key         text PRIMARY KEY,
  enabled     boolean NOT NULL DEFAULT false,
  description text NOT NULL DEFAULT '',
  updated_by  uuid,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.runtime_gates TO authenticated;
GRANT ALL ON public.runtime_gates TO service_role;

INSERT INTO public.runtime_gates (key, description)
VALUES ('risk_engine', 'Habilita compute_cycle_risk. Exige decisao explicita.')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.touch_runtime_gate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.updated_by IS NULL THEN NEW.updated_by := auth.uid(); END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_runtime_gate ON public.runtime_gates;
CREATE TRIGGER trg_touch_runtime_gate
  BEFORE UPDATE ON public.runtime_gates
  FOR EACH ROW EXECUTE FUNCTION public.touch_runtime_gate();

ALTER TABLE public.runtime_gates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS runtime_gates_read ON public.runtime_gates;
CREATE POLICY runtime_gates_read ON public.runtime_gates
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.gate_enabled(_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT enabled FROM public.runtime_gates WHERE key = _key), false);
$$;

REVOKE EXECUTE ON FUNCTION public.gate_enabled(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gate_enabled(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.compute_cycle_risk(_cycle_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org uuid;
  inserted_rows integer := 0;
BEGIN
  IF NOT public.gate_enabled('risk_engine') THEN
    RAISE EXCEPTION 'risk_engine_disabled: motor de classificacao de risco desabilitado.'
      USING ERRCODE = 'P0001';
  END IF;
  SELECT organization_id INTO org FROM public.cycles WHERE id = _cycle_id;
  IF org IS NULL THEN RAISE EXCEPTION 'cycle_not_found'; END IF;
  IF NOT public.has_any_role(auth.uid(), org, ARRAY['owner','admin','manager']::app_role[]) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.risk_scores WHERE cycle_id = _cycle_id;
  INSERT INTO public.risk_scores
    (organization_id, cycle_id, unit_id, dimension, mean_score, probability, severity, risk_level, n_responses)
  SELECT
    org, _cycle_id, r.unit_id, kv.key,
    ROUND(AVG((kv.value)::numeric), 2),
    LEAST(5, GREATEST(1, 6 - WIDTH_BUCKET(AVG((kv.value)::numeric), 0, 100, 5))),
    CASE
      WHEN kv.key ILIKE '%emocional%' OR kv.key ILIKE '%conflito%' OR kv.key ILIKE '%assedio%' THEN 4
      ELSE 3
    END,
    LEAST(5, GREATEST(1, 6 - WIDTH_BUCKET(AVG((kv.value)::numeric), 0, 100, 5)))
      * CASE
          WHEN kv.key ILIKE '%emocional%' OR kv.key ILIKE '%conflito%' OR kv.key ILIKE '%assedio%' THEN 4
          ELSE 3
        END,
    COUNT(*)::int
  FROM public.responses r
  CROSS JOIN LATERAL jsonb_each_text(r.answers) AS kv(key, value)
  WHERE r.cycle_id = _cycle_id
    AND kv.value ~ '^[0-9]+(\.[0-9]+)?$'
  GROUP BY r.unit_id, kv.key
  HAVING COUNT(*) >= 5;
  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  UPDATE public.cycles SET status = 'closed', updated_at = now() WHERE id = _cycle_id;
  RETURN inserted_rows;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.compute_cycle_risk(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_cycle_risk(uuid) TO authenticated;

UPDATE public.runtime_gates SET enabled = true WHERE key = 'risk_engine';