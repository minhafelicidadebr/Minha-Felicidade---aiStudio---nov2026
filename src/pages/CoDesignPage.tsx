import { useState } from "react";
import { motion } from "framer-motion";
import { coDesignTemplates } from "@/data/moduleContents";
import { FileDown, Save, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function CoDesignPage() {
  const [templateIdx, setTemplateIdx] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const template = coDesignTemplates[templateIdx];

  const updateField = (sectionTitle: string, value: string) => {
    setValues((prev) => ({ ...prev, [`${template.id}-${sectionTitle}`]: value }));
    setSaved(false);
  };

  const getField = (sectionTitle: string) => values[`${template.id}-${sectionTitle}`] || "";

  const allFilled = template.sections.every((s) => getField(s.title).trim().length > 0);

  const exportPDF = () => {
    const content = template.sections
      .map((s) => `## ${s.title}\n${getField(s.title) || "(não preenchido)"}`)
      .join("\n\n---\n\n");
    const fullDoc = `# ${template.title}\n\n${template.description}\n\n---\n\n${content}\n\n---\nGerado por Felicidade.lab • Plataforma de aprendizagem baseada em evidências`;
    const blob = new Blob([fullDoc], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.title.replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold mb-2">🏗️ Estúdio de Co-design</h1>
          <p className="text-muted-foreground mb-8">Plano de intervenção com inputs, atividades, métricas e riscos</p>

          {/* Template selector */}
          <div className="flex gap-2 mb-8 flex-wrap">
            {coDesignTemplates.map((t, i) => (
              <button
                key={t.id}
                onClick={() => { setTemplateIdx(i); setSaved(false); }}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  templateIdx === i ? "gradient-warm text-primary-foreground shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>

          <div className="bg-card rounded-2xl p-8 shadow-warm">
            <h2 className="text-xl font-display font-bold mb-2">{template.title}</h2>
            <p className="text-sm text-muted-foreground mb-8">{template.description}</p>

            <div className="space-y-6">
              {template.sections.map((section) => (
                <div key={section.title}>
                  <label className="block font-display font-bold text-sm mb-1">{section.title}</label>
                  <p className="text-xs text-muted-foreground mb-2">{section.prompt}</p>
                  <textarea
                    value={getField(section.title)}
                    onChange={(e) => updateField(section.title, e.target.value)}
                    placeholder={section.prompt}
                    rows={3}
                    className="w-full p-4 rounded-xl bg-muted border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setSaved(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-muted text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                <Save className="w-4 h-4" /> Salvar rascunho
              </button>
              <button
                onClick={exportPDF}
                disabled={!allFilled}
                className="flex items-center gap-2 px-5 py-3 rounded-xl gradient-warm text-primary-foreground font-semibold text-sm shadow-warm disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" /> Exportar documento
              </button>
            </div>

            {saved && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-3 bg-success/10 rounded-lg text-sm text-success font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Rascunho salvo! +20 XP
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
