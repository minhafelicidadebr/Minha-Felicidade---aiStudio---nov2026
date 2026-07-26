// STATUS (UX-1 · DASHBOARD-COMPONENT-INVENTORY):
// Este Navbar NÃO é mais o shell canônico do app autenticado. O shell por papel
// é `src/components/dashboard/RoleAwareAppShell.tsx` (navegação role-aware,
// bottom nav mobile e context switcher).
//
// Uso permitido a partir daqui:
//   • superfícies públicas / de aquisição;
//   • fallback temporário nas páginas ainda não migradas (as migrações
//     acontecem nas ondas UX-2 /org, UX-3 /professores e UX-4 /alunos).
// Não adicionar novos itens de ferramenta a `links`: a navegação por papel vive
// em `src/config/dashboard-navigation.ts`.
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Trophy, Crown, Sparkles, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import logoIcon from "@/assets/logo-mf-icon.png";
import DarkModeToggle from "@/components/DarkModeToggle";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/alegria", label: "AlegrIA" },
  { href: "/quiz", label: "Quiz" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/evidence", label: "Evidências" },
  { href: "/simulator", label: "Simulador" },
  { href: "/debate", label: "Debate" },
  { href: "/poetry", label: "Poesia" },
  { href: "/codesign", label: "Co-design" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [totalXp, setTotalXp] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [hasOrg, setHasOrg] = useState(false);
  const location = useLocation();
  const { plan, isPremium } = useSubscription();

  useEffect(() => {
    const fetchXp = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from("user_progress").select("xp_earned").eq("user_id", session.user.id);
        if (data) setTotalXp(data.reduce((s, r) => s + (r.xp_earned || 0), 0));
        // Check if user has org membership (lightweight count)
        const { count } = await supabase.from("institutional_memberships").select("id", { count: "exact", head: true }).eq("user_id", session.user.id).eq("status", "active");
        setHasOrg((count ?? 0) > 0);
      }
    };
    fetchXp();
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "glass border-b border-border/30 shadow-warm/5" : "bg-background/60 backdrop-blur-md border-b border-border/20"
        }`}
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="container flex items-center justify-between h-16">
        <Link to="/dashboard" className="flex items-center gap-2.5 group" aria-label="Minha Felicidade — Ir para Dashboard">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/40 via-secondary/30 to-accent/20 blur-md opacity-70 group-hover:opacity-100 transition-opacity" aria-hidden />
            <img src={logoIcon} alt="Minha Felicidade" className="relative w-10 h-10 object-contain drop-shadow-[0_2px_6px_rgba(242,101,34,0.35)] group-hover:scale-105 transition-transform" />
          </div>
          <span className="hidden sm:flex flex-col leading-tight">
            <span className="font-display font-bold text-lg tracking-tight">Minha <span className="text-gradient">Felicidade</span></span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 font-medium">Floresce o nosso bem-estar</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-0.5">
          {links.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${location.pathname === l.href
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              aria-current={location.pathname === l.href ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
          {hasOrg && (
            <Link
              to="/org"
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${location.pathname === "/org"
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              aria-current={location.pathname === "/org" ? "page" : undefined}
            >
              <Building2 className="w-3.5 h-3.5" /> Escola
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isPremium ? (
            <Link
              to="/subscription"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/15 text-secondary text-xs font-bold hover:bg-secondary/25 transition-colors"
              title="Sua assinatura"
            >
              <Crown className="w-3.5 h-3.5" /> {plan.plan_name}
            </Link>
          ) : (
            <Link
              to="/subscription"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full gradient-institute text-primary-foreground text-xs font-bold hover:shadow-glow transition-all"
              title="Ver planos e assinar"
            >
              <Sparkles className="w-3.5 h-3.5" /> Assinar
            </Link>
          )}
          <DarkModeToggle />
          {totalXp > 0 && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full glass text-foreground">
              <Trophy className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-bold">{totalXp} XP</span>
            </div>
          )}
          <button className="lg:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors" onClick={() => setOpen(!open)} aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="lg:hidden glass border-b border-border/30"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="container py-4 flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${location.pathname === l.href ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                    }`}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                to="/subscription"
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${location.pathname === "/subscription" ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                  }`}
                onClick={() => setOpen(false)}
              >
                {isPremium ? <Crown className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                {isPremium ? `Meu plano · ${plan.plan_name}` : "Planos e assinatura"}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
