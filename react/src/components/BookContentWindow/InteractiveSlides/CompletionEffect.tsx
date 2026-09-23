import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Sparkles, XCircle } from "lucide-react";

interface CompletionEffectProps {
  active: boolean;
  message?: string;
  tone?: "success" | "error" | "neutral";
  onFinished?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}

const PALETTE = ["#2563eb", "#10b981", "#f59e0b", "#0ea5e9", "#14b8a6", "#f97316"];

export const CompletionEffect: React.FC<CompletionEffectProps> = ({
  active,
  message = "Activity Complete! Next Unlocked",
  tone = "success",
  onFinished,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);
    }
  }, []);

  useEffect(() => {
    if (active) {
      if (!reducedMotion) {
        const count = tone === "success" ? 42 : 22;
        const generated: Particle[] = Array.from({ length: count }).map((_, i) => {
          const angle = (i / count) * 2 * Math.PI;
          const distance = 80 + Math.random() * 110;
          return {
            id: i,
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance - 20,
            color: tone === "error" ? ["#38bdf8", "#60a5fa", "#93c5fd", "#64748b"][i % 4] : PALETTE[i % PALETTE.length],
            size: tone === "success" ? 5 + Math.random() * 11 : 5 + Math.random() * 7,
            rotation: Math.random() * 360,
          };
        });
        setParticles(generated);
      }

      const timer = setTimeout(() => {
        onFinished?.();
      }, 1800);

      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [active, onFinished, reducedMotion, tone]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-start justify-center pt-24 sm:pt-28 overflow-hidden">
      {/* Celebration Center Badge */}
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.86, opacity: 0, y: -16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -10 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
          className={`relative mx-4 px-4 py-3 rounded-2xl bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl border shadow-2xl flex items-center gap-3 ${
            tone === "error"
              ? "border-blue-400/40 shadow-blue-500/20"
              : "border-emerald-500/30 shadow-emerald-500/20"
          }`}
        >
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 450, damping: 18, delay: 0.05 }}
            className={`relative w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg ${
              tone === "error"
                ? "bg-gradient-to-tr from-blue-600 to-sky-400 shadow-blue-500/30"
                : "bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-emerald-500/30"
            }`}
          >
            {tone === "error" ? (
              <XCircle className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            )}
          </motion.div>

          <div>
            <div
              className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ${
                tone === "error"
                  ? "text-blue-600 dark:text-blue-300"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{tone === "error" ? "Try Again" : "Great Job!"}</span>
            </div>
            <div className="text-sm md:text-base font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
              {typeof message === "string" ? message : "Activity Complete! Next Unlocked"}
            </div>
          </div>

          <motion.div
            initial={{ scale: 0.7, rotate: -8 }}
            animate={{ scale: [0.9, 1.08, 1], rotate: tone === "error" ? [0, -4, 4, 0] : [0, 5, -3, 0] }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            className={`ml-1 w-11 h-11 rounded-full border-[3px] flex items-center justify-center ${
              tone === "error"
                ? "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-700"
                : "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-700"
            }`}
            aria-hidden="true"
          >
            <div className="relative w-7 h-7 rounded-full bg-amber-300">
              <span className="absolute left-2 top-2 w-1.5 h-1.5 rounded-full bg-slate-900" />
              <span className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-slate-900" />
              {tone === "error" ? (
                <>
                  <span className="absolute left-3 right-3 bottom-2 h-2 border-t-2 border-slate-900 rounded-t-full" />
                  <span className="absolute right-1 top-4 w-1.5 h-3 rounded-full bg-sky-400" />
                </>
              ) : (
                <span className="absolute left-2.5 right-2.5 bottom-2 h-2 border-b-2 border-slate-900 rounded-b-full" />
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {!reducedMotion && (
        <div className="absolute inset-0 flex items-center justify-center">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
              animate={{
                x: p.x,
                y: tone === "success" ? [0, p.y * 0.4, p.y + 180] : p.y,
                scale: [0, 1.2, 0.9, 0],
                opacity: [1, 1, 0.8, 0],
                rotate: tone === "success" ? p.rotation + 720 : p.rotation + 180,
              }}
              transition={{ duration: tone === "success" ? 2.2 : 1.5, ease: [0.25, 1, 0.5, 1] }}
              style={{
                backgroundColor: p.color,
                width: tone === "success" ? p.size * (p.id % 2 === 0 ? 2.2 : 1) : p.size,
                height: tone === "success" ? p.size * (p.id % 2 === 0 ? 0.45 : 1.7) : p.size * 1.4,
                borderRadius: tone === "success" ? "3px" : "999px",
              }}
              className="absolute"
            />
          ))}
        </div>
      )}
    </div>
  );
};
