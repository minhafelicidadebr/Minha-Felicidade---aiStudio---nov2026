import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  GUARDIAN_CONSENT_POLICY_VERSION,
  decideGuardianConsentGate,
  type ConsentGateDecision,
} from "@/lib/guardian-consent";
import { withTimeout } from "@/lib/with-timeout";

type ConsentStatus = "checking" | ConsentGateDecision;

/**
 * Tempo máximo de espera pela verificação de consentimento. Sem esse limite,
 * uma RPC pendurada deixaria o guard em "checking" para sempre — o que, na
 * prática, nunca renderiza conteúdo privado, mas também nunca oferece
 * recuperação ao usuário. Ao estourar, tratamos como impossibilidade de
 * verificar (fail-closed) e mostramos a tela de recuperação.
 */
const CONSENT_CHECK_TIMEOUT_MS = 10_000;

/**
 * Rede de segurança do consentimento LGPD art. 14: mesmo que o adolescente
 * feche a aba durante o cadastro, ou faça login numa conta menor de idade
 * ainda sem consentimento registrado, nenhuma rota privada é alcançável até
 * a autorização do responsável ser concluída.
 *
 * Postura FAIL-CLOSED (segurança juvenil): a decisão de liberar acesso é
 * tomada por `decideGuardianConsentGate`, que só retorna "clear" diante de uma
 * resposta explícita e confiável. Erro de RPC, timeout, sessão inválida,
 * resposta indeterminada ou idade indeterminada NUNCA liberam a rota — caem
 * em `error_locked`, com uma tela de recuperação acessível e sem renderizar
 * nenhum conteúdo privado por baixo.
 */
export default function RequireGuardianConsent({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<ConsentStatus>("checking");
  const [attempt, setAttempt] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;
    setStatus("checking");

    async function checkConsent() {
      let decision: ConsentGateDecision;
      try {
        const result = await withTimeout(
          supabase.rpc("get_my_guardian_consent_status"),
          CONSENT_CHECK_TIMEOUT_MS,
        );
        if (!active) return;
        decision = decideGuardianConsentGate({
          error: Boolean(result.error),
          payload: result.data,
          currentPolicyVersion: GUARDIAN_CONSENT_POLICY_VERSION,
        });
      } catch {
        // Timeout ou promessa rejeitada (rede/sessão) → não dá para verificar.
        if (!active) return;
        decision = "error_locked";
      }
      setStatus(decision);
    }

    checkConsent();

    return () => {
      active = false;
    };
  }, [attempt]);

  // Foco no título ao entrar no estado de recuperação (acessibilidade).
  useEffect(() => {
    if (status === "error_locked") headingRef.current?.focus();
  }, [status]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (status === "checking") {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">Verificando sua autorização…</span>
        <div className="w-10 h-10 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <Navigate
        to={`/consentimento-responsavel?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  if (status === "error_locked") {
    // Fail-closed: nenhuma parte de {children} é renderizada aqui.
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <section
          className="w-full max-w-md text-center space-y-5"
          role="alertdialog"
          aria-labelledby="consent-error-title"
          aria-describedby="consent-error-desc"
        >
          <h1
            id="consent-error-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-semibold text-foreground outline-none"
          >
            Não conseguimos verificar sua autorização
          </h1>
          <p id="consent-error-desc" className="text-sm text-muted-foreground">
            Por segurança, o acesso fica pausado até confirmarmos a autorização
            do responsável. Isso costuma ser temporário. Verifique sua conexão e
            tente novamente em instantes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Tentar novamente
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Voltar ao início
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}
