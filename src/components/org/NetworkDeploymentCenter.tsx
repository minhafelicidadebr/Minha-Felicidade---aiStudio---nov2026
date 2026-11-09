import { useState } from "react";
import { Link } from "react-router-dom";
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Clock,
    Download,
    KeyRound,
    Link2,
    Lock,
    RefreshCw,
    School as SchoolIcon,
    ShieldCheck,
    UserCheck,
    UserPlus,
    Users,
} from "lucide-react";
import { buildSchoolPath } from "@/lib/role-home";
import type {
    DeploymentStageItem,
    DeploymentStageStatus,
    NetworkDeploymentModel,
} from "@/lib/network-deployment";

export interface NetworkDeploymentCenterProps {
    orgId: string;
    orgName: string;
    firstSchoolId?: string | null;
    model: NetworkDeploymentModel;
    canManage: boolean;
    busyAction?: string | null;
    actionError?: string | null;
    actionSuccess?: string | null;
    onClaimByEmail?: () => Promise<void> | void;
    onClaimByToken?: (token: string) => Promise<void> | void;
    onAssociateSubscription?: () => Promise<void> | void;
    onOpenAddSchool?: () => void;
    onOpenAddClass?: () => void;
    onOpenInviteStudent?: () => void;
    onOpenInviteStaff?: () => void;
    onReissueExpiredInvites?: () => Promise<void> | void;
    onRetryContract?: () => void;
    onRetryEngagement?: () => void;
    onDownloadReport?: () => Promise<void> | void;
}

const STATUS_META: Record<
    DeploymentStageStatus,
    {
        label: string;
        dotClass: string;
        textClass: string;
        borderClass: string;
        icon: typeof CheckCircle2;
    }
> = {
    concluído: {
        label: "Concluído",
        dotClass: "bg-emerald-500",
        textClass: "text-emerald-600 dark:text-emerald-400",
        borderClass: "border-emerald-500/30 bg-emerald-500/[0.03]",
        icon: CheckCircle2,
    },
    pendente: {
        label: "Pendente",
        dotClass: "bg-amber-500",
        textClass: "text-amber-600 dark:text-amber-400",
        borderClass: "border-border/60 bg-card/60",
        icon: Clock,
    },
    bloqueado: {
        label: "Bloqueado",
        dotClass: "bg-destructive",
        textClass: "text-destructive",
        borderClass: "border-destructive/40 bg-destructive/[0.04]",
        icon: Lock,
    },
    indisponível: {
        label: "Indisponível",
        dotClass: "bg-muted-foreground",
        textClass: "text-muted-foreground",
        borderClass: "border-border/50 bg-muted/20",
        icon: AlertTriangle,
    },
};

