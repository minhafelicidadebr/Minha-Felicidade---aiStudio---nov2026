import { motion } from "framer-motion";

/** Single source of truth for the AlegrIA avatar image. */
export const ALEGRIA_AVATAR_URL =
    "https://static.wixstatic.com/media/575677_d1cc9ff366794d83a8095092ca1a82fe~mv2.png/v1/fill/w_648,h_648,al_c,lg_1,q_90,enc_avif,quality_auto/avatares%20AI%20(6).png";

interface AlegriaAvatarProps {
    /** Pixel size of the avatar square. */
    size?: number;
    /** Tailwind rounding utility (e.g. "rounded-2xl" or "rounded-full"). */
    radius?: string;
    /** Intensifies the glow + halo (use while AlegrIA is "thinking"). */
    active?: boolean;
    /** Shows a pulsing online status dot. */
    showStatus?: boolean;
    className?: string;
    alt?: string;
}

/**
 * Premium animated presentation of the existing AlegrIA illustration.
 * Pure-code effects (no 3D asset): breathing scale, rotating brand-color halo,
 * soft pulsing glow and a periodic light sweep. Respects prefers-reduced-motion
 * via framer-motion's global reduced-motion handling.
 */
export default function AlegriaAvatar({
    size = 56,
    radius = "rounded-2xl",
    active = false,
    showStatus = false,
    className = "",
    alt = "AlegrIA",
}: AlegriaAvatarProps) {
    return (
        <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
            {/* Rotating brand-color halo */}
            <motion.div
                aria-hidden
                className={`absolute -inset-[3px] ${radius} opacity-70 blur-[5px]`}
                style={{
                    background:
                        "conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--accent)), hsl(var(--primary)))",
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: active ? 6 : 14, repeat: Infinity, ease: "linear" }}
            />

            {/* Soft pulsing glow */}
            <motion.div
                aria-hidden
                className={`absolute -inset-2 ${radius} bg-primary/30 blur-xl`}
                animate={{
                    opacity: active ? [0.45, 0.85, 0.45] : [0.25, 0.5, 0.25],
                    scale: [1, 1.08, 1],
                }}
                transition={{ duration: active ? 2 : 4.5, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Breathing avatar */}
            <motion.div
                className={`relative w-full h-full ${radius} overflow-hidden ring-2 ring-background/60 shadow-warm`}
                animate={{ scale: [1, 1.035, 1] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            >
                <img src={ALEGRIA_AVATAR_URL} alt={alt} className="w-full h-full object-cover" />
                {/* Light sweep */}
                <motion.div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent"
                    initial={{ x: "-130%" }}
                    animate={{ x: "130%" }}
                    transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 2.6, ease: "easeInOut" }}
                />
            </motion.div>

            {showStatus && (
                <span className="absolute -bottom-0.5 -right-0.5 z-10 w-3.5 h-3.5 rounded-full bg-success border-2 border-background">
                    <motion.span
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-success"
                        animate={{ scale: [1, 1.9], opacity: [0.6, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                    />
                </span>
            )}
        </div>
    );
}
