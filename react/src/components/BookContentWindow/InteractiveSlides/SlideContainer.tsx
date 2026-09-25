import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { LessonData, NarrationCue, SlideData, TaskState } from "./types";
import { SlideHeader } from "./SlideHeader";
import { SlideNavigation } from "./SlideNavigation";
import { SlideRenderer } from "./SlideRenderer";
import { ExplanationSlide } from "./slides/ExplanationSlide";
import { AvatarTeacher } from "./AvatarTeacher";
import { CompletionEffect } from "./CompletionEffect";
import { generateLessonFromChapter } from "./mockLessonData";
import { Hand, Lightbulb, Loader2, Mic, Send, Square, Volume2, X } from "lucide-react";
import {
  endAvatarSession,
  endAvatarSessionKeepalive,
  raiseAvatarHand,
  resumeAvatarSession,
  transcribeDebateAudio,
} from "../../../lib/gradeupApi";

const pendingAvatarEndTimers = new Map<string, number>();
const endedAvatarSessions = new Set<string>();

interface SlideContainerProps {
  book?: any;
  chapter?: any;
  onBackToUnits: () => void;
  onBackToLibrary?: () => void;
  onLessonFinish?: () => void;
}

const slideVariants = {
  enter: (direction: "next" | "prev") => ({
    x: direction === "next" ? -160 : 160,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.42,
      ease: [0.25, 1, 0.5, 1],
    },
  },
  exit: (direction: "next" | "prev") => ({
    x: direction === "next" ? 160 : -160,
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.34,
      ease: [0.25, 1, 0.5, 1],
    },
  }),
};

type NarrationMode = "slide" | "feedback" | "insight";
type PlaybackState = "idle" | "narrating" | "awaiting_action" | "feedback" | "ready" | "paused" | "advancing";