export default function NetworkDeploymentCenter({
    orgName,
    firstSchoolId,
    model,
    canManage,
    busyAction = null,
    actionError = null,
    actionSuccess = null,
    onClaimByEmail,
    onClaimByToken,
    onAssociateSubscription,
    onOpenAddSchool,
    onOpenAddClass,
    onOpenInviteStudent,
    onOpenInviteStaff,
    onReissueExpiredInvites,
    onRetryContract,
    onRetryEngagement,
    onDownloadReport,
}: NetworkDeploymentCenterProps) {
    const [showTokenClaim, setShowTokenClaim] = useState(false);
    const [claimTokenInput, setClaimTokenInput] = useState("");

    const overallMeta = STATUS_META[model.overallStatus];
    const { seats, staff } = model;
    const isContractUnavailable = model.contractState === "unavailable";
    const seatUsagePct =
        seats.contractedSeats > 0
            ? Math.min(
                  100,
                  Math.round(
                      ((seats.occupiedStudentSeats + seats.reservedStudentSeats) /
                          seats.contractedSeats) *
                          100,
                  ),
              )
            : 0;

    const handleStageAction = (actionId?: DeploymentStageItem["primaryActionId"]) => {
        if (!actionId) return;
        switch (actionId) {
            case "claim_subscription":
                void onClaimByEmail?.();
                break;
            case "associate_unlinked_subscription":
                void onAssociateSubscription?.();
                break;
            case "retry_contract":
                onRetryContract?.();
                break;
            case "add_school":
                onOpenAddSchool?.();
                break;
            case "add_class":
                onOpenAddClass?.();
                break;
            case "invite_student":
                onOpenInviteStudent?.();
                break;
            case "invite_staff":
                onOpenInviteStaff?.();
                break;
            case "reissue_expired_invites":
                void onReissueExpiredInvites?.();
                break;
            case "retry_engagement":
                onRetryEngagement?.();
                break;
            case "download_pilot_report":
                void onDownloadReport?.();
                break;
            default:
                break;
        }
    };

    const handleTokenSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = claimTokenInput.trim();
        if (!trimmed || !onClaimByToken) return;
        void onClaimByToken(trimmed);
    };

    return (
        <section
            aria-label="Central de Implantação da Rede"
            data-testid="network-deployment-center"
            className="mb-8 rounded-2xl border border-border/60 bg-card/70 p-5 sm:p-6"
        >
            {/* Cabeçalho operacional da Central */}
            <div className="flex flex-col gap-4 border-b border-border/50 pb-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold uppercase tracking-wider text-foreground">
                            Central de Implantação da Rede
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1.5 font-medium">
                            <span
                                className={`h-2 w-2 rounded-full ${overallMeta.dotClass}`}
                                aria-hidden="true"
                            />
                            <span className={overallMeta.textClass} data-testid="deployment-overall-status">
                                Status geral: {overallMeta.label}
                            </span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums font-medium">
                            {model.completedCount} de {model.totalStages} etapas concluídas
                        </span>
                    </div>
                    <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
                        Jornada operacional — {orgName}
                    </h2>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                        Próximo passo prioritário:{" "}
                        <strong className="font-semibold text-foreground">
                            {model.nextPriorityTitle}
                        </strong>{" "}
                        — {model.nextPriorityDescription}
                    </p>
                </div>

                {/* Ações rápidas de implantação */}
                {canManage && (
                    <div className="flex flex-wrap items-center gap-2">
                        {model.nextPriorityActionId && model.nextPriorityActionLabel && (
                            <button
                                type="button"
                                onClick={() => handleStageAction(model.nextPriorityActionId)}
                                disabled={Boolean(busyAction)}
                                data-testid="deployment-priority-cta"
                                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {model.nextPriorityActionLabel}
                                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setShowTokenClaim((prev) => !prev)}
                            data-testid="toggle-token-claim"
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border/60 bg-background px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                            Usar código de ativação
                        </button>
                    </div>
                )}
            </div>

            {/* Feedback de operação (erro recuperável ou confirmação explícita) */}
            {actionError && (
                <div
                    role="alert"
                    data-testid="deployment-action-error"
                    className="mt-4 flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive"
                >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <div className="flex-1">
                        <p className="font-bold">Não foi possível concluir a operação</p>
                        <p className="mt-0.5 text-destructive/90">{actionError}</p>
                    </div>
                </div>
            )}

            {actionSuccess && (
                <div
                    role="status"
                    data-testid="deployment-action-success"
                    className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300"
                >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <div className="flex-1">
                        <p className="font-bold">Etapa atualizada com sucesso</p>
                        <p className="mt-0.5">{actionSuccess}</p>
                    </div>
                </div>
            )}

            {/* Formulário opcional de associação por claim_token (quando o e-mail de compra difere do login) */}
            {showTokenClaim && canManage && (
                <form
                    onSubmit={handleTokenSubmit}
                    data-testid="token-claim-form"
                    className="mt-4 flex flex-col gap-2.5 rounded-xl border border-border/60 bg-background/80 p-4 sm:flex-row sm:items-center"
                >
                    <div className="flex-1">
                        <label
                            htmlFor="deployment-claim-token"
                            className="block text-xs font-semibold text-foreground"
                        >
                            Código de reivindicação da assinatura escolar (UUID)
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                            Use quando a compra foi realizada com um e-mail diferente do seu login atual.
                        </p>
                    </div>
                    <input
                        id="deployment-claim-token"
                        type="text"
                        value={claimTokenInput}
                        onChange={(e) => setClaimTokenInput(e.target.value)}
                        placeholder="00000000-0000-0000-0000-000000000000"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50 sm:w-72"
                    />
                    <button
                        type="submit"
                        disabled={Boolean(busyAction) || !claimTokenInput.trim()}
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                    >
                        <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {busyAction === "claim_token" ? "Validando…" : "Associar"}
                    </button>
                </form>
            )}

            {/* Painel de Assentos de Estudantes e Equipe (tabular-nums) */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div
                    className="rounded-xl border border-border/50 bg-background/60 p-3.5"
                    data-testid="seats-contracted-card"
                >
                    <p className="text-[11px] font-medium text-muted-foreground">
                        Vagas de estudantes contratadas
                    </p>
                    <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                        {isContractUnavailable ? "—" : seats.contractedSeats}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {isContractUnavailable
                            ? "Leitura contratual indisponível"
                            : seats.hasActiveContract
                                ? `Ocupação + reserva: ${seatUsagePct}%`
                                : "Requer contrato ativo vinculado"}
                    </p>
                </div>

                <div
                    className="rounded-xl border border-border/50 bg-background/60 p-3.5"
                    data-testid="seats-occupied-card"
                >
                    <p className="text-[11px] font-medium text-muted-foreground">
                        Ocupadas (estudantes ativos)
                    </p>
                    <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                        {isContractUnavailable ? "—" : seats.occupiedStudentSeats}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Membros com papel estudante ativo
                    </p>
                </div>

                <div
                    className="rounded-xl border border-border/50 bg-background/60 p-3.5"
                    data-testid="seats-reserved-card"
                >
                    <p className="text-[11px] font-medium text-muted-foreground">
                        Reservadas (convites válidos)
                    </p>
                    <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                        {isContractUnavailable ? "—" : seats.reservedStudentSeats}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {seats.expiredStudentInvitationsCount > 0
                            ? `${seats.expiredStudentInvitationsCount} expirado(s) não reservam vaga`
                            : "Dentro do prazo de validade"}
                    </p>
                </div>

                <div
                    className="rounded-xl border border-border/50 bg-background/60 p-3.5"
                    data-testid="seats-available-card"
                >
                    <p className="text-[11px] font-medium text-muted-foreground">
                        Vagas disponíveis para convite
                    </p>
                    <p
                        className={`mt-1 font-display text-2xl font-bold tabular-nums ${
                            seats.isQuotaFull ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                        }`}
                    >
                        {isContractUnavailable ? "—" : seats.availableStudentSeats}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {isContractUnavailable
                            ? "Aguardando sincronização contratual"
                            : seats.isQuotaFull
                                ? "Limite de alunos atingido · equipe livre"
                                : `Equipe ativa: ${staff.activeOrgAdmins + staff.activeSchoolAdmins + staff.activeEducators}`}
                    </p>
                </div>
            </div>

            {/* Grade das 6 Etapas de Implantação */}
            <div className="mt-5 grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                {model.stages.map((stage) => {
                    const meta = STATUS_META[stage.status];
                    const StatusIcon = meta.icon;
                    return (
                        <article
                            key={stage.id}
                            data-stage-id={stage.id}
                            data-stage-status={stage.status}
                            className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${meta.borderClass}`}
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 text-[11px]">
                                    <span className="font-semibold uppercase tracking-wider text-muted-foreground tabular-nums">
                                        Etapa {stage.stepNumber}
                                    </span>
                                    <span
                                        className={`inline-flex items-center gap-1 font-semibold ${meta.textClass}`}
                                    >
                                        <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                        {meta.label}
                                    </span>
                                </div>

                                <h3 className="mt-2 font-display text-sm font-bold text-foreground">
                                    {stage.title}
                                </h3>

                                <p className="mt-1 text-xs font-medium text-foreground/90 tabular-nums">
                                    {stage.summary}
                                </p>

                                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                                    {stage.detail}
                                </p>
                            </div>

                            {/* Ações concretas da etapa */}
                            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
                                {stage.primaryActionId === "open_first_school" && firstSchoolId ? (
                                    <Link
                                        to={buildSchoolPath(firstSchoolId)}
                                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-bold text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <SchoolIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                        {stage.primaryActionLabel}
                                    </Link>
                                ) : stage.primaryActionId && stage.primaryActionLabel && canManage ? (
                                    <button
                                        type="button"
                                        onClick={() => handleStageAction(stage.primaryActionId)}
                                        disabled={Boolean(busyAction)}
                                        data-testid={`stage-action-${stage.id}`}
                                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        {stage.primaryActionId === "reissue_expired_invites" && (
                                            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                                        )}
                                        {stage.primaryActionId === "download_pilot_report" && (
                                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                                        )}
                                        {(stage.primaryActionId === "invite_student" ||
                                            stage.primaryActionId === "invite_staff") && (
                                            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                                        )}
                                        {stage.primaryActionLabel}
                                    </button>
                                ) : null}

                                {stage.id === "contract_and_association" &&
                                    stage.status !== "concluído" && (
                                        <Link
                                            to="/escolas"
                                            className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
                                        >
                                            Ver planos escolares
                                            <ArrowRight className="h-3 w-3" aria-hidden="true" />
                                        </Link>
                                    )}

                                {stage.id === "seats_and_invitations" &&
                                    seats.hasActiveContract &&
                                    !seats.isQuotaFull &&
                                    stage.primaryActionId !== "invite_student" &&
                                    canManage && (
                                        <button
                                            type="button"
                                            onClick={onOpenInviteStudent}
                                            className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
                                        >
                                            <Users className="h-3.5 w-3.5" aria-hidden="true" />
                                            Convidar estudante
                                        </button>
                                    )}

                                {stage.status === "concluído" && !stage.primaryActionId && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                        Requisito validado no servidor
                                    </span>
                                )}

                                {!canManage && stage.status !== "concluído" && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                        Somente leitura para seu perfil
                                    </span>
                                )}
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
