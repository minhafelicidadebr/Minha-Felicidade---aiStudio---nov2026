// TRUST-1.5 â€” RPC_RUNTIME_CONTRACT
//
// POR QUE ESTE ARQUIVO EXISTE
//
// O R20 provou que invariante de texto nÃ£o basta. `resend_invitation` passava em
// todos os testes que LIAM o SQL e falhava em toda invocaÃ§Ã£o real, porque
// `digest()` nÃ£o resolvia com `search_path = public`. Nenhuma leitura estÃ¡tica
// pegaria isso â€” sÃ³ execuÃ§Ã£o.
//
// Regra permanente da TRUST-1: toda RPC P0/P1 tem pelo menos um contrato de
// runtime executado contra PostgreSQL real.
//
// HONESTIDADE SOBRE O ALCANCE
//
// Estes testes exigem o stack Supabase local em Docker. Quando ele nÃ£o estÃ¡
// disponÃ­vel â€” no CI do GitHub Actions, por exemplo â€” eles sÃ£o PULADOS, nÃ£o
// falsamente aprovados. O `describe.skip` imprime o motivo. Isso Ã© dÃ­vida
// registrada (R25): o gate do CI nÃ£o executa contrato de runtime.

import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const CONTAINER = "supabase_db_ctjwyybmlwhynherikqy";

/** Executa SQL no Postgres local. Devolve stdout cru. */
function sql(statement: string): string {
    return execFileSync(
        "docker",
        ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-F", "|", "-c", statement],
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();
}

/** Executa e devolve o erro do Postgres, ou null se nÃ£o houve erro. */
function sqlExpectError(statement: string): string | null {
    try {
        sql(statement);
        return null;
    } catch (e) {
        const err = e as { stderr?: string | Buffer; message?: string };
        return String(err.stderr ?? err.message ?? "");
    }
}

/** O stack local estÃ¡ de pÃ© e com as migrations aplicadas? */
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
    console.warn(
        "[RPC_RUNTIME_CONTRACT] PULADO: Postgres local indisponÃ­vel. " +
        "Rode `npx supabase start` para executar os contratos de runtime. " +
        "Estes testes NÃƒO passaram â€” foram pulados (R25).",
    );
}

// Identidades sintÃ©ticas. Nenhum dado real. Sufixo `.invalid` Ã© reservado (RFC 2606).
const ADMIN_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const OUTSIDER = "cccccccc-0000-4000-8000-00000000000c";
const ORG_A = "11111111-0000-4000-8000-000000000001";
const SCHOOL_A = "1111aaaa-0000-4000-8000-000000000001";

/** Roda um bloco como `authenticated` com o `sub` informado, em transaÃ§Ã£o descartada. */
function asUser(uid: string, body: string): string {
    return sql(
        `BEGIN; SET LOCAL ROLE authenticated; ` +
        `SET LOCAL request.jwt.claims = '{"sub":"${uid}","role":"authenticated"}'; ` +
        `${body} ROLLBACK;`,
    );
}

function asUserExpectError(uid: string, body: string): string | null {
    return sqlExpectError(
        `BEGIN; SET LOCAL ROLE authenticated; ` +
        `SET LOCAL request.jwt.claims = '{"sub":"${uid}","role":"authenticated"}'; ` +
        `${body} ROLLBACK;`,
    );
}

