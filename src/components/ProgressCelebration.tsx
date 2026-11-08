import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

const CELEBRATIONS = [
  { threshold: 25, icon: "🌱", title: "Explorador!", message: "Você completou 25% — continue assim!", color: "from-green-500/20 to-emerald-500/20" },
  { threshold: 50, icon: "🔥", title: "Imparável!", message: "Metade do caminho! Seu cérebro agradece!", color: "from-orange-500/20 to-amber-500/20" },
  { threshold: 75, icon: "⭐", title: "Quase lá!", message: "75% concluído — você é incrível!", color: "from-yellow-500/20 to-amber-500/20" },
  { threshold: 100, icon: "🏆", title: "Mestre!", message: "100% completo — parabéns, campeão!", color: "from-primary/20 to-secondary/20" },
];

const NEURO_PHRASES = [
  "Neuroplasticidade em ação — cada prática remodela seu cérebro!",
  "Dopamina liberada! Seu sistema de recompensa celebra com você.",
  "A repetição espaçada fortalece conexões sinápticas duradouras.",
  "Flow state alcançado — concentração máxima ativada!",
  "Seu hipocampo está consolidando novas memórias agora.",
];

interface Props {
  progress: number;
  show: boolean;
  onClose: () => void;
  xp?: number;
}

export function ProgressCelebration({ progress, show, onClose, xp }: Props) {
  const celebration = CELEBRATIONS.find(c => progress >= c.threshold) || CELEBRATIONS[0];
  const phrase = NEURO_PHRASES[Math.floor(Math.random() * NEURO_PHRASES.length)];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 15 }}
            onClick={e => e.stopPropagation()}
            className={`relative p-8 rounded-3xl bg-gradient-to-br ${celebration.color} border border-border/30 backdrop-blur-xl max-w-sm mx-4 text-center overflow-hidden`}
          >
            {/* Particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary/40"
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{
                  x: [0, (i % 2 === 0 ? 1 : -1) * (60 + i * 20)],
                  y: [0, -(80 + i * 15)],
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 1.5, delay: i * 0.1, repeat: Infinity, repeatDelay: 2 }}
                style={{ left: "50%", top: "40%" }}
              />
            ))}

            <motion.span
              className="text-6xl block mb-4"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {celebration.icon}
            </motion.span>
            <h3 className="font-display font-bold text-2xl mb-2">{celebration.title}</h3>
            <p className="text-sm text-foreground/80 mb-3">{celebration.message}</p>
            {xp && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-sm mb-3"
              >
                <Zap className="w-4 h-4" /> +{xp} XP
              </motion.div>
            )}
            <p className="text-xs text-muted-foreground italic mt-2">💡 {phrase}</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors">
              Continuar aprendendo →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
