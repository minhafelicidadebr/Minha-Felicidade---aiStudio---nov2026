import type { ClassRoom, Invitation, Membership, Organization, School } from "@/hooks/useOrganizationDetail";
import type { OrgEngagementSummary } from "@/hooks/useOrgAnalytics";

export type DeploymentStageStatus = "concluído" | "pendente" | "bloqueado" | "indisponível";

export interface OrganizationSubscriptionSnapshot {
    id: string;
    organization_name: string;
    organization_id: string | null;
    owner_id: string;
    status: string;
    billing_interval: string;
    max_seats: number;
    current_period_start: string | null;
    current_period_end: string | null;
}

export interface SeatAllocationSummary {
    contractedSeats: number;
    occupiedStudentSeats: number;
    reservedStudentSeats: number;
    availableStudentSeats: number;
    expiredStudentInvitations: Invitation[];
    validStudentInvitations: Invitation[];
    isQuotaFull: boolean;
    hasActiveContract: boolean;
}

export interface StaffActivationSummary {
    activeOrgAdmins: number;
    activeSchoolAdmins: number;
    activeEducators: number;
    validStaffInvitations: Invitation[];
    expiredStaffInvitations: Invitation[];
    hasPedagogicalTeam: boolean;
}

export interface DeploymentStageItem {
    id:
        | "contract_and_association"
        | "network_schools_classes"
        | "seats_and_invitations"
        | "staff_activation"
        | "student_entry_and_activity"
        | "network_readiness";
    stepNumber: number;
    title: string;
    status: DeploymentStageStatus;
    summary: string;
    detail: string;
    primaryActionLabel?: string;
    primaryActionId?:
        | "claim_subscription"
        | "associate_unlinked_subscription"
        | "open_pricing"
        | "add_school"
        | "add_class"
        | "invite_student"
        | "invite_staff"
        | "reissue_expired_invites"
        | "retry_engagement"
        | "download_pilot_report"
        | "open_first_school";
}

export interface NetworkDeploymentModel {
    overallStatus: DeploymentStageStatus;
    completedCount: number;
    totalStages: number;
    contractState:
        | "active_linked"
        | "association_pending"
        | "expired_linked"
        | "missing_contract"
        | "unavailable";
    seats: SeatAllocationSummary;
    staff: StaffActivationSummary;
    schoolsWithoutClasses: School[];
    allExpiredInvitations: Invitation[];
    stages: DeploymentStageItem[];
    nextPriorityTitle: string;
    nextPriorityDescription: string;
    nextPriorityActionId?: DeploymentStageItem["primaryActionId"];
    nextPriorityActionLabel?: string;
}

