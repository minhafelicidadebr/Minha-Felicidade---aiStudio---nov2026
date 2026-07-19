import { createRoot } from "react-dom/client";
import "./index.css";

// Falha graciosa: se algo travar durante o carregamento do app (ex.: env do
// Supabase ausente/inválida em client.ts), NÃO deixamos a página inteira em
// branco sem explicação. Import dinâmico permite capturar até erros que
// aconteceriam durante a avaliação dos módulos (import estático não permite
// isso — o erro escaparia antes de qualquer try/catch rodar).
const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

function renderConfigError(message: string) {
    root.render(
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                fontFamily: "system-ui, -apple-system, sans-serif",
                background: "#faf7f2",
                color: "#1f2937",
                textAlign: "center",
            }}
        >
            <div style={{ maxWidth: 480 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
                    Não foi possível carregar a plataforma
                </h1>
                <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
                    Estamos com um problema temporário de configuração. Nossa equipe já
                    foi avisada. Tente novamente em alguns instantes.
                </p>
                <p style={{ fontSize: 11, color: "#9ca3af" }}>{message}</p>
            </div>
        </div>,
    );
}

import("./App.tsx")
    .then(({ default: App }) => {
        root.render(<App />);
    })
    .catch((error: unknown) => {
        console.error("Falha ao iniciar o aplicativo:", error);
        renderConfigError(error instanceof Error ? error.message : "Erro desconhecido");
    });
