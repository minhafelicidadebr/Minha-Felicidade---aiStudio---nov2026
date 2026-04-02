import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle2, Building2, GraduationCap, Heart, Landmark, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function LeadCaptureForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", org: "", segment: "", city: "" });
  const { toast } = useToast();

  const segments = [
    { value: "escola", label: "Escola / Instituição de Ensino", icon: GraduationCap },
    { value: "comunidade", label: "Organização Comunitária / ONG", icon: Users },
    { value: "empresa", label: "Empresa / Corporação", icon: Building2 },
    { value: "governo", label: "Governo / Setor Público", icon: MapPin },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("leads").insert({
        name: form.name,
        email: form.email,
        organization: form.org,
        segment: form.segment,
        city: form.city,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch {
      toast({ title: "Erro ao enviar", description: "Tente novamente em instantes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section className="py-24 bg-card" id="parceiros">
        <div className="container max-w-lg text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-6" />
            <h3 className="font-display font-bold text-2xl mb-3">Inscrição Recebida! 🎉</h3>
            <p className="text-muted-foreground">
              Obrigado, <strong className="text-foreground">{form.name}</strong>! Entraremos em contato para agendar uma reunião de apresentação personalizada para sua organização.
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-card" id="parceiros">
      <div className="container max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
              🤝 Parcerias de Impacto
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 leading-tight">
              Leve a Ciência do <span className="text-gradient">Bem-Estar</span> para sua organização
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Escolas, ONGs, empresas e governos podem promover o curso como ferramenta de transformação social. Receba um roadmap personalizado para implementação.
            </p>
            <div className="space-y-4">
              {["Acesso gratuito para adolescentes", "Dashboard de gestão com métricas de engajamento", "Relatórios de progresso em PDF", "Suporte de implementação do Instituto"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.form className="p-8 rounded-3xl bg-background border border-border shadow-premium" onSubmit={handleSubmit} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h3 className="font-display font-bold text-xl mb-6">Agende uma Reunião</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Nome completo</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Seu nome" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">E-mail profissional</label>
                <input type="email" required className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@organizacao.com" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Organização</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} placeholder="Nome da sua organização" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Segmento</label>
                <div className="grid grid-cols-2 gap-2">
                  {segments.map((s) => (
                    <button key={s.value} type="button" className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${form.segment === s.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30"}`} onClick={() => setForm({ ...form, segment: s.value })}>
                      <s.icon className="w-4 h-4 shrink-0" />
                      <span className="text-left">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Cidade / Estado</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ex: Brasília/DF" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl gradient-institute text-primary-foreground font-bold text-sm shadow-warm hover:shadow-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> Solicitar Reunião de Apresentação</>}
              </button>
            </div>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
