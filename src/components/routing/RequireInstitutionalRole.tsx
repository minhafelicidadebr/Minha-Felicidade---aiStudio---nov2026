// UX-5 — Guard de papel institucional (D59 remediation).
//
// `RequireRole` conhece só os papéis de APLICAÇÃO (student/teacher/manager) de
// `profiles.roles`, porque é o que `get_my_profile` devolve. Papéis como
// `platform_admin`, `org_admin` e `school_admin` vivem em
// `institutional_memberships` e não aparecem em `profiles.roles`.
//
// Antes deste guard, cada página que precisava de um papel institucional fazia
// a checagem internamente (e.g. AdminOperacaoPage verificava `role !== "platform_admin"`
// e renderizava Navigate). Isso funciona mas é ad hoc: a checagem está
// espalhada, não é testada centralmente e não aparece na composição de guardas
// do App.tsx.
//
// Este componente resolve isso: aceita papéis de `DashboardRole` e usa
// `useDashboardContext` (que já junta os dois vocabulários) para decidir.
//
// REGRA: enquanto o papel não é conhecido, mostra loading (não o conteúdo). O
// flash de conteúdo protegido antes de resolver o papel é pior que um skeleton.

import { Navigate } from "react-router-dom";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import type { DashboardRole } from "@/lib/role-home";

interface RequireInstitutionalRoleProps {
    /** Papéis permitidos (vocabulário de DashboardRole, não de AppRole). */
    allowedRoles: readonly DashboardRole[];
    children: React.ReactNode;
}

/**
 * Bloqueia a renderização dos children até que o papel seja resolvido e, se o
 * papel não estiver na lista, redireciona para a home do papel efetivo.
 */
export default function RequireInstitutionalRole({
    allowedRoles,
    children,
}: RequireInstitutionalRoleProps) {
    const { role, roleHomePath, isLoading, isError } = useDashboardContext();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background p-4 sm:p-6">
                <DashboardSkeleton variant="page" label="Verificando suas permissões" />
            </div>
        );
    }

    // Erro ao resolver papel: cair no menor privilégio é mais seguro que
    // mostrar conteúdo administrativo.
    if (isError || !allowedRoles.includes(role)) {
        return <Navigate to={roleHomePath} replace state={{ accessDenied: true }} />;
    }

    return <>{children}</>;
}
