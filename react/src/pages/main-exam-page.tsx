// import { useCallback, useEffect, useRef, useState } from "react";
// import { useQuery } from "@tanstack/react-query";
// import { useLocation } from "wouter";
// import { FaceDetection } from "@mediapipe/face_detection";
// import { AlertTriangle, BookOpen, Camera, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, FileText, Home, Loader2, LockKeyhole, Play, RefreshCw, Save, Shield, ShieldAlert, Star, Timer, Trophy, Users, XCircle } from "lucide-react";
// import Navigation from "../components/navigation";
// import ExamResultDisplay from "../components/exam-result-display";
// import { ExamAttempt, ExamSetup, getExamAttempt, getExamAttempts, getLibrarySubjects, getLibraryUnitContentTitle, LibrarySubject, recordExamWarning, saveExamAnswer, saveExamProgress, startExam, submitExam } from "../lib/gradeupApi";
// import { EXAM_SETUP_STORAGE_KEY } from "./exam-preparation";
// import "./main-exam-page.css";

// type Mode = "setup" | "secure" | "exam" | "evaluating" | "result";

// const faceDetectionAssetUrl = (file: string) => {
//   const publicUrl = String(process.env.PUBLIC_URL || "").replace(/\/+$/, "");
//   return `${publicUrl}/mediapipe/face_detection/${file}`;
// };

// async function verifyFaceDetectionAssets() {
//   const assetUrl = faceDetectionAssetUrl(
//     "face_detection_solution_simd_wasm_bin.js",
//   );
//   const response = await fetch(assetUrl, { cache: "no-store" });
//   const contentType = response.headers.get("content-type") || "";
//   if (!response.ok || contentType.toLowerCase().includes("text/html")) {
//     throw new Error(
//       "Face-detection assets are not being served by this React app. Run the app from its react folder with npm start (so prestart copies the MediaPipe assets), then reload the page.",
//     );
//   }
// }

// function readStoredSetup(): ExamSetup | null {
//   try { return JSON.parse(sessionStorage.getItem(EXAM_SETUP_STORAGE_KEY) || "null"); } catch { return null; }
// }

// function formatTime(total: number | null) {
//   if (total == null) return "Untimed";
//   const value = Math.max(0, total);
//   const hours = Math.floor(value / 3600);
//   const minutes = Math.floor((value % 3600) / 60);
//   const seconds = value % 60;
//   return hours > 0 ? `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}` : `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
// }

// function useSecureCamera(active: boolean) {
//   const [stream, setStream] = useState<MediaStream | null>(null);
//   const [faceCount, setFaceCount] = useState<number | null>(null);
//   const [detectorReady, setDetectorReady] = useState(false);
//   const [cameraError, setCameraError] = useState("");
//   const streamRef = useRef<MediaStream | null>(null);

//   useEffect(() => {
//     if (!active) return;
//     let cancelled = false;
//     let frame = 0;
//     let detector: FaceDetection | null = null;
//     const video = document.createElement("video");
//     video.muted = true; video.playsInline = true;
//     const initialize = async () => {
//       try {
//         setCameraError("");
//         await verifyFaceDetectionAssets();
//         const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
//         if (cancelled) { media.getTracks().forEach((track) => track.stop()); return; }
//         streamRef.current = media; setStream(media); video.srcObject = media; await video.play();
//         detector = new FaceDetection({ locateFile: faceDetectionAssetUrl });
//         detector.setOptions({ model: "short", minDetectionConfidence: 0.62 });
//         detector.onResults((results) => { if (!cancelled) { setDetectorReady(true); setFaceCount(results.detections?.length || 0); } });
//         await detector.initialize();
//         if (cancelled) { await detector.close(); return; }
//         let lastSent = 0;
//         const scan = async (now: number) => {
//           if (cancelled) return;
//           if (now - lastSent > 650 && video.readyState >= 2) {
//             lastSent = now;
//             try { await detector?.send({ image: video }); } catch (error: any) { if (!cancelled) setCameraError(error?.message || "Face detector stopped"); }
//           }
//           frame = requestAnimationFrame(scan);
//         };
//         frame = requestAnimationFrame(scan);
//       } catch (error: any) {
//         void detector?.close();
//         streamRef.current?.getTracks().forEach((track) => track.stop());
//         streamRef.current = null;
//         setStream(null);
//         if (!cancelled) setCameraError(error?.message || "Camera permission is required for Secure Mode.");
//       }
//     };
//     void initialize();
//     return () => {
//       cancelled = true; cancelAnimationFrame(frame); void detector?.close();
//       streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;
//       setStream(null); setFaceCount(null); setDetectorReady(false);
//     };
//   }, [active]);
//   return { stream, faceCount, detectorReady, cameraError };
// }

// function CameraView({ stream, faceCount, detectorReady, warningCount, large = false }: { stream: MediaStream | null; faceCount: number | null; detectorReady: boolean; warningCount: number; large?: boolean }) {
//   const ref = useRef<HTMLVideoElement>(null);
//   useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
//   const verified = detectorReady && faceCount === 1;
//   return <div className={`mx-camera ${large ? "large" : ""}`}>
//     {stream ? <video ref={ref} autoPlay muted playsInline/> : <div className="mx-camera-wait"><Loader2 className="spin"/> Connecting camera…</div>}
//     <div className={`mx-face-frame ${verified ? "verified" : faceCount != null ? "danger" : ""}`}/>
//     <div className="mx-camera-status"><span className={verified ? "ok" : "warn"}>{verified ? <><CheckCircle2 size={13}/> Face verified</> : faceCount === 0 ? <><XCircle size={13}/> Face not visible</> : (faceCount || 0) > 1 ? <><Users size={13}/> Multiple faces</> : <><RefreshCw className="spin" size={13}/> Checking face</>}</span><b>{warningCount}/3 warnings</b></div>
//   </div>;
// }

// function SecureGate({ stream, faceCount, detectorReady, cameraError, setup, attempt, onBegin, onCancel, busy }: { stream: MediaStream | null; faceCount: number | null; detectorReady: boolean; cameraError: string; setup: ExamSetup | null; attempt: ExamAttempt | null; onBegin: () => void; onCancel: () => void; busy: boolean }) {
//   const verified = Boolean(stream && detectorReady && faceCount === 1 && !cameraError);
//   return <div className="mx-secure-page"><div className="mx-secure-card"><div className="mx-secure-copy"><span className="mx-kicker"><LockKeyhole size={15}/> Secure Mode</span><h1>{attempt ? "Continue your protected assessment" : "Camera check before you begin"}</h1><p>Your camera stays active for on-device face detection. Video is not recorded or uploaded.</p><div className="mx-checks"><div className={stream ? "done" : ""}><Camera/><span><b>Camera access</b><small>{stream ? "Camera connected" : "Waiting for permission"}</small></span></div><div className={detectorReady ? "done" : ""}><Eye/><span><b>Face detector</b><small>{detectorReady ? "Detector is ready" : "Loading secure detector"}</small></span></div><div className={verified ? "done" : ""}><Shield/><span><b>Identity frame</b><small>{verified ? "Exactly one face verified" : "Keep one face centered"}</small></span></div></div>{cameraError && <div className="mx-error"><AlertTriangle size={16}/>{cameraError}</div>}<div className="mx-secure-summary"><span>{attempt?.subject || setup?.subject}</span><b>{attempt?.unitName || setup?.unitName}</b><small>{attempt ? `Resume at question ${(attempt.currentQuestionIndex || 0) + 1}` : `${setup?.board || ""} · Class ${setup?.classNumber || ""}`}</small></div><div className="mx-secure-actions"><button className="mx-primary" disabled={!verified || busy} onClick={onBegin}>{busy ? <><Loader2 className="spin" size={17}/> Preparing exam…</> : <><Play size={17}/> {attempt ? "Continue Exam" : "Begin Exam"}</>}</button><button className="mx-secondary" onClick={onCancel}>Back to setup</button></div></div><CameraView stream={stream} faceCount={faceCount} detectorReady={detectorReady} warningCount={attempt?.warningCount || 0} large/></div></div>;
// }

