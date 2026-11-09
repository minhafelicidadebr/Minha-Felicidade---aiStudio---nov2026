// ONDA C2 / C2.R — Contratos de runtime contra PostgreSQL real:
// 1. Associação explícita 1:1 entre organization_subscriptions e organizations (create_organization, claim_escolar_*, activate_subscription_from_intent)
// 2. Backfill unívoco vs. registros ambíguos (zero heurística)
// 3. Usuário em duas redes, somente uma pagante (get_my_plan determinístico)
// 4. Membership revogada, organização suspensa e assinatura expirada
// 5. Compatibilidade legada (organization_members) sem liberar outro tenant
// 6. Última vaga disputada por convites e aceites concorrentes reais (Promise.all + FOR UPDATE)
// 7. Duplicação, expiração de convites e idempotência com notification_outbox (R33/R34)
// 8. Regressão Defeito #1 (C2.R): bloqueio de bypass por INSERT/UPDATE direto em institutional_memberships e institutional_invitations
// 9. Regressão Defeito #2 (C2.R): comprador com assinatura expirada ou ativa renovando via claim/webhook nunca tem pagamento consumido sem ativação nem redução de vigência
// 10. Regressão Defeito #3 (C2.R): proprietário com duas organizações de mesmo nome nunca tem assinatura vinculada automaticamente por nome
// 11. Regressão Defeito #4 (C2.R): ausência de recursão infinita entre policies de organization_subscriptions e organization_members

import { execFile, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const CONTAINER = "supabase_db_ctjwyybmlwhynherikqy";
const DB_TIMEOUT = 120_000;

function sql(statement: string): string {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      CONTAINER,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-q",
      "-t",
      "-A",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      statement,
    ],
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
}

async function sqlAsync(statement: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "docker",
    [
      "exec",
      "-i",
      CONTAINER,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-q",
      "-t",
      "-A",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      statement,
    ],
    { encoding: "utf8" },
  );
  return stdout.trim();
}

function localDbAvailable(): boolean {
  try {
    return Number(sql("SELECT count(*) FROM supabase_migrations.schema_migrations;")) > 0;
  } catch {
    return false;
  }
}

function asAuthenticatedCommit(uid: string, statement: string): string {
  return sql(`BEGIN;
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claims = '{"sub":"${uid}","role":"authenticated"}';
    ${statement};
    COMMIT;`);
}

function asServiceRoleCommit(statement: string): string {
  return sql(`BEGIN;
    SET LOCAL ROLE service_role;
    ${statement};
    COMMIT;`);
}

function expectAuthenticatedFailure(uid: string, statement: string, expectedMessage: RegExp): void {
  let failed = false;
  try {
    asAuthenticatedCommit(uid, statement);
  } catch (err) {
    failed = true;
    const msg = err instanceof Error ? `${err.message}\n${(err as { stderr?: string }).stderr ?? ""}` : String(err);
    expect(msg).toMatch(expectedMessage);
  }
  expect(failed).toBe(true);
}

const available = localDbAvailable();
const rawSuite = available ? describe : describe.skip;
const suite = (name: string, fn: () => void) => rawSuite(name, { timeout: DB_TIMEOUT }, fn);
if (!available) console.warn("[C2_ORG_SUBSCRIPTION_SEATS_RUNTIME_CONTRACT] PULADO: Postgres local indisponível.");

function createAuthUser(uid: string, email: string, confirmed = true): void {
  sql(`
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at
    )
    VALUES (
      '${uid}',
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      '${email}',
      ${confirmed ? "now()" : "NULL"},
      now(),
      now()
    );
  `);
}

let advancedPlanId = "";

beforeAll(() => {
  if (!available) return;
  advancedPlanId = sql("SELECT id::text FROM public.subscription_plans WHERE slug = 'advanced' AND is_active = true LIMIT 1;");
  expect(advancedPlanId).toMatch(/^[0-9a-f-]{36}$/i);
});

