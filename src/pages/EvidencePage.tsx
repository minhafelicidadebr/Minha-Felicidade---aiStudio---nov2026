import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { evidenceItems, modules } from "@/data/courseData";
import { ExternalLink, Search, Filter } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AlegriaFAB } from "@/components/AlegriaCTA";

const levelColors = { alto: "bg-success/10 text-success", médio: "bg-secondary/20 text-secondary-foreground", exploratório: "bg-muted text-muted-foreground" };

export default function EvidencePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeModule = searchParams.get("module");
  const [search, setSearch] = useState("");
  const [activeDriver, setActiveDriver] = useState<string | null>(null);

  const drivers = useMemo(() => [...new Set(evidenceItems.map((e) => e.driver))], []);

  const filtered = useMemo(() => {
    return evidenceItems.filter((e) => {
      const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.authors.toLowerCase().includes(search.toLowerCase()) || e.summary.toLowerCase().includes(search.toLowerCase());
      const matchDriver = !activeDriver || e.driver === activeDriver;
      const matchModule = !activeModule || e.module === activeModule;
      return matchSearch && matchDriver && matchModule;
    });
  }, [search, activeDriver, activeModule]);

  const availableModules = useMemo(() => [...new Set(evidenceItems.map(e => e.module))], []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold mb-2">📊 Evidence Explorer</h1>
          <p className="text-muted-foreground mb-6">Biblioteca científica curada com fontes verificáveis — {evidenceItems.length} itens.</p>

          {/* Module filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={() => setSearchParams({})} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!activeModule ? "gradient-warm text-primary-foreground shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>Todos os módulos</button>
            {availableModules.map(mid => {
              const m = modules.find(mod => mod.id === mid);
              return m ? <button key={mid} onClick={() => setSearchParams({ module: mid })} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeModule === mid ? "gradient-warm text-primary-foreground shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{m.icon} M{m.number}</button> : null;
            })}
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Buscar por título, autor ou tema..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" />
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            <button onClick={() => setActiveDriver(null)} className={`flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${!activeDriver ? "gradient-warm text-primary-foreground shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}><Filter className="w-3 h-3" /> Todos</button>
            {drivers.map((d) => (
              <button key={d} onClick={() => setActiveDriver(activeDriver === d ? null : d)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeDriver === d ? "gradient-warm text-primary-foreground shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{d}</button>
            ))}
          </div>

          <div className="space-y-4">
            {filtered.map((item, i) => {
              const mod = modules.find(m => m.id === item.module);
              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-2xl p-6 border border-border hover:shadow-warm transition-shadow">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${levelColors[item.evidenceLevel]}`}>{item.evidenceLevel}</span>
                        <span className="text-xs text-muted-foreground">{item.driver}</span>
                        {mod && <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-primary/10 text-primary">{mod.icon} M{mod.number}</span>}
                      </div>
                      <h3 className="font-display font-bold text-base leading-snug">{item.title}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{item.authors} ({item.year})</p>
                  <p className="text-sm leading-relaxed mb-3">{item.summary}</p>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"><ExternalLink className="w-3 h-3" /> Acessar fonte</a>
                  {item.doi && <span className="text-xs text-muted-foreground ml-3">DOI: {item.doi}</span>}
                </motion.div>
              );
            })}
            {filtered.length === 0 && <div className="text-center py-16 text-muted-foreground">Nenhuma evidência encontrada para esta busca.</div>}
          </div>
        </motion.div>
      </div>
      <AlegriaFAB moduleId={activeModule ?? undefined} />
      <Footer />
    </div>
  );
}
