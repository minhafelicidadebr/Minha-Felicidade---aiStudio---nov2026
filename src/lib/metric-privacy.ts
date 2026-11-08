// UX-3 — Privacidade dos indicadores agregados (funções puras).
//
// Normativo: docs/kiro/METRIC_PRIVACY_POLICY.md (§D5–§D7, decisões D53–D55).
//
// REGRA CENTRAL DESTE MÓDULO: o limiar mínimo NÃO é definido aqui.
// Ele vive numa única configuração canônica no servidor e chega em cada
// resposta (`minimumGroupSize`). Este módulo só sabe LER o que o servidor
// decidiu. Repetir o número 5 no cliente é exatamente como o limiar se degrada
// em silêncio: basta um componente ficar para trás numa refatoração.
//
// Por isso este módulo não exporta nenhuma constante numérica de limiar, e há
// teste (mais o gate de segurança) que falha se alguém introduzir uma.

/** Por que um grupo não tem valor divulgado. */
export type SuppressionReason =
    /** Grupo com 1..N-1 pessoas: divulgar permitiria reidentificação. */
    | "below_threshold"
    /** Suprimido para impedir reconstrução por subtração (§D6). */
    | "complementary";

/**
 * Grupo cujo valor foi suprimido pelo servidor.
 *
 * Note o que NÃO existe aqui: `value` e `count`. A ausência é o ponto — se o
 * tipo permitisse esses campos, o valor real poderia trafegar no payload e
 * vazar em DevTools, em log de rede ou em export, mesmo escondido na tela
 * (§D7/D55).
 */
export interface SuppressedGroup {
    readonly suppressed: true;
    readonly reason: SuppressionReason;
    /** Limiar aplicado pelo servidor, para exibição honesta. */
    readonly minimumGroupSize: number;
}

/** Grupo com valor divulgado (atingiu o limiar) ou grupo vazio (zero real). */
export interface DisclosedGroup {
    readonly suppressed: false;
    readonly value: number;
    /** Participantes distintos. Zero é um valor real: não expõe ninguém. */
    readonly count: number;
    /** True quando `count === 0` — estado textual próprio, não "suprimido". */
    readonly isEmpty: boolean;
}

export type MetricGroup = SuppressedGroup | DisclosedGroup;

/** Um grupo nomeado dentro de um conjunto (ex.: turma dentro da escola). */
export interface NamedGroup {
    readonly key: string;
    readonly label: string;
    readonly group: MetricGroup;
}

export function isSuppressed(group: MetricGroup): group is SuppressedGroup {
    return group.suppressed;
}

/**
 * Grupo vazio (zero participantes) versus grupo suprimido.
 *
 * Distinção deliberada (§D5): um grupo sem ninguém não expõe pessoa alguma, e
 * mostrar "0" ali é honesto. Tratar os dois como a mesma coisa faria o gestor
 * ler "sem dados" onde a resposta correta é "ninguém participou".
 */
export function isEmptyGroup(group: MetricGroup): boolean {
    return !group.suppressed && (group as DisclosedGroup).isEmpty;
}

/**
 * Texto do estado de um grupo. Os três estados possíveis têm textos DISTINTOS,
 * sem reuso — confundi-los faria o gestor decidir sobre um número que não
 * existe.
 *
 * Não recebe o valor: quem tem valor não passa por aqui.
 */
export function describeSuppression(group: SuppressedGroup): string {
    if (group.reason === "complementary") {
        return "Suprimido para proteger outro grupo pequeno do mesmo conjunto.";
    }
    return "Amostra insuficiente para exibição segura.";
}

/** Texto do grupo vazio — separado do suprimido de propósito. */
export const EMPTY_GROUP_TEXT = "Ninguém com registro no período.";

/** Texto de falha de leitura — separado dos dois acima (D45). */
export const READ_FAILURE_TEXT = "Não foi possível carregar este dado.";

/**
 * Rótulo de privacidade do bloco, usando o limiar que o SERVIDOR informou.
 * Descreve o mecanismo técnico; não afirma conformidade legal (doutrina §1).
 */
export function describeThreshold(minimumGroupSize: number): string {
    return `Agregado com limiar mínimo de ${minimumGroupSize} pessoas por grupo`;
}

/**
 * Detecta se um conjunto permite reconstruir, por subtração, o valor de um
 * único grupo suprimido (§D6/D54).
 *
 * O furo: escola com 4 turmas, total divulgado, uma turma suprimida. Basta
 * subtrair as três divulgadas do total. Não é ataque teórico — é aritmética de
 * primeiro grau, e qualquer pessoa com a tela aberta consegue.
 *
 * Existe um segundo caso, menos óbvio: se TODAS as turmas estão divulgadas
 * menos nenhuma, não há risco; e se duas ou mais estão suprimidas, o valor de
 * cada uma fica indeterminado (só se conhece a soma). Por isso o gatilho é
 * exatamente um grupo suprimido.
 */
