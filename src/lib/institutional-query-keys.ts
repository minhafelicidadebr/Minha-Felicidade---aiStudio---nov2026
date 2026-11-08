export type InstitutionalIdentity = string | null;

const identity = (userId: InstitutionalIdentity) => userId ?? "anonymous";

export const institutionalQueryKeys = {
    root: () => ["institutional"] as const,
    context: (userId: InstitutionalIdentity) => ["institutional", identity(userId), "context"] as const,
    organization: (userId: InstitutionalIdentity, organizationId: string | null | undefined) =>
        ["institutional", identity(userId), "organization", organizationId ?? "none"] as const,
    schoolMetrics: (
        userId: InstitutionalIdentity,
        schoolId: string | null,
        period: string,
    ) => ["institutional", identity(userId), "school", schoolId ?? "none", "metrics", period] as const,
    orgAnalytics: (userId: InstitutionalIdentity, organizationId: string) =>
        ["institutional", identity(userId), "organization", organizationId, "analytics"] as const,
    orgEngagement: (userId: InstitutionalIdentity, organizationId: string) =>
        ["institutional", identity(userId), "organization", organizationId, "engagement"] as const,
    operationalMetrics: (userId: InstitutionalIdentity, organizationId: string) =>
        ["institutional", identity(userId), "organization", organizationId, "operational"] as const,
    governance: (userId: InstitutionalIdentity, organizationId: string) =>
        ["institutional", identity(userId), "organization", organizationId, "governance"] as const,
};

export function assertInstitutionalPayload(
    expectedId: string,
    actualId: unknown,
    scope: "organization" | "school",
): void {
    if (actualId !== expectedId) {
        throw new Error(`Resposta institucional incompatível com o contexto ${scope} atual.`);
    }
}