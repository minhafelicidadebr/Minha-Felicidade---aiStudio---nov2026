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



// TRUST-1.3 / DB-R29 — visibilidade operacional respeita ciclo de vida.
const R29_ADMIN = uuid("b001");
const R29_OTHER_ADMIN = uuid("b002");
const R29_SCHOOL_ADMIN = uuid("b003");
const R29_MEMBER = uuid("b004");
const R29_OUTSIDER = uuid("b005");
const R29_ORG_ACTIVE = uuid("b101");
const R29_ORG_ARCHIVED = uuid("b102");
const R29_ORG_SUSPENDED = uuid("b103");
const R29_ORG_OTHER = uuid("b104");
const R29_SCHOOL_ACTIVE = uuid("b201");
const R29_SCHOOL_SIBLING = uuid("b202");
const R29_SCHOOL_ARCHIVED = uuid("b203");
const R29_SCHOOL_SUSPENDED = uuid("b204");
const R29_SCHOOL_ARCHIVED_ORG = uuid("b205");
const R29_SCHOOL_OTHER = uuid("b206");
const R29_CLASS_ACTIVE = uuid("b301");
const R29_CLASS_ARCHIVED = uuid("b302");
const R29_CLASS_SUSPENDED = uuid("b303");
const R29_CLASS_ARCHIVED_SCHOOL = uuid("b304");

function asR29User(userId: string, statement: string): string {
    return sql(
        `BEGIN; SET LOCAL ROLE authenticated; ` +
        `SET LOCAL request.jwt.claims = '{"sub":"${userId}","role":"authenticated"}'; ` +
        `${statement}; ROLLBACK;`,
    );
}

function asR29UserError(userId: string, statement: string): string | null {
    return sqlError(
        `BEGIN; SET LOCAL ROLE authenticated; ` +
        `SET LOCAL request.jwt.claims = '{"sub":"${userId}","role":"authenticated"}'; ` +
        `${statement}; ROLLBACK;`,
    );
}

