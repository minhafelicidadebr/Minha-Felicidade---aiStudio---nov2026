import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ModulesGrid from "@/components/ModulesGrid";
import DynamicsShowcase from "@/components/DynamicsShowcase";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <HeroSection />
        <ModulesGrid />
        <DynamicsShowcase />

        {/* Footer */}
        <footer className="py-12 border-t border-border">
          <div className="container text-center">
            <p className="text-sm text-muted-foreground">
              Felicidade.lab — Plataforma de aprendizagem baseada em evidências científicas
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Fontes auditáveis • WCAG 2.2 • Anti-alucinação • Gamificação com SDT
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
