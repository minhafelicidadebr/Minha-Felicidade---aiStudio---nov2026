// TRUST-1.2.1 — fronteira de analytics institucionais contra PostgreSQL real.
// Dados exclusivamente sintéticos; nenhuma conexão remota.
import { execFileSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";

const CONTAINER = "supabase_db_ctjwyybmlwhynherikqy";
const DB_TIMEOUT = 120_000;

function sql(statement: string): string {
    return execFileSync("docker", ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-q", "-t", "-A", "-c", statement], {
        encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
    }).trim();
}

function localDbAvailable(): boolean {
    try { return Number(sql("SELECT count(*) FROM supabase_migrations.schema_migrations;")) > 0; }
    catch { return false; }
}

function asAuthenticated(uid: string, statement: string): string {
    return sql(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = '{"sub":"${uid}","role":"authenticated"}'; ${statement}; ROLLBACK;`);
}

const available = localDbAvailable();
const rawSuite = available ? describe : describe.skip;
const suite = (name: string, fn: () => void) => rawSuite(name, { timeout: DB_TIMEOUT }, fn);
if (!available) console.warn("[SERVER_ANALYTICS_RUNTIME_CONTRACT] PULADO: Postgres local indisponível.");

const id = (tail: string) => `e1210000-0000-4000-8000-${tail.padStart(12, "0")}`;
const ADMIN_A = id("aa01");
const ADMIN_B = id("bb01");
const STUDENT = id("cc01");
const ORG_RAW_A = id("a001");
const ORG_RAW_B = id("b001");
const ORG = {
    n0: id("1000"), n1: id("1001"), n4: id("1004"), n5: id("1005"),
    repeated: id("1015"), engagement2: id("2002"), engagement5: id("2005"),
};
function seed(): void {
    const orgIds = [ORG_RAW_A, ORG_RAW_B, ...Object.values(ORG)];
    sql(`
      DELETE FROM public.nps_responses WHERE organization_id = ANY(ARRAY[${orgIds.map((v) => `'${v}'::uuid`).join(",")}]);
      DELETE FROM public.engagement_events WHERE organization_id = ANY(ARRAY[${orgIds.map((v) => `'${v}'::uuid`).join(",")}]);
      DELETE FROM public.institutional_memberships WHERE organization_id = ANY(ARRAY[${orgIds.map((v) => `'${v}'::uuid`).join(",")}]);
      DELETE FROM public.organizations WHERE id = ANY(ARRAY[${orgIds.map((v) => `'${v}'::uuid`).join(",")}]);
      INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at) VALUES
        ('${ADMIN_A}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e121-admin-a@example.invalid',now(),now()),
        ('${ADMIN_B}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e121-admin-b@example.invalid',now(),now()),
        ('${STUDENT}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e121-student@example.invalid',now(),now())
      ON CONFLICT (id) DO NOTHING;
      INSERT INTO public.organizations (id,name,slug,owner_id,status)
      SELECT value::uuid, 'TRUST-1.2.1 ' || ordinality, 'e121-' || ordinality, '${ADMIN_A}', 'active'
      FROM unnest(ARRAY[${orgIds.map((v) => `'${v}'`).join(",")}]) WITH ORDINALITY AS t(value, ordinality);
      INSERT INTO public.institutional_memberships (organization_id,user_id,role,status) VALUES
        ('${ORG_RAW_A}','${ADMIN_A}','org_admin','active'),
        ('${ORG_RAW_B}','${ADMIN_B}','org_admin','active'),
        ('${ORG_RAW_A}','${STUDENT}','student','active');
      INSERT INTO public.nps_responses (organization_id,user_id,score,feedback,context,created_at)
        VALUES ('${ORG_RAW_A}','${STUDENT}',9,'feedback privado sintético','general',now()-interval '1 day');
      INSERT INTO public.engagement_events (organization_id,user_id,event_type,metadata,created_at)
        VALUES ('${ORG_RAW_A}','${STUDENT}','session_start','{"private":"synthetic"}',now()-interval '1 day');
    `);

    const contributorCounts: Array<[string, number]> = [
        [ORG.n0, 0], [ORG.n1, 1], [ORG.n4, 4], [ORG.n5, 5],
        [ORG.repeated, 5], [ORG.engagement2, 5], [ORG.engagement5, 5],
    ];
    for (const [orgId, count] of contributorCounts) {
        sql(`INSERT INTO public.institutional_memberships (organization_id,user_id,role,status)
             VALUES ('${orgId}','${ADMIN_A}','org_admin','active');
             INSERT INTO public.institutional_memberships (organization_id,user_id,role,status)
             SELECT '${orgId}', md5('${orgId}' || g::text)::uuid, 'student', 'active'
             FROM generate_series(1,${count}) g ON CONFLICT DO NOTHING;`);
    }
    for (const [orgId, count] of [[ORG.n1, 1], [ORG.n4, 4], [ORG.n5, 5]] as Array<[string, number]>) {
        sql(`INSERT INTO public.nps_responses (organization_id,user_id,score,created_at)
             SELECT '${orgId}', md5('${orgId}' || g::text)::uuid, 8 + (g % 3), now()-interval '1 day'
             FROM generate_series(1,${count}) g;`);
    }
    sql(`
      INSERT INTO public.nps_responses (organization_id,user_id,score,created_at)
      SELECT '${ORG.repeated}', md5('${ORG.repeated}' || '1')::uuid, 9, now() - (g || ' hours')::interval
      FROM generate_series(1,5) g;
      INSERT INTO public.engagement_events (organization_id,user_id,event_type,created_at)
      SELECT '${ORG.engagement2}', md5('${ORG.engagement2}' || ((g % 2)+1)::text)::uuid, 'session_start', now()-interval '1 day'
      FROM generate_series(1,20) g;
      INSERT INTO public.engagement_events (organization_id,user_id,event_type,created_at)
      SELECT '${ORG.engagement5}', md5('${ORG.engagement5}' || g::text)::uuid, 'session_start', now()-interval '1 day'
      FROM generate_series(1,5) g;
    `);
}

function analytics(orgId: string): Record<string, unknown> {
    return JSON.parse(asAuthenticated(ADMIN_A, `SELECT public.get_org_analytics_series('${orgId}')::text`)) as Record<string, unknown>;
}

function summary(orgId: string): Record<string, unknown> {
    return JSON.parse(asAuthenticated(ADMIN_A, `SELECT public.get_org_engagement_summary('${orgId}')::text`)) as Record<string, unknown>;
}

function currentNpsGroup(orgId: string): Record<string, unknown> {
    const payload = analytics(orgId);
    const rows = payload.nps as Array<{ group: Record<string, unknown> }>;
    return rows.at(-1)!.group;
}

function currentSessionGroup(orgId: string): Record<string, unknown> {
    const payload = analytics(orgId);
    const rows = payload.engagement as Array<{ sessions: Record<string, unknown> }>;
    return rows.at(-1)!.sessions;
}

if (available) beforeAll(seed);
suite("TRUST-1.2.1 / R31 — tabelas raw não são analytics institucionais", () => {
    it("org_admin não recebe nenhuma coluna raw de NPS", () => {
        expect(asAuthenticated(ADMIN_A, `SELECT coalesce(jsonb_agg(to_jsonb(n))::text,'[]') FROM public.nps_responses n WHERE organization_id='${ORG_RAW_A}'`)).toBe("[]");
    });
    it("org_admin não recebe nenhuma coluna raw de engagement", () => {
        expect(asAuthenticated(ADMIN_A, `SELECT coalesce(jsonb_agg(to_jsonb(e))::text,'[]') FROM public.engagement_events e WHERE organization_id='${ORG_RAW_A}'`)).toBe("[]");
    });
    it("self-read legítimo do estudante permanece", () => {
        expect(asAuthenticated(STUDENT, `SELECT count(*) FROM public.nps_responses WHERE user_id='${STUDENT}'`)).toBe("1");
        expect(asAuthenticated(STUDENT, `SELECT count(*) FROM public.engagement_events WHERE user_id='${STUDENT}'`)).toBe("1");
    });
    it("cross-tenant e anon não recebem linhas raw", () => {
        expect(asAuthenticated(ADMIN_B, `SELECT count(*) FROM public.nps_responses WHERE organization_id='${ORG_RAW_A}'`)).toBe("0");
        expect(() => sql(`BEGIN; SET LOCAL ROLE anon; SELECT * FROM public.nps_responses; ROLLBACK;`)).toThrow();
    });
    it("service_role conserva acesso operacional", () => {
        expect(Number(sql(`BEGIN; SET LOCAL ROLE service_role; SELECT count(*) FROM public.nps_responses WHERE organization_id='${ORG_RAW_A}'; ROLLBACK;`))).toBeGreaterThan(0);
    });
});

suite("TRUST-1.2.1 / R32 — contributor gate por bucket", () => {
    for (const [label, orgId] of [["n=1", ORG.n1], ["n=4", ORG.n4]] as const) {
        it(`${label} NPS é suprimido sem value/count`, () => {
            const group = currentNpsGroup(orgId);
            expect(group.suppressed).toBe(true);
            expect(group.value).toBeUndefined();
            expect(group.count).toBeUndefined();
        });
    }
    it("n=0 é vazio real e n=5 é divulgado", () => {
        expect(currentNpsGroup(ORG.n0)).toMatchObject({ suppressed: false, value: 0, count: 0, isEmpty: true });
        expect(currentNpsGroup(ORG.n5)).toMatchObject({ suppressed: false, count: 5, isEmpty: false });
    });
    it("cinco respostas da mesma pessoa continuam sendo um contribuidor", () => {
        expect(currentNpsGroup(ORG.repeated)).toMatchObject({ suppressed: true, reason: "below_threshold" });
        expect(summary(ORG.repeated).nps_count).toBeNull();
    });
    it("engagement semanal com 2 contribuidores e muitos eventos é suprimido", () => {
        const group = currentSessionGroup(ORG.engagement2);
        expect(group.suppressed).toBe(true);
        expect(group.value).toBeUndefined();
        expect(summary(ORG.engagement2).total_sessions).toBeNull();
    });
    it("engagement semanal com 5 contribuidores é divulgado", () => {
        expect(currentSessionGroup(ORG.engagement5)).toMatchObject({ suppressed: false, value: 5, count: 5 });
        expect(summary(ORG.engagement5).total_sessions).toBe(5);
    });
    it("buckets têm ordem determinística e payload suprimido não contém identificadores", () => {
        const payload = analytics(ORG.engagement2);
        const engagement = payload.engagement as Array<{ bucket_start: string; sessions: Record<string, unknown> }>;
        expect(engagement.map((row) => row.bucket_start)).toEqual(engagement.map((row) => row.bucket_start).slice().sort());
        const raw = JSON.stringify(payload);
        expect(raw).not.toContain("user_id");
        expect(raw).not.toContain("feedback");
        expect(raw).not.toContain("metadata");
    });
});
