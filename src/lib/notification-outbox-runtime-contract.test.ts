// TRUST-1.6.1 — R33/R34 notification_outbox contract against real PostgreSQL.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

const CONTAINER = "supabase_db_ctjwyybmlwhynherikqy";
const DB_TIMEOUT = 120_000;

function sql(statement: string): string {
  return execFileSync(
    "docker",
    ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-c", statement],
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
}

function localDbAvailable(): boolean {
  try {
    return Number(sql("SELECT count(*) FROM supabase_migrations.schema_migrations;")) > 0;
  } catch {
    return false;
  }
}

function asAuthenticated(uid: string, statement: string): string {
  return sql(`BEGIN;
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claims = '{"sub":"${uid}","role":"authenticated"}';
    ${statement};
    ROLLBACK;`);
}

function asAuthenticatedCommit(uid: string, statement: string): string {
  return sql(`BEGIN;
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claims = '{"sub":"${uid}","role":"authenticated"}';
    ${statement};
    COMMIT;`);
}

const available = localDbAvailable();
const rawSuite = available ? describe : describe.skip;
const suite = (name: string, fn: () => void) => rawSuite(name, { timeout: DB_TIMEOUT }, fn);
if (!available) console.warn("[OUTBOX_RUNTIME_CONTRACT] PULADO: Postgres local indisponível.");

const ADMIN = randomUUID();
const ORG = randomUUID();
const EMAIL = `r33-${ORG}@example.invalid`;
let invitationId = "";

function seed(): void {
  sql(`
    INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (
      '${ADMIN}',
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'r33-admin-${ORG}@example.invalid',
      now(),
      now()
    );

    INSERT INTO public.organizations (id, name, slug, owner_id, status)
    VALUES ('${ORG}', 'TRUST-1.6.1 R33', 'r33-${ORG}', '${ADMIN}', 'active');

    INSERT INTO public.institutional_memberships (organization_id, user_id, role, status)
    VALUES ('${ORG}', '${ADMIN}', 'org_admin', 'active');
  `);
}

if (available) beforeAll(seed);

suite("TRUST-1.6.1 / R33-R34 — notification outbox contract", () => {
  it("schema canônico usa payload e não contém body_html/metadata", () => {
    const columns = sql(`
      SELECT string_agg(column_name, ',' ORDER BY ordinal_position)
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='notification_outbox'
    `);
    expect(columns).toContain("payload");
    expect(columns).not.toContain("body_html");
    expect(columns.split(",")).not.toContain("metadata");
  });

  it("invite_member cria convite e enfileira delivery request real", () => {
    const payload = JSON.parse(
      asAuthenticatedCommit(
        ADMIN,
        `SELECT public.invite_member('${ORG}', '${EMAIL}', 'educator', NULL, NULL)::text`,
      ),
    ) as { invitation_id: string; created: boolean; delivery_enqueued: boolean };

    invitationId = payload.invitation_id;
    expect(payload.created).toBe(true);
    expect(payload.delivery_enqueued).toBe(true);

    const outbox = JSON.parse(
      sql(`
        SELECT jsonb_build_object(
          'kind', kind,
          'email', recipient_email,
          'invitation_id', payload->>'invitation_id',
          'role', payload->>'role',
          'organization_id', payload->>'organization_id'
        )::text
        FROM public.notification_outbox
        WHERE dedupe_key = 'invite:' || '${invitationId}'
      `),
    ) as Record<string, string>;

    expect(outbox).toMatchObject({
      kind: "institutional_invite",
      email: EMAIL,
      invitation_id: invitationId,
      role: "educator",
      organization_id: ORG,
    });
  });

  it("invite_member é idempotente e não duplica a outbox inicial", () => {
    const payload = JSON.parse(
      asAuthenticatedCommit(
        ADMIN,
        `SELECT public.invite_member('${ORG}', '${EMAIL}', 'educator', NULL, NULL)::text`,
      ),
    ) as { invitation_id: string; created: boolean; delivery_enqueued: boolean };

    expect(payload.invitation_id).toBe(invitationId);
    expect(payload.created).toBe(false);
    expect(payload.delivery_enqueued).toBe(true);
    expect(
      Number(sql(`SELECT count(*) FROM public.notification_outbox WHERE dedupe_key='invite:${invitationId}'`)),
    ).toBe(1);
  });

  it("resend_invitation enfileira nova entrega antes de registrar sucesso", () => {
    const result = JSON.parse(
      asAuthenticatedCommit(
        ADMIN,
        `SELECT public.resend_invitation('${invitationId}')::text`,
      ),
    ) as { resend: number; remaining: number; delivery_enqueued: boolean };

    expect(result).toMatchObject({ resend: 1, remaining: 2, delivery_enqueued: true });

    expect(
      Number(
        sql(`SELECT count(*) FROM public.notification_outbox WHERE dedupe_key='invite-resend:${invitationId}:1'`),
      ),
    ).toBe(1);

    expect(
      Number(
        sql(`SELECT count(*) FROM public.institutional_decision_events
             WHERE source_id='${invitationId}' AND event_type='invitation_resend' AND result='succeeded'`),
      ),
    ).toBe(1);
  });

  it("segundo reenvio imediato é bloqueado e não cria outra entrega", () => {
    expect(() =>
      asAuthenticated(
        ADMIN,
        `SELECT public.resend_invitation('${invitationId}')::text`,
      ),
    ).toThrow();

    expect(
      Number(
        sql(`SELECT count(*) FROM public.notification_outbox
             WHERE dedupe_key LIKE 'invite-resend:${invitationId}:%'`),
      ),
    ).toBe(1);
  });
});
