import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";

export default function Header() {
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 120], ["rgba(248, 250, 252, 0)", "rgba(248, 250, 252, 0.98)"]);
  const blurPx = useTransform(scrollY, [0, 120], ["0px", "10px"]);
  const borderOpacity = useTransform(scrollY, [0, 120], [0, 1]);

  return (
    <motion.header
      style={{
        background: bg,
        WebkitBackdropFilter: blurPx,
        backdropFilter: blurPx,
        borderBottomColor: "#f1f5f9",
      }}
      className="fixed top-0 left-0 right-0 z-50 border-b"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2">
          <motion.div
            whileHover={{ rotate: 10, scale: 1.05 }}
            className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
          >
            GradeUp
          </motion.div>
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-sm font-semibold text-indigo-500"
          >
            AI
          </motion.div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <motion.a
            href="#features"
            whileHover={{ color: "#6366f1" }}
            className="text-text-muted hover:text-text-main transition-colors"
          >
            Features
          </motion.a>
          <motion.a
            href="#testimonials"
            whileHover={{ color: "#6366f1" }}
            className="text-text-muted hover:text-text-main transition-colors"
          >
            Testimonials
          </motion.a>
          <motion.a
            href="#pricing"
            whileHover={{ color: "#6366f1" }}
            className="text-text-muted hover:text-text-main transition-colors"
          >
            Pricing
          </motion.a>
        </nav>

        {/* CTA Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link href="/auth" className="btn-primary text-sm">
            Get Started
          </Link>
        </motion.div>
      </div>
    </motion.header>
  );
}
