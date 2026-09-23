import React from "react";
import { SlideData, TaskState } from "../types";
import { PlaceholderImage } from "../PlaceholderImage";
import { Target, ArrowRight, Check, Sparkles, Scale, FastForward, Disc, Ban } from "lucide-react";
import { motion } from "framer-motion";

interface ApplySlideProps {
  slide: SlideData;
  taskState: TaskState;
  onToggleOption: (optionId: string) => void;
  onSubmitAnswer: () => void;
}

export const ApplySlide: React.FC<ApplySlideProps> = ({
  slide,
  taskState,
  onToggleOption,
  onSubmitAnswer,
}) => {
  const getOptionIcon = (idx: number, title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes("mass")) return <Scale className="w-5 h-5 text-sky-500" />;
    if (lower.includes("force") || lower.includes("push")) return <FastForward className="w-5 h-5 text-blue-600" />;
    if (lower.includes("friction") || lower.includes("smooth")) return <Disc className="w-5 h-5 text-emerald-500" />;
    if (lower.includes("remove")) return <Ban className="w-5 h-5 text-red-500" />;
    return <Disc className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="flex flex-col text-left space-y-4 max-w-4xl">
      {/* Badge Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-black tracking-wider uppercase w-fit">
        <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span>{slide.badge.label}</span>
      </div>

      {/* Main Heading */}
      <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
        {slide.title}
      </h2>

      {/* 2 Columns: Option Cards Grid + Toy Car Visual */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-1">
        {/* Left: 4 Option Cards in a 2x2 Grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {slide.options?.map((option, idx) => {
            const isSelected = taskState.selectedOptionIds.includes(option.id);

            return (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onToggleOption(option.id)}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between min-h-[82px] shadow-sm ${
                  isSelected
                    ? "border-blue-600 dark:border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 shadow-blue-500/10"
                    : "border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#151f3e] hover:border-blue-300 dark:hover:border-blue-700"
                }`}
              >
                <div className="flex items-start justify-between w-full mb-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {getOptionIcon(idx, option.title)}
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
                <span className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">
                  {option.title}
                  {taskState.isCompleted && option.explanation && (
                    <span className="mt-1 block text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-slate-300">
                      {option.explanation}
                    </span>
                  )}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Right: Toy Car Illustration */}
        <div className="lg:col-span-5">
          <PlaceholderImage
            src={slide.images?.main}
            category="toy-car"
            alt="Toy sports car aerodynamics"
            aspectRatio="4/3"
            className="shadow-lg border-2 border-slate-200/90 dark:border-white/10"
          />
          {slide.images?.caption && (
            <p className="mt-2 rounded-xl bg-slate-50/80 px-3 py-2 text-xs font-bold leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {slide.images.caption}
            </p>
          )}
        </div>
      </div>

      {slide.callout?.text && (
        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/80 p-4 shadow-sm dark:border-blue-800/40 dark:bg-blue-950/25">
          <div className="mb-1 text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">
            {slide.callout.title || "Hint"}
          </div>
          <p className="text-xs md:text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200">
            {slide.callout.text}
          </p>
        </div>
      )}

      {/* Submit Button & Feedback state */}
      <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSubmitAnswer}
          disabled={taskState.selectedOptionIds.length === 0}
          className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs md:text-sm font-black tracking-wide shadow-md transition-all ${
            taskState.isCompleted
              ? "bg-emerald-600 text-white shadow-emerald-600/25"
              : taskState.selectedOptionIds.length === 0
              ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30"
          }`}
        >
          {taskState.isCompleted ? (
            <>
              <span>Answer Submitted!</span>
              <Check className="w-4 h-4 stroke-[3]" />
            </>
          ) : (
            <>
              <span>{slide.task.buttonLabel || "Submit Answer"}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>

        {/* Feedback pill */}
        {taskState.feedbackMessage && (
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs md:text-sm font-bold shadow-sm ${
              taskState.isCorrect === false
                ? "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300"
                : "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
            }`}
          >
            <Sparkles
              className={`w-4 h-4 shrink-0 ${
                taskState.isCorrect === false
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            />
            <span>{taskState.feedbackMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
