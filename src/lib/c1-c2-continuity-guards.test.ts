import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLAN_FEATURE_LABELS } from "./plan-features";

const read = (path: string) => readFileSync(path, "utf8");

describe("C1 — Higiene Comercial e Marca (Pricing, Overclaims e P0.0)", () => {
    it("PricingSection usa a tabela canônica de faixas de school-pricing.ts e remove cards divergentes", () => {
        const pricingSection = read("src/components/landing/PricingSection.tsx");
        expect(pricingSection).not.toContain("R$ 990/mês");
        expect(pricingSection).not.toContain("R$ 2.490/mês");
        expect(pricingSection).not.toContain("R$ 7.990/mês");
        expect(pricingSection).not.toContain("Teste Grátis 14 Dias");
        expect(pricingSection).not.toContain("API de integração");
        expect(pricingSection).toContain("1 a 50 alunos");
        expect(pricingSection).toContain("R$ 19/aluno/mês");
        expect(pricingSection).toContain("51 a 200 alunos");
        expect(pricingSection).toContain("R$ 14/aluno/mês");
        expect(pricingSection).toContain("201 a 500 alunos");
        expect(pricingSection).toContain("R$ 10/aluno/mês");
        expect(pricingSection).toContain("501 a 2.000 alunos");
        expect(pricingSection).toContain("R$ 7/aluno/mês");
    });

    it("SchoolCalculator e plan-features removem 'API de integração' e 'Teste grátis 14 dias'", () => {
        const calc = read("src/components/landing/SchoolCalculator.tsx");
        expect(calc).not.toContain("Teste grátis 14 dias");
        expect(calc).not.toContain("integrações via API");
        expect(calc).toContain("Solicitar proposta com desconto institucional");
        expect(PLAN_FEATURE_LABELS.advanced).not.toContain("API de integração");
    });

    it("mp-create-preference bloqueia is_public_ngo autodeclarado no checkout self-service", () => {
        const fn = read("supabase/functions/mp-create-preference/index.ts");
        expect(fn).toContain("if (body.is_public_ngo)");
        expect(fn).toContain("Desconto para escola pública ou ONG (-30%) requer validação institucional");
    });

    it("MoodCheckIn reflete a faixa canônica (R$ 7 a R$ 19) e teto de 75% de desconto", () => {
        const mood = read("src/components/landing/MoodCheckIn.tsx");
        expect(mood).not.toContain("Multiplique o nº de alunos × R$ 29");
        expect(mood).toContain("De R$ 7 a R$ 19 por aluno/mês conforme a faixa");
        expect(mood).toContain("até 75% off");
    });

    it("AuthPage e LandingPage não usam 'Baseado em Yale' ou 'Ciência de Yale' como marca própria", () => {
        const auth = read("src/pages/AuthPage.tsx");
        const landing = read("src/pages/LandingPage.tsx");
        expect(auth).not.toContain("A aula mais popular da história de Yale");
        expect(auth).not.toContain("Baseado em Yale");
        expect(landing).not.toContain("Ciência de Yale");
        expect(landing).not.toContain("Transformamos o curso de bem-estar mais procurado da Universidade de Yale");
        expect(landing).not.toContain("fetchPriority=");
        expect(read("src/pages/EscolasLandingPage.tsx")).not.toContain("fetchPriority=");
    });
});

