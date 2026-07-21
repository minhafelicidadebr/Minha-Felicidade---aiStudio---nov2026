import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary global — captura erros de renderização em qualquer descendente
 * e mostra um fallback acessível em vez de tela branca. Não substitui o
 * tratamento de erros em código assíncrono (fetch, RPCs, etc. — esses são
 * tratados por componentes individuais com try/catch), mas é a rede de
 * segurança final que evita a experiência "página vazia sem explicação".
 *
 * Para o público jovem, a mensagem é não-alarmista e oferece ação clara
 * (tentar de novo ou voltar ao início).
 */
export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="min-h-screen bg-background flex items-center justify-center px-6">
                    <div className="w-full max-w-md text-center space-y-5">
                        <div className="text-5xl">😅</div>
                        <h1 className="text-xl font-semibold text-foreground">
                            Ops, algo deu errado
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Tivemos um problema inesperado ao carregar esta página.
                            Geralmente é temporário — tente recarregar.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                Recarregar página
                            </button>
                            <a
                                href="/"
                                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                Voltar ao início
                            </a>
                        </div>
                        {this.state.error && (
                            <p className="text-[10px] text-muted-foreground/50 mt-4 break-all">
                                {this.state.error.message}
                            </p>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
