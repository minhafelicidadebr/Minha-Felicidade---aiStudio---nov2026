import { describe, expect, it } from "vitest";
import { institutionalQueryKeys } from "./institutional-query-keys";

describe("TRUST-1.3 — institutional query key isolation", () => {
    it("particiona a mesma organização por identidade", () => {
        expect(institutionalQueryKeys.organization("user-a", "org-a"))
            .not.toEqual(institutionalQueryKeys.organization("user-b", "org-a"));
    });

    it("particiona analytics e operação por tenant", () => {
        expect(institutionalQueryKeys.orgAnalytics("user-a", "org-a"))
            .not.toEqual(institutionalQueryKeys.orgAnalytics("user-a", "org-b"));
        expect(institutionalQueryKeys.operationalMetrics("user-a", "org-a"))
            .not.toEqual(institutionalQueryKeys.operationalMetrics("user-a", "org-b"));
    });

    it("inclui identidade, organization, school e filtros semanticamente relevantes", () => {
        expect(institutionalQueryKeys.schoolMetrics("user-a", "school-a", "30d"))
            .toEqual(["institutional", "user-a", "school", "school-a", "metrics", "30d"]);
        expect(institutionalQueryKeys.orgEngagement("user-a", "org-a"))
            .toEqual(["institutional", "user-a", "organization", "org-a", "engagement"]);
    });
});