// UX-1 — Formatações compartilhadas dos dashboards.
//
// Vive fora dos módulos de componente de propósito: funções puras aqui podem ser
// testadas sem render e reutilizadas por card, gráfico e cabeçalho sem quebrar
// o fast-refresh (um módulo de componente deve exportar apenas componentes).

/** Escopo de privacidade de um bloco de dados (contrato §6). */
export type PrivacyScope = "aggregate" | "threshold" | "nominal";

/**
 * Idade do dado em linguagem natural. Nunca inventa um valor: sem timestamp
 * válido, diz explicitamente que a atualização não é conhecida (contrato §5 —
 * freshness visível em todo bloco de dados).
 */
export function formatFreshness(
    updatedAt: string | null | undefined,
    now: Date = new Date(),
): string {
    if (!updatedAt) return "atualização não informada";
    const timestamp = new Date(updatedAt);
    if (Number.isNaN(timestamp.getTime())) return "atualização não informada";

    const diffMinutes = Math.floor((now.getTime() - timestamp.getTime()) / 60_000);
    if (diffMinutes < 1) return "atualizado agora";
    if (diffMinutes < 60) return `atualizado há ${diffMinutes} min`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `atualizado há ${diffHours} h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "atualizado ontem";
    return `atualizado há ${diffDays} dias`;
}
