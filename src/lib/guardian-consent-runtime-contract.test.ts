// TRUST-1.6 / R06 — cadeia de evidência de consentimento verificável do
// responsável, verificada em execução contra PostgreSQL real.
//
// O que a TRUST-1.6 mediu (RED, antes desta correção): a única forma de
// conceder consentimento parental era record_guardian_consent, chamada pelo
// próprio adolescente na própria sessão, com guardian_name/guardian_email
// digitados livremente pelo chamador — sem verificação de canal, sem versão
// de política comparada no servidor, sem revogação. Reproduzido manualmente:
// um estudante concedeu consentimento a si mesmo com um responsável
// inteiramente fabricado e a RPC devolveu granted=true.
//
// Decisão: guardian magic link com relação apenas declarada (assurance
// Level 1 — "canal do responsável verificado"). NÃO prova relação legal de
// responsabilidade; isso é declarado explicitamente nos testes abaixo, não
// escondido.

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
    console.warn("[GUARDIAN_CONSENT_RUNTIME_CONTRACT] PULADO: Postgres local indisponível. NÃO passaram.");
}

function uuid(tail: string): string {
    return `c6c6c6c6-0000-4000-8000-${tail.padStart(12, "0")}`;
}

function repeatHash(char: string): string {
    return char.repeat(64);
}

function asUser(userId: string, statement: string): string {
    return sql(
        `BEGIN; SET LOCAL ROLE authenticated; ` +
        `SET LOCAL request.jwt.claims = '{"sub":"${userId}","role":"authenticated"}'; ` +
        `${statement}; COMMIT;`,
    );
}

function asUserRollback(userId: string, statement: string): string {
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
        `${statement}; COMMIT;`,
    );
}

function asAnon(statement: string): string {
    return sql(`BEGIN; SET LOCAL ROLE anon; ${statement}; COMMIT;`);
}

function asAnonError(statement: string): string | null {
    return sqlError(`BEGIN; SET LOCAL ROLE anon; ${statement}; COMMIT;`);
}

const MINOR_A = uuid("aa01");
const MINOR_B = uuid("aa02");
const ADULT_A = uuid("aa03");
const OUTSIDER = uuid("aa04");

function seed(): void {
    sql(`
      INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at) VALUES
        ('${MINOR_A}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c6-minor-a@example.invalid',now(),now()),
        ('${MINOR_B}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c6-minor-b@example.invalid',now(),now()),
        ('${ADULT_A}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c6-adult-a@example.invalid',now(),now()),
        ('${OUTSIDER}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c6-outsider@example.invalid',now(),now())
      ON CONFLICT (id) DO NOTHING;
      INSERT INTO public.profiles (user_id, full_name, birth_date) VALUES
        ('${MINOR_A}', 'C6 Minor A', '2011-01-01'),
        ('${MINOR_B}', 'C6 Minor B', '2011-01-01'),
        ('${ADULT_A}', 'C6 Adult A', '1990-01-01'),
        ('${OUTSIDER}', 'C6 Outsider', '2011-01-01')
      ON CONFLICT (user_id) DO UPDATE SET birth_date = excluded.birth_date, full_name = excluded.full_name;
      -- Limpa eventos/requests de execuções anteriores para estes usuários sintéticos.
      DELETE FROM public.guardian_consent_events WHERE user_id IN ('${MINOR_A}','${MINOR_B}','${ADULT_A}','${OUTSIDER}');
      DELETE FROM public.guardian_consent_requests WHERE student_user_id IN ('${MINOR_A}','${MINOR_B}','${ADULT_A}','${OUTSIDER}');
    `);
}

if (available) beforeAll(seed, DB_TIMEOUT);

// Extrai o token bruto do payload enfileirado (só o teste, que roda como
// postgres/service_role via docker exec, pode ler notification_outbox —
// authenticated NUNCA tem esse acesso, provado na suite de RLS abaixo).
function tokenForRequest(requestId: string): string {
    return sql(
        `SELECT payload->>'token' FROM public.notification_outbox ` +
        `WHERE dedupe_key = 'guardian_consent:${requestId}';`,
    );
}

