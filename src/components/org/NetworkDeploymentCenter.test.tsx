import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import NetworkDeploymentCenter from "./NetworkDeploymentCenter";
import {
    buildNetworkDeploymentModel,
    type BuildNetworkDeploymentInput,
    type OrganizationSubscriptionSnapshot,
} from "@/lib/network-deployment";
import type { ClassRoom, Invitation, Membership, Organization, School } from "@/hooks/useOrganizationDetail";

const NOW = new Date("2026-11-09T12:00:00.000Z");

const BASE_ORG: Organization = {
    id: "org-1",
    name: "Rede Municipal Aurora",
    slug: "rede-aurora",
    status: "active",
    created_at: "2026-11-01T10:00:00.000Z",
};

const ACTIVE_SUB: OrganizationSubscriptionSnapshot = {
    id: "sub-1",
    organization_name: "Rede Municipal Aurora",
    organization_id: "org-1",
    owner_id: "user-admin",
    status: "active",
    billing_interval: "yearly",
    max_seats: 50,
    current_period_start: "2026-11-01T00:00:00.000Z",
    current_period_end: "2027-11-01T00:00:00.000Z",
};

const ADMIN_MEMBER: Membership = {
    id: "m-admin",
    organization_id: "org-1",
    user_id: "user-admin",
    role: "org_admin",
    status: "active",
    school_id: null,
    class_id: null,
    created_at: "2026-11-01T10:00:00.000Z",
};

const SCHOOL_1: School = {
    id: "sch-1",
    organization_id: "org-1",
    name: "EMEF Castro Alves",
    municipality: "São Paulo",
    state_code: "SP",
    status: "active",
};

const CLASS_1: ClassRoom = {
    id: "cls-1",
    school_id: "sch-1",
    name: "9º Ano A",
    year: 2026,
    semester: 2,
    status: "active",
};

function makeInput(overrides: Partial<BuildNetworkDeploymentInput> = {}): BuildNetworkDeploymentInput {
    return {
        org: BASE_ORG,
        schools: [],
        classes: [],
        members: [ADMIN_MEMBER],
        invitations: [],
        linkedSubscription: ACTIVE_SUB,
        unlinkedSubscriptions: [],
        subscriptionQueryError: null,
        engagement: null,
        engagementLoading: false,
        engagementError: null,
        now: NOW,
        ...overrides,
    };
}

