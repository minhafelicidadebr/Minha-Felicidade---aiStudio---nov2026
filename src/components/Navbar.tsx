import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import logoIcon from "@/assets/logo-icon.png";
import DarkModeToggle from "@/components/DarkModeToggle";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/alegria", label: "🤖 AlegrIA" },
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
  const location = useLocation();

  useEffect(() => {
    const fetchXp = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from("user_progress").select("xp_earned").eq("user_id", session.user.id);
        if (data) setTotalXp(data.reduce((s, r) => s + (r.xp_earned || 0), 0));
      }
    };
    fetchXp();
  }, [location.pathname]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50" role="navigation" aria-label="Navegação principal">
      <div className="container flex items-center justify-between h-16">
        <Link to="/dashboard" className="flex items-center gap-2.5" aria-label="Ir para Dashboard">
          <img src={logoIcon} alt="Instituto Felicidade Para Todos" className="w-9 h-9 rounded-lg object-contain" />
          <span className="font-display font-bold text-lg hidden sm:inline">Ciência do <span className="text-primary">Bem-Estar</span></span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <Link key={l.href} to={l.href} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${location.pathname === l.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`} aria-current={location.pathname === l.href ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <DarkModeToggle />
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/20 text-secondary-foreground">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-sm font-bold">✨ {totalXp} XP</span>
          </div>
          <button className="lg:hidden p-2" onClick={() => setOpen(!open)} aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div className="lg:hidden bg-background border-b border-border" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className="container py-4 flex flex-col gap-1">
              {links.map((l) => (
                <Link key={l.href} to={l.href} className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${location.pathname === l.href ? "bg-primary/10 text-primary" : "hover:bg-muted"}`} onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