suite("TRUST-1.6 / R06 — request cria intenção, não consentimento", () => {
    it("estudante menor cria um request; nenhum evento de consentimento é gravado", () => {
        const before = sql(`SELECT count(*) FROM public.guardian_consent_events WHERE user_id='${MINOR_A}';`);
        const out = JSON.parse(
            asUser(MINOR_A, `SELECT public.create_guardian_consent_request('Fulano Responsável','fulano@example.invalid')`),
        ) as { request_id: string; policy_version: string };
        expect(out.policy_version).toBe("2026.2");
        const after = sql(`SELECT count(*) FROM public.guardian_consent_events WHERE user_id='${MINOR_A}';`);
        expect(after).toBe(before);
    });

    it("ATTACK — usuário adulto não pode criar request de consentimento parental", () => {
        expect(
            asUserError(ADULT_A, `SELECT public.create_guardian_consent_request('X','x@example.invalid')`),
        ).toContain("Guardian consent is only applicable to minor accounts");
    });

    it("e-mail malformado é recusado", () => {
        expect(
            asUserError(MINOR_A, `SELECT public.create_guardian_consent_request('X','not-an-email')`),
        ).toContain("not a valid email address");
    });

    it("anon não executa create_guardian_consent_request", () => {
        expect(asAnonError(
            `SELECT public.create_guardian_consent_request('X','x@example.invalid')`,
        )).toContain("permission denied for function create_guardian_consent_request");
    });

    it("token bruto nunca é persistido em guardian_consent_requests", () => {
        const out = JSON.parse(
            asUser(MINOR_A, `SELECT public.create_guardian_consent_request('Fulano','fulano@example.invalid')`),
        ) as { request_id: string };
        const columns = sql(
            `SELECT string_agg(column_name, ',') FROM information_schema.columns ` +
            `WHERE table_name='guardian_consent_requests';`,
        );
        expect(columns).not.toContain("raw_token");
        expect(columns).toContain("token_hash");
        // A linha em si não contém nada parecido com o token bruto de 64 hex chars.
        const row = sql(`SELECT token_hash FROM public.guardian_consent_requests WHERE id='${out.request_id}';`);
        expect(row).toMatch(/^[0-9a-f]{64}$/);
    });

    it("criar um novo request supersede o anterior pendente (nunca dois tokens vivos)", () => {
        const first = JSON.parse(
            asUser(MINOR_B, `SELECT public.create_guardian_consent_request('Primeiro','primeiro@example.invalid')`),
        ) as { request_id: string };
        const second = JSON.parse(
            asUser(MINOR_B, `SELECT public.create_guardian_consent_request('Segundo','segundo@example.invalid')`),
        ) as { request_id: string };
        expect(second.request_id).not.toBe(first.request_id);
        const firstStatus = sql(`SELECT status FROM public.guardian_consent_requests WHERE id='${first.request_id}';`);
        expect(firstStatus).toBe("superseded");
        const secondStatus = sql(`SELECT status FROM public.guardian_consent_requests WHERE id='${second.request_id}';`);
        expect(secondStatus).toBe("pending");
    });
});

