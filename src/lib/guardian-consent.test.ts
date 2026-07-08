import { describe, expect, it } from "vitest";
import { ageInYears, isMinor, isValidPastDate } from "./guardian-consent";

const REF = new Date("2026-07-06T12:00:00.000Z");

describe("ageInYears", () => {
  it("conta aniversário ainda não alcançado no ano corrente", () => {
    expect(ageInYears("2010-08-01", REF)).toBe(15); // aniversário em agosto, ainda não chegou
    expect(ageInYears("2010-07-01", REF)).toBe(16); // já fez aniversário em julho
    expect(ageInYears("2010-07-06", REF)).toBe(16); // exatamente hoje
  });
});

describe("isMinor", () => {
  it("17 anos é menor; 18 anos completos não é", () => {
    expect(isMinor("2008-07-06", REF)).toBe(false); // fez 18 anos exatamente hoje
    expect(isMinor("2008-07-07", REF)).toBe(true); // faltando 1 dia para completar 18
  });
});

describe("isValidPastDate", () => {
  it("rejeita data futura e idade implausível", () => {
    expect(isValidPastDate("2030-01-01", REF)).toBe(false);
    expect(isValidPastDate("1850-01-01", REF)).toBe(false);
    expect(isValidPastDate("2010-01-01", REF)).toBe(true);
  });
});
