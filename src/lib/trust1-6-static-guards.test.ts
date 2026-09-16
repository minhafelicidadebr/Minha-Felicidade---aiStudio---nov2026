// TRUST-1.6 — guards estáticos contra regressão de auto-declaração de
// consentimento parental.
//
// O que este arquivo protege: nenhum código de aplicação pode voltar a chamar
// a RPC antiga `record_guardian_consent` (que grava consentimento na própria
// sessão do adolescente, sem verificação de canal — exatamente o R06). A
// única forma legítima de gravar um evento de consentimento GRANTED/DECLINED
// é `decide_guardian_consent`, consumindo um token do canal do responsável.
// Também protege contra escrita direta (.insert()/.update()) nas tabelas de
// consentimento, e contra qualquer caminho que trate "email confirmado" ou
// "conta criada" como consentimento implícito.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = "src";
const GUARDED_TABLES = ["guardian_consent_events", "guardian_consent_requests", "guardian_consent_policies"];

function listSourceFiles(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) {
            listSourceFiles(full, acc);
        } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
            acc.push(full);
        }
    }
    return acc;
}

const sourceFiles = listSourceFiles(SRC_ROOT);

describe("TRUST-1.6 — guards estáticos de consentimento verificável", () => {
    it("nenhum código de aplicação chama a RPC antiga record_guardian_consent", () => {
        const offenders: string[] = [];
        for (const file of sourceFiles) {
            const content = readFileSync(file, "utf8");
            if (/rpc\(\s*["'`]record_guardian_consent["'`]/.test(content)) {
                offenders.push(file);
            }
        }
        expect(offenders, offenders.join("\n")).toEqual([]);
    });

    it("nenhum código de aplicação chama .insert()/.upsert()/.update() em guardian_consent_events ou guardian_consent_requests", () => {
        const offenders: string[] = [];
        for (const file of sourceFiles) {
            const content = readFileSync(file, "utf8");
            for (const table of GUARDED_TABLES) {
                const fromPattern = new RegExp(
                    `\\.from\\(\\s*["'\`]${table}["'\`]\\s*\\)[\\s\\S]{0,120}?\\.(insert|upsert|update)\\s*\\(`,
                );
                if (fromPattern.test(content)) {
                    offenders.push(`${file} → ${table}`);
                }
            }
        }
        expect(offenders, offenders.join("\n")).toEqual([]);
    });

    it("AuthPage.tsx usa create_guardian_consent_request, não record_guardian_consent", () => {
        const content = readFileSync("src/pages/AuthPage.tsx", "utf8");
        expect(content).toContain('rpc("create_guardian_consent_request"');
        expect(content).not.toContain('rpc("record_guardian_consent"');
    });

    it("GuardianConsentPage.tsx usa create_guardian_consent_request, não record_guardian_consent", () => {
        const content = readFileSync("src/pages/GuardianConsentPage.tsx", "utf8");
        expect(content).toContain('rpc("create_guardian_consent_request"');
        expect(content).not.toContain('rpc("record_guardian_consent"');
    });

    it("GuardianDecisionPage.tsx (visto pelo responsável) usa decide_guardian_consent, e a rota é canonicamente fora de RequireAuth", () => {
        const page = readFileSync("src/pages/GuardianDecisionPage.tsx", "utf8");
        expect(page).toContain('rpc("decide_guardian_consent"');
        expect(page).toContain('rpc("resolve_guardian_consent_token"');
        // Verifica USO JSX real, não menções em comentários: remove blocos
        // /* ... */ e linhas // antes de procurar o componente como tag.
        const withoutComments = page
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*\/\/.*$/gm, "");
        expect(withoutComments).not.toMatch(/<RequireAuth[\s>]/);
        expect(withoutComments).not.toMatch(/<RequireGuardianConsent[\s>]/);

        const app = readFileSync("src/App.tsx", "utf8");
        // A rota de decisão do responsável não pode estar aninhada dentro de
        // <RequireAuth> — o responsável não tem sessão nesta plataforma.
        const routeBlock = app.match(/path="\/autorizacao-responsavel"[\s\S]{0,40}/);
        expect(routeBlock?.[0]).not.toContain("RequireAuth");
    });

    it("email confirmado ou criação de conta nunca são tratados como consentimento (sem atalho client-side)", () => {
        for (const file of sourceFiles) {
            const content = readFileSync(file, "utf8");
            // Nenhum arquivo pode setar granted/consent como true a partir só de
            // email_confirmed_at ou signUp — a única fonte é a RPC server-side.
            expect(content, file).not.toMatch(/email_confirmed_at[\s\S]{0,60}(granted|consent)\s*[=:]\s*true/i);
        }
    });

    it("ProfilePage oferece revogação apenas via a RPC revoke_guardian_consent", () => {
        const content = readFileSync("src/pages/ProfilePage.tsx", "utf8");
        expect(content).toContain('rpc("revoke_guardian_consent"');
    });
});
