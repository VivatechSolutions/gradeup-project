import React from "react";
import { motion } from "framer-motion";
import FeatureCard from "./FeatureCard";
import { Bot, BarChart3, Trophy, Users, FileText, Zap, Award, MessageSquare } from "lucide-react";

const features = [
  {
    title: "AI Tutor",
    description: "Context-aware hints and step-by-step explanations for every concept.",
    icon: <Sparkles className="w-6 h-6 animate-pulse text-indigo-500" />,
    color: "from-blue-500 to-cyan-500",
    badge: "Smart",
  },
  {
    title: "Insightful Analytics",
    description: "Track learning, identify gaps, and celebrate progress in real-time.",
    icon: <BarChart3 className="w-6 h-6" />,
    color: "from-purple-500 to-pink-500",
    badge: "Data",
  },
  {
    title: "Gamified Learning",
    description: "Streaks, badges, and leaderboards to motivate students effectively.",
    icon: <Trophy className="w-6 h-6" />,
    color: "from-yellow-500 to-orange-500",
    badge: "Fun",
  },
  {
    title: "Collaborative",
    description: "Community Q&A, study groups, and peer-to-peer learning activities.",
    icon: <Users className="w-6 h-6" />,
    color: "from-green-500 to-emerald-500",
    badge: "Social",
  },
  {
    title: "Content Manager",
    description: "Create lessons, quizzes and assignments with powerful tools.",
    icon: <FileText className="w-6 h-6" />,
    color: "from-indigo-500 to-purple-500",
    badge: "Create",
  },
  {
    title: "Lightning Fast",
    description: "Optimized performance with instant feedback and seamless experience.",
    icon: <Zap className="w-6 h-6" />,
    color: "from-red-500 to-rose-500",
    badge: "Fast",
  },
];

export default function Features() {
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
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-0 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-20 w-80 h-80 bg-blue-300/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-16 text-center max-w-3xl mx-auto"
        >
          <motion.div variants={itemVariants} className="inline-block">
            <div className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 mb-6">
              <span className="text-sm font-semibold text-gradient">⚡ Core Features</span>
            </div>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-4xl sm:text-5xl font-extrabold mb-4"
          >
            <span className="text-gradient">Powerful Features</span>
            <br />
            <span>for Modern Learning</span>
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-lg text-text-muted leading-relaxed"
          >
            Everything you need to transform education with AI-powered insights and gamified engagement.
          </motion.p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              className="group relative"
            >
              <div className="relative h-full rounded-2xl overflow-hidden">
                {/* Gradient background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                />

                {/* Glass container */}
                <div className="relative h-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:border-white/20 transition-all duration-300 shadow-lg hover:shadow-2xl">
                  {/* Badge */}
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${feature.color}`}>
                    {feature.badge}
                  </div>

                  {/* Icon Container */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-text-main mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-indigo-500 group-hover:to-purple-500 group-hover:bg-clip-text transition-all duration-300">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-text-muted leading-relaxed group-hover:text-text-main transition-colors duration-300">
                    {feature.description}
                  </p>

                  {/* Hover accent */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
                    backgroundImage: `linear-gradient(to right, var(--accent-bright), #8b5cf6)`
                  }} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional benefit section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 pt-12 border-t border-white/10"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-4">Why Teachers & Students Love GradeUp</h3>
            <p className="text-text-muted max-w-2xl mx-auto">
              Join thousands of educators transforming classrooms with intelligent, data-driven learning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "📈",
                title: "Proven Results",
                description: "Students show 35% improvement in comprehension within 4 weeks.",
              },
              {
                icon: "⏱️",
                title: "Save Time",
                description: "Teachers spend 60% less time on administrative tasks.",
              },
              {
                icon: "😊",
                title: "Better Engagement",
                description: "Students complete 80% more assignments with gamification.",
              },
            ].map((benefit, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                className="p-6 rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 text-center hover:border-indigo-500/30 transition-colors"
              >
                <div className="text-4xl mb-3">{benefit.icon}</div>
                <h4 className="font-semibold mb-2">{benefit.title}</h4>
                <p className="text-sm text-text-muted">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
