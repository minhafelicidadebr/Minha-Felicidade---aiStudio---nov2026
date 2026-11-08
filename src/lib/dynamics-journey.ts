// Estado local (client-side) da jornada nas 8 dinâmicas da landing.
// Puramente de apresentação: guarda o que o visitante já experimentou no
// preview jogável para alimentar a trilha (Learning Passport) e o Coach.

export type Phase = "ensinar" | "treinar" | "transferir";

export const PHASE_META: Record<Phase, { label: string; caption: string }> = {
    ensinar: { label: "Ensinar", caption: "Construir o conceito com evidência" },
    treinar: { label: "Treinar", caption: "Praticar até virar automático" },
    transferir: { label: "Transferir", caption: "Levar para a vida real" },
};

const STORAGE_KEY = "mf.dynamics.journey.v1";

export type JourneyState = Record<string, { touched: boolean; correct?: boolean }>;

export function readJourney(): JourneyState {
    if (typeof window === "undefined") return {};
    try {
        return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as JourneyState;
    } catch {
        return {};
    }
}

export function writeJourney(state: JourneyState) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        /* storage indisponível — degrada silenciosamente */
    }
}

export function masteryFor(ids: string[], state: JourneyState): number {
    if (ids.length === 0) return 0;
    const done = ids.filter((id) => state[id]?.touched).length;
    return Math.round((done / ids.length) * 100);
}
