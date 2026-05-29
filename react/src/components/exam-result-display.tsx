
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Award, CheckCircle, PartyPopper, Rocket, ShieldCheck } from 'lucide-react';

interface ExamResultDisplayProps {
  score: number;
  total: number;
  isMainExam: boolean;
  onRetry: () => void;
}

const ExamResultDisplay: React.FC<ExamResultDisplayProps> = ({ score, total, isMainExam, onRetry }) => {
  const percentage = Math.round((score / total) * 100);

  const getFunnyMessage = () => {
    if (percentage === 100) return "Perfect Score! Are you a wizard?!";
    if (percentage >= 80) return "Awesome Job! You're a true scholar!";
    if (percentage >= 60) return "Good effort! Keep practicing!";
    if (percentage >= 40) return "You're getting there! Don't give up!";
    return "Practice makes perfect! You'll nail it next time.";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-4 ${isMainExam ? 'bg-gray-900' : 'bg-blue-900'}`}
    >
      <div className="text-center text-white">
        {isMainExam ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
            >
              <ShieldCheck className="w-32 h-32 text-green-400 mx-auto mb-6" />
            </motion.div>
            <motion.h1
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-4xl font-bold mb-4"
            >
              Assessment Submitted
            </motion.h1>
            <motion.p
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-lg text-gray-300"
            >
              Your submission has been securely recorded. Results will be published by your instructor.
            </motion.p>
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                <Button onClick={onRetry} className="mt-8 bg-gray-700 hover:bg-gray-600">
                    Back to Dashboard
                </Button>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div
                initial={{ y: -100, opacity: 0}}
                animate={{ y: 0, opacity: 1}}
                transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 0.1 }}
                className="relative"
            >
                <PartyPopper className="w-32 h-32 text-yellow-300 mx-auto" />
            </motion.div>
            <h1 className="text-5xl font-bold my-4">
              You Scored
            </h1>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 0.5 }}
              className="relative w-48 h-48 mx-auto flex items-center justify-center"
            >
              <motion.svg className="absolute inset-0" viewBox="0 0 100 100">
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="#fff"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray="283"
                  strokeDashoffset={283 * (1 - percentage/100)}
                  initial={{ strokeDashoffset: 283 }}
                  animate={{ strokeDashoffset: 283 * (1 - percentage/100) }}
                  transition={{ duration: 1, delay: 0.8 }}
                />
              </motion.svg>
              <span className="text-5xl font-bold">{percentage}%</span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8 }}
              className="text-xl mt-4"
            >
              {getFunnyMessage()}
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
                <Button onClick={onRetry} className="mt-8 bg-pink-500 hover:bg-pink-600">
                    <Rocket className="w-4 h-4 mr-2"/>
                    Try Another Round
                </Button>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default ExamResultDisplay;
