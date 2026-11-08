import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/integrations/supabase/client", () => ({
    supabase: { rpc: vi.fn() },
}));

import { supabase } from "@/integrations/supabase/client";
import { institutionalQueryKeys } from "@/lib/institutional-query-keys";
import OperationalMetrics from "./OperationalMetrics";

interface Metrics {
    members_active: number;
    invitations_pending: number;
    ai_usage_today: number;
    ai_usage_7d: number;
    ai_estimated_cost_7d_brl: number;
    recent_errors_24h: number;
}

const metrics = (marker: number): Metrics => ({
    members_active: 5,
    invitations_pending: 0,
    ai_usage_today: marker,
    ai_usage_7d: marker,
    ai_estimated_cost_7d_brl: marker,
    recent_errors_24h: 0,
});

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => { resolve = done; });
    return { promise, resolve };
}

function wrapper(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("TRUST-1.3 — stale response and cache isolation", () => {
    it("resposta A atrasada não sobrescreve B", async () => {
        const requests = new Map<string, ReturnType<typeof deferred<{ data: Metrics; error: null }>>>();
        vi.mocked(supabase.rpc).mockImplementation((_name, args) => {
            const orgId = (args as { _organization_id: string })._organization_id;
            const request = deferred<{ data: Metrics; error: null }>();
            requests.set(orgId, request);
            return request.promise;
        });
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const view = render(
            <OperationalMetrics userId="user-a" organizationId="org-a" />,
            { wrapper: wrapper(client) },
        );
        view.rerender(<OperationalMetrics userId="user-a" organizationId="org-b" />);

        requests.get("org-b")?.resolve({ data: metrics(222), error: null });
        expect((await screen.findAllByText("222")).length).toBeGreaterThan(0);

        requests.get("org-a")?.resolve({ data: metrics(111), error: null });
        await waitFor(() => expect(screen.queryAllByText("111")).toHaveLength(0));
        expect(screen.getAllByText("222").length).toBeGreaterThan(0);
    });

    it("A → B → A → C termina em C mesmo com A/B resolvendo depois", async () => {
        const requests = new Map<string, ReturnType<typeof deferred<{ data: Metrics; error: null }>>>();
        vi.mocked(supabase.rpc).mockImplementation((_name, args) => {
            const orgId = (args as { _organization_id: string })._organization_id;
            const existing = requests.get(orgId);
            if (existing) return existing.promise;
            const request = deferred<{ data: Metrics; error: null }>();
            requests.set(orgId, request);
            return request.promise;
        });
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const view = render(<OperationalMetrics userId="user-a" organizationId="org-a" />, {
            wrapper: wrapper(client),
        });
        view.rerender(<OperationalMetrics userId="user-a" organizationId="org-b" />);
        view.rerender(<OperationalMetrics userId="user-a" organizationId="org-a" />);
        view.rerender(<OperationalMetrics userId="user-a" organizationId="org-c" />);

        requests.get("org-c")?.resolve({ data: metrics(333), error: null });
        expect((await screen.findAllByText("333")).length).toBeGreaterThan(0);
        requests.get("org-b")?.resolve({ data: metrics(222), error: null });
        requests.get("org-a")?.resolve({ data: metrics(111), error: null });

        await waitFor(() => {
            expect(screen.queryAllByText("111")).toHaveLength(0);
            expect(screen.queryAllByText("222")).toHaveLength(0);
        });
        expect(screen.getAllByText("333").length).toBeGreaterThan(0);
    });

    it("cache B nunca renderiza marker de cache A", async () => {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        client.setQueryData(
            institutionalQueryKeys.operationalMetrics("user-a", "org-a"),
            metrics(111),
        );
        client.setQueryData(
            institutionalQueryKeys.operationalMetrics("user-a", "org-b"),
            metrics(222),
        );

        render(<OperationalMetrics userId="user-a" organizationId="org-b" />, {
            wrapper: wrapper(client),
        });

        expect((await screen.findAllByText("222")).length).toBeGreaterThan(0);
        expect(screen.queryAllByText("111")).toHaveLength(0);
    });

    it("erro B não vira vazio nem reutiliza dados A", async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({
            data: null,
            error: { message: "denied B" },
        });
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        client.setQueryData(
            institutionalQueryKeys.operationalMetrics("user-a", "org-a"),
            metrics(111),
        );

        render(<OperationalMetrics userId="user-a" organizationId="org-b" />, {
            wrapper: wrapper(client),
        });

        expect(await screen.findByRole("alert")).toHaveTextContent("Métricas operacionais indisponíveis");
        expect(screen.queryByText("111")).not.toBeInTheDocument();
    });
});