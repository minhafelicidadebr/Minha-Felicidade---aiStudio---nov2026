// TRUST-1.2 / R23 â€” ARCHIVE_INSTEAD_OF_HARD_DELETE, verificado em execuÃ§Ã£o.
//
// O que a TRUST-1.5 mediu: as FKs do ledger disparam escrita na tabela
// append-only, entÃ£o apagar uma organizaÃ§Ã£o, escola ou turma com histÃ³rico de
// governanÃ§a falhava com "institutional_decision_events is append-only" â€” uma
// mensagem que nÃ£o diz nada sobre a causa. E o caminho ERA alcanÃ§Ã¡vel: a
// migration institucional concede DELETE a `authenticated` e cria policies
// `FOR ALL` para org_admin em `schools` e `classes`.
//
// DecisÃ£o: preservar a integridade referencial e o ledger. Entidade com
// histÃ³rico auditÃ¡vel Ã© ARQUIVADA, nÃ£o destruÃ­da, e a tentativa de destruir
// devolve um erro de domÃ­nio compreensÃ­vel.

import { execFileSync } from "node:child_process";
import { describe, expect, it, beforeAll } from "vitest";

const CONTAINER = "supabase_db_ctjwyybmlwhynherikqy";

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
const DB_TIMEOUT = 120_000;
const rawSuite = available ? describe : describe.skip;
const suite = (name: string, fn: () => void) => rawSuite(name, { timeout: DB_TIMEOUT }, fn);

if (!available) {
    console.warn("[ARCHIVE_RUNTIME_CONTRACT] PULADO: Postgres local indisponÃ­vel. NÃƒO passaram.");
}

function uuid(tail: string): string {
    return `a3a3a3a3-0000-4000-8000-${tail.padStart(12, "0")}`;
}

const ORG_WITH = uuid("a1");      // organizaÃ§Ã£o COM histÃ³rico
const ORG_CLEAN = uuid("a2");     // organizaÃ§Ã£o SEM histÃ³rico
const OTHER_ORG = uuid("a3");     // organizaÃ§Ã£o de outro tenant
const ADMIN = uuid("ad01");
const OTHER_ADMIN = uuid("ad02");
const SCHOOL_WITH = uuid("5a1");
const SCHOOL_CLEAN = uuid("5a2");
const CLASS_WITH = uuid("c1a1");

/**
 * Seed idempotente por `ON CONFLICT DO NOTHING`, sem prelúdio destrutivo.
 *
 * A primeira versão começava apagando as entidades para garantir estado limpo — e
 * quebrou contra a própria proteção que este arquivo testa: numa segunda execução
 * a turma já tinha histórico no ledger e o `DELETE` foi (corretamente) recusado.
 * Vale como evidência de que o gatilho funciona; e ensina que seed de teste não
 * pode assumir que consegue destruir o que criou.
 */
function seed(): void {
    sql([
        `INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at) VALUES
           ('${ADMIN}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a3-admin@example.invalid', now(), now()),
           ('${OTHER_ADMIN}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a3-other@example.invalid', now(), now())
         ON CONFLICT (id) DO NOTHING;`,
        `INSERT INTO public.organizations (id, name, slug, owner_id, status) VALUES
           ('${ORG_WITH}','Rede com historico (sintetica)','a3-with','${ADMIN}','active'),
           ('${ORG_CLEAN}','Rede sem historico (sintetica)','a3-clean','${ADMIN}','active'),
           ('${OTHER_ORG}','Rede de outro tenant (sintetica)','a3-other','${OTHER_ADMIN}','active')
         ON CONFLICT (id) DO NOTHING;`,
        `INSERT INTO public.schools (id, organization_id, name) VALUES
           ('${SCHOOL_WITH}','${ORG_WITH}','Escola com historico'),
           ('${SCHOOL_CLEAN}','${ORG_CLEAN}','Escola sem historico')
         ON CONFLICT (id) DO NOTHING;`,
        `INSERT INTO public.classes (id, school_id, name, year) VALUES
           ('${CLASS_WITH}','${SCHOOL_WITH}','Turma com historico',2026)
         ON CONFLICT (id) DO NOTHING;`,
        `INSERT INTO public.institutional_memberships (organization_id, user_id, role, status) VALUES
           ('${ORG_WITH}','${ADMIN}','org_admin','active'),
           ('${ORG_CLEAN}','${ADMIN}','org_admin','active'),
           ('${OTHER_ORG}','${OTHER_ADMIN}','org_admin','active')
         ON CONFLICT (organization_id, user_id, role) DO NOTHING;`,
        // Uma decisÃ£o de governanÃ§a referenciando escola e turma.
        `INSERT INTO public.institutional_decision_events
           (organization_id, school_id, class_id, event_type, source_entity, severity,
            reason, actor_user_id, actor_role, result)
         SELECT '${ORG_WITH}','${SCHOOL_WITH}','${CLASS_WITH}','indicator_escalation',
                'school_metrics','warning','indicator_out_of_range','${ADMIN}','org_admin','succeeded'
         WHERE NOT EXISTS (
           SELECT 1 FROM public.institutional_decision_events WHERE school_id = '${SCHOOL_WITH}'
         );`,
    ].join("\n"));
}

