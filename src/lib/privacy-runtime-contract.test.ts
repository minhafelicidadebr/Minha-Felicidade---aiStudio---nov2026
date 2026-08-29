// TRUST-1.2 â€” PRIVACY_RUNTIME_CONTRACT
//
// Privacidade verificada contra PostgreSQL real, na RESPOSTA SERIALIZADA.
//
// Por que nÃ£o basta testar o objeto interno: o risco Ã© o valor TRAFEGAR. Um
// nÃºmero escondido na tela mas presente no JSON vaza em DevTools, em log de
// rede, em cache de proxy e em export. Por isso quase todo caso abaixo inspeciona
// o payload serializado inteiro, nÃ£o campos escolhidos.
//
// O limiar canÃ´nico NÃƒO Ã© escrito aqui. Ã‰ lido do servidor
// (`metric_minimum_group_size()`), como manda o mÃ³dulo de privacidade.
//
// Onde nÃ£o hÃ¡ Docker estes testes sÃ£o PULADOS com aviso, nunca aprovados por
// omissÃ£o. Em CI o job `runtime-db` sobe o stack e a ausÃªncia dele falha o job.

import { execFileSync } from "node:child_process";
import { describe, expect, it, beforeAll } from "vitest";

const CONTAINER = "supabase_db_ctjwyybmlwhynherikqy";

