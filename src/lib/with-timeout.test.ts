import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withTimeout } from "./with-timeout";

describe("withTimeout", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("rejeita quando a promessa não resolve dentro do tempo", async () => {
        const caught = withTimeout(new Promise(() => { }), 1000).catch(
            (e: unknown) => (e as Error).message,
        );
        await vi.advanceTimersByTimeAsync(1000);
        expect(await caught).toBe("guardian_consent_timeout");
    });

    it("resolve quando a promessa completa a tempo", async () => {
        const raced = withTimeout(Promise.resolve("ok"), 1000);
        await vi.advanceTimersByTimeAsync(0);
        expect(await raced).toBe("ok");
    });

    it("propaga a rejeição original quando a promessa rejeita antes do timeout", async () => {
        const caught = withTimeout(Promise.reject(new Error("boom")), 1000).catch(
            (e: unknown) => (e as Error).message,
        );
        await vi.advanceTimersByTimeAsync(0);
        expect(await caught).toBe("boom");
    });
});
