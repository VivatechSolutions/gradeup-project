import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, HelpCircle, Search, X } from "lucide-react";
import { PlaceholderImage } from "../PlaceholderImage";
import { SlideData, TaskState } from "../types";

interface MysterySlideProps {
  slide: SlideData;
  taskState: TaskState;
  onCompleteTask: () => void;
}

export const MysterySlide: React.FC<MysterySlideProps> = ({
  slide,
  taskState,
  onCompleteTask,
}) => {
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);
  const [selectedTheory, setSelectedTheory] = useState<string | null>(null);

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
    setSelectedTheory(theoryId);
    setIsTheoryOpen(false);
    onCompleteTask();
  };

  return (
    <div className="flex flex-col text-left space-y-6 max-w-4xl">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-2">
        <div className="lg:col-span-7">
          <PlaceholderImage
            src={slide.images?.main}
            category="cricket-ball"
            alt="Cricket bat striking a ball"
            aspectRatio="16/9"
            className="h-full min-h-[220px] shadow-lg border-2 border-slate-200/90 dark:border-white/10"
          />
          {slide.images?.caption && (
            <p className="mt-2 rounded-xl bg-slate-50/80 px-3 py-2 text-xs font-bold leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {slide.images.caption}
            </p>
          )}
        </div>

        <div className="lg:col-span-5 p-5 rounded-2xl bg-gradient-to-br from-blue-50/70 to-sky-50/40 dark:from-blue-950/30 dark:to-sky-950/20 border border-blue-200/80 dark:border-blue-800/40 shadow-sm flex flex-col justify-between">
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
              onClick={() => setIsTheoryOpen(true)}
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
            {slide.takeaway.text}
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
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-slate-200"
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
                      {theory.explanation && (
                        <span className="mt-1 block text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-slate-300">
                          {theory.explanation}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