if (available) {
    beforeAll(seed, DB_TIMEOUT);
}

suite("R23 â€” contrato de arquivamento existe no schema", () => {
    it("schools e classes tÃªm coluna de estado com o mesmo vocabulÃ¡rio de organizations", () => {
        const out = sql(
            `SELECT table_name || ':' || column_default FROM information_schema.columns ` +
            `WHERE table_schema='public' AND column_name='status' ` +
            `AND table_name IN ('organizations','schools','classes') ORDER BY table_name;`,
        );
        expect(out).toContain("classes:'active'");
        expect(out).toContain("organizations:'active'");
        expect(out).toContain("schools:'active'");
    });

    it("o vocabulÃ¡rio de estado aceita archived e recusa valor inventado", () => {
        for (const table of ["schools", "classes"]) {
            const ok = sqlError(
                `BEGIN; UPDATE public.${table} SET status='archived' WHERE status='active'; ROLLBACK;`,
            );
            expect(ok, `arquivar ${table} deveria funcionar`).toBeNull();

            const bad = sqlError(
                `BEGIN; UPDATE public.${table} SET status='deleted' WHERE status='active'; ROLLBACK;`,
            );
            expect(bad, `${table} deveria recusar estado inventado`).toContain("check constraint");
        }
    });

    it("os trÃªs gatilhos de proteÃ§Ã£o existem", () => {
        const out = sql(
            `SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal ` +
            `AND tgname IN ('trg_organizations_no_delete_with_history',` +
            `'trg_schools_no_delete_with_history','trg_classes_no_delete_with_history');`,
        );
        expect(out).toBe("3");
    });

    it("o ledger NÃƒO usa ON DELETE CASCADE em school_id nem class_id", () => {
        const out = sql(
            `SELECT string_agg(conname || '=' || pg_get_constraintdef(oid), ' | ' ORDER BY conname) ` +
            `FROM pg_constraint WHERE conrelid='public.institutional_decision_events'::regclass AND contype='f';`,
        );
        expect(out).toContain("school_id) REFERENCES schools(id) ON DELETE SET NULL");
        expect(out).toContain("class_id) REFERENCES classes(id) ON DELETE SET NULL");
    });
});

