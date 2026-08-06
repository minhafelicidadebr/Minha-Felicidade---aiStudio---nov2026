// UX-3 — Invariantes da migration, verificados por leitura do SQL.
//
// HONESTIDADE SOBRE O QUE ESTE ARQUIVO PROVA (e o que NÃO prova):
//
// Estes testes leem o SQL e verificam que as proteções ESTÃO ESCRITAS. Eles não
// executam Postgres, então não provam que a proteção FUNCIONA em tempo de
// execução — para isso seria preciso um banco de teste, que este projeto não
// tem hoje (registrado como dívida em NEXT_ACTION).
//
// O que eles pegam de verdade: alguém removendo um REVOKE, apagando um trigger,
// afrouxando uma verificação de escopo ou trocando um número de política numa
// refatoração futura. Esse é o modo de falha realista aqui — regressão por
// edição, não bug sutil de semântica do Postgres.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_RESENDS, RESEND_COOLDOWN_HOURS } from "./invitation-resend";

const MIGRATION = "supabase/migrations/20260727120000_ux3_school_metrics_and_governance.sql";
const sql = readFileSync(MIGRATION, "utf8");

/** Corpo de uma função SQL, para asserções localizadas. */
function functionBody(name: string): string {
    const start = sql.indexOf(`FUNCTION public.${name}`);
    expect(start, `função ${name} não encontrada na migration`).toBeGreaterThan(-1);
    const end = sql.indexOf("\n$$;", start);
    return sql.slice(start, end === -1 ? undefined : end);
}

// ── Tentativa de alterar eventos append-only (teste exigido pelo humano) ─────
describe("ledger append-only", () => {
    it("revoga UPDATE e DELETE de authenticated", () => {
        expect(sql).toContain(
            "REVOKE UPDATE, DELETE ON TABLE public.institutional_decision_events FROM authenticated, anon",
        );
    });

    it("não cria policy de UPDATE nem de DELETE no ledger", () => {
        const policies = sql.match(/CREATE POLICY[\s\S]*?;/g) ?? [];
        const ledgerPolicies = policies.filter((p) => p.includes("institutional_decision_events"));
        expect(ledgerPolicies.length).toBeGreaterThan(0);
        for (const policy of ledgerPolicies) {
            expect(policy).not.toMatch(/FOR\s+UPDATE/i);
            expect(policy).not.toMatch(/FOR\s+DELETE/i);
            expect(policy).not.toMatch(/FOR\s+ALL/i);
        }
    });

    it("bloqueia mutação por trigger, valendo até para service_role", () => {
        // Defesa em profundidade: REVOKE não alcança service_role nem função
        // SECURITY DEFINER com bug. O trigger alcança.
        expect(sql).toContain("trg_decision_events_no_update");
        expect(sql).toContain("trg_decision_events_no_delete");
        expect(sql).toContain("BEFORE UPDATE ON public.institutional_decision_events");
        expect(sql).toContain("BEFORE DELETE ON public.institutional_decision_events");
        expect(sql).toMatch(/RAISE EXCEPTION 'institutional_decision_events is append-only/);
    });

    it("não reusa notification_outbox como histórico de decisões (§D2/D50)", () => {
        // O ledger e a fila de e-mail coexistem, mas o histórico de governança
        // não pode viver na fila que é limpa periodicamente.
        expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.institutional_decision_events");
    });

    it("não guarda texto livre nem e-mail em claro no ledger", () => {
        // §D2: sem texto livre sensível e sem dado pessoal desnecessário. O
        // motivo é vocabulário controlado e o destinatário entra como hash.
        const table = sql.slice(
            sql.indexOf("CREATE TABLE IF NOT EXISTS public.institutional_decision_events"),
            sql.indexOf("CREATE UNIQUE INDEX IF NOT EXISTS institutional_decision_events_idempotency_idx"),
        );
        expect(table).toMatch(/reason\s+text NOT NULL CHECK/);
        expect(table).not.toMatch(/invited_email|recipient_email\s+text/);
    });

    it("tem chave de idempotência única quando informada", () => {
        expect(sql).toContain("institutional_decision_events_idempotency_idx");
        expect(sql).toContain("WHERE idempotency_key IS NOT NULL");
    });
});

// ── Escalonamento entre organizações (teste exigido pelo humano) ─────────────
describe("escalonamento fora do escopo", () => {
    const body = functionBody("escalate_indicator");

    it("verifica o escopo contra o banco em vez de confiar no cliente", () => {
        expect(body).toContain("public.is_org_admin(_organization_id)");
        expect(body).toContain("auth.uid()");
    });

    it("nega e registra a negativa quando a organização não é do solicitante", () => {
        expect(body).toContain("out_of_scope_organization");
        expect(body).toMatch(/'action_denied'/);
        expect(body).toMatch(/RAISE EXCEPTION 'Organization not available for this account'/);
    });

    it("exige que a escola pertença à organização informada", () => {
        // Sem isto, um org_admin legítimo poderia escalar apontando para a escola
        // de outra rede passando o próprio organization_id.
        expect(body).toContain("WHERE id = _school_id AND organization_id = _organization_id");
    });
});

// ── Autorização do painel escolar ───────────────────────────────────────────
describe("autorização de leitura da escola", () => {
    const canRead = functionBody("can_read_school");

    it("deriva o escopo de auth.uid() e de vínculos ativos", () => {
        expect(canRead).toContain("m.user_id = auth.uid()");
        expect(canRead).toContain("m.status = 'active'");
    });

    it("school_admin com school_id nulo não autoriza escola alguma", () => {
        expect(canRead).toContain("m.school_id IS NOT NULL AND m.school_id = _school_id");
    });

    it("org_admin vale para a organização da escola, não para qualquer escola", () => {
        expect(canRead).toContain("m.organization_id = s.organization_id");
    });

    it("resposta de negação não distingue escola inexistente de fora de escopo", () => {
        const metrics = functionBody("get_school_metrics");
        expect(metrics).toMatch(/RAISE EXCEPTION 'School not available for this account'/);
        // Uma única mensagem para os três casos evita servir de sonda de ids.
        expect((metrics.match(/School not available for this account/g) ?? []).length).toBe(1);
    });

    it("registra também a tentativa negada em auditoria", () => {
        const metrics = functionBody("get_school_metrics");
        expect(metrics).toContain("get_school_metrics_denied");
    });
});

// ── Supressão no servidor ───────────────────────────────────────────────────
describe("supressão aplicada no servidor", () => {
    const metrics = functionBody("get_school_metrics");

    it("usa o limiar canônico em vez de repetir o número", () => {
        expect(metrics).toContain("public.metric_minimum_group_size()");
        // O 5 aparece só na função canônica.
        expect((sql.match(/SELECT 5 \$\$/g) ?? []).length).toBe(1);
    });

    it("grupo abaixo do limiar não devolve valor nem contagem (§D7/D55)", () => {
        const belowThreshold = metrics.match(/'suppressed', true[^)]*\)/g) ?? [];
        expect(belowThreshold.length).toBeGreaterThan(0);
        for (const marker of belowThreshold) {
            expect(marker).not.toContain("'value'");
            expect(marker).not.toContain("'count'");
        }
    });

    it("grupo vazio devolve zero real, distinto de suprimido", () => {
        expect(metrics).toContain("'isEmpty', true");
    });

    it("aplica supressão complementar contra subtração (§D6/D54)", () => {
        expect(metrics).toContain("'reason', 'complementary'");
        // Determinismo: ordena por valor e desempata pela chave.
        expect(metrics).toContain("ORDER BY (c->'group'->>'value')::numeric ASC, c->>'key' ASC");
    });

    it("escola abaixo do limiar suprime analytics mas segue existindo (§D5/D53)", () => {
        expect(metrics).toContain("'analytics_suppressed', _eligible < _min");
    });

    it("valida o período contra o vocabulário canônico", () => {
        expect(metrics).toMatch(/WHEN '7d'/);
        expect(metrics).toMatch(/WHEN '30d'/);
        expect(metrics).toMatch(/WHEN '90d'/);
        expect(metrics).toMatch(/RAISE EXCEPTION 'Invalid period/);
    });
});

