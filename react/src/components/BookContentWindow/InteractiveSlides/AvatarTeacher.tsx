import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import maleTeacherGif from "../../../assets/male-teacher.gif";
import femaleTeacherGif from "../../../assets/female-teacher.gif";
import maleTeacherStill from "../../../assets/male-teacher-still.png";
import femaleTeacherStill from "../../../assets/female-teacher-still.png";
import studyRoboImg from "../../../assets/dashboard/study-robo.png";
import {
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  UserRound,
  Volume2,
} from "lucide-react";

export interface AvatarTeacherProps {
  message?: string;
  avatarType?: "male" | "female" | "robot";
  customGifUrl?: string;
  expression?: "idle" | "thinking" | "encouraging" | "celebrating" | "speaking";
  className?: string;
  onAvatarClick?: () => void;
  isSpeaking?: boolean;
  isPaused?: boolean;
  speechSupported?: boolean;
  onSpeak?: () => void;
  onPauseResume?: () => void;
  onRepeat?: () => void;
  onAvatarTypeChange?: (type: "male" | "female") => void;
  showControls?: boolean;
  showTypeControls?: boolean;
  showVoiceControls?: boolean;
}

export const AvatarTeacher: React.FC<AvatarTeacherProps> = ({
  message,
  avatarType = "male",
  customGifUrl,
  expression = "idle",
  className = "",
  onAvatarClick,
  isSpeaking = false,
  isPaused = false,
  speechSupported = true,
  onSpeak,
  onPauseResume,
  onRepeat,
  onAvatarTypeChange,
  showControls = true,
  showTypeControls = true,
  showVoiceControls = true,
}) => {
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  const isVoiceActive = isSpeaking && !isPaused;
  const messageLength = message?.trim().length || 0;
  const bubbleWidthClass =
    messageLength > 190
      ? "w-[min(86vw,380px)] lg:w-[min(42vw,420px)]"
      : messageLength > 90
        ? "w-[min(82vw,320px)] lg:w-[min(36vw,360px)]"
        : "w-max max-w-[min(78vw,260px)] lg:max-w-[300px]";

  const getAvatarSource = () => {
    if (customGifUrl && isVoiceActive) return customGifUrl;
    if (avatarType === "female") return isVoiceActive ? femaleTeacherGif : femaleTeacherStill;
    if (avatarType === "robot") return studyRoboImg;
    return isVoiceActive ? maleTeacherGif : maleTeacherStill;
  };

  const handleVoiceButton = (event: React.MouseEvent, action?: () => void) => {
    event.stopPropagation();
    action?.();
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-end select-none pointer-events-auto z-20 ${className}`}
    >
      {/* Speech Bubble (Floating above or to the left of avatar) */}
      <AnimatePresence>
        {message && isBubbleVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={`absolute bottom-[108%] right-1/2 z-30 mb-3 translate-x-1/2 ${bubbleWidthClass} sm:right-0 sm:translate-x-0 lg:bottom-auto lg:right-full lg:top-4 lg:mr-3 lg:mb-0`}
          >
            <div className="relative max-h-[min(42vh,280px)] overflow-y-auto break-words rounded-[22px] border border-emerald-100/90 bg-emerald-50/95 p-3 text-[11px] font-bold leading-relaxed text-[#071235] shadow-xl shadow-emerald-900/10 backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] dark:border-sky-300/20 dark:bg-[#132868]/95 dark:text-sky-50 dark:shadow-[0_12px_28px_rgba(0,0,0,.36),0_0_22px_-8px_rgba(14,165,233,.38)] [&::-webkit-scrollbar]:hidden sm:p-3.5 sm:text-xs">
              <div className="flex min-w-0 items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span className="min-w-0 whitespace-normal">{message}</span>
              </div>

              {/* Speech Bubble Arrow pointing down to Avatar */}
              <div
                className="absolute -bottom-2 right-8 w-4 h-4 bg-emerald-50 dark:bg-[#132868] border-r border-b border-emerald-100/90 dark:border-sky-300/20 transform rotate-45 lg:bottom-auto lg:-right-2 lg:top-8 lg:border-b-0 lg:border-t"
                aria-hidden="true"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Container */}
      <motion.div
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={onAvatarClick || (() => setIsBubbleVisible((prev) => !prev))}
        className="relative group cursor-pointer flex flex-col items-center"
      >
        {/* Glow halo behind teacher */}
        <div
          className={`absolute -inset-3 rounded-full blur-xl transition-opacity ${
            isVoiceActive
              ? "bg-gradient-to-t from-emerald-400/30 via-sky-400/25 to-transparent opacity-100"
              : "bg-gradient-to-t from-blue-500/15 via-sky-400/10 to-transparent opacity-60 group-hover:opacity-90"
          }`}
        />

        <motion.div
          animate={
            isVoiceActive
              ? { y: [0, -5, 0], rotate: [0, -1.4, 1.2, 0] }
              : { y: [0, -2, 0] }
          }
          transition={{
            duration: isVoiceActive ? 1.55 : 4.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative w-32 h-32 sm:w-36 sm:h-36 lg:w-44 lg:h-44 xl:w-48 xl:h-48 flex items-end justify-center transition-all"
        >
          <motion.img
            src={getAvatarSource()}
            alt={isVoiceActive ? "AI Teacher speaking" : "AI Teacher"}
            className={`relative z-10 w-full h-full object-contain object-bottom drop-shadow-2xl transition-all ${
              isVoiceActive ? "scale-105" : "scale-100"
            }`}
            style={{ transform: "scaleX(-1)" }}
            animate={isVoiceActive ? { filter: ["brightness(1)", "brightness(1.08)", "brightness(1)"] } : undefined}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* AI Tutor status badge */}
          <div
            className={`absolute z-20 bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full backdrop-blur-sm text-[10px] font-extrabold text-white tracking-wide uppercase text-center shadow-sm whitespace-nowrap ${
              isVoiceActive ? "bg-emerald-600/95" : "bg-blue-600/90 dark:bg-sky-500/90"
            }`}
          >
            {isVoiceActive ? "Speaking" : isPaused ? "Paused" : "Ready"}
          </div>

          <AnimatePresence>
            {message && !isBubbleVisible && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.65, y: 8 }}
                animate={{
                  opacity: 1,
                  scale: [1, 1.08, 1],
                  y: [0, -5, 0],
                }}
                exit={{ opacity: 0, scale: 0.7, y: 6 }}
                transition={{
                  opacity: { duration: 0.18 },
                  scale: { duration: 1.7, repeat: Infinity, ease: "easeInOut" },
                  y: { duration: 1.7, repeat: Infinity, ease: "easeInOut" },
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsBubbleVisible(true);
                }}
                className="absolute right-3 top-4 z-30 grid h-9 w-9 place-items-center rounded-full border border-white/75 bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 text-white shadow-[0_0_24px_rgba(56,189,248,.42)] transition hover:brightness-110 dark:border-cyan-100/50 dark:shadow-[0_0_26px_rgba(34,211,238,.58)]"
                title="Show teacher message"
              >
                <span className="absolute inset-[-6px] rounded-full border border-cyan-200/40 animate-ping" aria-hidden="true" />
                <MessageCircle className="relative h-[18px] w-[18px]" />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

      </motion.div>

      {showControls && (showTypeControls || showVoiceControls) && (
        <div className="mt-1.5 flex flex-col items-center gap-1.5 rounded-[22px] border border-cyan-100/80 dark:border-cyan-200/35 bg-cyan-50/90 dark:bg-[linear-gradient(145deg,rgba(8,15,38,.98),rgba(24,29,76,.94))] p-2 shadow-xl shadow-cyan-900/10 dark:shadow-[0_18px_38px_rgba(0,0,0,.52),0_0_28px_-8px_rgba(34,211,238,.55),inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-md transition-colors">
        {showTypeControls && (
        <div className="grid grid-cols-2 gap-1 w-full">
          {(["male", "female"] as const).map((type) => {
            const active = avatarType === type;

            return (
              <button
                key={type}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onAvatarTypeChange?.(type);
                }}
                className={`h-8 px-2 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-black capitalize transition-all ${
                  active
                    ? "bg-gradient-to-r from-amber-300 via-orange-500 to-pink-500 text-white shadow-md shadow-orange-500/20 dark:shadow-[0_0_18px_rgba(251,146,60,.38)]"
                    : "bg-white text-[#071235] hover:bg-orange-50 hover:text-orange-700 dark:bg-[#101a3a]/88 dark:text-white/86 dark:border dark:border-violet-200/16 dark:hover:bg-[#1b2552] dark:hover:text-white"
                }`}
                title={`Use ${type} voice`}
              >
                {type === "male" ? (
                  <UserRound className="w-3.5 h-3.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{type}</span>
              </button>
            );
          })}
        </div>
        )}

        {showVoiceControls && (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={(event) => handleVoiceButton(event, onSpeak)}
            disabled={!speechSupported}
            className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 transition-all hover:from-blue-700 hover:to-sky-600 disabled:cursor-not-allowed disabled:bg-none disabled:bg-[#101a3a] disabled:text-cyan-100/45 disabled:border disabled:border-cyan-200/18 dark:from-cyan-300 dark:to-blue-600 dark:text-white dark:shadow-[0_0_22px_rgba(34,211,238,.36)] dark:hover:from-cyan-200 dark:hover:to-blue-500"
            title={isSpeaking ? "Stop voice" : "Play voice"}
          >
            {isSpeaking ? <Volume2 className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
          <button
            type="button"
            onClick={(event) => handleVoiceButton(event, onPauseResume)}
            disabled={!speechSupported || !isSpeaking}
            className="w-9 h-9 rounded-2xl bg-white text-slate-700 flex items-center justify-center shadow-sm transition-all hover:bg-orange-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300 dark:bg-gradient-to-br dark:from-amber-300 dark:via-orange-500 dark:to-fuchsia-500 dark:text-white dark:border dark:border-amber-200/60 dark:shadow-[0_0_22px_rgba(249,115,22,.42)] dark:hover:brightness-110 dark:disabled:bg-none dark:disabled:bg-[#101a3a] dark:disabled:text-cyan-100/45 dark:disabled:border-cyan-200/18 dark:disabled:shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"
            title={isPaused ? "Resume voice" : "Pause voice"}
          >
            {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
          </button>
          <button
            type="button"
            onClick={(event) => handleVoiceButton(event, onRepeat)}
            disabled={!speechSupported}
            className="w-9 h-9 rounded-2xl bg-white text-slate-700 flex items-center justify-center shadow-sm transition-all hover:bg-orange-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300 dark:bg-[#101a3a] dark:text-cyan-50 dark:border dark:border-cyan-200/30 dark:shadow-[0_0_18px_rgba(34,211,238,.18),inset_0_1px_0_rgba(255,255,255,.10)] dark:hover:bg-[#18275a] dark:hover:border-cyan-200/50 dark:disabled:bg-[#101a3a] dark:disabled:text-cyan-100/45 dark:disabled:border-cyan-200/18"
            title="Repeat voice"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        )}
      </div>
      )}
    </div>
  );
};
