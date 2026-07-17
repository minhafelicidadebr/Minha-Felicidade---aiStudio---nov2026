import { describe, expect, it } from "vitest";
import {
  GUARDIAN_CONSENT_POLICY_VERSION,
  GUARDIAN_CONSENT_STATEMENT,
  ageInYears,
  decideGuardianConsentGate,
  isMinor,
  isValidPastDate,
} from "./guardian-consent";

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

describe("GUARDIAN_CONSENT_STATEMENT", () => {
  it("política 2026.2 dá transparência sobre processamento por IA de terceiros", () => {
    expect(GUARDIAN_CONSENT_POLICY_VERSION).toBe("2026.2");
    expect(GUARDIAN_CONSENT_STATEMENT).toContain("inteligência artificial");
    expect(GUARDIAN_CONSENT_STATEMENT).toContain("provedores de IA");
    expect(GUARDIAN_CONSENT_STATEMENT).toContain("Lei 13.709/2018");
  });
});

describe("decideGuardianConsentGate (fail-closed)", () => {
  const V = GUARDIAN_CONSENT_POLICY_VERSION;

  it("bloqueia (error_locked) quando a RPC retorna erro", () => {
    expect(
      decideGuardianConsentGate({ error: true, payload: null, currentPolicyVersion: V }),
    ).toBe("error_locked");
  });

  it("bloqueia (error_locked) quando o erro carrega um payload qualquer (sessão inválida)", () => {
    // Mesmo que venha algum dado, um erro nunca pode liberar acesso.
    expect(
      decideGuardianConsentGate({
        error: true,
        payload: { requires_consent: false },
        currentPolicyVersion: V,
      }),
    ).toBe("error_locked");
  });

  it("bloqueia (error_locked) quando o payload é null/indeterminado", () => {
    expect(
      decideGuardianConsentGate({ error: false, payload: null, currentPolicyVersion: V }),
    ).toBe("error_locked");
    expect(
      decideGuardianConsentGate({ error: false, payload: undefined, currentPolicyVersion: V }),
    ).toBe("error_locked");
    expect(
      decideGuardianConsentGate({ error: false, payload: "weird", currentPolicyVersion: V }),
    ).toBe("error_locked");
  });

  it("bloqueia (error_locked) quando falta o campo requires_consent (malformado)", () => {
    expect(
      decideGuardianConsentGate({
        error: false,
        payload: { granted: true, policy_version: V },
        currentPolicyVersion: V,
      }),
    ).toBe("error_locked");
  });

  it("bloqueia (error_locked) quando a data de nascimento é ausente/indeterminada", () => {
    expect(
      decideGuardianConsentGate({
        error: false,
        payload: { requires_consent: false, reason: "unknown_birth_date", granted: false },
        currentPolicyVersion: V,
      }),
    ).toBe("error_locked");
  });

  it("libera (clear) usuário adulto com data de nascimento conhecida", () => {
    expect(
      decideGuardianConsentGate({
        error: false,
        payload: { requires_consent: false, reason: "adult", granted: false },
        currentPolicyVersion: V,
      }),
    ).toBe("clear");
  });

  it("redireciona (blocked) menor sem consentimento registrado", () => {
    expect(
      decideGuardianConsentGate({
        error: false,
        payload: { requires_consent: true, reason: "minor_pending", granted: false },
        currentPolicyVersion: V,
      }),
    ).toBe("blocked");
  });

  it("libera (clear) menor com consentimento válido na política vigente", () => {
    expect(
      decideGuardianConsentGate({
        error: false,
        payload: {
          requires_consent: true,
          reason: "minor_consented",
          granted: true,
          policy_version: V,
        },
        currentPolicyVersion: V,
      }),
    ).toBe("clear");
  });

  it("redireciona (blocked) menor com consentimento de política ANTERIOR (re-consentimento)", () => {
    expect(
      decideGuardianConsentGate({
        error: false,
        payload: {
          requires_consent: true,
          reason: "minor_consented",
          granted: true,
          policy_version: "2026.1",
        },
        currentPolicyVersion: V,
      }),
    ).toBe("blocked");
  });
});
