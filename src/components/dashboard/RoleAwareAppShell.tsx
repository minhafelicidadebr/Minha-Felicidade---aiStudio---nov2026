// UX-1 — App Shell adaptativo por papel.
//
// É a infraestrutura compartilhada que as ondas UX-2/3/4 vão vestir. Substitui,
// dentro do app autenticado, o Navbar horizontal único (que era igual para
// estudante, docente e gestor).
//
// Responsividade (contrato §8):
//   • ≥768px  → sidebar/rail persistente + filtros inline;
//   • <768px  → drawer (mesma navegação) + bottom nav + filtros em sheet.
//
// A11y (contrato §9): skip link, landmarks (banner/nav/main), foco visível,
// estados canônicos no lugar de `null` e respeito a prefers-reduced-motion
// (nenhuma animação obrigatória é introduzida aqui).

import { useMemo } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import DashboardErrorState from "./DashboardErrorState";
import DashboardHeader from "./DashboardHeader";
import DashboardSkeleton from "./DashboardSkeleton";
import MobileRoleNavigation from "./MobileRoleNavigation";
import RoleSidebar from "./RoleSidebar";
import { cn } from "@/lib/utils";

const CONTENT_ID = "dashboard-content";

interface RoleAwareAppShellProps {
    title: string;
    subtitle?: string;
    /** Ação primária da tela. */
    action?: React.ReactNode;
    /** Barra de filtros (GlobalFilterBar) — opcional por tela. */
    filters?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export default function RoleAwareAppShell({
    title,
    subtitle,
    action,
    filters,
    children,
    className,
}: RoleAwareAppShellProps) {
    const {
        role,
        roleHomePath,
        organizations,
        activeOrganization,
        setActiveOrganization,
        memberships,
        fetchedAt,
        isLoading,
        isError,
        error,
        refetch,
    } = useDashboardContext();

    // UX-6: contexto para resolver itens de navegação com destino dinâmico.
    // As escolas vêm dos vínculos ativos, derivados no servidor — o cliente não
    // inventa a lista. Quando a pessoa administra exatamente uma escola, o item
    // "Minha escola" aparece apontando para ela; com zero ou várias, o item é
    // omitido (a lista completa está em `/org`, com nome e município).
    const navContext = useMemo(
        () => ({
            schoolIds: [
                ...new Set(
                    memberships
                        .map((membership) => membership.schoolId)
                        .filter((schoolId): schoolId is string => Boolean(schoolId)),
                ),
            ],
        }),
        [memberships],
    );

    // Enquanto o papel não é conhecido, renderizar a navegação seria mostrar o
    // menu errado (ou o de menor privilégio) e depois trocar — pior que esperar.
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background p-4 sm:p-6">
                <DashboardSkeleton variant="page" label="Carregando seu painel" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="min-h-screen bg-background p-4 sm:p-6">
                <DashboardErrorState
                    title="Não conseguimos identificar seu acesso"
                    description="Isto impede montar o painel correto para o seu papel. Seus dados não foram alterados."
                    detail={error?.message ?? null}
                    onRetry={refetch}
                />
            </div>
        );
    }

    return (
        <SidebarProvider>
            {/* Skip link: primeiro alvo tabulável da página. */}
            <a
                href={`#${CONTENT_ID}`}
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-primary-foreground"
            >
                Pular para o conteúdo
            </a>

            <RoleSidebar role={role} homePath={roleHomePath} navContext={navContext} />

            {/* SidebarInset já É o landmark <main>: o id e o tabIndex vão nele
          para existir exatamente UM main por página (evita landmark duplicado
          e ambiguidade de navegação por leitor de tela). */}
            <SidebarInset id={CONTENT_ID} tabIndex={-1} className="min-w-0 bg-background">
                <DashboardHeader
                    role={role}
                    title={title}
                    subtitle={subtitle}
                    organizations={organizations}
                    activeOrganization={activeOrganization}
                    onOrganizationChange={setActiveOrganization}
                    updatedAt={fetchedAt}
                    action={action}
                />

                <div
                    className={cn(
                        "min-w-0 flex-1 px-3 py-4 sm:px-4 sm:py-5",
                        // Espaço para a bottom nav não cobrir o último elemento.
                        "pb-24 md:pb-8",
                        className,
                    )}
                >
                    {filters && <div className="mb-4">{filters}</div>}
                    {children}
                </div>
            </SidebarInset>

            <MobileRoleNavigation role={role} navContext={navContext} />
        </SidebarProvider>
    );
}
