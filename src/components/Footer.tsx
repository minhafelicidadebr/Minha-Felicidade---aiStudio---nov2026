import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoIcon from "@/assets/logo-icon.png";
import logoDarkBg from "@/assets/logo-dark-bg.png";
import { Heart, ExternalLink, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const platformLinks = [
  { to: "/auth", label: "Acessar Curso" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/alegria", label: "AlegrIA" },
  { to: "/quiz", label: "Quiz Adaptativo" },
  { to: "/flashcards", label: "Flashcards" },
  { to: "/evidence", label: "Evidence Explorer" },
];

const resourceLinks = [
  { to: "/simulator", label: "Simulador" },
  { to: "/debate", label: "Arena de Debate" },
  { to: "/poetry", label: "Poesia Pedagógica" },
  { to: "/codesign", label: "Co-design" },
];

export default function Footer() {
  const [showDemo, setShowDemo] = useState(false);
  const [demoPass, setDemoPass] = useState("");
  const [demoError, setDemoError] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const navigate = useNavigate();

  const DEMO_EMAIL = "minhafelicidadebr@gmail.com";
  const DEMO_PASSWORD = "luzpazeamor";

  const handleDemoLogin = async () => {
    if (demoPass !== DEMO_PASSWORD) {
      setDemoError("Senha incorreta");
      return;
    }
    setDemoLoading(true);
    setDemoError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (error) {
        setDemoError("Conta demo indisponível no momento");
        return;
      }
      navigate("/dashboard", { replace: true });
    } catch {
      setDemoError("Erro ao entrar. Tente novamente.");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <footer className="bg-foreground text-background relative overflow-hidden" role="contentinfo">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/5 pointer-events-none" />

      <div className="container relative py-16">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src={logoIcon} alt="Instituto" className="w-10 h-10 rounded-lg" />
              <img src={logoDarkBg} alt="Instituto Felicidade Para Todos" className="h-7 object-contain" />
            </div>
            <p className="text-sm opacity-60 leading-relaxed mb-4">
              Ativando ecossistemas sustentáveis de felicidade humana, socioambiental e organizacional.
            </p>
            <div className="flex gap-3">
              <a href="https://instagram.com/felicidadeparatodosbr" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors" aria-label="Instagram">
                📸
              </a>
              <a href="https://www.felicidadeparatodos.com.br" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors" aria-label="Website">
                🌐
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-display font-bold text-sm mb-4 uppercase tracking-wider opacity-80">Plataforma</h4>
            <ul className="space-y-2.5">
              {platformLinks.map(l => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm opacity-60 hover:opacity-100 transition-opacity">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display font-bold text-sm mb-4 uppercase tracking-wider opacity-80">Dinâmicas</h4>
            <ul className="space-y-2.5">
              {resourceLinks.map(l => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm opacity-60 hover:opacity-100 transition-opacity">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-sm mb-4 uppercase tracking-wider opacity-80">Contato</h4>
            <address className="space-y-2 text-sm opacity-60 not-italic leading-relaxed">
              <p>Impact HUB Brasília</p>
              <p>SGAN 601, Lote H — Edifício Íon</p>
              <p>Ala Amarela — Asa Norte</p>
              <p>Brasília/DF — Brasil</p>
              <p className="pt-2 flex items-center gap-1.5">📞 (61) 3550-8779</p>
              <p>
                <a href="https://www.felicidadeparatodos.com.br" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity inline-flex items-center gap-1">
                  felicidadeparatodos.com.br <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </address>
          </div>
        </div>

        <div className="border-t border-background/15 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs opacity-40 flex items-center gap-1">
            © 2025 Instituto Felicidade para Todos. Feito com <Heart className="w-3 h-3 text-destructive fill-destructive" /> para adolescentes.
          </p>
          <div className="flex items-center gap-4">
            {!showDemo ? (
              <button
                onClick={() => setShowDemo(true)}
                className="text-xs opacity-40 hover:opacity-80 transition-opacity flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" /> Acesso Demo
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={demoPass}
                  onChange={(e) => { setDemoPass(e.target.value); setDemoError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleDemoLogin()}
                  placeholder="Senha demo"
                  className="px-3 py-1.5 rounded-lg bg-background/10 border border-background/20 text-xs text-background placeholder:text-background/40 focus:outline-none focus:ring-1 focus:ring-primary/50 w-32"
                  autoFocus
                />
                <button
                  onClick={handleDemoLogin}
                  disabled={demoLoading}
                  className="px-3 py-1.5 rounded-lg bg-primary/80 text-xs font-semibold text-primary-foreground hover:bg-primary transition-colors disabled:opacity-50"
                >
                  {demoLoading ? "..." : "Entrar"}
                </button>
                <button onClick={() => { setShowDemo(false); setDemoPass(""); setDemoError(""); }} className="text-xs opacity-40 hover:opacity-80">✕</button>
                {demoError && <span className="text-xs text-destructive">{demoError}</span>}
              </div>
            )}
            <p className="text-xs opacity-40">
              Fontes auditáveis • WCAG 2.2 • Anti-alucinação • SDT
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
