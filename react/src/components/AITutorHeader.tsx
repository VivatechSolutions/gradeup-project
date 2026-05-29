import React from 'react';
import { Link } from 'wouter';
import { Button } from './ui/button';
import { Bot, Mic, HelpCircle, BookOpen, Brain, ArrowLeft,Sparkles } from 'lucide-react';

interface AITutorHeaderProps {
  onAskAI: () => void;
  onExplain: () => void;
  /** Called when the back arrow is pressed — saves history in parent, returns to subject-selection */
  onBack?: () => void;
  /** e.g. "Mathematics" — shown in breadcrumb */
  subjectLabel?: string;
  /** e.g. "Algebra & Equations" — shown after subject in breadcrumb */
  unitLabel?: string;
}

export default function AITutorHeader({
  onAskAI,
  onExplain,
  onBack,
  subjectLabel,
  unitLabel,
}: AITutorHeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm px-3 py-2 sm:px-5 sm:py-3 flex items-center justify-between gap-2 flex-shrink-0 min-w-0">

      {/* ── LEFT: back button + brand + breadcrumb ─────────────────── */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">

        {/* Back arrow — only when handler is provided */}
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back to subject selection"
            className="
              flex-shrink-0 w-9 h-9 rounded-xl
              flex items-center justify-center
              text-gray-500 dark:text-gray-400
              hover:text-blue-600 dark:hover:text-blue-400
              hover:bg-blue-50 dark:hover:bg-blue-900/20
              transition-colors duration-150
            "
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        {/* Logo mark + wordmark */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm shadow-indigo-600/30">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <span className="font-bold text-gray-800 dark:text-white text-base sm:text-lg leading-none hidden xs:block">
            AI Tutor
          </span>
        </div>

        {/* Breadcrumb  — visible from sm up */}
        {(subjectLabel || unitLabel) && (
          <div className="hidden sm:flex items-center gap-1.5 min-w-0 text-sm">
            <span className="text-gray-300 dark:text-gray-600 select-none">/</span>

            {subjectLabel && (
              <span className="font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[100px] lg:max-w-[160px]">
                {subjectLabel}
              </span>
            )}

            {unitLabel && (
              <>
                <span className="text-gray-300 dark:text-gray-600 select-none">/</span>
                <span className="text-gray-500 dark:text-gray-400 truncate max-w-[100px] lg:max-w-[180px]">
                  {unitLabel}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: action buttons ──────────────────────────────────── */}
      {/* <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">

        <Link href="/voice-study-companion-v3">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 sm:px-3 rounded-xl text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Mic className="h-4 w-4" />
            <span className="hidden lg:inline ml-1.5 text-xs font-medium">Voice Study</span>
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={onAskAI}
          className="h-9 px-2 sm:px-3 rounded-xl text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden lg:inline ml-1.5 text-xs font-medium">Ask AI</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onExplain}
          className="h-9 px-2 sm:px-3 rounded-xl text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
        >
          <Brain className="h-4 w-4" />
          <span className="hidden lg:inline ml-1.5 text-xs font-medium">Explain</span>
        </Button>

        <Link href="/studio/quiz">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 sm:px-3 rounded-xl text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden lg:inline ml-1.5 text-xs font-medium">Practice</span>
          </Button>
        </Link>
      </div> */}
    </header>
  );
}