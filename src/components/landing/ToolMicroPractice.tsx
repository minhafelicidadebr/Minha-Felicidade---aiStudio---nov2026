import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

/**
 * Micro-prática de ~60s executável DENTRO do card da landing.
 * Cada ferramenta expõe o seu gesto essencial (o "verbo" da prática), não uma
 * descrição dela. Ao concluir, chama `onDone` para alimentar o ritual de 7 dias.
 */
export default function ToolMicroPractice({
    toolId,
    onDone,
}: {
    toolId: string;
    onDone: () => void;
}) {
    const [done, setDone] = useState(false);
    const complete = () => {
        if (done) return;
        setDone(true);
        onDone();
    };

    return (
        <div className="mt-4 rounded-2xl border border-border/60 bg-background/70 backdrop-blur-sm p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Micro-prática de 60 segundos
            </p>
            {done ? (
                <div className="flex items-center gap-2 text-sm font-semibold text-success">
                    <Check className="w-4 h-4" /> Prática registrada — isso já conta.
                </div>
            ) : (
                <Practice toolId={toolId} complete={complete} />
            )}
        </div>
    );
}

function Practice({ toolId, complete }: { toolId: string; complete: () => void }) {
    switch (toolId) {
        case "breathing":
            return <Breathing complete={complete} />;
        case "lifewheel":
            return <LifeWheel complete={complete} />;
        case "gratitude":
            return <Gratitude complete={complete} />;
        case "memory":
            return <MemoryPairs complete={complete} />;
        case "mindmap":
            return <MindMap complete={complete} />;
        case "emotions":
            return <Emotions complete={complete} />;
        case "challenge21":
            return <Challenge complete={complete} />;
        case "hypothesis":
            return <Hypothesis complete={complete} />;
        default:
            return <Missions complete={complete} />;
    }
}

const btn =
    "px-3 py-2 rounded-xl text-xs font-bold gradient-institute text-primary-foreground shadow-warm hover:shadow-glow transition-all disabled:opacity-40 disabled:shadow-none";
const chip =
    "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-border/60 bg-card hover:border-primary/50 transition-colors";
const chipOn = "px-2.5 py-1.5 rounded-lg text-[11px] font-bold gradient-institute text-primary-foreground";

/* 1. Respiração — pacer 4-4-4 real, conclui após 1 ciclo completo */
function Breathing({ complete }: { complete: () => void }) {
    const phases = ["Inspire", "Segure", "Expire"] as const;
    const [i, setI] = useState(0);
    const [cycles, setCycles] = useState(0);
    useEffect(() => {
        const t = setTimeout(() => {
            setI((p) => {
                if (p === phases.length - 1) setCycles((c) => c + 1);
                return (p + 1) % phases.length;
            });
        }, 4000);
        return () => clearTimeout(t);
    }, [i]);
    return (
        <div className="flex items-center gap-4">
            <motion.div
                className="w-16 h-16 rounded-full gradient-institute opacity-80"
                animate={{ scale: i === 0 ? 1.25 : i === 1 ? 1.25 : 0.75 }}
                transition={{ duration: 4, ease: "easeInOut" }}
            />
            <div className="flex-1">
                <p className="text-sm font-display font-bold">{phases[i]}…</p>
                <p className="text-[11px] text-muted-foreground mb-2">Ciclos completos: {cycles}</p>
                <button className={btn} onClick={complete} disabled={cycles < 1}>
                    {cycles < 1 ? "Complete 1 ciclo" : "Concluir prática"}
                </button>
            </div>
        </div>
    );
}

/* 2. Roda da Vida — uma dimensão, nota agora */
function LifeWheel({ complete }: { complete: () => void }) {
    const [v, setV] = useState(5);
    return (
        <div>
            <p className="text-xs mb-2">De 0 a 10, como está sua <strong>energia</strong> hoje?</p>
            <input
                type="range" min={0} max={10} value={v}
                onChange={(e) => setV(Number(e.target.value))}
                className="w-full accent-primary mb-2" aria-label="Nota de energia"
            />
            <p className="text-[11px] text-muted-foreground mb-3">
                Nota {v}/10 — {v <= 3 ? "domínio em alerta: começa por aqui." : v <= 7 ? "zona de melhoria realista." : "força de apoio para os outros domínios."}
            </p>
            <button className={btn} onClick={complete}>Registrar nota</button>
        </div>
    );
}

/* 3. Gratidão — uma linha, agora */
function Gratitude({ complete }: { complete: () => void }) {
    const [txt, setTxt] = useState("");
    return (
        <div>
            <p className="text-xs mb-2">Uma coisa específica de hoje que valeu a pena:</p>
            <input
                value={txt} onChange={(e) => setTxt(e.target.value)}
                placeholder="Ex.: minha amiga me esperou no portão"
                className="w-full mb-3 px-3 py-2 rounded-xl bg-card border border-border text-xs outline-none focus:border-primary"
            />
            <button className={btn} onClick={complete} disabled={txt.trim().length < 4}>Guardar</button>
        </div>
    );
}

