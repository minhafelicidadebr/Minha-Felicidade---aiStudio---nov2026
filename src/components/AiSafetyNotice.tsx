import { LifeBuoy } from "lucide-react";

/**
 * Limites da IA + canal de crise, visível em toda tela que conversa com IA.
 * Complementa o protocolo server-side (supabase/functions/_shared/crisis.ts):
 * o servidor acolhe e encaminha durante a conversa; este aviso mantém o
 * canal de ajuda visível antes mesmo da primeira mensagem.
 */
export default function AiSafetyNotice() {
  return (
    <div
      role="note"
      aria-label="Limites da IA e canal de ajuda"
      className="inline-flex items-start gap-2 text-left rounded-xl bg-muted/70 border border-border px-3.5 py-2.5 text-xs text-muted-foreground max-w-2xl"
    >
      <LifeBuoy className="w-4 h-4 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
      <span>
        Esta é uma IA educacional: não é terapeuta e não substitui atendimento psicológico.
        Se você estiver passando por um momento difícil, ligue{" "}
        <a href="tel:188" className="font-semibold text-foreground underline underline-offset-2">
          CVV 188
        </a>{" "}
        (gratuito, 24h), acesse{" "}
        <a
          href="https://cvv.org.br"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-foreground underline underline-offset-2"
        >
          cvv.org.br
        </a>{" "}
        ou converse com um adulto de confiança.
      </span>
    </div>
  );
}
