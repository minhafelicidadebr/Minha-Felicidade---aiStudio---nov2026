// UX-3 — Derivação dos itens da fila de decisões (funções puras).
//
// Cada item nasce de um DADO OBSERVADO e carrega a evidência que o gerou
// (contrato R9 item 1). Nada aqui é decorativo: se não há evidência, não há item.
//
// Privacidade (§D1/D49 e R9 itens 3–4): convites de ESTUDANTE são agregados por
// escola e papel, com contagem e sem e-mail. Estudante é adolescente, e o e-mail
// dele numa fila lida por qualquer gestor da rede é exposição desnecessária.
// Convites de adultos da equipe (educador, coordenação, gestão) aparecem
// individualmente, porque a ação de reenvio é por convite e o e-mail
// institucional é o identificador natural do trabalho.

import type { DecisionItem, DecisionPriority } from "@/components/dashboard/DecisionQueue";

/** Horas para um convite pendente virar decisão (§D8 — 168 h = 7 dias). */
export const PENDING_INVITATION_HOURS = 168;

export interface InvitationLike {
    id: string;
    invited_email: string;
    role: string;
    expires_at: string;
    accepted_at: string | null;
    created_at?: string;
    school_id?: string | null;
}

export interface SchoolLike {
    id: string;
    name: string;
}

const ROLE_LABEL: Record<string, string> = {
    org_admin: "gestão da rede",
    school_admin: "coordenação de escola",
    educator: "docência",
    student: "estudante",
    guardian: "responsável",
};

function roleLabel(role: string): string {
    return ROLE_LABEL[role] ?? role;
}

function hoursSince(iso: string | undefined, now: Date): number {
    if (!iso) return Number.POSITIVE_INFINITY;
    return (now.getTime() - new Date(iso).getTime()) / 3_600_000;
}

function isExpired(invitation: InvitationLike, now: Date): boolean {
    return new Date(invitation.expires_at).getTime() <= now.getTime();
}

/** Convite entra na fila quando está pendente há 168 h ou já expirou. */
export function isActionableInvitation(invitation: InvitationLike, now: Date): boolean {
    if (invitation.accepted_at) return false;
    return isExpired(invitation, now) || hoursSince(invitation.created_at, now) >= PENDING_INVITATION_HOURS;
}

export interface InvitationDecisionSource {
    /** Item individual (papéis adultos) — permite reenvio de um convite. */
    kind: "single";
    invitation: InvitationLike;
    expired: boolean;
}

export interface AggregatedDecisionSource {
    /** Grupo agregado (estudantes) — sem e-mail, com contagem. */
    kind: "aggregated";
    role: string;
    schoolId: string | null;
    schoolName: string | null;
    invitationIds: string[];
    expiredCount: number;
}

export type DecisionSource = InvitationDecisionSource | AggregatedDecisionSource;

/**
 * Agrupa convites acionáveis em fontes de decisão.
 *
 * Ordenação estável (mais antigo primeiro dentro da prioridade) para que a fila
 * não dance entre leituras.
 */
export function buildInvitationSources(
    invitations: readonly InvitationLike[],
    schools: readonly SchoolLike[],
    now: Date = new Date(),
): DecisionSource[] {
    const actionable = invitations.filter((invitation) => isActionableInvitation(invitation, now));

    const students = actionable.filter((invitation) => invitation.role === "student");
    const adults = actionable.filter((invitation) => invitation.role !== "student");

    const sources: DecisionSource[] = adults
        .slice()
        .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))
        .map((invitation) => ({
            kind: "single" as const,
            invitation,
            expired: isExpired(invitation, now),
        }));

    // Estudantes: um item por escola, sem e-mail algum.
    const bySchool = new Map<string, InvitationLike[]>();
    for (const invitation of students) {
        const key = invitation.school_id ?? "";
        const bucket = bySchool.get(key);
        if (bucket) bucket.push(invitation);
        else bySchool.set(key, [invitation]);
    }

    for (const [schoolId, group] of [...bySchool.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        sources.push({
            kind: "aggregated",
            role: "student",
            schoolId: schoolId || null,
            schoolName: schools.find((school) => school.id === schoolId)?.name ?? null,
            invitationIds: group.map((invitation) => invitation.id),
            expiredCount: group.filter((invitation) => isExpired(invitation, now)).length,
        });
    }

    return sources;
}

/** Convite expirado é mais urgente: perdeu-se a janela de adesão. */
function invitationPriority(expired: boolean): DecisionPriority {
    return expired ? "high" : "medium";
}

export interface BuildItemsOptions {
    sources: readonly DecisionSource[];
    /** Falso quando o papel efetivo não pode reenviar: item fica sem controle. */
    canResend: boolean;
    /** Executa o reenvio dos convites informados. */
    resend: (invitationIds: string[]) => Promise<import("@/components/dashboard/DecisionQueue").DecisionActionOutcome>;
    /** Bloqueio já conhecido no cliente (janela/limite), por id de convite. */
    blockedReasonFor?: (invitationIds: string[]) => string | null;
}

