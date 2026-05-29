import React from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import ParallaxLayer from "./ParallaxLayer";
import CinematicShapes from "./CinematicShapes";

export default function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] },
    },
  };

  return (
    <section className="relative pt-32 pb-32 overflow-hidden">
      <div className="cinematic-bg cinematic-vignette film-grain" />
      
      {/* Animated background shapes */}
      <div className="absolute -left-10 top-20 animated-shape shape-primary" />
      <div className="absolute right-10 top-40 animated-shape shape-secondary" />
      <div className="absolute left-1/2 bottom-20 animated-shape shape-tertiary" />
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div variants={itemVariants} className="inline-block">
              <div className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-400/30">
                <span className="text-sm font-semibold text-gradient">✨ Welcome to GradeUp AI</span>
              </div>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-5xl sm:text-6xl font-extrabold leading-tight"
            >
              <span className="text-gradient">Smarter Learning,</span>
              <br />
              <span>Faster Mastery</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg text-text-muted max-w-xl leading-relaxed"
            >
              Personalized AI tutor, deep analytics, and gamified practice to keep students engaged and teachers informed. Transform education with intelligent insights.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4"
            >
              <Link href="/auth" className="btn-primary transform hover:scale-105 transition-transform">
                Get Started Free
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 text-text-muted hover:text-text-main transition-colors group"
              >
                <span>Explore Features</span>
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ↓
                </motion.div>
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-3 gap-4 pt-8 border-t border-text-subtle/20"
            >
              {[
                { value: "100K+", label: "Students" },
                { value: "99%", label: "Satisfaction" },
                { value: "24/7", label: "Support" },
              ].map((stat, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-2xl font-bold text-gradient">{stat.value}</div>
                  <div className="text-sm text-text-muted">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Visual */}
          <div className="hidden lg:block relative h-full min-h-96">
            <div className="absolute inset-0">
              {/* Floating cards with parallax */}
              <ParallaxLayer depth={0.25} scrollDepth={0.15} className="absolute top-10 -left-8">
                <motion.div
                  initial={{ rotate: 0, y: 0 }}
                  animate={{ rotate: -8, y: -10 }}
                  transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
                  className="w-40 h-28 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl p-4 text-white"
                >
                  <div className="text-xs font-semibold mb-2">AI Tutor</div>
                  <div className="text-2xl font-bold">92%</div>
                  <div className="text-xs opacity-80">Accuracy</div>
                </motion.div>
              </ParallaxLayer>

              <ParallaxLayer depth={0.12} scrollDepth={0.08} className="absolute top-32 right-0">
                <motion.div
                  initial={{ rotate: 0, y: 0 }}
                  animate={{ rotate: 6, y: 15 }}
                  transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", delay: 0.5 }}
                  className="w-36 h-32 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-2xl p-4 text-white"
                >
                  <div className="text-xs font-semibold mb-2">Progress</div>
                  <div className="text-lg font-bold">+45%</div>
                  <div className="text-xs opacity-80">This Month</div>
                </motion.div>
              </ParallaxLayer>

              <ParallaxLayer depth={0.18} scrollDepth={0.12} className="absolute bottom-10 left-0">
                <motion.div
                  initial={{ rotate: 0, y: 0 }}
                  animate={{ rotate: -4, y: 8 }}
                  transition={{ duration: 3.5, repeat: Infinity, repeatType: "reverse", delay: 1 }}
                  className="w-44 h-28 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-2xl p-4 text-white"
                >
                  <div className="text-xs font-semibold mb-2">Achievements</div>
                  <div className="text-2xl font-bold">🏆 12</div>
                  <div className="text-xs opacity-80">Badges</div>
                </motion.div>
              </ParallaxLayer>

              {/* Main device mockup */}
              <ParallaxLayer depth={0.08} scrollDepth={0.06} className="relative z-20">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="mock-device w-full rounded-2xl p-6 bg-gradient-to-br from-white/95 to-white/90 shadow-2xl backdrop-blur glow-effect"
                >
                  <div className="mock-screen h-80 rounded-lg bg-gradient-to-b from-indigo-50 to-white p-4 space-y-4">
                    <div className="h-4 bg-gradient-to-r from-indigo-200 to-purple-200 rounded w-28" />
                    <div className="space-y-2">
                      <div className="h-3 bg-indigo-100 rounded w-full" />
                      <div className="h-3 bg-indigo-100 rounded w-5/6" />
                      <div className="h-3 bg-indigo-50 rounded w-4/5" />
                    </div>
                    <div className="pt-4 space-y-2">
                      <div className="h-12 bg-gradient-to-r from-indigo-200 to-purple-200 rounded opacity-60" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-10 bg-indigo-100 rounded opacity-60" />
                        <div className="h-10 bg-purple-100 rounded opacity-60" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </ParallaxLayer>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="text-center">
          <div className="text-2xl text-text-muted/50">↓</div>
        </div>
      </motion.div>
    </section>
  );
}
