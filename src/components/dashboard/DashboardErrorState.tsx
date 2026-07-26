// UX-1 — Erro recuperável canônico (contrato §4).
// Regra de honestidade (doutrina §1): não afirmamos que "deu tudo certo" nem
// escondemos a falha; mostramos o que falhou, o que ainda funciona e como
// tentar de novo. A mensagem técnica fica disponível, mas não é imposta.

import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardErrorStateProps {
    title?: string;
    description?: string;
    /** Mensagem técnica (não exibida por padrão; fica em <details>). */
    detail?: string | null;
    onRetry?: () => void;
    retryLabel?: string;
    className?: string;
}

export default function DashboardErrorState({
    title = "Não conseguimos carregar estes dados",
    description = "A falha é na leitura dos indicadores, não nos seus dados. Nada foi perdido nem alterado.",
    detail,
    onRetry,
    retryLabel = "Tentar novamente",
    className,
}: DashboardErrorStateProps) {
    return (
        <div
            role="alert"
            aria-live="assertive"
            className={cn(
                "flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5",
                className,
            )}
            data-testid="dashboard-error"
        >
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                    <h3 className="font-display text-base font-bold">{title}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </div>

            {detail && (
                <details className="w-full">
                    <summary className="cursor-pointer text-xs font-semibold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                        Detalhe técnico
                    </summary>
                    <p className="mt-1 break-words rounded-lg bg-background/60 p-2 font-mono text-[11px] text-muted-foreground">
                        {detail}
                    </p>
                </details>
            )}

            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-sm font-bold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {retryLabel}
                </button>
            )}
        </div>
    );
}
