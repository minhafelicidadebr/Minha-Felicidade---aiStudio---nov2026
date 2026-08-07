// Estado local (client-side) do "Laboratório de Aprendizagem".
// Sustenta 3 inovações da seção de ferramentas na landing:
//  1) Prescrição adaptativa (estado atual → prática certa, com razão científica)
//  2) Micro-prática de 60s dentro do card (experimentar antes de entrar)
//  3) Ritual de 7 dias gerado a partir do que a pessoa já experimentou
//
// Puramente de apresentação — nenhum dado sensível, nada sai do navegador.

export type StateKey = "ansioso" | "disperso" | "desanimado" | "sobrecarregado" | "curioso";

export const STATE_META: Record<
    StateKey,
    { label: string; caption: string; tools: string[]; rationale: string }
> = {
    ansioso: {
        label: "Ansioso(a)",
        caption: "corpo acelerado, mente adiantada",
        tools: ["breathing", "emotions", "gratitude"],
        rationale:
            "Ativação alta pede regulação fisiológica antes de qualquer tarefa cognitiva: respiração lenta primeiro, nomear a emoção depois (Ma et al., 2017; Lieberman et al., 2007).",
    },
    disperso: {
        label: "Sem foco",
        caption: "difícil sustentar atenção",
        tools: ["memory", "mindmap", "hypothesis"],
        rationale:
            "Atenção volta com tarefa curta, concreta e com feedback imediato — recuperação ativa e organização visual do conteúdo (Karpicke & Roediger, 2008; Novak & Cañas, 2008).",
    },
    desanimado: {
        label: "Desanimado(a)",
        caption: "pouca energia, pouco sentido",
        tools: ["gratitude", "missions", "challenge21"],
        rationale:
            "Afeto positivo sobe mais por ação com significado do que por introspecção: gratidão registrada e atos pró-sociais (Emmons & McCullough, 2003; Lyubomirsky, 2005).",
    },
    sobrecarregado: {
        label: "Sobrecarregado(a)",
        caption: "tudo ao mesmo tempo agora",
        tools: ["lifewheel", "breathing", "challenge21"],
        rationale:
            "Sobrecarga melhora com visão de conjunto e redução de escolha: mapear domínios da vida e reduzir a próxima ação ao menor passo possível (Lally et al., 2010).",
    },
    curioso: {
        label: "Curioso(a)",
        caption: "quero entender a ciência",
        tools: ["hypothesis", "mindmap", "lifewheel"],
        rationale:
            "Curiosidade é melhor aproveitada testando previsões próprias: hipótese se-então e mapa conceitual consolidam o modelo mental (Popper; Novak & Cañas, 2008).",
    },
};

const STORAGE_KEY = "mf.tools.lab.v1";

export type LabState = {
    tried: Record<string, number>; // toolId -> timestamp da última micro-prática
    state?: StateKey;
};

export function readLab(): LabState {
    if (typeof window === "undefined") return { tried: {} };
    try {
        const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as LabState;
        return { tried: raw.tried ?? {}, state: raw.state };
    } catch {
        return { tried: {} };
    }
}

export function writeLab(next: LabState) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        /* storage indisponível — degrada silenciosamente */
    }
}

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/**
 * Gera um ritual de 7 dias: começa pelas ferramentas prescritas para o estado
 * atual, intercala o que já foi experimentado (efeito de familiaridade) e
 * completa com o restante do catálogo, sem repetir dois dias seguidos.
 */
export function buildRitual(allIds: string[], lab: LabState): { day: string; toolId: string }[] {
    const prescribed = lab.state ? STATE_META[lab.state].tools : [];
    const tried = Object.keys(lab.tried);
    const ordered: string[] = [];
    for (const id of [...prescribed, ...tried, ...allIds]) {
        if (allIds.includes(id) && !ordered.includes(id)) ordered.push(id);
    }
    return WEEK_DAYS.map((day, i) => ({ day, toolId: ordered[i % ordered.length] }));
}
