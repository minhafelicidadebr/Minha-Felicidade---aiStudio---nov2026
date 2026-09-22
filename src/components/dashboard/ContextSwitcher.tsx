// UX-1 — Troca de contexto organizacional.
//
// Resolve a limitação apontada na UX-0: `useOrganization` usava
// `.limit(1).maybeSingle()`, então quem pertence a mais de uma rede ficava preso
// à primeira. Aqui o contexto é explícito, persistido e sempre visível — o
// usuário nunca lê um número sem saber de qual rede ele é.
//
// Reutiliza cmdk (ui/command) + Popover já instalados: busca por teclado desde
// a primeira organização, sem nova dependência.

import { useState } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DashboardOrganization } from "@/hooks/useDashboardContext";

interface ContextSwitcherProps {
    organizations: DashboardOrganization[];
    activeOrganization: DashboardOrganization | null;
    onSelect: (organizationId: string) => void;
    className?: string;
}

export default function ContextSwitcher({
    organizations,
    activeOrganization,
    onSelect,
    className,
}: ContextSwitcherProps) {
    const [open, setOpen] = useState(false);

    if (organizations.length === 0 || !activeOrganization) return null;

    // Um único contexto: mostra o contexto (informação necessária) sem oferecer
    // um controle que não faz nada (controle morto confunde e falha em a11y).
    if (organizations.length === 1) {
        return (
            <p
                className={cn(
                    "flex min-w-0 items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs font-semibold",
                    className,
                )}
                data-testid="context-switcher-single"
            >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span className="sr-only">Contexto atual: </span>
                <span className="truncate">{activeOrganization.name}</span>
            </p>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                aria-label={`Trocar organização. Atual: ${activeOrganization.name}`}
                className={cn(
                    "flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 text-xs font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    className,
                )}
                data-testid="context-switcher"
            >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate">{activeOrganization.name}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-0">
                <Command>
                    <CommandInput placeholder="Buscar organização…" />
                    <CommandList>
                        <CommandEmpty>Nenhuma organização encontrada.</CommandEmpty>
                        <CommandGroup heading="Suas organizações">
                            {organizations.map((organization) => {
                                const isActive = organization.id === activeOrganization.id;
                                return (
                                    <CommandItem
                                        key={organization.id}
                                        value={organization.name}
                                        onSelect={() => {
                                            onSelect(organization.id);
                                            setOpen(false);
                                        }}
                                        className="gap-2"
                                    >
                                        <Check
                                            className={cn(
                                                "h-4 w-4 shrink-0",
                                                isActive ? "opacity-100 text-primary" : "opacity-0",
                                            )}
                                            aria-hidden="true"
                                        />
                                        <span className="truncate">{organization.name}</span>
                                        {isActive && <span className="sr-only">(selecionada)</span>}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
