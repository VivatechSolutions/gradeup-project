import React from "react";
import { ArrowLeft, Check, GraduationCap, Lock, Medal, Moon, Sparkles, Sun, UserRound } from "lucide-react";
import { useTheme } from "../../../hooks/use-theme";

interface SlideHeaderProps {
  lessonTitle: string;
  subjectTitle?: string;
  currentIndex: number;
  totalSlides: number;
  isTaskCompleted: boolean;
  avatarType: "male" | "female";
  onAvatarTypeChange: (type: "male" | "female") => void;
  onBackToUnits: () => void;
}

export const SlideHeader: React.FC<SlideHeaderProps> = ({
  lessonTitle,
  subjectTitle,
  currentIndex,
  totalSlides,
  isTaskCompleted,
  avatarType,
  onAvatarTypeChange,
  onBackToUnits,
}) => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const progressPercent = Math.round(((currentIndex + 1) / totalSlides) * 100);

  return (
    <header className="relative z-30 w-full max-w-[1540px] mx-auto px-2.5 sm:px-4 py-1 sm:py-1.5 flex flex-col gap-1.5 text-[#071b4d] dark:text-white shrink-0">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToUnits}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-2xl text-xs sm:text-sm font-extrabold text-blue-700 dark:text-cyan-50 bg-white/80 dark:bg-[#0d2b50]/90 border border-blue-100 dark:border-cyan-300/35 shadow-sm shadow-slate-900/5 dark:shadow-[0_0_18px_rgba(34,211,238,.12)] hover:-translate-y-0.5 hover:bg-white dark:hover:bg-[#123860] transition-all"
            title="Return to Units List"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Units</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-[#1232a3] via-[#2367ff] to-[#00c896] flex items-center justify-center text-white shadow-lg shadow-blue-500/20 dark:shadow-cyan-400/25">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg sm:text-xl tracking-normal hidden md:inline dark:drop-shadow-[0_8px_18px_rgba(56,189,248,.20)]">
              Grade<span className="text-emerald-500">Up</span>
            </span>
          </div>
        </div>

        <div className="text-center truncate px-2">
          <h1 className="text-sm sm:text-base md:text-lg font-extrabold truncate leading-none">
            {lessonTitle}
          </h1>
          {subjectTitle && (
            <span className="relative mt-1 inline-block text-[11px] sm:text-xs font-bold text-[#071b4d]/75 dark:text-sky-100/75">
              {subjectTitle}
              <span className="absolute -bottom-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 dark:from-cyan-300 dark:to-violet-300" />
            </span>
          )}
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <div className="hidden sm:grid grid-cols-2 gap-1 rounded-[18px] border border-cyan-100/80 bg-cyan-50/80 p-1 shadow-lg shadow-cyan-900/5 dark:border-cyan-200/28 dark:bg-[#0f1b3d]/88 dark:shadow-[0_0_18px_rgba(34,211,238,.14),inset_0_1px_0_rgba(255,255,255,.08)]">
            {(["male", "female"] as const).map((type) => {
              const active = avatarType === type;
              const Icon = type === "male" ? UserRound : Sparkles;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onAvatarTypeChange(type)}
                  className={`inline-flex h-8 min-w-[36px] items-center justify-center gap-1 rounded-[14px] px-2 text-[11px] font-black capitalize transition-all ${
                    active
                      ? "bg-gradient-to-r from-amber-300 via-orange-500 to-fuchsia-500 text-white shadow-[0_0_18px_rgba(249,115,22,.35)]"
                      : "text-slate-600 hover:bg-white/75 hover:text-slate-950 dark:text-cyan-50/72 dark:hover:bg-white/10 dark:hover:text-white"
                  }`}
                  title={`Use ${type} avatar`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{type}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-2.5 rounded-[22px] bg-gradient-to-r from-orange-50 to-amber-100 dark:from-[#0f3159] dark:via-[#13366f] dark:to-[#1d276d] border border-orange-100/80 dark:border-cyan-300/30 px-3.5 py-1.5 shadow-lg shadow-orange-200/25 dark:shadow-[0_12px_28px_rgba(0,0,0,.32),0_0_20px_rgba(34,211,238,.10)]">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 dark:from-cyan-300 dark:to-blue-500 text-white flex items-center justify-center shadow-md shadow-orange-400/25 dark:shadow-cyan-400/25">
              <Medal className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <div className="font-extrabold text-sm">
                {currentIndex + 1} / {totalSlides}
              </div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-cyan-100/80">
                Units Completed
              </div>
            </div>
          </div>

          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/85 dark:bg-[#0d2b50]/90 border border-slate-200/70 dark:border-cyan-300/35 flex items-center justify-center text-slate-700 dark:text-cyan-50 hover:-translate-y-0.5 hover:bg-white dark:hover:bg-[#123860] shadow-lg shadow-slate-900/5 dark:shadow-[0_0_18px_rgba(34,211,238,.12)] transition-all"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>

          <div className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#232a78] dark:bg-gradient-to-br dark:from-indigo-500 dark:to-sky-500 text-white items-center justify-center font-extrabold text-sm shadow-lg shadow-indigo-500/20">
            GK
          </div>
        </div>
      </div>

      <div className="hidden md:grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 overflow-hidden">
        <div className="flex min-w-0 items-center justify-center gap-2 overflow-x-auto py-1 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: totalSlides }).map((_, index) => {
            const isCurrent = index === currentIndex;
            const isDone = index < currentIndex;
            const isNewlyUnlocked = index === currentIndex + 1 && isTaskCompleted;
            const isLocked = index > currentIndex + (isTaskCompleted ? 1 : 0);

            return (
              <div
                key={index}
                className={`relative h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-full border flex items-center justify-center text-[11px] sm:text-xs font-extrabold transition-all duration-500 ${
                  isCurrent
                    ? "animate-[guActiveStep_1.7s_ease-in-out_infinite] bg-gradient-to-br from-amber-300 via-orange-500 to-fuchsia-500 text-white border-amber-100 shadow-lg shadow-orange-400/30 scale-110 dark:from-amber-300 dark:via-orange-500 dark:to-fuchsia-500 dark:border-amber-100 dark:text-white dark:shadow-[0_0_26px_rgba(251,146,60,.72),inset_0_1px_0_rgba(255,255,255,.35)]"
                    : isDone
                      ? "bg-orange-50 text-orange-600 border-orange-200 dark:bg-[#17305e] dark:text-cyan-50 dark:border-cyan-200/35 dark:shadow-[0_0_16px_rgba(34,211,238,.16),inset_0_1px_0_rgba(255,255,255,.14)]"
                      : isNewlyUnlocked
                        ? "animate-[guUnlockStep_.9s_ease-out] bg-gradient-to-br from-emerald-300 via-cyan-300 to-sky-500 text-[#061431] border-cyan-100 shadow-[0_0_26px_rgba(34,211,238,.50)] dark:text-[#061431]"
                        : "bg-white/80 text-[#071b4d] border-slate-200 shadow-sm shadow-slate-900/5 dark:bg-[#121936]/92 dark:text-cyan-100/45 dark:border-cyan-200/14 dark:shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_10px_22px_rgba(0,0,0,.22)]"
                }`}
              >
                {isNewlyUnlocked && (
                  <span className="absolute inset-[-8px] rounded-full border border-cyan-200/60 opacity-0 animate-[guUnlockRipple_.9s_ease-out]" aria-hidden="true" />
                )}
                {isLocked ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : isDone ? (
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                ) : (
                  index + 1
                )}
              </div>
            );
          })}
        </div>

        <div className="hidden xl:block h-2.5 rounded-full bg-slate-200/70 dark:bg-[#17223f]/95 dark:border dark:border-violet-200/18 overflow-hidden shadow-inner dark:shadow-[inset_0_1px_5px_rgba(0,0,0,.55)]">
          <div
            className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-300 dark:from-fuchsia-500 dark:via-orange-500 dark:to-amber-300 transition-all duration-500 ease-out rounded-full shadow-[0_0_24px_rgba(249,115,22,.35)] dark:shadow-[0_0_28px_rgba(249,115,22,.62)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </header>
  );
};
