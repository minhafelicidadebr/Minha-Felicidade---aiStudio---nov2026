// ──────────────────────────────────────────────────────────────────────────
// Cliente privilegiado (service role) para WORKERS INTERNOS server-only —
// process-notifications e subscription-lifecycle. Diferente do webhook de
// pagamento (que recebe input externo e se protege por HMAC), estes workers
// processam uma FILA INTERNA (notification_outbox) e o próprio banco; o risco
// não é forjar payload, é serem invocados publicamente para disparar e-mails
// ou mudar estado. Por isso o privilégio é amarrado ao guard de trigger-secret
// abaixo: quem usa o service role aqui é obrigado (pelo security-gate) a
// colocar junto o assertTriggerSecret.
//
// INVARIANTE: este arquivo está no allow-list de service role do
// scripts/security-gate.mjs (junto do módulo de Mercado Pago). Nenhuma outra
// fonte de runtime pode referenciar a service role key.
// ──────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function createServiceClient() {
    return createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false, autoRefreshToken: false } },
    );
}

/**
 * Garante que o chamador é um acionador confiável (cron/admin), não uma
 * requisição pública. Compara o header x-trigger-secret com o secret
 * NOTIFICATIONS_TRIGGER_SECRET. Lança "Forbidden" se ausente/incorreto.
 */
export function assertTriggerSecret(req: Request): void {
    const expected = Deno.env.get("NOTIFICATIONS_TRIGGER_SECRET");
    const provided = req.headers.get("x-trigger-secret");
    if (!expected || !provided || provided !== expected) {
        throw new Error("Forbidden");
    }
}