suite("R23 â€” entidade com histÃ³rico nÃ£o Ã© destruÃ­da", () => {
    it("apagar escola com histÃ³rico devolve erro de DOMÃNIO, nÃ£o erro obscuro de FK", () => {
        const err = sqlError(`BEGIN; DELETE FROM public.schools WHERE id='${SCHOOL_WITH}'; ROLLBACK;`);
        expect(err).toBeTruthy();
        expect(err).toContain("auditable governance history");
        expect(err).toContain("cannot be deleted");
        expect(err).toContain("status = 'archived'");
        // A mensagem antiga nÃ£o deve mais ser o que a pessoa vÃª.
        expect(err).not.toContain("is append-only");
    });

    it("apagar turma com histÃ³rico devolve o mesmo erro de domÃ­nio", () => {
        const err = sqlError(`BEGIN; DELETE FROM public.classes WHERE id='${CLASS_WITH}'; ROLLBACK;`);
        expect(err).toContain("auditable governance history");
        expect(err).not.toContain("is append-only");
    });

    it("apagar organizaÃ§Ã£o com histÃ³rico devolve o mesmo erro de domÃ­nio", () => {
        const err = sqlError(`BEGIN; DELETE FROM public.organizations WHERE id='${ORG_WITH}'; ROLLBACK;`);
        expect(err).toContain("auditable governance history");
        expect(err).not.toContain("is append-only");
    });

    it("a proteÃ§Ã£o vale tambÃ©m para service_role", () => {
        const err = sqlError(
            `BEGIN; SET LOCAL ROLE service_role; DELETE FROM public.schools WHERE id='${SCHOOL_WITH}'; ROLLBACK;`,
        );
        expect(err).toContain("auditable governance history");
    });

    it("o histÃ³rico permanece legÃ­vel depois da tentativa frustrada", () => {
        sqlError(`BEGIN; DELETE FROM public.schools WHERE id='${SCHOOL_WITH}'; ROLLBACK;`);
        const out = sql(
            `SELECT count(*) FROM public.institutional_decision_events WHERE school_id='${SCHOOL_WITH}';`,
        );
        expect(Number(out)).toBeGreaterThan(0);
        // E a entidade continua lÃ¡, nÃ£o meio-apagada.
        expect(sql(`SELECT count(*) FROM public.schools WHERE id='${SCHOOL_WITH}';`)).toBe("1");
    });

    it("arquivar funciona e preserva o vÃ­nculo do histÃ³rico", () => {
        const err = sqlError(
            `BEGIN; UPDATE public.schools SET status='archived' WHERE id='${SCHOOL_WITH}'; ` +
            `SELECT count(*) FROM public.institutional_decision_events WHERE school_id='${SCHOOL_WITH}'; ROLLBACK;`,
        );
        expect(err).toBeNull();
    });

    it("entidade SEM histÃ³rico continua deletÃ¡vel â€” a proteÃ§Ã£o Ã© dirigida", () => {
        const err = sqlError(`BEGIN; DELETE FROM public.schools WHERE id='${SCHOOL_CLEAN}'; ROLLBACK;`);
        expect(err).toBeNull();
    });
});

suite("R23 â€” a proteÃ§Ã£o nÃ£o abre porta cross-tenant", () => {
    it("org_admin de outro tenant nÃ£o vÃª nem arquiva a escola alheia", () => {
        const visiveis = sql(
            `BEGIN; SET LOCAL ROLE authenticated; ` +
            `SET LOCAL request.jwt.claims = '{"sub":"${OTHER_ADMIN}","role":"authenticated"}'; ` +
            `SELECT count(*) FROM public.schools WHERE id='${SCHOOL_WITH}'; ROLLBACK;`,
        );
        expect(visiveis).toBe("0");

        // UPDATE fora do escopo nÃ£o afeta linha nenhuma (RLS filtra antes).
        const afetadas = sql(
            `BEGIN; SET LOCAL ROLE authenticated; ` +
            `SET LOCAL request.jwt.claims = '{"sub":"${OTHER_ADMIN}","role":"authenticated"}'; ` +
            `WITH x AS (UPDATE public.schools SET status='archived' WHERE id='${SCHOOL_WITH}' RETURNING 1) ` +
            `SELECT count(*) FROM x; ROLLBACK;`,
        );
        expect(afetadas).toBe("0");
    });

    it("org_admin de outro tenant nÃ£o consegue apagar a escola alheia", () => {
        const afetadas = sql(
            `BEGIN; SET LOCAL ROLE authenticated; ` +
            `SET LOCAL request.jwt.claims = '{"sub":"${OTHER_ADMIN}","role":"authenticated"}'; ` +
            `WITH x AS (DELETE FROM public.schools WHERE id='${SCHOOL_WITH}' RETURNING 1) ` +
            `SELECT count(*) FROM x; ROLLBACK;`,
        );
        // Zero linhas: a RLS nÃ£o expÃ´s a linha, entÃ£o o gatilho nem precisou agir.
        expect(afetadas).toBe("0");
    });
});


