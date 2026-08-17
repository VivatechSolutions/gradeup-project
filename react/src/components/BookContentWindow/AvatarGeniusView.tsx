import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Hand,
  Pause,
  Play,
  Send,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import {
  endAvatarSession,
  generateAvatarFlashcard,
  raiseAvatarHand,
  resumeAvatarSession,
  startAvatarSession,
} from "../../lib/gradeupApi";

type GeniusContext = {
  unitId: string;
  sectionTitle: string;
  subject?: string;
  unitTitle?: string;
  bookTitle?: string;
  term?: string | null;
  theme?: "light" | "dark";
  avatarTeacher?: "man" | "woman";
  segments?: AvatarSegment[] | null;
  avatarExplanationMeta?: {
    teachingStyle?: string | null;
    totalDurationEstimate?: string | null;
  } | null;
};

type AvatarSegment = {
  segment_id?: string;
  type?: string;
  text?: string;
  emotion?: string;
  card_title?: string;
  front?: string;
  avatar_line?: string;
  avatar_emotion?: string;
  flashcard_type?: string;
  question?: string;
  options?: Record<string, string>;
  answer?: string;
  option_explanations?: Record<string, string>;
  audio?: {
    male?: string;
    female?: string;
  };
};

type AvatarFlashcard = AvatarSegment & {
  flashcard_id?: string;
  segment_id?: string;
  flashcard_type?: string;
};

const CONTEXT_KEY = "gradeup-avatar-genius-context";
const TEACHER_KEY = "gradeup-avatar-teacher";