export const SlideContainer: React.FC<SlideContainerProps> = ({
  book,
  chapter,
  onBackToUnits,
  onBackToLibrary,
  onLessonFinish,
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Generate or load lesson data
  const lesson: LessonData = useMemo(() => {
    return generateLessonFromChapter(chapter, book);
  }, [chapter, book]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [isNavigating, setIsNavigating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState("Activity Complete! Next Unlocked");
  const [celebrationTone, setCelebrationTone] = useState<"success" | "error" | "neutral">("success");
  const [avatarType, setAvatarType] = useState<"male" | "female">("male");
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [isAvatarPaused, setIsAvatarPaused] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const lessonAudioRef = useRef<HTMLAudioElement | null>(null);
  const narrationModeRef = useRef<NarrationMode | null>(null);
  const activeNarrationCueRef = useRef<NarrationCue | null>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const advanceRef = useRef<() => void>(() => undefined);
  const narrationEndedRef = useRef<() => void>(() => undefined);
  const currentSlideIdRef = useRef("");
  const doubtOpenRef = useRef(false);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [doubtOpen, setDoubtOpen] = useState(false);
  const [doubtText, setDoubtText] = useState("");
  const [doubtChat, setDoubtChat] = useState<Array<{ id: string; role: "student" | "ai"; text: string }>>([]);
  const [isAskingDoubt, setIsAskingDoubt] = useState(false);
  const [isRecordingDoubt, setIsRecordingDoubt] = useState(false);
  const [isTranscribingDoubt, setIsTranscribingDoubt] = useState(false);
  const doubtRecorderRef = useRef<MediaRecorder | null>(null);
  const doubtStreamRef = useRef<MediaStream | null>(null);
  const doubtChunksRef = useRef<Blob[]>([]);
  const serverPausedForDoubtRef = useRef(false);
  const avatarEndCalledRef = useRef(false);
  const sessionId = String(chapter?.session_id || chapter?.sessionId || "");

  // Track task states for each slide
  const [taskStates, setTaskStates] = useState<Record<string, TaskState>>({});
  const [hasLastExplanationAudioStarted, setHasLastExplanationAudioStarted] = useState(false);

  const currentPhaseSlide: SlideData = lesson.slides[currentIndex] || lesson.slides[0];
  const currentSlide: SlideData =
    currentPhaseSlide?.segments?.[currentSegmentIndex] || currentPhaseSlide;
  currentSlideIdRef.current = currentSlide?.id || "";
  doubtOpenRef.current = doubtOpen;

  // Helper to retrieve current slide's task state
  const currentTaskState: TaskState = taskStates[currentSlide.id] || {
    isCompleted: false,
    selectedOptionIds: [],
  };
  const isExplanationSequence =
    currentPhaseSlide?.phase === "explanation" && Boolean(currentPhaseSlide.segments?.length);
  const explanationSegmentCount = currentPhaseSlide.segments?.length || 0;
  const isLastExplanationSegment =
    isExplanationSequence && currentSegmentIndex === explanationSegmentCount - 1;

  // Avatar speech bubble message
  const [avatarSpeech, setAvatarSpeech] = useState<string>(
    currentSlide.avatarMessage?.initial || "Let's explore this concept together!"
  );

  const getVoiceAudioUrl = (audio: SlideData["audio"], voiceType = avatarType) =>
    voiceType === "female"
      ? audio?.female || audio?.male || ""
      : audio?.male || audio?.female || "";
  const getSlideAudioUrl = (slide = currentSlide, voiceType = avatarType) =>
    getVoiceAudioUrl(slide?.introNarration?.[0]?.audio || slide?.questionAudio || slide?.audio, voiceType);
  const speechSupported = Boolean(getSlideAudioUrl());

  const buildSlideNarration = (slide: SlideData, teacherMessage?: string, includeIntro = false) => {
    const parts: string[] = [];
    const pushText = (value?: string) => {
      const safe = value?.replace(/\s+/g, " ").trim();
      if (safe && !parts.includes(safe)) parts.push(safe);
    };

    if (includeIntro) {
      pushText("Hello! I am your AI teacher. Let's learn this slide together.");
    }
    pushText(slide.badge?.label);
    pushText(slide.title);
    pushText(slide.subtitle);
    pushText(slide.description);
    pushText(slide.question);
    pushText(slide.content);

    slide.options?.forEach((option) => {
      pushText(`${option.label ? `${option.label}. ` : ""}${option.title}`);
      pushText(option.description);
      pushText(option.explanation);
    });

    slide.instructions?.forEach((instruction, index) => {
      pushText(`${index + 1}. ${instruction}`);
    });

    slide.clues?.forEach((clue) => {
      pushText(`Clue ${clue.number}: ${clue.text}`);
    });

    if (slide.images?.comparison) {
      pushText(slide.images.comparison.beforeTitle);
      pushText(slide.images.comparison.beforeSubtitle);
      pushText(slide.images.comparison.afterTitle);
      pushText(slide.images.comparison.afterSubtitle);
    }

    slide.images?.items?.forEach((item) => {
      pushText(item.name);
      pushText(item.subtext);
    });

    pushText(teacherMessage);

    return parts.join(". ");
  };

  const getCoreInsight = (slide: SlideData) => {
    const title =
      slide.takeaway?.label ||
      slide.callout?.title ||
      (slide.takeaway?.text || slide.callout?.text ? "Core Insight" : "");
    const text = slide.takeaway?.text || slide.callout?.text || "";

    if (!text.trim()) return null;

    return {
      title: title.trim() || "Core Insight",
      text: text.trim(),
    };
  };

  const speakCoreInsight = (slide = currentSlide) => {
    const insight = getCoreInsight(slide);
    if (!insight) return;

    setShowInsightModal(true);
    speakAvatarText(`Core insight. ${insight.title}. ${insight.text}`, avatarType, "insight");
  };

  const cancelAutoAdvance = () => {
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  };

  const stopAvatarSpeech = () => {
    narrationModeRef.current = null;
    if (lessonAudioRef.current) {
      lessonAudioRef.current.pause();
      lessonAudioRef.current.onended = null;
      lessonAudioRef.current.onerror = null;
      lessonAudioRef.current = null;
    }
    setIsAvatarSpeaking(false);
    setIsAvatarPaused(false);
    setPlaybackState("idle");
  };

  const scheduleAutoAdvance = (delay = 2000) => {
    cancelAutoAdvance();
    if (doubtOpenRef.current) return;
    setPlaybackState("ready");
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      autoAdvanceTimerRef.current = null;
      if (!doubtOpenRef.current) {
        setPlaybackState("advancing");
        advanceRef.current();
      }
    }, delay);
  };

  const playVoiceAudio = (
    audioSource: SlideData["audio"],
    voiceType = avatarType,
    mode: NarrationMode = "slide",
    onEnded?: () => void,
  ) => {
    const audioUrl = getVoiceAudioUrl(audioSource, voiceType);
    if (!audioUrl) {
      onEnded?.();
      return false;
    }
    stopAvatarSpeech();
    narrationModeRef.current = mode;
    setIsAvatarPaused(false);
    const slideId = currentSlideIdRef.current;
    const audio = new Audio(audioUrl);
    let hasFinished = false;
    const finishPlayback = () => {
      if (hasFinished) return;
      hasFinished = true;
      if (slideId === currentSlideIdRef.current) onEnded?.();
    };
    audio.preload = "auto";
    lessonAudioRef.current = audio;
    audio.onplay = () => {
      setIsAvatarSpeaking(true);
      setIsAvatarPaused(false);
      setPlaybackState(mode === "feedback" ? "feedback" : "narrating");
      if (mode === "slide" && isLastExplanationSegment) {
        setHasLastExplanationAudioStarted(true);
      }
    };
    audio.onended = () => {
      setIsAvatarSpeaking(false);
      setIsAvatarPaused(false);
      lessonAudioRef.current = null;
      narrationModeRef.current = null;
      setPlaybackState("awaiting_action");
      finishPlayback();
    };
    audio.onerror = () => {
      setIsAvatarSpeaking(false);
      setIsAvatarPaused(false);
      lessonAudioRef.current = null;
      narrationModeRef.current = null;
      setPlaybackState("awaiting_action");
      finishPlayback();
    };
    audio.play().catch(() => {
      setIsAvatarSpeaking(false);
      setIsAvatarPaused(true);
      setPlaybackState("paused");
      if (mode === "feedback") finishPlayback();
    });
    return true;
  };

  const playNarrationSequence = (
    cues: NarrationCue[] = [],
    mode: NarrationMode = "slide",
    onEnded?: () => void,
  ) => {
    const sequence = cues.filter((cue) => Boolean(cue?.text || getVoiceAudioUrl(cue?.audio)));
    const playAt = (index: number) => {
      const cue = sequence[index];
      if (!cue) {
        onEnded?.();
        return;
      }
      activeNarrationCueRef.current = cue;
      if (cue.text) setAvatarSpeech(cue.text);
      playVoiceAudio(cue.audio, avatarType, mode, () => playAt(index + 1));
    };
    playAt(0);
  };

  const speakAvatarText = (
    text = buildSlideNarration(currentSlide, avatarSpeech),
    voiceType = avatarType,
    mode: NarrationMode = "slide",
  ) => {
    if (mode === "insight") setShowInsightModal(true);
    if (mode !== "slide") return;
    const activeCue = activeNarrationCueRef.current;
    playVoiceAudio(activeCue?.audio || currentSlide.questionAudio || currentSlide.audio, voiceType, mode, () => {
      narrationEndedRef.current();
    });
  };

  const handleAvatarPlayStop = () => {
    if (isAvatarSpeaking) {
      stopAvatarSpeech();
    } else {
      speakAvatarText();
    }
  };

  const handleAvatarPauseResume = () => {
    const audio = lessonAudioRef.current;
    if (!audio) {
      speakAvatarText();
      return;
    }
    if (audio.paused) {
      audio.play().catch(() => undefined);
      setIsAvatarPaused(false);
      setPlaybackState(narrationModeRef.current === "feedback" ? "feedback" : "narrating");
    } else {
      audio.pause();
      setIsAvatarPaused(true);
      setPlaybackState("paused");
    }
  };

  const handleAvatarRepeat = () => {
    speakAvatarText();
  };

  const handleAvatarTypeChange = (type: "male" | "female") => {
    setAvatarType(type);
    if (isAvatarSpeaking || isAvatarPaused) {
      speakAvatarText(buildSlideNarration(currentSlide, avatarSpeech), type);
    }
  };

  const closeInsightModal = () => {
    setShowInsightModal(false);
    if (narrationModeRef.current === "insight") {
      stopAvatarSpeech();
    }
  };

  const pauseForDoubt = () => {
    cancelAutoAdvance();
    serverPausedForDoubtRef.current = false;
    const audio = lessonAudioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
      setIsAvatarPaused(true);
      setPlaybackState("paused");
    }
    setDoubtOpen(true);
  };

  const resumeAfterDoubt = () => {
    const shouldResumeServer = serverPausedForDoubtRef.current;
    serverPausedForDoubtRef.current = false;
    setDoubtOpen(false);
    const audio = lessonAudioRef.current;
    if (audio?.paused) {
      audio.play().catch(() => undefined);
      setIsAvatarPaused(false);
    } else if (
      currentTaskState.isCompleted &&
      currentSlide.task.type === "narration"
    ) {
      scheduleAutoAdvance();
    }
    if (sessionId && shouldResumeServer) {
      void resumeAvatarSession({ sessionId }).catch(() => undefined);
    }
  };

  const submitDoubtText = async (value = doubtText) => {
    const question = value.trim();
    if (!sessionId || !question || isAskingDoubt) return;
    const messageId = Date.now();
    setDoubtChat((current) => [
      ...current,
      { id: `student-${messageId}`, role: "student", text: question },
    ]);
    setDoubtText("");
    setIsAskingDoubt(true);
    serverPausedForDoubtRef.current = true;
    try {
      const response = await raiseAvatarHand({
        sessionId,
        studentDoubt: question,
        segmentId: currentSlide.segmentId || currentSlide.id,
      });
      const clarificationSegments = Array.isArray(response?.clarification?.segments)
        ? response.clarification.segments
        : Array.isArray(response?.segments)
          ? response.segments
          : [];
      const answer = clarificationSegments
        .map((segment: any) => String(segment?.text || segment?.content || "").trim())
        .filter(Boolean)
        .join(" ") || String(response?.message || "I could not prepare a clarification for that yet.");
      setDoubtChat((current) => [
        ...current,
        { id: `ai-${messageId}`, role: "ai", text: answer },
      ]);
    } catch (error: any) {
      setDoubtChat((current) => [
        ...current,
        { id: `ai-${messageId}-error`, role: "ai", text: error?.message || "Unable to answer this doubt right now." },
      ]);
    } finally {
      setIsAskingDoubt(false);
    }
  };

  const startDoubtRecording = async () => {
    if (isRecordingDoubt || isTranscribingDoubt || isAskingDoubt) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      doubtStreamRef.current = stream;
      doubtRecorderRef.current = recorder;
      doubtChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size) doubtChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const chunks = [...doubtChunksRef.current];
        doubtStreamRef.current?.getTracks().forEach((track) => track.stop());
        doubtStreamRef.current = null;
        doubtRecorderRef.current = null;
        doubtChunksRef.current = [];
        setIsRecordingDoubt(false);
        if (!chunks.length) return;
        setIsTranscribingDoubt(true);
        try {
          const result = await transcribeDebateAudio(
            new Blob(chunks, { type: recorder.mimeType || "audio/webm" }),
            "en",
          );
          const transcript = String(result?.text || result?.transcript || "").trim();
          if (transcript) await submitDoubtText(transcript);
        } finally {
          setIsTranscribingDoubt(false);
        }
      };
      recorder.start();
      setIsRecordingDoubt(true);
    } catch {
      doubtStreamRef.current?.getTracks().forEach((track) => track.stop());
      setIsRecordingDoubt(false);
    }
  };

  const stopDoubtRecording = () => {
    if (doubtRecorderRef.current?.state === "recording") doubtRecorderRef.current.stop();
  };

  const endLessonSession = async () => {
    if (!sessionId || avatarEndCalledRef.current || endedAvatarSessions.has(sessionId)) return;
    avatarEndCalledRef.current = true;
    endedAvatarSessions.add(sessionId);
    try {
      await endAvatarSession({ sessionId });
    } catch {}
  };

  const endLessonSessionKeepalive = () => {
    if (!sessionId || avatarEndCalledRef.current || endedAvatarSessions.has(sessionId)) return;
    avatarEndCalledRef.current = true;
    endedAvatarSessions.add(sessionId);
    void endAvatarSessionKeepalive({ sessionId });
  };

  const handleExitToUnits = async () => {
    cancelAutoAdvance();
    stopAvatarSpeech();
    await endLessonSession();
    onBackToUnits();
  };

  const handleFinishLesson = async () => {
    cancelAutoAdvance();
    stopAvatarSpeech();
    await endLessonSession();
    if (onLessonFinish) onLessonFinish();
    else onBackToUnits();
  };

  useEffect(() => {
    setCurrentIndex(0);
    setCurrentSegmentIndex(0);
    setPlaybackState("idle");
    setDirection("next");
    setIsNavigating(false);
    setShowCelebration(false);
    setCelebrationTone("success");
    setShowInsightModal(false);
    setTaskStates({});
    setHasLastExplanationAudioStarted(false);
    cancelAutoAdvance();
    setAvatarSpeech(lesson.slides[0]?.avatarMessage?.initial || "Let's explore this concept together!");
    stopAvatarSpeech();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  useEffect(() => {
    setHasLastExplanationAudioStarted(false);
  }, [lesson.id, currentIndex]);

  useEffect(() => {
    const introNarration = currentSlide.introNarration || [];
    if (introNarration.length > 0) {
      const timer = window.setTimeout(() => {
        playNarrationSequence(introNarration, "slide", () => narrationEndedRef.current());
      }, 420);
      return () => window.clearTimeout(timer);
    }

    activeNarrationCueRef.current = {
      id: currentSlide.segmentId || currentSlide.id,
      text: currentSlide.avatarMessage?.initial,
      emotion: currentSlide.emotion,
      audio: currentSlide.questionAudio || currentSlide.audio,
    };
    if (!getSlideAudioUrl(currentSlide, avatarType)) {
      if (isLastExplanationSegment) setHasLastExplanationAudioStarted(true);
      if (currentSlide.task.type !== "narration") return;
      const completionTimer = window.setTimeout(() => narrationEndedRef.current(), 350);
      return () => window.clearTimeout(completionTimer);
    }

    const timer = window.setTimeout(() => {
      speakAvatarText("", avatarType);
    }, 420);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide.id, avatarType]);

  useEffect(() => {
    const nextSlide =
      currentPhaseSlide.segments?.[currentSegmentIndex + 1] ||
      lesson.slides[currentIndex + 1]?.segments?.[0] ||
      lesson.slides[currentIndex + 1];
    const nextUrl = nextSlide ? getSlideAudioUrl(nextSlide, avatarType) : "";
    if (!nextUrl) return undefined;
    const preload = new Audio();
    preload.preload = "auto";
    preload.src = nextUrl;
    preload.load();
    return () => {
      preload.removeAttribute("src");
      preload.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentSegmentIndex, avatarType, lesson.id]);

  useEffect(() => {
    if (!sessionId) return undefined;
    avatarEndCalledRef.current = endedAvatarSessions.has(sessionId);
    const pendingTimer = pendingAvatarEndTimers.get(sessionId);
    if (pendingTimer !== undefined) {
      window.clearTimeout(pendingTimer);
      pendingAvatarEndTimers.delete(sessionId);
    }
    const handlePageExit = () => endLessonSessionKeepalive();
    window.addEventListener("pagehide", handlePageExit);
    window.addEventListener("beforeunload", handlePageExit);

    return () => {
      window.removeEventListener("pagehide", handlePageExit);
      window.removeEventListener("beforeunload", handlePageExit);
      stopAvatarSpeech();
      cancelAutoAdvance();
      doubtStreamRef.current?.getTracks().forEach((track) => track.stop());
      const timer = window.setTimeout(() => {
        pendingAvatarEndTimers.delete(sessionId);
        if (!endedAvatarSessions.has(sessionId)) {
          endedAvatarSessions.add(sessionId);
          void endAvatarSession({ sessionId });
        }
      }, 0);
      pendingAvatarEndTimers.set(sessionId, timer);
    };
    // Deferred cleanup is cancelled by StrictMode's immediate effect replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Update avatar message whenever slide changes
  useEffect(() => {
    const slide = currentSlide;
    if (slide) {
      const state = taskStates[slide.id];
      if (state?.isFeedbackPlaying) {
        return;
      } else if (state?.isCompleted && slide.avatarMessage?.completed) {
        setAvatarSpeech(slide.avatarMessage.completed);
      } else {
        setAvatarSpeech(slide.avatarMessage?.initial || "Think about it and give it a try!");
      }
    }
  }, [currentSlide, taskStates]);

  // Mark task completed for current slide
  const handleCompleteCurrentTask = (
    customFeedback?: string,
    options?: {
      isCorrect?: boolean;
      tone?: "success" | "error" | "neutral";
      autoAdvance?: boolean;
    },
  ) => {
    if (currentTaskState.isCompleted) return;
    stopAvatarSpeech();

    const safeFeedback = typeof customFeedback === "string" ? customFeedback : undefined;
    const feedbackText = safeFeedback || "Great job!";
    const celebrationText = safeFeedback || "Activity Complete! Next Unlocked";
    const tone = options?.tone || (options?.isCorrect === false ? "error" : "success");
    const completionNarration = currentSlide.completionNarration || [];

    setTaskStates((prev) => ({
      ...prev,
      [currentSlide.id]: {
        ...(prev[currentSlide.id] || { selectedOptionIds: [] }),
        isCompleted: true,
        isCorrect: options?.isCorrect,
        isFeedbackPlaying: completionNarration.length > 0,
        feedbackMessage: feedbackText,
      },
    }));

    if (tone === "error" && currentSlide.avatarMessage?.error) {
      setAvatarSpeech(currentSlide.avatarMessage.error);
    } else if (currentSlide.avatarMessage?.completed) {
      setAvatarSpeech(currentSlide.avatarMessage.completed);
    }

    setCelebrationMsg(celebrationText);
    setCelebrationTone(tone);
    setShowCelebration(true);
    const finishCompletion = () => {
      setTaskStates((previous) => ({
        ...previous,
        [currentSlide.id]: {
          ...(previous[currentSlide.id] || { selectedOptionIds: [], isCompleted: true }),
          isFeedbackPlaying: false,
        },
      }));
      if (options?.autoAdvance !== false) scheduleAutoAdvance();
    };
    if (completionNarration.length > 0) {
      playNarrationSequence(completionNarration, "feedback", finishCompletion);
    } else if (options?.autoAdvance !== false) {
      scheduleAutoAdvance();
    }
  };

  const handleSelectOptionForSlide = (targetSlide: SlideData, optionId: string) => {
    const targetState = taskStates[targetSlide.id] || { isCompleted: false, selectedOptionIds: [] };
    if (targetState.isCompleted || targetState.isFeedbackPlaying) return;
    cancelAutoAdvance();
    stopAvatarSpeech();
    const selectedOption = targetSlide.options?.find((option) => option.id === optionId);
    const resolution = targetSlide.resolutions?.[optionId];
    const correctOption = targetSlide.options?.find((option) => option.isCorrect);
    const hasCorrectAnswer = Boolean(correctOption);
    const isCorrect = hasCorrectAnswer ? Boolean(selectedOption?.isCorrect) : undefined;
    const isHookPrediction = targetSlide.phase === "hook" && hasCorrectAnswer;
    const resolutionAudio = resolution?.audio || selectedOption?.audio;
    const completionNarration = targetSlide.completionNarration || [];
    const feedbackMessage = isCorrect === undefined
      ? "Prediction saved. Let's test it in the lesson."
      : isCorrect
        ? "Correct! Nice thinking!"
        : "Not quite. Good try!";

    setTaskStates((prev) => ({
      ...prev,
      [targetSlide.id]: {
        ...(prev[targetSlide.id] || {}),
        selectedOptionIds: [optionId],
        isCompleted: true,
        isCorrect,
        revealedCorrectOptionId: undefined,
        isFeedbackPlaying: isHookPrediction || Boolean(resolutionAudio) || completionNarration.length > 0,
        feedbackMessage,
      },
    }));

    if (resolution?.text) {
      setAvatarSpeech(resolution.text);
    } else if (isCorrect === false && targetSlide.avatarMessage?.error) {
      setAvatarSpeech(targetSlide.avatarMessage.error);
    } else if (targetSlide.avatarMessage?.completed) {
      setAvatarSpeech(targetSlide.avatarMessage.completed);
    }

    setCelebrationMsg(isCorrect === undefined ? feedbackMessage : isCorrect ? "Correct! Paper shower unlocked!" : "Oops, not quite. Try the next one!");
    setCelebrationTone(isCorrect === undefined ? "neutral" : isCorrect ? "success" : "error");
    setShowCelebration(true);
    const finishAllFeedback = () => {
      setTaskStates((previous) => ({
        ...previous,
        [targetSlide.id]: {
          ...(previous[targetSlide.id] || { selectedOptionIds: [optionId], isCompleted: true }),
          isFeedbackPlaying: false,
        },
      }));
    };
    const finishSelectedFeedback = () => {
      if (completionNarration.length > 0) {
        playNarrationSequence(completionNarration, "feedback", finishAllFeedback);
      } else {
        finishAllFeedback();
      }
    };

    if (isHookPrediction && isCorrect === false && correctOption) {
      playVoiceAudio(resolutionAudio, avatarType, "feedback", () => {
        const correctResolution = targetSlide.resolutions?.[correctOption.id];
        setTaskStates((previous) => ({
          ...previous,
          [targetSlide.id]: {
            ...(previous[targetSlide.id] || { selectedOptionIds: [optionId], isCompleted: true }),
            revealedCorrectOptionId: correctOption.id,
            isFeedbackPlaying: true,
            feedbackMessage: "Here is the correct answer and explanation.",
          },
        }));
        setAvatarSpeech(correctResolution?.text || correctOption.explanation || targetSlide.avatarMessage?.completed || "");
        playVoiceAudio(correctResolution?.audio || correctOption.audio, avatarType, "feedback", finishSelectedFeedback);
      });
      return;
    }

    if (resolutionAudio) {
      playVoiceAudio(
        resolutionAudio,
        avatarType,
        "feedback",
          finishSelectedFeedback,
        );
    } else if (isHookPrediction || completionNarration.length > 0) {
      finishSelectedFeedback();
    }
  };

  // Single option selection (e.g. Think slide)
  const handleSelectOption = (optionId: string) => {
    handleSelectOptionForSlide(currentSlide, optionId);
  };

  const handleExplanationOptionSelect = (segmentIndex: number, optionId: string) => {
    const segment = currentPhaseSlide.segments?.[segmentIndex];
    if (!segment) return;
    if (segmentIndex !== currentSegmentIndex) {
      cancelAutoAdvance();
      stopAvatarSpeech();
      setCurrentSegmentIndex(segmentIndex);
    }
    handleSelectOptionForSlide(segment, optionId);
  };

  const revealNextExplanationSegment = () => {
    if (!isExplanationSequence || isLastExplanationSegment || isNavigating) return;
    if (currentSlide.task.type !== "narration" && !currentTaskState.isCompleted) return;
    cancelAutoAdvance();
    stopAvatarSpeech();
    setTaskStates((previous) => ({
      ...previous,
      [currentSlide.id]: {
        ...(previous[currentSlide.id] || { selectedOptionIds: [] }),
        selectedOptionIds: previous[currentSlide.id]?.selectedOptionIds || [],
        isCompleted: true,
        feedbackMessage: "Segment completed.",
      },
    }));
    setShowCelebration(false);
    setPlaybackState("advancing");
    setCurrentSegmentIndex((previous) => previous + 1);
  };

  // Multi-option toggle (e.g. Apply slide)
  const handleToggleOption = (optionId: string) => {
    setTaskStates((prev) => {
      const previousState = prev[currentSlide.id] || {
        isCompleted: false,
        selectedOptionIds: [],
      };
      const existing = previousState.selectedOptionIds;
      const updated = existing.includes(optionId)
        ? existing.filter((id) => id !== optionId)
        : [...existing, optionId];

      return {
        ...prev,
        [currentSlide.id]: {
          ...previousState,
          selectedOptionIds: updated,
        },
      };
    });
  };

  // Submit answer for Apply slide
  const handleSubmitAnswer = () => {
    const selected = currentTaskState.selectedOptionIds;
    if (selected.length === 0) return;

    const correct = currentSlide.options?.filter((o) => o.isCorrect).map((o) => o.id) || [];
    const selectedCorrect = selected.filter((id) => correct.includes(id));
    const selectedWrong = selected.filter((id) => !correct.includes(id));
    const isSuccess =
      correct.length > 0 &&
      selectedCorrect.length === correct.length &&
      selectedWrong.length === 0;

    handleCompleteCurrentTask(
      isSuccess
        ? "Correct! Great thinking!"
        : "Not quite. Review the options and keep going.",
      {
        isCorrect: isSuccess,
        tone: isSuccess ? "success" : "error",
        autoAdvance: false,
      },
    );
  };

  // Text explanation submitted for Teach It Back slide
  const handleSubmitText = (text: string) => {
    if (currentTaskState.isCompleted) return;

    setTaskStates((prev) => ({
      ...prev,
      [currentSlide.id]: {
        ...(prev[currentSlide.id] || { selectedOptionIds: [] }),
        submittedText: text,
        selectedOptionIds: prev[currentSlide.id]?.selectedOptionIds || [],
        isCompleted: true,
        isFeedbackPlaying: Boolean(currentSlide.completionNarration?.length),
        feedbackMessage: "Explanation Submitted! Great synthesis!",
      },
    }));

    if (currentSlide.avatarMessage?.completed) {
      setAvatarSpeech(currentSlide.avatarMessage.completed);
    }

    setCelebrationMsg("Explanation Submitted! Great synthesis!");
    setCelebrationTone("success");
    setShowCelebration(true);
    if (currentSlide.completionNarration?.length) {
      playNarrationSequence(currentSlide.completionNarration, "feedback", () => {
        setTaskStates((previous) => ({
          ...previous,
          [currentSlide.id]: {
            ...(previous[currentSlide.id] || { selectedOptionIds: [], isCompleted: true }),
            isFeedbackPlaying: false,
          },
        }));
      });
    }
  };

  // Voice explanation recorded for Teach It Back slide
  const handleRecordVoice = () => {
    if (currentTaskState.isCompleted) return;

    setTaskStates((prev) => ({
      ...prev,
      [currentSlide.id]: {
        ...(prev[currentSlide.id] || { selectedOptionIds: [] }),
        selectedOptionIds: prev[currentSlide.id]?.selectedOptionIds || [],
        isVoiceRecorded: true,
        isCompleted: true,
        isFeedbackPlaying: Boolean(currentSlide.completionNarration?.length),
        feedbackMessage: "Voice Explanation Recorded!",
      },
    }));

    if (currentSlide.avatarMessage?.completed) {
      setAvatarSpeech(currentSlide.avatarMessage.completed);
    }

    setCelebrationMsg("Voice Explanation Recorded!");
    setCelebrationTone("success");
    setShowCelebration(true);
    if (currentSlide.completionNarration?.length) {
      playNarrationSequence(currentSlide.completionNarration, "feedback", () => {
        setTaskStates((previous) => ({
          ...previous,
          [currentSlide.id]: {
            ...(previous[currentSlide.id] || { selectedOptionIds: [], isCompleted: true }),
            isFeedbackPlaying: false,
          },
        }));
      });
    }
  };

  // Navigate to next slide
  const handleNext = () => {
    if (isNavigating) return;

    cancelAutoAdvance();
    setShowCelebration(false);
    setShowInsightModal(false);
    stopAvatarSpeech();

    if (
      currentPhaseSlide.segments?.length &&
      currentSegmentIndex < currentPhaseSlide.segments.length - 1
    ) {
      setPlaybackState("advancing");
      setCurrentSegmentIndex((previous) => previous + 1);
      return;
    }

    if (currentIndex < lesson.slides.length - 1) {
      setIsNavigating(true);
      setPlaybackState("advancing");
      setDirection("next");
      setCurrentSegmentIndex(0);
      setCurrentIndex((prev) => prev + 1);
      setTimeout(() => setIsNavigating(false), shouldReduceMotion ? 80 : 360);
    } else {
      // Last slide reached
      void handleFinishLesson();
    }
  };

  // Navigate to previous slide
  const handlePrevious = () => {
    if (isNavigating) return;
    if (!isExplanationSequence && currentSegmentIndex > 0) {
      cancelAutoAdvance();
      setShowCelebration(false);
      setShowInsightModal(false);
      stopAvatarSpeech();
      setPlaybackState("advancing");
      setCurrentSegmentIndex((previous) => previous - 1);
      return;
    }
    if (currentIndex > 0) {
      cancelAutoAdvance();
      setShowCelebration(false);
      setShowInsightModal(false);
      stopAvatarSpeech();
      setIsNavigating(true);
      setPlaybackState("advancing");
      setDirection("prev");
      setCurrentSegmentIndex(0);
      setCurrentIndex((prev) => prev - 1);
      setTimeout(() => setIsNavigating(false), shouldReduceMotion ? 80 : 360);
    }
  };

  advanceRef.current = handleNext;
  narrationEndedRef.current = () => {
    if (currentSlide.task.type !== "narration") return;
    if (isExplanationSequence) {
      if (!currentTaskState.isCompleted) {
        setTaskStates((previous) => ({
          ...previous,
          [currentSlide.id]: {
            ...(previous[currentSlide.id] || { selectedOptionIds: [] }),
            selectedOptionIds: previous[currentSlide.id]?.selectedOptionIds || [],
            isCompleted: true,
            feedbackMessage: "Narration complete.",
          },
        }));
      }
      if (isLastExplanationSegment) {
        setPlaybackState("ready");
      } else {
        scheduleAutoAdvance(450);
      }
      return;
    }
    if (currentTaskState.isCompleted) {
      scheduleAutoAdvance();
      return;
    }
    handleCompleteCurrentTask("Narration complete.", { tone: "neutral" });
  };

  const currentCoreInsight = getCoreInsight(currentSlide);

  return (
    <div
      data-playback-state={playbackState}
      className="fixed inset-0 z-40 h-[100dvh] max-h-[100dvh] w-screen flex flex-col bg-[#fbfcff] dark:bg-[#071126] text-slate-900 dark:text-slate-100 overflow-hidden p-2 sm:p-3 selection:bg-sky-500 selection:text-white"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
          @keyframes guFloatSoft { 0%, 100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(0,-8px,0); } }
          @keyframes guShine { 0% { transform: translateX(-130%) rotate(18deg); } 45%, 100% { transform: translateX(220%) rotate(18deg); } }
          @keyframes guPulseRing { 0%, 100% { box-shadow: 0 0 0 0 rgba(14,165,233,.28); } 50% { box-shadow: 0 0 0 9px rgba(14,165,233,0); } }
          @keyframes guAvatarBreathe { 0%, 100% { transform: translate3d(0,0,0) scale(var(--avatar-scale, 1)); } 50% { transform: translate3d(0,-8px,0) scale(calc(var(--avatar-scale, 1) * 1.02)); } }
          @keyframes guActiveStep { 0%, 100% { transform: scale(1.08); filter: brightness(1); } 50% { transform: scale(1.18); filter: brightness(1.14); } }
          @keyframes guUnlockStep { 0% { transform: scale(.72) rotate(-12deg); opacity: .55; filter: brightness(.72); } 58% { transform: scale(1.2) rotate(5deg); opacity: 1; filter: brightness(1.25); } 100% { transform: scale(1) rotate(0deg); opacity: 1; filter: brightness(1); } }
          @keyframes guUnlockRipple { 0% { opacity: .85; transform: scale(.72); } 100% { opacity: 0; transform: scale(1.8); } }
          @keyframes guAurora {
            0%, 100% { transform: translate3d(-2%, -1%, 0) scale(1); opacity: .82; }
            50% { transform: translate3d(2%, 2%, 0) scale(1.04); opacity: 1; }
          }
          @keyframes guDrift {
            0% { transform: translate3d(0, 0, 0) rotate(0deg); }
            50% { transform: translate3d(18px, -16px, 0) rotate(4deg); }
            100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          }
          @keyframes guGridMove {
            0% { background-position: 0 0; }
            100% { background-position: 52px 52px; }
          }
          @keyframes guCardBreathe {
            0%, 100% { box-shadow: 0 24px 70px rgba(2, 8, 23, .24); }
            50% { box-shadow: 0 30px 90px rgba(14, 116, 144, .26); }
          }
          @keyframes guSparkleFloat {
            0%, 100% { transform: translateY(0) scale(1); opacity: .28; }
            50% { transform: translateY(-12px) scale(1.08); opacity: .62; }
          }
          .gu-slide-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(249, 115, 22, 0.55) transparent;
          }
          .gu-slide-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .gu-slide-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .gu-slide-scroll::-webkit-scrollbar-thumb {
            background: rgba(249, 115, 22, 0.42);
            border-radius: 999px;
          }
          .gu-slide-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(249, 115, 22, 0.65);
          }
          .gu-slide-scroll h1 {
            font-size: clamp(1.55rem, 2.45vw, 2.65rem) !important;
            line-height: 1.12 !important;
            font-weight: 800 !important;
            letter-spacing: 0 !important;
          }
          .gu-slide-scroll h2 {
            font-size: clamp(1.08rem, 1.55vw, 1.5rem) !important;
            line-height: 1.25 !important;
            font-weight: 800 !important;
            letter-spacing: 0 !important;
          }
          .gu-slide-scroll h3 {
            font-size: clamp(1rem, 1.35vw, 1.2rem) !important;
            font-weight: 800 !important;
            letter-spacing: 0 !important;
          }
          .gu-slide-scroll p,
          .gu-slide-scroll li {
            font-size: clamp(.78rem, .95vw, .95rem) !important;
            line-height: 1.55 !important;
          }
          .gu-slide-scroll button,
          .gu-slide-scroll input,
          .gu-slide-scroll textarea {
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
          }
          .dark .gu-slide-scroll h1,
          .dark .gu-slide-scroll h2,
          .dark .gu-slide-scroll h3,
          .dark .gu-slide-scroll h4 {
            color: #f8fbff !important;
            text-shadow: 0 1px 18px rgba(56, 189, 248, .12);
          }
          .dark .gu-slide-scroll p,
          .dark .gu-slide-scroll li,
          .dark .gu-slide-scroll [class*="text-slate-600"],
          .dark .gu-slide-scroll [class*="text-slate-700"],
          .dark .gu-slide-scroll [class*="text-slate-800"] {
            color: rgba(226, 242, 255, .86) !important;
          }
          .dark .gu-slide-scroll [class*="text-slate-400"],
          .dark .gu-slide-scroll [class*="text-slate-500"] {
            color: rgba(186, 219, 255, .72) !important;
          }
          .dark .gu-slide-scroll [class~="bg-white"],
          .dark .gu-slide-scroll [class~="bg-slate-50"],
          .dark .gu-slide-scroll [class~="bg-slate-50/70"],
          .dark .gu-slide-scroll [class~="bg-slate-50/80"],
          .dark .gu-slide-scroll [class~="bg-slate-100"],
          .dark .gu-slide-scroll [class*="dark:bg-[#151f3e]"],
          .dark .gu-slide-scroll [class*="dark:bg-slate-900"] {
            background:
              radial-gradient(circle at 12% 10%, rgba(56,189,248,.16), transparent 30%),
              radial-gradient(circle at 88% 90%, rgba(129,140,248,.14), transparent 32%),
              linear-gradient(135deg, rgba(18,40,104,.88), rgba(16,25,78,.78)) !important;
            border-color: rgba(125, 211, 252, .22) !important;
            color: #eaf6ff !important;
            box-shadow: 0 12px 26px rgba(0, 0, 0, .22), inset 0 1px 0 rgba(255,255,255,.06) !important;
          }
          .dark .gu-slide-scroll [class*="border-slate-200"],
          .dark .gu-slide-scroll [class*="border-white/10"] {
            border-color: rgba(125, 211, 252, .22) !important;
          }
          .dark .gu-slide-scroll [class*="bg-blue-50"],
          .dark .gu-slide-scroll [class*="bg-blue-950"] {
            background: linear-gradient(135deg, rgba(14,165,233,.20), rgba(59,130,246,.14)) !important;
            border-color: rgba(56,189,248,.30) !important;
            color: #dff6ff !important;
          }
          .dark .gu-slide-scroll [class*="bg-emerald-50"],
          .dark .gu-slide-scroll [class*="bg-emerald-950"] {
            background: linear-gradient(135deg, rgba(16,185,129,.20), rgba(20,184,166,.12)) !important;
            border-color: rgba(110,231,183,.28) !important;
            color: #dcfff2 !important;
          }
          .dark .gu-slide-scroll [class*="bg-amber-50"],
          .dark .gu-slide-scroll [class*="bg-amber-950"] {
            background: linear-gradient(135deg, rgba(245,158,11,.22), rgba(249,115,22,.13)) !important;
            border-color: rgba(251,191,36,.30) !important;
            color: #fff2cc !important;
          }
          .gu-shell-bg {
            background:
              radial-gradient(circle at 14% 9%, rgba(126,87,255,.10), transparent 26%),
              radial-gradient(circle at 88% 14%, rgba(255,171,64,.14), transparent 25%),
              radial-gradient(circle at 8% 86%, rgba(16,185,129,.12), transparent 23%),
              linear-gradient(180deg,#fbfcff 0%,#f5f7ff 100%);
            animation: guAurora 9s ease-in-out infinite;
          }
          .dark .gu-shell-bg {
            background:
              radial-gradient(circle at 3% 96%, rgba(249,115,22,.34), transparent 18%),
              radial-gradient(circle at 98% 8%, rgba(168,85,247,.34), transparent 20%),
              radial-gradient(circle at 86% 48%, rgba(34,211,238,.18), transparent 24%),
              radial-gradient(circle at 12% 16%, rgba(99,102,241,.18), transparent 24%),
              linear-gradient(135deg,#070d22 0%,#09152c 42%,#0a1832 70%,#120c2d 100%);
          }
          .gu-grid-layer {
            background-image:
              linear-gradient(rgba(251,146,60,.09) 1px, transparent 1px),
              linear-gradient(90deg, rgba(14,165,233,.06) 1px, transparent 1px);
            background-size: 52px 52px;
            mask-image: radial-gradient(circle at 50% 42%, black, transparent 72%);
            animation: guGridMove 18s linear infinite;
          }
          .gu-floating-chip {
            animation: guSparkleFloat 5.8s ease-in-out infinite;
          }
          .gu-organic-leaf {
            border-radius: 58% 42% 52% 48% / 44% 54% 46% 56%;
            filter: blur(.2px);
            animation: guFloatSoft 6s ease-in-out infinite;
          }
          .dark .gu-grid-layer {
            background-image:
              linear-gradient(rgba(148,163,184,.075) 1px, transparent 1px),
              linear-gradient(90deg, rgba(148,163,184,.06) 1px, transparent 1px);
          }
        `}
      </style>
      <div
        className="gu-shell-bg absolute inset-0"
        aria-hidden="true"
      />
      <div className="gu-grid-layer absolute inset-0 opacity-55 dark:opacity-60 pointer-events-none" aria-hidden="true" />
      <div
        className="absolute inset-x-0 top-0 h-24 border-b border-white/50 dark:border-white/5 bg-white/25 dark:bg-transparent pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="gu-organic-leaf absolute -left-16 top-20 w-28 h-64 bg-emerald-500/18 dark:bg-violet-500/20 pointer-events-none"
        style={{ animation: shouldReduceMotion ? undefined : "guDrift 8s ease-in-out infinite" }}
        aria-hidden="true"
      />
      <div
        className="gu-organic-leaf absolute -bottom-20 -left-8 w-80 h-52 bg-rose-300/20 dark:bg-fuchsia-400/16 pointer-events-none"
        style={{ animation: shouldReduceMotion ? undefined : "guDrift 10s ease-in-out infinite reverse" }}
        aria-hidden="true"
      />
      <div className="gu-organic-leaf absolute -right-10 bottom-1 w-56 h-40 bg-emerald-400/16 dark:bg-fuchsia-400/18 pointer-events-none [animation-delay:1.3s]" aria-hidden="true" />
      <div className="gu-floating-chip absolute left-[32%] top-[40%] h-3 w-8 rounded-full bg-amber-400/80 shadow-[0_0_22px_rgba(251,191,36,.35)] dark:bg-amber-300/90 dark:shadow-[0_0_24px_rgba(251,191,36,.48)] pointer-events-none" aria-hidden="true" />
      <div className="gu-floating-chip absolute right-[17%] top-[25%] h-3 w-3 rounded-full bg-orange-300/65 shadow-[0_0_22px_rgba(253,186,116,.45)] pointer-events-none [animation-delay:1.4s]" aria-hidden="true" />
      <div className="gu-floating-chip absolute left-[42%] bottom-[14%] h-2.5 w-2.5 rounded-full bg-emerald-300/50 shadow-[0_0_18px_rgba(110,231,183,.45)] pointer-events-none [animation-delay:2.3s]" aria-hidden="true" />

      {/* Task Completion Celebration Animation */}
      <CompletionEffect
        active={showCelebration}
        message={celebrationMsg}
        tone={celebrationTone}
        onFinished={() => setShowCelebration(false)}
      />

      <AnimatePresence>
        {showInsightModal && currentCoreInsight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 backdrop-blur-md px-4 py-6"
            role="dialog"
            aria-modal="true"
            aria-label="Core insight flashcard"
          >
            <motion.div
              initial={{ opacity: 0, y: 34, scale: 0.9, rotateX: 8 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: 22, scale: 0.95, rotateX: -5 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="relative w-full max-w-3xl"
            >
              <div className="absolute -right-6 -bottom-10 hidden md:block">
                <AvatarTeacher
                  message="Here is the core insight."
                  avatarType={avatarType}
                  isSpeaking={isAvatarSpeaking}
                  isPaused={isAvatarPaused}
                  speechSupported={speechSupported}
                  showControls={false}
                  className="scale-75 origin-bottom-right"
                />
              </div>

              <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-2xl shadow-slate-950/30 dark:border-white/10 dark:bg-[#101b33]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_92%_88%,rgba(16,185,129,0.16),transparent_26%),linear-gradient(135deg,rgba(255,255,255,.92),rgba(239,246,255,.82))] dark:bg-[radial-gradient(circle_at_12%_8%,rgba(59,130,246,0.22),transparent_28%),radial-gradient(circle_at_92%_88%,rgba(16,185,129,0.12),transparent_26%),linear-gradient(135deg,rgba(15,23,42,.94),rgba(17,27,51,.88))] pointer-events-none" />
                <div
                  className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none dark:via-white/10"
                  style={{ animation: shouldReduceMotion ? undefined : "guShine 5.2s ease-in-out infinite" }}
                  aria-hidden="true"
                />

                <button
                  type="button"
                  onClick={closeInsightModal}
                  className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
                  title="Close insight"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="relative z-10 grid gap-5 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300">
                      <Lightbulb className="h-4 w-4 fill-amber-400 text-amber-500" />
                      <span>Core Insight</span>
                    </div>

                    <h3 className="text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">
                      {currentCoreInsight.title}
                    </h3>
                    <p className="mt-4 text-base font-semibold leading-relaxed text-slate-700 dark:text-slate-200 sm:text-lg">
                      {currentCoreInsight.text}
                    </p>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => speakCoreInsight(currentSlide)}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                      >
                        <Volume2 className="h-4 w-4" />
                        <span>Read Insight</span>
                      </button>
                      <button
                        type="button"
                        onClick={closeInsightModal}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                      >
                        Got it
                      </button>
                    </div>
                  </div>

                  <div className="md:hidden">
                    <AvatarTeacher
                      message="Core insight!"
                      avatarType={avatarType}
                      isSpeaking={isAvatarSpeaking}
                      isPaused={isAvatarPaused}
                      speechSupported={speechSupported}
                      showControls={false}
                      className="scale-75 origin-center"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar: Title, Slide Counter (e.g. 3 / 10), Progress Bar */}
      <SlideHeader
        lessonTitle={lesson.lessonTitle}
        subjectTitle={lesson.subject}
        currentIndex={currentIndex}
        totalSlides={lesson.totalSlides}
        isTaskCompleted={currentTaskState.isCompleted}
        avatarType={avatarType}
        onAvatarTypeChange={handleAvatarTypeChange}
        onBackToUnits={handleExitToUnits}
      />

      {/* Main Learning Slide Area */}
      <main className="flex-1 min-h-0 w-full max-w-[1560px] mx-auto px-10 sm:px-14 md:px-16 py-1 flex flex-col justify-center relative z-10">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.985 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.46, ease: [0.25, 1, 0.5, 1] }}
          className="relative w-full h-full min-h-0 rounded-[22px] sm:rounded-[28px] bg-white/88 dark:bg-[#0c1530]/88 border border-white/95 dark:border-violet-300/38 shadow-[0_18px_46px_rgba(35,44,87,.10)] dark:shadow-[0_28px_78px_rgba(0,0,0,.56),0_0_34px_-10px_rgba(34,211,238,.62),0_0_38px_-12px_rgba(168,85,247,.62),inset_0_1px_0_rgba(255,255,255,.08)] p-4 sm:p-5 md:p-6 xl:p-7 overflow-visible flex flex-col justify-center"
          style={{ animation: shouldReduceMotion ? undefined : "guCardBreathe 6s ease-in-out infinite" }}
        >
          <div className="absolute inset-0 overflow-hidden rounded-[22px] sm:rounded-[28px] pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_9%,rgba(251,191,36,0.14),transparent_26%),radial-gradient(circle_at_8%_88%,rgba(16,185,129,0.08),transparent_24%),linear-gradient(135deg,rgba(255,255,255,.90),rgba(247,250,255,.72))] dark:bg-[radial-gradient(circle_at_8%_5%,rgba(34,211,238,0.18),transparent_24%),radial-gradient(circle_at_88%_10%,rgba(236,72,153,0.18),transparent_25%),radial-gradient(circle_at_88%_92%,rgba(251,191,36,0.12),transparent_24%),linear-gradient(135deg,rgba(11,25,58,.86),rgba(9,15,38,.84))] pointer-events-none" />
          <div
            className="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"
            style={{ animation: shouldReduceMotion ? undefined : "guShine 6.5s ease-in-out infinite" }}
            aria-hidden="true"
          />
          </div>
          {/* Slide Motion Transition Wrapper */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentPhaseSlide.id}
              custom={direction}
              variants={shouldReduceMotion ? undefined : slideVariants}
              initial={shouldReduceMotion ? { opacity: 0 } : "enter"}
              animate={shouldReduceMotion ? { opacity: 1 } : "center"}
              exit={shouldReduceMotion ? { opacity: 0 } : "exit"}
              transition={shouldReduceMotion ? { duration: 0.08 } : undefined}
              className={`gu-slide-scroll relative z-10 h-full min-h-0 max-h-full w-full overflow-x-hidden overscroll-contain pr-1 md:pr-24 lg:pr-32 ${
                isExplanationSequence ? "overflow-y-hidden" : "overflow-y-auto"
              }`}
            >
              {isExplanationSequence ? (
                <ExplanationSlide
                  slide={currentPhaseSlide}
                  activeSegmentIndex={currentSegmentIndex}
                  taskStates={taskStates}
                  onSelectOption={handleExplanationOptionSelect}
                  onRevealNext={revealNextExplanationSegment}
                />
              ) : (
                <SlideRenderer
                  slide={currentSlide}
                  taskState={currentTaskState}
                  onCompleteTask={handleCompleteCurrentTask}
                  onSelectOption={handleSelectOption}
                  onToggleOption={handleToggleOption}
                  onSubmitAnswer={handleSubmitAnswer}
                  onSubmitText={handleSubmitText}
                  onRecordVoice={handleRecordVoice}
                  onFinishLesson={handleFinishLesson}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <motion.div
            drag
            dragMomentum={false}
            whileDrag={shouldReduceMotion ? undefined : { scale: 1.02, cursor: "grabbing" }}
            className="fixed right-[5vw] top-[34vh] z-40 origin-center cursor-grab touch-none"
            title="Drag avatar"
          >
            <div
              className="origin-center [--avatar-scale:.70] sm:[--avatar-scale:.82] md:[--avatar-scale:.95] lg:[--avatar-scale:1.04] xl:[--avatar-scale:1.12]"
              style={{ animation: shouldReduceMotion ? undefined : "guAvatarBreathe 4.8s ease-in-out infinite" }}
            >
              <AvatarTeacher
                message={avatarSpeech}
                avatarType={avatarType}
                isSpeaking={isAvatarSpeaking}
                isPaused={isAvatarPaused}
                speechSupported={speechSupported}
                onSpeak={handleAvatarPlayStop}
                onPauseResume={handleAvatarPauseResume}
                onRepeat={handleAvatarRepeat}
                onAvatarTypeChange={handleAvatarTypeChange}
                showTypeControls={false}
                showVoiceControls
                className="origin-center"
              />
            </div>
          </motion.div>
          <button
            type="button"
            onClick={pauseForDoubt}
            className="fixed bottom-24 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-xl shadow-emerald-600/25 transition hover:bg-emerald-700"
          >
            <Hand className="h-4 w-4" />
            Raise hand
          </button>
        </motion.div>
      </main>

      {/* Bottom navigation */}
      <SlideNavigation
        currentIndex={currentIndex}
        totalSlides={lesson.totalSlides}
        onPrevious={handlePrevious}
        onNext={handleNext}
        isNavigating={isNavigating}
        isNextDisabled={isExplanationSequence && !hasLastExplanationAudioStarted}
      />

      <AnimatePresence>
        {doubtOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 24, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 18, scale: 0.97 }}
              className="flex max-h-[82vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0d1730]"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-600">Raise Hand</p>
                  <h2 className="text-lg font-black">Ask about this segment</h2>
                </div>
                <button type="button" onClick={resumeAfterDoubt} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/10" title="Close and resume">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-40 flex-1 space-y-3 overflow-y-auto p-5">
                {currentSlide.suggestedQuestions?.length ? (
                  <div className="space-y-2 pb-2">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Suggested questions</p>
                    <div className="flex flex-wrap gap-2">
                      {currentSlide.suggestedQuestions.map((question) => (
                        <button
                          key={question}
                          type="button"
                          disabled={isAskingDoubt}
                          onClick={() => void submitDoubtText(question)}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-bold leading-snug text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {doubtChat.length ? doubtChat.map((message) => (
                  <div key={message.id} className={`max-w-[86%] rounded-xl px-4 py-3 text-sm font-semibold leading-relaxed ${message.role === "student" ? "ml-auto bg-blue-600 text-white" : "bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-100"}`}>
                    {message.text}
                  </div>
                )) : (
                  <p className="py-8 text-center text-sm font-semibold text-slate-500">Type your question or record it with the microphone.</p>
                )}
                {isAskingDoubt && <div className="flex items-center gap-2 text-sm font-bold text-emerald-600"><Loader2 className="h-4 w-4 animate-spin" /> Thinking...</div>}
              </div>
              <div className="border-t border-slate-200 p-4 dark:border-white/10">
                <div className="flex gap-2">
                  <input
                    value={doubtText}
                    onChange={(event) => setDoubtText(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") void submitDoubtText(); }}
                    placeholder="Ask your doubt"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5"
                  />
                  <button type="button" onClick={isRecordingDoubt ? stopDoubtRecording : startDoubtRecording} className={`grid h-11 w-11 place-items-center rounded-xl text-white ${isRecordingDoubt ? "bg-red-500" : "bg-violet-600"}`} title={isRecordingDoubt ? "Stop recording" : "Record doubt"}>
                    {isRecordingDoubt ? <Square className="h-4 w-4" /> : isTranscribingDoubt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => void submitDoubtText()} disabled={!doubtText.trim() || isAskingDoubt} className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-40" title="Send doubt">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <button type="button" onClick={resumeAfterDoubt} className="mt-3 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-black hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                  Resume lesson
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
