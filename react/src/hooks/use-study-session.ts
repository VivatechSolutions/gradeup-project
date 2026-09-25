import { useEffect, useRef } from "react";
import { completeStudySession, heartbeatStudySession, startStudySession } from "../lib/gradeupApi";

type StudySessionOptions = {
  enabled: boolean;
  activityType: string;
  subjectGroupKey?: string;
  bookId?: string;
  unitId?: string;
  sourceId?: string;
  metadata?: any;
};

export function useStudySession(options: StudySessionOptions) {
  const sessionIdRef = useRef<string | null>(null);
  const sequenceRef = useRef(0);
  const lastInteractionRef = useRef(Date.now());

  useEffect(() => {
    if (!options.enabled) return;
    let disposed = false;
    let timer: number | undefined;
    const markActive = () => { lastInteractionRef.current = Date.now(); };
    const events: Array<keyof WindowEventMap> = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }));

    startStudySession({
      activityType: options.activityType,
      subjectGroupKey: options.subjectGroupKey,
      bookId: options.bookId,
      unitId: options.unitId,
      sourceId: options.sourceId,
      metadata: options.metadata,
    }).then((session) => {
      if (disposed) {
        if (session?._id) void completeStudySession(session._id);
        return;
      }
      sessionIdRef.current = session?._id || null;
      sequenceRef.current = 0;
      timer = window.setInterval(() => {
        const sessionId = sessionIdRef.current;
        if (!sessionId) return;
        sequenceRef.current += 1;
        void heartbeatStudySession(sessionId, {
          sequence: sequenceRef.current,
          active: Date.now() - lastInteractionRef.current < 90_000,
          visible: document.visibilityState === "visible" && document.hasFocus(),
        }).catch(() => undefined);
      }, 30_000);
    }).catch(() => undefined);

    return () => {
      disposed = true;
      events.forEach((event) => window.removeEventListener(event, markActive));
      if (timer) window.clearInterval(timer);
      const sessionId = sessionIdRef.current;
      sessionIdRef.current = null;
      if (sessionId) void completeStudySession(sessionId, options.metadata).catch(() => undefined);
    };
  }, [options.enabled, options.activityType, options.subjectGroupKey, options.bookId, options.unitId, options.sourceId]);
}
