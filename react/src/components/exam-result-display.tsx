import { useState } from "react";
import type { ReactNode } from "react";
import { Award, BookOpen, CheckCircle2, ChevronDown, Home, RefreshCw, Sparkles, Target, Trophy, XCircle } from "lucide-react";
import type { ExamAttempt } from "../lib/gradeupApi";

type Props = {
  attempt?: ExamAttempt;
  onDashboard?: () => void;
  onPrepare?: () => void;
  onAnother?: () => void;
  score?: number;
  total?: number;
  isMainExam?: boolean;
  onRetry?: () => void;
};

export default function ExamResultDisplay({ attempt, onDashboard, onPrepare, onAnother, score = 0, total = 0, onRetry }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!attempt) {
    const percentage = total > 0 ? Math.round(score / total * 100) : 0;
    return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950 p-4 text-white"><div className="max-w-lg text-center"><Trophy className="mx-auto mb-5 h-24 w-24 text-yellow-300"/><h1 className="text-4xl font-black">You scored {percentage}%</h1><p className="mt-3 text-slate-300">Your practice round is complete.</p><button className="mt-7 rounded-xl bg-blue-600 px-5 py-3 font-bold" onClick={onRetry}>Try another round</button></div></div>;
  }

  const result = attempt.result || {};
  const percentage = Number(result.percentage || 0);
  const feedback = result.overall_feedback || {};
  const questions = Array.isArray(result.questions) ? result.questions : attempt.questions || [];
  const reason = attempt.submissionReason === "time_expired" ? "Time ended" : attempt.submissionReason === "security_warnings" ? "Secure Mode ended the exam" : "Submitted successfully";

  return <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-white">
    <div className="mx-auto max-w-6xl">
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-7 text-white shadow-2xl md:p-10">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider"><CheckCircle2 className="h-4 w-4"/>{reason}</span><h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">Assessment result</h1><p className="mt-3 text-blue-100">{attempt.subject} · Unit {attempt.unitNumber} · {attempt.unitName}</p><div className="mt-7 flex flex-wrap gap-3"><span className="rounded-xl bg-white/10 px-4 py-3 text-sm"><b>{result.obtained_marks ?? 0}</b> / {result.total_marks ?? attempt.totalMarks} marks</span><span className="rounded-xl bg-white/10 px-4 py-3 text-sm"><b>{result.points_earned ?? 0}</b> points earned</span>{result.total_points_accumulated != null && <span className="rounded-xl bg-white/10 px-4 py-3 text-sm"><b>{result.total_points_accumulated}</b> total points</span>}</div></div>
          <div className="relative grid h-44 w-44 place-items-center rounded-full border-[12px] border-white/15 bg-white/10"><div className="text-center"><b className="block text-5xl font-black">{Math.round(percentage)}%</b><span className="text-xs font-bold text-blue-100">Overall score</span></div></div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950"><Sparkles/></div><div><h2 className="text-xl font-black">Overall feedback</h2><p className="text-xs text-slate-500">Personalized from your evaluated answers</p></div></div><p className="leading-7 text-slate-600 dark:text-slate-300">{feedback.summary || "Your assessment has been evaluated successfully."}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2"><FeedbackList title="Strengths" icon={<Trophy className="text-emerald-600"/>} items={feedback.strengths}/><FeedbackList title="Focus areas" icon={<Target className="text-amber-600"/>} items={feedback.weak_areas}/></div>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex items-center gap-3"><Award className="text-violet-600"/><h2 className="text-xl font-black">Revision suggestions</h2></div><ul className="space-y-3">{(feedback.revision_suggestions || ["Review your answers and revisit lower-scoring topics."]).map((item: string) => <li key={item} className="rounded-2xl bg-violet-50 p-3 text-sm leading-6 text-violet-950 dark:bg-violet-950/30 dark:text-violet-100">{item}</li>)}</ul></section>
      </div>

      {result.section_scores?.by_section && <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-5 text-xl font-black">Section performance</h2><div className="grid gap-3 md:grid-cols-2">{Object.entries(result.section_scores.by_section).map(([name, raw]: [string, any]) => <div key={name} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex justify-between gap-3"><b className="text-sm">{raw.section_title || name}</b><span className="font-black text-blue-600">{Math.round(raw.percentage || 0)}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: `${Math.max(0, Math.min(100, raw.percentage || 0))}%` }}/></div><p className="mt-2 text-xs text-slate-500">{raw.obtained}/{raw.total} marks · {raw.correct}/{raw.questions} correct</p></div>)}</div></section>}

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-5 text-xl font-black">Answer review</h2><div className="space-y-3">{questions.map((question: any, index: number) => { const id = String(question.question_id || index); const open = expanded === id; return <article key={id} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"><button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setExpanded(open ? null : id)}>{question.is_correct ? <CheckCircle2 className="shrink-0 text-emerald-600"/> : <XCircle className="shrink-0 text-rose-500"/>}<span className="flex-1"><b className="line-clamp-2 text-sm">{index + 1}. {question.question}</b><small className="mt-1 block text-slate-500">{question.score ?? 0}/{question.max_score ?? question.marks ?? 0} marks</small></span><ChevronDown className={`transition ${open ? "rotate-180" : ""}`}/></button>{open && <div className="grid gap-3 border-t border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40 md:grid-cols-2"><ReviewBlock title="Your answer" text={question.student_answer || "Not answered"}/><ReviewBlock title="Correct answer" text={question.correct_answer || "Not provided"}/><ReviewBlock title="Explanation" text={question.explanation || "No explanation provided"}/><ReviewBlock title="Feedback" text={question.feedback || "No additional feedback"}/>{question.textbook_reference && <div className="md:col-span-2"><ReviewBlock title="Textbook reference" text={question.textbook_reference}/></div>}</div>}</article>; })}</div></section>

      <div className="mt-6 flex flex-wrap justify-end gap-3"><button className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black dark:border-slate-700 dark:bg-slate-900" onClick={onDashboard}><Home className="h-4 w-4"/> Dashboard</button><button className="inline-flex items-center gap-2 rounded-xl bg-blue-100 px-4 py-3 text-sm font-black text-blue-700" onClick={onPrepare}><BookOpen className="h-4 w-4"/> Preparation</button><button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white" onClick={onAnother}><RefreshCw className="h-4 w-4"/> Another exam</button></div>
    </div>
  </div>;
}

function FeedbackList({ title, icon, items }: { title: string; icon: ReactNode; items?: string[] }) {
  return <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50"><div className="mb-3 flex items-center gap-2 font-black">{icon}{title}</div>{items?.length ? <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">{items.map((item) => <li key={item}>• {item}</li>)}</ul> : <p className="text-sm text-slate-500">No items reported.</p>}</div>;
}

function ReviewBlock({ title, text }: { title: string; text: string }) {
  return <div><b className="mb-1 block text-xs uppercase tracking-wide text-slate-500">{title}</b><p className="whitespace-pre-wrap leading-6 text-slate-700 dark:text-slate-200">{text}</p></div>;
}
