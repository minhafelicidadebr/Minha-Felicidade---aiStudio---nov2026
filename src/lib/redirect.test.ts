import { describe, expect, it } from "vitest";
import { getSafeRedirectPath, isInternalPath } from "./redirect";

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

describe("getSafeRedirectPath — fallback role-aware (UX-1)", () => {
  it("usa o fallback informado pela aplicação quando não há redirect válido", () => {
    expect(getSafeRedirectPath(null, "/inicio")).toBe("/inicio");
    expect(getSafeRedirectPath("https://evil.example", "/org")).toBe("/org");
    expect(getSafeRedirectPath("/auth?redirect=/admin", "/inicio")).toBe("/inicio");
  });

  it("ignora fallback inseguro e volta para o padrão (sem open redirect)", () => {
    expect(getSafeRedirectPath(null, "https://evil.example")).toBe("/dashboard");
    expect(getSafeRedirectPath(null, "//evil.example")).toBe("/dashboard");
    expect(getSafeRedirectPath(null, "/\\evil")).toBe("/dashboard");
  });

  it("preserva o redirect legítimo mesmo com fallback definido", () => {
    expect(getSafeRedirectPath("/quiz?module=mentiras", "/inicio")).toBe("/quiz?module=mentiras");
  });
});

describe("isInternalPath", () => {
  it("aceita apenas caminhos internos", () => {
    expect(isInternalPath("/org")).toBe(true);
    expect(isInternalPath("//evil.example")).toBe(false);
    expect(isInternalPath("/\\evil")).toBe(false);
    expect(isInternalPath("https://evil.example")).toBe(false);
    expect(isInternalPath(null)).toBe(false);
    expect(isInternalPath(undefined)).toBe(false);
  });
});