suite("RPC_RUNTIME_CONTRACT â€” resoluÃ§Ã£o de funÃ§Ã£o e search_path", () => {
    // Este Ã© o teste que teria pego o R20 no dia em que ele nasceu.
    const RPCS = [
        "resend_invitation",
        "get_school_metrics",
        "escalate_indicator",
        "get_institutional_decision_events",
        "get_org_engagement_summary",
        "get_org_analytics_series",
    ];

    for (const fn of RPCS) {
        it(`${fn} existe, Ã© SECURITY DEFINER e tem search_path pinado`, () => {
            const out = sql(
                `SELECT p.prosecdef, array_to_string(p.proconfig,',') FROM pg_proc p ` +
                `JOIN pg_namespace n ON n.oid=p.pronamespace ` +
                `WHERE n.nspname='public' AND p.proname='${fn}';`,
            );
            expect(out, `${fn} nÃ£o existe no schema aplicado`).not.toBe("");
            const [secdef, config] = out.split("|");
            expect(secdef).toBe("t");
            expect(config).toContain("search_path=public");
        });

        it(`${fn} resolve todas as funÃ§Ãµes que chama (nenhum "does not exist")`, () => {
            // `pg_get_functiondef` + validaÃ§Ã£o do corpo por recompilaÃ§Ã£o: se o
            // corpo referenciar objeto irresolvÃ­vel pelo search_path pinado, o
            // erro sÃ³ aparece em execuÃ§Ã£o. Aqui forÃ§amos a validaÃ§Ã£o do plano de
            // cada instruÃ§Ã£o do corpo pelo prÃ³prio Postgres.
            // Em transaÃ§Ã£o com ROLLBACK: a recompilaÃ§Ã£o Ã© o teste, mas nÃ£o deve
            // deixar efeito no banco. Sem isso, o `CREATE OR REPLACE` seria uma
            // mutaÃ§Ã£o real e a suÃ­te deixaria de ser somente leitura.
            const out = sql(
                `BEGIN; SET LOCAL check_function_bodies = on; ` +
                `DO $v$ DECLARE d text; BEGIN ` +
                `SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p ` +
                `JOIN pg_namespace n ON n.oid=p.pronamespace ` +
                `WHERE n.nspname='public' AND p.proname='${fn}'; ` +
                `EXECUTE d; END $v$; SELECT 'recompilada'; ROLLBACK;`,
            );
            expect(out).toContain("recompilada");
        });
    }

    it("nenhuma chamada a pgcrypto fica sem schema no corpo aplicado (R20)", () => {
        const out = sql(
            `SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace ` +
            `WHERE n.nspname='public' AND p.prosecdef ` +
            `AND pg_get_functiondef(p.oid) ~ '[^.[:alnum:]_](digest|gen_random_bytes|crypt|hmac)[[:space:]]*\\(';`,
        );
        expect(out).toBe("0");
    });
});

suite("RPC_RUNTIME_CONTRACT â€” resend_invitation (R20)", () => {
    it("resolve digest e chega na verificaÃ§Ã£o de escopo, em vez de estourar", () => {
        // Antes do R20 o erro era 'function digest(text, unknown) does not exist'.
        // Agora, para um convite inexistente, a negativa esperada Ã© de escopo.
        const err = asUserExpectError(
            ADMIN_A,
            `SELECT public.resend_invitation('00000000-0000-4000-8000-0000000000ff');`,
        );
        expect(err).toBeTruthy();
        expect(err).not.toContain("does not exist");
        expect(err).toContain("Invitation not available for this account");
    });

    it("nÃ£o Ã© executÃ¡vel por anon", () => {
        const err = sqlExpectError(
            `BEGIN; SET LOCAL ROLE anon; SELECT public.resend_invitation('00000000-0000-4000-8000-0000000000ff'); ROLLBACK;`,
        );
        expect(err).toContain("permission denied for function resend_invitation");
    });
});

suite("RPC_RUNTIME_CONTRACT â€” get_school_metrics", () => {
    it("nega escola fora do escopo com 42501", () => {
        const err = asUserExpectError(OUTSIDER, `SELECT public.get_school_metrics('${SCHOOL_A}','30d');`);
        expect(err).toContain("School not available for this account");
    });

    it("rejeita perÃ­odo fora do vocabulÃ¡rio", () => {
        const err = asUserExpectError(OUTSIDER, `SELECT public.get_school_metrics('${SCHOOL_A}','1y');`);
        expect(err).toContain("Invalid period");
    });

    it("nÃ£o referencia colunas inexistentes em engagement_events", () => {
        const out = sql(
            `SELECT position('e.school_id' in pg_get_functiondef(p.oid)) + ` +
            `position('e.class_id' in pg_get_functiondef(p.oid)) ` +
            `FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace ` +
            `WHERE n.nspname='public' AND p.proname='get_school_metrics';`,
        );
        expect(out).toBe("0");
    });

    it("nÃ£o Ã© executÃ¡vel por anon", () => {
        const err = sqlExpectError(
            `BEGIN; SET LOCAL ROLE anon; SELECT public.get_school_metrics('${SCHOOL_A}','30d'); ROLLBACK;`,
        );
        expect(err).toContain("permission denied for function get_school_metrics");
    });
});

suite("RPC_RUNTIME_CONTRACT â€” escalate_indicator", () => {
    it("nega organizaÃ§Ã£o fora do escopo", () => {
        const err = asUserExpectError(
            OUTSIDER,
            `SELECT public.escalate_indicator('${ORG_A}','${SCHOOL_A}','engagement','warning');`,
        );
        expect(err).toContain("Organization not available for this account");
    });

    it("nÃ£o Ã© executÃ¡vel por anon", () => {
        const err = sqlExpectError(
            `BEGIN; SET LOCAL ROLE anon; ` +
            `SELECT public.escalate_indicator('${ORG_A}','${SCHOOL_A}','engagement','warning'); ROLLBACK;`,
        );
        expect(err).toContain("permission denied for function escalate_indicator");
    });
});

