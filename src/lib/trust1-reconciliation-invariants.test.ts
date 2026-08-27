// TRUST-1.1B — Invariantes da reconciliação forward-only.
//
// HONESTIDADE SOBRE O QUE ESTE ARQUIVO PROVA:
//
// Estes testes leem os arquivos `.sql` e verificam que as correções da TRUST-1.1B
// CONTINUAM ESCRITAS. Eles não executam Postgres.
//
// A prova de execução foi feita uma vez, em staging local, e está registrada em
// docs/kiro/trust-1/TRUST_1_1B_LOCAL_RESET_RECEIPT.md (43 migrations aplicadas
// desde banco vazio + 17 testes SQL/RLS). O que estes testes protegem é a
// REGRESSÃO POR EDIÇÃO: alguém desfazendo a qualificação de schema, reintroduzindo
// UUID literal de conta em seed, ou colando um DROP CASCADE na reconciliada.

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const DIR = "supabase/migrations";
const RECONCILED = `${DIR}/20260824120000_trust1_dashboard_os_reconciled.sql`;
const SEED = `${DIR}/20260706192545_fd2a8387-44ee-4778-a469-8c613dd8d130.sql`;

const migrationFiles = readdirSync(DIR).filter((f) => f.endsWith(".sql"));
const reconciled = readFileSync(RECONCILED, "utf8");
const seed = readFileSync(SEED, "utf8");

/** Remove linhas de comentário: elas documentam o que a migration NÃO faz. */
function stripComments(sql: string): string {
    return sql
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("--"))
        .join("\n");
}

/** Só o SQL executável: sem comentários e sem literais de texto (mensagens). */
function executableSql(sql: string): string {
    return stripComments(sql).replace(/'(?:[^']|'')*'/g, "''");
}

const reconciledCode = stripComments(reconciled);

// ── R20: pgcrypto vive em `extensions`, funções são pinadas em `public` ──────
describe("R20 — chamadas de pgcrypto são qualificadas por schema", () => {
    // Toda função SECURITY DEFINER do projeto usa `SET search_path = public`,
    // por exigência da doutrina. Isso remove `extensions` da resolução, então
    // qualquer chamada não qualificada a pgcrypto falha em tempo de execução.
    const PGCRYPTO = ["digest", "gen_random_bytes", "crypt", "hmac", "encrypt", "decrypt"];

    // O histórico é IMUTÁVEL: `20260727120000` contém o defeito e continua
    // contendo. A reconciliada é que corrige o estado final. Por isso a
    // invariante vale para a reconciliada e para tudo que vier DEPOIS dela.
    const HISTORICAL_DEFECT = "20260727120000_ux3_school_metrics_and_governance.sql";
    const RECONCILED_TS = "20260824120000";

    it("o defeito histórico permanece registrado na migration de origem", () => {
        // Se este teste quebrar, alguém editou uma migration já aplicada.
        const historical = executableSql(readFileSync(`${DIR}/${HISTORICAL_DEFECT}`, "utf8"));
        expect(historical).toMatch(/(?<![.\w])digest\s*\(/);
    });

    for (const fn of PGCRYPTO) {
        it(`nenhuma migration a partir da reconciliada chama ${fn}() sem qualificar o schema`, () => {
            // Casa `digest(` mas não `extensions.digest(` nem `pgcrypto.digest(`.
            const unqualified = new RegExp(`(?<![.\\w])${fn}\\s*\\(`);
            const offenders = migrationFiles
                .filter((file) => file.slice(0, 14) >= RECONCILED_TS)
                .filter((file) => unqualified.test(executableSql(readFileSync(`${DIR}/${file}`, "utf8"))));

            expect(offenders).toEqual([]);
        });
    }

    it("resend_invitation usa extensions.digest na reconciliada", () => {
        expect(reconciled).toContain("extensions.digest(lower(trim(_inv.invited_email)), 'sha256')");
    });

    it("resend_invitation mantém o search_path pinado em public", () => {
        const start = reconciled.indexOf("FUNCTION public.resend_invitation");
        const header = reconciled.slice(start, reconciled.indexOf("AS $$", start));
        expect(header).toContain("SECURITY DEFINER");
        expect(header).toContain("SET search_path = public");
        // A correção NÃO pode ser "afrouxar o search_path".
        expect(header).not.toMatch(/search_path\s*=\s*[^\n]*extensions/);
    });
});

// ── R18: seed não pode acoplar-se a UUID de conta criada fora de migration ───
describe("R18 — seed de papéis deriva as contas de auth.users", () => {
    it("não insere user_roles com UUID literal", () => {
        const insert = seed.slice(seed.indexOf("INSERT INTO public.user_roles"));
        expect(insert).not.toMatch(/'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'/i);
    });

    it("resolve os user_id por e-mail em auth.users", () => {
        expect(seed).toMatch(/JOIN auth\.users u ON u\.email = seed\.email/);
    });

    it("não cria conta de autenticação nem define credencial", () => {
        expect(seed).not.toMatch(/INSERT\s+INTO\s+auth\.users/i);
        expect(seed).not.toMatch(/encrypted_password|crypt\s*\(/i);
    });
});

// ── Contrato da migration reconciliada ──────────────────────────────────────
describe("migration reconciliada é forward-only e preservadora de dados", () => {
    it("não usa DROP ... CASCADE", () => {
        expect(reconciledCode).not.toMatch(/DROP\s+[\s\S]{0,80}?CASCADE/i);
    });

    it("não remove tabela, coluna nem policy", () => {
        expect(reconciledCode).not.toMatch(/^\s*DROP\s+(TABLE|COLUMN|POLICY|FUNCTION)/im);
        expect(reconciledCode).not.toMatch(/ALTER\s+TABLE[\s\S]{0,60}?DROP\s+COLUMN/i);
    });

    it("não cria conta de teste nem contém credencial", () => {
        expect(reconciledCode).not.toMatch(/INSERT\s+INTO\s+auth\.users/i);
        expect(reconciledCode).not.toMatch(/@test\.local/i);
        expect(reconciledCode).not.toMatch(/password|senha/i);
    });

    it("falha explicitamente diante da versão defeituosa de get_school_metrics", () => {
        expect(reconciled).toContain("e.school_id");
        expect(reconciled).toMatch(/RAISE EXCEPTION 'TRUST-1 pré-condição 1/);
    });

    it("verifica os gatilhos append-only do ledger como pré-condição", () => {
        expect(reconciled).toContain("trg_decision_events_no_update");
        expect(reconciled).toContain("trg_decision_events_no_delete");
        expect(reconciled).toMatch(/RAISE EXCEPTION 'TRUST-1 pré-condição 2/);
    });

    it("mantém anon fora de todas as RPCs do domínio", () => {
        for (const fn of [
            "public.resend_invitation(uuid)",
            "public.get_school_metrics(uuid, text)",
            "public.escalate_indicator(uuid, uuid, text, text)",
            "public.can_read_school(uuid)",
            "public.metric_minimum_group_size()",
        ]) {
            expect(reconciled).toContain(`REVOKE EXECUTE ON FUNCTION ${fn} FROM PUBLIC, anon;`);
        }
    });

    it("não remove resíduo de contaminante silenciosamente — apenas avisa", () => {
        expect(reconciled).toMatch(/RAISE WARNING 'TRUST-1: resíduo de migration contaminante/);
        expect(reconciledCode).not.toMatch(/DROP\s+TABLE[\s\S]{0,40}runtime_gates/i);
    });
});
