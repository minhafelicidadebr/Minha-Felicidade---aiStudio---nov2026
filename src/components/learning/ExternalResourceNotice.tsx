import { ExternalLink } from "lucide-react";

interface ExternalResourceNoticeProps {
    /** Original title of the external resource (as published by its author). */
    title: string;
    /** Platform hosting the resource, e.g. "YouTube". */
    platform: string;
    /** Direct link to the resource on its original platform. */
    sourceUrl: string;
}

/**
 * P0.0 guardrail — identifies embedded third-party content as an external
 * resource, with a link back to the original source. Required whenever a
 * video/article/course from a third party is displayed (see
 * docs/kiro/P0_0_GUARDRAILS_MARCA_PI_CONTEUDOS_EXTERNOS.md §6).
 */
export default function ExternalResourceNotice({ title, platform, sourceUrl }: ExternalResourceNoticeProps) {
    return (
        <div className="mt-2 flex items-start gap-2 text-[11px] text-muted-foreground/80 leading-relaxed">
            <span className="shrink-0 font-semibold text-foreground/60">Recurso externo:</span>
            <span className="min-w-0">
                "{title}" disponibilizado por seu titular via {platform}. Direitos e condições de uso
                permanecem sujeitos ao titular original.{" "}
                <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                    Abrir na fonte <ExternalLink className="w-3 h-3" />
                </a>
            </span>
        </div>
    );
}
