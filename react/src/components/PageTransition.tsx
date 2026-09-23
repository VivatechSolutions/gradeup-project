import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Route order hierarchy to determine transition direction (forward vs backward).
 */
const ROUTE_INDEX_MAP: Record<string, number> = {
  "/": 0,
  "/auth": 1,
  "/dashboard": 10,
  "/courses": 20,
  "/courses/": 21,
  "/progress": 30,
  "/achievements": 40,
  "/ai-tutor": 50,
  "/voice-study-companion": 51,
  "/voice-study-companion-v2": 52,
  "/voice-study-companion-v3": 53,
  "/quiz": 60,
  "/studio/question-bank": 61,
  "/studio/test-prep": 62,
  "/studio/qa": 63,
  "/homework": 70,
  "/homework-helper": 71,
  "/preparation-exam": 80,
  "/main-exam": 81,
  "/calendar": 90,
  "/community": 100,
  "/communityNew": 101,
  "/live-events": 110,
  "/notifications": 120,
  "/profile": 130,
  "/settings": 140,
};

function getRouteRank(path: string): number {
  if (ROUTE_INDEX_MAP[path] !== undefined) {
    return ROUTE_INDEX_MAP[path];
  }
  for (const [key, rank] of Object.entries(ROUTE_INDEX_MAP)) {
    if (path.startsWith(key) && key !== "/") {
      return rank;
    }
  }
  return 50;
}

// Reference CSS cubic-bezier curves
export const PT_EASE_GLIDE = [0.54, 0.35, 0.29, 0.99] as const;
export const PT_EASE_SPRING = [0.25, 1.0, 0.5, 1.25] as const;

// SVG Morphing Curve Paths (ViewBox 0 0 1000 1000)
// Cover: Drops down from top to cover the screen
const PATH_COVER_START = "M 0 0 L 1000 0 L 1000 0 Q 500 0 0 0 Z";
const PATH_COVER_MID_ACCENT = "M 0 0 L 1000 0 L 1000 750 Q 500 1280 0 750 Z";
const PATH_COVER_MID_MAIN = "M 0 0 L 1000 0 L 1000 680 Q 500 1160 0 680 Z";
const PATH_COVER_END = "M 0 0 L 1000 0 L 1000 1000 Q 500 1000 0 1000 Z";

// Reveal: Pulls down towards the bottom to unveil the new route
const PATH_REVEAL_START = "M 0 0 Q 500 0 1000 0 L 1000 1000 L 0 1000 Z";
const PATH_REVEAL_MID_ACCENT = "M 0 750 Q 500 1280 1000 750 L 1000 1000 L 0 1000 Z";
const PATH_REVEAL_MID_MAIN = "M 0 680 Q 500 1160 1000 680 L 1000 1000 L 0 1000 Z";
const PATH_REVEAL_END = "M 0 1000 Q 500 1000 1000 1000 L 1000 1000 L 0 1000 Z";

type MorphPhase = "idle" | "covering" | "revealing";

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const [location] = useLocation();
  const prevLocationRef = useRef(location);
  const [phase, setPhase] = useState<MorphPhase>("idle");
  const [displayLocation, setDisplayLocation] = useState(location);

  useEffect(() => {
    if (prevLocationRef.current !== location) {
      prevLocationRef.current = location;

      // Start Morphing Cover Phase
      setPhase("covering");

      // Midpoint: switch displayed route content while covered
      const switchTimer = setTimeout(() => {
        setDisplayLocation(location);
        try {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        } catch (e) {
          window.scrollTo(0, 0);
        }
        setPhase("revealing");
      }, 340);

      // Complete: unveil finished, restore idle state
      const completeTimer = setTimeout(() => {
        setPhase("idle");
      }, 680);

      return () => {
        clearTimeout(switchTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [location]);

  const isTransitioning = phase !== "idle";

  return (
    <div className="page-transition-viewport">
      {/* ── Morphing SVG Curtain & Attractive Loader Overlay ── */}
      {isTransitioning && (
        <div className={`morphin-wrap ${isTransitioning ? "active" : ""}`}>
          <svg
            className="morphin-svg"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="morphGradAccent" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f6b337" />
                <stop offset="50%" stopColor="#3d947b" />
                <stop offset="100%" stopColor="#0b6c50" />
              </linearGradient>
              <linearGradient id="morphGradMain" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0b6c50" />
                <stop offset="45%" stopColor="#172644" />
                <stop offset="100%" stopColor="#080d1f" />
              </linearGradient>
            </defs>

            {/* Background Accent Wave (Fluid Parallax Depth) */}
            <motion.path
              fill="url(#morphGradAccent)"
              initial={{ d: PATH_COVER_START }}
              animate={{
                d:
                  phase === "covering"
                    ? [PATH_COVER_START, PATH_COVER_MID_ACCENT, PATH_COVER_END]
                    : [PATH_REVEAL_START, PATH_REVEAL_MID_ACCENT, PATH_REVEAL_END],
              }}
              transition={{
                duration: 0.34,
                ease: PT_EASE_GLIDE,
              }}
            />

            {/* Foreground Main Wave */}
            <motion.path
              fill="url(#morphGradMain)"
              initial={{ d: PATH_COVER_START }}
              animate={{
                d:
                  phase === "covering"
                    ? [PATH_COVER_START, PATH_COVER_MID_MAIN, PATH_COVER_END]
                    : [PATH_REVEAL_START, PATH_REVEAL_MID_MAIN, PATH_REVEAL_END],
              }}
              transition={{
                duration: 0.34,
                ease: PT_EASE_GLIDE,
              }}
            />
          </svg>

          {/* Reference Radial Dot Grid Pattern */}
          <div className="morph-pattern-overlay" />

          {/* ── Attractive Loader Anime (Centered) ── */}
          <AnimatePresence>
            {isTransitioning && (
              <motion.div
                className="morph-loader-overlay"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.22 }}
              >
                <div className="morph-loader-card">
                  {/* Outer & Inner Pulsing Shockwave Rings */}
                  <div className="morph-loader-ring-outer" />
                  <div className="morph-loader-ring-inner" />

                  {/* Core Orb inspired by reference loaderAnim */}
                  <div className="morph-loader-core">
                    <svg
                      className="morph-loader-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />
                    </svg>
                  </div>

                  {/* Bouncing Liquid Dots Row */}
                  <div className="morph-dots-row">
                    <span className="morph-dot" />
                    <span className="morph-dot" />
                    <span className="morph-dot" />
                  </div>

                  {/* Shimmering Brand Status Label */}
                  <div className="morph-loader-text">GradeUp AI</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Page Content Stage with Smooth Cross-Fade */}
      {/* Page Content Stage with Down-to-Top Smooth Entrance Transition */}
      <motion.div
        key={displayLocation}
        initial={{ opacity: 0.92, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: PT_EASE_GLIDE }}
        initial={{ opacity: 0, y: 46, scale: 0.985, filter: "blur(6px)" }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          transition: {
            duration: 0.62,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.04,
          },
          transitionEnd: {
            transform: "none",
            filter: "none",
          },
        }}
        className="page-transition-stage"
      >
        {children}
      </motion.div>
    </div>
  );
};

/**
 * Spring pop wrapper for child elements (hero badges, main titles, icons, cards).
 * Physics: cubic-bezier(0.25, 1, 0.5, 1.25)
 */
export const PageSpringPop: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0.1, className = "" }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.94, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{
        duration: 0.5,
        delay,
        ease: PT_EASE_SPRING,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
