
-- Subscription plans table
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price_monthly integer NOT NULL DEFAULT 0,
  price_yearly integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

-- Individual user subscriptions
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled','past_due','trialing','expired')),
  billing_interval text NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly','yearly')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  external_subscription_id text,
  external_customer_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
ON public.user_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
ON public.user_subscriptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
ON public.user_subscriptions FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Organization / school subscriptions
CREATE TABLE public.organization_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  owner_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled','past_due','trialing','expired')),
  billing_interval text NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly','yearly')),
  max_seats integer NOT NULL DEFAULT 30,
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  external_subscription_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own org subscriptions"
ON public.organization_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can manage own org subscriptions"
ON public.organization_subscriptions FOR UPDATE TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Teachers/managers can view org subscriptions"
ON public.organization_subscriptions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'manager'));

-- Organization members
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_subscription_id uuid NOT NULL REFERENCES public.organization_subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  invited_email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','removed')),
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own membership"
ON public.organization_members FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Org owners can manage members"
ON public.organization_members FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_subscriptions os
    WHERE os.id = org_subscription_id AND os.owner_id = auth.uid()
  )
);

-- Function: get user's active plan
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
        'plan_slug', sp.slug,
        'plan_name', sp.name,
        'features', sp.features,
        'limits', sp.limits,
        'source', 'individual',
        'status', us.status,
        'billing_interval', us.billing_interval,
        'current_period_end', us.current_period_end
      )
      FROM user_subscriptions us
      JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.user_id = _user_id AND us.status IN ('active','trialing')
      ORDER BY sp.sort_order DESC
      LIMIT 1
    ),
    (
      SELECT jsonb_build_object(
        'plan_slug', sp.slug,
        'plan_name', sp.name,
        'features', sp.features,
        'limits', sp.limits,
        'source', 'organization',
        'org_name', os.organization_name,
        'status', os.status,
        'billing_interval', os.billing_interval,
        'current_period_end', os.current_period_end
      )
      FROM organization_members om
      JOIN organization_subscriptions os ON os.id = om.org_subscription_id
      JOIN subscription_plans sp ON sp.id = os.plan_id
      WHERE om.user_id = _user_id AND om.status = 'active' AND os.status IN ('active','trialing')
      ORDER BY sp.sort_order DESC
      LIMIT 1
    ),
    jsonb_build_object(
      'plan_slug', 'free',
      'plan_name', 'Gratuito',
      'features', '["modules","quiz_basic","flashcards_basic","alegria_5","dashboard"]'::jsonb,
      'limits', '{"alegria_daily": 5, "quiz_levels": 1}'::jsonb,
      'source', 'default',
      'status', 'active'
    )
  )
$$;

-- Function: check if user has a specific feature
CREATE OR REPLACE FUNCTION public.user_has_feature(_user_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.get_user_plan(_user_id) -> 'features')::jsonb ? _feature
$$;

-- Seed the 3 plans
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly, features, limits, sort_order) VALUES
(
  'Gratuito', 'free', 'Acesso completo ao curso para adolescentes',
  0, 0,
  '["modules","quiz_basic","flashcards_basic","alegria_5","dashboard","breathing","lifewheel","gratitude","memory","emotions"]'::jsonb,
  '{"alegria_daily": 5, "quiz_levels": 1}'::jsonb,
  0
),
(
  'Intermediário', 'intermediate', 'Para quem quer ir além com tutoria avançada',
  2900, 27840,
  '["modules","quiz_advanced","flashcards_advanced","alegria_unlimited","dashboard","simulator","debate","poetry","report_pdf","certificate","breathing","lifewheel","gratitude","memory","mindmap","emotions","challenge21","hypothesis","missions"]'::jsonb,
  '{"alegria_daily": -1, "quiz_levels": 3}'::jsonb,
  1
),
(
  'Avançado', 'advanced', 'Para educadores e organizações',
  5900, 56640,
  '["modules","quiz_advanced","flashcards_advanced","alegria_unlimited","dashboard","simulator","debate","poetry","codesign","evidence","report_pdf","certificate","admin_panel","org_data","export","api","breathing","lifewheel","gratitude","memory","mindmap","emotions","challenge21","hypothesis","missions"]'::jsonb,
  '{"alegria_daily": -1, "quiz_levels": 3, "max_students": 500}'::jsonb,
  2
);
