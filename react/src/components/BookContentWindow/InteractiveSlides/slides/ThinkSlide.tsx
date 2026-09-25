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
  const isHookMcq = slide.phase === "hook";
  const selectedOptionId = taskState.selectedOptionIds[0];
  const feedbackOptionId = taskState.revealedCorrectOptionId || selectedOptionId;
  const selectedResolution = feedbackOptionId ? slide.resolutions?.[feedbackOptionId] : undefined;

  return (
    <div className={isHookMcq
      ? "grid w-full max-w-6xl grid-cols-1 gap-4 text-left lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)] lg:grid-rows-[auto_auto_1fr_auto] lg:gap-x-8"
      : "flex max-w-3xl flex-col space-y-4 text-left"
    }>
      {/* Badge Pill */}
      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50 px-3.5 py-1.5 text-xs font-black uppercase text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/60 dark:text-blue-300 lg:col-start-1">
        <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
        <span>{slide.badge.label}</span>
      </div>

      {/* Main Question */}
      <h2 className={`text-xl font-extrabold leading-snug text-slate-900 dark:text-white md:text-2xl ${isHookMcq ? "lg:col-start-1" : ""}`}>
        {slide.question || slide.title}
      </h2>

      {slide.images?.main && (
        <div className={isHookMcq
          ? "flex w-full self-center justify-center lg:col-start-2 lg:row-start-1 lg:row-span-4"
          : "w-full max-w-md self-center"
        }>
          <PlaceholderImage
            src={slide.images.main}
            category="general-science"
            alt={slide.images.caption || slide.question || slide.title}
            aspectRatio={isHookMcq ? "auto" : "16/9"}
            badge="Question visual"
            className={isHookMcq
              ? "w-[min(clamp(320px,31vw,500px),56vh)] max-w-full bg-white dark:bg-white/5"
              : "max-h-[190px] bg-white dark:bg-white/5"
            }
            imageClassName="object-contain"
          />
        </div>
      )}

      {/* Interactive Multiple Choice Option Cards */}
      <div className={`grid grid-cols-1 gap-2.5 pt-1 ${isHookMcq ? "lg:col-start-1" : ""}`}>
        {slide.options?.map((option, idx) => {
          const isSelected = taskState.selectedOptionIds.includes(option.id);
          const optionLetter = option.label || String.fromCharCode(65 + idx); // A, B, C, D
          const hasSubmitted = taskState.isCompleted;
          const isWrongSelection = hasSubmitted && isSelected && taskState.isCorrect === false;
          const isRevealedCorrect = taskState.revealedCorrectOptionId === option.id;

          return (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.01, x: 2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelectOption(option.id)}
              disabled={taskState.isCompleted || taskState.isFeedbackPlaying}
              className={`w-full flex items-center justify-between p-3 md:p-4 rounded-2xl border-2 transition-all text-left shadow-sm disabled:cursor-default ${
                isWrongSelection
                  ? "border-rose-400 bg-rose-50/80 text-rose-900 shadow-rose-500/10 dark:border-rose-400 dark:bg-rose-950/40 dark:text-rose-100"
                  : isRevealedCorrect || (isSelected && taskState.isCorrect)
                  ? "border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-emerald-500/10 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100"
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
                      ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                      : isRevealedCorrect || (isSelected && taskState.isCorrect)
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
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
                  {hasSubmitted && (isSelected || isRevealedCorrect) && option.explanation && (
                    <span className="mt-1 block text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-300">
                      {option.explanation}
                    </span>
                  )}
                </span>
              </div>

              {/* Selection indicator */}
              {isSelected || isRevealedCorrect ? (
                isWrongSelection ? (
                  <XCircle className="h-6 w-6 shrink-0 stroke-[2.5] text-rose-500 dark:text-rose-300" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 shrink-0 stroke-[2.5] text-emerald-600 dark:text-emerald-400" />
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
        className={`grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/25 md:grid-cols-[1fr_auto] ${isHookMcq ? "lg:col-start-1" : ""}`}
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

      {taskState.isCompleted && slide.completionNarration?.some((cue) => cue.text) && (
        <motion.div
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          className={`rounded-2xl border border-cyan-300/35 bg-cyan-400/10 p-4 text-sm font-bold leading-relaxed text-cyan-50 ${isHookMcq ? "lg:col-start-1" : ""}`}
        >
          {slide.completionNarration.find((cue) => cue.text)?.text}
        </motion.div>
      )}

      {/* Bottom helper prompt */}
      <div className={`flex items-center gap-2 pt-0 text-xs font-semibold text-slate-500 dark:text-slate-400 md:text-sm ${isHookMcq ? "lg:col-start-1" : ""}`}>
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
