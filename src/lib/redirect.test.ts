import { describe, expect, it } from "vitest";
import { getSafeRedirectPath } from "./redirect";

describe("getSafeRedirectPath", () => {
  it("allows local application paths with query strings and hashes", () => {
    expect(getSafeRedirectPath("/quiz?module=mentiras#start")).toBe("/quiz?module=mentiras#start");
  });

  it("falls back for empty, external, protocol-relative, and backslash paths", () => {
    expect(getSafeRedirectPath(null)).toBe("/dashboard");
    expect(getSafeRedirectPath("https://evil.example")).toBe("/dashboard");
    expect(getSafeRedirectPath("//evil.example/path")).toBe("/dashboard");
    expect(getSafeRedirectPath("/\\evil")).toBe("/dashboard");
  });

  it("does not redirect back into the auth page", () => {
    expect(getSafeRedirectPath("/auth")).toBe("/dashboard");
    expect(getSafeRedirectPath("/auth?redirect=/admin")).toBe("/dashboard");
  });
});
