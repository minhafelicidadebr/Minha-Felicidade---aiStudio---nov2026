// UX-1 — Mensagem principal do dashboard (contrato §3, item 2).
//
// É o "o que isto quer dizer" acima dos números. Deliberadamente aceita apenas
// UMA mensagem por dashboard: se tudo é destaque, nada é.
//
// Honestidade: `evidence` existe para que a frase de leitura nunca vire
// afirmação causal. Engajamento não é prova de impacto psicológico.

import { Link } from "react-router-dom";
import { ArrowRight, Info, Sparkles, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightTone = "positive" | "attention" | "neutral";

interface InsightCardProps {
    tone?: InsightTone;
    /** Rótulo curto de contexto (ex.: "Leitura da semana"). */
    eyebrow?: string;
    /** A mensagem principal, em linguagem de decisão. */
    headline: string;
    /** Suporte factual: números que sustentam a leitura. */
    support?: string;
    /** Ressalva/limitação da leitura. */
    evidence?: string;
    action?: { label: string; to: string };
    className?: string;
}

const TONE_STYLE: Record<InsightTone, { icon: LucideIcon; frame: string; accent: string }> = {
    positive: {
        icon: Sparkles,
        frame: "border-success/30 bg-success/5",
        accent: "text-success",
    },
    attention: {
        icon: TriangleAlert,
        frame: "border-secondary/40 bg-secondary/5",
        accent: "text-secondary",
    },
    neutral: {
        icon: Info,
        frame: "border-border/50 bg-card/60",
        accent: "text-primary",
    },
};

export default function InsightCard({
    tone = "neutral",
    eyebrow,
    headline,
    support,
    evidence,
    action,
    className,
}: InsightCardProps) {
    const style = TONE_STYLE[tone];
    const Icon = style.icon;

    return (
        <section
            className={cn("rounded-2xl border p-5", style.frame, className)}
            data-testid="insight-card"
            aria-live="polite"
        >
            <div className="flex items-start gap-3">
                <span
                    className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/60",
                        style.accent,
                    )}
                >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </span>

                <div className="min-w-0 space-y-1.5">
                    {eyebrow && (
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {eyebrow}
                        </p>
                    )}
                    <h2 className="font-display text-lg font-bold leading-snug">{headline}</h2>
                    {support && <p className="text-sm text-muted-foreground">{support}</p>}
                    {evidence && (
                        <p className="rounded-lg bg-background/50 p-2 text-[11px] text-muted-foreground">
                            {evidence}
                        </p>
                    )}
                    {action && (
                        <Link
                            to={action.to}
                            className="-m-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg p-1 text-sm font-bold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                            {action.label}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    )}
                </div>
            </div>
        </section>
    );
}
