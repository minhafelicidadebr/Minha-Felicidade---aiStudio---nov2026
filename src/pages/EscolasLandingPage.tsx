import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Building2, Users, Shield, BarChart3, BookOpen, ArrowRight, CheckCircle2, Sparkles, Clock, Mail, TrendingUp, Lock } from "lucide-react";
import logoIcon from "@/assets/logo-mf-icon.png";
import heroYouth from "@/assets/hero-youth-2026.jpg";
import teacherExhausted from "@/assets/teacher-exhausted.jpg";
import youthConnection from "@/assets/youth-connection.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

/**
 * ONDA 3 — Landing institucional para gestores escolares.
 * Separada da landing do adolescente. Linguagem defensável:
 * "plataforma independente", "ciência do bem-estar", "piloto assistido".
 * Sem: "oficial Yale", "certificação Yale", "resultados garantidos".
 */

const BENEFITS = [
    { icon: BookOpen, title: "5 módulos de ciência do bem-estar", desc: "Conteúdo autoral adaptado para adolescentes brasileiros, com referências acadêmicas verificáveis." },
    { icon: Sparkles, title: "Tutoria com inteligência artificial", desc: "A AlegrIA acompanha cada aluno com respostas baseadas em ciência, sem diagnósticos ou substituição de profissionais." },
    { icon: BarChart3, title: "Indicadores agregados por turma", desc: "Acompanhe adesão, engajamento e conclusão sem acessar dados pessoais dos estudantes." },
    { icon: Shield, title: "Proteção de dados de menores", desc: "Consentimento parental obrigatório, dados mínimos, sem exposição de relatos pessoais ao gestor." },
    { icon: Users, title: "Implantação assistida", desc: "Onboarding da equipe escolar, suporte dedicado e reunião de devolutiva ao final do piloto." },
    { icon: Clock, title: "5 semanas, 2-3h por semana", desc: "Jornada curta e prática, compatível com o calendário escolar. O aluno avança no seu ritmo." },
];

const STEPS = [
    { n: "1", title: "Solicite uma demonstração", desc: "Preencha o formulário abaixo e nossa equipe entrará em contato." },
    { n: "2", title: "Conheça a plataforma", desc: "Apresentação personalizada com dados da sua realidade escolar." },
    { n: "3", title: "Configure o piloto", desc: "Criamos a organização, turmas e convites para alunos e educadores." },
    { n: "4", title: "Acompanhe os resultados", desc: "Painel institucional com indicadores agregados e relatório do piloto." },
];

const FAQ = [
    { q: "Preciso de infraestrutura especial?", a: "Não. Basta acesso à internet e um navegador. Funciona em celular, tablet e computador." },
    { q: "Os alunos precisam de autorização dos pais?", a: "Sim. A plataforma exige consentimento parental digital para menores de 18 anos, conforme LGPD art. 14." },
    { q: "Quanto custa o piloto?", a: "O valor depende do número de alunos e duração. Solicite uma proposta pelo formulário — temos condições especiais para escolas públicas e ONGs." },
    { q: "A plataforma é da Yale?", a: "Não. Somos uma plataforma educacional brasileira e independente. Utilizamos referências acadêmicas da ciência do bem-estar, mas não somos afiliados, certificados ou endossados por Yale University." },
    { q: "Que tipo de dados o gestor pode ver?", a: "Apenas indicadores agregados: adesão, conclusão de módulos e engajamento por turma. Conversas com a IA e relatos pessoais não são visíveis ao gestor." },
];

