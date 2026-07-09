import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calculator, Users, School, Sparkles, TrendingDown, Calendar, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { calculateSchoolPricing } from "@/lib/school-pricing";
import { startEscolarCheckout } from "@/lib/checkout";

export default function SchoolCalculator() {
  const [students, setStudents] = useState(150);
  const [schools, setSchools] = useState(1);
  const [annual, setAnnual] = useState(true);
  const [isPublic, setIsPublic] = useState(false);

  // Form: serve tanto para "Agendar Apresentação" (lead) quanto para
  // "Contratar agora" (checkout Mercado Pago), controlado por formMode.
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"demo" | "checkout">("demo");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", organization: "", city: "", preferredDate: "", message: "" });

  const openForm = (mode: "demo" | "checkout") => {
    setFormMode(mode);
    setShowForm(true);
  };

  const calc = useMemo(() => {
    const r = calculateSchoolPricing({ students, schools, annual, isPublicOrNgo: isPublic });
    return {
      perStudent: r.perStudentBrl,
      finalPerStudent: r.finalPerStudentBrl,
      monthlyTotal: r.monthlyTotalBrl,
      yearlyTotal: r.yearlyTotalBrl,
      totalDisc: r.totalDiscount,
      customQuote: r.customQuote,
      managersFree: r.managersFree,
      netDisc: r.networkDiscount,
      annualDisc: r.annualDiscount,
      publicDisc: r.publicDiscount,
      monthlyTotalCents: r.monthlyTotalCents,
    };
  }, [students, schools, annual, isPublic]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formMode === "checkout") {
      setSubmitting(true);
      try {
        await startEscolarCheckout({
          seats_students: students,
          seats_schools: schools,
          billing_interval: annual ? "yearly" : "monthly",
          contact_email: form.email,
          contact_name: form.name,
          is_public_ngo: isPublic,
        });
        // startEscolarCheckout redireciona para o Mercado Pago em caso de sucesso.
      } catch (err) {
        setSubmitting(false);
        toast({
          title: "Não foi possível iniciar a contratação",
          description: err instanceof Error ? err.message : "Tente novamente em instantes.",
          variant: "destructive",
        });
      }
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      name: form.name,
      email: form.email,
      organization: form.organization,
      city: form.city,
      segment: "school_b2b",
      estimated_students: students,
      schools_count: schools,
      calculated_price_cents: calc.monthlyTotalCents,
      billing_interval: annual ? "yearly" : "monthly",
      is_public_ngo: isPublic,
      message: form.message,
      preferred_demo_at: form.preferredDate ? new Date(form.preferredDate).toISOString() : null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({ title: "Apresentação agendada!", description: "Nosso time entra em contato em até 24h." });
  };

  return (
    <section className="py-20 relative overflow-hidden" id="calculadora">
      <div className="absolute inset-0 gradient-mesh opacity-20" />
      <div className="container max-w-6xl relative">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <Calculator className="w-4 h-4" /> Calculadora Escolar
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Quanto custa para a <span className="text-gradient">sua escola</span>?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Modelo transparente: pague apenas pelos alunos ativos. Quanto maior a rede, menor o preço.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Controls */}
          <motion.div className="lg:col-span-3 p-8 rounded-3xl glass-card border border-border/50" initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="space-y-8">
              {/* Students */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2 font-bold"><Users className="w-4 h-4 text-primary" /> Número de alunos</Label>
                  <span className="text-2xl font-display font-bold text-primary">{students.toLocaleString("pt-BR")}</span>
                </div>
                <Slider value={[students]} onValueChange={(v) => setStudents(v[0])} min={20} max={2500} step={10} className="mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>20</span><span>500</span><span>1.000</span><span>2.500+</span></div>
              </div>

              {/* Schools */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2 font-bold"><School className="w-4 h-4 text-primary" /> Unidades / escolas na rede</Label>
                  <span className="text-2xl font-display font-bold text-primary">{schools}</span>
                </div>
                <Slider value={[schools]} onValueChange={(v) => setSchools(v[0])} min={1} max={20} step={1} />
                <div className="flex justify-between text-xs text-muted-foreground mt-2"><span>1</span><span>5</span><span>10</span><span>20+</span></div>
              </div>

              {/* Toggles */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/40">
                  <div>
                    <Label className="font-bold cursor-pointer">Cobrança anual</Label>
                    <p className="text-xs text-muted-foreground">-20% adicional</p>
                  </div>
                  <Switch checked={annual} onCheckedChange={setAnnual} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/40">
                  <div>
                    <Label className="font-bold cursor-pointer">Escola pública / ONG</Label>
                    <p className="text-xs text-muted-foreground">-30% mediante comprovação</p>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>
              </div>

              {/* Discount breakdown */}
              {calc.totalDisc > 0 && (
                <div className="p-4 rounded-2xl bg-success/5 border border-success/20">
                  <p className="text-xs font-bold text-success uppercase tracking-wider mb-2 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" /> Descontos aplicados</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {calc.netDisc > 0 && <span className="px-2 py-1 rounded-md bg-success/10 text-success font-semibold">Rede −{Math.round(calc.netDisc * 100)}%</span>}
                    {calc.annualDisc > 0 && <span className="px-2 py-1 rounded-md bg-success/10 text-success font-semibold">Anual −20%</span>}
                    {calc.publicDisc > 0 && <span className="px-2 py-1 rounded-md bg-success/10 text-success font-semibold">Pública/ONG −30%</span>}
                    <span className="px-2 py-1 rounded-md bg-primary/10 text-primary font-bold ml-auto">Total −{Math.round(calc.totalDisc * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Result */}
          <motion.div className="lg:col-span-2 p-8 rounded-3xl gradient-institute text-primary-foreground relative overflow-hidden flex flex-col" initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary-foreground/10 blur-3xl pointer-events-none" />

            {calc.customQuote ? (
              <>
                <div className="flex-1">
                  <Sparkles className="w-8 h-8 mb-3 opacity-80" />
                  <p className="text-sm opacity-80 mb-2">Volume Enterprise</p>
                  <h3 className="text-3xl font-display font-bold mb-4">Vamos conversar</h3>
                  <p className="text-sm opacity-90 leading-relaxed mb-6">
                    Para mais de 2.000 alunos preparamos uma proposta sob medida com SLA dedicado, integrações via API e onboarding presencial.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <p className="text-sm opacity-80 mb-2">Investimento total {annual ? "anual" : "mensal"}</p>
                  <h3 className="text-4xl md:text-5xl font-display font-bold mb-1">
                    {fmt(annual ? calc.yearlyTotal : calc.monthlyTotal)}
                  </h3>
                  <p className="text-sm opacity-80 mb-6">
                    {fmt(calc.finalPerStudent)} por aluno/mês {annual && "(cobrado anualmente)"}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /> {students.toLocaleString("pt-BR")} alunos ativos</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /> {calc.managersFree} gestor(es) grátis</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /> Painel + relatórios MTE</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /> Onboarding incluído</div>
                  </div>
                </div>
              </>
            )}

            {!calc.customQuote && (
              <button
                onClick={() => openForm("checkout")}
                className="mt-6 w-full py-3.5 rounded-2xl bg-primary-foreground text-primary font-bold text-sm hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 shadow-lg"
              >
                <Sparkles className="w-4 h-4" /> Contratar agora
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => openForm("demo")}
              className={`${calc.customQuote ? "mt-6" : "mt-3"} w-full py-3.5 rounded-2xl bg-primary-foreground/15 text-primary-foreground font-bold text-sm hover:bg-primary-foreground/25 transition-colors flex items-center justify-center gap-2 border border-primary-foreground/20`}
            >
              <Calendar className="w-4 h-4" /> Agendar Apresentação
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs opacity-70 mt-3 text-center">Resposta em até 24h • Teste grátis 14 dias</p>
          </motion.div>
        </div>

        {/* Demo scheduling form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-8 p-8 rounded-3xl border border-primary/20 glass-card"
          >
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <h3 className="font-display font-bold text-2xl mb-2">Solicitação recebida!</h3>
                <p className="text-muted-foreground">Nosso time comercial entra em contato em até 24h pelo e-mail informado.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  {formMode === "checkout" ? <Sparkles className="w-5 h-5 text-primary" /> : <Calendar className="w-5 h-5 text-primary" />}
                  <h3 className="font-display font-bold text-xl">
                    {formMode === "checkout" ? "Contratar Plano Escolar" : "Agendar apresentação personalizada"}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {formMode === "checkout" ? "Contratação para" : "Receba uma proposta formal para"} <strong>{students} alunos</strong> em <strong>{schools} escola{schools > 1 ? "s" : ""}</strong>
                  {!calc.customQuote && <> — <strong>{fmt(annual ? calc.yearlyTotal : calc.monthlyTotal)}/{annual ? "ano" : "mês"}</strong></>}.
                  {formMode === "checkout" && " Você será levado ao pagamento seguro do Mercado Pago."}
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input placeholder="Seu nome completo *" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  <Input type="email" placeholder="E-mail corporativo *" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  <Input placeholder="Nome da escola / rede *" required value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} />
                  <Input placeholder="Cidade / UF" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                  <Input type="datetime-local" placeholder="Data preferida" value={form.preferredDate} onChange={e => setForm({ ...form, preferredDate: e.target.value })} className="md:col-span-2" />
                </div>
                <textarea
                  placeholder="Conte mais sobre seu projeto (opcional)"
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  className="w-full p-3 rounded-xl border border-input bg-background text-sm min-h-[80px] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="flex flex-col sm:flex-row gap-3">
                  <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-2xl gradient-institute text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> {formMode === "checkout" ? "Redirecionando..." : "Enviando..."}</>
                    ) : (
                      <>{formMode === "checkout" ? "Ir para pagamento" : "Enviar solicitação"} <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 rounded-2xl bg-muted hover:bg-muted/70 font-semibold text-sm">
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}
