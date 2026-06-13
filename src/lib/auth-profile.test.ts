import { describe, expect, it } from "vitest";
import { hasAnyRole, parseProfileRoles } from "./auth-profile";

describe("auth-profile helpers", () => {
  it("parses roles returned as an array", () => {
    expect(parseProfileRoles({ roles: ["student", "teacher"] })).toEqual(["student", "teacher"]);
  });

  it("parses roles returned as a JSON string", () => {
    expect(parseProfileRoles({ roles: '["student","manager"]' })).toEqual(["student", "manager"]);
  });

  it("fails closed for missing or malformed role payloads", () => {
    expect(parseProfileRoles(null)).toEqual([]);
    expect(parseProfileRoles({ roles: "not-json" })).toEqual([]);
    expect(parseProfileRoles({ roles: '{"role":"manager"}' })).toEqual([]);
  });

  it("checks the complete role set instead of only the first role", () => {
    expect(hasAnyRole(["student", "teacher"], ["teacher", "manager"])).toBe(true);
    expect(hasAnyRole(["student"], ["teacher", "manager"])).toBe(false);
  });
});