// ── Antiburla do reenvio ────────────────────────────────────────────────────
describe("antiburla do limite de reenvio", () => {
    const body = functionBody("resend_invitation");

    it("conta por organização e destinatário, não pela linha do convite", () => {
        // `invite_member` é idempotente por (email, org, role): um contador na
        // linha do convite seria zerado cancelando e recriando o convite.
        expect(body).toContain("organization_id = _inv.organization_id");
        expect(body).toContain("metadata->>'recipient_hash' = _recipient_hash");
    });

    it("guarda o destinatário como hash, não em claro", () => {
        expect(body).toContain("digest(lower(trim(_inv.invited_email)), 'sha256')");
    });

    it("usa os mesmos números da política do cliente", () => {
        expect(body).toContain(`constant integer := ${MAX_RESENDS}`);
        expect(body).toContain(`interval '${RESEND_COOLDOWN_HOURS} hours'`);
    });

    it("só reenvia convite pendente, não aceito e dentro da validade", () => {
        expect(body).toContain("_inv.accepted_at IS NOT NULL");
        expect(body).toContain("_inv.expires_at < now()");
    });

    it("registra o bloqueio, não apenas o sucesso", () => {
        expect(body).toContain("resend_limit_reached");
        expect(body).toContain("resend_cooldown");
        expect(body).toContain("'invitation_resend_blocked'");
    });
});

// ── Doutrina de privilégio das funções ──────────────────────────────────────
describe("privilégio mínimo das funções novas", () => {
    const definerFunctions = [
        "public.get_school_metrics(uuid, text)",
        "public.resend_invitation(uuid)",
        "public.escalate_indicator(uuid, uuid, text, text)",
    ];

    it("revoga antes de conceder, sem sobrar anon", () => {
        for (const fn of definerFunctions) {
            expect(sql).toContain(`REVOKE EXECUTE ON FUNCTION ${fn} FROM PUBLIC, anon, authenticated`);
            expect(sql).toContain(`GRANT EXECUTE ON FUNCTION ${fn} TO authenticated`);
            expect(sql).not.toContain(`GRANT EXECUTE ON FUNCTION ${fn} TO anon`);
        }
    });

    it("fixa search_path em toda função SECURITY DEFINER", () => {
        const definerCount = (sql.match(/SECURITY DEFINER/g) ?? []).length;
        const searchPathCount = (sql.match(/SET search_path = public/g) ?? []).length;
        expect(searchPathCount).toBeGreaterThanOrEqual(definerCount);
    });

    it("documenta a query de verificação de privilégio", () => {
        expect(sql).toContain("has_function_privilege");
        expect(sql).toContain("has_table_privilege");
    });

    it("é idempotente nos objetos que cria", () => {
        expect(sql).toContain("CREATE TABLE IF NOT EXISTS");
        expect(sql).toContain("CREATE OR REPLACE FUNCTION");
        expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS");
        expect(sql).toContain("DROP POLICY IF EXISTS");
    });
});
