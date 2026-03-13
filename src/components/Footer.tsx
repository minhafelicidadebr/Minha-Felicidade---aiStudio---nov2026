import logoIcon from "@/assets/logo-icon.png";
import logoDarkBg from "@/assets/logo-dark-bg.png";

export default function Footer() {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logoIcon} alt="Instituto" className="w-10 h-10 rounded-lg" />
              <img src={logoDarkBg} alt="Instituto Felicidade Para Todos" className="h-8 object-contain" />
            </div>
            <p className="text-sm opacity-70 leading-relaxed">
              Organização de impacto social com a missão de ativar e animar ecossistemas sustentáveis de felicidade humana, socioambiental e organizacional.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-bold text-lg mb-4">Plataforma</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li><a href="/auth" className="hover:opacity-100 transition-opacity">Acessar Curso</a></li>
              <li><a href="#modulos" className="hover:opacity-100 transition-opacity">Módulos</a></li>
              <li><a href="#dinamicas" className="hover:opacity-100 transition-opacity">Dinâmicas</a></li>
              <li><a href="#sobre" className="hover:opacity-100 transition-opacity">Sobre o Instituto</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-lg mb-4">Contato</h4>
            <div className="space-y-2 text-sm opacity-70">
              <p>Impact HUB Brasília - SGAN 601, Lote H</p>
              <p>Edifício Íon, Ala Amarela</p>
              <p>Asa Norte, Brasília/DF - Brasil</p>
              <p className="pt-2">📞 (61) 3550-8779</p>
              <p>🌐 <a href="https://www.felicidadeparatodos.com.br" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 underline">felicidadeparatodos.com.br</a></p>
              <p>📸 <a href="https://instagram.com/felicidadeparatodosbr" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 underline">@felicidadeparatodosbr</a></p>
            </div>
          </div>
        </div>

        <div className="border-t border-background/20 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs opacity-50">
            © 2025 - Instituto Felicidade para Todos. Todos os direitos reservados.
          </p>
          <p className="text-xs opacity-50">
            Fontes auditáveis • WCAG 2.2 • Anti-alucinação • Gamificação com SDT
          </p>
        </div>
      </div>
    </footer>
  );
}
