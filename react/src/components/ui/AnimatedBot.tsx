import React from "react";
import { motion } from "framer-motion";

export const AnimatedBot = ({ className, size = 24 }: { className?: string; size?: number | string }) => {
  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className || ""}`}
      style={{ 
        display: "inline-flex",
        width: size,
        height: size,
        verticalAlign: "middle"
      }}
      animate={{ 
        y: [0, -3, 0],
      }}
      transition={{ 
        duration: 2.5, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.rect
          x="3"
          y="11"
          width="18"
          height="10"
          rx="3"
          fill="url(#botGradient)"
          stroke="#4F46E5"
          strokeWidth="1.5"
        />
        <path
          d="M8 11V7C8 5.89543 8.89543 5 10 5H14C15.1046 5 16 5.89543 16 7V11"
          stroke="#4F46E5"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <motion.circle
          cx="12"
          cy="5"
          r="2"
          fill="#4338CA"
          animate={{ fill: ["#4338CA", "#818CF8", "#4338CA"] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.circle
          cx="8"
          cy="16"
          r="1.5"
          fill="#fff"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.circle
          cx="16"
          cy="16"
          r="1.5"
          fill="#fff"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
        />
        <motion.path
          d="M10 19H14"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <defs>
          <linearGradient id="botGradient" x1="3" y1="11" x2="21" y2="21" gradientUnits="userSpaceOnUse">
            <stop stopColor="#818CF8" />
            <stop offset="1" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
};
