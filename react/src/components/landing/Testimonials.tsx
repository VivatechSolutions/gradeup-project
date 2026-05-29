import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Aisha Ahmed",
    role: "Student",
    text: "GradeUp AI helped me improve my scores by 30% in just two months. The AI tutor explains concepts so clearly!",
    avatar: "🎓",
    rating: 5,
  },
  {
    name: "Ravi Kumar",
    role: "High School Teacher",
    text: "Creating adaptive content and tracking student growth has never been this effortless. It saves me hours every week.",
    avatar: "👨‍🏫",
    rating: 5,
  },
  {
    name: "Mira Patel",
    role: "Parent",
    text: "My child actually enjoys learning now. The streaks and badges keep them motivated. Couldn't ask for more!",
    avatar: "👩‍👧",
    rating: 5,
  },
  {
    name: "Marco Silva",
    role: "University Professor",
    text: "The analytics dashboard gives me insights I never had before. I can identify struggling students immediately.",
    avatar: "👨‍🎓",
    rating: 5,
  },
  {
    name: "Lisa Thompson",
    role: "Tutor",
    text: "The gamification features make learning fun and engaging. My students actually look forward to our sessions now.",
    avatar: "👩‍💼",
    rating: 5,
  },
  {
    name: "David Chen",
    role: "School Administrator",
    text: "Best investment in educational technology we've made. The ROI in terms of student engagement is incredible.",
    avatar: "👨‍💼",
    rating: 5,
  },
];

export default function Testimonials() {
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
    <section id="testimonials" className="relative py-24 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl" />
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
          <motion.div variants={itemVariants} className="inline-block mb-6">
            <div className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-400/30">
              <span className="text-sm font-semibold text-gradient">⭐ Loved by Users</span>
            </div>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-4xl sm:text-5xl font-extrabold mb-4"
          >
            <span className="text-gradient">What People Say</span>
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-lg text-text-muted leading-relaxed"
          >
            Join thousands of educators and students who have transformed their learning journey with GradeUp AI.
          </motion.p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.name}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              className="group relative"
            >
              <div className="relative h-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-6 hover:border-indigo-500/30 transition-all duration-300 shadow-lg hover:shadow-2xl overflow-hidden">
                {/* Gradient overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />

                <div className="relative z-10">
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  {/* Text */}
                  <p className="text-sm text-text-muted leading-relaxed mb-6 italic group-hover:text-text-main transition-colors">
                    "{testimonial.text}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                    <div className="text-3xl">{testimonial.avatar}</div>
                    <div>
                      <div className="font-semibold text-text-main text-sm">
                        {testimonial.name}
                      </div>
                      <div className="text-xs text-text-muted">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-20 pt-12 border-t border-white/10 text-center"
        >
          <p className="text-text-muted mb-8">Trusted by leaders in education</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-center">
            {["📊 500+ Schools", "🌍 50+ Countries", "👥 100K+ Users", "⭐ 4.9/5 Rating"].map((stat, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                className="text-center"
              >
                <p className="font-semibold text-text-main">{stat}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