function seedR29(): void {
    sql(`
      INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at) VALUES
        ('${R29_ADMIN}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','r29-admin@example.invalid',now(),now()),
        ('${R29_OTHER_ADMIN}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','r29-other@example.invalid',now(),now()),
        ('${R29_SCHOOL_ADMIN}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','r29-school@example.invalid',now(),now()),
        ('${R29_MEMBER}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','r29-member@example.invalid',now(),now()),
        ('${R29_OUTSIDER}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','r29-outsider@example.invalid',now(),now())
      ON CONFLICT (id) DO NOTHING;
      INSERT INTO public.organizations (id,name,slug,owner_id,status) VALUES
        ('${R29_ORG_ACTIVE}','R29 ativa','r29-active','${R29_ADMIN}','active'),
        ('${R29_ORG_ARCHIVED}','R29 arquivada','r29-archived','${R29_ADMIN}','archived'),
        ('${R29_ORG_SUSPENDED}','R29 suspensa','r29-suspended','${R29_ADMIN}','suspended'),
        ('${R29_ORG_OTHER}','R29 outro tenant','r29-other','${R29_OTHER_ADMIN}','active')
      ON CONFLICT (id) DO UPDATE SET status=excluded.status;
      INSERT INTO public.schools (id,organization_id,name,status) VALUES
        ('${R29_SCHOOL_ACTIVE}','${R29_ORG_ACTIVE}','R29 escola ativa','active'),
        ('${R29_SCHOOL_SIBLING}','${R29_ORG_ACTIVE}','R29 escola irmã','active'),
        ('${R29_SCHOOL_ARCHIVED}','${R29_ORG_ACTIVE}','R29 escola arquivada','archived'),
        ('${R29_SCHOOL_SUSPENDED}','${R29_ORG_ACTIVE}','R29 escola suspensa','suspended'),
        ('${R29_SCHOOL_ARCHIVED_ORG}','${R29_ORG_ARCHIVED}','R29 escola em org arquivada','active'),
        ('${R29_SCHOOL_OTHER}','${R29_ORG_OTHER}','R29 escola alheia','active')
      ON CONFLICT (id) DO UPDATE SET status=excluded.status;
      INSERT INTO public.classes (id,school_id,name,year,status) VALUES
        ('${R29_CLASS_ACTIVE}','${R29_SCHOOL_ACTIVE}','R29 turma ativa',2026,'active'),
        ('${R29_CLASS_ARCHIVED}','${R29_SCHOOL_ACTIVE}','R29 turma arquivada',2026,'archived'),
        ('${R29_CLASS_SUSPENDED}','${R29_SCHOOL_ACTIVE}','R29 turma suspensa',2026,'suspended'),
        ('${R29_CLASS_ARCHIVED_SCHOOL}','${R29_SCHOOL_ARCHIVED}','R29 turma em escola arquivada',2026,'active')
      ON CONFLICT (id) DO UPDATE SET status=excluded.status;
      INSERT INTO public.institutional_memberships
        (organization_id,user_id,role,school_id,status) VALUES
        ('${R29_ORG_ACTIVE}','${R29_ADMIN}','org_admin',NULL,'active'),
        ('${R29_ORG_ARCHIVED}','${R29_ADMIN}','org_admin',NULL,'active'),
        ('${R29_ORG_SUSPENDED}','${R29_ADMIN}','org_admin',NULL,'active'),
        ('${R29_ORG_OTHER}','${R29_OTHER_ADMIN}','org_admin',NULL,'active'),
        ('${R29_ORG_ACTIVE}','${R29_SCHOOL_ADMIN}','school_admin','${R29_SCHOOL_ACTIVE}','active'),
        ('${R29_ORG_ACTIVE}','${R29_MEMBER}','educator',NULL,'active')
      ON CONFLICT (organization_id,user_id,role) DO UPDATE
        SET status=excluded.status, school_id=excluded.school_id;
    `);
}

suite("TRUST-1.3 / R29 — entidades inativas somem da operação", () => {
    beforeAll(seedR29, DB_TIMEOUT);

    it("authenticated vê somente organization active, inclusive quando é org_admin", () => {
        const ids = [R29_ORG_ACTIVE, R29_ORG_ARCHIVED, R29_ORG_SUSPENDED];
        const out = asR29User(
            R29_ADMIN,
            `SELECT coalesce(string_agg(id::text,',' ORDER BY id::text),'') FROM public.organizations ` +
            `WHERE id = ANY(ARRAY[${ids.map((id) => `'${id}'::uuid`).join(",")}])`,
        );
        expect(out).toBe(R29_ORG_ACTIVE);
    });

    it("authenticated vê somente schools/classes active sob ancestrais active", () => {
        const schools = asR29User(
            R29_MEMBER,
            `SELECT coalesce(string_agg(id::text,',' ORDER BY id::text),'') FROM public.schools ` +
            `WHERE id::text LIKE 'a3a3a3a3-0000-4000-8000-00000000b2%'`,
        );
        expect(schools.split(",").sort()).toEqual([R29_SCHOOL_ACTIVE, R29_SCHOOL_SIBLING].sort());

        const classes = asR29User(
            R29_MEMBER,
            `SELECT coalesce(string_agg(id::text,',' ORDER BY id::text),'') FROM public.classes ` +
            `WHERE id::text LIKE 'a3a3a3a3-0000-4000-8000-00000000b3%'`,
        );
        expect(classes).toBe(R29_CLASS_ACTIVE);
    });

    it("is_org_admin/is_org_member são operacionais; lifecycle continua autorizando arquivamento", () => {
        const out = asR29User(
            R29_ADMIN,
            `SELECT public.is_org_admin('${R29_ORG_ACTIVE}') || '|' || ` +
            `public.is_org_admin('${R29_ORG_ARCHIVED}') || '|' || ` +
            `public.is_org_member('${R29_ORG_SUSPENDED}') || '|' || ` +
            `public.is_org_lifecycle_admin('${R29_ORG_ARCHIVED}')`,
        );
        expect(out).toBe("true|false|false|true");
    });

    it("org_admin arquiva organization/school/class por RPC sem SELECT de archived", () => {
        for (const [entity, id] of [
            ["organization", R29_ORG_ACTIVE],
            ["school", R29_SCHOOL_ACTIVE],
            ["class", R29_CLASS_ACTIVE],
        ] as const) {
            const result = asR29User(
                R29_ADMIN,
                `SELECT public.archive_institutional_entity('${entity}','${id}')->>'archived'`,
            );
            expect(result, `org_admin deveria arquivar ${entity}`).toBe("true");
        }
    });

    it("preserva o ledger e o vínculo histórico ao arquivar", () => {
        const before = sql(`SELECT count(*) FROM public.institutional_decision_events WHERE school_id='${SCHOOL_WITH}';`);
        expect(Number(before)).toBeGreaterThan(0);
        expect(asR29User(
            ADMIN,
            `SELECT public.archive_institutional_entity('school','${SCHOOL_WITH}')->>'archived'`,
        )).toBe("true");
        const after = sql(`SELECT count(*) FROM public.institutional_decision_events WHERE school_id='${SCHOOL_WITH}';`);
        expect(after).toBe(before);
    });

    it("nenhuma policy FOR ALL reexpõe archived em organizations/schools/classes", () => {
        expect(sql(
            `SELECT count(*) FROM pg_policies WHERE schemaname='public' ` +
            `AND tablename IN ('organizations','schools','classes') AND cmd='ALL';`,
        )).toBe("0");
    });
});

