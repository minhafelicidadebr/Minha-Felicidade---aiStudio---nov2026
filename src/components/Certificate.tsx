import { useRef } from "react";
import { motion } from "framer-motion";
import { Download, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CertificateProps {
    studentName: string;
    completionDate: string;
    totalXp: number;
    modulesCompleted: number;
}

/**
 * Certificado digital de conclusão do curso Ciência do Bem-Estar.
 * Renderiza visualmente e permite download como imagem (canvas → PNG).
 * Nota: certificado emitido pelo Instituto Felicidade Para Todos (independente).
 */
export default function Certificate({ studentName, completionDate, totalXp, modulesCompleted }: CertificateProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { toast } = useToast();

    const drawCertificate = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        // Background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#1a1a2e");
        gradient.addColorStop(0.5, "#16213e");
        gradient.addColorStop(1, "#0f3460");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Border ornament
        ctx.strokeStyle = "#e2b45a";
        ctx.lineWidth = 4;
        ctx.strokeRect(30, 30, width - 60, height - 60);
        ctx.strokeStyle = "#e2b45a44";
        ctx.lineWidth = 1;
        ctx.strokeRect(40, 40, width - 80, height - 80);

        // Corner ornaments
        const corners = [[50, 50], [width - 50, 50], [50, height - 50], [width - 50, height - 50]];
        ctx.fillStyle = "#e2b45a";
        corners.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
        });

        // Title
        ctx.textAlign = "center";
        ctx.fillStyle = "#e2b45a";
        ctx.font = "bold 18px 'Georgia', serif";
        ctx.fillText("CERTIFICADO DE CONCLUSÃO", width / 2, 100);

        // Award icon placeholder
        ctx.font = "48px serif";
        ctx.fillText("🏆", width / 2, 160);

        // Main text
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px 'Georgia', serif";
        ctx.fillText("Certificamos que", width / 2, 210);

        // Student name
        ctx.fillStyle = "#e2b45a";
        ctx.font = "bold 28px 'Georgia', serif";
        ctx.fillText(studentName, width / 2, 255);

        // Description
        ctx.fillStyle = "#cccccc";
        ctx.font = "14px 'Georgia', serif";
        ctx.fillText("concluiu com êxito o programa", width / 2, 300);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px 'Georgia', serif";
        ctx.fillText("Ciência do Bem-Estar para Adolescentes", width / 2, 335);

        ctx.fillStyle = "#cccccc";
        ctx.font = "14px 'Georgia', serif";
        ctx.fillText(`${modulesCompleted} módulos · ${totalXp} XP acumulados`, width / 2, 370);

        // Modules list
        const moduleNames = ["Miswanting", "Expectativas", "Rewirements", "Hackeando o Cérebro", "Virando o Jogo"];
        ctx.font = "12px 'Georgia', serif";
        ctx.fillStyle = "#999999";
        ctx.fillText(moduleNames.join(" • "), width / 2, 400);

        // Date
        ctx.fillStyle = "#cccccc";
        ctx.font = "13px 'Georgia', serif";
        ctx.fillText(`Concluído em ${completionDate}`, width / 2, 445);

        // Footer
        ctx.fillStyle = "#e2b45a88";
        ctx.font = "11px 'Georgia', serif";
        ctx.fillText("Instituto Felicidade Para Todos", width / 2, 490);
        ctx.fillStyle = "#666666";
        ctx.font = "10px 'Georgia', serif";
        ctx.fillText("Plataforma independente de ciência do bem-estar", width / 2, 510);
        ctx.fillText("Este certificado atesta a conclusão das atividades. Não constitui diploma ou certificação acadêmica.", width / 2, 530);
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = 800;
        const height = 566;
        canvas.width = width;
        canvas.height = height;

        drawCertificate(ctx, width, height);

        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `certificado_${studentName.replace(/\s+/g, "_").toLowerCase()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: "Certificado baixado! 🏆", description: "Compartilhe sua conquista!" });
        }, "image/png");
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-3xl glass-card border border-[#e2b45a]/30 text-center"
        >
            <Award className="w-12 h-12 text-[#e2b45a] mx-auto mb-3" />
            <h2 className="text-xl font-display font-bold mb-1">Parabéns, {studentName}! 🎉</h2>
            <p className="text-sm text-muted-foreground mb-4">
                Você concluiu todos os {modulesCompleted} módulos do programa Ciência do Bem-Estar.
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-5">
                <span>🏆 {totalXp} XP</span>
                <span>📅 {completionDate}</span>
                <span>📚 {modulesCompleted} módulos</span>
            </div>
            <button
                onClick={handleDownload}
                className="px-6 py-3 rounded-xl gradient-institute text-primary-foreground font-bold text-sm shadow-warm hover:shadow-glow transition-all flex items-center gap-2 mx-auto"
            >
                <Download className="w-4 h-4" /> Baixar Certificado
            </button>
            <p className="text-[10px] text-muted-foreground mt-3">
                Emitido pelo Instituto Felicidade Para Todos · Plataforma independente
            </p>
            {/* Hidden canvas for generation */}
            <canvas ref={canvasRef} className="hidden" />
        </motion.div>
    );
}
