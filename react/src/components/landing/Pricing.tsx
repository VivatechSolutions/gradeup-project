import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Link } from "wouter";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for trying GradeUp AI",
    features: [
      "Basic AI tutor",
      "Up to 3 courses",
      "5 quizzes per month",
      "Community access",
      "Email support",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12/mo",
    description: "For active learners and tutors",
    features: [
      "Advanced AI tutor",
      "Unlimited courses",
      "Unlimited quizzes",
      "Advanced analytics",
      "Progress tracking",
      "Priority support",
      "Content library access",
    ],
    highlighted: true,
  },
  {
    name: "School",
    price: "Custom",
    description: "For schools and institutions",
    features: [
      "Site license",
      "Unlimited users",
      "Dedicated support",
      "Custom integration",
      "Teacher dashboard",
      "Administrative tools",
      "API access",
    ],
    highlighted: false,
  },
];

export default function Pricing() {
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
    <section id="pricing" className="relative py-24 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-0 w-96 h-96 bg-indigo-300/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-0 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl" />
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
              <span className="text-sm font-semibold text-gradient">💰 Flexible Pricing</span>
            </div>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-4xl sm:text-5xl font-extrabold mb-4"
          >
            Simple, Transparent Pricing
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-lg text-text-muted leading-relaxed"
          >
            Choose the plan that works for you. Start free and upgrade anytime.
          </motion.p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              className={`group relative rounded-2xl overflow-hidden transition-all duration-300 ${
                plan.highlighted ? "md:scale-105 md:z-10" : ""
              }`}
            >
              {/* Card background */}
              <div
                className={`absolute inset-0 rounded-2xl ${
                  plan.highlighted
                    ? "bg-gradient-to-br from-indigo-600 to-purple-600"
                    : "bg-gradient-to-br from-white/10 to-white/5"
                }`}
              />

              {/* Border */}
              <div
                className={`absolute inset-0 rounded-2xl ${
                  plan.highlighted
                    ? "border border-white/20"
                    : "border border-white/10 group-hover:border-indigo-500/30"
                } transition-all`}
              />

              {/* Content */}
              <div className="relative p-8 h-full flex flex-col">
                {plan.highlighted && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-400 to-orange-400 text-xs font-bold text-center py-2 text-black">
                    🌟 MOST POPULAR
                  </div>
                )}

                <div className={`mb-8 ${plan.highlighted ? "pt-6" : ""}`}>
                  <h3 className={`text-2xl font-bold mb-2 ${
                    plan.highlighted ? "text-white" : "text-text-main"
                  }`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm ${
                    plan.highlighted ? "text-white/80" : "text-text-muted"
                  }`}>
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-8">
                  <div className={`text-4xl font-extrabold ${
                    plan.highlighted ? "text-white" : "text-text-main"
                  }`}>
                    {plan.price}
                  </div>
                  <p className={`text-xs mt-1 ${
                    plan.highlighted ? "text-white/70" : "text-text-muted"
                  }`}>
                    {plan.price !== "Custom" && plan.price !== "Free" ? "per month" : ""}
                  </p>
                </div>

                {/* Features */}
                <div className="flex-1 mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check
                        size={18}
                        className={`flex-shrink-0 mt-0.5 ${
                          plan.highlighted ? "text-yellow-300" : "text-indigo-500"
                        }`}
                      />
                      <span className={`text-sm ${
                        plan.highlighted ? "text-white/90" : "text-text-muted"
                      }`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/auth"
                    className={`block text-center py-3 px-4 rounded-lg font-semibold transition-all ${
                      plan.highlighted
                        ? "bg-white text-indigo-600 hover:shadow-xl"
                        : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg"
                    }`}
                  >
                    Get Started
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* FAQs or additional info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center pt-12 border-t border-white/10"
        >
          <p className="text-text-muted mb-6">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.05 }}
            className="inline-block text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
          >
            Have questions? Contact our team →
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