export default function EscolasLandingPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [form, setForm] = useState({ name: "", role: "", institution: "", municipality: "", students: "", email: "", phone: "", consent: false });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.consent || !form.name.trim() || !form.email.trim() || !form.institution.trim()) {
            toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
            return;
        }
        setSubmitting(true);
        try {
            const { error } = await supabase.from("leads").insert({
                name: form.name.trim(),
                email: form.email.trim(),
                organization: form.institution.trim(),
                city: form.municipality.trim() || null,
                segment: "escolar",
                message: `Função: ${form.role}\nAlunos: ${form.students}\nTelefone: ${form.phone}`,
            });
            if (error) throw error;
            setSubmitted(true);
        } catch (e) {
            toast({ title: "Erro ao enviar", description: e instanceof Error ? e.message : "Tente novamente.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Nav simples */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
                <div className="container flex items-center justify-between h-16">
                    <div className="flex items-center gap-2.5">
                        <img src={logoIcon} alt="Minha Felicidade" className="w-9 h-9 rounded-lg object-contain" />
                        <span className="font-display font-bold text-lg hidden sm:inline">Minha <span className="text-primary">Felicidade</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Ver plataforma
                        </button>
                        <a href="#formulario" className="px-5 py-2.5 rounded-xl gradient-institute text-primary-foreground text-sm font-semibold shadow-warm hover:shadow-glow transition-all">
                            Solicitar demonstração
                        </a>
                    </div>
                </div>
            </nav>

            {/* Hero — foto real com blend orgânico + narrativa de conversão */}
            <section className="pt-28 pb-24 relative overflow-hidden min-h-[85vh] flex items-center">
                <div className="absolute inset-0">
                    <img
                        src={heroYouth}
                        alt="Estudantes brasileiros vivenciando aprendizagem socioemocional"
                        className="w-full h-full object-cover object-center opacity-45 dark:opacity-30"
                        loading="eager"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/88 to-background" />
                    <div className="absolute inset-0 gradient-aurora opacity-25 mix-blend-soft-light" />
                </div>
                <div className="container max-w-5xl relative text-center">
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-primary text-sm font-bold mb-6 shadow-warm">
                            <Building2 className="w-4 h-4" /> Programa Piloto Escolar Assistido · Vagas limitadas 2026
                        </span>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.03] mb-6 tracking-tight">
                            Alunos mais equilibrados.<br />
                            <span className="text-gradient-aurora">Uma escola que se destaca.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto mb-8 leading-relaxed">
                            Leve para os seus adolescentes uma jornada de bem-estar baseada em ciência —
                            com aulas curtas, prática guiada e uma tutora com IA. <strong className="text-foreground">Implantação
                                acompanhada do começo ao fim</strong>, e você acompanha o engajamento por turma.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                            <a href="#formulario" className="group px-8 py-4 rounded-2xl gradient-institute text-primary-foreground font-bold text-lg shadow-warm hover:shadow-glow hover:scale-[1.02] transition-all flex items-center gap-2 justify-center">
                                Quero uma demonstração <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </a>
                            <a href="#como-funciona" className="px-8 py-4 rounded-2xl glass hover:bg-card/90 font-semibold text-lg transition-all flex items-center gap-2 justify-center border border-border/40">
                                Como funciona
                            </a>
                        </div>
                        {/* Trust row — honesto, sem métricas fabricadas */}
                        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-success" /> Implantação acompanhada</span>
                            <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-success" /> Dados protegidos (LGPD art. 14)</span>
                            <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-success" /> Informado por evidências</span>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Problema escolar — foto real + dores específicas */}
            <section className="py-20 bg-muted/30">
                <div className="container max-w-6xl grid md:grid-cols-2 gap-10 lg:gap-14 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                        className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-float"
                    >
                        <img src={teacherExhausted} alt="Educadora sobrecarregada com as demandas do dia a dia escolar" className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                    >
                        <h2 className="text-3xl md:text-4xl font-display font-bold mb-5 leading-tight">
                            Você vê o problema todos os dias.
                        </h2>
                        <p className="text-base text-muted-foreground leading-relaxed mb-6">
                            Ansiedade, desmotivação e falta de propósito entre adolescentes crescem — e chegam
                            à sua escola. A equipe quer agir, mas falta tempo, método e material pronto.
                        </p>
                        <ul className="space-y-3">
                            {[
                                "Alunos ansiosos e desengajados afetam o clima da escola",
                                "Programas socioemocionais existem, mas são difíceis de implementar sozinho",
                                "Sem indicadores, é difícil mostrar resultado a famílias e mantenedores",
                            ].map((pain) => (
                                <li key={pain} className="flex items-start gap-3 text-sm">
                                    <span className="w-5 h-5 rounded-full bg-destructive/15 flex items-center justify-center shrink-0 mt-0.5 text-destructive text-xs font-bold">!</span>
                                    <span className="text-foreground/85">{pain}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-6 text-base font-semibold text-foreground">
                            É por isso que criamos um piloto <span className="text-primary">acompanhado do início ao fim</span>.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Banda de transformação — foto real full-width */}
            <section className="relative overflow-hidden">
                <div className="relative min-h-[420px] flex items-center">
                    <img src={youthConnection} alt="Adolescentes conectados e engajados após a jornada de bem-estar" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
                    <div className="container max-w-6xl relative">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="max-w-xl"
                        >
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-primary text-xs font-bold mb-4 uppercase tracking-wider">
                                <TrendingUp className="w-3.5 h-3.5" /> A transformação possível
                            </span>
                            <h2 className="text-3xl md:text-5xl font-display font-bold leading-[1.08] mb-4">
                                Adolescentes que aprendem a<br /><span className="text-gradient-aurora">cuidar do próprio bem-estar</span>
                            </h2>
                            <p className="text-base md:text-lg text-foreground/85 leading-relaxed">
                                Em 5 semanas, seus alunos praticam autoconhecimento, regulação emocional e
                                conexão — com uma metodologia leve, gamificada e feita para a linguagem deles.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Proposta de valor */}
            <section className="py-20">
                <div className="container max-w-6xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                            O que oferecemos
                        </h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Tecnologia, metodologia própria, atividades autorais e acompanhamento — tudo pronto para
                            funcionar na sua realidade escolar.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {BENEFITS.map((b, i) => (
                            <motion.div
                                key={b.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08 }}
                                className="p-6 rounded-2xl glass-card border border-border/30 hover:shadow-warm transition-all"
                            >
                                <b.icon className="w-8 h-8 text-primary mb-3" />
                                <h3 className="font-display font-bold text-base mb-2">{b.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Como funciona */}
            <section className="py-20 bg-muted/30" id="como-funciona">
                <div className="container max-w-4xl">
                    <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12">
                        Jornada de implantação
                    </h2>
                    <div className="space-y-6">
                        {STEPS.map((s, i) => (
                            <motion.div
                                key={s.n}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-start gap-4 p-5 rounded-2xl glass-card"
                            >
                                <div className="w-10 h-10 rounded-xl gradient-institute flex items-center justify-center text-primary-foreground font-bold shrink-0">
                                    {s.n}
                                </div>
                                <div>
                                    <h3 className="font-display font-bold text-base">{s.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20">
                <div className="container max-w-3xl">
                    <h2 className="text-3xl font-display font-bold text-center mb-10">Perguntas frequentes</h2>
                    <div className="space-y-3">
                        {FAQ.map((f, i) => (
                            <div key={i} className={`rounded-2xl border overflow-hidden transition-all ${openFaq === i ? "glass-card border-primary/20" : "bg-card border-border"}`}>
                                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center gap-3 p-5 text-left">
                                    <span className="font-display font-bold text-sm flex-1">{f.q}</span>
                                    <span className={`text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`}>▾</span>
                                </button>
                                {openFaq === i && (
                                    <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Formulário de interesse */}
            <section className="py-20 bg-muted/30" id="formulario">
                <div className="container max-w-2xl">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-display font-bold mb-3">Solicite uma demonstração</h2>
                        <p className="text-muted-foreground">
                            Preencha o formulário e nossa equipe entrará em contato para agendar uma apresentação personalizada.
                        </p>
                    </div>

                    {submitted ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 rounded-3xl glass-card text-center">
                            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
                            <h3 className="font-display font-bold text-xl mb-2">Recebemos seu interesse!</h3>
                            <p className="text-muted-foreground mb-6">Nossa equipe entrará em contato em até 2 dias úteis para agendar a demonstração.</p>
                            <button onClick={() => navigate("/")} className="px-6 py-3 rounded-xl bg-muted text-sm font-semibold">
                                Conhecer a plataforma
                            </button>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-8 rounded-3xl glass-card space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nome *</label>
                                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Seu nome completo" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Função</label>
                                    <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Ex: Diretor(a), Coordenador(a)" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Instituição *</label>
                                <input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} required className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Nome da escola ou rede" />
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Município</label>
                                    <input value={form.municipality} onChange={(e) => setForm({ ...form, municipality: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Cidade / UF" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nº aproximado de alunos</label>
                                    <input value={form.students} onChange={(e) => setForm({ ...form, students: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Ex: 150" />
                                </div>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">E-mail *</label>
                                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="gestor@escola.edu.br" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Telefone</label>
                                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="(11) 99999-9999" />
                                </div>
                            </div>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="mt-1 rounded border-border" />
                                <span className="text-xs text-muted-foreground leading-relaxed">
                                    Autorizo o contato para apresentação da plataforma. Seus dados serão usados apenas para este fim.
                                </span>
                            </label>
                            <button type="submit" disabled={submitting || !form.consent} className="w-full py-4 rounded-2xl gradient-institute text-primary-foreground font-bold text-base shadow-warm hover:shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {submitting ? "Enviando..." : <><Mail className="w-5 h-5" /> Solicitar demonstração</>}
                            </button>
                        </form>
                    )}
                </div>
            </section>

            <Footer />
        </div>
    );
}
