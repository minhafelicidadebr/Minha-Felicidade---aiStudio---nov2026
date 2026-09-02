import jsPDF from "jspdf";

export interface PilotReportData {
    orgName: string;
    generatedAt: string;
    schools: { name: string; municipality?: string | null; classCount: number }[];
    totalMembers: number;
    totalStudents: number;
    totalEducators: number;
    totalInvitations: number;
    activationRate: number;
    /**
     * Engajamento e NPS da rede.
     *
     * TRUST-1.2 (§D8): exportação é superfície de dados, não detalhe visual. O
     * servidor suprime estas métricas quando a rede tem entre 1 e o limiar de
     * estudantes, e nesse caso elas chegam `null`. `null` NÃO pode ser impresso
     * como `0`: zero fabricado é afirmação falsa num arquivo que sai da
     * organização por e-mail.
     */
    engagementData?: {
        /** Chaves que o servidor suprimiu por contributor gate. */
        suppressedMetrics: string[];
        /** Limiar aplicado pelo servidor, para o texto ser honesto. */
        minimumGroupSize: number;
        totalSessions: number | null;
        totalExercises: number | null;
        totalAiInteractions: number | null;
        activeUsers7d: number | null;
        activeUsers30d: number | null;
        npsAvg: number | null;
        npsCount: number | null;
        npsPromotors: number | null;
        npsDetractors: number | null;
    };
}

/**
 * Número suprimido nunca vira `0` no PDF (TRUST-1.2 §D8).
 *
 * `null` significa "o servidor não autorizou este valor". Imprimir zero seria
 * afirmar que ninguém participou, o que é diferente e pode ser falso. O travessão
 * é o mesmo símbolo que o resto do relatório usa para ausência.
 */
function cell(value: number | null): string {
    return value === null ? "—" : String(value);
}

// Brand colors
const COLORS = {
    primary: [249, 115, 22] as [number, number, number],       // #f97316
    primaryDark: [194, 65, 12] as [number, number, number],    // #c2410c
    dark: [15, 23, 42] as [number, number, number],            // #0f172a
    darkCard: [30, 41, 59] as [number, number, number],        // #1e293b
    gold: [226, 180, 90] as [number, number, number],          // #e2b45a
    text: [248, 250, 252] as [number, number, number],         // #f8fafc
    textMuted: [148, 163, 184] as [number, number, number],    // #94a3b8
    emerald: [52, 211, 153] as [number, number, number],       // #34d399
    violet: [139, 92, 246] as [number, number, number],        // #8b5cf6
    sky: [56, 189, 248] as [number, number, number],           // #38bdf8
    rose: [251, 113, 133] as [number, number, number],         // #fb7185
    white: [255, 255, 255] as [number, number, number],
};

function drawGradientRect(doc: jsPDF, x: number, y: number, w: number, h: number, fromColor: [number, number, number], toColor: [number, number, number], steps = 20) {
    const stepH = h / steps;
    for (let i = 0; i < steps; i++) {
        const ratio = i / steps;
        const r = Math.round(fromColor[0] + (toColor[0] - fromColor[0]) * ratio);
        const g = Math.round(fromColor[1] + (toColor[1] - fromColor[1]) * ratio);
        const b = Math.round(fromColor[2] + (toColor[2] - fromColor[2]) * ratio);
        doc.setFillColor(r, g, b);
        doc.rect(x, y + i * stepH, w, stepH + 0.5, "F");
    }
}

function drawMetricCard(doc: jsPDF, x: number, y: number, w: number, value: string, label: string, color: [number, number, number]) {
    // Card background
    doc.setFillColor(...COLORS.darkCard);
    doc.roundedRect(x, y, w, 28, 3, 3, "F");

    // Accent bar
    doc.setFillColor(...color);
    doc.rect(x, y, 3, 28, "F");

    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...color);
    doc.text(value, x + 10, y + 14);

    // Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(label, x + 10, y + 22);
}

