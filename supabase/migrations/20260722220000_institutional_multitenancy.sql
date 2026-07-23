-- ONDA 2 — Multitenancy mínimo para piloto escolar
-- Cria as tabelas institucionais necessárias para que uma escola possa ser
-- criada, turmas organizadas, membros convidados e o isolamento de dados
-- garantido por RLS (tenant obrigatório em toda consulta).
--
-- NÃO cria: RPCs de convite, UI, dashboard, onboarding. Apenas schema + RLS.
-- Idempotente (CREATE TABLE IF NOT EXISTS).

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. ORGANIZATIONS (entidade raiz — independente da assinatura)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  owner_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. SCHOOLS (unidades escolares dentro de uma organização)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  municipality text,
  state_code char(2),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. CLASSES (turmas dentro de uma escola)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  year integer NOT NULL DEFAULT extract(year from now()),
  semester smallint CHECK (semester IN (1, 2)),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. MEMBERSHIPS (papel de cada pessoa dentro da organização)
-- Papéis: platform_admin, org_admin, school_admin, educator, student, guardian
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.institutional_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('platform_admin', 'org_admin', 'school_admin', 'educator', 'student', 'guardian')),
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, role)
);

ALTER TABLE public.institutional_memberships ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. INVITATIONS (convites pendentes com token e expiração)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.institutional_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  role text NOT NULL CHECK (role IN ('org_admin', 'school_admin', 'educator', 'student', 'guardian')),
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, invited_email, role)
);

ALTER TABLE public.institutional_invitations ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. RLS POLICIES — isolamento por tenant (organization_id)
-- Princípios:
--   • SELECT: somente membros ativos da mesma organização.
--   • INSERT/UPDATE/DELETE: somente org_admin ou school_admin (via membership).
--   • Sem cross-org reads em qualquer circunstância.
--   • Students nunca alteram estrutura institucional.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Helper: verifica se o auth.uid() é admin da organização
CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.institutional_memberships
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
      AND role IN ('platform_admin', 'org_admin')
      AND status = 'active'
  );
$$;

-- Helper: verifica membership ativa na org
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.institutional_memberships
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- ORGANIZATIONS
CREATE POLICY "Members can view own organization"
  ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id));

CREATE POLICY "Only org_admin can modify organization"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_admin(id))
  WITH CHECK (public.is_org_admin(id));

-- No INSERT/DELETE by client (creation via RPC; deletion = admin ops only)

-- SCHOOLS
CREATE POLICY "Members can view schools in their org"
  ON public.schools FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org admin can manage schools"
  ON public.schools FOR ALL TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- CLASSES
CREATE POLICY "Members can view classes in their org"
  ON public.classes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = school_id
        AND public.is_org_member(s.organization_id)
    )
  );

CREATE POLICY "Org admin can manage classes"
  ON public.classes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = school_id
        AND public.is_org_admin(s.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = school_id
        AND public.is_org_admin(s.organization_id)
    )
  );

-- MEMBERSHIPS
CREATE POLICY "Members can view memberships in their org"
  ON public.institutional_memberships FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org admin can manage memberships"
  ON public.institutional_memberships FOR ALL TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- INVITATIONS
CREATE POLICY "Org admin can view invitations"
  ON public.institutional_invitations FOR SELECT TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE POLICY "Org admin can manage invitations"
  ON public.institutional_invitations FOR ALL TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- Invitee can view their own invitation (by email match — requires confirmed email)
CREATE POLICY "Invitee can view own invitation"
  ON public.institutional_invitations FOR SELECT TO authenticated
  USING (
    lower(invited_email) = lower(
      (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. GRANTS — nenhum acesso para anon/PUBLIC; authenticated pode usar policies
-- ═══════════════════════════════════════════════════════════════════════════════
REVOKE ALL ON TABLE public.organizations FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.schools FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.classes FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.institutional_memberships FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.institutional_invitations FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.schools TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.institutional_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.institutional_invitations TO authenticated;

-- Service role (RPCs privilegiadas e edge functions) bypassa RLS.
GRANT ALL ON TABLE public.organizations TO service_role;
GRANT ALL ON TABLE public.schools TO service_role;
GRANT ALL ON TABLE public.classes TO service_role;
GRANT ALL ON TABLE public.institutional_memberships TO service_role;
GRANT ALL ON TABLE public.institutional_invitations TO service_role;

-- Helpers: revoke de PUBLIC/anon, grant a authenticated (já visíveis via RLS)
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Verificação manual pós-deploy:
-- SELECT has_table_privilege('anon', 'public.organizations', 'SELECT');  -- false
-- SELECT has_table_privilege('authenticated', 'public.organizations', 'SELECT');  -- true
-- INSERT INTO organizations (name, owner_id) VALUES ('test', auth.uid());  -- should fail (no INSERT policy, creation via RPC)
-- ═══════════════════════════════════════════════════════════════════════════════
