import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Keyboard, Mic, Square } from "lucide-react";
import { SlideData, TaskState } from "../types";

interface TeachBackSlideProps {
  slide: SlideData;
  taskState: TaskState;
  onSubmitText: (text: string) => void;
  onRecordVoice: () => void;
}

export const TeachBackSlide: React.FC<TeachBackSlideProps> = ({
  slide,
  taskState,
  onSubmitText,
  onRecordVoice,
}) => {
  const [activeTab, setActiveTab] = useState<"speak" | "type">("type");
  const [typedText, setTypedText] = useState(taskState.submittedText || "");
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordSeconds((seconds) => seconds + 1);
      }, 1000);
    } else {
      setRecordSeconds(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const handleToggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      onRecordVoice();
      return;
    }

    setIsRecording(true);
  };

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (typedText.trim()) {
      onSubmitText(typedText);
    }
  };

  const helperText =
    slide.takeaway?.text ||
    "Use examples from the lesson and explain what resists the change in motion.";

  return (
    <div className="flex flex-col text-left space-y-6 max-w-4xl">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-black tracking-wider uppercase w-fit">
        <Mic className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span>{slide.badge.label}</span>
      </div>

      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-snug">
          {slide.title}
        </h2>
        <p className="mt-1 text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400">
          {slide.description || "Synthesizing and explaining a concept in your own words builds lasting mastery."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
        <div className="lg:col-span-12 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setActiveTab("speak")}
              className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-3 ${
                activeTab === "speak"
                  ? "border-blue-600 dark:border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 shadow-sm"
                  : "border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#151f3e] text-slate-600 dark:text-slate-400"
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Mic className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-extrabold">Speak</div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Use your mic
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("type")}
              className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-3 ${
                activeTab === "type"
                  ? "border-blue-600 dark:border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 shadow-sm"
                  : "border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#151f3e] text-slate-600 dark:text-slate-400"
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-sky-600/10 dark:bg-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Keyboard className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-extrabold">Type</div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Write your answer
                </div>
              </div>
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#151f3e] border border-slate-200/90 dark:border-white/10 shadow-sm">
            {activeTab === "speak" ? (
              <div className="flex flex-col items-center justify-center text-center py-6 space-y-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleToggleRecord}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all ${
                    isRecording
                      ? "bg-red-600 text-white animate-pulse shadow-red-600/40"
                      : "bg-blue-600 text-white shadow-blue-600/30"
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-7 h-7 fill-current" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </motion.button>

                <div>
                  <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    {isRecording ? `Recording... (${recordSeconds}s)` : "Tap to Speak"}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {isRecording
                      ? "Speak clearly. Tap again when done!"
                      : helperText}
                  </div>
                </div>

                {taskState.isVoiceRecorded && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-800">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Voice note saved. AI Teacher is analyzing.</span>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-3">
                <textarea
                  rows={4}
                  value={typedText}
                  onChange={(event) => setTypedText(event.target.value)}
                  placeholder={helperText}
                  className="w-full p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    {typedText.length} characters
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={!typedText.trim()}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs md:text-sm font-black tracking-wide transition-all ${
                      taskState.isCompleted
                        ? "bg-emerald-600 text-white shadow-emerald-600/20"
                        : !typedText.trim()
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25"
                    }`}
                  >
                    {taskState.isCompleted ? (
                      <>
                        <span>Submitted!</span>
                        <Check className="w-4 h-4 stroke-[3]" />
                      </>
                    ) : (
                      <>
                        <span>Submit Explanation</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            )}
          </div>
        </div>

        {slide.takeaway?.text && (
          <div className="lg:col-span-12 rounded-2xl border border-blue-200/80 bg-blue-50/80 p-4 shadow-sm dark:border-blue-800/40 dark:bg-blue-950/25">
            <div className="mb-1 text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">
              {slide.takeaway.label || "Model answer"}
            </div>
            <p className="text-xs md:text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200">
              {slide.takeaway.text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
