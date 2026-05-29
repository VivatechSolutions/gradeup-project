import { motion } from 'framer-motion';
import React from 'react';

const FunnyLoader: React.FC = () => {
  return (
    <div className="flex flex-col justify-center items-center py-12 gap-4">
      <div className="w-48 h-12 border-b-2 border-gray-300 dark:border-gray-600 relative">
        {/* The running block */}
        <motion.div
          className="w-6 h-6 bg-blue-500 rounded-sm absolute bottom-0"
          initial={{ x: 0 }}
          animate={{
            x: [0, 80, 80, 100, 180],
            y: [0, 0, -30, -30, 0],
            rotate: [0, 0, 0, 180, 180],
          }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 0.5,
          }}
        />
        {/* The obstacle */}
        <div className="w-4 h-4 bg-red-500 absolute bottom-0 left-24" />
      </div>
      <p className="text-sm text-muted-foreground font-semibold animate-pulse">
        Running to get your answers...
      </p>
    </div>
  );
};

export default FunnyLoader;