describe("Central de Implantação da Rede — 7 cenários operacionais obrigatórios", () => {
    it("Cenário 1: Rede recém-criada sem escolas orienta cadastro da primeira escola", () => {
        const onOpenAddSchool = vi.fn();
        const model = buildNetworkDeploymentModel(makeInput({ schools: [], classes: [] }));

        expect(model.stages[0].status).toBe("concluído");
        expect(model.stages[1].status).toBe("pendente");
        expect(model.stages[1].primaryActionId).toBe("add_school");

        render(
            <MemoryRouter>
                <NetworkDeploymentCenter
                    orgId={BASE_ORG.id}
                    orgName={BASE_ORG.name}
                    model={model}
                    canManage={true}
                    onOpenAddSchool={onOpenAddSchool}
                />
            </MemoryRouter>,
        );

        expect(screen.getByText("Nenhuma escola cadastrada na rede")).toBeInTheDocument();
        fireEvent.click(screen.getByTestId("stage-action-network_schools_classes"));
        expect(onOpenAddSchool).toHaveBeenCalledTimes(1);
    });

    it("Cenário 2: Rede com 1 escola e 0 turmas orienta criação da primeira turma", () => {
        const onOpenAddClass = vi.fn();
        const model = buildNetworkDeploymentModel(
            makeInput({
                schools: [SCHOOL_1],
                classes: [],
            }),
        );

        expect(model.stages[1].status).toBe("pendente");
        expect(model.stages[1].summary).toContain("1 escola cadastrada · 0 turmas");
        expect(model.stages[1].primaryActionId).toBe("add_class");

        render(
            <MemoryRouter>
                <NetworkDeploymentCenter
                    orgId={BASE_ORG.id}
                    orgName={BASE_ORG.name}
                    firstSchoolId={SCHOOL_1.id}
                    model={model}
                    canManage={true}
                    onOpenAddClass={onOpenAddClass}
                />
            </MemoryRouter>,
        );

        fireEvent.click(screen.getByTestId("stage-action-network_schools_classes"));
        expect(onOpenAddClass).toHaveBeenCalledTimes(1);
    });

    it("Cenário 3: Convites pendentes, expirados e aceitos contabilizam vagas sem dupla contagem e permitem reemissão", () => {
        const onReissue = vi.fn();
        const activeStudent: Membership = {
            id: "m-stu-1",
            organization_id: "org-1",
            user_id: "user-stu-1",
            role: "student",
            status: "active",
            school_id: SCHOOL_1.id,
            class_id: CLASS_1.id,
            created_at: "2026-11-02T10:00:00.000Z",
        };
        const pendingValidInvite: Invitation = {
            id: "inv-valid",
            organization_id: "org-1",
            invited_email: "aluno-valido@escola.br",
            role: "student",
            token: "tok-val",
            expires_at: "2026-11-15T12:00:00.000Z",
            accepted_at: null,
        };
        const expiredInvite: Invitation = {
            id: "inv-exp",
            organization_id: "org-1",
            invited_email: "aluno-expirado@escola.br",
            role: "student",
            token: "tok-exp",
            expires_at: "2026-11-05T12:00:00.000Z",
            accepted_at: null,
        };

        const model = buildNetworkDeploymentModel(
            makeInput({
                schools: [SCHOOL_1],
                classes: [CLASS_1],
                members: [ADMIN_MEMBER, activeStudent],
                invitations: [pendingValidInvite, expiredInvite],
                linkedSubscription: { ...ACTIVE_SUB, max_seats: 10 },
            }),
        );

        // 10 contratadas, 1 ocupada (aceita), 1 reservada (válida), 1 expirada (não reserva vaga) => 8 disponíveis
        expect(model.seats.contractedSeats).toBe(10);
        expect(model.seats.occupiedStudentSeats).toBe(1);
        expect(model.seats.reservedStudentSeats).toBe(1);
        expect(model.seats.availableStudentSeats).toBe(8);
        expect(model.seats.expiredStudentInvitations).toHaveLength(1);
        expect(model.stages[2].primaryActionId).toBe("reissue_expired_invites");

        render(
            <MemoryRouter>
                <NetworkDeploymentCenter
                    orgId={BASE_ORG.id}
                    orgName={BASE_ORG.name}
                    firstSchoolId={SCHOOL_1.id}
                    model={model}
                    canManage={true}
                    onReissueExpiredInvites={onReissue}
                />
            </MemoryRouter>,
        );

        expect(screen.getByTestId("seats-contracted-card")).toHaveTextContent("10");
        expect(screen.getByTestId("seats-occupied-card")).toHaveTextContent("1");
        expect(screen.getByTestId("seats-reserved-card")).toHaveTextContent("1");
        expect(screen.getByTestId("seats-available-card")).toHaveTextContent("8");

        fireEvent.click(screen.getByTestId("stage-action-seats_and_invitations"));
        expect(onReissue).toHaveBeenCalledTimes(1);
    });

    it("Cenário 4: Cota de vagas disponível vs cota esgotada bloqueia novos alunos mas preserva convite de equipe", () => {
        const pendingInvite1: Invitation = {
            id: "inv-1",
            organization_id: "org-1",
            invited_email: "b1@escola.br",
            role: "student",
            token: "t1",
            expires_at: "2026-11-16T00:00:00.000Z",
            accepted_at: null,
        };
        const pendingInvite2: Invitation = {
            id: "inv-2",
            organization_id: "org-1",
            invited_email: "b2@escola.br",
            role: "student",
            token: "t2",
            expires_at: "2026-11-16T00:00:00.000Z",
            accepted_at: null,
        };

        const fullModel = buildNetworkDeploymentModel(
            makeInput({
                schools: [SCHOOL_1],
                classes: [CLASS_1],
                invitations: [pendingInvite1, pendingInvite2],
                linkedSubscription: { ...ACTIVE_SUB, max_seats: 2 },
            }),
        );

        expect(fullModel.seats.isQuotaFull).toBe(true);
        expect(fullModel.seats.availableStudentSeats).toBe(0);
        // Com 0 alunos ativos e 2/2 vagas reservadas, a Etapa 3 alerta cota máxima e sugere convidar equipe docente
        expect(fullModel.stages[2].status).toBe("bloqueado");
        expect(fullModel.stages[2].summary).toContain("Cota máxima atingida: 0 ocupadas + 2 reservadas de 2 contratadas");
        expect(fullModel.stages[2].primaryActionId).toBe("invite_staff");
    });

    it("Cenário 5: Pagamento aprovado com associação pendente (association_pending) orienta vínculo explícito", () => {
        const onAssociate = vi.fn();
        const unlinkedSub: OrganizationSubscriptionSnapshot = {
            ...ACTIVE_SUB,
            id: "sub-unlinked",
            organization_id: null,
            max_seats: 80,
        };

        const model = buildNetworkDeploymentModel(
            makeInput({
                linkedSubscription: null,
                unlinkedSubscriptions: [unlinkedSub],
            }),
        );

        expect(model.contractState).toBe("association_pending");
        expect(model.stages[0].status).toBe("pendente");
        expect(model.stages[0].primaryActionId).toBe("associate_unlinked_subscription");
        // Enquanto não vinculada à organização, alocação de assentos na Etapa 3 fica bloqueada
        expect(model.stages[2].status).toBe("bloqueado");

        render(
            <MemoryRouter>
                <NetworkDeploymentCenter
                    orgId={BASE_ORG.id}
                    orgName={BASE_ORG.name}
                    model={model}
                    canManage={true}
                    onAssociateSubscription={onAssociate}
                />
            </MemoryRouter>,
        );

        fireEvent.click(screen.getByTestId("stage-action-contract_and_association"));
        expect(onAssociate).toHaveBeenCalledTimes(1);
    });

    it("Cenário 6: Usuário sem permissão administrativa vê estado somente leitura sem botões de mutação", () => {
        const model = buildNetworkDeploymentModel(makeInput({ schools: [], classes: [] }));

        render(
            <MemoryRouter>
                <NetworkDeploymentCenter
                    orgId={BASE_ORG.id}
                    orgName={BASE_ORG.name}
                    model={model}
                    canManage={false}
                />
            </MemoryRouter>,
        );

        expect(screen.queryByTestId("deployment-priority-cta")).not.toBeInTheDocument();
        expect(screen.queryByTestId("stage-action-network_schools_classes")).not.toBeInTheDocument();
        expect(screen.getAllByText("Somente leitura para seu perfil").length).toBeGreaterThan(0);
    });

    it("Cenário 7: Erro recuperável de backend marca etapa afetada como indisponível e permite tentar novamente", () => {
        const onRetryEngagement = vi.fn();
        const activeStudent: Membership = {
            id: "m-stu-1",
            organization_id: "org-1",
            user_id: "user-stu-1",
            role: "student",
            status: "active",
            school_id: SCHOOL_1.id,
            class_id: CLASS_1.id,
            created_at: "2026-11-02T10:00:00.000Z",
        };
        const activeEducator: Membership = {
            id: "m-edu-1",
            organization_id: "org-1",
            user_id: "user-edu-1",
            role: "educator",
            status: "active",
            school_id: SCHOOL_1.id,
            class_id: CLASS_1.id,
            created_at: "2026-11-02T10:00:00.000Z",
        };

        const model = buildNetworkDeploymentModel(
            makeInput({
                schools: [SCHOOL_1],
                classes: [CLASS_1],
                members: [ADMIN_MEMBER, activeEducator, activeStudent],
                engagementError: "Timeout na leitura de get_org_engagement_summary",
            }),
        );

        expect(model.stages[4].status).toBe("indisponível");
        expect(model.stages[4].primaryActionId).toBe("retry_engagement");

        render(
            <MemoryRouter>
                <NetworkDeploymentCenter
                    orgId={BASE_ORG.id}
                    orgName={BASE_ORG.name}
                    firstSchoolId={SCHOOL_1.id}
                    model={model}
                    canManage={true}
                    actionError="Falha temporária na sincronização."
                    onRetryEngagement={onRetryEngagement}
                />
            </MemoryRouter>,
        );

        expect(screen.getByTestId("deployment-action-error")).toHaveTextContent(
            "Falha temporária na sincronização.",
        );
        fireEvent.click(screen.getByTestId("stage-action-student_entry_and_activity"));
        expect(onRetryEngagement).toHaveBeenCalledTimes(1);
    });
});