suite("ONDA C2 / C2.R — Vínculo assinatura<->organização, entitlements e assentos transacionais", () => {
  it("1. Associação correta 1:1: create_organization, claim_escolar_subscription e claim_escolar_with_token vinculam organization_id", () => {
    const ownerCreateFirst = randomUUID();
    const ownerClaimEmail = randomUUID();
    const ownerClaimToken = randomUUID();
    const claimToken = randomUUID();
    const extEmailRef = randomUUID();
    const extTokenRef = randomUUID();

    createAuthUser(ownerCreateFirst, `c2-create-${ownerCreateFirst}@example.invalid`);
    createAuthUser(ownerClaimEmail, `c2-claim-email-${ownerClaimEmail}@example.invalid`);
    createAuthUser(ownerClaimToken, `c2-claim-token-${ownerClaimToken}@example.invalid`);

    // Caso 1A: Assinatura única criada antes de create_organization -> create_organization vincula organization_id
    const preSubId = randomUUID();
    sql(`
      INSERT INTO public.organization_subscriptions (
        id, organization_name, organization_id, plan_id, owner_id, status, billing_interval, max_seats, current_period_end
      )
      VALUES (
        '${preSubId}', 'Rede Alfa C2', NULL, '${advancedPlanId}', '${ownerCreateFirst}', 'active', 'monthly', 45, now() + interval '30 days'
      );
    `);

    const createdOrg = JSON.parse(
      asAuthenticatedCommit(ownerCreateFirst, `SELECT public.create_organization('Rede Alfa C2', 'rede-alfa-${ownerCreateFirst}')::text`),
    ) as { organization_id: string; created: boolean };
    expect(createdOrg.created).toBe(true);

    const linkedOrgId1A = sql(`SELECT organization_id::text FROM public.organization_subscriptions WHERE id = '${preSubId}';`);
    expect(linkedOrgId1A).toBe(createdOrg.organization_id);

    // Caso 1B: Organização única já criada -> claim_escolar_subscription por e-mail preenche organization_id e max_seats
    const orgClaimEmail = JSON.parse(
      asAuthenticatedCommit(ownerClaimEmail, `SELECT public.create_organization('Escola Beta C2', 'escola-beta-${ownerClaimEmail}')::text`),
    ) as { organization_id: string };

    sql(`
      INSERT INTO public.purchase_intents (
        kind, plan_slug, status, contact_email, contact_name, billing_interval, seats_students, amount_brl_cents, external_reference
      )
      VALUES (
        'escolar', 'advanced', 'approved', 'c2-claim-email-${ownerClaimEmail}@example.invalid', 'Escola Beta C2', 'yearly', 120, 1344000, '${extEmailRef}'
      );
    `);

    const claimEmailRes = JSON.parse(
      asAuthenticatedCommit(ownerClaimEmail, `SELECT public.claim_escolar_subscription()::text`),
    ) as { ok: boolean; reason: string; organization_id: string };
    expect(claimEmailRes.ok).toBe(true);
    expect(claimEmailRes.organization_id).toBe(orgClaimEmail.organization_id);

    const subEmailRow = JSON.parse(
      sql(`
        SELECT jsonb_build_object('organization_id', organization_id, 'max_seats', max_seats)::text
        FROM public.organization_subscriptions
        WHERE owner_id = '${ownerClaimEmail}';
      `),
    ) as { organization_id: string; max_seats: number };
    expect(subEmailRow.organization_id).toBe(orgClaimEmail.organization_id);
    expect(subEmailRow.max_seats).toBe(120);

    // Caso 1C: Organização única ativa -> claim_escolar_with_token vincula organization_id por cardinalidade 1:1
    const orgClaimToken = JSON.parse(
      asAuthenticatedCommit(ownerClaimToken, `SELECT public.create_organization('Escola Gama C2', 'escola-gama-${ownerClaimToken}')::text`),
    ) as { organization_id: string };

    sql(`
      INSERT INTO public.purchase_intents (
        kind, plan_slug, status, contact_email, contact_name, billing_interval, seats_students, amount_brl_cents, external_reference, claim_token
      )
      VALUES (
        'escolar', 'advanced', 'approved', 'outro-${ownerClaimToken}@example.invalid', 'Nome Fantasia Diferente', 'monthly', 75, 105000, '${extTokenRef}', '${claimToken}'
      );
    `);

    const claimTokenRes = JSON.parse(
      asAuthenticatedCommit(ownerClaimToken, `SELECT public.claim_escolar_with_token('${claimToken}')::text`),
    ) as { ok: boolean; organization_id: string };
    expect(claimTokenRes.ok).toBe(true);
    expect(claimTokenRes.organization_id).toBe(orgClaimToken.organization_id);
  });

  it("2. Backfill unívoco e registros ambíguos: vincula apenas 1:1 e preserva NULL em ambiguidade", () => {
    const ownerUnambiguous = randomUUID();
    const ownerTwoOrgs = randomUUID();
    const ownerTwoSubs = randomUUID();

    createAuthUser(ownerUnambiguous, `c2-unamb-${ownerUnambiguous}@example.invalid`);
    createAuthUser(ownerTwoOrgs, `c2-two-orgs-${ownerTwoOrgs}@example.invalid`);
    createAuthUser(ownerTwoSubs, `c2-two-subs-${ownerTwoSubs}@example.invalid`);

    const orgUnamb = randomUUID();
    const subUnamb = randomUUID();
    const orgAmb1 = randomUUID();
    const orgAmb2 = randomUUID();
    const subAmbOrgs = randomUUID();
    const orgSingleForTwoSubs = randomUUID();
    const subAmb1 = randomUUID();
    const subAmb2 = randomUUID();

    sql(`
      INSERT INTO public.organizations (id, name, slug, owner_id, status) VALUES
        ('${orgUnamb}', 'Org Unívoca', 'unamb-${orgUnamb}', '${ownerUnambiguous}', 'active'),
        ('${orgAmb1}', 'Org Ambígua 1', 'amb1-${orgAmb1}', '${ownerTwoOrgs}', 'active'),
        ('${orgAmb2}', 'Org Ambígua 2', 'amb2-${orgAmb2}', '${ownerTwoOrgs}', 'active'),
        ('${orgSingleForTwoSubs}', 'Org Duas Subs', 'twosubs-${orgSingleForTwoSubs}', '${ownerTwoSubs}', 'active');

      INSERT INTO public.organization_subscriptions (
        id, organization_name, organization_id, plan_id, owner_id, status, billing_interval, max_seats, current_period_end
      ) VALUES
        ('${subUnamb}', 'Sub Unívoca', NULL, '${advancedPlanId}', '${ownerUnambiguous}', 'active', 'monthly', 30, now() + interval '30 days'),
        ('${subAmbOrgs}', 'Org Ambígua 1', NULL, '${advancedPlanId}', '${ownerTwoOrgs}', 'active', 'monthly', 30, now() + interval '30 days'),
        ('${subAmb1}', 'Sub Amb 1', NULL, '${advancedPlanId}', '${ownerTwoSubs}', 'active', 'monthly', 30, now() + interval '30 days'),
        ('${subAmb2}', 'Sub Amb 2', NULL, '${advancedPlanId}', '${ownerTwoSubs}', 'active', 'monthly', 30, now() + interval '30 days');
    `);

    // Executa exatamente a query de backfill da migration C2
    sql(`
      WITH unambiguous_owners AS (
        SELECT o.owner_id, (array_agg(o.id))[1] AS org_id
        FROM public.organizations o
        WHERE o.status = 'active'
        GROUP BY o.owner_id
        HAVING count(*) = 1
      ),
      unambiguous_subs AS (
        SELECT os.owner_id, (array_agg(os.id))[1] AS sub_id
        FROM public.organization_subscriptions os
        WHERE os.organization_id IS NULL
        GROUP BY os.owner_id
        HAVING count(*) = 1
      )
      UPDATE public.organization_subscriptions os
      SET organization_id = uo.org_id,
          updated_at = now()
      FROM unambiguous_owners uo
      JOIN unambiguous_subs us ON us.owner_id = uo.owner_id
      WHERE os.id = us.sub_id
        AND os.organization_id IS NULL;
    `);

    expect(sql(`SELECT COALESCE(organization_id::text, 'NULL') FROM public.organization_subscriptions WHERE id = '${subUnamb}';`)).toBe(orgUnamb);
    expect(sql(`SELECT COALESCE(organization_id::text, 'NULL') FROM public.organization_subscriptions WHERE id = '${subAmbOrgs}';`)).toBe("NULL");
    expect(sql(`SELECT COALESCE(organization_id::text, 'NULL') FROM public.organization_subscriptions WHERE id = '${subAmb1}';`)).toBe("NULL");
    expect(sql(`SELECT COALESCE(organization_id::text, 'NULL') FROM public.organization_subscriptions WHERE id = '${subAmb2}';`)).toBe("NULL");
  });

  it("3. Usuário em duas redes, somente uma pagante: get_my_plan resolve deterministicamente o plano pago", () => {
    const adminFree = randomUUID();
    const adminPaid = randomUUID();
    const multiNetworkMember = randomUUID();
    const orgFree = randomUUID();
    const orgPaid = randomUUID();
    const subPaid = randomUUID();

    createAuthUser(adminFree, `c2-adm-free-${adminFree}@example.invalid`);
    createAuthUser(adminPaid, `c2-adm-paid-${adminPaid}@example.invalid`);
    createAuthUser(multiNetworkMember, `c2-multi-${multiNetworkMember}@example.invalid`);

    sql(`
      INSERT INTO public.organizations (id, name, slug, owner_id, status) VALUES
        ('${orgFree}', 'Rede Sem Plano', 'free-${orgFree}', '${adminFree}', 'active'),
        ('${orgPaid}', 'Rede Pagante', 'paid-${orgPaid}', '${adminPaid}', 'active');

      INSERT INTO public.organization_subscriptions (
        id, organization_name, organization_id, plan_id, owner_id, status, billing_interval, max_seats, current_period_end
      ) VALUES (
        '${subPaid}', 'Rede Pagante', '${orgPaid}', '${advancedPlanId}', '${adminPaid}', 'active', 'yearly', 100, now() + interval '90 days'
      );

      INSERT INTO public.institutional_memberships (organization_id, user_id, role, status) VALUES
        ('${orgFree}', '${multiNetworkMember}', 'educator', 'active'),
        ('${orgPaid}', '${multiNetworkMember}', 'educator', 'active');
    `);

    const plan = JSON.parse(
      asAuthenticatedCommit(multiNetworkMember, `SELECT public.get_my_plan()::text`),
    ) as { plan_slug: string; source: string; organization_id: string; org_name: string };

    expect(plan.plan_slug).toBe("advanced");
    expect(plan.source).toBe("organization");
    expect(plan.organization_id).toBe(orgPaid);
    expect(plan.org_name).toBe("Rede Pagante");
  });

  it("4. Membership revogada, organização suspensa e assinatura expirada removem entitlement e bloqueiam convites", () => {
    const admin = randomUUID();
    const student = randomUUID();
    const orgId = randomUUID();
    const subId = randomUUID();

    createAuthUser(admin, `c2-adm-rev-${admin}@example.invalid`);
    createAuthUser(student, `c2-stu-rev-${student}@example.invalid`);

    sql(`
      INSERT INTO public.organizations (id, name, slug, owner_id, status)
      VALUES ('${orgId}', 'Escola Estado C2', 'estado-${orgId}', '${admin}', 'active');

      INSERT INTO public.organization_subscriptions (
        id, organization_name, organization_id, plan_id, owner_id, status, billing_interval, max_seats, current_period_end
      )
      VALUES (
        '${subId}', 'Escola Estado C2', '${orgId}', '${advancedPlanId}', '${admin}', 'active', 'monthly', 50, now() + interval '15 days'
      );

      INSERT INTO public.institutional_memberships (organization_id, user_id, role, status) VALUES
        ('${orgId}', '${admin}', 'org_admin', 'active'),
        ('${orgId}', '${student}', 'student', 'active');

      -- Mesmo que exista linha legada em organization_members (sem coluna role), a revogação institucional deve prevalecer
      INSERT INTO public.organization_members (org_subscription_id, user_id, status)
      VALUES ('${subId}', '${student}', 'active');
    `);

    // Inicialmente ativo -> advanced
    const initialPlan = JSON.parse(asAuthenticatedCommit(student, `SELECT public.get_my_plan()::text`)) as { plan_slug: string };
    expect(initialPlan.plan_slug).toBe("advanced");

    // 4A: Membership suspensa -> cai para free mesmo com organization_members legado
    sql(`UPDATE public.institutional_memberships SET status = 'suspended' WHERE organization_id = '${orgId}' AND user_id = '${student}';`);
    const revokedPlan = JSON.parse(asAuthenticatedCommit(student, `SELECT public.get_my_plan()::text`)) as { plan_slug: string };
    expect(revokedPlan.plan_slug).toBe("free");

    // Restaura membership do estudante
    sql(`UPDATE public.institutional_memberships SET status = 'active' WHERE organization_id = '${orgId}' AND user_id = '${student}';`);

    // 4B: Organização suspensa -> cai para free e bloqueia invite_member
    sql(`UPDATE public.organizations SET status = 'suspended' WHERE id = '${orgId}';`);
    const suspendedOrgPlan = JSON.parse(asAuthenticatedCommit(student, `SELECT public.get_my_plan()::text`)) as { plan_slug: string };
    expect(suspendedOrgPlan.plan_slug).toBe("free");

    expectAuthenticatedFailure(
      admin,
      `SELECT public.invite_member('${orgId}', 'novo-${orgId}@example.invalid', 'student', NULL, NULL)::text`,
      /Only org_admin can invite members|Organization not available/i,
    );

    // Restaura organização e expira assinatura
    sql(`
      UPDATE public.organizations SET status = 'active' WHERE id = '${orgId}';
      UPDATE public.organization_subscriptions SET current_period_end = now() - interval '1 hour' WHERE id = '${subId}';
    `);

    // 4C: Assinatura expirada -> cai para free e bloqueia invite_member
    const expiredSubPlan = JSON.parse(asAuthenticatedCommit(student, `SELECT public.get_my_plan()::text`)) as { plan_slug: string };
    expect(expiredSubPlan.plan_slug).toBe("free");

    expectAuthenticatedFailure(
      admin,
      `SELECT public.invite_member('${orgId}', 'expirado-${orgId}@example.invalid', 'student', NULL, NULL)::text`,
      /Organization subscription is inactive or expired/i,
    );
  });

  it("5. Compatibilidade legada sem liberar outro tenant: organization_members mantém entitlement sem vazar RLS entre organizações", () => {
    const owner = randomUUID();
    const legacyMember = randomUUID();
    const otherOrgMember = randomUUID();
    const orgPaid = randomUUID();
    const orgUnpaidSameOwner = randomUUID();
    const subPaid = randomUUID();

    createAuthUser(owner, `c2-owner-iso-${owner}@example.invalid`);
    createAuthUser(legacyMember, `c2-legacy-${legacyMember}@example.invalid`);
    createAuthUser(otherOrgMember, `c2-other-${otherOrgMember}@example.invalid`);

    sql(`
      INSERT INTO public.organizations (id, name, slug, owner_id, status) VALUES
        ('${orgPaid}', 'Org Paga Isolada', 'paga-iso-${orgPaid}', '${owner}', 'active'),
        ('${orgUnpaidSameOwner}', 'Org Sem Contrato Mesmo Owner', 'unpaid-iso-${orgUnpaidSameOwner}', '${owner}', 'active');

      INSERT INTO public.organization_subscriptions (
        id, organization_name, organization_id, plan_id, owner_id, status, billing_interval, max_seats, current_period_end
      ) VALUES (
        '${subPaid}', 'Org Paga Isolada', '${orgPaid}', '${advancedPlanId}', '${owner}', 'active', 'monthly', 30, now() + interval '30 days'
      );

      INSERT INTO public.organization_members (org_subscription_id, user_id, status)
      VALUES ('${subPaid}', '${legacyMember}', 'active');

      INSERT INTO public.institutional_memberships (organization_id, user_id, role, status) VALUES
        ('${orgPaid}', '${owner}', 'org_admin', 'active'),
        ('${orgUnpaidSameOwner}', '${owner}', 'org_admin', 'active'),
        ('${orgUnpaidSameOwner}', '${otherOrgMember}', 'educator', 'active');
    `);

    // Membro legado recebe o plano da assinatura à qual pertence em organization_members
    const legacyPlan = JSON.parse(asAuthenticatedCommit(legacyMember, `SELECT public.get_my_plan()::text`)) as { plan_slug: string };
    expect(legacyPlan.plan_slug).toBe("advanced");

    // Porém o membro legado NÃO passa a ser membro institucional de orgUnpaidSameOwner nem de orgPaid
    const canSeeOrgs = Number(
      asAuthenticatedCommit(legacyMember, `SELECT count(*) FROM public.organizations WHERE id IN ('${orgPaid}', '${orgUnpaidSameOwner}')`),
    );
    expect(canSeeOrgs).toBe(0);

    // Membro da segunda organização (sem assinatura) do mesmo owner NÃO herda a assinatura da primeira organização
    const otherOrgPlan = JSON.parse(asAuthenticatedCommit(otherOrgMember, `SELECT public.get_my_plan()::text`)) as { plan_slug: string };
    expect(otherOrgPlan.plan_slug).toBe("free");

    const canSeePaidSub = Number(
      asAuthenticatedCommit(otherOrgMember, `SELECT count(*) FROM public.organization_subscriptions WHERE id = '${subPaid}'`),
    );
    expect(canSeePaidSub).toBe(0);
  });

  it("6. Última vaga disputada por convites e aceites em concorrência real (Promise.all + FOR UPDATE)", async () => {
    const admin = randomUUID();
    const student1 = randomUUID();
    const student2 = randomUUID();
    const student3 = randomUUID();
    const educator = randomUUID();
    const orgId = randomUUID();
    const subId = randomUUID();

    const email1 = `c2-s1-${orgId}@example.invalid`;
    const email2 = `c2-s2-${orgId}@example.invalid`;
    const email3 = `c2-s3-${orgId}@example.invalid`;
    const emailEdu = `c2-edu-${orgId}@example.invalid`;

    createAuthUser(admin, `c2-adm-seat-${admin}@example.invalid`);
    createAuthUser(student1, email1);
    createAuthUser(student2, email2);
    createAuthUser(student3, email3);
    createAuthUser(educator, emailEdu);

    sql(`
      INSERT INTO public.organizations (id, name, slug, owner_id, status)
      VALUES ('${orgId}', 'Escola Limite Concorrente', 'seats-${orgId}', '${admin}', 'active');

      INSERT INTO public.institutional_memberships (organization_id, user_id, role, status)
      VALUES ('${orgId}', '${admin}', 'org_admin', 'active');

      INSERT INTO public.organization_subscriptions (
        id, organization_name, organization_id, plan_id, owner_id, status, billing_interval, max_seats, current_period_end
      )
      VALUES (
        '${subId}', 'Escola Limite Concorrente', '${orgId}', '${advancedPlanId}', '${admin}', 'active', 'monthly', 2, now() + interval '30 days'
      );
    `);

    // 1º convite de aluno (1/2 reservado) -> OK e aceito (1/2 ativo)
    const inv1 = JSON.parse(
      asAuthenticatedCommit(admin, `SELECT public.invite_member('${orgId}', '${email1}', 'student', NULL, NULL)::text`),
    ) as { invitation_id: string; token: string; created: boolean };
    expect(inv1.created).toBe(true);

    const acc1 = JSON.parse(
      asAuthenticatedCommit(student1, `SELECT public.accept_invitation('${inv1.token}')::text`),
    ) as { membership_created: boolean };
    expect(acc1.membership_created).toBe(true);

    // 6A: Concorrência real de duas conexões simultâneas disputando a última vaga (2ª vaga) via invite_member
    const concurrentInviteResults = await Promise.allSettled([
      sqlAsync(`BEGIN;
        SET LOCAL ROLE authenticated;
        SET LOCAL request.jwt.claims = '{"sub":"${admin}","role":"authenticated"}';
        SELECT public.invite_member('${orgId}', '${email2}', 'student', NULL, NULL)::text;
        SELECT pg_sleep(0.2);
        COMMIT;`),
      sqlAsync(`BEGIN;
        SET LOCAL ROLE authenticated;
        SET LOCAL request.jwt.claims = '{"sub":"${admin}","role":"authenticated"}';
        SELECT public.invite_member('${orgId}', '${email3}', 'student', NULL, NULL)::text;
        SELECT pg_sleep(0.2);
        COMMIT;`),
    ]);

    const inviteFulfilled = concurrentInviteResults.filter((r) => r.status === "fulfilled");
    const inviteRejected = concurrentInviteResults.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(inviteFulfilled).toHaveLength(1);
    expect(inviteRejected).toHaveLength(1);
    expect(String(inviteRejected[0].reason)).toMatch(/Student seat limit reached/i);

    // Convite para educador (staff) com vagas de alunos lotadas -> PERMITIDO
    const invEdu = JSON.parse(
      asAuthenticatedCommit(admin, `SELECT public.invite_member('${orgId}', '${emailEdu}', 'educator', NULL, NULL)::text`),
    ) as { created: boolean };
    expect(invEdu.created).toBe(true);

    // 6B: Concorrência real em accept_invitation:
    // Amplia temporariamente max_seats para 3 para emitir os 2 convites pendentes válidos (student2 e student3),
    // depois reduz max_seats de volta para 2, deixando 1 vaga ativa restante disputada simultaneamente pelos 2 tokens.
    sql(`UPDATE public.organization_subscriptions SET max_seats = 3 WHERE id = '${subId}';`);
    const token2 = JSON.parse(
      asAuthenticatedCommit(admin, `SELECT public.invite_member('${orgId}', '${email2}', 'student', NULL, NULL)::text`),
    ) as { token: string };
    const token3 = JSON.parse(
      asAuthenticatedCommit(admin, `SELECT public.invite_member('${orgId}', '${email3}', 'student', NULL, NULL)::text`),
    ) as { token: string };
    sql(`UPDATE public.organization_subscriptions SET max_seats = 2 WHERE id = '${subId}';`);

    const concurrentAcceptResults = await Promise.allSettled([
      sqlAsync(`BEGIN;
        SET LOCAL ROLE authenticated;
        SET LOCAL request.jwt.claims = '{"sub":"${student2}","role":"authenticated"}';
        SELECT public.accept_invitation('${token2.token}')::text;
        SELECT pg_sleep(0.2);
        COMMIT;`),
      sqlAsync(`BEGIN;
        SET LOCAL ROLE authenticated;
        SET LOCAL request.jwt.claims = '{"sub":"${student3}","role":"authenticated"}';
        SELECT public.accept_invitation('${token3.token}')::text;
        SELECT pg_sleep(0.2);
        COMMIT;`),
    ]);

    const acceptFulfilled = concurrentAcceptResults.filter((r) => r.status === "fulfilled");
    const acceptRejected = concurrentAcceptResults.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(acceptFulfilled).toHaveLength(1);
    expect(acceptRejected).toHaveLength(1);
    expect(String(acceptRejected[0].reason)).toMatch(/Student seat limit reached \(2 of 2 active student seats\)/i);

    const activeStudentsCount = Number(
      sql(`SELECT count(DISTINCT user_id) FROM public.institutional_memberships WHERE organization_id = '${orgId}' AND role = 'student' AND status = 'active';`),
    );
    expect(activeStudentsCount).toBe(2);
  });

  it("7. Duplicação, expiração de convites e idempotência: reenvio não estoura última vaga e expiração libera assento", () => {
    const admin = randomUUID();
    const orgId = randomUUID();
    const subId = randomUUID();
    const emailA = `c2-idem-a-${orgId}@example.invalid`;
    const emailB = `c2-idem-b-${orgId}@example.invalid`;

    createAuthUser(admin, `c2-adm-idem-${admin}@example.invalid`);

    sql(`
      INSERT INTO public.organizations (id, name, slug, owner_id, status)
      VALUES ('${orgId}', 'Escola Idempotência 1 Vaga', 'idem-${orgId}', '${admin}', 'active');

      INSERT INTO public.institutional_memberships (organization_id, user_id, role, status)
      VALUES ('${orgId}', '${admin}', 'org_admin', 'active');

      INSERT INTO public.organization_subscriptions (
        id, organization_name, organization_id, plan_id, owner_id, status, billing_interval, max_seats, current_period_end
      )
      VALUES (
        '${subId}', 'Escola Idempotência 1 Vaga', '${orgId}', '${advancedPlanId}', '${admin}', 'active', 'monthly', 1, now() + interval '30 days'
      );
    `);

    // Emite convite ocupando a única vaga (1 de 1)
    const firstCall = JSON.parse(
      asAuthenticatedCommit(admin, `SELECT public.invite_member('${orgId}', '${emailA}', 'student', NULL, NULL)::text`),
    ) as { invitation_id: string; token: string; created: boolean };
    expect(firstCall.created).toBe(true);

    // Chamada duplicada para o mesmo e-mail+role com 1/1 vaga ocupada é idempotente (não falha por limite)
    const duplicateCall = JSON.parse(
      asAuthenticatedCommit(admin, `SELECT public.invite_member('${orgId}', '  ${emailA.toUpperCase()} ', 'student', NULL, NULL)::text`),
    ) as { invitation_id: string; token: string; created: boolean };
    expect(duplicateCall.created).toBe(false);
    expect(duplicateCall.invitation_id).toBe(firstCall.invitation_id);
    expect(duplicateCall.token).toBe(firstCall.token);

    const outboxCount = Number(
      sql(`SELECT count(*) FROM public.notification_outbox WHERE dedupe_key = 'invite:' || '${firstCall.invitation_id}';`),
    );
    expect(outboxCount).toBe(1);

    // Expira o convite de emailA -> libera automaticamente a reserva da vaga
    sql(`UPDATE public.institutional_invitations SET expires_at = now() - interval '1 minute' WHERE id = '${firstCall.invitation_id}';`);

    // Reemitir para o mesmo emailA após expiração limpa o registro expirado e cria novo convite válido
    const renewedSameEmail = JSON.parse(
      asAuthenticatedCommit(admin, `SELECT public.invite_member('${orgId}', '${emailA}', 'student', NULL, NULL)::text`),
    ) as { invitation_id: string; token: string; created: boolean };
    expect(renewedSameEmail.created).toBe(true);
    expect(renewedSameEmail.invitation_id).not.toBe(firstCall.invitation_id);

    // Se o convite renovado também expirar, outro aluno (emailB) pode ocupar a vaga liberada
    sql(`UPDATE public.institutional_invitations SET expires_at = now() - interval '1 minute' WHERE id = '${renewedSameEmail.invitation_id}';`);

    const inviteOtherAfterExpiry = JSON.parse(
      asAuthenticatedCommit(admin, `SELECT public.invite_member('${orgId}', '${emailB}', 'student', NULL, NULL)::text`),
    ) as { invitation_id: string; created: boolean };
    expect(inviteOtherAfterExpiry.created).toBe(true);
  });

  it("8. Regressão Defeito #1 (C2.R): bloqueia bypass de max_seats por INSERT/UPDATE direto em institutional_memberships e institutional_invitations", () => {
    const admin = randomUUID();
    const stu1 = randomUUID();
    const stu2 = randomUUID();
    const educator = randomUUID();
    const orgId = randomUUID();
    const orgUnpaid = randomUUID();
    const subId = randomUUID();

    createAuthUser(admin, `c2r-adm-${admin}@example.invalid`);
    createAuthUser(stu1, `c2r-stu1-${stu1}@example.invalid`);
    createAuthUser(stu2, `c2r-stu2-${stu2}@example.invalid`);
    createAuthUser(educator, `c2r-edu-${educator}@example.invalid`);

    sql(`
      INSERT INTO public.organizations (id, name, slug, owner_id, status) VALUES
        ('${orgId}', 'Escola Trigger 1 Vaga', 'trg-${orgId}', '${admin}', 'active'),
        ('${orgUnpaid}', 'Escola Sem Assinatura', 'unpaid-${orgUnpaid}', '${admin}', 'active');

      INSERT INTO public.institutional_memberships (organization_id, user_id, role, status) VALUES
        ('${orgId}', '${admin}', 'org_admin', 'active'),
        ('${orgId}', '${educator}', 'educator', 'active'),
        ('${orgId}', '${stu2}', 'student', 'suspended'),
        ('${orgUnpaid}', '${admin}', 'org_admin', 'active');

      INSERT INTO public.organization_subscriptions (
        id, organization_name, organization_id, plan_id, owner_id, status, billing_interval, max_seats, current_period_end
      ) VALUES (
        '${subId}', 'Escola Trigger 1 Vaga', '${orgId}', '${advancedPlanId}', '${admin}', 'active', 'monthly', 1, now() + interval '30 days'
      );
    `);

    // 8A: Organização sem assinatura vinculada não permite alocação de assento de estudante por usuário autenticado
    expectAuthenticatedFailure(
      admin,
      `INSERT INTO public.institutional_memberships (organization_id, user_id, role, status)
       VALUES ('${orgUnpaid}', '${stu1}', 'student', 'active')`,
      /Organization subscription is required to allocate student seats/i,
    );

    expectAuthenticatedFailure(
      admin,
      `SELECT public.invite_member('${orgUnpaid}', 'sem-sub-${orgUnpaid}@example.invalid', 'student', NULL, NULL)::text`,
      /Organization subscription is required to allocate student seats/i,
    );

    // 8B: 1º estudante inserido diretamente pelo org_admin em org com max_seats = 1 -> ocupa a única vaga (1/1)
    asAuthenticatedCommit(
      admin,
      `INSERT INTO public.institutional_memberships (organization_id, user_id, role, status)
       VALUES ('${orgId}', '${stu1}', 'student', 'active')`,
    );

    // 8C: Tentativa de inserir diretamente um 2º estudante ativo com max_seats = 1 -> BLOQUEADO pelo trigger
    const stu3 = randomUUID();
    createAuthUser(stu3, `c2r-stu3-${stu3}@example.invalid`);
    expectAuthenticatedFailure(
      admin,
      `INSERT INTO public.institutional_memberships (organization_id, user_id, role, status)
       VALUES ('${orgId}', '${stu3}', 'student', 'active')`,
      /Student seat limit reached/i,
    );

    // 8D: Tentativa de reativar estudante suspenso (stu2) via UPDATE direto -> BLOQUEADO pelo trigger
    expectAuthenticatedFailure(
      admin,
      `UPDATE public.institutional_memberships SET status = 'active'
       WHERE organization_id = '${orgId}' AND user_id = '${stu2}'`,
      /Student seat limit reached/i,
    );

    // 8E: Tentativa de mudar papel de educator para student via UPDATE direto -> BLOQUEADO pelo trigger
    expectAuthenticatedFailure(
      admin,
      `UPDATE public.institutional_memberships SET role = 'student'
       WHERE organization_id = '${orgId}' AND user_id = '${educator}'`,
      /Student seat limit reached/i,
    );

    // 8F: Tentativa de inserir convite de estudante diretamente na tabela quando 1/1 vaga já está ocupada -> BLOQUEADO pelo trigger
    expectAuthenticatedFailure(
      admin,
      `INSERT INTO public.institutional_invitations (organization_id, invited_email, role, invited_by)
       VALUES ('${orgId}', 'bypass-invite-${orgId}@example.invalid', 'student', '${admin}')`,
      /Student seat limit reached/i,
    );

    // 8G: Tentativa de transferir membership ativa de outra organização para orgId lotada (1/1) -> BLOQUEADO pelo trigger
    const orgSource = randomUUID();
    const subSource = randomUUID();
    sql(`
      INSERT INTO public.organizations (id, name, slug, owner_id, status)
      VALUES ('${orgSource}', 'Escola Origem Transferência', 'src-${orgSource}', '${admin}', 'active');
      INSERT INTO public.institutional_memberships (organization_id, user_id, role, status)
      VALUES ('${orgSource}', '${admin}', 'org_admin', 'active');
      INSERT INTO public.organization_subscriptions (
        id, organization_name, organization_id, plan_id, owner_id, status, billing_interval, max_seats, current_period_end
      ) VALUES (
        '${subSource}', 'Escola Origem Transferência', '${orgSource}', '${advancedPlanId}', '${admin}', 'active', 'monthly', 5, now() + interval '30 days'
      );
      INSERT INTO public.institutional_memberships (organization_id, user_id, role, status)
      VALUES ('${orgSource}', '${stu3}', 'student', 'active');
    `);
    expectAuthenticatedFailure(
      admin,
      `UPDATE public.institutional_memberships SET organization_id = '${orgId}'
       WHERE organization_id = '${orgSource}' AND user_id = '${stu3}'`,
      /Student seat limit reached/i,
    );

    // 8H: Suspender o estudante ativo stu1 continua permitido (libera a vaga)
    asAuthenticatedCommit(
      admin,
      `UPDATE public.institutional_memberships SET status = 'suspended'
       WHERE organization_id = '${orgId}' AND user_id = '${stu1}'`,
    );
  });

  it("9. Regressão Defeito #2 (C2.R): comprador com assinatura expirada ou ativa renovando nunca tem pagamento consumido sem ativação", () => {
    const buyerClaimExpired = randomUUID();
    const buyerTokenExpired = randomUUID();
    const buyerWebhookActive = randomUUID();
    const tokenExpiredFlow = randomUUID();
    const extClaimExpired = randomUUID();
    const extTokenExpired = randomUUID();
    const extWebhookActive = randomUUID();

    createAuthUser(buyerClaimExpired, `c2r-exp-email-${buyerClaimExpired}@example.invalid`);
    createAuthUser(buyerTokenExpired, `c2r-exp-token-${buyerTokenExpired}@example.invalid`);
    createAuthUser(buyerWebhookActive, `c2r-act-web-${buyerWebhookActive}@example.invalid`);

    const orgExpiredEmail = JSON.parse(
      asAuthenticatedCommit(buyerClaimExpired, `SELECT public.create_organization('Rede Renovação Email', 'ren-email-${buyerClaimExpired}')::text`),
    ) as { organization_id: string };

    const orgExpiredToken = JSON.parse(
      asAuthenticatedCommit(buyerTokenExpired, `SELECT public.create_organization('Rede Renovação Token', 'ren-token-${buyerTokenExpired}')::text`),
    ) as { organization_id: string };

    const orgActiveWebhook = JSON.parse(
      asAuthenticatedCommit(buyerWebhookActive, `SELECT public.create_organization('Rede Renovação Antecipada', 'ren-web-${buyerWebhookActive}')::text`),
    ) as { organization_id: string };

    // Assinaturas anteriores: duas expiradas e uma ainda vigente com +20 dias
    sql(`
      INSERT INTO public.organization_subscriptions (
        organization_name, organization_id, plan_id, owner_id, status, billing_interval, max_seats, current_period_start, current_period_end
      ) VALUES
        ('Rede Renovação Email', '${orgExpiredEmail.organization_id}', '${advancedPlanId}', '${buyerClaimExpired}', 'expired', 'monthly', 30, now() - interval '40 days', now() - interval '10 days'),
        ('Rede Renovação Token', '${orgExpiredToken.organization_id}', '${advancedPlanId}', '${buyerTokenExpired}', 'expired', 'monthly', 30, now() - interval '40 days', now() - interval '10 days'),
        ('Rede Renovação Antecipada', '${orgActiveWebhook.organization_id}', '${advancedPlanId}', '${buyerWebhookActive}', 'active', 'monthly', 50, now() - interval '10 days', now() + interval '20 days');

      INSERT INTO public.purchase_intents (
        kind, plan_slug, status, contact_email, contact_name, billing_interval, seats_students, amount_brl_cents, external_reference, mp_payment_id
      ) VALUES (
        'escolar', 'advanced', 'approved', 'c2r-exp-email-${buyerClaimExpired}@example.invalid', 'Rede Renovação Email', 'yearly', 90, 1008000, '${extClaimExpired}', 'mp-exp-email-${buyerClaimExpired}'
      );

      INSERT INTO public.purchase_intents (
        kind, plan_slug, status, contact_email, contact_name, billing_interval, seats_students, amount_brl_cents, external_reference, claim_token, mp_payment_id
      ) VALUES (
        'escolar', 'advanced', 'approved', 'outro-exp-${buyerTokenExpired}@example.invalid', 'Rede Renovação Token', 'monthly', 60, 84000, '${extTokenExpired}', '${tokenExpiredFlow}', 'mp-exp-token-${buyerTokenExpired}'
      );

      INSERT INTO public.purchase_intents (
        kind, plan_slug, status, user_id, contact_email, contact_name, billing_interval, seats_students, amount_brl_cents, external_reference
      ) VALUES (
        'escolar', 'advanced', 'pending', '${buyerWebhookActive}', 'c2r-act-web-${buyerWebhookActive}@example.invalid', 'Rede Renovação Antecipada', 'monthly', 80, 112000, '${extWebhookActive}'
      );
    `);

    // 9A: Claim por e-mail quando já havia assinatura expirada -> deve REATIVAR a assinatura e conceder plano advanced
    const claimEmailOut = JSON.parse(
      asAuthenticatedCommit(buyerClaimExpired, `SELECT public.claim_escolar_subscription()::text`),
    ) as { ok: boolean; organization_id: string };
    expect(claimEmailOut.ok).toBe(true);
    expect(claimEmailOut.organization_id).toBe(orgExpiredEmail.organization_id);

    const planAfterEmailClaim = JSON.parse(
      asAuthenticatedCommit(buyerClaimExpired, `SELECT public.get_my_plan()::text`),
    ) as { plan_slug: string; status: string };
    expect(planAfterEmailClaim.plan_slug).toBe("advanced");
    expect(planAfterEmailClaim.status).toBe("active");

    const seatsAfterEmailClaim = Number(
      sql(`SELECT max_seats FROM public.organization_subscriptions WHERE owner_id = '${buyerClaimExpired}';`),
    );
    expect(seatsAfterEmailClaim).toBe(90);

    // 9B: Claim por token quando já havia assinatura expirada -> deve REATIVAR a assinatura e conceder plano advanced
    const claimTokenOut = JSON.parse(
      asAuthenticatedCommit(buyerTokenExpired, `SELECT public.claim_escolar_with_token('${tokenExpiredFlow}')::text`),
    ) as { ok: boolean; organization_id: string };
    expect(claimTokenOut.ok).toBe(true);
    expect(claimTokenOut.organization_id).toBe(orgExpiredToken.organization_id);

    const planAfterTokenClaim = JSON.parse(
      asAuthenticatedCommit(buyerTokenExpired, `SELECT public.get_my_plan()::text`),
    ) as { plan_slug: string; status: string };
    expect(planAfterTokenClaim.plan_slug).toBe("advanced");
    expect(planAfterTokenClaim.status).toBe("active");

    // 9C: Renovação antecipada via activate_subscription_from_intent preserva os +20 dias restantes (+ 1 month > 45 days)
    const webhookRes = JSON.parse(
      asServiceRoleCommit(
        `SELECT public.activate_subscription_from_intent('${extWebhookActive}'::uuid, 'mp-web-${buyerWebhookActive}', 'approved')::text`,
      ),
    ) as { ok: boolean; reason: string };
    expect(webhookRes.ok).toBe(true);
    expect(webhookRes.reason).toBe("activated");

    const daysRemaining = Number(
      sql(`
        SELECT EXTRACT(DAY FROM (current_period_end - now()))::integer
        FROM public.organization_subscriptions
        WHERE owner_id = '${buyerWebhookActive}';
      `),
    );
    expect(daysRemaining).toBeGreaterThanOrEqual(45);
  });

  it("10. Regressão Defeito #3 (C2.R): proprietário com duas organizações de mesmo nome não tem assinatura vinculada automaticamente", () => {
    const ownerDupName = randomUUID();
    const orgDup1 = randomUUID();
    const orgDup2 = randomUUID();
    const extDupRef = randomUUID();

    createAuthUser(ownerDupName, `c2r-dup-${ownerDupName}@example.invalid`);

    sql(`
      INSERT INTO public.organizations (id, name, slug, owner_id, status) VALUES
        ('${orgDup1}', 'Rede Homônima', 'homonima-1-${orgDup1}', '${ownerDupName}', 'active'),
        ('${orgDup2}', 'Rede Homônima', 'homonima-2-${orgDup2}', '${ownerDupName}', 'active');

      INSERT INTO public.institutional_memberships (organization_id, user_id, role, status) VALUES
        ('${orgDup1}', '${ownerDupName}', 'org_admin', 'active'),
        ('${orgDup2}', '${ownerDupName}', 'org_admin', 'active');

      INSERT INTO public.purchase_intents (
        kind, plan_slug, status, contact_email, contact_name, billing_interval, seats_students, amount_brl_cents, external_reference, mp_payment_id
      ) VALUES (
        'escolar', 'advanced', 'approved', 'c2r-dup-${ownerDupName}@example.invalid', 'Rede Homônima', 'monthly', 40, 68000, '${extDupRef}', 'mp-dup-${ownerDupName}'
      );
    `);

    const claimDupRes = JSON.parse(
      asAuthenticatedCommit(ownerDupName, `SELECT public.claim_escolar_subscription()::text`),
    ) as { ok: boolean; organization_id: string | null };
    expect(claimDupRes.ok).toBe(true);
    expect(claimDupRes.organization_id).toBeNull();

    const subState = JSON.parse(
      sql(`
        SELECT jsonb_build_object('status', status, 'organization_id', organization_id, 'max_seats', max_seats)::text
        FROM public.organization_subscriptions
        WHERE owner_id = '${ownerDupName}';
      `),
    ) as { status: string; organization_id: string | null; max_seats: number };
    expect(subState.status).toBe("active");
    expect(subState.organization_id).toBeNull();
    expect(subState.max_seats).toBe(40);

    // Chamada subsequente a create_organization com o mesmo nome tampouco vincula automaticamente quando há ambiguidade (>1 org ativa)
    const createDupCall = JSON.parse(
      asAuthenticatedCommit(ownerDupName, `SELECT public.create_organization('Rede Homônima', 'homonima-3-${ownerDupName}')::text`),
    ) as { organization_id: string };
    expect(createDupCall.organization_id).toBeTruthy();

    const subOrgAfterCreate = sql(
      `SELECT COALESCE(organization_id::text, 'NULL') FROM public.organization_subscriptions WHERE owner_id = '${ownerDupName}' LIMIT 1;`,
    );
    expect(subOrgAfterCreate).toBe("NULL");
  });

  it("11. Regressão Defeito #4 e Bloqueio D (C2.R): leitura de organization_subscriptions sob RLS sem recursão, bloqueio direto a organization_members e entitlement via get_my_plan()", () => {
    const owner = randomUUID();
    const orgAdmin2 = randomUUID();
    const student = randomUUID();
    const outsiderAdmin = randomUUID();
    const orgId = randomUUID();
    const orgOther = randomUUID();
    const subId = randomUUID();

    createAuthUser(owner, `c2r-rls-owner-${owner}@example.invalid`);
    createAuthUser(orgAdmin2, `c2r-rls-adm2-${orgAdmin2}@example.invalid`);
    createAuthUser(student, `c2r-rls-stu-${student}@example.invalid`);
    createAuthUser(outsiderAdmin, `c2r-rls-out-${outsiderAdmin}@example.invalid`);

    sql(`
      INSERT INTO public.organizations (id, name, slug, owner_id, status) VALUES
        ('${orgId}', 'Escola Sem Recursão RLS', 'rls-${orgId}', '${owner}', 'active'),
        ('${orgOther}', 'Outra Rede Isolada', 'rls-other-${orgOther}', '${outsiderAdmin}', 'active');

      INSERT INTO public.organization_subscriptions (
        id, organization_name, organization_id, plan_id, owner_id, status, billing_interval, max_seats, current_period_end
      )
      VALUES (
        '${subId}', 'Escola Sem Recursão RLS', '${orgId}', '${advancedPlanId}', '${owner}', 'active', 'monthly', 25, now() + interval '30 days'
      );

      INSERT INTO public.institutional_memberships (organization_id, user_id, role, status) VALUES
        ('${orgId}', '${owner}', 'org_admin', 'active'),
        ('${orgId}', '${orgAdmin2}', 'org_admin', 'active'),
        ('${orgId}', '${student}', 'student', 'active'),
        ('${orgOther}', '${outsiderAdmin}', 'org_admin', 'active');

      INSERT INTO public.organization_members (org_subscription_id, user_id, status)
      VALUES ('${subId}', '${student}', 'active');
    `);

    // Owner e co-org_admin leem a assinatura vinculada sem erro de recursão (42P17) nem falta de privilégio (42501)
    expect(
      Number(asAuthenticatedCommit(owner, `SELECT count(*) FROM public.organization_subscriptions WHERE id = '${subId}'`)),
    ).toBe(1);
    expect(
      Number(asAuthenticatedCommit(orgAdmin2, `SELECT count(*) FROM public.organization_subscriptions WHERE id = '${subId}'`)),
    ).toBe(1);

    // Estudante e gestor de outro tenant não leem linhas financeiras brutas de organization_subscriptions (isolamento cross-tenant)
    expect(
      Number(asAuthenticatedCommit(student, `SELECT count(*) FROM public.organization_subscriptions WHERE id = '${subId}'`)),
    ).toBe(0);
    expect(
      Number(asAuthenticatedCommit(outsiderAdmin, `SELECT count(*) FROM public.organization_subscriptions WHERE id = '${subId}'`)),
    ).toBe(0);

    // Escrita direta em organization_subscriptions por usuário autenticado é negada (menor privilégio)
    expectAuthenticatedFailure(
      owner,
      `UPDATE public.organization_subscriptions SET max_seats = 999 WHERE id = '${subId}'`,
      /permission denied for table organization_subscriptions/i,
    );

    // Tabela legada organization_members permanece fechada para acesso direto pelo cliente (authenticated),
    // sendo consultada exclusivamente via get_my_plan()/get_user_plan() (SECURITY DEFINER)
    expectAuthenticatedFailure(
      owner,
      `SELECT count(*) FROM public.organization_members WHERE org_subscription_id = '${subId}'`,
      /permission denied for table organization_members/i,
    );
    expectAuthenticatedFailure(
      student,
      `SELECT count(*) FROM public.organization_members WHERE org_subscription_id = '${subId}'`,
      /permission denied for table organization_members/i,
    );

    // Estudante recebe normalmente seu entitlement 'advanced' via contrato real get_my_plan()
    const studentPlan = JSON.parse(asAuthenticatedCommit(student, `SELECT public.get_my_plan()::text`)) as {
      plan_slug: string;
      source: string;
      organization_id: string;
    };
    expect(studentPlan.plan_slug).toBe("advanced");
    expect(studentPlan.source).toBe("organization");
    expect(studentPlan.organization_id).toBe(orgId);
  });

  it("12. Regressão Bloqueio A: convite expirado de A não burla cota (max_seats = 1) quando B tem reserva válida pendente, e aceite de B converte reserva em assento ativo", () => {
    const admin = randomUUID();
    const stuA = randomUUID();
    const stuB = randomUUID();
    const orgId = randomUUID();
    const subId = randomUUID();
    const emailA = `bloq-a-exp-${stuA}@example.invalid`;
    const emailB = `bloq-a-val-${stuB}@example.invalid`;

    createAuthUser(admin, `adm-${admin}@example.invalid`);
    createAuthUser(stuA, emailA);
    createAuthUser(stuB, emailB);

    sql(`
      INSERT INTO public.organizations (id, name, slug, owner_id, status) VALUES
        ('${orgId}', 'Escola Quota Bloqueio A', 'quota-a-${orgId}', '${admin}', 'active');

      INSERT INTO public.institutional_memberships (organization_id, user_id, role, status) VALUES
        ('${orgId}', '${admin}', 'org_admin', 'active');

      INSERT INTO public.organization_subscriptions (
        id, organization_name, organization_id, plan_id, owner_id, status, billing_interval, max_seats, current_period_end
      ) VALUES (
        '${subId}', 'Escola Quota Bloqueio A', '${orgId}', '${advancedPlanId}', '${admin}', 'active', 'monthly', 1, now() + interval '30 days'
      );

      -- Convite EXPIRADO para o estudante A
      INSERT INTO public.institutional_invitations (organization_id, invited_email, role, invited_by, expires_at)
      VALUES ('${orgId}', '${emailA}', 'student', '${admin}', now() - interval '2 days');

      -- Convite VÁLIDO e PENDENTE para o estudante B (reserva o único assento restante 1/1)
      INSERT INTO public.institutional_invitations (organization_id, invited_email, role, invited_by, expires_at)
      VALUES ('${orgId}', '${emailB}', 'student', '${admin}', now() + interval '7 days');
    `);

    // Tentativa de estudante A entrar diretamente ou ser reativado: o convite de A está expirado,
    // logo _has_matching_invite é false e o assento reservado por B bloqueia a inserção de A (1/1 ocupado/reservado)
    expectAuthenticatedFailure(
      admin,
      `INSERT INTO public.institutional_memberships (organization_id, user_id, role, status)
       VALUES ('${orgId}', '${stuA}', 'student', 'active')`,
      /Student seat limit reached.*occupied or reserved/i,
    );

    // O estudante B (com convite válido) consegue aceitar sua reserva pelo contrato real de accept_invitation
    const invBToken = sql(
      `SELECT token::text FROM public.institutional_invitations WHERE organization_id = '${orgId}' AND lower(trim(invited_email)) = lower(trim('${emailB}')) LIMIT 1`,
    );
    const acceptRes = JSON.parse(
      asAuthenticatedCommit(stuB, `SELECT public.accept_invitation('${invBToken}')::text`),
    ) as { organization_id: string; role: string; membership_created: boolean };
    expect(acceptRes).toEqual({
      organization_id: orgId,
      role: "student",
      membership_created: true,
    });

    // Verifica membership ativa criada para B, convite marcado como aceito e ausência de membership para A
    const bActiveMemberships = Number(
      sql(
        `SELECT count(*) FROM public.institutional_memberships WHERE organization_id = '${orgId}' AND user_id = '${stuB}' AND role = 'student' AND status = 'active';`,
      ),
    );
    expect(bActiveMemberships).toBe(1);

    const aActiveMemberships = Number(
      sql(
        `SELECT count(*) FROM public.institutional_memberships WHERE organization_id = '${orgId}' AND user_id = '${stuA}' AND status = 'active';`,
      ),
    );
    expect(aActiveMemberships).toBe(0);

    const bInviteAccepted = sql(
      `SELECT (accepted_at IS NOT NULL)::text FROM public.institutional_invitations WHERE token = '${invBToken}';`,
    );
    expect(bInviteAccepted).toBe("true");

    const bPlan = JSON.parse(asAuthenticatedCommit(stuB, `SELECT public.get_my_plan()::text`)) as { plan_slug: string };
    expect(bPlan.plan_slug).toBe("advanced");

    const aPlan = JSON.parse(asAuthenticatedCommit(stuA, `SELECT public.get_my_plan()::text`)) as { plan_slug: string };
    expect(aPlan.plan_slug).toBe("free");
  });

  it("13. Regressão Bloqueio B: claim com organização anterior arquivada ativa assinatura com association_pending, preserva entitlement 'advanced' do comprador e permite associação explícita auditável posterior", () => {
    const buyer = randomUUID();
    const archivedStudent = randomUUID();
    const buyerEmail = `buyer-arch-${buyer}@example.invalid`;
    const orgArchived = randomUUID();
    const subOld = randomUUID();
    const intentId = randomUUID();
    const extRef = randomUUID();

    createAuthUser(buyer, buyerEmail);
    createAuthUser(archivedStudent, `stu-arch-${archivedStudent}@example.invalid`);

    sql(`
      -- Organização existente do comprador está arquivada
      INSERT INTO public.organizations (id, name, slug, owner_id, status) VALUES
        ('${orgArchived}', 'Escola Anterior Arquivada', 'arch-${orgArchived}', '${buyer}', 'archived');

      INSERT INTO public.institutional_memberships (organization_id, user_id, role, status) VALUES
        ('${orgArchived}', '${buyer}', 'org_admin', 'active'),
        ('${orgArchived}', '${archivedStudent}', 'student', 'active');

      -- Assinatura antiga vinculada à organização arquivada
      INSERT INTO public.organization_subscriptions (
        id, organization_name, organization_id, plan_id, owner_id, status, billing_interval, max_seats, current_period_end
      ) VALUES (
        '${subOld}', 'Escola Anterior Arquivada', '${orgArchived}', '${advancedPlanId}', '${buyer}', 'expired', 'monthly', 30, now() - interval '10 days'
      );

      -- Intenção de compra escolar aprovada aguardando claim (usando colunas reais do schema: amount_brl_cents)
      INSERT INTO public.purchase_intents (
        id, external_reference, contact_name, contact_email, plan_slug, billing_interval, seats_students,
        kind, amount_brl_cents, status, mp_payment_id, user_id
      ) VALUES (
        '${intentId}', '${extRef}', 'Rede Nova do Comprador', '${buyerEmail}', 'advanced', 'yearly', 50,
        'escolar', 500000, 'approved', 'mp-arch-claim-${buyer}', NULL
      );
    `);

    // Claim como comprador: a organização anterior está arquivada e não há outra ativa,
    // logo o vínculo é limpo (target = NULL) e a resposta indica 'association_pending'
    const claimRes = JSON.parse(asAuthenticatedCommit(buyer, `SELECT public.claim_escolar_subscription()::text`)) as {
      ok: boolean;
      reason: string;
      org_name: string;
      organization_id: string | null;
    };

    expect(claimRes).toEqual({
      ok: true,
      reason: "association_pending",
      org_name: "Rede Nova do Comprador",
      organization_id: null,
    });

    // Intenção foi consumida pelo comprador com amount_brl_cents preservado
    const consumedIntent = JSON.parse(
      sql(
        `SELECT jsonb_build_object('user_id', user_id, 'status', status, 'amount_brl_cents', amount_brl_cents)::text FROM public.purchase_intents WHERE id = '${intentId}';`,
      ),
    ) as { user_id: string; status: string; amount_brl_cents: number };
    expect(consumedIntent).toEqual({
      user_id: buyer,
      status: "approved",
      amount_brl_cents: 500000,
    });

    // Assinatura foi ativada com organization_id = NULL e max_seats = 50 (sem reativar silenciosamente a org arquivada)
    const subRow = JSON.parse(
      sql(
        `SELECT jsonb_build_object('status', status, 'organization_id', organization_id, 'max_seats', max_seats)::text FROM public.organization_subscriptions WHERE id = '${subOld}';`,
      ),
    ) as { status: string; organization_id: string | null; max_seats: number };
    expect(subRow).toEqual({
      status: "active",
      organization_id: null,
      max_seats: 50,
    });

    // Membro da organização arquivada NÃO ganha plano 'advanced'
    const archivedStudentPlan = JSON.parse(
      asAuthenticatedCommit(archivedStudent, `SELECT public.get_my_plan()::text`),
    ) as { plan_slug: string };
    expect(archivedStudentPlan.plan_slug).toBe("free");

    // Verificação crítica do Bloqueio B: o comprador recebe 'advanced' imediatamente via owner_id
    const buyerPlan = JSON.parse(asAuthenticatedCommit(buyer, `SELECT public.get_my_plan()::text`)) as {
      plan_slug: string;
      source: string;
      status: string;
      organization_id: string | null;
    };
    expect(buyerPlan.plan_slug).toBe("advanced");
    expect(buyerPlan.source).toBe("organization");
    expect(buyerPlan.status).toBe("active");
    expect(buyerPlan.organization_id).toBeNull();

    // Associação posterior explícita e auditável de uma organização ativa do comprador
    const newActiveOrg = JSON.parse(
      asAuthenticatedCommit(
        buyer,
        `SELECT public.create_organization('Rede Nova do Comprador', 'rede-nova-${buyer}')::text`,
      ),
    ) as { organization_id: string; created: boolean };
    expect(newActiveOrg.created).toBe(true);

    const linkedOrgAfterCreate = sql(
      `SELECT organization_id::text FROM public.organization_subscriptions WHERE id = '${subOld}';`,
    );
    expect(linkedOrgAfterCreate).toBe(newActiveOrg.organization_id);

    const auditCount = Number(
      sql(
        `SELECT count(*) FROM public.data_access_logs WHERE actor_user_id = '${buyer}' AND purpose = 'create_organization' AND scope->>'linked_subscription_id' = '${subOld}';`,
      ),
    );
    expect(auditCount).toBe(1);
  });

  it("14. Regressão Bloqueio D: privilégios de tabela em organization_subscriptions e organization_members estão alinhados ao menor privilégio", () => {
    const userRandom = randomUUID();
    createAuthUser(userRandom, `anon-read-${userRandom}@example.invalid`);

    // Consulta como authenticated em organization_subscriptions respeita RLS sem erro 42501
    const count = Number(asAuthenticatedCommit(userRandom, `SELECT count(*) FROM public.organization_subscriptions`));
    expect(count).toBe(0);

    // Verificação direta no catálogo de privilégios do PostgreSQL
    const privs = JSON.parse(
      sql(`
        SELECT jsonb_build_object(
          'org_sub_auth_select', has_table_privilege('authenticated', 'public.organization_subscriptions', 'SELECT'),
          'org_sub_auth_insert', has_table_privilege('authenticated', 'public.organization_subscriptions', 'INSERT'),
          'org_sub_auth_update', has_table_privilege('authenticated', 'public.organization_subscriptions', 'UPDATE'),
          'org_sub_auth_delete', has_table_privilege('authenticated', 'public.organization_subscriptions', 'DELETE'),
          'org_sub_anon_select', has_table_privilege('anon', 'public.organization_subscriptions', 'SELECT'),
          'org_mem_auth_select', has_table_privilege('authenticated', 'public.organization_members', 'SELECT'),
          'org_mem_anon_select', has_table_privilege('anon', 'public.organization_members', 'SELECT'),
          'org_mem_service_select', has_table_privilege('service_role', 'public.organization_members', 'SELECT')
        )::text;
      `),
    ) as Record<string, boolean>;

    expect(privs).toEqual({
      org_sub_auth_select: true,
      org_sub_auth_insert: false,
      org_sub_auth_update: false,
      org_sub_auth_delete: false,
      org_sub_anon_select: false,
      org_mem_auth_select: false,
      org_mem_anon_select: false,
      org_mem_service_select: true,
    });
  });
});


