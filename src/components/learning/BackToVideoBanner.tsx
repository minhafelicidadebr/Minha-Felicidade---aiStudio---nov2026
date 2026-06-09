import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play } from "lucide-react";

/**
 * Sticky banner shown on any activity page when arriving from a video panel.
 * Reads ?back=<encoded path> and offers a one-tap return to the video where the user was.
 */
export default function BackToVideoBanner() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const back = params.get("back");
  const label = params.get("backLabel");
  if (!back) return null;

  let target = back;
  try { target = decodeURIComponent(back); } catch { /* keep as-is */ }

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-16 z-30 mx-auto max-w-3xl mt-2 mb-4 px-3"
    >
      <button
        onClick={() => navigate(target)}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl glass-card border border-primary/30 hover:border-primary/60 hover:shadow-warm transition-all text-left group"
        aria-label="Voltar ao vídeo onde você estava"
      >
        <span className="relative flex items-center justify-center w-9 h-9 rounded-xl gradient-institute text-primary-foreground shadow-warm shrink-0">
          <Play className="w-4 h-4" fill="currentColor" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Continuar de onde parou</p>
          <p className="text-sm font-semibold truncate">
            {label ? decodeURIComponent(label) : "Voltar ao vídeo da aula"}
          </p>
        </div>
        <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-0.5 transition-all" />
      </button>
    </motion.div>
  );
}