// export default function MainExamPage() {
//   const [, setLocation] = useLocation();
//   const [currentRole, setCurrentRole] = useState("student");
//   const [mode, setMode] = useState<Mode>("setup");
//   const [subjectKey, setSubjectKey] = useState("");
//   const [unitId, setUnitId] = useState("");
//   const [pendingSetup, setPendingSetup] = useState<ExamSetup | null>(readStoredSetup);
//   const [pendingAttempt, setPendingAttempt] = useState<ExamAttempt | null>(null);
//   const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
//   const [starting, setStarting] = useState(false);
//   const [error, setError] = useState("");
//   const [idx, setIdx] = useState(0);
//   const [answers, setAnswers] = useState<Record<string,string>>({});
//   const [reviewIds, setReviewIds] = useState<string[]>([]);
//   const [saveState, setSaveState] = useState<"idle"|"saving"|"saved"|"error">("idle");
//   const [remaining, setRemaining] = useState<number | null>(null);
//   const [warningMessage, setWarningMessage] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const dirtyRef = useRef(new Set<string>());
//   const answersRef = useRef<Record<string, string>>({});
//   const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
//   const warningBusy = useRef(false);
//   const violationSince = useRef<{ reason: string; at: number } | null>(null);
//   const warningCooldownUntil = useRef(0);

//   const subjectsQuery = useQuery<LibrarySubject[]>({ queryKey: ["/api/v1/student/library/subjects", "main-exam"], queryFn: () => getLibrarySubjects(), staleTime: 5 * 60 * 1000 });
//   const attemptsQuery = useQuery<ExamAttempt[]>({ queryKey: ["/api/exam/attempts"], queryFn: getExamAttempts, refetchInterval: mode === "setup" ? 30000 : false });
//   const subjects = subjectsQuery.data || [];
//   const selectedSubject = subjects.find((subject) => subject.subjectGroupKey === subjectKey) || subjects.find((subject) => subject.subjectGroupKey === pendingSetup?.subjectGroupKey) || subjects[0];
//   const units = (selectedSubject?.units || []).filter((unit) => unit.unitNumber != null);
//   const selectedUnit = units.find((unit) => unit.id === unitId) || units.find((unit) => unit.id === pendingSetup?.unitId) || units[0];
//   const setup = selectedSubject && selectedUnit && selectedUnit.unitNumber != null ? { unitId: selectedUnit.id, subjectGroupKey: selectedSubject.subjectGroupKey, subject: selectedSubject.subject, board: selectedSubject.board, classNumber: selectedSubject.standard, unitNumber: selectedUnit.unitNumber, unitName: getLibraryUnitContentTitle(selectedUnit) } satisfies ExamSetup : null;
//   const cameraActive = mode === "secure" || mode === "exam";
//   const camera = useSecureCamera(cameraActive);
//   const question = attempt?.questions[idx];

//   useEffect(() => { if (selectedSubject && !subjectKey) setSubjectKey(selectedSubject.subjectGroupKey); }, [selectedSubject, subjectKey]);
//   useEffect(() => { if (selectedUnit && !unitId) setUnitId(selectedUnit.id); }, [selectedUnit, unitId]);

//   const hydrateAttempt = useCallback((next: ExamAttempt) => {
//     setAttempt(next); setIdx(Math.min(next.currentQuestionIndex || 0, Math.max(0, next.questions.length - 1)));
//     const restoredAnswers = Object.fromEntries((next.answers || []).map((entry) => [entry.questionId, entry.answer]));
//     answersRef.current = restoredAnswers; setAnswers(restoredAnswers);
//     setReviewIds(next.reviewQuestionIds || []); setRemaining(next.remainingSeconds ?? null);
//   }, []);

//   const chooseNewExam = () => { if (!setup) return; setPendingSetup(setup); setPendingAttempt(null); setError(""); sessionStorage.setItem(EXAM_SETUP_STORAGE_KEY, JSON.stringify(setup)); setMode("secure"); };
//   const chooseAttempt = async (selected: ExamAttempt) => {
//     setError("");
//     if (selected.status === "completed" || selected.status === "ended") { hydrateAttempt(selected); setMode("result"); return; }
//     if (selected.status === "evaluating") { hydrateAttempt(selected); setMode("evaluating"); return; }
//     try { const fresh = await getExamAttempt(selected.examId); setPendingAttempt(fresh); setPendingSetup(null); setMode(fresh.status === "in_progress" ? "secure" : fresh.status === "evaluating" ? "evaluating" : "result"); if (fresh.status !== "in_progress") hydrateAttempt(fresh); } catch (requestError: any) { setError(requestError?.message || "Could not load this exam."); }
//   };

//   const beginAfterCheck = async () => {
//     setStarting(true); setError("");
//     try {
//       if (pendingAttempt) {
//         const fresh = await getExamAttempt(pendingAttempt.examId);
//         hydrateAttempt(fresh);
//         if (fresh.status !== "in_progress") { setMode(fresh.status === "evaluating" ? "evaluating" : "result"); return; }
//       } else if (pendingSetup) hydrateAttempt(await startExam(pendingSetup));
//       else throw new Error("Choose an exam first.");
//       setMode("exam");
//     } catch (requestError: any) { setError(requestError?.message || "Exam could not be started."); }
//     finally { setStarting(false); }
//   };

//   const persistAnswer = useCallback(async (questionId: string) => {
//     if (!attempt || !dirtyRef.current.has(questionId)) return true;
//     setSaveState("saving");
//     try {
//       await saveExamAnswer(attempt.examId, questionId, answersRef.current[questionId] || "");
//       dirtyRef.current.delete(questionId); setSaveState("saved"); return true;
//     } catch { setSaveState("error"); return false; }
//   }, [attempt]);

//   const changeAnswer = (questionId: string, value: string) => {
//     answersRef.current = { ...answersRef.current, [questionId]: value };
//     setAnswers((previous) => ({ ...previous, [questionId]: value })); dirtyRef.current.add(questionId); setSaveState("idle");
//     const oldTimer = saveTimers.current.get(questionId); if (oldTimer) clearTimeout(oldTimer);
//     saveTimers.current.set(questionId, setTimeout(() => { void persistAnswer(questionId); }, 1200));
//   };

//   const navigate = async (next: number) => {
//     if (!attempt || next < 0 || next >= attempt.questions.length) return;
//     if (question && !(await persistAnswer(question.question_id))) return;
//     setIdx(next); void saveExamProgress(attempt.examId, { currentQuestionIndex: next, reviewQuestionIds: reviewIds }).catch(() => undefined);
//   };

//   const toggleReview = () => {
//     if (!attempt || !question) return;
//     const next = reviewIds.includes(question.question_id) ? reviewIds.filter((id) => id !== question.question_id) : [...reviewIds, question.question_id];
//     setReviewIds(next); void saveExamProgress(attempt.examId, { currentQuestionIndex: idx, reviewQuestionIds: next }).catch(() => undefined);
//   };

//   const finishExam = useCallback(async (automatic = false) => {
//     if (!attempt || submitting) return;
//     if (!automatic && !window.confirm("Submit this exam now? Unanswered questions will be submitted as empty answers.")) return;
//     setSubmitting(true); setMode("evaluating");
//     try {
//       for (const id of Array.from(dirtyRef.current)) {
//         const ok = await persistAnswer(id); if (!ok) throw new Error("An answer could not be saved. Please retry.");
//       }
//       const completed = await submitExam(attempt.examId); hydrateAttempt(completed); setMode(completed.status === "evaluating" ? "evaluating" : "result"); void attemptsQuery.refetch();
//     } catch (requestError: any) { setError(requestError?.message || "Submission failed. We will keep retrying safely."); setMode("exam"); }
//     finally { setSubmitting(false); }
//   }, [attempt, attemptsQuery, hydrateAttempt, persistAnswer, submitting]);

//   useEffect(() => {
//     if (mode !== "exam" || !attempt?.expiresAt) return;
//     const tick = () => {
//       const value = Math.max(0, Math.ceil((new Date(attempt.expiresAt!).getTime() - Date.now()) / 1000)); setRemaining(value);
//       if (value === 0) void finishExam(true);
//     };
//     tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer);
//   }, [attempt?.expiresAt, finishExam, mode]);

