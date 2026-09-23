import React from "react";
import { SlideData, TaskState } from "../types";
import { PlaceholderImage } from "../PlaceholderImage";
import { Sparkles, ArrowRight, Check, BookOpen, BarChart3, Lightbulb, Settings } from "lucide-react";
import { motion } from "framer-motion";

interface HookSlideProps {
  slide: SlideData;
  taskState: TaskState;
  onCompleteTask: () => void;
}

export const HookSlide: React.FC<HookSlideProps> = ({
  slide,
  taskState,
  onCompleteTask,
}) => {
  // Highlight specific keywords in the title if specified
  const renderHighlightedTitle = () => {
    if (!slide.highlightWords || slide.highlightWords.length === 0) {
      return slide.title;
    }

    const regex = new RegExp(`(${slide.highlightWords.join("|")})`, "gi");
    const parts = slide.title.split(regex);

    return parts.map((part, i) => {
      const isMatch = slide.highlightWords?.some(
        (word) => word.toLowerCase() === part.toLowerCase()
      );
      if (isMatch) {
        return (
          <span
            key={i}
            className="bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent dark:from-cyan-300 dark:via-sky-300 dark:to-violet-300"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="relative grid min-h-0 items-center gap-4 lg:grid-cols-[0.92fr_1.08fr] xl:gap-6">
      <div className="absolute left-[42%] top-[48%] hidden xl:flex flex-col gap-1.5 text-amber-400" aria-hidden="true">
        <span className="h-2 w-9 rounded-full bg-current rotate-[24deg]" />
        <span className="h-2 w-7 rounded-full bg-current -rotate-[18deg]" />
      </div>
      {/* Left Column: Question, Subtitle, CTA */}
      <div className="flex min-w-0 flex-col justify-center text-left space-y-3 xl:space-y-4">
        {/* Badge Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[18px] bg-orange-50 dark:bg-[linear-gradient(135deg,rgba(17,24,58,.98),rgba(44,29,82,.94))] border border-orange-100/90 dark:border-amber-300/55 text-[#071235] dark:text-amber-50 text-[11px] md:text-xs font-extrabold tracking-wide uppercase w-fit shadow-sm shadow-orange-100/50 dark:shadow-[0_0_24px_rgba(251,146,60,.22),inset_0_1px_0_rgba(255,255,255,.14)]">
          <BookOpen className="w-4 h-4 text-orange-500 dark:text-amber-300 dark:drop-shadow-[0_0_8px_rgba(251,191,36,.65)]" />
          <span>{slide.badge.label}</span>
        </div>

        {/* Hero Hook Heading */}
        <h1 className="max-w-[520px] text-[clamp(1.75rem,2.55vw,2.75rem)] font-extrabold text-[#071235] dark:text-white leading-[1.12] tracking-normal dark:drop-shadow-[0_12px_26px_rgba(14,165,233,.16)]">
          {renderHighlightedTitle()}
        </h1>

        {/* Subtitle / Description */}
        <p className="max-w-[500px] text-xs md:text-sm xl:text-base text-slate-600 dark:text-sky-100/82 font-semibold leading-relaxed">
          {slide.description || slide.subtitle}
        </p>

        {/* Interactive CTA button */}
        <div className="pt-2 flex items-end gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onCompleteTask()}
            className={`group inline-flex items-center gap-3 px-5 py-2.5 rounded-[22px] font-extrabold text-sm md:text-base tracking-wide transition-all shadow-xl ${
              taskState.isCompleted
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 dark:bg-gradient-to-r dark:from-emerald-500 dark:to-cyan-500 dark:shadow-cyan-500/25"
                : "bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 hover:from-red-600 hover:to-amber-500 text-white shadow-orange-500/30 dark:from-cyan-500 dark:via-sky-500 dark:to-violet-500 dark:shadow-sky-500/30"
            }`}
          >
            {taskState.isCompleted ? (
              <>
                <span>Ready! Let's Go</span>
                <Check className="w-5 h-5 stroke-[3]" />
              </>
            ) : (
              <>
                <span>{slide.task.buttonLabel || "Let's Go"}</span>
                <span className="grid h-8 w-8 md:h-9 md:w-9 place-items-center rounded-full bg-white text-orange-600 shadow-inner transition-transform group-hover:translate-x-1">
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                </span>
              </>
            )}
          </motion.button>
          <div className="hidden xl:block rotate-[-8deg] pb-1 text-xs font-extrabold text-slate-500 dark:text-sky-200/80">
            <div>Small</div>
            <div>steps</div>
            <div className="text-base">Big progress!</div>
          </div>
        </div>
      </div>

      {/* Right Column: Hero Illustration */}
      <div className="min-w-0">
        <div className="relative mx-auto max-w-[610px] overflow-hidden rounded-[24px] bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 dark:from-[#133b84]/85 dark:via-[#10194e] dark:to-[#0b6f8f]/55 p-2.5 shadow-2xl shadow-orange-200/30 dark:shadow-[0_18px_40px_rgba(0,0,0,.45),0_0_30px_-4px_rgba(34,211,238,.34)] border border-white/60 dark:border-cyan-300/28">
          <div className="absolute left-12 top-8 h-16 w-16 rounded-full bg-amber-300/30 blur-xl dark:bg-cyan-300/25" />
          <div className="absolute right-14 top-8 text-red-400 dark:text-cyan-300" aria-hidden="true">
            <Sparkles className="w-10 h-10 rotate-12" />
          </div>
          <PlaceholderImage
            src={slide.images?.main}
            category="bus-braking"
            alt="Passenger leaning forward in braking bus"
            aspectRatio="16/9"
            className="relative shadow-none border-0 max-h-[270px]"
          />
          <div className="absolute right-4 top-6 hidden xl:flex flex-col gap-2 w-40">
            {[
              { label: "Learn", icon: BookOpen, className: "from-red-400 to-rose-500 text-white dark:from-fuchsia-500 dark:to-rose-500" },
              { label: "Understand", icon: Lightbulb, className: "from-lime-300 to-green-300 text-[#071b4d] dark:from-emerald-300 dark:to-cyan-300" },
              { label: "Apply", icon: Settings, className: "from-amber-300 to-yellow-400 text-[#071b4d] dark:from-amber-300 dark:to-orange-400" },
              { label: "Grow", icon: BarChart3, className: "from-cyan-300 to-teal-300 text-[#071b4d] dark:from-sky-300 dark:to-violet-300" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-2xl bg-gradient-to-r ${item.className} px-3.5 py-2 font-extrabold text-sm shadow-lg shadow-orange-300/20`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
