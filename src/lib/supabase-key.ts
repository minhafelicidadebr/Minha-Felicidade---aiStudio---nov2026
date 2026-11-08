// Guard de segurança (doutrina §2 / plano: NUNCA `sb_secret_` no frontend).
// A chave publishable/anon é pública por natureza; uma chave SECRETA
// (`sb_secret_...`) ou a service role key jamais podem ir para o bundle do
// cliente — elas contornariam o RLS. Este guard falha rápido (no load do
// client) em vez de deixar um segredo vazar silenciosamente.

const SECRET_KEY_PREFIXES = ["sb_secret_", "sbp_", "service_role"] as const;

/**
 * Valida a chave pública do Supabase usada no frontend. Lança se estiver
 * ausente ou se for uma chave secreta. Retorna a chave quando válida.
 * Função pura testável.
 */
export function assertPublicSupabaseKey(key: string | undefined | null): string {
    if (!key || key.trim() === "") {
        throw new Error(
            "VITE_SUPABASE_PUBLISHABLE_KEY ausente: defina a chave pública (anon/publishable) do Supabase.",
        );
    }
    const lower = key.toLowerCase();
    if (SECRET_KEY_PREFIXES.some((p) => lower.startsWith(p))) {
        throw new Error(
            "Chave secreta do Supabase (sb_secret_/service role) NÃO pode ser usada no frontend. " +
            "Use a chave publishable/anon pública.",
        );
    }
    return key;
}

/** Valida a presença da URL do Supabase (env obrigatória no build/startup). */
export function assertSupabaseUrl(url: string | undefined | null): string {
    if (!url || url.trim() === "") {
        throw new Error("VITE_SUPABASE_URL ausente: defina a URL do projeto Supabase.");
    }
    return url;
}
