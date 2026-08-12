import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../hooks/use-theme";
import Navigation from "../components/navigation";
import QuestionEditor from "../components/teacher/quiz-creator/QuestionEditor";
import QuizBankView, { Question } from "../components/teacher/quiz-creator/QuizBankView";
import SettingsView from "../components/teacher/quiz-creator/SettingsView";
import SchedulingView from "../components/teacher/quiz-creator/SchedulingView";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root {
  --bg-app:#f8fafc; --bg-panel:#ffffff; --bg-panel2:#fafafa; --bg-hover:#f5f3ff;
  --border:rgba(0,0,0,.06); --border2:#f1f5f9; --text-main:#0f172a; --text-sub:#64748b;
  --text-muted:#94a3b8; --shadow:0 2px 12px rgba(0,0,0,.05); --shadow2:0 12px 32px rgba(0,0,0,.10);
  --input-bg:#f8fafc; --btn-bg:#ffffff; --btn-text:#374151; --btn-hover:#f5f3ff; --btn-htext:#6366f1;
  --table-hover:#f8fafc;
}
[data-theme="dark"] {
  --bg-app:#0b1120; --bg-panel:#141f35; --bg-panel2:#1a2540; --bg-hover:rgba(99,102,241,.15);
  --border:rgba(255,255,255,.07); --border2:rgba(255,255,255,.06); --text-main:#f1f5f9;
  --text-sub:#94a3b8; --text-muted:#64748b; --shadow:0 2px 12px rgba(0,0,0,.3);
  --shadow2:0 12px 32px rgba(0,0,0,.45);
  --input-bg:#1a2540; --btn-bg:rgba(255,255,255,.06); --btn-text:#94a3b8;
  --btn-hover:rgba(99,102,241,.18); --btn-htext:#a5b4fc; --table-hover:rgba(255,255,255,.03);
}

.qc-root {
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  color:var(--text-main);
  background:var(--bg-app);
  transition:background .3s ease, color .3s ease;
  min-height: 100vh;
}