suite("RPC_RUNTIME_CONTRACT â€” get_institutional_decision_events (R21)", () => {
    it("o ledger NÃƒO Ã© legÃ­vel diretamente pela API", () => {
        const out = sql(
            `SELECT has_table_privilege('anon','public.institutional_decision_events','SELECT'), ` +
            `has_table_privilege('authenticated','public.institutional_decision_events','SELECT'), ` +
            `has_table_privilege('anon','public.institutional_decision_events','INSERT'), ` +
            `has_table_privilege('authenticated','public.institutional_decision_events','INSERT');`,
        );
        expect(out).toBe("f|f|f|f");
    });

    it("a policy inerte de leitura direta nÃ£o existe mais", () => {
        const out = sql(
            `SELECT count(*) FROM pg_policies WHERE schemaname='public' ` +
            `AND tablename='institutional_decision_events';`,
        );
        expect(out).toBe("0");
    });

    it("os gatilhos append-only continuam de pÃ©", () => {
        const out = sql(
            `SELECT count(*) FROM pg_trigger WHERE tgrelid='public.institutional_decision_events'::regclass ` +
            `AND NOT tgisinternal;`,
        );
        expect(out).toBe("2");
    });

    it("nega organizaÃ§Ã£o fora do escopo", () => {
        const err = asUserExpectError(OUTSIDER, `SELECT public.get_institutional_decision_events('${ORG_A}');`);
        expect(err).toContain("Organization not available for this account");
    });

    it("organizaÃ§Ã£o inexistente devolve a MESMA negativa (nÃ£o serve de sonda)", () => {
        const inexistente = asUserExpectError(
            OUTSIDER,
            `SELECT public.get_institutional_decision_events('99999999-0000-4000-8000-000000000099');`,
        );
        const foraDeEscopo = asUserExpectError(
            OUTSIDER,
            `SELECT public.get_institutional_decision_events('${ORG_A}');`,
        );
        expect(inexistente).toContain("Organization not available for this account");
        expect(foraDeEscopo).toContain("Organization not available for this account");
    });

    it("NULL de organizaÃ§Ã£o Ã© negado, nÃ£o tratado como curinga", () => {
        const err = asUserExpectError(OUTSIDER, `SELECT public.get_institutional_decision_events(NULL);`);
        expect(err).toContain("Organization not available for this account");
    });

    it("nÃ£o Ã© executÃ¡vel por anon", () => {
        const err = sqlExpectError(
            `BEGIN; SET LOCAL ROLE anon; SELECT public.get_institutional_decision_events('${ORG_A}'); ROLLBACK;`,
        );
        expect(err).toContain("permission denied for function get_institutional_decision_events");
    });

    it("a projeÃ§Ã£o nÃ£o expÃµe recipient_hash, idempotency_key nem metadata cru", () => {
        // Verificado no corpo aplicado: a projeÃ§Ã£o Ã© fechada por construÃ§Ã£o.
        const def = sql(
            `SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace ` +
            `WHERE n.nspname='public' AND p.proname='get_institutional_decision_events';`,
        );
        // `recipient_hash` nÃ£o aparece em nenhuma coluna selecionada.
        const projection = def.slice(def.indexOf("SELECT\n      e.id"), def.indexOf("FROM public.institutional_decision_events e"));
        expect(projection).not.toContain("recipient_hash");
        expect(projection).not.toContain("idempotency_key");
        expect(projection).not.toMatch(/e\.metadata\s*(,|$)/m);
    });

    it("os tetos de paginaÃ§Ã£o sÃ£o resolvidos no servidor", () => {
        const def = sql(
            `SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace ` +
            `WHERE n.nspname='public' AND p.proname='get_institutional_decision_events';`,
        );
        expect(def).toContain("_max_limit  constant integer := 100");
        expect(def).toContain("_max_days   constant integer := 180");
        expect(def).toContain("least(greatest(coalesce(_limit, 50), 1), _max_limit)");
        // OrdenaÃ§Ã£o determinÃ­stica nos dois nÃ­veis: pÃ¡gina e resultado.
        expect(def).toContain("ORDER BY p.created_at DESC, p.id DESC");
        expect(def).toContain("ORDER BY e.created_at DESC, e.id DESC");
    });
});