function readContext(): GeniusContext | null {
  try {
    const raw =
      sessionStorage.getItem(CONTEXT_KEY) ||
      localStorage.getItem(CONTEXT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getSegments(payload: any): AvatarSegment[] {
  const segments =
    payload?.avatar_explanation?.segments ||
    payload?.remaining_segments ||
    payload?.segments ||
    [];
  return Array.isArray(segments) ? segments : [];
}

function getAudioUrl(segment: AvatarSegment | null, teacher: "man" | "woman") {
  if (!segment?.audio) return "";
  return teacher === "woman"
    ? segment.audio.female || segment.audio.male || ""
    : segment.audio.male || segment.audio.female || "";
}

function segmentText(segment: AvatarSegment | null) {
  if (!segment) return "";
  if (String(segment.type || "").toLowerCase() === "flashcard") {
    return segment.avatar_line || segment.front || "Let's pause for a quick check.";
  }
  return segment.text || "";
}

function emotionClass(value = "") {
  const normalized = String(value || "explaining").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `emo-${normalized || "explaining"}`;
}

function AvatarFigure({
  emotion,
  speaking,
  teacher,
}: {
  emotion?: string;
  speaking: boolean;
  teacher: "man" | "woman";
}) {
  return (
    <div className={`avatar-wrap ${teacher === "woman" ? "teacher-woman" : "teacher-man"} ${emotionClass(emotion)} ${speaking ? "emo-talking" : ""}`}>
      <div className="av-r action-open">
        <div className="av-shadow" />
        <div className="av-shoe l" />
        <div className="av-shoe r" />
        <div className="av-leg l" />
        <div className="av-leg r" />
        <div className="av-arm l">
          <div className="av-hand" />
        </div>
        <div className="av-arm r">
          <div className="av-hand" />
          <div className="av-stick" />
        </div>
        <div className="av-torso">
          <div className="av-shirt" />
          <div className="av-tie" />
        </div>
        <div className="av-neck" />
        <div className="av-head">
          <div className="av-ponytail" />
          <div className="av-hair" />
          <div className="av-ear l" />
          <div className="av-ear r" />
          <div className="av-brow l" />
          <div className="av-brow r" />
          <div className="av-eye l"><div className="av-pupil" /></div>
          <div className="av-eye r"><div className="av-pupil" /></div>
          <div className="av-glasses">
            <div className="av-lens" />
            <div className="av-bridge" />
            <div className="av-lens" />
          </div>
          <div className="av-nose" />
          <div className="av-cheek l" />
          <div className="av-cheek r" />
          <div className="av-mouth">
            <div className="av-mouth-shape">
              <div className="av-teeth" />
            </div>
          </div>
        </div>
        <div className="av-book" />
      </div>
    </div>
  );
}

export default function AvatarGeniusView() {
  const [context, setContext] = useState<GeniusContext | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [segments, setSegments] = useState<AvatarSegment[]>([]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<"loading" | "playing" | "paused" | "waiting_flashcard" | "completed" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [teacher, setTeacher] = useState<"man" | "woman">("man");
  const [flashcards, setFlashcards] = useState<Record<string, AvatarFlashcard>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, { correct: boolean; message: string }>>({});
  const [doubtOpen, setDoubtOpen] = useState(false);
  const [doubtText, setDoubtText] = useState("");
  const [clarifications, setClarifications] = useState<Array<{ text: string; emotion?: string }>>([]);
  const [isRaisingHand, setIsRaisingHand] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const endedRef = useRef(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const current = segments[index] || null;
  const currentKey = String(current?.segment_id || `segment-${index}`);
  const card = current ? flashcards[currentKey] || flashcards[String(current.segment_id || "")] : null;
  const display = card ? { ...current, ...card } : current;
  const displayType = String(display?.type || "").toLowerCase();
  const flashcardType = String(
    display?.flashcard_type || (display?.question || display?.options ? "mcq" : "informative"),
  ).toLowerCase();
  const isMcq = displayType === "flashcard" && (flashcardType === "mcq" || Boolean(display?.question));
  const canAnswer = isMcq && status === "waiting_flashcard" && !feedback[currentKey];
  const progress = segments.length ? ((index + (status === "completed" ? 1 : 0)) / segments.length) * 100 : 0;

  const teachingSegments = useMemo(
    () => segments.filter((segment) => String(segment.type || "").toLowerCase() !== "flashcard"),
    [segments],
  );
  const teacherName = teacher === "woman" ? "Prof. Maya" : "Prof. Nova";

  useEffect(() => {
    const ctx = readContext();
    setContext(ctx);
    const nextTheme = ctx?.theme === "dark" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    const storedTeacher =
      localStorage.getItem(TEACHER_KEY) || sessionStorage.getItem(TEACHER_KEY);
    const nextTeacher =
      storedTeacher === "woman" || storedTeacher === "man"
        ? storedTeacher
        : ctx?.avatarTeacher === "woman"
          ? "woman"
          : "man";
    setTeacher(nextTeacher);
  }, []);

  useEffect(() => {
    localStorage.setItem(TEACHER_KEY, teacher);
    sessionStorage.setItem(TEACHER_KEY, teacher);
  }, [teacher]);

  useEffect(() => {
    if (!context?.unitId || !context.sectionTitle) return;
    let cancelled = false;

    async function start() {
      setStatus("loading");
      setError(null);
      try {
        const response = await startAvatarSession({
          unitId: context.unitId,
          sectionTitle: context.sectionTitle,
          term: context.term || null,
          segments: Array.isArray(context.segments) ? context.segments : null,
        });
        if (cancelled) return;
        const nextSegments = getSegments(response);
        const nextSessionId = response?.session_id || response?.sessionId;
        if (!nextSessionId || !nextSegments.length) {
          throw new Error("Avatar session did not return playable segments.");
        }
        setSessionId(String(nextSessionId));
        setSegments(nextSegments);
        setIndex(0);
        setStatus("playing");

        const flashcardSegments = nextSegments.filter(
          (segment) => String(segment.type || "").toLowerCase() === "flashcard",
        );
        if (flashcardSegments.length) {
          generateAvatarFlashcard({
            sessionId: String(nextSessionId),
            flashCards: flashcardSegments.map((segment) => {
              const segmentId = String(segment.segment_id || "");
              return {
                flashcardId: segmentId,
                flashcardType: segment.flashcard_type || (segment.question || segment.options ? "mcq" : "informative"),
                segmentId,
              };
            }),
          })
            .then((cardResponse) => {
              const cards = Array.isArray(cardResponse?.flash_cards) ? cardResponse.flash_cards : [];
              setFlashcards((prev) => {
                const next = { ...prev };
                cards.forEach((item: AvatarFlashcard) => {
                  const key = String(item.flashcard_id || item.segment_id || "");
                  if (key) next[key] = item;
                });
                return next;
              });
            })
            .catch((err) => setError(err?.message || "Some flashcards could not be generated."));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Unable to start Genius Mode.");
          setStatus("error");
        }
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [context]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (status !== "playing" || !display) return;
    const playingSegment = display;
    const audioUrl = getAudioUrl(playingSegment, teacher);
    if (!audioUrl) {
      const t = window.setTimeout(() => handleAudioEnded(playingSegment), 900);
      return () => window.clearTimeout(t);
    }

    const audio = new Audio(audioUrl);
    audio.playbackRate = speed;
    audioRef.current = audio;
    audio.onended = () => handleAudioEnded(playingSegment);
    audio.onerror = () => {
      setError("Audio could not be played for this segment.");
      handleAudioEnded(playingSegment);
    };
    audio.play().catch(() => {
      setError("Tap Play if your browser blocked autoplay.");
      setStatus("paused");
    });

    return () => {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      if (audioRef.current === audio) audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, index, segments, speed, teacher, card]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: contentRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [index, segments.length]);

  function handleAudioEnded(segment: AvatarSegment | null) {
    if (String(segment?.type || "").toLowerCase() === "flashcard") {
      setStatus("waiting_flashcard");
      return;
    }
    advance();
  }

  function advance() {
    setIndex((currentIndex) => {
      const next = currentIndex + 1;
      if (next >= segments.length) {
        window.setTimeout(() => complete(), 0);
        return currentIndex;
      }
      setStatus("playing");
      return next;
    });
  }

  async function complete() {
    setStatus("completed");
    if (!sessionId || endedRef.current) return;
    endedRef.current = true;
    try {
      await endAvatarSession({ sessionId });
    } catch {}
  }

  function togglePlay() {
    if (status === "playing") {
      audioRef.current?.pause();
      setStatus("paused");
      return;
    }
    if (status === "paused" || status === "waiting_flashcard") {
      if (displayType === "flashcard" && status === "waiting_flashcard") return;
      setStatus("playing");
    }
  }

  async function closePage() {
    if (audioRef.current) audioRef.current.pause();
    if (sessionId && status !== "completed" && !endedRef.current) {
      endedRef.current = true;
      try {
        await endAvatarSession({ sessionId });
      } catch {}
    }
    window.close();
  }

  async function submitDoubt() {
    if (!sessionId || !doubtText.trim() || isRaisingHand) return;
    audioRef.current?.pause();
    setStatus("paused");
    setIsRaisingHand(true);
    try {
      const response = await raiseAvatarHand({
        sessionId,
        studentDoubt: doubtText.trim(),
      });
      const nextClarifications = response?.clarification?.segments;
      setClarifications(Array.isArray(nextClarifications) ? nextClarifications : []);
      setDoubtText("");
    } catch (err: any) {
      setError(err?.message || "Unable to clear this doubt right now.");
    } finally {
      setIsRaisingHand(false);
    }
  }

  async function resumeLesson() {
    if (!sessionId || isResuming) return;
    setIsResuming(true);
    try {
      const response = await resumeAvatarSession({ sessionId });
      const remaining = getSegments(response);
      if (remaining.length) {
        setSegments(remaining);
        setIndex(0);
      }
      setClarifications([]);
      setDoubtOpen(false);
      setStatus("playing");
    } catch (err: any) {
      setError(err?.message || "Unable to resume the avatar session.");
    } finally {
      setIsResuming(false);
    }
  }

  function submitMcq() {
    const answer = String(answers[currentKey] || "").trim().toUpperCase();
    const correctAnswer = String(display?.answer || "").trim().toUpperCase();
    if (!answer || !correctAnswer) return;
    const explanations = display?.option_explanations || {};
    const correct = answer === correctAnswer;
    setFeedback((prev) => ({
      ...prev,
      [currentKey]: {
        correct,
        message: correct
          ? "Congratulations, your answer is correct. Excellent work."
          : explanations[answer] || explanations[correctAnswer] || `The correct answer is ${correctAnswer}.`,
      },
    }));
  }

  if (!context) {
    return (
      <main className="genius-empty">
        <style>{styles}</style>
        <Sparkles size={32} />
        <h1>Genius Mode context missing</h1>
        <p>Open Genius Mode from a book section again.</p>
      </main>
    );
  }

  return (
    <div className="genius-shell" data-theme={theme}>
      <style>{styles}</style>
      <nav id="topbar">
        <div className="tb-brand">
          <div className="tb-logo">🎓</div>
          <span className="tb-name">Genius Mode</span>
          <div className="tb-pill">{context.subject || "Subject"}</div>
        </div>
        <div className="tb-right">
          <button className={`tb-btn ${status === "paused" ? "paused" : ""}`} onClick={togglePlay}>
            {status === "playing" ? <Pause size={13} /> : <Play size={13} />}
            <span>{status === "playing" ? "Pause" : "Play"}</span>
          </button>
          <div className={`settings-wrap ${settingsOpen ? "open" : ""}`}>
            <button className="tb-icon" onClick={() => setSettingsOpen((open) => !open)} title="Settings">
              <Settings size={15} />
            </button>
            <div className="settings-menu">
              <div className="set-title">Tutor Settings</div>
              <div className="set-row">
                <span className="set-label">Teacher</span>
                <select
                  className="set-select"
                  value={teacher}
                  onChange={(event) => setTeacher(event.target.value === "woman" ? "woman" : "man")}
                >
                  <option value="man">Man</option>
                  <option value="woman">Woman</option>
                </select>
              </div>
              <div className="set-row">
                <span className="set-label">Speed</span>
                <select className="set-select" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                </select>
              </div>
              <div className="set-row">
                <span className="set-label">Theme</span>
                <button
                  className={`set-toggle ${theme === "dark" ? "on" : ""}`}
                  onClick={() => {
                    const next = theme === "dark" ? "light" : "dark";
                    setTheme(next);
                    document.documentElement.dataset.theme = next;
                  }}
                />
              </div>
            </div>
          </div>
          <button className="tb-icon" onClick={closePage} title="Close">
            <X size={16} />
          </button>
        </div>
      </nav>

      <main id="app">
        <section id="content-panel">
          <div id="content-scroll" ref={contentRef}>
            <div className="ch-eyebrow">{context.unitTitle || context.bookTitle || "Avatar lesson"}</div>
            <h1 className="ch-title">{context.sectionTitle}</h1>
            <div className="ch-meta">
              {status === "loading"
                ? "Preparing your lesson..."
                : context.avatarExplanationMeta?.totalDurationEstimate || `${segments.length || 1} guided segments`}
            </div>
            <div className="ch-divider" />

            {segments.slice(0, Math.min(index + 1, segments.length)).map((segment, segmentIndex) => {
              const isActive = segmentIndex === index;
              const key = String(segment.segment_id || segmentIndex);
              const merged = flashcards[key] ? { ...segment, ...flashcards[key] } : segment;
              const type = String(merged.type || "").toLowerCase();
              if (type === "flashcard") {
                return (
                  <article key={key} className={`inline-card visible ${isActive ? "active" : ""}`}>
                    <div className="ic-header">
                      <span className="ic-tag">{merged.question ? "Quick Check" : "Flashcard"}</span>
                      <span className="ic-flip-hint">Segment {segmentIndex + 1}</span>
                    </div>
                    <div className="ic-scene">
                      {merged.question ? (
                        <div>
                          <p className="ic-q">{merged.question}</p>
                          <div className="mcq-options">
                            {Object.entries(merged.options || {}).map(([option, text]) => (
                              <div className="mcq-option" key={option}>
                                <b>{option}</b>
                                <span>{text}</span>
                              </div>
                            ))}
                          </div>
                          {isActive && (
                            <div className="answer-row">
                              <input
                                value={answers[currentKey] || ""}
                                onChange={(event) =>
                                  setAnswers((prev) => ({ ...prev, [currentKey]: event.target.value }))
                                }
                                disabled={!canAnswer}
                                placeholder={status === "waiting_flashcard" ? "Type A, B, C or D" : "Answer unlocks after audio"}
                              />
                              <button disabled={!canAnswer || !answers[currentKey]?.trim()} onClick={submitMcq}>Check</button>
                            </div>
                          )}
                          {feedback[key] && (
                            <div className={`feedback ${feedback[key].correct ? "correct" : "wrong"}`}>
                              {feedback[key].correct ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
                              <div>
                                <strong>{feedback[key].correct ? "Excellent" : "Review this"}</strong>
                                <p>{feedback[key].message}</p>
                                {!feedback[key].correct && merged.option_explanations && (
                                  <div className="option-explain">
                                    {Object.entries(merged.option_explanations).map(([option, text]) => (
                                      <p key={option}><b>{option}:</b> {text}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="ic-q">{merged.front || merged.avatar_line || "A supporting flashcard is being prepared."}</p>
                      )}
                    </div>
                    {isActive && status === "waiting_flashcard" && (!isMcq || feedback[currentKey]) && (
                      <div className="ic-footer">
                        <button className="ic-fb-btn ic-fb-got" onClick={advance}>Continue</button>
                      </div>
                    )}
                  </article>
                );
              }
              return (
                <p key={key} className={`typed-para visible ${isActive ? "typing-active" : ""}`}>
                  {segment.text}
                  {isActive && status === "playing" ? <span className="cursor" /> : null}
                </p>
              );
            })}

            {status === "loading" && <div className="loading-card">Preparing the avatar teacher...</div>}
            {error && <div className="error-card">{error}</div>}
          </div>
          <div id="prog-bar"><div id="prog-fill" style={{ width: `${Math.min(100, progress)}%` }} /></div>
        </section>

        <aside id="avatar-panel" className={teacher === "woman" ? "teacher-woman" : "teacher-man"}>
          <div id="av-stage">
            <div className="av-name-badge">{teacherName}</div>
            <div className="speech-bub visible">{segmentText(display) || "Ready when you are."}</div>
            <AvatarFigure emotion={display?.emotion || display?.avatar_emotion} speaking={status === "playing"} teacher={teacher} />
            <div className="av-status">
              <span className="status-dot" />
              {status === "playing" ? "Speaking" : status === "waiting_flashcard" ? "Waiting for you" : status}
            </div>
            <button id="raise-btn" onClick={() => setDoubtOpen(true)}>
              <Hand size={16} />
              Raise hand
            </button>
          </div>
          <div id="topics-area">
            <div className="topic-label">Lesson Map</div>
            {teachingSegments.map((segment, topicIndex) => (
              <div className={`topic-item ${topicIndex <= index ? "done" : ""}`} key={segment.segment_id || topicIndex}>
                <span className="ti-num">{topicIndex + 1}</span>
                <span className="ti-body">
                  <span className="ti-name">{segment.text?.slice(0, 40) || "Teaching point"}</span>
                </span>
              </div>
            ))}
          </div>
        </aside>
      </main>

      <div id="voice-bar" className="show">
        <button className="vb-btn play" onClick={togglePlay}>{status === "playing" ? <Pause size={16} /> : <Play size={16} />}</button>
        <button className="vb-btn segment" onClick={() => setIndex((value) => Math.max(0, value - 1))}><ChevronLeft size={16} /></button>
        <div className="vb-track">
          <div className="vb-label">
            <span>{display?.segment_id || "Segment"}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="vb-bg"><div className="vb-fill" style={{ width: `${Math.min(100, progress)}%` }} /></div>
        </div>
        <button className="vb-btn segment" onClick={advance}><ChevronRight size={16} /></button>
        <span className="vb-spd">{speed}x</span>
        <div className="wave">
          {[0, 1, 2, 3, 4].map((bar) => <span className={`wb ${status === "playing" ? "on" : ""}`} key={bar} />)}
        </div>
      </div>

      <div id="doubt-overlay" className={doubtOpen ? "open" : ""}>
        <div id="doubt-box">
          <div className="db-head">
            <div className="db-avatar">✋</div>
            <div>
              <div className="db-title">Ask {teacherName}</div>
              <div className="db-sub">Ask a doubt and the avatar will pause to clarify.</div>
            </div>
            <button className="db-close" onClick={() => setDoubtOpen(false)}>×</button>
          </div>
          <div className="db-msgs">
            {clarifications.length ? (
              clarifications.map((item, itemIndex) => (
                <div className="db-msg ai" key={`${item.text}-${itemIndex}`}>
                  <div className="db-bubble">{item.text}</div>
                </div>
              ))
            ) : (
              <div className="db-msg ai"><div className="db-bubble">What would you like me to explain differently?</div></div>
            )}
          </div>
          <div className="db-input-row open">
            <input
              className="db-input"
              value={doubtText}
              onChange={(event) => setDoubtText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitDoubt();
              }}
              placeholder="Type your doubt..."
            />
            <button className="db-send" onClick={submitDoubt} disabled={isRaisingHand}><Send size={16} /></button>
          </div>
          {clarifications.length > 0 && (
            <div className="db-voice-actions">
              <button className="db-small-btn primary" onClick={resumeLesson} disabled={isResuming}>
                {isResuming ? "Resuming..." : "Resume lesson"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div id="complete-screen" className={status === "completed" ? "open" : ""}>
        <div className="cs-card">
          <button className="cs-close" onClick={closePage}>×</button>
          <div className="cs-emoji">🎉</div>
          <div className="cs-title">Lesson Complete</div>
          <p className="cs-sub">You completed the avatar explanation for this section.</p>
          <div className="cs-actions">
            <button className="cs-btn" onClick={closePage}>Back to book</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#f4f5f8;--surface:#fff;--surface2:#f0f2f7;--border:rgba(0,0,0,.08);
  --text:#0d1021;--sub:#4a5068;--muted:#8891aa;
  --accent:#5b5ef7;--accent2:#7c5ef7;--green:#10b981;--amber:#f59e0b;--red:#ef4444;
  --sh:0 2px 16px rgba(0,0,0,.06);--sh2:0 12px 40px rgba(0,0,0,.12);
  --r:14px;--r2:20px;--ah:52px;
}
[data-theme="dark"],.genius-shell[data-theme="dark"]{
  --bg:#06070f;--surface:#0e1120;--surface2:#141726;--border:rgba(255,255,255,.08);
  --text:#eef0f8;--sub:#9aa0bf;--muted:#4a5270;
  --sh:0 2px 20px rgba(0,0,0,.4);--sh2:0 12px 50px rgba(0,0,0,.6);
}
html,body,#root{height:100%;}
body{overflow:hidden;}
.genius-shell{font-family:'Sora',system-ui,sans-serif;background:var(--bg);color:var(--text);height:100vh;overflow:hidden;}
::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(91,94,247,.3);border-radius:4px;}
#topbar{position:fixed;top:0;left:0;right:0;height:var(--ah);z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:var(--surface);border-bottom:1px solid var(--border);box-shadow:var(--sh);gap:10px;}
.tb-brand{display:flex;align-items:center;gap:8px;min-width:0;}.tb-logo{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
.tb-name{font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;}.tb-pill{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;background:rgba(91,94,247,.1);color:var(--accent);border:1px solid rgba(91,94,247,.2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;}
.tb-right{display:flex;align-items:center;gap:8px;}.tb-btn{height:32px;padding:0 12px;border-radius:10px;font-size:11px;font-weight:700;border:1px solid var(--border);background:var(--surface2);color:var(--sub);cursor:pointer;font-family:inherit;transition:all .18s;display:flex;align-items:center;gap:5px;white-space:nowrap;}
.tb-btn:hover{border-color:var(--accent);color:var(--accent);}.tb-btn.paused{background:linear-gradient(135deg,#f59e0b,#f97316);color:#fff;border-color:#f59e0b;box-shadow:0 0 0 4px rgba(245,158,11,.16),0 0 26px rgba(245,158,11,.65);animation:pauseGlow 1.15s ease-in-out infinite;}
@keyframes pauseGlow{0%,100%{transform:translateY(0);box-shadow:0 0 0 4px rgba(245,158,11,.14),0 0 18px rgba(245,158,11,.42)}50%{transform:translateY(-1px);box-shadow:0 0 0 7px rgba(245,158,11,.22),0 0 34px rgba(245,158,11,.78)}}
.tb-icon{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);background:var(--surface2);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--sub);transition:all .18s;}.tb-icon:hover{border-color:var(--accent);color:var(--accent);}
.settings-wrap{position:relative;}.settings-menu{position:absolute;right:0;top:40px;width:230px;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--sh2);display:none;z-index:130;}.settings-wrap.open .settings-menu{display:block;animation:dSlide .2s ease;}
.set-title{font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin:2px 0 8px;}.set-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--border);}.set-row:first-of-type{border-top:0;}.set-label{font-size:12px;font-weight:700;color:var(--text);}
.set-select{height:34px;min-width:94px;border:1px solid var(--border);border-radius:10px;background:linear-gradient(180deg,var(--surface),var(--surface2));color:var(--text);font-family:inherit;font-size:12px;font-weight:800;padding:0 10px;outline:none;cursor:pointer;}
.set-toggle{width:42px;height:24px;border-radius:99px;border:1px solid var(--border);background:var(--surface2);position:relative;cursor:pointer;transition:all .2s;}.set-toggle::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--muted);transition:all .2s;}.set-toggle.on{background:rgba(91,94,247,.18);border-color:rgba(91,94,247,.4);}.set-toggle.on::after{left:21px;background:var(--accent);}
#app{display:grid;grid-template-columns:1fr 320px;gap:0;height:100vh;padding-top:var(--ah);min-height:0;}
#content-panel{display:flex;flex-direction:column;overflow:hidden;min-height:0;}#content-scroll{flex:1;overflow-y:auto;padding:32px 36px 120px;scroll-behavior:smooth;scrollbar-width:none;-ms-overflow-style:none;}#content-scroll::-webkit-scrollbar{display:none;}
.ch-eyebrow{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:8px;}.ch-title{font-size:clamp(1.4rem,3vw,2rem);font-weight:800;color:var(--text);line-height:1.2;margin-bottom:6px;}.ch-meta{font-size:12px;color:var(--muted);margin-bottom:28px;}.ch-divider{height:2px;width:48px;background:linear-gradient(90deg,var(--accent),transparent);border-radius:2px;margin-bottom:28px;}
.typed-para{font-family:'Lora',Georgia,serif;font-size:1rem;line-height:1.9;color:var(--sub);margin-bottom:1.2rem;opacity:0;transform:translateY(8px);transition:opacity .4s ease,transform .4s ease;}.genius-shell[data-theme="dark"] .typed-para{color:#f8fafc;text-shadow:0 1px 1px rgba(0,0,0,.28);}.typed-para.visible{opacity:1;transform:none;}.cursor{display:inline-block;width:2px;height:1em;background:var(--accent);margin-left:2px;vertical-align:middle;animation:blink .7s step-end infinite;}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
#prog-bar{height:3px;background:rgba(91,94,247,.1);}#prog-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));width:0%;transition:width .5s ease;border-radius:0 3px 3px 0;}
.inline-card{margin:28px 0;border-radius:var(--r2);overflow:hidden;border:1px solid rgba(91,94,247,.25);background:linear-gradient(145deg,rgba(91,94,247,.06),rgba(91,94,247,.02));box-shadow:0 4px 20px rgba(91,94,247,.1);opacity:0;transform:translateY(12px) scale(.98);transition:opacity .5s ease,transform .5s ease;}.inline-card.visible{opacity:1;transform:none;}.inline-card.active{border-color:rgba(91,94,247,.45);box-shadow:0 10px 30px rgba(91,94,247,.14);}
.ic-header{padding:14px 18px 10px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(91,94,247,.12);}.ic-tag{font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);background:rgba(91,94,247,.1);padding:3px 9px;border-radius:20px;}.ic-flip-hint{font-size:10px;color:var(--muted);margin-left:auto;display:flex;align-items:center;gap:4px;}.ic-scene{perspective:900px;padding:14px 18px;}.ic-q{font-size:.92rem;font-weight:600;color:var(--text);line-height:1.55;}.ic-footer{padding:10px 18px 14px;display:flex;gap:8px;}.ic-fb-btn{flex:1;padding:7px;border-radius:10px;font-size:11px;font-weight:700;border:none;cursor:pointer;font-family:inherit;transition:all .2s;color:#fff;}.ic-fb-got{background:rgba(16,185,129,.75);}
.mcq-options{display:grid;gap:8px;margin-top:12px;}.mcq-option{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;align-items:start;padding:10px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--border);font-size:.88rem;line-height:1.45;}.mcq-option b{color:var(--accent);}
.answer-row{display:flex;gap:10px;margin-top:14px;}.answer-row input,.db-input{min-width:0;flex:1;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--text);padding:10px 12px;outline:none;}.answer-row input:disabled{opacity:.58;cursor:not-allowed;}.answer-row button{border:none;border-radius:12px;padding:10px 14px;font-weight:850;cursor:pointer;background:var(--accent);color:#fff;white-space:nowrap;}.answer-row button:disabled{opacity:.5;cursor:not-allowed;}
.feedback{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;margin-top:14px;padding:12px;border-radius:14px;}.feedback.correct{background:rgba(16,185,129,.12);color:#047857;}.feedback.wrong{background:rgba(245,158,11,.13);color:#92400e;}.feedback strong{display:block;margin-bottom:3px;}.feedback p{margin:0;line-height:1.55;font-size:.86rem;}.option-explain{margin-top:10px;display:grid;gap:6px;}
.loading-card,.error-card{padding:16px 18px;border-radius:16px;margin:18px 0;font-size:13px;font-weight:700;}.loading-card{background:rgba(91,94,247,.1);color:var(--accent);}.error-card{background:rgba(239,68,68,.1);color:#dc2626;}
#avatar-panel{display:flex;flex-direction:column;min-height:calc(100vh - var(--ah));overflow:hidden;}#av-stage{flex:1 1 auto;min-height:0;padding:18px 20px 0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:8px;position:relative;overflow:hidden;}.av-name-badge{background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#fff;font-size:10px;font-weight:700;padding:4px 14px;border-radius:99px;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 4px 12px rgba(91,94,247,.3);}
.speech-bub{display:block;background:var(--surface2);border:1px solid rgba(91,94,247,.2);border-radius:14px 14px 14px 4px;padding:10px 14px;font-size:12px;line-height:1.55;color:var(--text);width:min(260px,100%);min-height:36px;max-height:78px;overflow:hidden;text-overflow:ellipsis;position:relative;transition:all .25s ease;animation:bubIn .3s ease;}.speech-bub::after{content:'';position:absolute;bottom:-7px;left:14px;border:7px solid transparent;border-top-color:var(--surface2);}@keyframes bubIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.avatar-wrap{width:min(258px,82%);height:clamp(315px,calc(100vh - 390px),455px);position:relative;flex:1 1 auto;min-height:315px;margin-top:auto;align-self:center;}.av-r{width:220px;height:390px;position:absolute;left:calc(50% - 110px);bottom:0;transition:transform .6s cubic-bezier(.34,1.2,.64,1);}.av-shadow{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:116px;height:17px;background:rgba(55,26,7,.28);border-radius:50%;filter:blur(7px);}
.av-shoe{position:absolute;bottom:7px;width:52px;height:25px;background:linear-gradient(180deg,#7c2d12,#431407);border-radius:22px 22px 10px 10px;box-shadow:inset 0 -5px 0 rgba(0,0,0,.18),0 3px 6px rgba(0,0,0,.18);}.av-shoe.l{left:57px;transform:rotate(-4deg);}.av-shoe.r{right:57px;transform:rotate(4deg);}.av-leg{position:absolute;bottom:28px;width:35px;height:84px;border-radius:16px 16px 9px 9px;background:linear-gradient(180deg,#f4a46c,#df8a52);box-shadow:inset -4px 0 0 rgba(0,0,0,.12);}.av-leg.l{left:68px;}.av-leg.r{right:68px;}
.av-torso{position:absolute;bottom:112px;left:47px;width:126px;height:122px;border-radius:42px 42px 34px 34px;background:linear-gradient(155deg,#fb7185 0%,#ec4899 46%,#7c3aed 100%);box-shadow:inset 8px 8px 14px rgba(255,255,255,.1),inset -10px -12px 18px rgba(0,0,0,.18),0 9px 20px rgba(0,0,0,.16);transform-origin:50% 92%;transition:transform .35s ease;}.av-torso::before{content:'';position:absolute;top:8px;left:39px;width:48px;height:24px;background:#ffe4f1;clip-path:polygon(0 0,100% 0,78% 70%,50% 100%,22% 70%);border-radius:0 0 18px 18px;}.av-torso::after{content:'';position:absolute;left:-16px;right:-16px;bottom:-36px;height:62px;background:linear-gradient(160deg,#f472b6,#a855f7);clip-path:polygon(14% 0,86% 0,100% 100%,0 100%);border-radius:0 0 38px 38px;box-shadow:inset 0 -10px 18px rgba(0,0,0,.12);}.av-shirt,.av-tie{display:none;}
.av-arm{position:absolute;bottom:139px;width:27px;height:92px;background:linear-gradient(180deg,#fb7185,#c026d3);border-radius:18px;transform-origin:top center;transition:transform .5s cubic-bezier(.34,1.4,.64,1);box-shadow:inset -4px -5px 8px rgba(0,0,0,.13);}.av-arm.l{left:27px;transform:rotate(-32deg);}.av-arm.r{right:27px;transform:rotate(22deg);}.av-hand{position:absolute;bottom:-14px;left:1px;width:25px;height:25px;background:radial-gradient(circle at 35% 25%,#ffd9a8,#e79a5d 74%);border-radius:50% 48% 42% 46%;box-shadow:inset -3px -4px 5px rgba(146,72,27,.18);}
.av-stick{position:absolute;left:10px;bottom:11px;width:4px;height:150px;border-radius:4px;background:linear-gradient(180deg,#7a2b19,#c77d2e 55%,#5b2215);transform:rotate(-17deg);transform-origin:bottom center;box-shadow:0 2px 4px rgba(0,0,0,.24);}.av-book{position:absolute;left:-35px;bottom:-3px;width:50px;height:69px;background:linear-gradient(145deg,#f89b28,#d97706);border-radius:7px 10px 10px 7px;transform:rotate(9deg);box-shadow:inset 6px 0 0 rgba(255,255,255,.26),inset -5px -7px 0 rgba(136,67,9,.18),0 5px 9px rgba(0,0,0,.16);z-index:6;}
.av-neck{position:absolute;bottom:220px;left:96px;width:28px;height:31px;background:linear-gradient(180deg,#f2b779,#df9052);border-radius:7px 7px 12px 12px;box-shadow:inset 0 -5px 0 rgba(130,67,31,.12);}.av-head{position:absolute;bottom:237px;left:56px;width:108px;height:116px;background:radial-gradient(circle at 38% 24%,#ffd9a8,#f0aa70 72%,#d9844c);border-radius:48% 48% 80% 80%;box-shadow:inset -8px -10px 14px rgba(137,65,24,.16),0 8px 18px rgba(0,0,0,.2);transition:transform .3s ease;transform-origin:bottom center;}
.av-ear{position:absolute;top:46px;width:19px;height:27px;background:radial-gradient(circle at 42% 35%,#ffc893,#e49358);border-radius:50%;}.av-ear.l{left:-12px;}.av-ear.r{right:-12px;}.av-hair{position:absolute;top:-20px;left:-11px;width:130px;height:70px;background:#5C4033;border-radius:120px 120px 24px 24px;box-shadow:inset -8px -7px 9px rgba(60,35,20,.25);z-index:5;}.av-hair::before{content:'';position:absolute;left:11px;top:12px;width:76px;height:34px;background:#5C4033;border-radius:48px 16px 42px 12px;transform:rotate(-10deg);}
.av-ponytail{display:block;position:absolute;right:-50px;top:3px;width:60px;height:92px;background:#5C4033;border-radius:50% 50% 46% 48%;z-index:-2;transform:rotate(-5deg);box-shadow:-7px 5px 0 rgba(60,35,20,.22),inset -7px -8px 0 rgba(60,35,20,.14);}
.av-glasses{position:absolute;top:45px;left:22px;width:64px;height:35px;z-index:10;pointer-events:none;}.av-lens{position:absolute;top:0;width:31px;height:31px;border:4px solid #17120f;border-radius:50%;background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.42),rgba(255,255,255,.1) 56%,rgba(99,102,241,.06));}.av-lens:first-child{left:0;}.av-lens:last-child{right:0;}.av-bridge{position:absolute;left:29px;top:13px;width:6px;height:5px;background:#17120f;border-radius:6px;}
.av-brow{position:absolute;top:38px;height:5px;background:#050505;border-radius:5px;transition:transform .3s,top .3s;z-index:6;}.av-brow.l{left:23px;width:26px;transform:rotate(-5deg);}.av-brow.r{right:23px;width:26px;transform:rotate(5deg);}.av-eye{position:absolute;top:51px;width:21px;height:23px;background:#fff;border-radius:50%;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.12);z-index:7;}.av-eye.l{left:28px;}.av-eye.r{right:28px;}.av-pupil{position:absolute;width:12px;height:12px;background:radial-gradient(circle at 35% 30%,#3f2a1a,#120b08 68%);border-radius:50%;top:6px;left:5px;box-shadow:0 0 0 3px #6b8da7,0 0 0 5px rgba(255,255,255,.24);}
.av-nose{position:absolute;top:73px;left:49px;width:12px;height:16px;border-left:2px solid rgba(141,70,30,.32);border-bottom:2px solid rgba(141,70,30,.32);border-radius:0 0 9px 7px;}.av-mouth{position:absolute;bottom:17px;left:35px;width:38px;height:18px;display:flex;align-items:center;justify-content:center;}.av-mouth-shape{position:relative;width:33px;height:9px;border:3px solid #8e3b38;border-top:0;border-radius:0 0 18px 18px;background:#5b151c;overflow:hidden;transition:all .2s ease;}.av-teeth{position:absolute;left:5px;right:5px;top:0;height:4px;background:#fff7ed;border-radius:0 0 5px 5px;opacity:.85;}.av-cheek{position:absolute;bottom:31px;width:16px;height:9px;background:rgba(236,72,153,.22);border-radius:50%;}.av-cheek.l{left:14px;}.av-cheek.r{right:14px;}
.teacher-man .av-name-badge{background:linear-gradient(135deg,#22c55e,#2563eb);}
.teacher-man .av-shoe{background:linear-gradient(180deg,#7a3d13,#4a240c);}
.teacher-man .av-leg{height:96px;background:linear-gradient(180deg,#1c78cd,#1260ad);border-radius:10px 10px 7px 7px;}
.teacher-man .av-torso{bottom:118px;height:112px;background:linear-gradient(160deg,#2f8a43,#176a30);border-radius:32px 32px 18px 18px;}
.teacher-man .av-torso::before{top:15px;left:37px;width:52px;height:25px;background:#f5f0e8;clip-path:polygon(0 0,100% 0,50% 100%);border-radius:4px;}
.teacher-man .av-torso::after{content:none;}
.teacher-man .av-shirt{display:block;position:absolute;top:10px;left:48px;width:30px;height:27px;background:#f8f3ec;clip-path:polygon(0 0,100% 0,50% 100%);}
.teacher-man .av-tie{display:block;position:absolute;top:26px;left:56px;width:15px;height:36px;background:linear-gradient(180deg,#f97316,#dc3f16);clip-path:polygon(50% 0,100% 28%,74% 100%,50% 88%,26% 100%,0 28%);box-shadow:0 2px 5px rgba(0,0,0,.18);}
.teacher-man .av-arm{background:linear-gradient(180deg,#338f49,#1d7435);}
.teacher-man .av-arm.l{transform:rotate(24deg);}
.teacher-man .av-arm.r{transform:rotate(-17deg);}
.teacher-man .av-hair{top:-14px;left:-4px;width:116px;height:61px;border-radius:47px 55px 20px 20px;box-shadow:inset -10px -8px 10px rgba(0,0,0,.24);}
.teacher-man .av-hair::before{left:-2px;top:12px;width:62px;height:34px;border-radius:42px 7px 32px 8px;transform:rotate(-11deg);}
.teacher-man .av-ponytail{display:none;}
.teacher-man .av-cheek{background:rgba(239,92,80,.16);}
.teacher-woman .av-name-badge{background:linear-gradient(135deg,#ec4899,#8b5cf6);}
.teacher-woman .av-arm.l{transform:rotate(-32deg);}
.teacher-woman .av-arm.r{transform:rotate(22deg);}
.emo-talking .av-mouth-shape{animation:tlk .22s ease-in-out infinite alternate;}@keyframes tlk{from{width:26px;height:7px;border-radius:7px 7px 12px 12px}to{width:30px;height:20px;border-radius:10px 10px 18px 18px}}.emo-enthusiastic .av-arm.l,.emo-excited .av-arm.l,.emo-playful .av-arm.l{transform:rotate(-52deg)!important;}.emo-curious .av-brow.l,.emo-thinking .av-brow.l,.emo-thoughtful .av-brow.l{top:37px;transform:rotate(15deg) translateY(-1px);}.emo-curious .av-mouth-shape,.emo-thinking .av-mouth-shape,.emo-thoughtful .av-mouth-shape{width:18px;height:6px;border-radius:10px;border-top:2px solid #8e3b38;}.emo-empathetic .av-brow.l{top:40px;transform:rotate(10deg) translateY(2px);}.emo-empathetic .av-brow.r{top:40px;transform:rotate(-10deg) translateY(2px);}
.av-status{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);}.status-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pdot 2s infinite;}@keyframes pdot{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.4)}50%{box-shadow:0 0 0 5px rgba(16,185,129,0)}}
#raise-btn{position:relative;z-index:4;display:flex;align-items:center;gap:8px;padding:10px 20px;border-radius:20px;background:linear-gradient(135deg,var(--amber),#f97316);color:#fff;border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;box-shadow:0 6px 20px rgba(245,158,11,.4);transition:all .2s;animation:btnPulse 2.5s ease-in-out infinite;margin:10px 0 16px;}#raise-btn:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(245,158,11,.5);}@keyframes btnPulse{0%,100%{box-shadow:0 6px 20px rgba(245,158,11,.4)}50%{box-shadow:0 6px 30px rgba(245,158,11,.65)}}
#topics-area{display:none;}.topic-label{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:4px 6px 2px;}.topic-item{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:11px;cursor:pointer;transition:all .18s;border:1px solid transparent;}.topic-item.done{opacity:.6;}.ti-num{width:24px;height:24px;border-radius:7px;background:var(--surface2);font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;color:var(--accent);flex-shrink:0;}.ti-body{flex:1;min-width:0;}.ti-name{font-size:12px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
#voice-bar{position:fixed;bottom:0;left:0;width:calc(100% - 320px);background:var(--surface);border-top:1px solid var(--border);padding:8px 16px;display:flex;align-items:center;gap:10px;box-shadow:0 -4px 20px rgba(0,0,0,.06);z-index:50;}.vb-btn{width:32px;height:32px;border-radius:10px;border:1px solid var(--border);background:var(--surface2);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--sub);transition:all .18s;flex-shrink:0;}.vb-btn:hover{border-color:var(--accent);color:var(--accent);}.vb-btn.play{background:var(--accent)!important;color:#fff!important;border-color:var(--accent)!important;box-shadow:0 3px 10px rgba(91,94,247,.3);}.vb-track{flex:1;min-width:120px;}.vb-label{font-size:10px;color:var(--muted);font-weight:600;display:flex;justify-content:space-between;margin-bottom:3px;}.vb-bg{height:8px;background:var(--surface2);border-radius:8px;overflow:hidden;position:relative;}.vb-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:4px;transition:width .25s linear;width:0%;}.vb-btn.segment{font-size:16px;font-weight:800;}.vb-spd{padding:4px 9px;border-radius:20px;font-size:10px;font-weight:700;border:1px solid var(--border);background:var(--surface2);color:var(--muted);flex-shrink:0;}.wave{display:flex;align-items:center;gap:3px;height:20px;}.wb{width:3px;border-radius:2px;background:var(--accent);height:4px;opacity:.2;animation:wavb 1.2s ease-in-out infinite;}.wb.on{opacity:1;}@keyframes wavb{0%,100%{height:4px}50%{height:18px}}
#doubt-overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.48);display:none;align-items:flex-end;justify-content:flex-start;padding:0 0 60px 0;}#doubt-overlay.open{display:flex;}#doubt-box{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);box-shadow:var(--sh2);width:min(520px,calc(100vw - 32px));max-height:70vh;display:flex;flex-direction:column;margin:0 0 0 16px;animation:dSlide .32s cubic-bezier(.34,1.3,.64,1);}@keyframes dSlide{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:none}}
.db-head{padding:14px 18px 12px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border);}.db-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}.db-title{font-size:13px;font-weight:700;color:var(--text);}.db-sub{font-size:11px;color:var(--muted);}.db-close{margin-left:auto;width:28px;height:28px;border-radius:8px;border:1px solid var(--border);background:none;cursor:pointer;font-size:14px;color:var(--muted);display:flex;align-items:center;justify-content:center;transition:all .15s;}.db-close:hover{background:rgba(239,68,68,.1);border-color:var(--red);color:var(--red);}
.db-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:120px;max-height:calc(70vh - 140px);}.db-msg{display:flex;gap:8px;max-width:92%;}.db-bubble{padding:9px 13px;border-radius:14px;font-size:13px;line-height:1.6;color:var(--text);background:var(--surface2);border:1px solid var(--border);border-radius:14px 14px 14px 4px;}.db-input-row{display:flex;gap:8px;padding:10px 14px;border-top:1px solid var(--border);}.db-send{width:36px;height:36px;border-radius:10px;background:var(--accent);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;color:#fff;transition:all .18s;flex-shrink:0;}.db-voice-actions{display:flex;gap:8px;padding:0 14px 14px;}.db-small-btn{border:1px solid var(--border);background:var(--surface2);color:var(--sub);border-radius:10px;padding:8px 11px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;}.db-small-btn.primary{background:var(--accent);border-color:var(--accent);color:#fff;}
#complete-screen{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.85);display:none;align-items:center;justify-content:center;}#complete-screen.open{display:flex;}.cs-card{background:var(--surface);border:1px solid rgba(91,94,247,.25);border-radius:28px;padding:40px;max-width:420px;width:90%;text-align:center;box-shadow:var(--sh2);animation:dSlide .4s cubic-bezier(.34,1.3,.64,1);position:relative;}.cs-close{position:absolute;top:16px;right:16px;width:34px;height:34px;border-radius:10px;border:1px solid var(--border);background:var(--surface2);color:var(--muted);font-size:18px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;}.cs-emoji{font-size:52px;margin-bottom:12px;}.cs-title{font-size:26px;font-weight:800;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;}.cs-sub{font-size:14px;color:var(--muted);line-height:1.6;margin-bottom:24px;}.cs-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 28px;border-radius:14px;border:none;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 6px 20px rgba(91,94,247,.35);}
.genius-empty{min-height:100vh;background:var(--bg);color:var(--text);display:grid;place-items:center;align-content:center;gap:10px;font-family:Sora,system-ui,sans-serif;text-align:center;padding:24px;}.genius-empty h1{font-size:22px;}
@media(max-width:900px){#app{grid-template-columns:1fr;}#avatar-panel{display:none;}#voice-bar{width:100%;}#raise-btn{bottom:72px;}}
@media(max-width:600px){#content-scroll{padding:20px 18px 120px;}.ch-title{font-size:1.4rem;}.tb-btn span{display:none;}.tb-btn{padding:0 10px;}.tb-pill{display:none;}.answer-row{flex-direction:column;}}
`;
