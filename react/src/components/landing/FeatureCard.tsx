import React from "react";
import { motion } from "framer-motion";
import ParallaxLayer from "./ParallaxLayer";

interface FeatureCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  depth?: number;
}

export default function FeatureCard({ title, description, icon, depth = 0.06 }: FeatureCardProps) {
  return (
    <ParallaxLayer depth={depth} className="group">
      <motion.div
        whileHover={{ y: -8 }}
        className="feature-card-wrapper h-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:border-white/20 transition-all duration-300 shadow-lg hover:shadow-2xl relative overflow-hidden"
      >
        <div className="flex flex-col h-full relative z-10">
          {/* Icon */}
          <div className="flex-shrink-0 mb-4">
            {icon && (
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white group-hover:shadow-lg transition-all"
              >
                {icon}
              </motion.div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-text-main mb-2 group-hover:text-indigo-500 transition-colors">
            {title}
          </h3>

          {/* Description */}
          <p className="text-sm text-text-muted leading-relaxed flex-grow group-hover:text-text-main transition-colors">
            {description}
          </p>

          {/* Arrow indicator */}
          <motion.div
            initial={{ x: 0 }}
            whileHover={{ x: 4 }}
            className="mt-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            →
          </motion.div>
        </div>

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity bg-gradient-to-br from-indigo-500 to-purple-600 pointer-events-none" />
      </motion.div>
    </ParallaxLayer>
  );
}