/** Converte fontes em itens de fila, com a evidência no texto. */
export function buildInvitationDecisionItems(options: BuildItemsOptions): DecisionItem[] {
    return options.sources.map((source) => {
        if (source.kind === "single") {
            const { invitation, expired } = source;
            const ids = [invitation.id];
            const blockedReason = options.blockedReasonFor?.(ids) ?? null;
            return {
                id: `invitation:${invitation.id}`,
                title: `Convite pendente — ${roleLabel(invitation.role)}`,
                reason: expired
                    ? `Convite para ${invitation.invited_email} expirou em ${new Date(invitation.expires_at).toLocaleDateString("pt-BR")} sem ser aceito.`
                    : `Convite para ${invitation.invited_email} está pendente há ${Math.floor(hoursSince(invitation.created_at, new Date()) / 24)} dias.`,
                priority: invitationPriority(expired),
                owner: "gestão da rede",
                due: expired ? "reemitir" : "esta semana",
                mutation: options.canResend
                    ? {
                        label: "Reenviar convite",
                        pendingLabel: "Reenviando…",
                        run: () => options.resend(ids),
                        blockedReason: expired
                            ? "Convite expirado: reenvio não se aplica. Emita um novo convite."
                            : blockedReason,
                    }
                    : undefined,
            };
        }

        const total = source.invitationIds.length;
        const local = source.schoolName ? ` — ${source.schoolName}` : "";
        const blockedReason = options.blockedReasonFor?.(source.invitationIds) ?? null;
        return {
            id: `invitations:student:${source.schoolId ?? "sem-escola"}`,
            title: `${total} ${total === 1 ? "convite" : "convites"} de estudante pendentes${local}`,
            // Sem e-mail: identificação por papel e contagem (R9 item 3).
            reason:
                source.expiredCount > 0
                    ? `${total} ${total === 1 ? "convite" : "convites"} sem aceite, ${source.expiredCount} já expirado(s). Identificados por papel e contagem, sem e-mail.`
                    : `${total} ${total === 1 ? "convite" : "convites"} sem aceite há 7 dias ou mais. Identificados por papel e contagem, sem e-mail.`,
            priority: source.expiredCount > 0 ? "high" : "medium",
            owner: source.schoolName ? "coordenação da escola" : "gestão da rede",
            due: "esta semana",
            mutation: options.canResend
                ? {
                    label: total === 1 ? "Reenviar convite" : "Reenviar convites",
                    pendingLabel: "Reenviando…",
                    run: () => options.resend(source.invitationIds),
                    blockedReason,
                }
                : undefined,
        };
    });
}

// ── Escalonamento por indicador fora da faixa esperada ──────────────────────

export interface ExpectedRange {
    /** Rótulo do indicador exibido na evidência. */
    label: string;
    min: number;
    max: number;
}

/** Faixa esperada da taxa de ativação, declarada no próprio indicador. */
export const ACTIVATION_EXPECTED_RANGE: ExpectedRange = {
    label: "Taxa de ativação",
    min: 60,
    max: 100,
};

export function isOutOfRange(value: number, range: ExpectedRange): boolean {
    return value < range.min || value > range.max;
}

export function describeRange(range: ExpectedRange): string {
    return `faixa esperada ${range.min}%–${range.max}%`;
}

/** Dias entre a leitura atual e a anterior usada na comparação. */
export const READING_INTERVAL_DAYS = 7;

export interface MembershipLike {
    created_at?: string;
    status?: string;
}

/**
 * Taxa de ativação como estava em um instante do passado.
 *
 * RECONSTRUÇÃO, não snapshot. O contrato (R9 item 16) pede duas leituras
 * consecutivas fora da faixa para não escalar por oscilação, mas o projeto não
 * guarda histórico de indicador. Em vez de criar tabela de snapshot e um cron
 * para alimentá-la, a leitura anterior é reconstruída de `created_at`: contam-se
 * apenas as linhas que já existiam na data alvo.
 *
 * LIMITAÇÃO HONESTA: a reconstrução assume que quem é membro hoje já era membro
 * quando entrou, e não vê remoções. Uma pessoa removida da rede continua
 * contando na leitura passada (porque a linha desapareceu do presente, não do
 * passado). Para o uso aqui — decidir se um indicador está ruim há uma semana ou
 * caiu agora — a aproximação é suficiente. Para relatório oficial de série
 * histórica, não é: isso exigiria snapshot de verdade.
 */
