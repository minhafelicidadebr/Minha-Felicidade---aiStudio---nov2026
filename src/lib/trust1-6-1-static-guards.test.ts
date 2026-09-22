import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260922023000_trust1_6_1_notification_outbox_contract.sql",
  "utf8",
);
const worker = readFileSync("supabase/functions/process-notifications/index.ts", "utf8");
const template = readFileSync("supabase/functions/_shared/email-templates.ts", "utf8");

describe("TRUST-1.6.1 static guards", () => {
  it("invitation RPCs never target phantom outbox columns", () => {
    expect(migration).toContain("kind, recipient_email, user_id, payload, dedupe_key");
    expect(migration).not.toContain("body_html");
    expect(migration).not.toContain("EXCEPTION WHEN OTHERS");
  });

  it("notification worker reads only the canonical payload column", () => {
    expect(worker).toContain('.select("id, kind, recipient_email, attempts, payload")');
    expect(worker).not.toContain("row.metadata");
    expect(worker).not.toContain("payload, metadata");
  });

  it("guardian consent request has a real worker template", () => {
    expect(template).toContain('"guardian_consent_request"');
    expect(template).toContain("/autorizacao-responsavel?token=");
  });
});
