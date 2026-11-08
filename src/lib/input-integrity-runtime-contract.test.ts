// TRUST-1.4 / R02, R11 — escrita tenant-safe em engagement_events/nps_responses,
// verificada em execução contra PostgreSQL real.
//
// O que a TRUST-1.4 mediu (RED, antes desta correção): as policies de INSERT
// criadas em 20260725100000 validavam apenas `user_id = auth.uid()`.
// `organization_id` chegava inteiramente do payload do cliente sem qualquer
// verificação de membership. Um usuário autenticado com QUALQUER conta válida
// podia gravar `engagement_events`/`nps_responses` em qualquer organização —
// data poisoning institucional, incluindo o vetor de "threshold poisoning"
// (inflar count(DISTINCT user_id) de uma organização alheia até estourar o
// k_min=5 e forçar divulgação de métrica que deveria estar suprimida).
//
// Decisão: RPC SECURITY DEFINER (record_engagement_event/submit_nps_response)
// resolve auth.uid() e valida is_org_member(_organization_id) no servidor —
// mesma forma já usada em escalate_indicator/invite_member/
// archive_institutional_entity. INSERT direto client-side é revogado.

import { execFileSync } from "node:child_process";
import { describe, expect, it, beforeAll } from "vitest";

const CONTAINER = "supabase_db_ctjwyybmlwhynherikqy";
const DB_TIMEOUT = 120_000;