suite("TRUST-1.3 / R29 — métricas e escopos negam entidades inativas", () => {
    beforeAll(seedR29, DB_TIMEOUT);

    it("can_read_school exige organization e school active", () => {
        const out = asR29User(
            R29_ADMIN,
            `SELECT public.can_read_school('${R29_SCHOOL_ACTIVE}') || '|' || ` +
            `public.can_read_school('${R29_SCHOOL_ARCHIVED}') || '|' || ` +
            `public.can_read_school('${R29_SCHOOL_SUSPENDED}') || '|' || ` +
            `public.can_read_school('${R29_SCHOOL_ARCHIVED_ORG}')`,
        );
        expect(out).toBe("true|false|false|false");
    });

    it("school_admin lê métricas só da escola vinculada", () => {
        const own = JSON.parse(asR29User(
            R29_SCHOOL_ADMIN,
            `SELECT public.get_school_metrics('${R29_SCHOOL_ACTIVE}','30d')::text`,
        )) as { school_id: string };
        expect(own.school_id).toBe(R29_SCHOOL_ACTIVE);
        expect(asR29UserError(
            R29_SCHOOL_ADMIN,
            `SELECT public.get_school_metrics('${R29_SCHOOL_SIBLING}','30d')`,
        )).toContain("School not available for this account");
    });

    it("get_school_metrics omite classes archived e suspended", () => {
        const payload = JSON.parse(asR29User(
            R29_ADMIN,
            `SELECT public.get_school_metrics('${R29_SCHOOL_ACTIVE}','30d')::text`,
        )) as { classes: Array<{ key: string }> };
        expect(payload.classes.map((entry) => entry.key)).toEqual([R29_CLASS_ACTIVE]);
    });

    it("get_school_metrics usa a mesma negativa para archived, suspended, cross-tenant, sem membership e id inválido", () => {
        const invalid = uuid("b999");
        const scenarios: Array<[string, string, string]> = [
            ["school archived", R29_ADMIN, R29_SCHOOL_ARCHIVED],
            ["school suspended", R29_ADMIN, R29_SCHOOL_SUSPENDED],
            ["org archived", R29_ADMIN, R29_SCHOOL_ARCHIVED_ORG],
            ["cross-tenant", R29_OTHER_ADMIN, R29_SCHOOL_ACTIVE],
            ["sem membership", R29_OUTSIDER, R29_SCHOOL_ACTIVE],
            ["id inválido", R29_ADMIN, invalid],
        ];
        for (const [label, userId, schoolId] of scenarios) {
            expect(
                asR29UserError(userId, `SELECT public.get_school_metrics('${schoolId}','30d')`),
                label,
            ).toContain("School not available for this account");
        }
    });

    it("anon não executa métricas nem lê tabelas institucionais", () => {
        expect(sqlError(
            `BEGIN; SET LOCAL ROLE anon; SELECT public.get_school_metrics('${R29_SCHOOL_ACTIVE}','30d'); ROLLBACK;`,
        )).toContain("permission denied for function get_school_metrics");
        expect(sqlError(
            `BEGIN; SET LOCAL ROLE anon; SELECT * FROM public.organizations; ROLLBACK;`,
        )).toContain("permission denied for table organizations");
    });

    it("analytics e summary negam organization archived sem redeclarar seus corpos", () => {
        for (const rpc of ["get_org_analytics_series", "get_org_engagement_summary"]) {
            expect(asR29UserError(
                R29_ADMIN,
                `SELECT public.${rpc}('${R29_ORG_ARCHIVED}')`,
            )).toContain("Organization not available for this account");
        }
    });

    it("SECURITY DEFINER novas/substituídas têm search_path e grants mínimos", () => {
        const functions = [
            "is_org_lifecycle_admin", "is_org_admin", "is_org_member",
            "is_school_lifecycle_admin", "can_read_school", "get_school_metrics",
            "archive_institutional_entity",
        ];
        for (const fn of functions) {
            const metadata = sql(
                `SELECT prosecdef || '|' || coalesce(array_to_string(proconfig,','),'') ` +
                `FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace ` +
                `WHERE n.nspname='public' AND p.proname='${fn}' ORDER BY p.oid DESC LIMIT 1;`,
            );
            expect(metadata, fn).toBe("true|search_path=public");
        }
        expect(sql(
            `SELECT has_function_privilege('anon','public.get_school_metrics(uuid,text)','EXECUTE') || '|' || ` +
            `has_function_privilege('authenticated','public.get_school_metrics(uuid,text)','EXECUTE') || '|' || ` +
            `has_function_privilege('authenticated','public.get_school_metrics_r29_base(uuid,text)','EXECUTE') || '|' || ` +
            `has_function_privilege('anon','public.archive_institutional_entity(text,uuid)','EXECUTE') || '|' || ` +
            `has_function_privilege('authenticated','public.archive_institutional_entity(text,uuid)','EXECUTE');`,
        )).toBe("false|true|false|false|true");
    });
});

suite("TRUST-1.3 / R29 — RPC de arquivamento é tenant-scoped", () => {
    beforeAll(seedR29, DB_TIMEOUT);

    it("cross-tenant, sem membership e id inexistente recebem a mesma negativa", () => {
        for (const [label, userId, entityId] of [
            ["cross-tenant", R29_OTHER_ADMIN, R29_SCHOOL_ACTIVE],
            ["sem membership", R29_OUTSIDER, R29_SCHOOL_ACTIVE],
            ["id inexistente", R29_ADMIN, uuid("beef")],
        ] as const) {
            expect(
                asR29UserError(
                    userId,
                    `SELECT public.archive_institutional_entity('school','${entityId}')`,
                ),
                label,
            ).toContain("Institutional entity not available for this account");
        }
    });

    it("anon não executa a RPC de arquivamento", () => {
        expect(sqlError(
            `BEGIN; SET LOCAL ROLE anon; ` +
            `SELECT public.archive_institutional_entity('school','${R29_SCHOOL_ACTIVE}'); ROLLBACK;`,
        )).toContain("permission denied for function archive_institutional_entity");
    });
});
