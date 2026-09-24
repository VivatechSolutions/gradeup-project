import React from "react";
import { SlideData, TaskState } from "../types";
import { CheckCircle2, Clock, Lightbulb, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { PlaceholderImage } from "../PlaceholderImage";

interface ThinkSlideProps {
  slide: SlideData;
  taskState: TaskState;
  onSelectOption: (optionId: string) => void;
}

export const ThinkSlide: React.FC<ThinkSlideProps> = ({
  slide,
  taskState,
  onSelectOption,
}) => {
  const selectedOptionId = taskState.selectedOptionIds[0];
  const selectedResolution = selectedOptionId ? slide.resolutions?.[selectedOptionId] : undefined;

  return (
    <div className="flex flex-col text-left space-y-4 max-w-3xl">
      {/* Badge Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-black tracking-wider uppercase w-fit">
        <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
        <span>{slide.badge.label}</span>
      </div>

      {/* Main Question */}
      <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
        {slide.question || slide.title}
      </h2>

      {slide.images?.main && (
        <div className="w-full max-w-md self-center">
          <PlaceholderImage
            src={slide.images.main}
            category="general-science"
            alt={slide.images.caption || slide.question || slide.title}
            aspectRatio="16/9"
            badge="Question visual"
            className="max-h-[190px] bg-white dark:bg-white/5"
            imageClassName="object-contain"
          />
        </div>
      )}

      {/* Interactive Multiple Choice Option Cards */}
      <div className="grid grid-cols-1 gap-2.5 pt-1">
        {slide.options?.map((option, idx) => {
          const isSelected = taskState.selectedOptionIds.includes(option.id);
          const optionLetter = option.label || String.fromCharCode(65 + idx); // A, B, C, D
          const hasSubmitted = taskState.isCompleted;
          const isWrongSelection = hasSubmitted && isSelected && taskState.isCorrect === false;

          return (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.01, x: 2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelectOption(option.id)}
              className={`w-full flex items-center justify-between p-3 md:p-4 rounded-2xl border-2 transition-all text-left shadow-sm ${
                isWrongSelection
                  ? "border-blue-400 dark:border-blue-400 bg-blue-50/80 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 shadow-blue-500/10"
                  : isSelected
                  ? "border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-blue-500/10"
                  : "border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#151f3e] hover:border-blue-300 dark:hover:border-blue-700 text-slate-800 dark:text-slate-200"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                {/* Letter Pill */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm transition-colors ${
                    isWrongSelection
                      ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
                      : isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {optionLetter}
                </div>

                {/* Option Title */}
                {option.imageUrl && (
                  <img
                    src={option.imageUrl}
                    alt=""
                    className="h-10 w-14 shrink-0 rounded-md border border-slate-200 bg-white object-contain dark:border-white/10 dark:bg-white/5"
                  />
                )}
                <span className="min-w-0 text-sm md:text-base font-bold tracking-tight">
                  {option.title}
                  {hasSubmitted && isSelected && option.explanation && (
                    <span className="mt-1 block text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-300">
                      {option.explanation}
                    </span>
                  )}
                </span>
              </div>

              {/* Selection indicator */}
              {isSelected ? (
                isWrongSelection ? (
                  <XCircle className="w-6 h-6 text-blue-500 dark:text-blue-300 shrink-0 stroke-[2.5]" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 stroke-[2.5]" />
                )
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600" />
              )}
            </motion.button>
          );
        })}
      </div>

      {taskState.isCompleted && selectedResolution?.text && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/25 md:grid-cols-[1fr_auto]"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Answer explanation</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-100">{selectedResolution.text}</p>
          </div>
          {selectedResolution.imageUrl && (
            <img
              src={selectedResolution.imageUrl}
              alt="Answer explanation"
              className="h-24 w-full rounded-xl bg-white object-contain md:w-36 dark:bg-white/5"
            />
          )}
        </motion.div>
      )}

      {/* Bottom helper prompt */}
      <div className="flex items-center gap-2 pt-0 text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400">
        <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        <span>
          {taskState.isCompleted
            ? taskState.feedbackMessage || "Your prediction has been saved."
            : "Take a moment and choose your answer."}
        </span>
      </div>
    </div>
  );
};
