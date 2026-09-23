import React from "react";
import { SlideData, TaskState } from "../types";
import { PlaceholderImage } from "../PlaceholderImage";
import { Globe2, Lightbulb, ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";

interface RealWorldSlideProps {
  slide: SlideData;
  taskState: TaskState;
  onCompleteTask: () => void;
}

export const RealWorldSlide: React.FC<RealWorldSlideProps> = ({
  slide,
  taskState,
  onCompleteTask,
}) => {
  return (
    <div className="flex flex-col text-left space-y-6 max-w-4xl">
      {/* Badge Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-black tracking-wider uppercase w-fit">
        <Globe2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span>{slide.badge.label}</span>
      </div>

      {/* Main Heading */}
      <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-snug">
        {slide.title}
      </h2>

      {/* Scenario Hero Layout: Spacecraft visual + Explanation card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        {/* Left: Astronaut in space visual */}
        <div className="md:col-span-8">
          <PlaceholderImage
            src={slide.images?.main}
            category="astronaut-space"
            alt="Astronaut floating freely inside spacecraft"
            aspectRatio="16/9"
            className="h-full min-h-[220px] shadow-lg border-2 border-slate-200/80 dark:border-white/10"
          />
          {slide.images?.caption && (
            <p className="mt-2 rounded-xl bg-slate-50/80 px-3 py-2 text-xs font-bold leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {slide.images.caption}
            </p>
          )}
        </div>

        {/* Right: Scenario Explanation Card */}
        <div className="md:col-span-4 p-5 rounded-2xl bg-white dark:bg-[#151f3e] border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <p className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
            {slide.description ||
              "There's no support force opposing their orbital trajectory, so they and the spacecraft continuously move forward together in the same state of motion."}
          </p>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/10">
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
                  <span>Connection Made!</span>
                  <Check className="w-4 h-4 stroke-[3]" />
                </>
              ) : (
                <>
                  <span>Understand Connection</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Bottom Lightbulb Connection Callout */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/40 flex items-start gap-3.5 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-400/20 flex items-center justify-center shrink-0">
          <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 fill-amber-500" />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-0.5">
            Real-World Connection
          </h4>
          <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
            {slide.takeaway?.text ||
              "In the same way, when the bus stops, your body keeps moving forward because of inertia!"}
          </p>
        </div>
      </div>

      {slide.callout?.text && (
        <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/40 shadow-sm">
          <h4 className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-300 mb-1">
            {slide.callout.title || "Look Prompt"}
          </h4>
          <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
            {slide.callout.text}
          </p>
        </div>
      )}
    </div>
  );
};
