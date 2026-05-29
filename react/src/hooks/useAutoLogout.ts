/**
 * useAutoLogout.ts
 *
 * Auto-logout hook for GradeUp.
 *
 * Behaviour:
 *  • Tracks mouse, keyboard, touch, scroll — any activity resets the idle timer.
 *  • After IDLE_TIMEOUT ms of inactivity → shows a countdown warning modal.
 *  • If user doesn't respond within WARNING_DURATION ms → calls logout().
 *  • Tab close / browser close → records timestamp in localStorage.
 *    On next open, if the gap exceeds CLOSE_TIMEOUT ms → immediate logout.
 *
 * Usage:
 *   const { warningVisible, secondsLeft, extendSession } = useAutoLogout({
 *     onLogout: () => logoutMutation.mutate(),
 *     idleMinutes: 10,          // optional, default 10
 *     warningSeconds: 120,      // optional, default 120 (2-min countdown)
 *     closeMinutes: 15,         // optional, default 15 (tab-closed grace period)
 *   });
 */

import { useState, useEffect, useRef, useCallback } from "react";

interface UseAutoLogoutOptions {
  onLogout: () => void;
  idleMinutes?: number;      // inactivity before warning appears (default: 10)
  warningSeconds?: number;   // countdown seconds once warning shows (default: 120)
  closeMinutes?: number;     // grace period for closed tab (default: 15)
  enabled?: boolean;         // can be disabled (e.g. on login page)
}

interface UseAutoLogoutReturn {
  warningVisible: boolean;   // true → render the warning modal
  secondsLeft: number;       // countdown seconds remaining
  extendSession: () => void; // call this when user clicks "Stay logged in"
}

const LS_KEY = "gradeup_last_active";

export function useAutoLogout({
  onLogout,
  idleMinutes   = 10,
  warningSeconds = 120,
  closeMinutes  = 15,
  enabled       = true,
}: UseAutoLogoutOptions): UseAutoLogoutReturn {
  const IDLE_MS    = idleMinutes    * 60 * 1000;
  const CLOSE_MS   = closeMinutes   * 60 * 1000;
  const WARNING_MS = warningSeconds * 1000;

  const [warningVisible, setWarningVisible] = useState(false);
  const [secondsLeft,    setSecondsLeft]    = useState(warningSeconds);

  // Refs so callbacks always see latest values without re-registering listeners
  const logoutRef       = useRef(onLogout);
  const idleTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningShownRef = useRef(false);
  const enabledRef      = useRef(enabled);

  useEffect(() => { logoutRef.current  = onLogout; }, [onLogout]);
  useEffect(() => { enabledRef.current = enabled;  }, [enabled]);

  /* ── helpers ── */
  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current);  idleTimerRef.current  = null; }
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const doLogout = useCallback(() => {
    clearIdleTimer();
    clearCountdown();
    setWarningVisible(false);
    warningShownRef.current = false;
    localStorage.removeItem(LS_KEY);
    logoutRef.current();
  }, [clearIdleTimer, clearCountdown]);

  const showWarning = useCallback(() => {
    if (warningShownRef.current) return;
    warningShownRef.current = true;
    setWarningVisible(true);
    setSecondsLeft(warningSeconds);

    let remaining = warningSeconds;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        doLogout();
      }
    }, 1000);
  }, [warningSeconds, doLogout]);

  const startIdleTimer = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      showWarning();
    }, IDLE_MS);
  }, [IDLE_MS, clearIdleTimer, showWarning]);

  /* ── reset on any activity ── */
  const handleActivity = useCallback(() => {
    if (!enabledRef.current) return;
    // Update heartbeat in localStorage (for cross-tab awareness)
    localStorage.setItem(LS_KEY, Date.now().toString());
    // If warning is showing, don't reset — user must explicitly click "Stay"
    if (warningShownRef.current) return;
    startIdleTimer();
  }, [startIdleTimer]);

  /* ── extendSession — called by "Stay logged in" button ── */
  const extendSession = useCallback(() => {
    clearCountdown();
    setWarningVisible(false);
    warningShownRef.current = false;
    localStorage.setItem(LS_KEY, Date.now().toString());
    startIdleTimer();
  }, [clearCountdown, startIdleTimer]);

  /* ── Tab close / browser close grace period ── */
  useEffect(() => {
    if (!enabled) return;

    // On page load: check if user closed the tab without logging out
    const lastActive = localStorage.getItem(LS_KEY);
    if (lastActive) {
      const elapsed = Date.now() - parseInt(lastActive, 10);
      if (elapsed > CLOSE_MS) {
        // User was away too long — logout immediately on return
        doLogout();
        return;
      }
    }

    // Record heartbeat every 30s while page is open
    localStorage.setItem(LS_KEY, Date.now().toString());
    const heartbeat = setInterval(() => {
      if (!warningShownRef.current) {
        localStorage.setItem(LS_KEY, Date.now().toString());
      }
    }, 30_000);

    // On tab hidden: record exact timestamp
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        localStorage.setItem(LS_KEY, Date.now().toString());
      } else if (document.visibilityState === "visible") {
        // Tab came back: check elapsed
        const ts = localStorage.getItem(LS_KEY);
        if (ts) {
          const elapsed = Date.now() - parseInt(ts, 10);
          if (elapsed > CLOSE_MS) {
            doLogout();
          }
        }
      }
    };

    // beforeunload: stamp the time
    const handleBeforeUnload = () => {
      localStorage.setItem(LS_KEY, Date.now().toString());
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, CLOSE_MS, doLogout]);

  /* ── Activity listeners ── */
  useEffect(() => {
    if (!enabled) return;

    const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

    // Throttle: only reset timer max once per 10s to avoid hammering
    let lastReset = 0;
    const throttledActivity = () => {
      const now = Date.now();
      if (now - lastReset < 10_000) return;
      lastReset = now;
      handleActivity();
    };

    EVENTS.forEach(ev => window.addEventListener(ev, throttledActivity, { passive: true }));
    startIdleTimer(); // kick off on mount

    return () => {
      EVENTS.forEach(ev => window.removeEventListener(ev, throttledActivity));
      clearIdleTimer();
      clearCountdown();
    };
  }, [enabled, handleActivity, startIdleTimer, clearIdleTimer, clearCountdown]);

  return { warningVisible, secondsLeft, extendSession };
}