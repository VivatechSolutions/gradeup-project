import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Circle, Image as ImageIcon, XCircle } from "lucide-react";
import { PlaceholderImage } from "../PlaceholderImage";
import { SlideData, TaskState } from "../types";

interface ExplanationSlideProps {
  slide: SlideData;
  activeSegmentIndex: number;
  taskStates: Record<string, TaskState>;
  onSelectOption: (segmentIndex: number, optionId: string) => void;
  onRevealNext: () => void;
}

export const ExplanationSlide: React.FC<ExplanationSlideProps> = ({
  slide,
  activeSegmentIndex,
  taskStates,
  onSelectOption,
  onRevealNext,
}) => {
  const segmentRefs = useRef<Array<HTMLElement | null>>([]);
  const segments = slide.segments || [];
  const visibleSegments = segments.slice(0, activeSegmentIndex + 1);
  const activeSegment = segments[activeSegmentIndex];
  const activeTaskState = activeSegment
    ? taskStates[activeSegment.id] || { isCompleted: false, selectedOptionIds: [] }
    : { isCompleted: false, selectedOptionIds: [] };
  const hasMoreSegments = activeSegmentIndex < segments.length - 1;
  const canRevealNext =
    activeSegment?.task.type === "narration" || Boolean(activeTaskState.isCompleted);

  useEffect(() => {
    segmentRefs.current[activeSegmentIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [activeSegmentIndex]);

  return (
    <div className="flex h-full min-h-0 w-full max-w-6xl flex-col text-left">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase text-blue-300">Explanation</div>
          <h2 className="mt-1 text-xl font-extrabold text-white md:text-2xl">{slide.title}</h2>
        </div>
        <div className="shrink-0 text-xs font-bold text-slate-300">
          {segments.length} parts
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-2">
        <AnimatePresence initial={false}>
        {visibleSegments.map((segment, index) => {
          const isActive = index === activeSegmentIndex;
          const state = taskStates[segment.id] || { isCompleted: false, selectedOptionIds: [] };
          const hasImage = Boolean(segment.images?.main);

          return (
            <motion.section
              key={segment.id}
              ref={(node) => {
                segmentRefs.current[index] = node;
              }}
              initial={index === activeSegmentIndex ? { opacity: 0, x: -36 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.42, ease: [0.25, 1, 0.5, 1] }}
              className={`rounded-xl border px-4 py-3 transition-colors md:px-5 ${
                isActive
                  ? "border-cyan-300/65 bg-cyan-400/10 shadow-[0_0_22px_rgba(34,211,238,.12)]"
                  : "border-white/10 bg-white/[0.035]"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-black ${
                    isActive ? "bg-cyan-400 text-[#071126]" : "bg-white/10 text-slate-300"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="text-[11px] font-black uppercase text-slate-300">
                  {segment.type === "think" ? "Quick check" : "Key idea"}
                </span>
                {hasImage && <ImageIcon className="h-3.5 w-3.5 text-cyan-300" />}
                {isActive && <span className="ml-auto text-[11px] font-bold text-cyan-300">Now playing</span>}
              </div>

              <div className={hasImage ? "grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_240px]" : ""}>
                <div className="min-w-0">
                  {segment.type === "think" ? (
                    <>
                      <p className="text-sm font-extrabold leading-relaxed text-white">
                        {segment.question || segment.title}
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {segment.options?.map((option) => {
                          const isSelected = state.selectedOptionIds.includes(option.id);
                          const showCorrect = state.revealedCorrectOptionId === option.id;
                          const isWrong = isSelected && state.isCorrect === false;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              disabled={state.isFeedbackPlaying}
                              onClick={() => onSelectOption(index, option.id)}
                              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
                                isWrong
                                  ? "border-rose-400/70 bg-rose-500/10 text-rose-100"
                                  : showCorrect || (isSelected && state.isCorrect)
                                    ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-100"
                                    : "border-white/15 bg-white/5 text-slate-200 hover:border-cyan-300/60"
                              }`}
                            >
                              {isWrong ? (
                                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                              ) : showCorrect || (isSelected && state.isCorrect) ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                              ) : (
                                <Circle className="mt-0.5 h-4 w-4 shrink-0" />
                              )}
                              <span>{option.label ? `${option.label}. ` : ""}{option.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1.5 text-sm font-semibold leading-relaxed text-slate-200 md:text-[15px]">
                      {segment.description && <p>{segment.description}</p>}
                      {segment.content && <p className="text-slate-300">{segment.content}</p>}
                    </div>
                  )}
                </div>

                {hasImage && (
                  <PlaceholderImage
                    src={segment.images?.main}
                    category="general-science"
                    alt={segment.images?.caption || segment.title}
                    aspectRatio="16/9"
                    className="w-full max-w-[240px] justify-self-center bg-white/5"
                    imageClassName="object-contain"
                  />
                )}
              </div>
            </motion.section>
          );
        })}
        </AnimatePresence>

        {hasMoreSegments && (
          <div className="sticky bottom-0 flex justify-end bg-gradient-to-t from-[#0c1530] via-[#0c1530]/95 to-transparent pb-1 pt-5">
            <button
              type="button"
              onClick={onRevealNext}
              disabled={!canRevealNext}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300 disabled:shadow-none"
              title={canRevealNext ? "Show the next explanation part" : "Complete this activity first"}
            >
              Next part
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
