import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Sparkles } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
        <img src={logoIcon} alt="Instituto" className="w-16 h-16 rounded-2xl mx-auto mb-6 shadow-warm" />
        <div className="text-8xl font-display font-bold text-gradient mb-4">404</div>
        <h1 className="text-2xl font-display font-bold mb-2">Página não encontrada</h1>
        <p className="text-muted-foreground mb-8">
          Parece que essa rota não existe. Que tal explorar a ciência do bem-estar?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl gradient-institute text-primary-foreground font-semibold text-sm shadow-warm hover:shadow-glow transition-all">
            <Home className="w-4 h-4" /> Página Inicial
          </Link>
          <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-card border border-border font-semibold text-sm hover:shadow-warm transition-all">
            <Sparkles className="w-4 h-4" /> Meu Dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
