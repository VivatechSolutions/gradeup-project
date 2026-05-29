import React from "react";
import { cn } from "../lib/utils";
import { motion } from "framer-motion";

interface QuizSidebarProps {
  questions: any[];
  currentIndex: number;
  answers: Record<number, string>;
  markedForReview: Record<number, boolean>;
  onQuestionSelect: (index: number) => void;
}

export default function QuizSidebar({
  questions,
  currentIndex,
  answers,
  markedForReview,
  onQuestionSelect,
}: QuizSidebarProps) {
  const getStatus = (index: number) => {
    const questionId = questions[index].id;
    if (index === currentIndex) return "current";
    if (answers[questionId]) return "answered";
    if (markedForReview[questionId]) return "marked";
    return "unanswered";
  };

  const statusStyles = {
    current: "ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200",
    answered: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
    marked: "bg-yellow-100 dark:bg-yellow-800/30 text-yellow-800 dark:text-yellow-200",
    unanswered: "bg-gray-200 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-600",
  };

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-bold mb-4 px-2">Questions</h3>
      <div className="flex-grow overflow-y-auto">
          <div className="grid grid-cols-4 md:grid-cols-5 gap-2 p-2">
            {questions.map((question, index) => (
              <motion.button
                key={question.id}
                onClick={() => onQuestionSelect(index)}
                className={cn(
                  "h-10 w-10 flex items-center justify-center rounded-lg border border-transparent transition-transform",
                  statusStyles[getStatus(index)]
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {index + 1}
              </motion.button>
            ))}
          </div>
      </div>
      <div className="mt-4 p-2 border-t dark:border-gray-700">
        <h4 className="font-semibold mb-2">Legend</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center">
            <div className={cn("h-4 w-4 rounded-md mr-2", statusStyles.current)}></div>
            <span>Current</span>
          </div>
          <div className="flex items-center">
            <div className={cn("h-4 w-4 rounded-md mr-2", statusStyles.answered)}></div>
            <span>Answered</span>
          </div>
          <div className="flex items-center">
            <div className={cn("h-4 w-4 rounded-md mr-2", statusStyles.unanswered)}></div>
            <span>Not Answered</span>
          </div>
          <div className="flex items-center">
            <div className={cn("h-4 w-4 rounded-md mr-2", statusStyles.marked)}></div>
            <span>Marked for Review</span>
          </div>
        </div>
      </div>
    </div>
  );
}