/* 4. Memória — um par conceito/definição */
function MemoryPairs({ complete }: { complete: () => void }) {
    const pairs = [
        { c: "Adaptação hedônica", d: "O prazer novo vira rotina" },
        { c: "Saboreio", d: "Esticar de propósito o momento bom" },
    ];
    const [pick, setPick] = useState<string | null>(null);
    const [ok, setOk] = useState<string[]>([]);
    const match = (d: string) => {
        const right = pairs.find((p) => p.c === pick)?.d === d;
        if (right && pick) setOk((s) => [...s, pick]);
        setPick(null);
    };
    return (
        <div>
            <p className="text-xs mb-2">Ligue o conceito à definição:</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
                {pairs.map((p) => (
                    <button key={p.c} className={ok.includes(p.c) ? chipOn : pick === p.c ? chipOn : chip}
                        onClick={() => setPick(p.c)} disabled={ok.includes(p.c)}>{p.c}</button>
                ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
                {pairs.map((p) => (
                    <button key={p.d} className={chip} onClick={() => match(p.d)} disabled={!pick}>{p.d}</button>
                ))}
            </div>
            <button className={btn} onClick={complete} disabled={ok.length < 1}>Concluir</button>
        </div>
    );
}

/* 5. Mapa Mental — expandir um nó */
function MindMap({ complete }: { complete: () => void }) {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <button className={chip + " mb-2"} onClick={() => setOpen((o) => !o)}>
                Bem-estar {open ? "−" : "+"}
            </button>
            {open && (
                <motion.ul initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] text-muted-foreground space-y-1 mb-3 pl-3 border-l border-border">
                    <li>Relações que sustentam</li>
                    <li>Sentido e propósito</li>
                    <li>Corpo e sono</li>
                </motion.ul>
            )}
            <button className={btn} onClick={complete} disabled={!open}>Concluir</button>
        </div>
    );
}

/* 6. Emoções — nomear reduz ativação */
function Emotions({ complete }: { complete: () => void }) {
    const opts = ["Calma", "Tensão", "Alegria", "Tristeza", "Raiva", "Esperança"];
    const [sel, setSel] = useState<string | null>(null);
    return (
        <div>
            <p className="text-xs mb-2">Nomeie o que você sente agora:</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
                {opts.map((o) => (
                    <button key={o} className={sel === o ? chipOn : chip} onClick={() => setSel(o)}>{o}</button>
                ))}
            </div>
            <button className={btn} onClick={complete} disabled={!sel}>Registrar</button>
        </div>
    );
}

/* 7. Desafio 21 dias — menor passo possível */
function Challenge({ complete }: { complete: () => void }) {
    const acts = ["Mandar uma mensagem de agradecimento", "Sair 5 min ao ar livre", "Dormir 30 min mais cedo"];
    const [sel, setSel] = useState<string | null>(null);
    return (
        <div>
            <p className="text-xs mb-2">Escolha a micro-ação de hoje:</p>
            <div className="flex flex-col gap-1.5 mb-3">
                {acts.map((a) => (
                    <button key={a} className={sel === a ? chipOn + " text-left" : chip + " text-left"} onClick={() => setSel(a)}>{a}</button>
                ))}
            </div>
            <button className={btn} onClick={complete} disabled={!sel}>Assumir compromisso</button>
        </div>
    );
}

/* 8. Lab de hipóteses — se-então */
function Hypothesis({ complete }: { complete: () => void }) {
    const [a, setA] = useState("");
    const [b, setB] = useState("");
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
                <span className="font-bold">Se eu</span>
                <input value={a} onChange={(e) => setA(e.target.value)} placeholder="dormir 8h" className="flex-1 px-2 py-1.5 rounded-lg bg-card border border-border outline-none focus:border-primary" />
            </div>
            <div className="flex items-center gap-2 text-xs">
                <span className="font-bold">então</span>
                <input value={b} onChange={(e) => setB(e.target.value)} placeholder="meu humor melhora" className="flex-1 px-2 py-1.5 rounded-lg bg-card border border-border outline-none focus:border-primary" />
            </div>
            <button className={btn} onClick={complete} disabled={a.length < 3 || b.length < 3}>Testar por 7 dias</button>
        </div>
    );
}

/* 9. Missões sociais — escolher o ato */
function Missions({ complete }: { complete: () => void }) {
    const ms = ["Elogiar alguém de verdade", "Ajudar em casa sem pedirem", "Incluir quem está sozinho"];
    const [sel, setSel] = useState<string | null>(null);
    return (
        <div>
            <p className="text-xs mb-2">Qual ato você faz até amanhã?</p>
            <div className="flex flex-col gap-1.5 mb-3">
                {ms.map((m) => (
                    <button key={m} className={sel === m ? chipOn + " text-left" : chip + " text-left"} onClick={() => setSel(m)}>{m}</button>
                ))}
            </div>
            <button className={btn} onClick={complete} disabled={!sel}>Aceitar missão</button>
        </div>
    );
}
