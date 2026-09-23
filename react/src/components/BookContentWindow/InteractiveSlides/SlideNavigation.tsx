import React from "react";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { motion } from "framer-motion";

interface SlideNavigationProps {
  currentIndex: number;
  totalSlides: number;
  isTaskCompleted: boolean;
  onPrevious: () => void;
  onNext: () => void;
  isNavigating?: boolean;
}

export const SlideNavigation: React.FC<SlideNavigationProps> = ({
  currentIndex,
  totalSlides,
  isTaskCompleted,
  onPrevious,
  onNext,
  isNavigating = false,
}) => {
  const canGoPrevious = currentIndex > 0;
  const isLastSlide = currentIndex >= totalSlides - 1;

  return (
    <nav className="pointer-events-none fixed inset-y-0 left-0 right-0 z-30 flex items-center justify-between px-2 sm:px-4 md:px-5 select-none text-[#071b4d] dark:text-white">
      <motion.button
        whileHover={canGoPrevious ? { scale: 1.08, x: -2 } : {}}
        whileTap={canGoPrevious ? { scale: 0.94 } : {}}
        onClick={onPrevious}
        disabled={!canGoPrevious || isNavigating}
        className={`pointer-events-auto inline-flex h-11 w-11 sm:h-12 sm:w-12 md:h-14 md:w-14 items-center justify-center rounded-full border text-sm md:text-base font-extrabold tracking-wide transition-all shadow-lg ${
          canGoPrevious
            ? "bg-white/82 border-white/80 text-[#071b4d] hover:bg-white shadow-slate-900/10 dark:bg-[#101a3d]/82 dark:border-cyan-200/36 dark:text-cyan-50 dark:shadow-[0_0_28px_rgba(34,211,238,.20),inset_0_1px_0_rgba(255,255,255,.12)] dark:hover:border-cyan-200/62 dark:hover:bg-[#16265a]"
            : "bg-white/45 text-slate-400 border-slate-200/60 cursor-not-allowed shadow-slate-900/5 dark:bg-[#10172f]/55 dark:text-cyan-100/30 dark:border-cyan-200/12"
        }`}
        title="Previous slide"
      >
        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.8]" />
      </motion.button>

      <motion.button
        whileHover={isTaskCompleted ? { scale: 1.08, x: 2 } : {}}
        whileTap={isTaskCompleted ? { scale: 0.94 } : {}}
        onClick={onNext}
        disabled={!isTaskCompleted || isNavigating}
        className={`pointer-events-auto relative inline-flex h-11 w-11 sm:h-12 sm:w-12 md:h-14 md:w-14 items-center justify-center rounded-full border text-sm md:text-base font-extrabold tracking-wide transition-all shadow-xl ${
          isTaskCompleted
            ? "border-amber-100/70 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 hover:from-orange-600 hover:to-amber-500 text-white shadow-orange-400/35 cursor-pointer dark:from-amber-300 dark:via-orange-500 dark:to-fuchsia-500 dark:text-white dark:shadow-[0_0_34px_rgba(249,115,22,.55),inset_0_1px_0_rgba(255,255,255,.24)]"
            : "bg-slate-400/70 text-white/75 border border-white/40 cursor-not-allowed shadow-slate-900/10 dark:bg-[#0f1b3d]/92 dark:text-cyan-50/70 dark:border-cyan-200/28 dark:shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"
        }`}
        title={isTaskCompleted ? "Proceed to next slide" : "Locked: complete task to proceed"}
      >
        {isTaskCompleted ? (
          <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.8]" />
        ) : (
          <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 dark:text-amber-300/85" />
        )}
        <span className="sr-only">{isTaskCompleted ? (isLastSlide ? "Finish Lesson" : "Next") : "Next locked"}</span>
      </motion.button>
    </nav>
  );
};
