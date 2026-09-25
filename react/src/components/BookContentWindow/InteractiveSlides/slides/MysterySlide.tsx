import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, HelpCircle, Search, X } from "lucide-react";
import { PlaceholderImage } from "../PlaceholderImage";
import { SlideData, TaskState } from "../types";

interface MysterySlideProps {
  slide: SlideData;
  taskState: TaskState;
  onSelectOption: (optionId: string) => void;
}

export const MysterySlide: React.FC<MysterySlideProps> = ({
  slide,
  taskState,
  onSelectOption,
}) => {
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);
  const [canCloseFeedback, setCanCloseFeedback] = useState(false);
  const selectedTheory = taskState.selectedOptionIds[0] || null;

  const clues = slide.clues || [
    { id: "1", number: 1, text: "The bat hit the ball." },
    { id: "2", number: 2, text: "The ball changed direction." },
    { id: "3", number: 3, text: "An unbalanced force was applied." },
    { id: "4", number: 4, text: "The ball kept moving until another force slowed it." },
  ];

  const defaultTheories = [
    {
      id: "t1",
      title: "The ball moves on its own without any outside influence.",
      isCorrect: false,
    },
    {
      id: "t2",
      title: "The bat applied a contact force, overcoming the ball's inertia and changing its velocity.",
      isCorrect: true,
    },
    {
      id: "t3",
      title: "Gravity stopped working for a few seconds.",
      isCorrect: false,
    },
  ];
  const theories = slide.options?.length ? slide.options : defaultTheories;

  const handleConfirmTheory = (theoryId: string) => {
    if (taskState.isCompleted) return;
    onSelectOption(theoryId);
  };

  const selectedOption = theories.find((theory) => theory.id === selectedTheory);

  useEffect(() => {
    if (!isTheoryOpen || !taskState.isCompleted || taskState.isFeedbackPlaying) {
      setCanCloseFeedback(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setCanCloseFeedback(true), 2500);
    return () => window.clearTimeout(timer);
  }, [isTheoryOpen, taskState.isCompleted, taskState.isFeedbackPlaying, selectedTheory]);

  return (
    <div className="flex min-w-0 max-w-5xl flex-col space-y-5 text-left">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-black tracking-wider uppercase w-fit">
        <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span>{slide.badge.label}</span>
      </div>

      <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-snug">
        {slide.title}
      </h2>

      {slide.description && (
        <p className="max-w-3xl text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
          {slide.description}
        </p>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-5 pt-2 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 lg:col-span-7">
          <PlaceholderImage
            src={slide.images?.main}
            category="cricket-ball"
            alt="Cricket bat striking a ball"
            aspectRatio="16/9"
            className="w-full max-w-full shadow-lg border-2 border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/5"
            imageClassName="object-contain"
          />
          {slide.images?.caption && (
            <p className="mt-2 rounded-xl bg-slate-50/80 px-3 py-2 text-xs font-bold leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {slide.images.caption}
            </p>
          )}
        </div>

        <div className="min-w-0 lg:col-span-5 p-5 rounded-2xl bg-gradient-to-br from-blue-50/70 to-sky-50/40 dark:from-blue-950/30 dark:to-sky-950/20 border border-blue-200/80 dark:border-blue-800/40 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Clues</span>
            </h4>

            <ol className="space-y-2.5">
              {clues.map((clue) => (
                <li key={clue.id} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-blue-600/15 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {clue.number}
                  </span>
                  <span className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                    {clue.text}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="pt-4 mt-4 border-t border-blue-200/60 dark:border-blue-800/40">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setCanCloseFeedback(false);
                setIsTheoryOpen(true);
              }}
              className={`w-full py-3 px-4 rounded-xl text-xs md:text-sm font-black tracking-wide flex items-center justify-center gap-2 transition-all shadow-md ${
                taskState.isCompleted
                  ? "bg-emerald-600 text-white shadow-emerald-600/20"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25"
              }`}
            >
              {taskState.isCompleted ? (
                <>
                  <span>Mystery Solved!</span>
                  <Check className="w-4 h-4 stroke-[3]" />
                </>
              ) : (
                <>
                  <span>{slide.task.buttonLabel || "What's Your Theory?"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {taskState.isCompleted && slide.takeaway?.text && (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-4 shadow-sm dark:border-emerald-800/40 dark:bg-emerald-950/25">
          <div className="mb-1 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            {slide.takeaway.label || "Reveal"}
          </div>
          <p className="text-xs md:text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200">
            {selectedOption?.explanation || slide.takeaway.text}
          </p>
        </div>
      )}

      <AnimatePresence>
        {isTheoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-[#151f3e] border border-slate-200 dark:border-white/10 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Select Your Hypothesis
                  </h3>
                </div>
                <button
                  onClick={() => setIsTheoryOpen(false)}
                  disabled={taskState.isCompleted && !canCloseFeedback}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-slate-200 disabled:cursor-wait disabled:opacity-40"
                  aria-label="Close hypothesis picker"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {theories.map((theory) => (
                  <button
                    key={theory.id}
                    onClick={() => handleConfirmTheory(theory.id)}
                    disabled={taskState.isCompleted}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3 ${
                      selectedTheory === theory.id
                        ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/50"
                        : "border-slate-200 dark:border-white/10 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/30"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                        selectedTheory === theory.id
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {selectedTheory === theory.id && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">
                      {theory.title}
                      {selectedTheory === theory.id && theory.explanation && (
                        <span className="mt-1 block text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-slate-300">
                          {theory.explanation}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>

              {taskState.isCompleted && selectedOption && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 rounded-2xl border border-emerald-300/70 bg-emerald-50/80 p-4 dark:border-emerald-700/60 dark:bg-emerald-950/30"
                >
                  <div>
                    <div className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-300">
                      Your answer
                    </div>
                    <p className="mt-1 text-xs font-bold leading-relaxed text-slate-700 dark:text-slate-200">
                      {selectedOption.explanation || "Your answer has been recorded."}
                    </p>
                  </div>
                  {slide.takeaway?.text && slide.takeaway.text !== selectedOption.explanation && (
                    <div className="border-t border-emerald-200 pt-3 dark:border-emerald-800/60">
                      <div className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-300">
                        Answer reveal
                      </div>
                      <p className="mt-1 text-xs font-bold leading-relaxed text-slate-700 dark:text-slate-200">
                        {slide.takeaway.text}
                      </p>
                    </div>
                  )}
                  {slide.completionNarration?.some((cue) => cue.text) && (
                    <div className="border-t border-emerald-200 pt-3 dark:border-emerald-800/60">
                      <div className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-300">
                        Key takeaway
                      </div>
                      <p className="mt-1 text-xs font-bold leading-relaxed text-slate-700 dark:text-slate-200">
                        {slide.completionNarration.find((cue) => cue.text)?.text}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!canCloseFeedback}
                    onClick={() => setIsTheoryOpen(false)}
                    className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:bg-emerald-700/45"
                  >
                    {canCloseFeedback ? "Continue" : "Listen to the explanation..."}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