suite("TRUST-1.6 / R06 — token security", () => {
    it("token válido resolve os dados de decisão sem expor PII do estudante", () => {
        const out = JSON.parse(
            asUser(MINOR_A, `SELECT public.create_guardian_consent_request('Resolver Test','resolver@example.invalid')`),
        ) as { request_id: string };
        const token = tokenForRequest(out.request_id);
        expect(token).toMatch(/^[0-9a-f]{64}$/);

        const resolved = JSON.parse(asAnon(`SELECT public.resolve_guardian_consent_token('${token}')`)) as {
            guardian_name: string; policy_version: string; statement_sha256: string; student_first_name: string;
        };
        expect(resolved.guardian_name).toBe("Resolver Test");
        expect(resolved.policy_version).toBe("2026.2");
        expect(resolved.statement_sha256).toMatch(/^[0-9a-f]{64}$/);
        expect(resolved.student_first_name).toBe("C6");
        expect(JSON.stringify(resolved)).not.toContain("c6-minor-a@example.invalid");
    });

    it("ATTACK — token replay: mesmo token usado duas vezes gera só um evento", () => {
        const out = JSON.parse(
            asUser(MINOR_A, `SELECT public.create_guardian_consent_request('Replay Test','replay@example.invalid')`),
        ) as { request_id: string };
        const token = tokenForRequest(out.request_id);

        const firstDecision = asAnon(`SELECT public.decide_guardian_consent('${token}','granted')`);
        expect(firstDecision).toContain('"decision"');

        expect(asAnonError(
            `SELECT public.decide_guardian_consent('${token}','granted')`,
        )).toContain("Invalid or expired consent token");

        const eventCount = sql(
            `SELECT count(*) FROM public.guardian_consent_events WHERE request_id='${out.request_id}';`,
        );
        expect(eventCount).toBe("1");
    });

    it("ATTACK — token expirado é negado", () => {
        const out = JSON.parse(
            asUser(MINOR_A, `SELECT public.create_guardian_consent_request('Expired Test','expired@example.invalid')`),
        ) as { request_id: string };
        const token = tokenForRequest(out.request_id);
        sql(`UPDATE public.guardian_consent_requests SET expires_at = now() - interval '1 hour' WHERE id='${out.request_id}';`);

        expect(asAnonError(
            `SELECT public.decide_guardian_consent('${token}','granted')`,
        )).toContain("Invalid or expired consent token");
    });

    it("ATTACK — token de request superseded (substituído) é negado", () => {
        const first = JSON.parse(
            asUser(MINOR_B, `SELECT public.create_guardian_consent_request('SupersededA','sa@example.invalid')`),
        ) as { request_id: string };
        const firstToken = tokenForRequest(first.request_id);
        // Cria um segundo request, o que supersede o primeiro.
        JSON.parse(
            asUser(MINOR_B, `SELECT public.create_guardian_consent_request('SupersededB','sb@example.invalid')`),
        );

        expect(asAnonError(
            `SELECT public.decide_guardian_consent('${firstToken}','granted')`,
        )).toContain("Invalid or expired consent token");
    });

    it("ATTACK — token aleatório (nunca emitido) é negado", () => {
        expect(asAnonError(
            `SELECT public.decide_guardian_consent('${"f".repeat(64)}','granted')`,
        )).toContain("Invalid or expired consent token");
    });

    it("ATTACK — token nulo/vazio é negado", () => {
        expect(asAnonError(`SELECT public.decide_guardian_consent('','granted')`))
            .toContain("Invalid or expired consent token");
        expect(asAnonError(`SELECT public.resolve_guardian_consent_token('')`))
            .toContain("Invalid or expired consent token");
    });

    it("ATTACK — decision fora do vocabulário (ex: 'revoked' direto) é recusada", () => {
        const out = JSON.parse(
            asUser(MINOR_A, `SELECT public.create_guardian_consent_request('Vocab Test','vocab@example.invalid')`),
        ) as { request_id: string };
        const token = tokenForRequest(out.request_id);
        expect(asAnonError(
            `SELECT public.decide_guardian_consent('${token}','revoked')`,
        )).toContain("Invalid decision: expected granted or declined");
    });

    it("race condition — duas consumições simultâneas do mesmo token produzem só um evento efetivo", () => {
        const out = JSON.parse(
            asUser(MINOR_A, `SELECT public.create_guardian_consent_request('Race Test','race@example.invalid')`),
        ) as { request_id: string };
        const token = tokenForRequest(out.request_id);

        const results = [
            sqlError(`SELECT public.decide_guardian_consent('${token}','granted');`),
            sqlError(`SELECT public.decide_guardian_consent('${token}','granted');`),
        ];
        // Uma das duas chamadas sequenciais (mesma garantia vale sob concorrência
        // real: UPDATE...WHERE status='pending' é atômico no MVCC) deve falhar.
        const failures = results.filter((r) => r !== null).length;
        expect(failures).toBeGreaterThanOrEqual(1);

        const eventCount = sql(
            `SELECT count(*) FROM public.guardian_consent_events WHERE request_id='${out.request_id}';`,
        );
        expect(eventCount).toBe("1");
    });
});

suite("TRUST-1.6 / R06 — decisão do responsável e assurance", () => {
    it("GRANT via token cria evento com assurance_level=channel_verified", () => {
        const out = JSON.parse(
            asUser(MINOR_A, `SELECT public.create_guardian_consent_request('Grant Test','grant@example.invalid')`),
        ) as { request_id: string };
        const token = tokenForRequest(out.request_id);
        asAnon(`SELECT public.decide_guardian_consent('${token}','granted')`);

        const assurance = sql(
            `SELECT assurance_level FROM public.guardian_consent_events WHERE request_id='${out.request_id}';`,
        );
        expect(assurance).toBe("channel_verified");
    });

    it("DECLINE via token é registrado e o status reflete minor_declined", () => {
        const out = JSON.parse(
            asUser(MINOR_A, `SELECT public.create_guardian_consent_request('Decline Test','decline@example.invalid')`),
        ) as { request_id: string };
        const token = tokenForRequest(out.request_id);
        asAnon(`SELECT public.decide_guardian_consent('${token}','declined')`);

        const status = JSON.parse(asUser(MINOR_A, `SELECT public.get_my_guardian_consent_status()`)) as {
            reason: string; granted: boolean;
        };
        expect(status.reason).toBe("minor_declined");
        expect(status.granted).toBe(false);
    });
});

