// Fonte única dos rótulos de recursos por plano (usado na landing PricingSection
// e na página de assinatura). Descreve, em linguagem do usuário, o que cada
// plano inclui — base do "guia de diferenças entre planos".

export const PLAN_FEATURE_LABELS: Record<string, string[]> = {
    free: [
        "5 módulos completos",
        "32 vídeos com legendas",
        "Quiz adaptativo (nível 1)",
        "Flashcards básicos",
        "AlegrIA (5 perguntas/dia)",
        "Dashboard de progresso",
        "Respiração Consciente",
        "Roda da Vida",
        "Diário de Gratidão",
        "Jogo da Memória",
    ],
    intermediate: [
        "Tudo do plano Gratuito",
        "Quiz adaptativo (3 níveis)",
        "AlegrIA ilimitada",
        "Simulador de decisões",
        "Arena de debate",
        "Poesia pedagógica",
        "Mapa Mental interativo",
        "Desafio 21 Dias",
        "Lab de Hipóteses",
        "Missões Sociais",
        "Relatório PDF",
        "Certificado digital",
    ],
    advanced: [
        "Tudo do Intermediário",
        "Estúdio de co-design",
        "Evidence Explorer",
        "Painel de gestor",
        "Dados agregados de turma",
        "Export de relatórios",
        "Suporte prioritário",
        "API de integração",
    ],
};

/** Rótulos de recursos de um plano pelo slug (vazio se desconhecido). */
export function planFeatureLabels(slug: string): string[] {
    return PLAN_FEATURE_LABELS[slug] ?? [];
}
