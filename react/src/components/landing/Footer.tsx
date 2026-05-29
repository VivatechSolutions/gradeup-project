import React from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/10 bg-gradient-to-b from-transparent to-indigo-950/10">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                GradeUp
              </span>
              <span className="text-sm font-bold text-indigo-500">AI</span>
            </Link>
            <p className="text-sm text-text-muted leading-relaxed">
              Transform education with intelligent, data-driven learning experiences.
            </p>
          </motion.div>

          {/* Product */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <h4 className="font-semibold text-text-main mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li>
                <a href="#features" className="hover:text-text-main transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-text-main transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#testimonials" className="hover:text-text-main transition-colors">
                  Testimonials
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-text-main transition-colors">
                  Roadmap
                </a>
              </li>
            </ul>
          </motion.div>

          {/* Company */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h4 className="font-semibold text-text-main mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li>
                <a href="#" className="hover:text-text-main transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-text-main transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-text-main transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-text-main transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </motion.div>

          {/* Legal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <h4 className="font-semibold text-text-main mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li>
                <a href="#" className="hover:text-text-main transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-text-main transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-text-main transition-colors">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-text-main transition-colors">
                  GDPR
                </a>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 py-8" />

        {/* Bottom section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-text-muted">
          <div>
            © {currentYear} GradeUp AI. All rights reserved.
          </div>

          {/* Social links */}
          <div className="flex items-center gap-6">
            <motion.a
              href="#"
              whileHover={{ scale: 1.2 }}
              className="text-text-muted hover:text-indigo-500 transition-colors"
              title="Twitter"
            >
              𝕏
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.2 }}
              className="text-text-muted hover:text-indigo-500 transition-colors"
              title="LinkedIn"
            >
              in
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.2 }}
              className="text-text-muted hover:text-indigo-500 transition-colors"
              title="GitHub"
            >
              ⚙️
            </motion.a>
          </div>
        </div>
      </div>
    </footer>
  );
}