suite("TRUST-1.6 / R06 — revogação", () => {
    it("grant, então revoke: acesso consent-dependent é negado depois", () => {
        const out = JSON.parse(
            asUser(MINOR_A, `SELECT public.create_guardian_consent_request('Revoke Flow','revokeflow@example.invalid')`),
        ) as { request_id: string };
        const token = tokenForRequest(out.request_id);
        asAnon(`SELECT public.decide_guardian_consent('${token}','granted')`);

        const beforeRevoke = sql(`SELECT public.has_valid_guardian_consent('${MINOR_A}');`);
        expect(beforeRevoke).toBe("t");

        asUser(MINOR_A, `SELECT public.revoke_guardian_consent('2026.2')`);

        const afterRevoke = sql(`SELECT public.has_valid_guardian_consent('${MINOR_A}');`);
        expect(afterRevoke).toBe("f");

        const status = JSON.parse(asUser(MINOR_A, `SELECT public.get_my_guardian_consent_status()`)) as {
            reason: string; granted: boolean;
        };
        expect(status.reason).toBe("minor_revoked");
        expect(status.granted).toBe(false);
    });

    it("histórico do grant permanece visível no ledger depois da revogação", () => {
        const grantCount = sql(
            `SELECT count(*) FROM public.guardian_consent_events WHERE user_id='${MINOR_A}' AND decision='granted';`,
        );
        expect(Number(grantCount)).toBeGreaterThan(0);
        const revokedCount = sql(
            `SELECT count(*) FROM public.guardian_consent_events WHERE user_id='${MINOR_A}' AND decision='revoked';`,
        );
        expect(Number(revokedCount)).toBeGreaterThan(0);
    });

    it("ATTACK — revogar versão sem grant ativo é recusado", () => {
        expect(
            asUserError(MINOR_B, `SELECT public.revoke_guardian_consent('9999.9')`),
        ).toContain("No active consent found for this policy version");
    });

    it("anon não executa revoke_guardian_consent", () => {
        expect(asAnonError(
            `SELECT public.revoke_guardian_consent('2026.2')`,
        )).toContain("permission denied for function revoke_guardian_consent");
    });
});

// Troca a política ativa de forma idempotente (ON CONFLICT sempre reativa,
// nunca depende de a linha já existir com o valor certo) e devolve uma função
// de restauração que É SEMPRE chamada em `finally` pelos testes abaixo — uma
// assertion falhando no meio nunca deve deixar guardian_consent_policies sem
// nenhuma linha active=true para as suites seguintes.
function withTemporaryPolicy(policyVersion: string, statementHash: string, fn: () => void): void {
    sql(`
      UPDATE public.guardian_consent_policies SET active=false WHERE active=true;
      INSERT INTO public.guardian_consent_policies (policy_version, statement_sha256, requires_reconsent, active)
      VALUES ('${policyVersion}', '${statementHash}', true, true)
      ON CONFLICT (policy_version) DO UPDATE SET active = true, requires_reconsent = true;
    `);
    try {
        fn();
    } finally {
        sql(`
          UPDATE public.guardian_consent_policies SET active=false WHERE policy_version='${policyVersion}';
          UPDATE public.guardian_consent_policies SET active=true WHERE policy_version='2026.2';
        `);
    }
}