/* General Form Elements */
.qc-label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; display: block; }
.qc-input, .qc-select, .qc-textarea {
  width: 100%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid var(--border2);
  background: var(--input-bg); color: var(--text-main); font-family: inherit;
  font-size: 14px; outline: none; transition: border-color .2s;
}
.qc-input:focus, .qc-select:focus, .qc-textarea:focus { border-color: #6366f1; }
.qc-textarea { resize: vertical; }
.qc-btn {
  padding: 10px 18px; border-radius: 10px; border: none; font-family: inherit;
  font-size: 13px; font-weight: 700; cursor: pointer; transition: all .2s;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
.qc-btn-primary { background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff; box-shadow: 0 3px 10px rgba(99,102,241,.3); }
.qc-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(99,102,241,.4); }
.qc-btn-secondary { background: var(--btn-bg); color: var(--btn-text); border: 1.5px solid var(--border2); }
.qc-btn-secondary:hover { background: var(--btn-hover); color: var(--btn-htext); border-color: #a5b4fc; }
.qc-btn-text { background: none; border: none; color: #6366f1; font-weight: 700; cursor: pointer; padding: 4px; }
.qc-btn-text:hover { text-decoration: underline; }

/* Question Editor Specific */
.qc-editor { background: var(--bg-panel); border-radius: 20px; border: 1px solid var(--border); padding: 24px; }
.qc-editor-grid { display: grid; grid-template-columns: 1fr 340px; gap: 24px; }
.qc-form-group { margin-bottom: 20px; }
.qc-options-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
.qc-option-item { display: flex; align-items: center; gap: 10px; }
.qc-option-radio { width: 18px; height: 18px; accent-color: #6366f1; }
.qc-remove-option-btn {
    width: 28px; height: 28px; border-radius: 8px; border: none; background: rgba(239,68,68,.1);
    color: #dc2626; cursor: pointer; transition: all .2s; font-size: 14px;
}
.qc-remove-option-btn:hover { background: rgba(239,68,68,.2); }
.qc-remove-option-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.qc-meta-panel { background: var(--bg-panel2); border-radius: 16px; padding: 20px; border: 1px solid var(--border2); }
.qc-ai-generator {
    background: linear-gradient(135deg, rgba(99,102,241,.1), rgba(139,92,246,.1));
    border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 14px;
    border: 1px solid rgba(99,102,241,.2);
}
.qc-ai-icon { font-size: 24px; }
.qc-ai-title { font-size: 14px; font-weight: 800; color: var(--text-main); }
.qc-ai-sub { font-size: 12px; color: var(--text-sub); }
.qc-btn-primary-small {
    padding: 6px 12px; font-size: 12px; border-radius: 8px; background: #fff;
    color: #6366f1; border: none; font-weight: 700; cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,.1); transition: all .2s;
}
[data-theme="dark"] .qc-btn-primary-small { background: var(--btn-bg); color: var(--btn-htext); }
.qc-editor-actions { display: flex; gap: 10px; margin-top: 20px; border-top: 1px solid var(--border2); padding-top: 20px; }


/* ── Hero ── */
.qc-hero {
  margin:20px 28px 0; border-radius:20px; padding:18px 28px;
  background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
  position:relative; overflow:hidden; color:#fff;
  box-shadow:0 6px 24px rgba(99,102,241,.26);
  animation:heroIn .55s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes heroIn{from{opacity:0;transform:translateY(-12px) scale(.98)}to{opacity:1;transform:none}}
.qc-hero::before{content:'';position:absolute;top:-60px;right:-60px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.1);pointer-events:none;}
.qc-hero::after{content:'';position:absolute;bottom:-50px;left:30%;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.06);pointer-events:none;}
.qc-hero-inner{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;}
.qc-hero-left{display:flex;align-items:center;gap:14px;}
.qc-hero-icon{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.25);border:2px solid rgba(255,255,255,.5);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.qc-hero-title{font-size:clamp(16px,2.2vw,22px);font-weight:800;color:#fff;margin-bottom:2px;letter-spacing:-.2px;line-height:1.2;}
.qc-hero-sub{font-size:12px;color:rgba(255,255,255,.68);line-height:1.4;}
.qc-hero-right{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.qc-hero-btn{padding:9px 18px;background:#fff;color:#6366f1;border:none;border-radius:12px;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;flex-shrink:0;transition:all .2s;box-shadow:0 3px 12px rgba(0,0,0,.15);white-space:nowrap;}
.qc-hero-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.2);background:#f5f3ff;}
.qc-theme-btn{width:38px; height:38px; border-radius:12px; background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.2); color: #fff; cursor: pointer; display:flex; align-items:center; justify-content:center; font-size: 18px; transition: all .2s;}
.qc-theme-btn:hover{background:rgba(255,255,255,.25);}

/* ── Nav Tabs ── */
.qc-nav{display:flex;gap:4px;padding:16px 28px 0;overflow-x:auto;-webkit-overflow-scrolling:touch;}
.qc-nav::-webkit-scrollbar{display:none;}
.qc-nav-btn{
  padding:8px 16px;border-radius:12px;border:1.5px solid var(--border);
  background:var(--bg-panel);font-family:inherit;font-size:12.5px;font-weight:600;
  color:var(--text-sub);cursor:pointer;transition:all .18s;white-space:nowrap;
  display:flex;align-items:center;gap:6px;
}
.qc-nav-btn:hover{border-color:#6366f1;color:#6366f1;background:rgba(99,102,241,.06);}
.qc-nav-btn.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-color:transparent;box-shadow:0 3px 10px rgba(99,102,241,.3);}

/* ── Body ── */
.qc-body{padding:20px 28px 80px;}

/* ── Panel ── */
.qc-panel{background:var(--bg-panel);border-radius:20px;border:1px solid var(--border);box-shadow:var(--shadow);overflow:hidden;transition:background .3s,border-color .3s; margin-bottom: 16px;}
.qc-panel-head{padding:18px 22px 14px;border-bottom:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.qc-panel-title{font-size:15px;font-weight:800;color:var(--text-main);display:flex;align-items:center;gap:8px;}
.qc-panel-sub{font-size:12.5px;color:var(--text-sub);margin-top:3px;}
.qc-panel-body{padding:20px 22px;}

/* Placeholder styles */
.placeholder-content {
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 1.2rem;
    font-weight: 600;
    border: 2px dashed var(--border2);
    border-radius: 16px;
}

/* Quiz Bank View Specific */
.qc-question-list { display: flex; flex-direction: column; gap: 12px; }
.qc-question-card {
    background: var(--bg-panel2); border: 1px solid var(--border2); border-radius: 12px;
    padding: 16px; display: flex; justify-content: space-between; align-items: center;
    transition: all .2s;
}
.qc-question-card:hover { border-color: #c7d2fe; transform: translateY(-2px); box-shadow: var(--shadow); }
.qc-question-prompt { font-weight: 600; color: var(--text-main); margin-bottom: 10px; }
.qc-question-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.qc-badge {
    font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 20px;
    background: rgba(100,116,139,.1); color: var(--text-sub);
}
.qc-badge.easy { background: rgba(34,197,94,.1); color: #16a34a; }
.qc-badge.medium { background: rgba(245,158,11,.1); color: #d97706; }
.qc-badge.hard { background: rgba(239,68,68,.1); color: #dc2626; }
.qc-badge.topic { background: rgba(59,130,246,.1); color: #2563eb; }
.qc-question-card-actions { display: flex; gap: 8px; }
.qc-btn-icon {
    width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--btn-bg);
    color: var(--text-sub); cursor: pointer; transition: all .2s;
    display: flex; align-items: center; justify-content: center;
}
.qc-btn-icon:hover { background: var(--btn-hover); color: var(--btn-htext); }
.qc-btn-icon.delete:hover { background: rgba(239,68,68,.1); color: #dc2626; }

/* Smart Quiz Generator */
.qc-smart-quiz-generator {
    background: var(--bg-panel2); border: 1px solid var(--border2);
    border-radius: 16px; padding: 20px; margin-bottom: 24px;
}
.qc-smart-quiz-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
    align-items: end;
}

/* Settings & Scheduling Views */
.qc-settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px 30px; }
.qc-checkbox-group { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.qc-checkbox-group input[type="checkbox"] { width: 18px; height: 18px; accent-color: #6366f1; }
.qc-input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

/* Responsive */
@media(max-width:1200px){
    .qc-editor-grid { grid-template-columns: 1fr; }
}
@media(max-width:900px){
  .qc-hero{margin:12px 16px 0;padding:14px 18px;}
  .qc-nav{padding:12px 16px 0;}
  .qc-body{padding:12px 16px 80px;}
}
@media(max-width:768px){
  .qc-hero{margin:10px 12px 0;border-radius:16px;}
}
`;

// Mock Data
const mockQuestions: Question[] = [
    {
        id: 'q1',
        type: 'mcq',
        prompt: 'What is the capital of France?',
        options: [{id: 1, text: 'Berlin'}, {id: 2, text: 'Madrid'}, {id: 3, text: 'Paris'}, {id: 4, text: 'Rome'}],
        correctAnswer: 3,
        difficulty: 'Easy',
        topic: 'Geography',
        marks: 1,
    },
    {
        id: 'q2',
        type: 'mcq',
        prompt: 'What is 2 + 2?',
        options: [{id: 1, text: '3'}, {id: 2, text: '4'}, {id: 3, text: '5'}],
        correctAnswer: 2,
        difficulty: 'Easy',
        topic: 'Math',
        marks: 1,
    }
];

// ─── Main Component ───────────────────────────────────────────────────────────
const TeacherAssessmentQuizCreatorPage = () => {
    const [activeTab, setActiveTab] = useState("builder");
    const { isDark, toggleTheme } = useTheme();
    const [questions, setQuestions] = useState<Question[]>(mockQuestions);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

    const handleSaveQuestion = (question: Question) => {
        if (question.id) {
            // Update existing
            setQuestions(qs => qs.map(q => q.id === question.id ? question : q));
        } else {
            // Add new
            setQuestions(qs => [...qs, { ...question, id: `q${Date.now()}` }]);
        }
        setEditingQuestion(null);
        setActiveTab('quiz_bank'); // Switch to quiz bank after saving
    };

    const handleDeleteQuestion = (id: string) => {
        setQuestions(qs => qs.filter(q => q.id !== id));
    };

    const handleEditQuestion = (question: Question) => {
        setEditingQuestion(question);
        setActiveTab('builder'); // Switch to builder to edit
    };

    const tabs = [
        { id: "builder", label: editingQuestion ? "Edit Question" : "Dynamic Question Builder", icon: "📝" },
        { id: "quiz_bank", label: "Centralized Quiz Bank", icon: "🏦" },
        { id: "settings", label: "Advanced Configuration", icon: "⚙️" },
        { id: "scheduling", label: "Scheduling & Delivery", icon: "🚀" },
    ];

    return (
        <>
            <style>{CSS}</style>
            <div className="qc-root">
                <Navigation />
                {/* ── Hero ── */}
                <div className="qc-hero">
                    <div className="qc-hero-inner">
                        <div className="qc-hero-left">
                            <div className="qc-hero-icon">✍️</div>
                            <div>
                                <div className="qc-hero-title">Assessment & Quiz Creator</div>
                                <div className="qc-hero-sub">Create, manage, and deploy assessments with powerful tools.</div>
                            </div>
                        </div>
                        <div className="qc-hero-right">
                             <button className="qc-hero-btn" onClick={() => { setEditingQuestion(null); setActiveTab('builder');}}>+ New Question</button>
                             <button onClick={toggleTheme} className="qc-theme-btn" title="Toggle Theme">
                                {isDark ? '☀️' : '🌙'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Nav Tabs ── */}
                <div className="qc-nav">
                    {tabs.map(t => (
                        <button key={t.id} className={`qc-nav-btn${activeTab === t.id ? " on" : ""}`} onClick={() => setActiveTab(t.id)}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* ── Body ── */}
                <div className="qc-body">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'builder' && (
                               <QuestionEditor 
                                 onSave={handleSaveQuestion} 
                                 initialQuestion={editingQuestion}
                               />
                            )}
                             {activeTab === 'quiz_bank' && (
                                <QuizBankView 
                                    questions={questions}
                                    onEdit={handleEditQuestion}
                                    onDelete={handleDeleteQuestion}
                                />
                            )}
                             {activeTab === 'settings' && (
                                <SettingsView />
                            )}
                             {activeTab === 'scheduling' && (
                                <SchedulingView />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
};

export default TeacherAssessmentQuizCreatorPage;
