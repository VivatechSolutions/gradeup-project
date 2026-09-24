import React from "react";
import { SlideData, TaskState } from "../types";
import { PlaceholderImage } from "../PlaceholderImage";
import { BookOpen, ArrowRight, Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface LearnSlideProps {
  slide: SlideData;
  taskState: TaskState;
  onCompleteTask: () => void;
}

export const LearnSlide: React.FC<LearnSlideProps> = ({
  slide,
  taskState,
  onCompleteTask,
}) => {
  const hasComparison = Boolean(slide.images?.comparison);
  const hasMainImage = Boolean(slide.images?.main);

  return (
    <div className="flex flex-col text-left space-y-4 max-w-5xl">
      {/* Badge Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-black tracking-wider uppercase w-fit">
        <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span>{slide.badge.label}</span>
      </div>

      {/* Main Heading */}
      <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
        {slide.title}
      </h2>

      {hasMainImage && !hasComparison && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="min-w-0 lg:col-span-6">
            <PlaceholderImage
              src={slide.images?.main}
              category="general-science"
              alt={slide.images?.caption || slide.title}
              aspectRatio="4/3"
              badge={slide.images?.caption ? "Backend visual" : undefined}
              className="w-full max-w-full min-h-[230px] bg-white dark:bg-white/5"
              imageClassName="object-contain"
            />
          </div>
          <div className="min-w-0 lg:col-span-6 flex flex-col justify-center gap-3">
            <div className="space-y-2 text-sm md:text-base font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
              {slide.description && <p>{slide.description}</p>}
              {slide.content && <p className="text-slate-600 dark:text-slate-300">{slide.content}</p>}
            </div>
            {slide.images?.caption && (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs font-bold leading-relaxed text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {slide.images.caption}
              </div>
            )}
          </div>
        </div>
      )}

      {!hasMainImage && (
        <div className="space-y-2 text-sm md:text-base font-medium text-slate-700 dark:text-slate-200 leading-relaxed max-w-3xl">
          {slide.description && <p>{slide.description}</p>}
          {slide.content && <p className="text-slate-600 dark:text-slate-300">{slide.content}</p>}
        </div>
      )}

      {/* Comparison Diagram Cards (Bus moving -> Bus stops) + In Short Callout */}
      {hasComparison && (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-1">
        {/* Left: 2 Comparative Visual Cards */}
        <div className="md:col-span-8 flex flex-col sm:flex-row items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-sm">
          {/* Card 1: Bus moving */}
          <div className="flex-1 w-full flex flex-col items-center">
            <PlaceholderImage
              src={slide.images?.comparison?.beforeImage}
              category="bus-moving"
              alt="Bus in continuous motion"
              aspectRatio="4/3"
              className="w-full"
            />
            <span className="mt-2 text-xs md:text-sm font-extrabold text-slate-700 dark:text-slate-300">
              {slide.images?.comparison?.beforeTitle || "Bus moving"}
            </span>
          </div>

          {/* Transition Arrow */}
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </div>

          {/* Card 2: Bus stops */}
          <div className="flex-1 w-full flex flex-col items-center">
            <PlaceholderImage
              src={slide.images?.comparison?.afterImage}
              category="bus-stopped"
              alt="Bus suddenly brakes"
              aspectRatio="4/3"
              className="w-full"
            />
            <span className="mt-2 text-xs md:text-sm font-extrabold text-slate-700 dark:text-slate-300">
              {slide.images?.comparison?.afterTitle || "Bus stops"}
            </span>
          </div>
        </div>

        {/* Right: "In Short..." Key Takeaway Callout Card */}
        <div className="md:col-span-4 h-full flex flex-col justify-between p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 to-sky-50/50 dark:from-blue-950/40 dark:to-sky-950/30 border border-blue-200/90 dark:border-blue-800/50 shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>{slide.takeaway?.label || "In short..."}</span>
            </div>
            <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
              {slide.takeaway?.text ||
                "Objects don't like to change their motion unless an external force acts on them."}
            </p>
          </div>

          {/* Interactive Understand confirmation */}
          <div className="mt-4 pt-3 border-t border-blue-200/60 dark:border-blue-800/40">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onCompleteTask()}
              className={`w-full py-2.5 px-4 rounded-xl text-xs md:text-sm font-extrabold tracking-wide flex items-center justify-center gap-2 transition-all ${
                taskState.isCompleted
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
              }`}
            >
              {taskState.isCompleted ? (
                <>
                  <span>Understood!</span>
                  <Check className="w-4 h-4 stroke-[3]" />
                </>
              ) : (
                <>
                  <span>Got It! I Understand</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
      )}

      {slide.callout?.text && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 shadow-sm dark:border-amber-800/40 dark:bg-amber-950/25">
          <div className="mb-1 text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
            {slide.callout.title || "Note"}
          </div>
          <p className="text-xs md:text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200">
            {slide.callout.text}
          </p>
        </div>
      )}

      {!hasComparison && slide.task.type !== "narration" && (
        <div className="pt-1">
          {slide.takeaway?.text && (
            <div className="mb-3 rounded-2xl border border-blue-200/90 bg-blue-50/80 p-4 shadow-sm dark:border-blue-800/50 dark:bg-blue-950/30">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                <span>{slide.takeaway.label || "Core Insight"}</span>
              </div>
              <p className="text-xs md:text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200">
                {slide.takeaway.text}
              </p>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onCompleteTask()}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs md:text-sm font-extrabold tracking-wide transition-all ${
              taskState.isCompleted
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700"
            }`}
          >
            {taskState.isCompleted ? (
              <>
                <span>{slide.task.completedButtonLabel || "Understood!"}</span>
                <Check className="w-4 h-4 stroke-[3]" />
              </>
            ) : (
              <>
                <span>{slide.task.buttonLabel || "Got It! I Understand"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </div>
      )}

      {slide.images?.gallery?.filter((url) => url && url !== slide.images?.main).length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {slide.images.gallery
            .filter((url) => url && url !== slide.images?.main)
            .map((url) => (
              <PlaceholderImage
                key={url}
                src={url}
                category="general-science"
                alt={slide.title}
                aspectRatio="16/9"
              />
            ))}
        </div>
      ) : null}
    </div>
  );
};