function drawProgressBar(doc: jsPDF, x: number, y: number, w: number, pct: number, color: [number, number, number]) {
    // Background
    doc.setFillColor(51, 65, 85); // slate-700
    doc.roundedRect(x, y, w, 5, 2, 2, "F");
    // Fill
    if (pct > 0) {
        doc.setFillColor(...color);
        doc.roundedRect(x, y, Math.max(w * (pct / 100), 4), 5, 2, 2, "F");
    }
}

/**
 * Generates a premium pilot report PDF with data visualization.
 * Design: dark theme, gradient header, metric cards, progress bars.
 * Science of learning: clear data hierarchy, progressive disclosure.
 */
export function generatePilotReportPDF(data: PilotReportData): jsPDF {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;
    const margin = 15;
    const contentW = pageW - margin * 2;

    // ═══════════════════════════════════════════════════════════════════
    // PAGE 1: COVER + EXECUTIVE SUMMARY
    // ═══════════════════════════════════════════════════════════════════

    // Full page dark background
    doc.setFillColor(...COLORS.dark);
    doc.rect(0, 0, pageW, 297, "F");

    // Header gradient band
    drawGradientRect(doc, 0, 0, pageW, 55, COLORS.primaryDark, COLORS.dark);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gold);
    doc.text("INSTITUTO FELICIDADE PARA TODOS", margin, 18);

    doc.setFontSize(22);
    doc.setTextColor(...COLORS.white);
    doc.text("Relatório do Piloto", margin, 32);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.textMuted);
    doc.text("Ciência do Bem-Estar para Adolescentes", margin, 41);

    // Org name + date
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.white);
    doc.text(data.orgName, margin, 68);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`Gerado em ${data.generatedAt}`, margin, 76);

    // ─── EXECUTIVE SUMMARY METRICS ───
    let y = 90;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.gold);
    doc.text("RESUMO EXECUTIVO", margin, y);
    y += 10;

    // Metric cards row 1
    const cardW = (contentW - 6) / 3;
    drawMetricCard(doc, margin, y, cardW, String(data.schools.length), "Escolas", COLORS.primary);
    drawMetricCard(doc, margin + cardW + 3, y, cardW, String(data.totalMembers), "Membros ativos", COLORS.emerald);
    drawMetricCard(doc, margin + (cardW + 3) * 2, y, cardW, `${data.activationRate}%`, "Taxa de ativação", COLORS.sky);
    y += 35;

    // Metric cards row 2
    drawMetricCard(doc, margin, y, cardW, String(data.totalStudents), "Estudantes", COLORS.violet);
    drawMetricCard(doc, margin + cardW + 3, y, cardW, String(data.totalEducators), "Educadores", COLORS.gold);
    drawMetricCard(doc, margin + (cardW + 3) * 2, y, cardW, String(data.totalInvitations), "Convites pendentes", COLORS.rose);
    y += 38;

    // ─── STRUCTURE ───
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.gold);
    doc.text("ESTRUTURA DA REDE", margin, y);
    y += 8;

    data.schools.forEach((school) => {
        doc.setFillColor(...COLORS.darkCard);
        doc.roundedRect(margin, y, contentW, 14, 2, 2, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.white);
        doc.text(school.name, margin + 5, y + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.textMuted);
        const detail = `${school.municipality ?? ""} · ${school.classCount} turma(s)`;
        doc.text(detail, margin + 5, y + 11);

        y += 17;
    });

    // ─── ACTIVATION FUNNEL ───
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.gold);
    doc.text("FUNIL DE ADESÃO", margin, y);
    y += 8;

    doc.setFillColor(...COLORS.darkCard);
    doc.roundedRect(margin, y, contentW, 30, 3, 3, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    doc.text("Convites aceitos", margin + 5, y + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.emerald);
    doc.text(`${data.totalMembers} de ${data.totalMembers + data.totalInvitations}`, margin + 5, y + 18);

    drawProgressBar(doc, margin + 5, y + 22, contentW - 10, data.activationRate, COLORS.emerald);
    y += 38;

    // ─── ENGAGEMENT ───
    if (data.engagementData) {
        const ed = data.engagementData;
        const halfW = (contentW - 3) / 2;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.gold);
        doc.text("ENGAJAMENTO (últimos 30 dias)", margin, y);
        y += 10;

        const allAnalyticsSuppressed = ed.suppressedMetrics.length > 0 && [
            ed.totalSessions, ed.totalExercises, ed.totalAiInteractions,
            ed.activeUsers7d, ed.activeUsers30d, ed.npsCount,
        ].every((value) => value === null);

        // TRUST-1.2.1: a supressão agora é por métrica/contribuidores. Só
        // substituímos o bloco inteiro quando nenhum indicador é divulgável;
        // em supressão parcial os permitidos continuam visíveis e os demais
        // usam travessão, nunca zero fabricado.
        if (allAnalyticsSuppressed) {
            doc.setFillColor(...COLORS.darkCard);
            doc.roundedRect(margin, y, contentW, 22, 3, 3, "F");
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(...COLORS.textMuted);
            doc.text("Amostra insuficiente para exibição segura.", margin + 5, y + 9);
            doc.setFontSize(8);
            doc.text(
                `Indicadores de estudantes são agregados com limiar mínimo de ${ed.minimumGroupSize} pessoas.`,
                margin + 5,
                y + 16,
            );
            y += 30;
        } else {
            drawMetricCard(doc, margin, y, halfW, cell(ed.totalSessions), "Sessões", COLORS.primary);
            drawMetricCard(doc, margin + halfW + 3, y, halfW, cell(ed.totalExercises), "Exercícios completados", COLORS.emerald);
            y += 33;

            drawMetricCard(doc, margin, y, halfW, cell(ed.totalAiInteractions), "Interações com IA", COLORS.violet);
            drawMetricCard(doc, margin + halfW + 3, y, halfW, `${cell(ed.activeUsers7d)}/${cell(ed.activeUsers30d)}`, "Ativos 7d / 30d", COLORS.sky);
            y += 33;

            if (ed.suppressedMetrics.length > 0) {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(...COLORS.textMuted);
                doc.text(
                    `Indicadores com travessão: amostra abaixo do limiar de ${ed.minimumGroupSize} contribuidores.`,
                    margin,
                    y,
                );
                y += 6;
            }

            // NPS — só quando há respostas E os números não estão suprimidos.
            if (ed.npsCount !== null && ed.npsCount > 0 && ed.npsPromotors !== null && ed.npsDetractors !== null) {
                const npsScore = Math.round(((ed.npsPromotors - ed.npsDetractors) / ed.npsCount) * 100);
                doc.setFillColor(...COLORS.darkCard);
                doc.roundedRect(margin, y, contentW, 25, 3, 3, "F");

                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.setTextColor(...COLORS.textMuted);
                doc.text("NPS DO PILOTO", margin + 5, y + 8);

                doc.setFontSize(16);
                const npsColor = npsScore >= 50 ? COLORS.emerald : npsScore >= 0 ? COLORS.gold : COLORS.rose;
                doc.setTextColor(...npsColor);
                doc.text(`${npsScore > 0 ? "+" : ""}${npsScore}`, margin + 5, y + 19);

                doc.setFontSize(8);
                doc.setTextColor(...COLORS.textMuted);
                doc.text(`${ed.npsCount} respostas · Média ${ed.npsAvg ?? "—"}/10`, margin + 35, y + 19);
                y += 30;
            }
        }
    }

    // ─── FOOTER ───
    const footerY = 275;
    doc.setDrawColor(51, 65, 85);
    doc.line(margin, footerY, pageW - margin, footerY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textMuted);
    doc.text("Este relatório contém apenas indicadores AGREGADOS. Nenhum dado pessoal, conversa com IA", margin, footerY + 5);
    doc.text("ou relato individual de estudante é incluído (LGPD art. 14 · proteção de menores).", margin, footerY + 9);

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Instituto Felicidade Para Todos · Plataforma independente de ciência do bem-estar", margin, footerY + 16);

    return doc;
}