//   useEffect(() => {
//     if (mode !== "exam" || !attempt || !camera.detectorReady || warningBusy.current) return;
//     let reason = "";
//     if (!camera.stream || camera.cameraError) reason = "camera_stopped";
//     else if (camera.faceCount === 0) reason = "no_face";
//     else if ((camera.faceCount || 0) > 1) reason = "multiple_faces";
//     if (!reason) { violationSince.current = null; return; }
//     if (!violationSince.current || violationSince.current.reason !== reason) { violationSince.current = { reason, at: Date.now() }; return; }
//     if (Date.now() - violationSince.current.at < 5000 || Date.now() < warningCooldownUntil.current) return;
//     warningBusy.current = true; warningCooldownUntil.current = Date.now() + 20000; violationSince.current = null;
//     void (async () => {
//       if (question) await persistAnswer(question.question_id);
//       try {
//         const updated = await recordExamWarning(attempt.examId, { reason, questionId: question?.question_id, message: reason === "no_face" ? "Face was not visible for five seconds" : reason === "multiple_faces" ? "Multiple faces were detected" : "Camera feed stopped" });
//         hydrateAttempt(updated); const count = updated.warningCount || attempt.warningCount + 1;
//         setWarningMessage(count >= 3 ? "Third warning: your exam has been ended and submitted." : `Secure Mode warning ${count} of 3. Keep exactly one face visible.`);
//         if (updated.status !== "in_progress") setMode(updated.status === "evaluating" ? "evaluating" : "result");
//       } catch (requestError: any) {
//         setError(requestError?.message || "Security warning could not be recorded.");
//         if ((attempt.warningCount || 0) >= 2) setMode("evaluating");
//       }
//       finally { warningBusy.current = false; }
//     })();
//   }, [attempt, camera.cameraError, camera.detectorReady, camera.faceCount, camera.stream, hydrateAttempt, mode, persistAnswer, question]);

//   useEffect(() => { if (mode !== "evaluating" || !attempt) return; const timer = setInterval(async () => { try { const fresh = await getExamAttempt(attempt.examId); hydrateAttempt(fresh); if (fresh.status === "completed" || fresh.status === "ended") { setMode("result"); clearInterval(timer); } } catch {} }, 4000); return () => clearInterval(timer); }, [attempt, hydrateAttempt, mode]);
//   useEffect(() => () => { saveTimers.current.forEach(clearTimeout); }, []);

//   if (mode === "secure") return <SecureGate stream={camera.stream} faceCount={camera.faceCount} detectorReady={camera.detectorReady} cameraError={camera.cameraError || error} setup={pendingSetup} attempt={pendingAttempt} onBegin={beginAfterCheck} onCancel={() => setMode("setup")} busy={starting}/>;
//   if (mode === "evaluating") return <div className="mx-evaluating"><div className="mx-eval-orbit"><Loader2 className="spin"/></div><h1>Evaluating your answers</h1><p>Your exam is locked and safely submitted. Detailed feedback may take a moment.</p>{error && <div className="mx-error">{error}</div>}</div>;
//   if (mode === "result" && attempt) return <ExamResultDisplay attempt={attempt} onDashboard={() => setLocation("/dashboard")} onPrepare={() => setLocation("/exam-preparation")} onAnother={() => { setMode("setup"); setAttempt(null); void attemptsQuery.refetch(); }}/>;

//   if (mode === "setup") return <div className="mx-setup-page"><Navigation currentRole={currentRole as any} onRoleChange={setCurrentRole as any}/><main className="mx-setup-shell"><header><div><span className="mx-kicker"><Shield size={15}/> Secure assessments</span><h1>Main Exam Centre</h1><p>Start a protected exam or continue exactly where you left off.</p></div><button className="mx-secondary" onClick={() => setLocation("/dashboard")}><Home size={16}/> Dashboard</button></header>{error && <div className="mx-error"><AlertTriangle size={16}/>{error}</div>}<section className="mx-setup-layout"><div className="mx-panel"><div className="mx-panel-title"><span>New exam</span><small>One subject · one unit</small></div><label>Subject</label><div className="mx-select-grid">{subjects.map((subject) => <button key={subject.subjectGroupKey} className={subject.subjectGroupKey === selectedSubject?.subjectGroupKey ? "active" : ""} onClick={() => { setSubjectKey(subject.subjectGroupKey); setUnitId(""); setPendingSetup(null); }}><BookOpen size={17}/><span><b>{subject.subject}</b><small>{subject.board} · Class {subject.standard}</small></span></button>)}</div><label>Unit</label><div className="mx-unit-list">{units.map((unit) => <button key={unit.id} className={unit.id === selectedUnit?.id ? "active" : ""} onClick={() => { setUnitId(unit.id); setPendingSetup(null); }}><span>{unit.unitNumber}</span><b>{getLibraryUnitContentTitle(unit)}</b>{unit.id === selectedUnit?.id && <CheckCircle2 size={17}/>}</button>)}</div><button className="mx-primary mx-start" disabled={!setup || subjectsQuery.isLoading} onClick={chooseNewExam}><Shield size={17}/> Enter Secure Check</button></div><aside className="mx-panel mx-rules"><ShieldAlert size={34}/><h2>Secure Mode rules</h2><p>Your camera and on-device face detector stay active throughout the assessment.</p><ul><li>Keep exactly one face visible.</li><li>Five-second grace period avoids accidental warnings.</li><li>Three warnings automatically end and submit the exam.</li><li>Closing the page does not pause the timer.</li></ul></aside></section><section className="mx-history"><div className="mx-history-head"><div><h2>Your exams</h2><p>Continue active attempts or review evaluated results.</p></div><button className="mx-secondary" onClick={() => attemptsQuery.refetch()}><RefreshCw size={15}/> Refresh</button></div>{attemptsQuery.isLoading ? <div className="mx-empty"><Loader2 className="spin"/> Loading exams…</div> : (attemptsQuery.data || []).length === 0 ? <div className="mx-empty"><FileText size={28}/><b>No exams yet</b><span>Your first attempt will appear here.</span></div> : <div className="mx-attempts">{(attemptsQuery.data || []).map((item) => { const score = item.result?.percentage; return <article key={item.examId}><div className={`mx-status ${item.status}`}>{item.status === "in_progress" ? "In Progress" : item.status === "evaluating" ? "Evaluating" : item.status === "ended" ? "Ended" : "Completed"}</div><h3>{item.subject}</h3><p>Unit {item.unitNumber} · {item.unitName}</p><div className="mx-attempt-meta"><span><Clock3 size={14}/>{item.status === "in_progress" ? formatTime(item.remainingSeconds ?? null) : new Date(item.startedAt).toLocaleDateString()}</span>{score != null && <span><Trophy size={14}/>{Math.round(score)}%</span>}<span><FileText size={14}/>{item.totalQuestions} questions</span></div><button onClick={() => void chooseAttempt(item)}>{item.status === "in_progress" ? "Continue Exam" : item.status === "evaluating" ? "Check Status" : "View Results"}<ChevronRight size={15}/></button></article>; })}</div>}</section></main></div>;

