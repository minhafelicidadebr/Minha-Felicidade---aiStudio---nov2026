// TRUST-1.4 — guards estáticos contra regressão de escrita insegura.
//
// O que este arquivo protege: engagement_events/nps_responses só podem ser
// escritas via RPC (record_engagement_event / submit_nps_response), nunca por
// `.insert()`/`.upsert()` direto do browser. O INSERT direto foi revogado no
// banco (ver 20260909120000_trust1_4_tenant_safe_writes.sql e
// input-integrity-runtime-contract.test.ts), mas um guard estático pega a
// regressão no momento da revisão de código, antes de precisar do banco local
// rodando para descobrir.
import { readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = "src";
const GUARDED_TABLES = ["engagement_events", "nps_responses"];

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

describe("TRUST-1.4 — guards estáticos de escrita tenant-safe", () => {
    it("nenhum código de aplicação chama .insert()/.upsert() em engagement_events ou nps_responses", () => {
        const offenders: string[] = [];
        for (const file of listSourceFiles(SRC_ROOT)) {
            const content = readFileSync(file, "utf8");
            for (const table of GUARDED_TABLES) {
                const fromPattern = new RegExp(
                    `\\.from\\(\\s*["'\`]${table}["'\`]\\s*\\)[\\s\\S]{0,120}?\\.(insert|upsert)\\s*\\(`,
                );
                if (fromPattern.test(content)) {
                    offenders.push(`${file} → ${table}`);
                }
            }
        }
        expect(offenders, offenders.join("\n")).toEqual([]);
    });

    it("engagement.ts usa a RPC record_engagement_event, não INSERT direto", () => {
        const content = readFileSync("src/lib/engagement.ts", "utf8");
        expect(content).toContain('supabase.rpc("record_engagement_event"');
        expect(content).not.toMatch(/\.from\(\s*["'`]engagement_events["'`]\s*\)/);
    });

    it("NpsSurvey.tsx usa a RPC submit_nps_response, não INSERT direto", () => {
        const content = readFileSync("src/components/NpsSurvey.tsx", "utf8");
        expect(content).toContain('supabase.rpc("submit_nps_response"');
        expect(content).not.toMatch(/\.from\(\s*["'`]nps_responses["'`]\s*\)/);
    });

    it("nenhuma RPC de escrita institucional aceita user_id como parâmetro do chamador", () => {
        const migration = readFileSync(
            "supabase/migrations/20260909120000_trust1_4_tenant_safe_writes.sql",
            "utf8",
        );
        expect(migration).not.toMatch(/_user_id\s+uuid/);
        expect(migration).toContain("auth.uid()");
    });
});
