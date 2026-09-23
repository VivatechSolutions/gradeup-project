import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Award, CheckCircle2, Rocket, Zap } from "lucide-react";
import { PlaceholderImage } from "../PlaceholderImage";
import { SlideData, TaskState } from "../types";

interface MasterySlideProps {
  slide: SlideData;
  taskState: TaskState;
  onCompleteTask?: () => void;
  onFinishLesson?: () => void;
}

export const MasterySlide: React.FC<MasterySlideProps> = ({
  slide,
  taskState,
  onCompleteTask,
  onFinishLesson,
}) => {
  const isNextConcept = slide.type === "next-concept";

  const handleAction = () => {
    if (isNextConcept) {
      onFinishLesson?.();
      return;
    }

    onCompleteTask?.();
  };

  return (
    <div className="flex flex-col lg:flex-row items-center gap-8 md:gap-12 min-h-[420px]">
      <div className="flex-1 flex flex-col justify-center text-left space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-black tracking-wider uppercase w-fit">
          <Rocket className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{slide.badge.label}</span>
        </div>

        <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">
          {slide.title}
        </h2>

        <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-xl">
          {slide.description ||
            "Now that you understand inertia, let's explore how force, mass and acceleration are connected in Newton's Second Law."}
        </p>

        {slide.takeaway?.text && (
          <div className="max-w-xl rounded-2xl border border-blue-200/80 bg-blue-50/80 p-4 shadow-sm dark:border-blue-800/40 dark:bg-blue-950/25">
            <div className="mb-1 text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">
              {slide.takeaway.label || "Summary"}
            </div>
            <p className="text-xs md:text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200">
              {slide.takeaway.text}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 pt-1 max-w-md">
          <div className="p-3 rounded-2xl bg-white dark:bg-[#151f3e] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col items-center text-center">
            <Award className="w-5 h-5 text-amber-500 mb-1" />
            <span className="text-sm font-black text-slate-900 dark:text-white">+150 XP</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Mastery</span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-[#151f3e] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col items-center text-center">
            <Zap className="w-5 h-5 text-blue-500 mb-1" />
            <span className="text-sm font-black text-slate-900 dark:text-white">100%</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Accuracy</span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-[#151f3e] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col items-center text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1" />
            <span className="text-sm font-black text-slate-900 dark:text-white">Complete</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Unit 1</span>
          </div>
        </div>

        <div className="pt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAction}
            className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm md:text-base tracking-wide text-white shadow-xl transition-all ${
              taskState.isCompleted && !isNextConcept
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25"
                : "bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 shadow-blue-600/30"
            }`}
          >
            <span>
              {taskState.isCompleted && !isNextConcept
                ? slide.task.completedButtonLabel || "Mastery Unlocked"
                : slide.task.buttonLabel || "Start Next Lesson"}
            </span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      <div className="w-full lg:w-[48%] shrink-0">
        <PlaceholderImage
          src={slide.images?.main}
          category="rocket-launch"
          alt="Rocket launching into the sky"
          aspectRatio="16/9"
          className="shadow-2xl shadow-blue-900/10 dark:shadow-black/40 border-2 border-slate-200/80 dark:border-white/10"
        />
        {slide.images?.caption && (
          <p className="mt-2 rounded-xl bg-slate-50/80 px-3 py-2 text-xs font-bold leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-300">
            {slide.images.caption}
          </p>
        )}
      </div>
    </div>
  );
};