function sql(statement: string): string {
    return execFileSync(
        "docker",
        // `-q` suprime as etiquetas BEGIN/COMMIT, que senÃ£o contaminam o stdout
        // e quebram o parse do payload.
        ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-q", "-t", "-A", "-c", statement],
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

const available = localDbAvailable();
/**
 * Contratos de runtime falam com o Postgres por `docker exec`, e cada chamada
 * custa centenas de milissegundos. O timeout padrão de 5s do Vitest é curto
 * demais para suítes que fazem dezenas de round-trips — e estourá-lo não indica
 * defeito nenhum. Elevado apenas aqui, não globalmente: um teste de unidade que
 * pendura deve continuar falhando rápido.
 */
const DB_TIMEOUT = 120_000;

const rawSuite = available ? describe : describe.skip;
const suite = (name: string, fn: () => void) => rawSuite(name, { timeout: DB_TIMEOUT }, fn);

if (!available) {
    console.warn(
        "[PRIVACY_RUNTIME_CONTRACT] PULADO: Postgres local indisponÃ­vel. " +
        "Estes testes NÃƒO passaram â€” foram pulados.",
    );
}

// â”€â”€ CenÃ¡rio sintÃ©tico â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Uma organizaÃ§Ã£o, vÃ¡rias escolas, cada uma desenhada para um caso de
// cardinalidade. Nenhum dado real; e-mails em `.invalid` (RFC 2606).

/** UUID sintÃ©tico estÃ¡vel a partir de um sufixo hexadecimal curto. */
function uuid(tail: string): string {
    return `d2d2d2d2-0000-4000-8000-${tail.padStart(12, "0")}`;
}

const ORG = uuid("d201");
const ADMIN = uuid("ad01");
const OUTSIDER = uuid("ff01");

/** Escolas por caso. O nome da chave descreve a cardinalidade testada. */
const SCHOOL = {
    n0: uuid("5c0"),
    n1: uuid("5c1"),
    n4: uuid("5c4"),
    n5: uuid("5c5"),
    n6: uuid("5c6"),
    /** 20 estudantes: turma grande (17) + turma pequena (3). SubtraÃ§Ã£o possÃ­vel. */
    mixed2: uuid("520"),
    /** 25: turma 17 + turma 3 + turma 5. Um grupo suprimido, dois divulgados. */
    mixed3: uuid("525"),
    /** 24: turma 18 + turma 3 + turma 3. Dois grupos suprimidos. */
    twoSmall: uuid("524"),
};

/** Turma i da escola de tag `tag`. */
function classId(tag: string, idx: number): string {
    return uuid(`c${tag}${idx}`);
}

/** Limiar lido do servidor â€” nunca hardcoded. */
let kMin = 0;

function seed(): void {
    const stmts: string[] = [
        `DELETE FROM public.engagement_events WHERE organization_id = '${ORG}';`,
        `DELETE FROM public.institutional_memberships WHERE organization_id = '${ORG}';`,
        `DELETE FROM public.classes WHERE school_id IN (SELECT id FROM public.schools WHERE organization_id = '${ORG}');`,
        `DELETE FROM public.schools WHERE organization_id = '${ORG}';`,
        `DELETE FROM public.organizations WHERE id = '${ORG}';`,
        `INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at) VALUES
           ('${ADMIN}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d2-admin@example.invalid', now(), now()),
           ('${OUTSIDER}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d2-outsider@example.invalid', now(), now())
         ON CONFLICT (id) DO NOTHING;`,
        `INSERT INTO public.organizations (id, name, slug, owner_id, status)
           VALUES ('${ORG}','Rede TRUST-1.2 (sintetica)','d2-trust12','${ADMIN}','active')
         ON CONFLICT (id) DO NOTHING;`,
        `INSERT INTO public.institutional_memberships (organization_id, user_id, role, status)
           VALUES ('${ORG}','${ADMIN}','org_admin','active')
         ON CONFLICT (organization_id, user_id, role) DO NOTHING;`,
    ];

    for (const [name, id] of Object.entries(SCHOOL)) {
        stmts.push(
            `INSERT INTO public.schools (id, organization_id, name)
               VALUES ('${id}','${ORG}','Escola ${name} (sintetica)')
             ON CONFLICT (id) DO NOTHING;`,
        );
    }

    // Estudantes sem turma, para os casos de cardinalidade puros da escola.
    const plain: Array<[string, number]> = [
        [SCHOOL.n0, 0], [SCHOOL.n1, 1], [SCHOOL.n4, 4], [SCHOOL.n5, 5], [SCHOOL.n6, 6],
    ];
    // `md5(...)::uuid` gera identificadores vÃ¡lidos e determinÃ­sticos sem
    // aritmÃ©tica de string sobre UUID, que Ã© como o primeiro seed quebrou.
    for (const [school, n] of plain) {
        if (n === 0) continue;
        stmts.push(
            `INSERT INTO public.institutional_memberships (organization_id, user_id, role, school_id, status)
               SELECT '${ORG}', md5('${school}' || g::text)::uuid, 'student', '${school}', 'active'
               FROM generate_series(1,${n}) g
             ON CONFLICT (organization_id, user_id, role) DO NOTHING;`,
            `INSERT INTO public.engagement_events (organization_id, user_id, event_type, created_at)
               SELECT '${ORG}', md5('${school}' || g::text)::uuid, 'session_start', now() - interval '1 day'
               FROM generate_series(1,${n}) g;`,
            // Evento antigo, fora de 7d, para o caso do filtro temporal.
            `INSERT INTO public.engagement_events (organization_id, user_id, event_type, created_at)
               SELECT '${ORG}', md5('${school}' || g::text)::uuid, 'session_start', now() - interval '40 days'
               FROM generate_series(1,${n}) g;`,
        );
    }

    // Escolas com turmas. `spread` Ã© [tamanho da turma, ...].
    const withClasses: Array<[string, string, number[]]> = [
        [SCHOOL.mixed2, "20", [17, 3]],
        [SCHOOL.mixed3, "25", [17, 3, 5]],
        [SCHOOL.twoSmall, "24", [18, 3, 3]],
    ];
    for (const [school, tag, spread] of withClasses) {
        spread.forEach((size, idx) => {
            const cls = classId(tag, idx);
            stmts.push(
                `INSERT INTO public.classes (id, school_id, name, year)
                   VALUES ('${cls}','${school}','Turma ${idx + 1}',2026)
                 ON CONFLICT (id) DO NOTHING;`,
                `INSERT INTO public.institutional_memberships (organization_id, user_id, role, school_id, class_id, status)
                   SELECT '${ORG}', md5('${cls}' || g::text)::uuid, 'student', '${school}', '${cls}', 'active'
                   FROM generate_series(1,${size}) g
                 ON CONFLICT (organization_id, user_id, role) DO NOTHING;`,
                // Eventos: um por estudante, para os totais nÃ£o serem zero.
                `INSERT INTO public.engagement_events (organization_id, user_id, event_type, created_at)
                   SELECT '${ORG}', md5('${cls}' || g::text)::uuid, 'session_start', now() - interval '1 day'
                   FROM generate_series(1,${size}) g;`,
            );
        });
    }

    sql(stmts.join("\n"));
}

/** Payload serializado de `get_school_metrics`, como texto e como objeto. */
function metrics(schoolId: string, period = "30d"): { raw: string; json: Record<string, unknown> } {
    const raw = sql(
        `BEGIN; SET LOCAL ROLE authenticated; ` +
        `SET LOCAL request.jwt.claims = '{"sub":"${ADMIN}","role":"authenticated"}'; ` +
        `SELECT public.get_school_metrics('${schoolId}','${period}')::text; COMMIT;`,
    );
    return { raw, json: JSON.parse(raw) as Record<string, unknown> };
}

/**
 * Chaves cujo valor numÃ©rico Ã© METADADO do contrato, nÃ£o contagem de pessoas:
 * o perÃ­odo pedido e o limiar aplicado. Ambos sÃ£o pÃºblicos por design â€” o limiar
 * precisa ser exibido para a supressÃ£o ser honesta.
 */
const METADATA_KEYS = new Set(["days", "minimum_group_size", "minimumGroupSize"]);

/**
 * Valores NUMÃ‰RICOS do payload, com o caminho onde apareceram.
 *
 * Varre valores JSON, nÃ£o dÃ­gitos do texto: fragmentos de UUID e de timestamp
 * ISO contÃªm dÃ­gitos e produziriam falso positivo (foi assim que a primeira
 * versÃ£o deste teste falhou por defeito prÃ³prio, nÃ£o por vazamento).
 */
function numericValues(value: unknown, path = "$"): Array<{ path: string; n: number }> {
    if (typeof value === "number") return [{ path, n: value }];
    if (Array.isArray(value)) {
        return value.flatMap((item, i) => numericValues(item, `${path}[${i}]`));
    }
    if (value !== null && typeof value === "object") {
        return Object.entries(value as Record<string, unknown>).flatMap(([key, v]) =>
            METADATA_KEYS.has(key) ? [] : numericValues(v, `${path}.${key}`),
        );
    }
    return [];
}

/** NÃºmeros que representam contagem de pessoas ou valor agregado. */
function allNumbers(raw: string): number[] {
    return numericValues(JSON.parse(raw)).map((entry) => entry.n);
}

/** Caminhos onde um nÃºmero proibido apareceu, para a falha ser diagnÃ³stica. */
function pathsWith(raw: string, forbidden: number): string[] {
    return numericValues(JSON.parse(raw))
        .filter((entry) => entry.n === forbidden)
        .map((entry) => entry.path);
}

interface Group { suppressed: boolean; value?: number; count?: number; isEmpty?: boolean; reason?: string }

function groupsOf(json: Record<string, unknown>): Group[] {
    const classes = (json.classes ?? []) as Array<{ group: Group }>;
    return classes.map((c) => c.group);
}

if (available) {
    beforeAll(() => {
        kMin = Number(sql("SELECT public.metric_minimum_group_size();"));
        seed();
    });
}

// â”€â”€ Cardinalidade do grupo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
suite("PRIVACY â€” cardinalidade do universo elegÃ­vel da escola", () => {
    it("o limiar vem do servidor e Ã© o canÃ´nico", () => {
        expect(kMin).toBeGreaterThan(1);
    });

    it("n=0 â€” grupo vazio, NÃƒO suprimido: zero Ã© dado real", () => {
        const { json } = metrics(SCHOOL.n0);
        expect(json.analytics_suppressed).toBe(false);
        const totals = json.totals as Record<string, Group>;
        expect(totals.sessions.suppressed).toBe(false);
        expect(totals.sessions.isEmpty).toBe(true);
        expect(totals.sessions.value).toBe(0);
    });

    for (const [label, key, n] of [
        ["n=1", SCHOOL.n1, 1],
        ["n=4", SCHOOL.n4, 4],
    ] as Array<[string, string, number]>) {
        it(`${label} â€” abaixo do limiar: totais suprimidos, classes e sÃ©rie vazias`, () => {
            const { json } = metrics(key);
            expect(json.analytics_suppressed).toBe(true);
            const totals = json.totals as Record<string, Group>;
            for (const metric of ["sessions", "exercises", "ai", "active_7d"]) {
                expect(totals[metric].suppressed, `${metric} deveria estar suprimido`).toBe(true);
                expect(totals[metric].value, `${metric} nÃ£o pode transportar valor`).toBeUndefined();
                expect(totals[metric].count, `${metric} nÃ£o pode transportar count`).toBeUndefined();
            }
            expect((json.classes as unknown[]).length).toBe(0);
            expect((json.series as unknown[]).length).toBe(0);
        });

        it(`${label} â€” o payload serializado NÃƒO contÃ©m o tamanho exato do grupo (R10)`, () => {
            const { raw } = metrics(key);
            // O tamanho do grupo (1..4) nÃ£o pode aparecer em NENHUM campo. Este Ã©
            // o teste que estava vermelho antes da correÃ§Ã£o: `eligible_universe`
            // carregava o nÃºmero exato.
            const eligible = (JSON.parse(raw) as Record<string, unknown>).eligible_universe;
            expect(
                typeof eligible === "number",
                "eligible_universe nÃ£o pode ser um nÃºmero quando a amostra Ã© insuficiente",
            ).toBe(false);
            expect(
                pathsWith(raw, n),
                `o tamanho do grupo (${n}) aparece no payload`,
            ).toEqual([]);
        });
    }

    for (const [label, key, n] of [
        ["n=5", SCHOOL.n5, 5],
        ["n=6", SCHOOL.n6, 6],
    ] as Array<[string, string, number]>) {
        it(`${label} â€” no limiar ou acima: divulgado (limiar Ã© >=, nÃ£o >)`, () => {
            const { json } = metrics(key);
            expect(json.analytics_suppressed).toBe(false);
            const totals = json.totals as Record<string, Group>;
            expect(totals.sessions.suppressed).toBe(false);
            expect(totals.sessions.count).toBe(n);
        });
    }
});

// â”€â”€ InferÃªncia por subtraÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
suite("PRIVACY â€” nÃ£o inferÃªncia por subtraÃ§Ã£o", () => {
    it("turma pequena isolada entre grandes: um suprimido e um sÃ³ divulgado â‡’ totais protegidos", () => {
        // mixed2 = [17, 3]. Um grupo suprimido, um divulgado.
        const { json } = metrics(SCHOOL.mixed2);
        const groups = groupsOf(json);
        const suppressed = groups.filter((g) => g.suppressed);
        expect(suppressed.length).toBeGreaterThanOrEqual(1);
        const totals = json.totals as Record<string, Group>;
        // Com apenas um grupo divulgado, o total precisa sair de cena.
        expect(totals.sessions.suppressed).toBe(true);
        expect(totals.sessions.reason).toBe("complementary");
    });

    it("turma pequena isolada: o headcount da turma suprimida NÃƒO Ã© reconstruÃ­vel", () => {
        // Aqui estÃ¡ o furo que o R10 abria por outro caminho: se o payload
        // divulga `eligible_universe` (20) e o `count` da turma grande (17),
        // entÃ£o 20 - 17 = 3 â€” o tamanho exato da turma suprimida.
        const { raw, json } = metrics(SCHOOL.mixed2);
        const groups = groupsOf(json);
        const disclosedCounts = groups
            .filter((g) => !g.suppressed && typeof g.count === "number")
            .map((g) => g.count as number);
        const eligible = json.eligible_universe;

        if (typeof eligible === "number" && disclosedCounts.length > 0) {
            const remainder = eligible - disclosedCounts.reduce((a, b) => a + b, 0);
            const suppressedCount = groups.filter((g) => g.suppressed).length;
            expect(
                suppressedCount >= 2 || remainder <= 0 || remainder >= kMin,
                `subtraÃ§Ã£o reconstrÃ³i um grupo de ${remainder} pessoa(s) â€” abaixo do limiar ${kMin}`,
            ).toBe(true);
        }
        // E o nÃºmero 3 nÃ£o deve aparecer como headcount em nenhum lugar do payload
        // quando sÃ³ existe um grupo divulgado.
        if (groups.filter((g) => g.suppressed).length === 1) {
            expect(typeof json.eligible_universe).not.toBe("number");
        }
        expect(raw).not.toContain('"count": 3');
    });

    it("um suprimido e dois divulgados: supressÃ£o complementar esconde um segundo grupo", () => {
        // mixed3 = [17, 3, 5]. O grupo de 3 Ã© suprimido por limiar; com dois
        // divulgados restantes, a regra determinÃ­stica esconde o MENOR deles.
        const { json } = metrics(SCHOOL.mixed3);
        const groups = groupsOf(json);
        expect(groups.filter((g) => g.suppressed).length).toBeGreaterThanOrEqual(2);
        expect(groups.some((g) => g.reason === "complementary")).toBe(true);
    });

    it("duas turmas pequenas: supressÃ£o simples basta, nenhuma complementar necessÃ¡ria", () => {
        // twoSmall = [18, 3, 3]. Dois suprimidos â‡’ duas incÃ³gnitas â‡’ seguro.
        const { json } = metrics(SCHOOL.twoSmall);
        const groups = groupsOf(json);
        expect(groups.filter((g) => g.suppressed).length).toBe(2);
        expect(groups.some((g) => g.reason === "complementary")).toBe(false);
        const totals = json.totals as Record<string, Group>;
        expect(totals.sessions.suppressed).toBe(false);
    });

    it("nenhum grupo suprimido transporta value ou count, em qualquer conjunto", () => {
        for (const key of Object.values(SCHOOL)) {
            const { json } = metrics(key);
            for (const g of groupsOf(json)) {
                if (g.suppressed) {
                    expect(g.value, `grupo suprimido em ${key} carrega value`).toBeUndefined();
                    expect(g.count, `grupo suprimido em ${key} carrega count`).toBeUndefined();
                }
            }
            const series = (json.series ?? []) as Array<{ group: Group }>;
            for (const p of series) {
                if (p.group.suppressed) {
                    expect(p.group.value).toBeUndefined();
                    expect(p.group.count).toBeUndefined();
                }
            }
        }
    });
});

// â”€â”€ Filtro temporal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
suite("PRIVACY â€” filtro temporal recalcula, nÃ£o herda", () => {
    it("7d e 90d na mesma escola pequena continuam suprimidos", () => {
        for (const period of ["7d", "30d", "90d"]) {
            const { json, raw } = metrics(SCHOOL.n4, period);
            expect(json.analytics_suppressed, `perÃ­odo ${period}`).toBe(true);
            expect(typeof json.eligible_universe, `perÃ­odo ${period}`).not.toBe("number");
            expect(pathsWith(raw, 4), `perÃ­odo ${period}`).toEqual([]);
        }
    });

    it("perÃ­odo invÃ¡lido Ã© recusado pelo servidor", () => {
        expect(() => metrics(SCHOOL.n5, "1y")).toThrow();
    });
});

// â”€â”€ SuperfÃ­cie da ORGANIZAÃ‡ÃƒO (alimenta painel e PDF do piloto) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
suite("PRIVACY â€” get_org_engagement_summary (superfÃ­cie de export)", () => {
    /** Payload da RPC de rede, para um org_admin. */
    function orgSummary(orgId: string, actor = ADMIN): { raw: string; json: Record<string, unknown> } {
        const raw = sql(
            `BEGIN; SET LOCAL ROLE authenticated; ` +
            `SET LOCAL request.jwt.claims = '{"sub":"${actor}","role":"authenticated"}'; ` +
            `SELECT public.get_org_engagement_summary('${orgId}')::text; COMMIT;`,
        );
        return { raw, json: JSON.parse(raw) as Record<string, unknown> };
    }

    /** OrganizaÃ§Ã£o pequena, criada sÃ³ para este bloco. */
    const SMALL_ORG = uuid("d902");
    const SMALL_ADMIN = uuid("ad02");
    const SMALL_SCHOOL = uuid("5902");

    beforeAll(() => {
        sql([
            `DELETE FROM public.nps_responses WHERE organization_id = '${SMALL_ORG}';`,
            `DELETE FROM public.engagement_events WHERE organization_id = '${SMALL_ORG}';`,
            `DELETE FROM public.institutional_memberships WHERE organization_id = '${SMALL_ORG}';`,
            `DELETE FROM public.schools WHERE organization_id = '${SMALL_ORG}';`,
            `DELETE FROM public.organizations WHERE id = '${SMALL_ORG}';`,
            `INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
               VALUES ('${SMALL_ADMIN}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d2-small@example.invalid', now(), now())
             ON CONFLICT (id) DO NOTHING;`,
            `INSERT INTO public.organizations (id, name, slug, owner_id, status)
               VALUES ('${SMALL_ORG}','Rede pequena (sintetica)','d2-small','${SMALL_ADMIN}','active')
             ON CONFLICT (id) DO NOTHING;`,
            `INSERT INTO public.schools (id, organization_id, name)
               VALUES ('${SMALL_SCHOOL}','${SMALL_ORG}','Escola pequena')
             ON CONFLICT (id) DO NOTHING;`,
            `INSERT INTO public.institutional_memberships (organization_id, user_id, role, status)
               VALUES ('${SMALL_ORG}','${SMALL_ADMIN}','org_admin','active')
             ON CONFLICT (organization_id, user_id, role) DO NOTHING;`,
            // DOIS estudantes: abaixo do limiar.
            `INSERT INTO public.institutional_memberships (organization_id, user_id, role, school_id, status)
               SELECT '${SMALL_ORG}', md5('${SMALL_ORG}' || g::text)::uuid, 'student', '${SMALL_SCHOOL}', 'active'
               FROM generate_series(1,2) g
             ON CONFLICT (organization_id, user_id, role) DO NOTHING;`,
            `INSERT INTO public.engagement_events (organization_id, user_id, event_type, created_at)
               SELECT '${SMALL_ORG}', md5('${SMALL_ORG}' || g::text)::uuid, 'session_start', now() - interval '1 day'
               FROM generate_series(1,2) g;`,
            // NPS das duas pessoas: mÃ©dia e distribuiÃ§Ã£o de um grupo de dois.
            `INSERT INTO public.nps_responses (organization_id, user_id, score, created_at)
               SELECT '${SMALL_ORG}', md5('${SMALL_ORG}' || g::text)::uuid, 9, now() - interval '1 day'
               FROM generate_series(1,2) g;`,
        ].join("\n"));
    });

    it("rede com 2 estudantes: bloco SUPRIMIDO e nenhum nÃºmero derivado no payload", () => {
        const { json } = orgSummary(SMALL_ORG, SMALL_ADMIN);
        expect(json.analytics_suppressed).toBe(true);
        for (const key of [
            "total_sessions", "total_exercises", "total_ai_interactions",
            "active_users_7d", "active_users_30d",
            "nps_avg", "nps_count", "nps_promoters", "nps_detractors",
            "eligible_universe",
        ]) {
            expect(json[key], `${key} deveria vir null quando suprimido`).toBeNull();
        }
    });

    it("rede pequena: mÃ©dia e distribuiÃ§Ã£o de NPS nÃ£o trafegam (Â§D5)", () => {
        const { raw } = orgSummary(SMALL_ORG, SMALL_ADMIN);
        // MÃ©dia 9.0 de duas pessoas identificaria as duas respostas.
        expect(pathsWith(raw, 9)).toEqual([]);
        expect(pathsWith(raw, 2)).toEqual([]);
    });

    it("rede acima do limiar: bloco divulgado", () => {
        const { json } = orgSummary(ORG);
        expect(json.analytics_suppressed).toBe(false);
        expect(typeof json.active_users_30d).toBe("number");
        expect(typeof json.eligible_universe).toBe("number");
    });

    it("o limiar aplicado Ã© o canÃ´nico do servidor", () => {
        const { json } = orgSummary(ORG);
        expect(json.minimum_group_size).toBe(kMin);
    });

    it("cross-tenant: org_admin de uma rede nÃ£o lÃª a outra", () => {
        expect(() => orgSummary(SMALL_ORG, ADMIN)).toThrow();
        expect(() => orgSummary(ORG, SMALL_ADMIN)).toThrow();
    });

    it("anon nÃ£o executa", () => {
        expect(() =>
            sql(`BEGIN; SET LOCAL ROLE anon; SELECT public.get_org_engagement_summary('${ORG}'); ROLLBACK;`),
        ).toThrow();
    });
});

// â”€â”€ Payload serializado como um todo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
suite("PRIVACY â€” o payload serializado Ã© seguro", () => {
    it("nenhuma escola abaixo do limiar expÃµe qualquer contagem 1..k-1", () => {
        const proibidos = Array.from({ length: kMin - 1 }, (_, i) => i + 1);
        for (const key of [SCHOOL.n1, SCHOOL.n4]) {
            const { raw } = metrics(key);
            for (const n of proibidos) {
                expect(
                    pathsWith(raw, n),
                    `payload de ${key} expÃµe a contagem proibida ${n}`,
                ).toEqual([]);
            }
        }
    });

    it("cross-tenant: quem nÃ£o Ã© da organizaÃ§Ã£o nÃ£o recebe payload nenhum", () => {
        expect(() =>
            sql(
                `BEGIN; SET LOCAL ROLE authenticated; ` +
                `SET LOCAL request.jwt.claims = '{"sub":"${OUTSIDER}","role":"authenticated"}'; ` +
                `SELECT public.get_school_metrics('${SCHOOL.mixed3}','30d'); COMMIT;`,
            ),
        ).toThrow();
    });
});


