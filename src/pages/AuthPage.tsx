import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Sparkles, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoIcon from "@/assets/logo-icon.png";
import logoLightBg from "@/assets/logo-light-bg.png";
import heroYouthBg from "@/assets/hero-youth-bg.jpg";
import { getSafeRedirectPath } from "@/lib/redirect";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const redirectPath = getSafeRedirectPath(searchParams.get("redirect"));

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) navigate(redirectPath, { replace: true });
    });

    return () => {
      active = false;
    };
  }, [navigate, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(redirectPath, { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        toast({ title: "Conta criada! 🎉", description: "Bem-vindo(a) à Ciência do Bem-Estar!" });
        navigate(redirectPath, { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={heroYouthBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-foreground/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-background">
          <div>
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity mb-12">
              <ArrowLeft className="w-4 h-4" /> Voltar ao início
            </button>
            <img src={logoLightBg} alt="Instituto Felicidade Para Todos" className="h-10 object-contain mb-8 invert" />
            <h2 className="font-display text-4xl font-bold leading-tight mb-4">
              A aula mais popular da história de Yale.
            </h2>
            <p className="text-lg opacity-80 leading-relaxed">
              Agora gratuita, gamificada e com tutoria de IA para adolescentes brasileiros.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { n: "3.3M+", d: "alunos no mundo" },
              { n: "10", d: "dinâmicas gamificadas" },
              { n: "32", d: "vídeos com legendas PT" },
            ].map((s) => (
              <div key={s.d} className="flex items-center gap-4">
                <span className="text-2xl font-display font-bold">{s.n}</span>
                <span className="text-sm opacity-70">{s.d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 bg-background flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          {/* Mobile back */}
          <button onClick={() => navigate("/")} className="lg:hidden flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="text-center mb-8">
            <img src={logoIcon} alt="Instituto" className="w-14 h-14 rounded-2xl mx-auto mb-4 shadow-warm" />
            <h1 className="text-3xl font-display font-bold">
              Ciência do <span className="text-primary">Bem-Estar</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Baseado em Yale • Gratuito para adolescentes
            </p>
          </div>

          <div className="bg-card rounded-3xl border border-border p-8 shadow-warm">
            <div className="flex bg-muted rounded-xl p-1 mb-6">
              <button onClick={() => setIsLogin(true)} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${isLogin ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>Entrar</button>
              <button onClick={() => setIsLogin(false)} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${!isLogin ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>Criar conta</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Nome completo</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Como podemos te chamar?" className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" required />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" required />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Senha</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all pr-12" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl gradient-institute text-primary-foreground font-semibold text-sm shadow-warm hover:shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><Sparkles className="w-4 h-4" />{isLogin ? "Entrar na Jornada" : "Começar Minha Jornada"}</>}
              </button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Instituto Felicidade Para Todos • Baseado em Yale University
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
