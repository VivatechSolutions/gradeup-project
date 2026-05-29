import React, { useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'wouter';
import { useNotificationStore } from '../lib/notification-store';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationIcon = () => {
  const unreadCount = useNotificationStore((state) => state.unreadCount());
  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <Link to="/notifications">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl
           border-border/40 bg-muted/50
          hover:bg-muted hover:border-border/70
          transition-colors duration-150 cursor-pointer"
      >
        <Bell
          className={`h-[18px] w-[18px] transition-colors duration-150 ${
            unreadCount > 0
              ? 'text-foreground'
              : 'text-muted-foreground dark:text-slate-400'
          }`}
          strokeWidth={1.6}
        />

        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="absolute -top-1.5 -right-1.5 flex min-w-[18px] h-[18px] items-center
                justify-center rounded-full bg-red-500 px-1
                text-[10px] font-medium leading-none text-white
                border-2 border-background"
            >
              {displayCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </Link>
  );
};

export default NotificationIcon;