suite("TRUST-1.6 / R06 — versionamento e reconsentimento", () => {
    it("uma nova versão que requires_reconsent invalida grant da versão anterior", () => {
        // Consente sob 2026.2.
        const req = JSON.parse(
            asUser(MINOR_B, `SELECT public.create_guardian_consent_request('Version Test','versiontest@example.invalid')`),
        ) as { request_id: string };
        const token = tokenForRequest(req.request_id);
        asAnon(`SELECT public.decide_guardian_consent('${token}','granted')`);

        const beforeNewPolicy = sql(`SELECT public.has_valid_guardian_consent('${MINOR_B}');`);
        expect(beforeNewPolicy).toBe("t");

        withTemporaryPolicy("2027.1", repeatHash("a"), () => {
            const afterNewPolicy = sql(`SELECT public.has_valid_guardian_consent('${MINOR_B}');`);
            expect(afterNewPolicy).toBe("f");

            const status = JSON.parse(asUser(MINOR_B, `SELECT public.get_my_guardian_consent_status()`)) as {
                reason: string; granted: boolean;
            };
            expect(status.reason).toBe("reconsent_required");
            expect(status.granted).toBe(false);
        });
    });

    it("request antigo (versão superada) não fabrica grant da versão nova silenciosamente", () => {
        // Um request criado sob 2026.2 tem policy_version='2026.2' fixado na
        // criação; mesmo que decidido depois de uma nova política se tornar
        // vigente, o evento resultante carrega a versão do REQUEST, nunca a
        // vigente no momento da decisão — não pode ser confundido com reconsentimento novo.
        const req = JSON.parse(
            asUser(OUTSIDER, `SELECT public.create_guardian_consent_request('Old Version','oldversion@example.invalid')`),
        ) as { request_id: string; policy_version: string };
        expect(req.policy_version).toBe("2026.2");
        const token = tokenForRequest(req.request_id);

        withTemporaryPolicy("2027.2", repeatHash("b"), () => {
            asAnon(`SELECT public.decide_guardian_consent('${token}','granted')`);

            const eventVersion = sql(
                `SELECT policy_version FROM public.guardian_consent_events WHERE request_id='${req.request_id}';`,
            );
            expect(eventVersion).toBe("2026.2");

            const status = JSON.parse(asUser(OUTSIDER, `SELECT public.get_my_guardian_consent_status()`)) as {
                reason: string;
            };
            expect(status.reason).toBe("reconsent_required");
        });
    });
});

suite("TRUST-1.6 / R06 — server authority, não frontend", () => {
    it("has_valid_guardian_consent não é executável por authenticated (só por RPCs SECURITY DEFINER internas)", () => {
        expect(asUserError(
            MINOR_A, `SELECT public.has_valid_guardian_consent('${MINOR_A}')`,
        )).toContain("permission denied for function has_valid_guardian_consent");
    });

    it("has_valid_guardian_consent não é executável por anon", () => {
        expect(asAnonError(
            `SELECT public.has_valid_guardian_consent('${MINOR_A}')`,
        )).toContain("permission denied for function has_valid_guardian_consent");
    });

    it("idade indeterminada (birth_date nulo) falha fechado: has_valid_guardian_consent=false", () => {
        const noBirthDate = uuid("aa99");
        sql(`
          INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at) VALUES
            ('${noBirthDate}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c6-nobirthdate@example.invalid',now(),now())
          ON CONFLICT (id) DO NOTHING;
          DELETE FROM public.profiles WHERE user_id = '${noBirthDate}';
          INSERT INTO public.profiles (user_id, full_name) VALUES ('${noBirthDate}', 'No Birthdate');
        `);
        expect(sql(`SELECT public.has_valid_guardian_consent('${noBirthDate}');`)).toBe("f");
    });

    it("adulto sem nenhum evento de consentimento tem has_valid_guardian_consent=true", () => {
        expect(sql(`SELECT public.has_valid_guardian_consent('${ADULT_A}');`)).toBe("t");
    });

    it("ATTACK — enforce_ai_usage_limit nega uso de IA para menor sem consentimento válido, sem consumir cota", () => {
        const freshMinor = uuid("aa50");
        sql(`
          INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at) VALUES
            ('${freshMinor}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c6-freshminor@example.invalid',now(),now())
          ON CONFLICT (id) DO NOTHING;
          INSERT INTO public.profiles (user_id, full_name, birth_date) VALUES ('${freshMinor}', 'Fresh Minor', '2011-01-01')
          ON CONFLICT (user_id) DO UPDATE SET birth_date = excluded.birth_date;
          DELETE FROM public.ai_usage_limits WHERE user_id = '${freshMinor}';
        `);

        const result = JSON.parse(
            asUser(freshMinor, `SELECT public.enforce_ai_usage_limit('cognitive-mirror')`),
        ) as { allowed: boolean; reason?: string; used: number };
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe("guardian_consent_required");
        expect(result.used).toBe(0);

        const usageRows = sql(
            `SELECT count(*) FROM public.ai_usage_limits WHERE user_id='${freshMinor}';`,
        );
        expect(usageRows).toBe("0");
    });

    it("menor COM consentimento válido consegue usar enforce_ai_usage_limit normalmente", () => {
        const req = JSON.parse(
            asUser(MINOR_A, `SELECT public.create_guardian_consent_request('AI Gate Test','aigate@example.invalid')`),
        ) as { request_id: string };
        const token = tokenForRequest(req.request_id);
        asAnon(`SELECT public.decide_guardian_consent('${token}','granted')`);

        const result = JSON.parse(
            asUser(MINOR_A, `SELECT public.enforce_ai_usage_limit('cognitive-mirror')`),
        ) as { allowed: boolean; reason?: string };
        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
    });
});