//   if (!attempt || !question) return null;
//   const answered = attempt.questions.filter((item) => Boolean(answers[item.question_id]?.trim())).length;
//   const isMcq = Array.isArray(question.options) && question.options.length > 0;
//   const isLong = /long|essay|compare/i.test(question.type);
//   return <div className="mx-exam"><header className="mx-topbar"><div><Shield size={20}/><span><b>{attempt.subject} · {attempt.unitName}</b><small>Secure Mode active</small></span></div><div className="mx-top-actions"><span className={`mx-save ${saveState}`}>{saveState === "saving" ? <><Loader2 className="spin"/> Saving</> : saveState === "error" ? <><AlertTriangle/> Save failed</> : <><Save/> {saveState === "saved" ? "Saved" : "Auto-save on"}</>}</span><span className={`mx-timer ${remaining != null && remaining < 300 ? "danger" : ""}`}><Timer size={17}/>{formatTime(remaining)}</span></div></header>{warningMessage && <div className="mx-warning-banner"><ShieldAlert size={18}/><span>{warningMessage}</span><button onClick={() => setWarningMessage("")}>×</button></div>}<main className="mx-exam-layout"><aside className="mx-navigator"><div className="mx-progress"><span>Progress</span><b>{answered}/{attempt.totalQuestions}</b><div><i style={{ width: `${attempt.totalQuestions ? answered / attempt.totalQuestions * 100 : 0}%` }}/></div></div><div className="mx-palette">{attempt.questions.map((item, index) => <button key={item.question_id} className={`${index === idx ? "current" : ""} ${answers[item.question_id]?.trim() ? "answered" : ""} ${reviewIds.includes(item.question_id) ? "review" : ""}`} onClick={() => void navigate(index)}>{index + 1}</button>)}</div><div className="mx-legend"><span><i className="answered"/>Answered</span><span><i className="review"/>Review</span><span><i/>Not answered</span></div></aside><section className="mx-question-card"><div className="mx-question-head"><div><span>Question {idx + 1} of {attempt.totalQuestions}</span><b>{question.marks} mark{question.marks === 1 ? "" : "s"}</b></div><div className="mx-tags"><span>{question.type.replace(/_/g," ")}</span>{question.difficulty && <span>{question.difficulty}</span>}{question.topic && <span>{question.topic}</span>}</div></div><div className="mx-question-body"><h2>{question.question}</h2>{isMcq ? <div className="mx-options">{question.options!.map((option, optionIndex) => <button key={option} className={answers[question.question_id] === option ? "selected" : ""} onClick={() => changeAnswer(question.question_id, option)}><span>{String.fromCharCode(65 + optionIndex)}</span><b>{option}</b><i>{answers[question.question_id] === option && <CheckCircle2 size={17}/>}</i></button>)}</div> : <textarea rows={isLong ? 10 : 6} value={answers[question.question_id] || ""} onChange={(event) => changeAnswer(question.question_id, event.target.value)} placeholder={isLong ? "Write a complete, well-structured answer…" : "Type your answer…"}/>}</div><footer><button className="mx-secondary" disabled={idx === 0} onClick={() => void navigate(idx - 1)}><ChevronLeft size={16}/> Previous</button><button className={`mx-review ${reviewIds.includes(question.question_id) ? "active" : ""}`} onClick={toggleReview}><Star size={16}/> {reviewIds.includes(question.question_id) ? "Marked" : "Mark for review"}</button>{idx < attempt.questions.length - 1 ? <button className="mx-primary" onClick={() => void navigate(idx + 1)}>Save & Next <ChevronRight size={16}/></button> : <button className="mx-submit" disabled={submitting} onClick={() => void finishExam()}><LockKeyhole size={16}/> Submit Exam</button>}</footer></section><aside className="mx-proctor"><div className="mx-proctor-head"><span><Camera size={16}/> Camera monitoring</span><b>LIVE</b></div><CameraView stream={camera.stream} faceCount={camera.faceCount} detectorReady={camera.detectorReady} warningCount={attempt.warningCount}/><div className="mx-security-note"><Shield size={18}/><p><b>Secure Mode active</b><span>Keep one face visible. Warning {attempt.warningCount} of 3.</span></p></div><button className="mx-submit full" disabled={submitting} onClick={() => void finishExam()}><LockKeyhole size={16}/> Submit Exam</button></aside></main></div>;
// }

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { FaceDetection } from "@mediapipe/face_detection";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  GraduationCap,
  Home,
  Loader2,
  LockKeyhole,
  Play,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Timer,
  Trophy,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import Navigation from "../components/navigation";
import ExamResultDisplay from "../components/exam-result-display";
import { useAuth } from "../hooks/use-auth";
import {
  ExamAttempt,
  ExamSetup,
  getExamAttempt,
  getExamAttempts,
  getLibrarySubjects,
  getLibraryUnitContentTitle,
  LibrarySubject,
  recordExamWarning,
  saveExamAnswer,
  saveExamProgress,
  startExam,
  submitExam,
} from "../lib/gradeupApi";
import { EXAM_SETUP_STORAGE_KEY } from "./exam-preparation";
import roboImg from "../assets/robo.png";
import robotWaving from "../assets/dashboard/15_robot_waving.png";
import tamilSubject from "../assets/dashboard/subject-tamil.png";
import englishSubject from "../assets/dashboard/subject-english.png";
import scienceSubject from "../assets/dashboard/subject-science.png";
import socialSubject from "../assets/dashboard/subject-social.png";
import mathsSubject from "../assets/dashboard/subject-maths.png";
import "./main-exam-page.css";

type Mode = "setup" | "secure" | "exam" | "evaluating" | "result";

const faceDetectionAssetUrl = (file: string) => {
  const publicUrl = String(process.env.PUBLIC_URL || "").replace(/\/+$/, "");
  return `${publicUrl}/mediapipe/face_detection/${file}`;
};

async function verifyFaceDetectionAssets() {
  const assetUrl = faceDetectionAssetUrl("face_detection_solution_simd_wasm_bin.js");
  const response = await fetch(assetUrl, { cache: "no-store" });
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || contentType.toLowerCase().includes("text/html")) {
    throw new Error(
      "Face-detection assets are not being served by this React app. Run the app with npm start (so prestart copies the MediaPipe assets), then reload the page."
    );
  }
}

