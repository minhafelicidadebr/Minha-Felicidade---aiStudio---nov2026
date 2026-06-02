ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS estimated_students integer,
  ADD COLUMN IF NOT EXISTS schools_count integer,
  ADD COLUMN IF NOT EXISTS calculated_price_cents integer,
  ADD COLUMN IF NOT EXISTS billing_interval text,
  ADD COLUMN IF NOT EXISTS is_public_ngo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS preferred_demo_at timestamptz;