suite("TRUST-1.6 / R06 — cross-user isolation (RLS)", () => {
    it("estudante não vê requests de outro estudante", () => {
        const req = JSON.parse(
            asUser(MINOR_A, `SELECT public.create_guardian_consent_request('Isolation Test','isolation@example.invalid')`),
        ) as { request_id: string };
        const seenByOther = asUserRollback(
            MINOR_B,
            `SELECT count(*) FROM public.guardian_consent_requests WHERE id='${req.request_id}'`,
        );
        expect(seenByOther).toBe("0");
    });

    it("estudante não vê eventos de consentimento de outro estudante", () => {
        const seenByOther = asUserRollback(
            MINOR_B,
            `SELECT count(*) FROM public.guardian_consent_events WHERE user_id='${MINOR_A}'`,
        );
        expect(seenByOther).toBe("0");
    });

    it("anon não lê guardian_consent_requests nem guardian_consent_events", () => {
        expect(asAnonError(`SELECT * FROM public.guardian_consent_requests;`))
            .toContain("permission denied for table guardian_consent_requests");
        expect(asAnonError(`SELECT * FROM public.guardian_consent_events;`))
            .toContain("permission denied for table guardian_consent_events");
    });

    it("ATTACK — direct INSERT/UPDATE em guardian_consent_requests e guardian_consent_events é bloqueado para authenticated", () => {
        expect(asUserError(
            MINOR_A,
            `INSERT INTO public.guardian_consent_requests (student_user_id, guardian_name, guardian_email, policy_version, token_hash) VALUES ('${MINOR_A}','x','x@example.invalid','2026.2','${"0".repeat(64)}')`,
        )).toContain("permission denied for table guardian_consent_requests");

        expect(asUserError(
            MINOR_A,
            `INSERT INTO public.guardian_consent_events (user_id, guardian_name, guardian_email, policy_version, decision, assurance_level) VALUES ('${MINOR_A}','Fake','fake@example.invalid','2026.2','granted','channel_verified')`,
        )).toContain("permission denied for table guardian_consent_events");
    });

    it("nenhuma policy de INSERT/UPDATE/DELETE existe nestas duas tabelas para authenticated/anon", () => {
        expect(sql(
            `SELECT count(*) FROM pg_policies WHERE schemaname='public' ` +
            `AND tablename IN ('guardian_consent_requests','guardian_consent_events') ` +
            `AND cmd IN ('INSERT','UPDATE','DELETE');`,
        )).toBe("0");
    });
});

suite("TRUST-1.6 / R06 — SECURITY DEFINER discipline", () => {
    it("todas as funções novas têm search_path pinado", () => {
        const functions = [
            "get_current_guardian_consent_policy", "create_guardian_consent_request",
            "resolve_guardian_consent_token", "decide_guardian_consent",
            "revoke_guardian_consent", "get_my_guardian_consent_status",
            "has_valid_guardian_consent", "enforce_ai_usage_limit",
        ];
        for (const fn of functions) {
            const config = sql(
                `SELECT coalesce(array_to_string(proconfig,','),'') ` +
                `FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace ` +
                `WHERE n.nspname='public' AND p.proname='${fn}' ORDER BY p.oid DESC LIMIT 1;`,
            );
            expect(config, fn).toBe("search_path=public");
        }
    });

    it("grants mínimos: anon só executa resolve/decide (token é a credencial do responsável)", () => {
        expect(sql(
            `SELECT has_function_privilege('anon','public.create_guardian_consent_request(text,text)','EXECUTE') || '|' || ` +
            `has_function_privilege('anon','public.resolve_guardian_consent_token(text)','EXECUTE') || '|' || ` +
            `has_function_privilege('anon','public.decide_guardian_consent(text,text)','EXECUTE') || '|' || ` +
            `has_function_privilege('anon','public.revoke_guardian_consent(text)','EXECUTE') || '|' || ` +
            `has_function_privilege('anon','public.get_my_guardian_consent_status()','EXECUTE');`,
        )).toBe("false|true|true|false|false");
    });
});