describe("C2 / C2.R — Vínculo Explícito Assinatura <-> Organização, Renovação, RLS sem Recursão e Triggers de Assentos", () => {
    const migration = read("supabase/migrations/20260925120000_c2_org_subscription_link_and_seats.sql");
    const types = read("src/integrations/supabase/types.ts");
    const runtimeTest = read("src/lib/c2-org-subscription-seats-runtime-contract.test.ts");

    it("adiciona organization_id explícito em organization_subscriptions e alinha types.ts com supabase gen types CLI 2.115.0", () => {
        expect(migration).toContain("ADD COLUMN IF NOT EXISTS organization_id uuid");
        expect(migration).toContain("REFERENCES public.organizations(id) ON DELETE SET NULL");
        expect(types).toContain("organization_subscriptions_organization_id_fkey");
        expect(types).toContain("organization_id: string | null");
        expect(types).toContain("record_engagement_event: {\n        Args: {\n          _event_type: string\n          _metadata?: Json\n          _organization_id: string\n        }");
        expect(types).toContain("submit_nps_response: {\n        Args: {\n          _context?: string\n          _feedback?: string\n          _organization_id?: string\n          _score: number\n        }");
    });

    it("C2.R Defeito #1: instala triggers BEFORE INSERT OR UPDATE em institutional_memberships e institutional_invitations para bloquear bypass de max_seats", () => {
        expect(migration).toContain("CREATE OR REPLACE FUNCTION public.enforce_institutional_membership_seats()");
        expect(migration).toContain("CREATE TRIGGER trg_enforce_institutional_membership_seats");
        expect(migration).toContain("BEFORE INSERT OR UPDATE ON public.institutional_memberships");
        expect(migration).toContain("CREATE OR REPLACE FUNCTION public.enforce_institutional_invitation_seats()");
        expect(migration).toContain("CREATE TRIGGER trg_enforce_institutional_invitation_seats");
        expect(migration).toContain("BEFORE INSERT OR UPDATE ON public.institutional_invitations");
        expect(migration).toContain("Organization subscription is required to allocate student seats");
    });

    it("C2.R Defeitos #2 e #3: ativa/renova assinaturas sem consumir pagamento em vão e nunca vincula contrato por nome de organização", () => {
        expect(migration).toContain("CREATE OR REPLACE FUNCTION public.activate_subscription_from_intent(");
        expect(migration).toContain("CREATE OR REPLACE FUNCTION public.claim_escolar_subscription()");
        expect(migration).toContain("CREATE OR REPLACE FUNCTION public.claim_escolar_with_token(_token uuid)");
        expect(migration).not.toContain("lower(trim(os.organization_name)) = lower(trim(_name))");
        expect(migration).not.toContain("lower(trim(o.name)) = lower(trim(_org_name))");
        expect(migration).toContain("IF _active_org_count = 1 AND _unlinked_sub_count = 1 THEN");
        expect(migration).toContain("IF _active_org_count = 1 AND _owner_sub_count <= 1 THEN");
        expect(migration).toContain("THEN current_period_end + _interval");
    });

    it("C2.R Defeito #4: elimina recursão entre organization_subscriptions e organization_members na policy de SELECT", () => {
        expect(migration).toContain('DROP POLICY IF EXISTS "Members can view assigned org subscriptions" ON public.organization_subscriptions;');
        expect(migration).toContain('CREATE POLICY "Owners and org admins can view org subscriptions"');
        const policySection = migration.slice(
            migration.indexOf('CREATE POLICY "Owners and org admins can view org subscriptions"'),
            migration.indexOf("CREATE OR REPLACE FUNCTION public.create_organization"),
        );
        expect(policySection).not.toContain("organization_members");
    });

    it("suíte de runtime da C2.R usa fixtures compatíveis com o schema (external_reference UUID, plan_slug preenchido, organization_members sem role) e concorrência Promise.allSettled", () => {
        expect(runtimeTest).not.toContain("ext-email-");
        expect(runtimeTest).not.toContain("ext-token-");
        expect(runtimeTest).not.toContain("organization_members (org_subscription_id, user_id, role, status)");
        expect(runtimeTest).toContain("Promise.allSettled");
    });

    it("get_user_plan e get_my_plan verificam current_period_end > now() e institutional_memberships vinculadas", () => {
        expect(migration).toContain("us.current_period_end IS NULL OR us.current_period_end > now()");
        expect(migration).toContain("os.current_period_end IS NULL OR os.current_period_end > now()");
        expect(migration).toContain("FROM public.institutional_memberships im");
        expect(migration).toContain("AND os.organization_id = o.id");
    });

    it("C2.R Bloqueios A, B e D: protege quota de assentos contra convites expirados, trata organizações arquivadas com association_pending e concede GRANT SELECT de menor privilégio", () => {
        // Bloqueio A: matching invite requer convite pendente e não-expirado
        expect(migration).toContain("ii.accepted_at IS NULL\n        AND ii.expires_at > now()\n        AND lower(trim(ii.invited_email)) = _user_email");
        // Bloqueio B: organização inativa/arquivada não trava o entitlement do gestor e retorna association_pending
        expect(migration).toContain("reason', CASE WHEN _target_org_id IS NOT NULL THEN 'associated' ELSE 'association_pending' END");
        // Bloqueio D: leitura direta como authenticated tem GRANT explícito sem vazar escritas
        expect(migration).toContain("GRANT SELECT ON TABLE public.organization_subscriptions TO authenticated;");
        expect(migration).toContain("REVOKE ALL ON TABLE public.organization_subscriptions FROM anon;");
        expect(migration).toContain("REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.organization_subscriptions FROM authenticated;");
    });
});