export function isSubtractionRecoverable(input: {
    readonly groups: readonly NamedGroup[];
    readonly totalDisclosed: boolean;
}): boolean {
    if (!input.totalDisclosed) return false;
    const suppressed = input.groups.filter((item) => isSuppressed(item.group));
    return suppressed.length === 1;
}

/**
 * Alternativas de mitigação, escolhidas por regra DETERMINÍSTICA e documentada
 * (§D6 proíbe heurística opaca em tempo de execução).
 *
 * - `suppress_second_smallest`: esconde também a menor turma divulgada.
 * - `suppress_total`: esconde o total do conjunto.
 */
export type ComplementaryStrategy = "suppress_second_smallest" | "suppress_total";

export interface ComplementaryPlan {
    readonly strategy: ComplementaryStrategy;
    /** Chave do grupo a suprimir. Nulo quando a estratégia é esconder o total. */
    readonly groupKey: string | null;
    readonly rationale: string;
}

/**
 * Regra determinística de supressão complementar.
 *
 * Critério de "preservar mais utilidade" (§D6), resolvido de forma previsível e
 * sem empate possível:
 *
 *   Se sobra ao menos DOIS grupos divulgados, suprimir o MENOR deles. O
 *   conjunto continua mostrando total + pelo menos um grupo, então o gestor
 *   ainda compara.
 *
 *   Se sobra apenas UM grupo divulgado, suprimi-lo deixaria o conjunto sem
 *   nenhum detalhe. Nesse caso suprime-se o TOTAL, preservando os grupos.
 *
 * Empate de valor é resolvido pela chave em ordem lexicográfica, para que a
 * mesma entrada produza sempre a mesma saída (requisito de determinismo — sem
 * isso, dois renders da mesma tela poderiam esconder turmas diferentes).
 */
export function planComplementarySuppression(
    groups: readonly NamedGroup[],
): ComplementaryPlan {
    const disclosed = groups
        .filter((item): item is NamedGroup & { group: DisclosedGroup } => !isSuppressed(item.group))
        .slice()
        .sort((a, b) =>
            a.group.value !== b.group.value
                ? a.group.value - b.group.value
                : a.key.localeCompare(b.key),
        );

    if (disclosed.length >= 2) {
        return {
            strategy: "suppress_second_smallest",
            groupKey: disclosed[0].key,
            rationale:
                "Dois ou mais grupos divulgados: suprimir o menor mantém total e comparação entre os demais.",
        };
    }

    return {
        strategy: "suppress_total",
        groupKey: null,
        rationale:
            "Apenas um grupo divulgado: suprimir o total preserva mais detalhe que apagar o único grupo restante.",
    };
}

/**
 * Aplica a mitigação e devolve o conjunto seguro.
 *
 * Idempotente: aplicar duas vezes não muda o resultado, porque depois da
 * primeira aplicação já não existe "exatamente um grupo suprimido".
 */
export function enforceSubtractionSafety(input: {
    readonly groups: readonly NamedGroup[];
    readonly total: MetricGroup;
    readonly minimumGroupSize: number;
}): { groups: NamedGroup[]; total: MetricGroup; applied: ComplementaryPlan | null } {
    const totalDisclosed = !isSuppressed(input.total);

    if (!isSubtractionRecoverable({ groups: input.groups, totalDisclosed })) {
        return { groups: [...input.groups], total: input.total, applied: null };
    }

    const plan = planComplementarySuppression(input.groups);
    const suppressedMarker: SuppressedGroup = {
        suppressed: true,
        reason: "complementary",
        minimumGroupSize: input.minimumGroupSize,
    };

    if (plan.strategy === "suppress_total") {
        return { groups: [...input.groups], total: suppressedMarker, applied: plan };
    }

    return {
        groups: input.groups.map((item) =>
            item.key === plan.groupKey ? { ...item, group: suppressedMarker } : item,
        ),
        total: input.total,
        applied: plan,
    };
}

/**
 * Converte um grupo em célula de export (PDF/CSV).
 *
 * Existe porque §D6 exige que a supressão valha em TODA superfície de saída, e
 * o projeto já gera PDF do relatório do piloto. Esconder só na tela deixaria o
 * número no arquivo que o gestor manda por e-mail para a secretaria.
 */
export function toExportCell(group: MetricGroup): string {
    if (isSuppressed(group)) return "amostra insuficiente";
    return String(group.value);
}