function readStoredSetup(): ExamSetup | null {
  try {
    return JSON.parse(sessionStorage.getItem(EXAM_SETUP_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function formatTime(total: number | null) {
  if (total == null) return "Untimed";
  const value = Math.max(0, total);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ─── Colourful Subject Palettes (Aligned with Student Dashboard) ──────────────
function getSubjectTheme(subjectName: string) {
  const s = (subjectName || "").toLowerCase();
  if (s.includes("science") || s.includes("physics") || s.includes("chemistry") || s.includes("biology")) {
    return {
      color: "#10b981",
      lightBg: "linear-gradient(145deg, #ecfdf5, #d1fae5)",
      border: "rgba(16, 185, 129, 0.35)",
      image: scienceSubject,
      emoji: "🔬",
      badge: "Science",
    };
  }
  if (s.includes("math") || s.includes("algebra") || s.includes("geometry") || s.includes("calc")) {
    return {
      color: "#0284c7",
      lightBg: "linear-gradient(145deg, #f0f9ff, #e0f2fe)",
      border: "rgba(2, 132, 199, 0.35)",
      image: mathsSubject,
      emoji: "📐",
      badge: "Mathematics",
    };
  }
  if (s.includes("social") || s.includes("history") || s.includes("geography") || s.includes("civics")) {
    return {
      color: "#f97316",
      lightBg: "linear-gradient(145deg, #fff7ed, #ffedd5)",
      border: "rgba(249, 115, 22, 0.35)",
      image: socialSubject,
      emoji: "🌍",
      badge: "Social Studies",
    };
  }
  if (s.includes("english") || s.includes("literature") || s.includes("grammar")) {
    return {
      color: "#f43f5e",
      lightBg: "linear-gradient(145deg, #fff1f2, #ffe4e6)",
      border: "rgba(244, 63, 94, 0.35)",
      image: englishSubject,
      emoji: "📖",
      badge: "English",
    };
  }
  if (s.includes("tamil") || s.includes("hindi") || s.includes("language")) {
    return {
      color: "#0d9488",
      lightBg: "linear-gradient(145deg, #f0fdfa, #ccfbf1)",
      border: "rgba(13, 148, 136, 0.35)",
      image: tamilSubject,
      emoji: "📜",
      badge: "Language",
    };
  }
  return {
    color: "#eab308",
    lightBg: "linear-gradient(145deg, #fefce8, #fef9c3)",
    border: "rgba(234, 179, 8, 0.35)",
    image: null,
    emoji: "💡",
    badge: "Subject Unit",
  };
}

function useSecureCamera(active: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [faceCount, setFaceCount] = useState<number | null>(null);
  const [detectorReady, setDetectorReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let frame = 0;
    let detector: FaceDetection | null = null;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;

    const initialize = async () => {
      try {
        setCameraError("");
        await verifyFaceDetectionAssets();
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = media;
        setStream(media);
        video.srcObject = media;
        await video.play();

        detector = new FaceDetection({ locateFile: faceDetectionAssetUrl });
        detector.setOptions({ model: "short", minDetectionConfidence: 0.62 });
        detector.onResults((results) => {
          if (!cancelled) {
            setDetectorReady(true);
            setFaceCount(results.detections?.length || 0);
          }
        });
        await detector.initialize();
        if (cancelled) {
          await detector.close();
          return;
        }

        let lastSent = 0;
        const scan = async (now: number) => {
          if (cancelled) return;
          if (now - lastSent > 650 && video.readyState >= 2) {
            lastSent = now;
            try {
              await detector?.send({ image: video });
            } catch (error: any) {
              if (!cancelled) setCameraError(error?.message || "Face detector stopped");
            }
          }
          frame = requestAnimationFrame(scan);
        };
        frame = requestAnimationFrame(scan);
      } catch (error: any) {
        void detector?.close();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStream(null);
        if (!cancelled) setCameraError(error?.message || "Camera permission is required for Secure Mode.");
      }
    };

    void initialize();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      void detector?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
      setFaceCount(null);
      setDetectorReady(false);
    };
  }, [active]);

  return { stream, faceCount, detectorReady, cameraError };
}

function CameraView({
  stream,
  faceCount,
  detectorReady,
  warningCount,
  large = false,
}: {
  stream: MediaStream | null;
  faceCount: number | null;
  detectorReady: boolean;
  warningCount: number;
  large?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  const verified = detectorReady && faceCount === 1;

  return (
    <div className={`mx-camera ${large ? "large" : ""}`}>
      {stream ? (
        <video ref={ref} autoPlay muted playsInline />
      ) : (
        <div className="mx-camera-wait">
          <Loader2 className="spin" size={18} /> Connecting camera…
        </div>
      )}
      <div className={`mx-face-frame ${verified ? "verified" : faceCount != null ? "danger" : ""}`} />
      <div className="mx-camera-status">
        <span className={verified ? "ok" : "warn"}>
          {verified ? (
            <>
              <CheckCircle2 size={13} /> Face verified
            </>
          ) : faceCount === 0 ? (
            <>
              <XCircle size={13} /> Face not visible
            </>
          ) : (faceCount || 0) > 1 ? (
            <>
              <Users size={13} /> Multiple faces
            </>
          ) : (
            <>
              <RefreshCw className="spin" size={13} /> Checking face
            </>
          )}
        </span>
        <b>{warningCount}/3 warnings</b>
      </div>
    </div>
  );
}

function SecureGate({
  stream,
  faceCount,
  detectorReady,
  cameraError,
  setup,
  attempt,
  onBegin,
  onCancel,
  busy,
}: {
  stream: MediaStream | null;
  faceCount: number | null;
  detectorReady: boolean;
  cameraError: string;
  setup: ExamSetup | null;
  attempt: ExamAttempt | null;
  onBegin: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const verified = Boolean(stream && detectorReady && faceCount === 1 && !cameraError);

  return (
    <div className="mx-secure-page">
      <div className="mx-secure-card">
        <div className="mx-secure-copy">
          <div className="mx-hero-eyebrow">
            <LockKeyhole size={14} /> Secure Proctoring Gate
          </div>
          <h1>{attempt ? "Resume Protected Assessment" : "Camera Verification Check"}</h1>
          <p>
            Your camera is analyzed locally on your device for active face verification. Video is never uploaded or saved to any external cloud server.
          </p>
          <div className="mx-checks">
            <div className={stream ? "done" : ""}>
              <Camera size={20} />
              <span>
                <b>Webcam Connection</b>
                <small>{stream ? "Camera stream active" : "Requesting camera permissions"}</small>
              </span>
            </div>
            <div className={detectorReady ? "done" : ""}>
              <Eye size={20} />
              <span>
                <b>Face Detection Model</b>
                <small>{detectorReady ? "AI detector ready" : "Loading on-device model"}</small>
              </span>
            </div>
            <div className={verified ? "done" : ""}>
              <Shield size={20} />
              <span>
                <b>Identity Frame Alignment</b>
                <small>{verified ? "Single face centered & verified" : "Please keep one face clearly visible"}</small>
              </span>
            </div>
          </div>
          {cameraError && (
            <div className="mx-error">
              <AlertTriangle size={16} />
              {cameraError}
            </div>
          )}
          <div className="mx-secure-summary">
            <span>{attempt?.subject || setup?.subject}</span>
            <b>{attempt?.unitName || setup?.unitName}</b>
            <small>
              {attempt
                ? `Resume question ${(attempt.currentQuestionIndex || 0) + 1} of ${attempt.totalQuestions}`
                : `${setup?.board || ""} · Class ${setup?.classNumber || ""}`}
            </small>
          </div>
          <div className="mx-secure-actions">
            <button className="mx-primary" disabled={!verified || busy} onClick={onBegin}>
              {busy ? (
                <>
                  <Loader2 className="spin" size={17} /> Preparing exam…
                </>
              ) : (
                <>
                  <Play size={17} /> {attempt ? "Continue Assessment" : "Begin Assessment"}
                </>
              )}
            </button>
            <button className="mx-secondary" onClick={onCancel}>
              Back to setup
            </button>
          </div>
        </div>
        <CameraView
          stream={stream}
          faceCount={faceCount}
          detectorReady={detectorReady}
          warningCount={attempt?.warningCount || 0}
          large
        />
      </div>
    </div>
  );
}

export default function MainExamPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentRole, setCurrentRole] = useState("student");
  const [mode, setMode] = useState<Mode>("setup");
  const [subjectKey, setSubjectKey] = useState("");
  const [unitId, setUnitId] = useState("");
  const [pendingSetup, setPendingSetup] = useState<ExamSetup | null>(readStoredSetup);
  const [pendingAttempt, setPendingAttempt] = useState<ExamAttempt | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [warningMessage, setWarningMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dirtyRef = useRef(new Set<string>());
  const answersRef = useRef<Record<string, string>>({});
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const warningBusy = useRef(false);
  const violationSince = useRef<{ reason: string; at: number } | null>(null);
  const warningCooldownUntil = useRef(0);

  const subjectsQuery = useQuery<LibrarySubject[]>({
    queryKey: ["/api/v1/student/library/subjects", "main-exam"],
    queryFn: () => getLibrarySubjects(),
    staleTime: 5 * 60 * 1000,
  });
  const attemptsQuery = useQuery<ExamAttempt[]>({
    queryKey: ["/api/exam/attempts"],
    queryFn: getExamAttempts,
    refetchInterval: mode === "setup" ? 30000 : false,
  });

  const subjects = useMemo(() => subjectsQuery.data || [], [subjectsQuery.data]);
  const selectedSubject =
    subjects.find((subject) => subject.subjectGroupKey === subjectKey) ||
    subjects.find((subject) => subject.subjectGroupKey === pendingSetup?.subjectGroupKey) ||
    subjects[0];
  const units = useMemo(
    () => (selectedSubject?.units || []).filter((unit) => unit.unitNumber != null),
    [selectedSubject]
  );
  const selectedUnit =
    units.find((unit) => unit.id === unitId) ||
    units.find((unit) => unit.id === pendingSetup?.unitId) ||
    units[0];

  const setup =
    selectedSubject && selectedUnit && selectedUnit.unitNumber != null
      ? ({
          unitId: selectedUnit.id,
          subjectGroupKey: selectedSubject.subjectGroupKey,
          subject: selectedSubject.subject,
          board: selectedSubject.board,
          classNumber: selectedSubject.standard,
          unitNumber: selectedUnit.unitNumber,
          unitName: getLibraryUnitContentTitle(selectedUnit),
        } satisfies ExamSetup)
      : null;

  const cameraActive = mode === "secure" || mode === "exam";
  const camera = useSecureCamera(cameraActive);
  const question = attempt?.questions[idx];

  const firstName = user?.firstName || "Student";

  // Speech bubble text for the mascot robot
  const robotDialogue = useMemo(() => {
    if (pendingSetup && setup) {
      return `Awesome pick, ${firstName}! Unit ${setup.unitNumber}: "${setup.unitName}" is queued. Click "Enter Secure Check" to test your camera and begin! 🚀`;
    }
    if (selectedSubject && selectedUnit) {
      return `Looking great, ${firstName}! Selected ${selectedSubject.subject} · Unit ${selectedUnit.unitNumber}. Remember to keep your face centered during the exam! 🎯`;
    }
    return `Hi ${firstName}! 🛡️ Ready for your assessment? Pick your subject and chapter below to enter Secure Proctoring!`;
  }, [pendingSetup, setup, selectedSubject, selectedUnit, firstName]);

  useEffect(() => {
    if (selectedSubject && !subjectKey) setSubjectKey(selectedSubject.subjectGroupKey);
  }, [selectedSubject, subjectKey]);

  useEffect(() => {
    if (selectedUnit && !unitId) setUnitId(selectedUnit.id);
  }, [selectedUnit, unitId]);

  const hydrateAttempt = useCallback((next: ExamAttempt) => {
    setAttempt(next);
    setIdx(Math.min(next.currentQuestionIndex || 0, Math.max(0, next.questions.length - 1)));
    const restoredAnswers = Object.fromEntries(
      (next.answers || []).map((entry) => [entry.questionId, entry.answer])
    );
    answersRef.current = restoredAnswers;
    setAnswers(restoredAnswers);
    setReviewIds(next.reviewQuestionIds || []);
    setRemaining(next.remainingSeconds ?? null);
  }, []);

  const chooseNewExam = () => {
    if (!setup) return;
    setPendingSetup(setup);
    setPendingAttempt(null);
    setError("");
    sessionStorage.setItem(EXAM_SETUP_STORAGE_KEY, JSON.stringify(setup));
    setMode("secure");
  };

  const chooseAttempt = async (selected: ExamAttempt) => {
    setError("");
    if (selected.status === "completed" || selected.status === "ended") {
      hydrateAttempt(selected);
      setMode("result");
      return;
    }
    if (selected.status === "evaluating") {
      hydrateAttempt(selected);
      setMode("evaluating");
      return;
    }
    try {
      const fresh = await getExamAttempt(selected.examId);
      setPendingAttempt(fresh);
      setPendingSetup(null);
      setMode(
        fresh.status === "in_progress"
          ? "secure"
          : fresh.status === "evaluating"
          ? "evaluating"
          : "result"
      );
      if (fresh.status !== "in_progress") hydrateAttempt(fresh);
    } catch (requestError: any) {
      setError(requestError?.message || "Could not load this exam.");
    }
  };

  const beginAfterCheck = async () => {
    setStarting(true);
    setError("");
    try {
      if (pendingAttempt) {
        const fresh = await getExamAttempt(pendingAttempt.examId);
        hydrateAttempt(fresh);
        if (fresh.status !== "in_progress") {
          setMode(fresh.status === "evaluating" ? "evaluating" : "result");
          return;
        }
      } else if (pendingSetup) {
        hydrateAttempt(await startExam(pendingSetup));
      } else {
        throw new Error("Choose an exam first.");
      }
      setMode("exam");
    } catch (requestError: any) {
      setError(requestError?.message || "Exam could not be started.");
    } finally {
      setStarting(false);
    }
  };

  const persistAnswer = useCallback(
    async (questionId: string) => {
      if (!attempt || !dirtyRef.current.has(questionId)) return true;
      setSaveState("saving");
      try {
        await saveExamAnswer(attempt.examId, questionId, answersRef.current[questionId] || "");
        dirtyRef.current.delete(questionId);
        setSaveState("saved");
        return true;
      } catch {
        setSaveState("error");
        return false;
      }
    },
    [attempt]
  );

  const changeAnswer = (questionId: string, value: string) => {
    answersRef.current = { ...answersRef.current, [questionId]: value };
    setAnswers((previous) => ({ ...previous, [questionId]: value }));
    dirtyRef.current.add(questionId);
    setSaveState("idle");
    const oldTimer = saveTimers.current.get(questionId);
    if (oldTimer) clearTimeout(oldTimer);
    saveTimers.current.set(
      questionId,
      setTimeout(() => {
        void persistAnswer(questionId);
      }, 1200)
    );
  };

  const navigate = async (next: number) => {
    if (!attempt || next < 0 || next >= attempt.questions.length) return;
    if (question && !(await persistAnswer(question.question_id))) return;
    setIdx(next);
    void saveExamProgress(attempt.examId, {
      currentQuestionIndex: next,
      reviewQuestionIds: reviewIds,
    }).catch(() => undefined);
  };

  const toggleReview = () => {
    if (!attempt || !question) return;
    const next = reviewIds.includes(question.question_id)
      ? reviewIds.filter((id) => id !== question.question_id)
      : [...reviewIds, question.question_id];
    setReviewIds(next);
    void saveExamProgress(attempt.examId, {
      currentQuestionIndex: idx,
      reviewQuestionIds: next,
    }).catch(() => undefined);
  };

  const finishExam = useCallback(
    async (automatic = false) => {
      if (!attempt || submitting) return;
      if (
        !automatic &&
        !window.confirm("Submit this exam now? Unanswered questions will be submitted as empty answers.")
      )
        return;
      setSubmitting(true);
      setMode("evaluating");
      try {
        for (const id of Array.from(dirtyRef.current)) {
          const ok = await persistAnswer(id);
          if (!ok) throw new Error("An answer could not be saved. Please retry.");
        }
        const completed = await submitExam(attempt.examId);
        hydrateAttempt(completed);
        setMode(completed.status === "evaluating" ? "evaluating" : "result");
        void attemptsQuery.refetch();
      } catch (requestError: any) {
        setError(requestError?.message || "Submission failed. We will keep retrying safely.");
        setMode("exam");
      } finally {
        setSubmitting(false);
      }
    },
    [attempt, attemptsQuery, hydrateAttempt, persistAnswer, submitting]
  );

  useEffect(() => {
    if (mode !== "exam" || !attempt?.expiresAt) return;
    const tick = () => {
      const value = Math.max(0, Math.ceil((new Date(attempt.expiresAt!).getTime() - Date.now()) / 1000));
      setRemaining(value);
      if (value === 0) void finishExam(true);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attempt?.expiresAt, finishExam, mode]);

  useEffect(() => {
    if (mode !== "exam" || !attempt || !camera.detectorReady || warningBusy.current) return;
    let reason = "";
    if (!camera.stream || camera.cameraError) reason = "camera_stopped";
    else if (camera.faceCount === 0) reason = "no_face";
    else if ((camera.faceCount || 0) > 1) reason = "multiple_faces";
    if (!reason) {
      violationSince.current = null;
      return;
    }
    if (!violationSince.current || violationSince.current.reason !== reason) {
      violationSince.current = { reason, at: Date.now() };
      return;
    }
    if (Date.now() - violationSince.current.at < 5000 || Date.now() < warningCooldownUntil.current) return;
    warningBusy.current = true;
    warningCooldownUntil.current = Date.now() + 20000;
    violationSince.current = null;
    void (async () => {
      if (question) await persistAnswer(question.question_id);
      try {
        const updated = await recordExamWarning(attempt.examId, {
          reason,
          questionId: question?.question_id,
          message:
            reason === "no_face"
              ? "Face was not visible for five seconds"
              : reason === "multiple_faces"
              ? "Multiple faces were detected"
              : "Camera feed stopped",
        });
        hydrateAttempt(updated);
        const count = updated.warningCount || attempt.warningCount + 1;
        setWarningMessage(
          count >= 3
            ? "Third warning: your exam has been ended and submitted."
            : `Secure Mode warning ${count} of 3. Keep exactly one face visible.`
        );
        if (updated.status !== "in_progress") setMode(updated.status === "evaluating" ? "evaluating" : "result");
      } catch (requestError: any) {
        setError(requestError?.message || "Security warning could not be recorded.");
        if ((attempt.warningCount || 0) >= 2) setMode("evaluating");
      } finally {
        warningBusy.current = false;
      }
    })();
  }, [
    attempt,
    camera.cameraError,
    camera.detectorReady,
    camera.faceCount,
    camera.stream,
    hydrateAttempt,
    mode,
    persistAnswer,
    question,
  ]);

  useEffect(() => {
    if (mode !== "evaluating" || !attempt) return;
    const timer = setInterval(async () => {
      try {
        const fresh = await getExamAttempt(attempt.examId);
        hydrateAttempt(fresh);
        if (fresh.status === "completed" || fresh.status === "ended") {
          setMode("result");
          clearInterval(timer);
        }
      } catch {}
    }, 4000);
    return () => clearInterval(timer);
  }, [attempt, hydrateAttempt, mode]);

  useEffect(() => () => {
    saveTimers.current.forEach(clearTimeout);
  }, []);

  if (mode === "secure") {
    return (
      <SecureGate
        stream={camera.stream}
        faceCount={camera.faceCount}
        detectorReady={camera.detectorReady}
        cameraError={camera.cameraError || error}
        setup={pendingSetup}
        attempt={pendingAttempt}
        onBegin={beginAfterCheck}
        onCancel={() => setMode("setup")}
        busy={starting}
      />
    );
  }

  if (mode === "evaluating") {
    return (
      <div className="mx-evaluating">
        <div className="mx-eval-orbit">
          <Loader2 className="spin" />
        </div>
        <h1>Evaluating your assessment</h1>
        <p>Your exam answers are safely submitted and locked. Real-time Bloom's analysis is being generated...</p>
        {error && <div className="mx-error">{error}</div>}
      </div>
    );
  }

  if (mode === "result" && attempt) {
    return (
      <ExamResultDisplay
        attempt={attempt}
        onDashboard={() => setLocation("/dashboard")}
        onPrepare={() => setLocation("/exam-preparation")}
        onAnother={() => {
          setMode("setup");
          setAttempt(null);
          void attemptsQuery.refetch();
        }}
      />
    );
  }

  if (mode === "setup") {
    return (
      <div className="mx-setup-page">
        {/* Floating playful background sparkles */}
        <div className="mx-bg-spark s1" />
        <div className="mx-bg-spark s2" />
        <div className="mx-bg-spark s3" />

        <Navigation currentRole={currentRole as any} onRoleChange={setCurrentRole as any} />

        <main className="mx-setup-shell">
          {/* Top Bar with Dashboard Button and Exam Badge */}
          <div className="mx-top-bar">
            <button className="mx-back-dash-btn" onClick={() => setLocation("/dashboard")}>
              <Home size={15} /> Student Dashboard
            </button>
            <span className="mx-role-badge">
              <GraduationCap size={15} /> Official Proctored Examination Mode
            </span>
          </div>

          {/* ── Hero Banner with Study Robo Mascot (Strictly NO purple/blue AI gradient) ── */}
          <motion.section
            className="mx-hero"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mx-hero-content">
              <div className="mx-hero-eyebrow">
                <Sparkles size={14} /> Official Examination Hall
              </div>
              <h1 className="mx-hero-title">
                Proctored Assessment Arena, {firstName}!
              </h1>
              <p className="mx-hero-desc">
                Step into your secure, AI-invigilated assessment environment. Real-time on-device face verification, instant cloud progress auto-save, and comprehensive Bloom-level evaluation.
              </p>
              <div className="mx-hero-pills">
                <span className="mx-hero-pill">
                  <Shield size={13} style={{ color: "#10b981" }} /> Face Proctored
                </span>
                <span className="mx-hero-pill">
                  <Save size={13} style={{ color: "#0ea5e9" }} /> Cloud Auto-Save
                </span>
                <span className="mx-hero-pill">
                  <Timer size={13} style={{ color: "#f59e0b" }} /> Timed Assessments
                </span>
                <span className="mx-hero-pill">
                  <Trophy size={13} style={{ color: "#f43f5e" }} /> Instant Score & Insights
                </span>
              </div>
            </div>

            {/* Robot Mascot Stage with Speech Bubble */}
            <div className="mx-hero-robot-stage">
              <motion.div
                className="mx-robo-speech-bubble"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <div className="mx-robo-bubble-badge">
                  <Sparkles size={12} /> Proctor Robo · Exam Guide
                </div>
                <p className="mx-robo-bubble-text">{robotDialogue}</p>
              </motion.div>
              <div className="mx-hero-robo-wrap">
                <div className="mx-hero-robo-glow" />
                <img
                  src={selectedUnit ? robotWaving : roboImg}
                  alt="GradeUp AI Study Robot Mascot"
                  className="mx-hero-robo-img"
                />
              </div>
            </div>
          </motion.section>

          {error && (
            <div className="mx-error">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* ── Main Setup Layout: Subject & Unit Selection + Rules ── */}
          <section className="mx-setup-layout">
            <div className="mx-panel">
              <div className="mx-panel-title">
                <span>
                  <BookOpen size={18} style={{ color: "#10b981" }} /> New Assessment
                </span>
                <small>One Subject · One Unit</small>
              </div>

              {/* Subject Selection (Colourful Cards with Illustrations) */}
              <div className="mx-section-label">
                <span>Select Subject</span>
                <span>{subjects.length} Subjects Enrolled</span>
              </div>
              <div className="mx-select-grid">
                {subjects.map((subject) => {
                  const theme = getSubjectTheme(subject.subject);
                  const isSelected = subject.subjectGroupKey === selectedSubject?.subjectGroupKey;
                  return (
                    <button
                      key={subject.subjectGroupKey}
                      className={`mx-subject-card ${isSelected ? "active" : ""}`}
                      style={
                        {
                          "--subj-color": theme.color,
                          "--subj-bg": theme.lightBg,
                          "--subj-border": theme.border,
                        } as CSSProperties
                      }
                      onClick={() => {
                        setSubjectKey(subject.subjectGroupKey);
                        setUnitId("");
                        setPendingSetup(null);
                      }}
                    >
                      <div className="mx-subject-thumb-wrap">
                        {theme.image ? (
                          <img src={theme.image} alt={subject.subject} className="mx-subject-thumb" />
                        ) : (
                          <span className="mx-subject-emoji">{theme.emoji}</span>
                        )}
                      </div>
                      <div className="mx-subject-meta">
                        <span className="mx-subject-badge">{theme.badge}</span>
                        <div className="mx-subject-title">{subject.subject}</div>
                        <div className="mx-subject-sub">
                          {subject.board} · Class {subject.standard}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mx-subject-check">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Unit Selection */}
              <div className="mx-section-label">
                <span>Select Chapter / Unit</span>
                <span>{units.length} Units Available</span>
              </div>
              <div className="mx-unit-list">
                {units.map((unit) => {
                  const isSelected = unit.id === selectedUnit?.id;
                  return (
                    <button
                      key={unit.id}
                      className={`mx-unit-btn ${isSelected ? "active" : ""}`}
                      onClick={() => {
                        setUnitId(unit.id);
                        setPendingSetup(null);
                      }}
                    >
                      <span className="mx-unit-num">{unit.unitNumber}</span>
                      <b className="mx-unit-title">{getLibraryUnitContentTitle(unit)}</b>
                      {isSelected && <CheckCircle2 size={18} className="mx-unit-check" />}
                    </button>
                  );
                })}
              </div>

              {/* Start Button (Emerald-Mint gradient, NO purple/blue AI gradient) */}
              <button
                className="mx-primary mx-start"
                disabled={!setup || subjectsQuery.isLoading}
                onClick={chooseNewExam}
              >
                <Shield size={18} />
                <span>Enter Secure Check</span>
                <ArrowRight size={17} />
              </button>
            </div>

            {/* Secure Rules Card */}
            <aside className="mx-rules-card">
              <div className="mx-rules-header">
                <div className="mx-rules-icon">
                  <ShieldAlert size={24} />
                </div>
                <div className="mx-rules-title">
                  <h2>Secure Mode Rules</h2>
                  <span>AI-Assisted Assessment Safeguards</span>
                </div>
              </div>
              <p className="mx-rules-desc">
                Your webcam remains active strictly for on-device face verification. No video is recorded or transmitted to any server.
              </p>
              <ul className="mx-rules-list">
                <li>
                  <CheckCircle2 size={16} />
                  <span>Keep exactly one face visible and centered within the camera frame.</span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span>A 5-second grace period prevents false alarms from quick glances.</span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span>3 consecutive uncorrected warnings will automatically submit the exam.</span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span>The assessment timer runs continuously even if the tab or page is closed.</span>
                </li>
              </ul>
              <div className="mx-rules-footer-badge">
                <Shield size={14} /> 100% Client-Side Privacy Guaranteed
              </div>
            </aside>
          </section>

          {/* ── Your Exams Section & History Cards ── */}
          <section className="mx-history">
            <div className="mx-history-head">
              <div>
                <h2>Your Exam History</h2>
                <p>Continue in-progress assessments or review evaluated performance metrics.</p>
              </div>
              <button className="mx-secondary" onClick={() => attemptsQuery.refetch()}>
                <RefreshCw size={15} /> Refresh
              </button>
            </div>

            {attemptsQuery.isLoading ? (
              <div className="mx-empty">
                <Loader2 className="spin" size={24} /> Loading exam records…
              </div>
            ) : (attemptsQuery.data || []).length === 0 ? (
              <div className="mx-empty">
                <FileText size={32} />
                <b>No assessments recorded yet</b>
                <span>Your completed and in-progress exams will appear here.</span>
              </div>
            ) : (
              <div className="mx-attempts">
                {(attemptsQuery.data || []).map((item) => {
                  const score = item.result?.percentage;
                  const theme = getSubjectTheme(item.subject);
                  return (
                    <article key={item.examId} className="mx-attempt-card">
                      <div className="mx-attempt-top">
                        <span className={`mx-status ${item.status}`}>
                          {item.status === "in_progress"
                            ? "In Progress"
                            : item.status === "evaluating"
                            ? "Evaluating"
                            : item.status === "ended"
                            ? "Ended"
                            : "Completed"}
                        </span>
                        <span style={{ fontSize: "20px" }}>{theme.emoji}</span>
                      </div>
                      <h3>{item.subject}</h3>
                      <p>
                        Unit {item.unitNumber} · {item.unitName}
                      </p>
                      <div className="mx-attempt-meta">
                        <span>
                          <Clock3 size={13} />
                          {item.status === "in_progress"
                            ? formatTime(item.remainingSeconds ?? null)
                            : new Date(item.startedAt).toLocaleDateString()}
                        </span>
                        {score != null && (
                          <span className="score-pill">
                            <Trophy size={13} />
                            {Math.round(score)}% Score
                          </span>
                        )}
                        <span>
                          <FileText size={13} />
                          {item.totalQuestions} Questions
                        </span>
                      </div>
                      <button className="mx-attempt-action-btn" onClick={() => void chooseAttempt(item)}>
                        <span>
                          {item.status === "in_progress"
                            ? "Continue Exam"
                            : item.status === "evaluating"
                            ? "Check Status"
                            : "View Results"}
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

  if (!attempt || !question) return null;
  const answered = attempt.questions.filter((item) => Boolean(answers[item.question_id]?.trim())).length;
  const isMcq = Array.isArray(question.options) && question.options.length > 0;
  const isLong = /long|essay|compare/i.test(question.type);

  return (
    <div className="mx-exam">
      {/* Sleek Exam Topbar */}
      <header className="mx-topbar">
        <div>
          <div className="mx-topbar-shield">
            <Shield size={20} />
          </div>
          <span>
            <b>
              {attempt.subject} · {attempt.unitName}
            </b>
            <small>Secure Mode Active</small>
          </span>
        </div>
        <div className="mx-top-actions">
          <span className={`mx-save ${saveState}`}>
            {saveState === "saving" ? (
              <>
                <Loader2 className="spin" size={14} /> Saving
              </>
            ) : saveState === "error" ? (
              <>
                <AlertTriangle size={14} /> Save failed
              </>
            ) : (
              <>
                <Save size={14} /> {saveState === "saved" ? "Saved" : "Auto-save on"}
              </>
            )}
          </span>
          <span className={`mx-timer ${remaining != null && remaining < 300 ? "danger" : ""}`}>
            <Timer size={16} />
            {formatTime(remaining)}
          </span>
        </div>
      </header>

      {/* Warning Alert Banner */}
      {warningMessage && (
        <div className="mx-warning-banner">
          <ShieldAlert size={18} />
          <span>{warningMessage}</span>
          <button onClick={() => setWarningMessage("")}>×</button>
        </div>
      )}

      {/* 3-Column Exam Taking Layout */}
      <main className="mx-exam-layout">
        {/* Left Column: Navigator Palette */}
        <aside className="mx-navigator">
          <div className="mx-progress">
            <span>Progress Completed</span>
            <b>
              {answered}/{attempt.totalQuestions}
            </b>
            <div>
              <i
                style={{
                  width: `${attempt.totalQuestions ? (answered / attempt.totalQuestions) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <div className="mx-palette">
            {attempt.questions.map((item, index) => (
              <button
                key={item.question_id}
                className={`${index === idx ? "current" : ""} ${
                  answers[item.question_id]?.trim() ? "answered" : ""
                } ${reviewIds.includes(item.question_id) ? "review" : ""}`}
                onClick={() => void navigate(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <div className="mx-legend">
            <span>
              <i className="answered" /> Answered
            </span>
            <span>
              <i className="review" /> Mark for review
            </span>
            <span>
              <i /> Not answered
            </span>
          </div>
        </aside>

        {/* Center Column: Question & Options */}
        <section className="mx-question-card">
          <div className="mx-question-head">
            <div>
              <span>
                Question {idx + 1} of {attempt.totalQuestions}
              </span>
              <b>
                {question.marks} mark{question.marks === 1 ? "" : "s"}
              </b>
            </div>
            <div className="mx-tags">
              <span>{question.type.replace(/_/g, " ")}</span>
              {question.difficulty && <span>{question.difficulty}</span>}
              {question.topic && <span>{question.topic}</span>}
            </div>
          </div>

          <div className="mx-question-body">
            <h2>{question.question}</h2>
            {isMcq ? (
              <div className="mx-options">
                {question.options!.map((option, optionIndex) => (
                  <button
                    key={option}
                    className={answers[question.question_id] === option ? "selected" : ""}
                    onClick={() => changeAnswer(question.question_id, option)}
                  >
                    <span>{String.fromCharCode(65 + optionIndex)}</span>
                    <b>{option}</b>
                    {answers[question.question_id] === option && <CheckCircle2 size={18} />}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                rows={isLong ? 10 : 6}
                value={answers[question.question_id] || ""}
                onChange={(event) => changeAnswer(question.question_id, event.target.value)}
                placeholder={isLong ? "Write a complete, structured answer…" : "Type your answer…"}
              />
            )}
          </div>

          <footer>
            <button className="mx-secondary" disabled={idx === 0} onClick={() => void navigate(idx - 1)}>
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              className={`mx-review ${reviewIds.includes(question.question_id) ? "active" : ""}`}
              onClick={toggleReview}
            >
              <Star size={16} /> {reviewIds.includes(question.question_id) ? "Marked" : "Mark for review"}
            </button>
            {idx < attempt.questions.length - 1 ? (
              <button className="mx-primary" onClick={() => void navigate(idx + 1)}>
                Save & Next <ChevronRight size={16} />
              </button>
            ) : (
              <button className="mx-submit" disabled={submitting} onClick={() => void finishExam()}>
                <LockKeyhole size={16} /> Submit Assessment
              </button>
            )}
          </footer>
        </section>

        {/* Right Column: Live Proctor & Camera Monitor */}
        <aside className="mx-proctor">
          <div className="mx-proctor-head">
            <span>
              <Camera size={16} /> Active Proctor
            </span>
            <b>LIVE</b>
          </div>
          <CameraView
            stream={camera.stream}
            faceCount={camera.faceCount}
            detectorReady={camera.detectorReady}
            warningCount={attempt.warningCount}
          />
          <div className="mx-security-note">
            <Shield size={20} />
            <p>
              <b>Secure Mode Guarded</b>
              <span>Keep your face centered. Warning {attempt.warningCount} of 3.</span>
            </p>
          </div>
          <button className="mx-submit full" disabled={submitting} onClick={() => void finishExam()}>
            <LockKeyhole size={16} /> Submit Assessment
          </button>
        </aside>
      </main>
    </div>
  );
}