function sql(statement: string): string {
    return execFileSync(
        "docker",
        ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-q", "-t", "-A", "-c", statement],
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();
}

function sqlError(statement: string): string | null {
    try {
        sql(statement);
        return null;
    } catch (e) {
        const err = e as { stderr?: string | Buffer; message?: string };
        return String(err.stderr ?? err.message ?? "");
    }
}

function localDbAvailable(): boolean {
    try {
        return Number(sql("SELECT count(*) FROM supabase_migrations.schema_migrations;")) > 0;
    } catch {
        return false;
    }
}

const available = localDbAvailable();
const rawSuite = available ? describe : describe.skip;
const suite = (name: string, fn: () => void) => rawSuite(name, { timeout: DB_TIMEOUT }, fn);

if (!available) {
    console.warn("[INPUT_INTEGRITY_RUNTIME_CONTRACT] PULADO: Postgres local indisponível. NÃO passaram.");
}

function uuid(tail: string): string {
    return `d4d4d4d4-0000-4000-8000-${tail.padStart(12, "0")}`;
}

function asUser(userId: string, statement: string): string {
    return sql(
        `BEGIN; SET LOCAL ROLE authenticated; ` +
        `SET LOCAL request.jwt.claims = '{"sub":"${userId}","role":"authenticated"}'; ` +
        `${statement}; ROLLBACK;`,
    );
}

function asUserError(userId: string, statement: string): string | null {
    return sqlError(
        `BEGIN; SET LOCAL ROLE authenticated; ` +
        `SET LOCAL request.jwt.claims = '{"sub":"${userId}","role":"authenticated"}'; ` +
        `${statement}; ROLLBACK;`,
    );
}

const ADMIN_A = uuid("aa01");   // membro ativo de ORG_A
const ADMIN_B = uuid("bb01");   // membro ativo de ORG_B
const MULTI_USER = uuid("cc01"); // membro ativo de ORG_A e ORG_B
const OUTSIDER = uuid("dd01");  // sem nenhuma membership
const ORG_A = uuid("1a01");
const ORG_B = uuid("1b01");
const ORG_ARCHIVED = uuid("1c01");
const ORG_NONEXISTENT = uuid("1d99");

function seed(): void {
    sql(`
      INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at) VALUES
        ('${ADMIN_A}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d4-admin-a@example.invalid',now(),now()),
        ('${ADMIN_B}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d4-admin-b@example.invalid',now(),now()),
        ('${MULTI_USER}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d4-multi@example.invalid',now(),now()),
        ('${OUTSIDER}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d4-outsider@example.invalid',now(),now())
      ON CONFLICT (id) DO NOTHING;
      INSERT INTO public.organizations (id,name,slug,owner_id,status) VALUES
        ('${ORG_A}','TRUST-1.4 org A','d4-org-a','${ADMIN_A}','active'),
        ('${ORG_B}','TRUST-1.4 org B','d4-org-b','${ADMIN_B}','active'),
        ('${ORG_ARCHIVED}','TRUST-1.4 org arquivada','d4-org-archived','${ADMIN_A}','archived')
      ON CONFLICT (id) DO UPDATE SET status = excluded.status;
      INSERT INTO public.institutional_memberships (organization_id,user_id,role,status) VALUES
        ('${ORG_A}','${ADMIN_A}','org_admin','active'),
        ('${ORG_B}','${ADMIN_B}','org_admin','active'),
        ('${ORG_A}','${MULTI_USER}','educator','active'),
        ('${ORG_B}','${MULTI_USER}','educator','active'),
        ('${ORG_ARCHIVED}','${ADMIN_A}','org_admin','active')
      ON CONFLICT (organization_id,user_id,role) DO UPDATE SET status = excluded.status;
    `);
}

if (available) beforeAll(seed, DB_TIMEOUT);

suite("TRUST-1.4 / R02 — record_engagement_event é tenant-safe", () => {
    it("membro grava evento na própria organização", () => {
        const out = JSON.parse(
            asUser(ADMIN_A, `SELECT public.record_engagement_event('${ORG_A}','session_start','{}')`),
        ) as { organization_id: string };
        expect(out.organization_id).toBe(ORG_A);
    });

    it("usuário multi-org grava evento em qualquer organização de sua membership", () => {
        for (const orgId of [ORG_A, ORG_B]) {
            const out = JSON.parse(
                asUser(MULTI_USER, `SELECT public.record_engagement_event('${orgId}','session_start','{}')`),
            ) as { organization_id: string };
            expect(out.organization_id).toBe(orgId);
        }
    });

    it("ATTACK — cross-tenant engagement poisoning é bloqueado", () => {
        expect(
            asUserError(ADMIN_A, `SELECT public.record_engagement_event('${ORG_B}','session_start','{}')`),
        ).toContain("Organization not available for this account");
    });

    it("usuário sem nenhuma membership é negado", () => {
        expect(
            asUserError(OUTSIDER, `SELECT public.record_engagement_event('${ORG_A}','session_start','{}')`),
        ).toContain("Organization not available for this account");
    });

    it("organização archived é negada (integra R29)", () => {
        expect(
            asUserError(ADMIN_A, `SELECT public.record_engagement_event('${ORG_ARCHIVED}','session_start','{}')`),
        ).toContain("Organization not available for this account");
    });

    it("organização inexistente é negada", () => {
        expect(
            asUserError(ADMIN_A, `SELECT public.record_engagement_event('${ORG_NONEXISTENT}','session_start','{}')`),
        ).toContain("Organization not available for this account");
    });

    it("organization_id nulo é aceito (uso individual sem organização)", () => {
        const out = JSON.parse(
            asUser(OUTSIDER, `SELECT public.record_engagement_event(NULL,'session_start','{}')`),
        ) as { organization_id: string | null };
        expect(out.organization_id).toBeNull();
    });

    it("anon não executa a RPC", () => {
        expect(sqlError(
            `BEGIN; SET LOCAL ROLE anon; SELECT public.record_engagement_event('${ORG_A}','session_start','{}'); ROLLBACK;`,
        )).toContain("permission denied for function record_engagement_event");
    });

    it("metadata não-objeto é recusado", () => {
        expect(
            asUserError(ADMIN_A, `SELECT public.record_engagement_event('${ORG_A}','session_start','[1,2,3]')`),
        ).toContain("metadata must be a JSON object");
    });

    it("metadata excessivamente grande é recusado", () => {
        const huge = "x".repeat(3000);
        expect(
            asUserError(ADMIN_A, `SELECT public.record_engagement_event('${ORG_A}','session_start','{"note":"${huge}"}')`),
        ).toContain("metadata payload too large");
    });
});

suite("TRUST-1.4 / R11 — submit_nps_response é tenant-safe", () => {
    it("membro grava NPS na própria organização", () => {
        const out = JSON.parse(
            asUser(ADMIN_A, `SELECT public.submit_nps_response(9::smallint,'${ORG_A}')`),
        ) as { organization_id: string; score: number };
        expect(out.organization_id).toBe(ORG_A);
        expect(out.score).toBe(9);
    });

    it("usuário multi-org grava NPS na organização requisitada corretamente", () => {
        const out = JSON.parse(
            asUser(MULTI_USER, `SELECT public.submit_nps_response(8::smallint,'${ORG_B}')`),
        ) as { organization_id: string };
        expect(out.organization_id).toBe(ORG_B);
    });

    it("ATTACK — cross-tenant NPS poisoning é bloqueado", () => {
        expect(
            asUserError(ADMIN_A, `SELECT public.submit_nps_response(10::smallint,'${ORG_B}')`),
        ).toContain("Organization not available for this account");
    });

    it("usuário sem nenhuma membership é negado", () => {
        expect(
            asUserError(OUTSIDER, `SELECT public.submit_nps_response(5::smallint,'${ORG_A}')`),
        ).toContain("Organization not available for this account");
    });

    it("organização archived é negada (integra R29)", () => {
        expect(
            asUserError(ADMIN_A, `SELECT public.submit_nps_response(5::smallint,'${ORG_ARCHIVED}')`),
        ).toContain("Organization not available for this account");
    });

    it("organization_id nulo é aceito (NPS sem organização)", () => {
        const out = JSON.parse(
            asUser(OUTSIDER, `SELECT public.submit_nps_response(7::smallint)`),
        ) as { organization_id: string | null };
        expect(out.organization_id).toBeNull();
    });

    it("anon não executa a RPC", () => {
        expect(sqlError(
            `BEGIN; SET LOCAL ROLE anon; SELECT public.submit_nps_response(5::smallint,'${ORG_A}'); ROLLBACK;`,
        )).toContain("permission denied for function submit_nps_response");
    });

    it("score fora do range é recusado pelo CHECK constraint existente", () => {
        expect(
            asUserError(ADMIN_A, `SELECT public.submit_nps_response(11::smallint,'${ORG_A}')`),
        ).toContain("nps_responses_score_check");
    });

    it("feedback oversized é recusado", () => {
        const huge = "x".repeat(2500);
        expect(
            asUserError(ADMIN_A, `SELECT public.submit_nps_response(5::smallint,'${ORG_A}','${huge}')`),
        ).toContain("feedback exceeds maximum length");
    });
});

suite("TRUST-1.4 — direct INSERT client-side está fechado", () => {
    it("authenticated não tem mais privilégio de INSERT direto em engagement_events", () => {
        expect(sql(
            `SELECT has_table_privilege('authenticated','public.engagement_events','INSERT');`,
        )).toBe("f");
    });

    it("authenticated não tem mais privilégio de INSERT direto em nps_responses", () => {
        expect(sql(
            `SELECT has_table_privilege('authenticated','public.nps_responses','INSERT');`,
        )).toBe("f");
    });

    it("nenhuma policy de INSERT resta nestas tabelas para authenticated", () => {
        expect(sql(
            `SELECT count(*) FROM pg_policies WHERE schemaname='public' ` +
            `AND tablename IN ('engagement_events','nps_responses') AND cmd='INSERT';`,
        )).toBe("0");
    });

    it("ATTACK — INSERT direto com organization_id arbitrário é negado por GRANT, não só RLS", () => {
        expect(
            asUserError(ADMIN_A, `INSERT INTO public.engagement_events (user_id, organization_id, event_type) VALUES ('${ADMIN_A}','${ORG_B}','session_start')`),
        ).toContain("permission denied for table engagement_events");
        expect(
            asUserError(ADMIN_A, `INSERT INTO public.nps_responses (user_id, organization_id, score) VALUES ('${ADMIN_A}','${ORG_B}',10)`),
        ).toContain("permission denied for table nps_responses");
    });

    it("user_id spoof continua bloqueado mesmo que INSERT fosse permitido (defesa em profundidade da RPC)", () => {
        // A RPC nunca aceita user_id do chamador — não há parâmetro para isso.
        // Confirma que a assinatura da função não expõe user_id como argumento.
        const args = sql(
            `SELECT pg_get_function_arguments(oid) FROM pg_proc WHERE proname='record_engagement_event';`,
        );
        expect(args).not.toContain("user_id");
        expect(args).not.toContain("_user_id");
    });

    it("SECURITY DEFINER novas têm search_path e grants mínimos", () => {
        for (const fn of ["record_engagement_event", "submit_nps_response"]) {
            const metadata = sql(
                `SELECT prosecdef || '|' || coalesce(array_to_string(proconfig,','),'') ` +
                `FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace ` +
                `WHERE n.nspname='public' AND p.proname='${fn}' ORDER BY p.oid DESC LIMIT 1;`,
            );
            expect(metadata, fn).toBe("true|search_path=public");
        }
        expect(sql(
            `SELECT has_function_privilege('anon','public.record_engagement_event(uuid,text,jsonb)','EXECUTE') || '|' || ` +
            `has_function_privilege('authenticated','public.record_engagement_event(uuid,text,jsonb)','EXECUTE') || '|' || ` +
            `has_function_privilege('anon','public.submit_nps_response(smallint,uuid,text,text)','EXECUTE') || '|' || ` +
            `has_function_privilege('authenticated','public.submit_nps_response(smallint,uuid,text,text)','EXECUTE');`,
        )).toBe("false|true|false|true");
    });
});

suite("TRUST-1.4 — threshold poisoning (4→5) permanece bloqueado após a correção", () => {
    const THRESHOLD_ORG = uuid("2e01");
    const THRESHOLD_ADMIN = uuid("ee01");
    const ATTACKER = uuid("ee02");

    beforeAll(() => {
        sql(`
          INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at) VALUES
            ('${THRESHOLD_ADMIN}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d4-threshold-admin@example.invalid',now(),now()),
            ('${ATTACKER}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d4-attacker@example.invalid',now(),now())
          ON CONFLICT (id) DO NOTHING;
          INSERT INTO public.organizations (id,name,slug,owner_id,status) VALUES
            ('${THRESHOLD_ORG}','TRUST-1.4 threshold org','d4-threshold','${THRESHOLD_ADMIN}','active')
          ON CONFLICT (id) DO UPDATE SET status = excluded.status;
          INSERT INTO public.institutional_memberships (organization_id,user_id,role,status) VALUES
            ('${THRESHOLD_ORG}','${THRESHOLD_ADMIN}','org_admin','active')
          ON CONFLICT (organization_id,user_id,role) DO UPDATE SET status = excluded.status;
          DELETE FROM public.nps_responses WHERE organization_id = '${THRESHOLD_ORG}';
          -- 4 contribuidores legítimos distintos, abaixo do k_min=5.
          INSERT INTO public.nps_responses (organization_id,user_id,score,created_at)
          SELECT '${THRESHOLD_ORG}', md5('${THRESHOLD_ORG}' || g::text)::uuid, 8, now() - interval '1 day'
          FROM generate_series(1,4) g;
        `, );
    }, DB_TIMEOUT);

    it("com 4 contribuidores legítimos, NPS está suprimido antes do ataque", () => {
        const summary = JSON.parse(
            asUser(THRESHOLD_ADMIN, `SELECT public.get_org_engagement_summary('${THRESHOLD_ORG}')`),
        ) as { nps_count: number | null };
        expect(summary.nps_count).toBeNull();
    });

    it("ATTACK — atacante sem membership tentando inflar 4→5 é bloqueado pela RPC", () => {
        expect(
            asUserError(ATTACKER, `SELECT public.submit_nps_response(10::smallint,'${THRESHOLD_ORG}')`),
        ).toContain("Organization not available for this account");
    });

    it("depois do ataque bloqueado, a organização continua com 4 contribuidores e suprimida", () => {
        const count = sql(
            `SELECT count(DISTINCT user_id) FROM public.nps_responses WHERE organization_id = '${THRESHOLD_ORG}';`,
        );
        expect(count).toBe("4");
        const summary = JSON.parse(
            asUser(THRESHOLD_ADMIN, `SELECT public.get_org_engagement_summary('${THRESHOLD_ORG}')`),
        ) as { nps_count: number | null };
        expect(summary.nps_count).toBeNull();
    });
});
