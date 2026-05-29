import React from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function CTA() {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl overflow-hidden"
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-90" />
          
          {/* Glass effect overlay */}
          <div className="absolute inset-0 backdrop-blur-3xl opacity-30" />

          {/* Content */}
          <div className="relative px-8 py-16 lg:px-12 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
                  Ready to Transform Learning?
                </h2>
                <p className="text-lg text-white/90 max-w-lg leading-relaxed">
                  Join thousands of educators and students who are already experiencing smarter, faster learning with AI-powered insights and gamified engagement.
                </p>

                {/* Stats row */}
                <div className="mt-8 grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-3xl font-bold text-white">100K+</div>
                    <div className="text-sm text-white/80">Active Users</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">4.9/5</div>
                    <div className="text-sm text-white/80">Avg Rating</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ x: 20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col gap-4"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link href="/auth" className="block w-full text-center bg-white text-indigo-600 font-bold py-4 px-8 rounded-xl shadow-2xl hover:shadow-3xl transition-all">
                    Start Free Trial
                  </Link>
                </motion.div>

                <div className="text-center text-white/80 text-sm">
                  <p>💳 No credit card required</p>
                  <p>14 days free access to all features</p>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="grid grid-cols-3 gap-2 pt-4"
                >
                  {["✅ Full Access", "✅ No Setup", "✅ 24/7 Support"].map((text, i) => (
                    <div key={i} className="text-xs text-white/90 text-center">
                      {text}
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
