/**
 * SessionTimeoutModal.tsx
 *
 * Warning modal shown before auto-logout.
 * Displays a countdown ring + "Stay logged in" / "Logout now" buttons.
 * Matches the GradeUp dashboard design system exactly.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ShieldAlert, Timer } from "lucide-react";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.sto-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(15,23,42,.65);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.sto-card {
  background: #fff;
  border-radius: 24px;
  border: 1px solid rgba(0,0,0,.06);
  box-shadow: 0 32px 80px rgba(0,0,0,.22);
  width: 100%;
  max-width: 400px;
  overflow: hidden;
}

/* ── Top gradient banner ── */
.sto-banner {
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  padding: 22px 24px 18px;
  position: relative; overflow: hidden;
}
.sto-banner::before {
  content: '';
  position: absolute; top: -40px; right: -40px;
  width: 130px; height: 130px; border-radius: 50%;
  background: rgba(255,255,255,.12); pointer-events: none;
}
.sto-banner::after {
  content: '';
  position: absolute; bottom: -30px; left: 20%;
  width: 90px; height: 90px; border-radius: 50%;
  background: rgba(255,255,255,.08); pointer-events: none;
}
.sto-banner-inner {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 14px;
}
.sto-banner-icon {
  width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
  background: rgba(255,255,255,.22);
  border: 1.5px solid rgba(255,255,255,.3);
  display: flex; align-items: center; justify-content: center;
}
.sto-banner-title {
  font-size: 17px; font-weight: 800; color: #fff;
  letter-spacing: -.2px; line-height: 1.2;
}
.sto-banner-sub {
  font-size: 12px; color: rgba(255,255,255,.72);
  margin-top: 2px; line-height: 1.4;
}

/* ── Body ── */
.sto-body { padding: 24px 24px 20px; }

/* Countdown ring */
.sto-ring-wrap {
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px;
}
.sto-ring-outer {
  position: relative; width: 110px; height: 110px;
}
.sto-ring-outer svg {
  width: 110px; height: 110px;
  transform: rotate(-90deg);
}
.sto-ring-bg   { fill: none; stroke: #f1f5f9; stroke-width: 8; }
.sto-ring-fill { fill: none; stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset .9s linear; }
.sto-ring-label {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}
.sto-ring-num {
  font-size: 28px; font-weight: 800; color: #0f172a; line-height: 1;
}
.sto-ring-unit { font-size: 11px; color: #94a3b8; font-weight: 600; margin-top: 1px; }

/* Info text */
.sto-info {
  text-align: center; margin-bottom: 22px;
}
.sto-info-title {
  font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 5px;
}
.sto-info-sub {
  font-size: 13px; color: #64748b; line-height: 1.55;
}
.sto-info-sub strong { color: #ef4444; font-weight: 700; }

/* Buttons */
.sto-btns { display: flex; gap: 10px; }
.sto-btn-stay {
  flex: 1; padding: 13px 16px; border-radius: 14px; border: none;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; font-family: inherit; font-size: 13.5px; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px;
  box-shadow: 0 4px 14px rgba(99,102,241,.32); transition: all .2s;
}
.sto-btn-stay:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,.42); }

.sto-btn-logout {
  padding: 13px 16px; border-radius: 14px;
  border: 1.5px solid rgba(239,68,68,.25);
  background: rgba(239,68,68,.06); color: #dc2626;
  font-family: inherit; font-size: 13px; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; gap: 6px;
  transition: all .2s; white-space: nowrap;
}
.sto-btn-logout:hover {
  background: rgba(239,68,68,.1);
  border-color: rgba(239,68,68,.4);
}

/* Progress bar at very bottom */
.sto-progress {
  height: 3px;
  background: #f1f5f9;
}
.sto-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #ef4444);
  transition: width .9s linear;
}

/* Mobile */
@media (max-width: 480px) {
  .sto-btns { flex-direction: column; }
  .sto-btn-logout { justify-content: center; }
}
`;

interface SessionTimeoutModalProps {
  visible:        boolean;
  secondsLeft:    number;
  totalSeconds:   number;       // same as warningSeconds in the hook
  onStay:         () => void;
  onLogout:       () => void;
}

export function SessionTimeoutModal({
  visible,
  secondsLeft,
  totalSeconds,
  onStay,
  onLogout,
}: SessionTimeoutModalProps) {
  const R         = 45;                         // SVG circle radius
  const CIRC      = 2 * Math.PI * R;            // circumference
  const progress  = secondsLeft / totalSeconds; // 1 → 0
  const offset    = CIRC * (1 - progress);      // stroke-dashoffset

  // Ring colour shifts amber → red as time runs out
  const ringColor = secondsLeft > totalSeconds * 0.5
    ? "#f59e0b"
    : secondsLeft > totalSeconds * 0.2
      ? "#f97316"
      : "#ef4444";

  const mins    = Math.floor(secondsLeft / 60);
  const secs    = secondsLeft % 60;
  const display = mins > 0
    ? `${mins}:${secs.toString().padStart(2, "0")}`
    : `${secondsLeft}`;
  const unit    = mins > 0 ? "min" : "sec";

  return (
    <>
      <style>{CSS}</style>
      <AnimatePresence>
        {visible && (
          <motion.div
            className="sto-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .2 }}
          >
            <motion.div
              className="sto-card"
              initial={{ opacity: 0, scale: .88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: .88, y: 20 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
            >
              {/* Banner */}
              <div className="sto-banner">
                <div className="sto-banner-inner">
                  <div className="sto-banner-icon">
                    <ShieldAlert size={22} color="#fff" />
                  </div>
                  <div>
                    <div className="sto-banner-title">Session Expiring Soon</div>
                    <div className="sto-banner-sub">You've been inactive for a while</div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="sto-body">
                {/* Countdown ring */}
                <div className="sto-ring-wrap">
                  <div className="sto-ring-outer">
                    <svg viewBox="0 0 110 110">
                      <circle className="sto-ring-bg"   cx="55" cy="55" r={R} />
                      <circle
                        className="sto-ring-fill"
                        cx="55" cy="55" r={R}
                        stroke={ringColor}
                        strokeDasharray={CIRC}
                        strokeDashoffset={offset}
                      />
                    </svg>
                    <div className="sto-ring-label">
                      <div className="sto-ring-num">{display}</div>
                      <div className="sto-ring-unit">{unit}</div>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="sto-info">
                  <div className="sto-info-title">Are you still there?</div>
                  <div className="sto-info-sub">
                    For your security, you'll be automatically logged out in{" "}
                    <strong>{display} {unit}</strong> due to inactivity.
                  </div>
                </div>

                {/* Buttons */}
                <div className="sto-btns">
                  <button className="sto-btn-stay" onClick={onStay}>
                    <Timer size={15} />
                    Yes, keep me logged in
                  </button>
                  <button className="sto-btn-logout" onClick={onLogout}>
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="sto-progress">
                <div
                  className="sto-progress-fill"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}