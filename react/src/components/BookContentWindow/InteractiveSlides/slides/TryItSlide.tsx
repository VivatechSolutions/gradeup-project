import React from "react";
import { SlideData, TaskState } from "../types";
import { PlaceholderImage } from "../PlaceholderImage";
import { FlaskConical, ArrowRight, Check, CheckCircle2, Flashlight, FileText, CircleDot, Book, XCircle } from "lucide-react";
import { motion } from "framer-motion";

interface TryItSlideProps {
  slide: SlideData;
  taskState: TaskState;
  onCompleteTask: () => void;
  onSelectOption: (optionId: string) => void;
}

export const TryItSlide: React.FC<TryItSlideProps> = ({
  slide,
  taskState,
  onCompleteTask,
  onSelectOption,
}) => {
  const getItemIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("torch") || lower.includes("light")) return <Flashlight className="w-5 h-5 text-blue-600" />;
    if (lower.includes("paper") || lower.includes("sheet")) return <FileText className="w-5 h-5 text-sky-600" />;
    if (lower.includes("coin") || lower.includes("object")) return <CircleDot className="w-5 h-5 text-amber-500" />;
    return <Book className="w-5 h-5 text-emerald-600" />;
  };

  const items = slide.images?.items || [];
  const instructions = slide.instructions || [];
  const hasVisual = Boolean(slide.images?.diagram);
  const hasOptions = Boolean(slide.options?.length);

  return (
    <div className="flex flex-col text-left space-y-6 max-w-4xl">
      {/* Badge Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-black tracking-wider uppercase w-fit">
        <FlaskConical className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>{slide.badge.label}</span>
      </div>

      {/* Main Title & Subtitle */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-snug">
          {slide.title}
        </h2>
        <p className="mt-1 text-sm md:text-base font-semibold text-blue-600 dark:text-blue-400">
          {slide.subtitle || "Use simple objects from your home to see inertia in action!"}
        </p>
      </div>

      {items.length > 0 && <div>
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Things you can use:
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-2xl bg-white dark:bg-[#151f3e] border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col items-center justify-center text-center space-y-1.5"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {getItemIcon(item.name)}
              </div>
              <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                {item.name}
              </span>
              {item.subtext && (
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {item.subtext}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>}

      {/* Two columns: Instructions List + Experiment Visual Preview */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
        {/* Left: Numbered Step Instructions */}
        <div className={`${hasVisual ? "md:col-span-7" : "md:col-span-12"} space-y-3`}>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Follow these steps:
          </h4>
          <ol className="space-y-2.5">
            {instructions.map((step, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5"
              >
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 pt-0.5">
                  {step}
                </span>
              </li>
            ))}
          </ol>

          {!hasOptions && <div className="pt-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onCompleteTask()}
              className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl text-xs md:text-sm font-black tracking-wide transition-all shadow-md ${
                taskState.isCompleted
                  ? "bg-emerald-600 text-white shadow-emerald-600/25"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30"
              }`}
            >
              {taskState.isCompleted ? (
                <>
                  <span>Activity Complete!</span>
                  <Check className="w-4 h-4 stroke-[3]" />
                </>
              ) : (
                <>
                  <span>{slide.task.buttonLabel || "Try It Now"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>}
        </div>

        {hasVisual && <div className="md:col-span-5">
          <PlaceholderImage
            src={slide.images?.diagram}
            category="general-science"
            alt={slide.images?.caption || slide.title}
            aspectRatio="4/3"
            className="border-2 border-slate-200/90 dark:border-white/10 shadow-lg"
          />
          {slide.images?.caption && (
            <p className="mt-2 rounded-xl bg-slate-50/80 px-3 py-2 text-xs font-bold leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {slide.images.caption}
            </p>
          )}
        </div>}
      </div>

      {hasOptions && (
        <div className="space-y-3 rounded-2xl border border-cyan-300/30 bg-cyan-400/5 p-4">
          <h4 className="text-sm font-extrabold text-white">{slide.question || slide.callout?.text}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {slide.options?.map((option) => {
              const isSelected = taskState.selectedOptionIds.includes(option.id);
              const isWrong = taskState.isCompleted && isSelected && taskState.isCorrect === false;
              const isCorrect = taskState.isCompleted && (option.isCorrect || taskState.revealedCorrectOptionId === option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={taskState.isCompleted || taskState.isFeedbackPlaying}
                  onClick={() => onSelectOption(option.id)}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                    isWrong
                      ? "border-rose-400/70 bg-rose-500/10 text-rose-100"
                      : isCorrect
                        ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-100"
                        : "border-white/15 bg-white/5 text-slate-200 hover:border-cyan-300/60"
                  }`}
                >
                  {isWrong ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> : isCorrect ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white/10 text-[11px]">{option.label}</span>}
                  <span>
                    {option.title}
                    {taskState.isCompleted && isSelected && option.explanation && (
                      <span className="mt-1 block text-xs font-semibold text-slate-300">{option.explanation}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!hasOptions && slide.callout?.text && (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-4 shadow-sm dark:border-emerald-800/40 dark:bg-emerald-950/25">
          <div className="mb-1 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            {slide.callout.title || "Observation"}
          </div>
          <p className="text-xs md:text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200">
            {slide.callout.text}
          </p>
        </div>
      )}

      {taskState.isCompleted && slide.completionNarration?.some((cue) => cue.text) && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl border border-emerald-300/40 bg-emerald-400/10 p-4 text-sm font-bold leading-relaxed text-emerald-50"
        >
          {slide.completionNarration.find((cue) => cue.text)?.text}
        </motion.div>
      )}
    </div>
  );
};