export function computeActivationRateAt(
    members: readonly MembershipLike[],
    invitations: readonly InvitationLike[],
    at: Date,
): number | null {
    const cutoff = at.getTime();

    const membersThen = members.filter(
        (member) => member.created_at && new Date(member.created_at).getTime() <= cutoff,
    ).length;

    // Convite pendente naquela data: já existia e ainda não havia sido aceito.
    const pendingThen = invitations.filter((invitation) => {
        if (!invitation.created_at) return false;
        if (new Date(invitation.created_at).getTime() > cutoff) return false;
        if (!invitation.accepted_at) return true;
        return new Date(invitation.accepted_at).getTime() > cutoff;
    }).length;

    const invitedThen = membersThen + pendingThen;
    // Sem ninguém convidado naquela data, não existe taxa — e zero seria uma
    // leitura fabricada que dispararia escalonamento indevido (doutrina §1).
    if (invitedThen === 0) return null;

    return Math.round((membersThen / invitedThen) * 100);
}

export interface ActivationEscalationInput {
    members: readonly MembershipLike[];
    invitations: readonly InvitationLike[];
    range: ExpectedRange;
    now?: Date;
}

export interface ActivationEscalationVerdict {
    /** True só quando AS DUAS leituras estão fora da faixa. */
    shouldEscalate: boolean;
    current: number | null;
    previous: number | null;
    /** Explica por que escalou ou por que não — usado na evidência do item. */
    rationale: string;
}

/**
 * Decide se a taxa de ativação merece escalonamento (R9 item 16).
 *
 * Exige DUAS leituras consecutivas fora da faixa. Uma leitura só poderia ser
 * oscilação — uma rede que convidou 30 pessoas ontem tem ativação baixa por
 * construção, não por problema.
 */
export function evaluateActivationEscalation(
    input: ActivationEscalationInput,
): ActivationEscalationVerdict {
    const now = input.now ?? new Date();
    const previousAt = new Date(now.getTime() - READING_INTERVAL_DAYS * 86_400_000);

    const current = computeActivationRateAt(input.members, input.invitations, now);
    const previous = computeActivationRateAt(input.members, input.invitations, previousAt);

    if (current === null) {
        return {
            shouldEscalate: false,
            current,
            previous,
            rationale: "Ainda não há convites suficientes para calcular a taxa de ativação.",
        };
    }

    if (!isOutOfRange(current, input.range)) {
        return {
            shouldEscalate: false,
            current,
            previous,
            rationale: `Ativação em ${current}%, dentro da ${describeRange(input.range)}.`,
        };
    }

    if (previous === null) {
        return {
            shouldEscalate: false,
            current,
            previous,
            rationale: `Ativação em ${current}%, fora da ${describeRange(input.range)}, mas sem leitura de ${READING_INTERVAL_DAYS} dias atrás para confirmar tendência.`,
        };
    }

    if (!isOutOfRange(previous, input.range)) {
        return {
            shouldEscalate: false,
            current,
            previous,
            rationale: `Ativação caiu para ${current}% agora, mas estava em ${previous}% há ${READING_INTERVAL_DAYS} dias — pode ser oscilação de convites recentes.`,
        };
    }

    return {
        shouldEscalate: true,
        current,
        previous,
        rationale: `Ativação fora da ${describeRange(input.range)} em duas leituras: ${previous}% há ${READING_INTERVAL_DAYS} dias e ${current}% agora.`,
    };
}

// ── Permissão de ação por papel (R9 item 15) ────────────────────────────────

/**
 * Papéis institucionais que podem reenviar convite.
 *
 * Espelha `is_org_admin` no banco, que é a autoridade real: `resend_invitation`
 * verifica a permissão de novo no servidor e nega quem não pode. Esta lista
 * serve para NÃO RENDERIZAR o controle a quem não pode usá-lo — mostrar um botão
 * que sempre falha é pior que não mostrar botão.
 *
 * `school_admin` fica de fora porque `invite_member` e `resend_invitation`
 * exigem `is_org_admin`: a coordenação de escola não emite convite da rede.
 */
const ROLES_THAT_CAN_RESEND: readonly string[] = ["org_admin", "platform_admin"];

export interface MembershipRoleLike {
    organizationId: string;
    role: string;
}

/**
 * A pessoa pode reenviar convite nesta organização?
 *
 * Derivado dos vínculos que o servidor devolveu — o cliente não afirma papel,
 * só lê o que veio. Decisão final continua no banco.
 */
export function canResendInvitations(
    memberships: readonly MembershipRoleLike[],
    organizationId: string | null | undefined,
): boolean {
    if (!organizationId) return false;
    return memberships.some(
        (membership) =>
            membership.organizationId === organizationId &&
            ROLES_THAT_CAN_RESEND.includes(membership.role),
    );
}

/** Texto exibido quando o papel não alcança a ação, em vez de um botão morto. */
export const CANNOT_RESEND_HINT =
    "Reenvio de convite é uma ação da gestão da rede. Sua conta pode acompanhar a pendência, mas não reenviar.";