export interface BuildNetworkDeploymentInput {
    org: Organization | null;
    schools: School[];
    classes: ClassRoom[];
    members: Membership[];
    invitations: Invitation[];
    linkedSubscription: OrganizationSubscriptionSnapshot | null;
    unlinkedSubscriptions: OrganizationSubscriptionSnapshot[];
    subscriptionQueryError?: string | null;
    engagement?: OrgEngagementSummary | null;
    engagementLoading?: boolean;
    engagementError?: string | null;
    now?: Date;
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export function isSubscriptionCurrentlyActive(
    sub: OrganizationSubscriptionSnapshot | null | undefined,
    now: Date = new Date(),
): boolean {
    if (!sub) return false;
    if (sub.status !== "active" && sub.status !== "trialing") return false;
    if (!sub.current_period_end) return true;
    const endMs = new Date(sub.current_period_end).getTime();
    return Number.isFinite(endMs) && endMs > now.getTime();
}

export function computeSeatAllocation(
    members: Membership[],
    invitations: Invitation[],
    linkedSubscription: OrganizationSubscriptionSnapshot | null,
    now: Date = new Date(),
): SeatAllocationSummary {
    const hasActiveContract = isSubscriptionCurrentlyActive(linkedSubscription, now);
    const contractedSeats = hasActiveContract ? Math.max(1, linkedSubscription?.max_seats ?? 30) : 0;

    const activeStudentIds = new Set(
        members
            .filter((m) => m.role === "student" && m.status === "active")
            .map((m) => m.user_id),
    );
    const occupiedStudentSeats = activeStudentIds.size;

    const validStudentInvitations: Invitation[] = [];
    const expiredStudentInvitations: Invitation[] = [];
    const reservedEmails = new Set<string>();

    for (const inv of invitations) {
        if (inv.role !== "student" || inv.accepted_at !== null) continue;
        const expiresMs = new Date(inv.expires_at).getTime();
        const isExpired = !Number.isFinite(expiresMs) || expiresMs <= now.getTime();
        if (isExpired) {
            expiredStudentInvitations.push(inv);
        } else {
            const norm = normalizeEmail(inv.invited_email);
            if (!reservedEmails.has(norm)) {
                reservedEmails.add(norm);
                validStudentInvitations.push(inv);
            }
        }
    }

    const reservedStudentSeats = reservedEmails.size;
    const usedOrReserved = occupiedStudentSeats + reservedStudentSeats;
    const availableStudentSeats = hasActiveContract
        ? Math.max(0, contractedSeats - usedOrReserved)
        : 0;
    const isQuotaFull = hasActiveContract && usedOrReserved >= contractedSeats;

    return {
        contractedSeats,
        occupiedStudentSeats,
        reservedStudentSeats,
        availableStudentSeats,
        expiredStudentInvitations,
        validStudentInvitations,
        isQuotaFull,
        hasActiveContract,
    };
}

export function computeStaffActivation(
    members: Membership[],
    invitations: Invitation[],
    now: Date = new Date(),
): StaffActivationSummary {
    const activeMembers = members.filter((m) => m.status === "active");
    const activeOrgAdmins = new Set(
        activeMembers.filter((m) => m.role === "org_admin").map((m) => m.user_id),
    ).size;
    const activeSchoolAdmins = new Set(
        activeMembers.filter((m) => m.role === "school_admin").map((m) => m.user_id),
    ).size;
    const activeEducators = new Set(
        activeMembers.filter((m) => m.role === "educator").map((m) => m.user_id),
    ).size;

    const validStaffInvitations: Invitation[] = [];
    const expiredStaffInvitations: Invitation[] = [];

    for (const inv of invitations) {
        if (!["org_admin", "school_admin", "educator"].includes(inv.role) || inv.accepted_at !== null) {
            continue;
        }
        const expiresMs = new Date(inv.expires_at).getTime();
        if (!Number.isFinite(expiresMs) || expiresMs <= now.getTime()) {
            expiredStaffInvitations.push(inv);
        } else {
            validStaffInvitations.push(inv);
        }
    }

    return {
        activeOrgAdmins,
        activeSchoolAdmins,
        activeEducators,
        validStaffInvitations,
        expiredStaffInvitations,
        hasPedagogicalTeam: activeSchoolAdmins + activeEducators > 0,
    };
}

export function buildNetworkDeploymentModel(input: BuildNetworkDeploymentInput): NetworkDeploymentModel {
    const now = input.now ?? new Date();
    const {
        org,
        schools,
        classes,
        members,
        invitations,
        linkedSubscription,
        unlinkedSubscriptions,
        subscriptionQueryError,
        engagement,
        engagementLoading = false,
        engagementError = null,
    } = input;

    const seats = computeSeatAllocation(members, invitations, linkedSubscription, now);
    const staff = computeStaffActivation(members, invitations, now);
    const schoolsWithoutClasses = schools.filter(
        (school) => !classes.some((cls) => cls.school_id === school.id),
    );
    const allExpiredInvitations = [
        ...seats.expiredStudentInvitations,
        ...staff.expiredStaffInvitations,
    ];

    // ── Etapa 1: Contrato e associação da organização ────────────────────────
    let contractState: NetworkDeploymentModel["contractState"] = "missing_contract";
    let stage1Status: DeploymentStageStatus = "bloqueado";
    let stage1Summary = "Nenhuma assinatura ativa vinculada a esta organização";
    let stage1Detail =
        "Para liberar convites e vagas de estudantes nesta rede, reivindique um pagamento aprovado ou contrate o plano escolar.";
    let stage1ActionLabel: string | undefined = "Verificar pagamento aprovado";
    let stage1ActionId: DeploymentStageItem["primaryActionId"] = "claim_subscription";

    if (!org || subscriptionQueryError) {
        contractState = "unavailable";
        stage1Status = "indisponível";
        stage1Summary = "Estado contratual indisponível no momento";
        stage1Detail = subscriptionQueryError || "Não foi possível consultar o contrato desta organização.";
        stage1ActionLabel = undefined;
        stage1ActionId = undefined;
    } else if (seats.hasActiveContract && linkedSubscription) {
        contractState = "active_linked";
        stage1Status = "concluído";
        const intervalLabel = linkedSubscription.billing_interval === "yearly" ? "anual" : "mensal";
        const periodEndLabel = linkedSubscription.current_period_end
            ? new Date(linkedSubscription.current_period_end).toLocaleDateString("pt-BR")
            : "vigente";
        stage1Summary = `Plano Escolar ativo (${intervalLabel}) · ${seats.contractedSeats} vagas contratadas`;
        stage1Detail = `Assinatura vinculada à organização ${org.name} · vigência até ${periodEndLabel}.`;
        stage1ActionLabel = undefined;
        stage1ActionId = undefined;
    } else if (unlinkedSubscriptions.length > 0) {
        contractState = "association_pending";
        stage1Status = "pendente";
        const candidate = unlinkedSubscriptions[0];
        stage1Summary = `Assinatura ativa aguardando vínculo com a rede (${candidate.max_seats} vagas)`;
        stage1Detail =
            unlinkedSubscriptions.length === 1
                ? `Identificamos 1 contrato escolar pago em sua conta ainda sem organização vinculada. Vincule-o explicitamente a "${org.name}" para liberar as vagas.`
                : `Identificamos ${unlinkedSubscriptions.length} contratos sem vínculo automático. Associe a assinatura correta para liberar os assentos de estudantes.`;
        stage1ActionLabel = "Vincular assinatura a esta rede";
        stage1ActionId = "associate_unlinked_subscription";
    } else if (linkedSubscription) {
        contractState = "expired_linked";
        stage1Status = "bloqueado";
        const endedAt = linkedSubscription.current_period_end
            ? new Date(linkedSubscription.current_period_end).toLocaleDateString("pt-BR")
            : "encerrada";
        stage1Summary = `Assinatura vinculada expirada ou inativa (${endedAt})`;
        stage1Detail =
            "Novos convites de estudantes e acessos pagos estão pausados até a renovação ou reivindicação de novo pagamento aprovado.";
        stage1ActionLabel = "Renovar ou reivindicar pagamento";
        stage1ActionId = "claim_subscription";
    }

    const stage1: DeploymentStageItem = {
        id: "contract_and_association",
        stepNumber: 1,
        title: "Contrato e associação da organização",
        status: stage1Status,
        summary: stage1Summary,
        detail: stage1Detail,
        primaryActionLabel: stage1ActionLabel,
        primaryActionId: stage1ActionId,
    };

    // ── Etapa 2: Configuração da rede, escolas e turmas ──────────────────────
    let stage2Status: DeploymentStageStatus = "pendente";
    let stage2Summary = "";
    let stage2Detail = "";
    let stage2ActionLabel: string | undefined;
    let stage2ActionId: DeploymentStageItem["primaryActionId"];

    if (!org) {
        stage2Status = "indisponível";
        stage2Summary = "Estrutura escolar indisponível";
        stage2Detail = "Aguardando carregamento da organização.";
    } else if (schools.length === 0) {
        stage2Status = "pendente";
        stage2Summary = "Nenhuma escola cadastrada na rede";
        stage2Detail = "Cadastre ao menos uma unidade escolar para organizar turmas, educadores e estudantes.";
        stage2ActionLabel = "Cadastrar primeira escola";
        stage2ActionId = "add_school";
    } else if (classes.length === 0) {
        stage2Status = "pendente";
        stage2Summary = `${schools.length} ${schools.length === 1 ? "escola cadastrada" : "escolas cadastradas"} · 0 turmas`;
        stage2Detail = `Crie a primeira turma em "${schools[0].name}" para alocar estudantes e educadores.`;
        stage2ActionLabel = "Criar primeira turma";
        stage2ActionId = "add_class";
    } else {
        stage2Status = "concluído";
        stage2Summary = `${schools.length} ${schools.length === 1 ? "escola" : "escolas"} · ${classes.length} ${classes.length === 1 ? "turma ativa" : "turmas ativas"}`;
        stage2Detail =
            schoolsWithoutClasses.length > 0
                ? `${schoolsWithoutClasses.length} ${schoolsWithoutClasses.length === 1 ? "escola ainda não possui" : "escolas ainda não possuem"} turmas cadastradas (${schoolsWithoutClasses.map((s) => s.name).join(", ")}).`
                : "Todas as escolas ativas contam com turmas configuradas.";
        if (schoolsWithoutClasses.length > 0) {
            stage2ActionLabel = "Adicionar turma pendente";
            stage2ActionId = "add_class";
        }
    }

    const stage2: DeploymentStageItem = {
        id: "network_schools_classes",
        stepNumber: 2,
        title: "Configuração da rede, escolas e turmas",
        status: stage2Status,
        summary: stage2Summary,
        detail: stage2Detail,
        primaryActionLabel: stage2ActionLabel,
        primaryActionId: stage2ActionId,
    };

    // ── Etapa 3: Convites e vagas (contratadas, ocupadas e reservadas) ───────
    let stage3Status: DeploymentStageStatus = "pendente";
    let stage3Summary = "";
    let stage3Detail = "";
    let stage3ActionLabel: string | undefined;
    let stage3ActionId: DeploymentStageItem["primaryActionId"];

    if (!org) {
        stage3Status = "indisponível";
        stage3Summary = "Controle de vagas indisponível";
        stage3Detail = "Aguardando carregamento da organização.";
    } else if (!seats.hasActiveContract) {
        stage3Status = "bloqueado";
        stage3Summary = `0 vagas contratadas ativas · ${seats.occupiedStudentSeats} ocupadas · ${seats.reservedStudentSeats} reservadas`;
        stage3Detail =
            "A alocação de vagas de estudantes exige assinatura escolar ativa e vinculada na Etapa 1. Convites para equipe pedagógica continuam liberados.";
        stage3ActionLabel = stage1ActionLabel;
        stage3ActionId = stage1ActionId;
    } else if (seats.isQuotaFull) {
        stage3Status = seats.occupiedStudentSeats > 0 ? "concluído" : "bloqueado";
        stage3Summary = `Cota máxima atingida: ${seats.occupiedStudentSeats} ocupadas + ${seats.reservedStudentSeats} reservadas de ${seats.contractedSeats} contratadas (0 livres)`;
        stage3Detail =
            seats.expiredStudentInvitations.length > 0
                ? `Todas as ${seats.contractedSeats} vagas de estudantes estão ocupadas ou reservadas. Há ${seats.expiredStudentInvitations.length} convite(s) expirado(s) que não ocupam vaga.`
                : `Todas as ${seats.contractedSeats} vagas de estudantes estão ocupadas ou reservadas por convites pendentes válidos. Convites para educadores continuam liberados.`;
        if (seats.expiredStudentInvitations.length > 0) {
            stage3ActionLabel = `Reemitir expirados (${seats.expiredStudentInvitations.length})`;
            stage3ActionId = "reissue_expired_invites";
        } else if (seats.occupiedStudentSeats === 0) {
            stage3ActionLabel = "Convidar equipe docente";
            stage3ActionId = "invite_staff";
        }
    } else if (seats.occupiedStudentSeats === 0 && seats.reservedStudentSeats === 0) {
        stage3Status = "pendente";
        stage3Summary = `${seats.contractedSeats} contratadas · 0 ocupadas · 0 reservadas · ${seats.availableStudentSeats} disponíveis`;
        stage3Detail =
            seats.expiredStudentInvitations.length > 0
                ? `Existem ${seats.expiredStudentInvitations.length} convite(s) de estudante expirado(s) que liberaram reserva. Reemita-os ou convide novos alunos.`
                : "Envie os primeiros convites para estudantes reservarem e ativarem suas vagas na rede.";
        stage3ActionLabel =
            seats.expiredStudentInvitations.length > 0
                ? `Reemitir expirados (${seats.expiredStudentInvitations.length})`
                : "Convidar estudantes";
        stage3ActionId =
            seats.expiredStudentInvitations.length > 0
                ? "reissue_expired_invites"
                : "invite_student";
    } else {
        stage3Status = seats.occupiedStudentSeats > 0 ? "concluído" : "pendente";
        stage3Summary = `${seats.contractedSeats} contratadas · ${seats.occupiedStudentSeats} ocupadas · ${seats.reservedStudentSeats} reservadas · ${seats.availableStudentSeats} disponíveis`;
        stage3Detail =
            seats.expiredStudentInvitations.length > 0
                ? `${seats.expiredStudentInvitations.length} convite(s) de estudante expiraram e liberaram vaga automaticamente.`
                : seats.occupiedStudentSeats > 0
                    ? "Vagas de estudantes ativas e contabilizadas dentro do limite contratado."
                    : "Convites de estudantes enviados e dentro do prazo de validade; aguardando primeiro aceite.";
        stage3ActionLabel =
            seats.expiredStudentInvitations.length > 0
                ? `Reemitir expirados (${seats.expiredStudentInvitations.length})`
                : "Convidar mais estudantes";
        stage3ActionId =
            seats.expiredStudentInvitations.length > 0
                ? "reissue_expired_invites"
                : "invite_student";
    }

    const stage3: DeploymentStageItem = {
        id: "seats_and_invitations",
        stepNumber: 3,
        title: "Convites e vagas (contratadas, ocupadas e reservadas)",
        status: stage3Status,
        summary: stage3Summary,
        detail: stage3Detail,
        primaryActionLabel: stage3ActionLabel,
        primaryActionId: stage3ActionId,
    };

    // ── Etapa 4: Ativação de gestores e educadores ───────────────────────────
    let stage4Status: DeploymentStageStatus = "pendente";
    let stage4Summary = "";
    let stage4Detail = "";
    let stage4ActionLabel: string | undefined;
    let stage4ActionId: DeploymentStageItem["primaryActionId"];

    if (!org) {
        stage4Status = "indisponível";
        stage4Summary = "Equipe institucional indisponível";
        stage4Detail = "Aguardando carregamento da organização.";
    } else if (staff.hasPedagogicalTeam) {
        stage4Status = "concluído";
        stage4Summary = `${staff.activeOrgAdmins} gestor(es) · ${staff.activeSchoolAdmins} coord. escolar(es) · ${staff.activeEducators} educador(es) ativos`;
        stage4Detail =
            staff.validStaffInvitations.length > 0
                ? `${staff.validStaffInvitations.length} convite(s) adicional(is) para a equipe aguardando aceite.`
                : "Equipe pedagógica ativa e habilitada para conduzir atividades nas escolas.";
        stage4ActionLabel = "Convidar membro da equipe";
        stage4ActionId = "invite_staff";
    } else {
        stage4Status = "pendente";
        stage4Summary = `${staff.activeOrgAdmins} gestor(es) ativo(s) · 0 coordenadores ou educadores ativos`;
        stage4Detail =
            staff.validStaffInvitations.length > 0
                ? `${staff.validStaffInvitations.length} convite(s) para educador/coordenador enviado(s) e aguardando aceite.`
                : "Convide ao menos um coordenador escolar ou educador para acompanhar as turmas no dia a dia.";
        stage4ActionLabel = "Convidar educador ou coordenador";
        stage4ActionId = "invite_staff";
    }

    const stage4: DeploymentStageItem = {
        id: "staff_activation",
        stepNumber: 4,
        title: "Ativação de gestores e educadores",
        status: stage4Status,
        summary: stage4Summary,
        detail: stage4Detail,
        primaryActionLabel: stage4ActionLabel,
        primaryActionId: stage4ActionId,
    };

    // ── Etapa 5: Entrada dos alunos e atividade inicial ──────────────────────
    let stage5Status: DeploymentStageStatus = "pendente";
    let stage5Summary = "";
    let stage5Detail = "";
    let stage5ActionLabel: string | undefined;
    let stage5ActionId: DeploymentStageItem["primaryActionId"];

    if (!org) {
        stage5Status = "indisponível";
        stage5Summary = "Dados de entrada de estudantes indisponíveis";
        stage5Detail = "Aguardando carregamento da organização.";
    } else if (!seats.hasActiveContract) {
        stage5Status = "bloqueado";
        stage5Summary = "Entrada de estudantes aguardando contrato ativo";
        stage5Detail = "Assim que o contrato estiver ativo e vinculado na Etapa 1, os estudantes convidados poderão entrar e iniciar a jornada.";
    } else if (engagementError) {
        stage5Status = "indisponível";
        stage5Summary = `${seats.occupiedStudentSeats} estudante(s) ativo(s) · leitura de atividade indisponível`;
        stage5Detail = `Não foi possível consultar o resumo agregado de engajamento (${engagementError}).`;
        stage5ActionLabel = "Tentar novamente";
        stage5ActionId = "retry_engagement";
    } else if (seats.occupiedStudentSeats === 0) {
        stage5Status = "pendente";
        stage5Summary = "Nenhum estudante ativo na rede até o momento";
        stage5Detail =
            seats.reservedStudentSeats > 0
                ? `${seats.reservedStudentSeats} estudante(s) possuem convite válido pendente de aceite.`
                : "Envie convites de estudante na Etapa 3 para iniciar a entrada nas turmas.";
        if (!seats.isQuotaFull) {
            stage5ActionLabel = "Convidar estudantes";
            stage5ActionId = "invite_student";
        }
    } else if (engagementLoading || !engagement) {
        stage5Status = "pendente";
        stage5Summary = `${seats.occupiedStudentSeats} estudante(s) ativo(s) · verificando atividade agregada`;
        stage5Detail = "Consultando registros agregados dos últimos 30 dias.";
    } else {
        const suppressed = new Set(engagement.suppressed_metrics ?? []);
        const totalSessions = typeof engagement.total_sessions === "number" ? engagement.total_sessions : 0;
        const totalExercises = typeof engagement.total_exercises === "number" ? engagement.total_exercises : 0;
        const active7d = typeof engagement.active_users_7d === "number" ? engagement.active_users_7d : 0;
        const hasRecordedActivity = totalSessions > 0 || totalExercises > 0 || active7d > 0 || suppressed.size > 0;

        if (hasRecordedActivity) {
            stage5Status = "concluído";
            if (suppressed.size > 0 && totalSessions === 0) {
                stage5Summary = `${seats.occupiedStudentSeats} estudante(s) ativo(s) · atividade inicial registrada sob proteção de privacidade`;
                stage5Detail = `Há participação registrada, mas os valores numéricos permanecem ocultos até atingir o mínimo de ${engagement.minimum_group_size} participantes distintos (anonimato k).`;
            } else {
                stage5Summary = `${seats.occupiedStudentSeats} estudante(s) ativo(s) · ${totalSessions} sessões e ${totalExercises} exercícios (30d)`;
                stage5Detail = "Atividade inicial dos estudantes confirmada em formato estritamente agregado e não clínico.";
            }
        } else {
            stage5Status = "pendente";
            stage5Summary = `${seats.occupiedStudentSeats} estudante(s) ativo(s) · aguardando primeira atividade`;
            stage5Detail =
                "Os estudantes já aceitaram o convite. Oriente a equipe pedagógica a conduzir a primeira atividade em turma.";
        }
    }

    const stage5: DeploymentStageItem = {
        id: "student_entry_and_activity",
        stepNumber: 5,
        title: "Entrada dos alunos e atividade inicial",
        status: stage5Status,
        summary: stage5Summary,
        detail: stage5Detail,
        primaryActionLabel: stage5ActionLabel,
        primaryActionId: stage5ActionId,
    };

    // ── Etapa 6: Confirmação de prontidão da rede e próximos passos ──────────
    let stage6Status: DeploymentStageStatus = "pendente";
    let stage6Summary = "";
    let stage6Detail = "";
    let stage6ActionLabel: string | undefined;
    let stage6ActionId: DeploymentStageItem["primaryActionId"];

    const coreReady =
        stage1.status === "concluído" &&
        stage2.status === "concluído" &&
        stage4.status === "concluído" &&
        seats.occupiedStudentSeats > 0;

    if (!org) {
        stage6Status = "indisponível";
        stage6Summary = "Diagnóstico de prontidão indisponível";
        stage6Detail = "Aguardando carregamento da organização.";
    } else if (stage1.status === "bloqueado") {
        stage6Status = "bloqueado";
        stage6Summary = "Implantação bloqueada por pendência contratual";
        stage6Detail = "Regularize ou vincule a assinatura escolar na Etapa 1 para destravar a operação completa com estudantes.";
        stage6ActionLabel = stage1.primaryActionLabel;
        stage6ActionId = stage1.primaryActionId;
    } else if (coreReady && stage5.status === "concluído") {
        stage6Status = "concluído";
        stage6Summary = "Rede pronta e em operação com estudantes e equipe ativa";
        stage6Detail =
            "Contrato vinculado, escolas e turmas estruturadas, equipe pedagógica habilitada e atividade inicial registrada. Acompanhe os indicadores agregados e exporte o relatório do piloto quando desejar.";
        stage6ActionLabel = "Baixar relatório do piloto (PDF)";
        stage6ActionId = "download_pilot_report";
    } else if (coreReady) {
        stage6Status = "pendente";
        stage6Summary = "Estrutura e acessos prontos · aguardando primeira atividade dos alunos";
        stage6Detail =
            "Contrato, escolas, turmas, educadores e estudantes já estão ativos. O próximo passo é realizar a primeira sessão pedagógica nas turmas.";
        stage6ActionLabel = schools.length > 0 ? "Abrir painel da escola" : undefined;
        stage6ActionId = schools.length > 0 ? "open_first_school" : undefined;
    } else {
        stage6Status = "pendente";
        const firstIncomplete = [stage1, stage2, stage4, stage3, stage5].find(
            (s) => s.status !== "concluído",
        );
        stage6Summary = `Implantação em andamento · foco atual: ${firstIncomplete?.title ?? "configuração inicial"}`;
        stage6Detail =
            firstIncomplete?.detail ??
            "Conclua as etapas anteriores para confirmar a prontidão operacional da rede.";
        stage6ActionLabel = firstIncomplete?.primaryActionLabel;
        stage6ActionId = firstIncomplete?.primaryActionId;
    }

    const stage6: DeploymentStageItem = {
        id: "network_readiness",
        stepNumber: 6,
        title: "Prontidão da rede e próximos passos do gestor",
        status: stage6Status,
        summary: stage6Summary,
        detail: stage6Detail,
        primaryActionLabel: stage6ActionLabel,
        primaryActionId: stage6ActionId,
    };

    const stages = [stage1, stage2, stage3, stage4, stage5, stage6];
    const completedCount = stages.filter((s) => s.status === "concluído").length;

    const firstActionableStage =
        stages.find((s) => s.status === "bloqueado") ??
        stages.find((s) => s.status === "pendente") ??
        stages.find((s) => s.status === "indisponível") ??
        stage6;

    const overallStatus: DeploymentStageStatus =
        stages.every((s) => s.status === "concluído")
            ? "concluído"
            : stages.some((s) => s.status === "bloqueado")
                ? "bloqueado"
                : stages.some((s) => s.status === "indisponível") && completedCount === 0
                    ? "indisponível"
                    : "pendente";

    return {
        overallStatus,
        completedCount,
        totalStages: stages.length,
        contractState,
        seats,
        staff,
        schoolsWithoutClasses,
        allExpiredInvitations,
        stages,
        nextPriorityTitle: firstActionableStage.title,
        nextPriorityDescription: firstActionableStage.detail,
        nextPriorityActionId: firstActionableStage.primaryActionId,
        nextPriorityActionLabel: firstActionableStage.primaryActionLabel,
    };
}
