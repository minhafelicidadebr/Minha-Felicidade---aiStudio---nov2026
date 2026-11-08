// UX-1 — Entrada canônica autenticada (`/inicio`).
//
// Contrato DASHBOARD-ROUTE-MAP §"Redirecionamento canônico": cada papel tem uma
// home. Em vez de espalhar `if (role === ...) navigate(...)` por várias telas,
// existe UM ponto de entrada que resolve o destino.
//
// `/dashboard` continua funcionando (compatibilidade com e-mails, bookmarks e
// testes) — a migração para `/alunos` acontece na UX-4.

import { Navigate } from "react-router-dom";
import DashboardErrorState from "@/components/dashboard/DashboardErrorState";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import { useDashboardContext } from "@/hooks/useDashboardContext";

export default function RoleHomeRedirect() {
    const { roleHomePath, isLoading, isError, error, refetch } = useDashboardContext();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background p-4 sm:p-6">
                <DashboardSkeleton variant="page" label="Identificando seu painel" />
            </div>
        );
    }

    // Fail-safe explícito: sem saber o papel, não adivinhamos um painel
    // institucional. Mostramos o erro com retry e o caminho do estudante como
    // alternativa de menor privilégio.
    if (isError) {
        return (
            <div className="min-h-screen bg-background p-4 sm:p-6">
                <DashboardErrorState
                    title="Não conseguimos identificar seu painel"
                    description="Seu acesso está ativo, mas a leitura do seu papel falhou. Tente novamente ou siga para a sua jornada de aprendizagem."
                    detail={error?.message ?? null}
                    onRetry={refetch}
                />
            </div>
        );
    }

    return <Navigate to={roleHomePath} replace />;
}
