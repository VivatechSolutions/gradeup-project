import React from 'react';

// Re-using the Question type, assuming it's exported from a shared types file in a real app
// For now, let's define it here.
type QuestionType = 'mcq' | 'fill-in-the-blank' | 'match' | 'short-answer' | 'long-answer';
interface MCQOption {
    id: number;
    text: string;
}
export interface Question {
    id: string;
    type: QuestionType;
    prompt: string;
    options: MCQOption[];
    correctAnswer: number | null;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    topic: string;
    marks: number;
}

interface QuizBankViewProps {
    questions: Question[];
    onEdit: (question: Question) => void;
    onDelete: (id: string) => void;
}

const QuizBankView = ({ questions, onEdit, onDelete }: QuizBankViewProps) => {
    return (
        <div className="qc-panel">
            <div className="qc-panel-head">
                <div className="qc-panel-title">Centralized Quiz Bank</div>
                 {/* TODO: Add filter controls here */}
            </div>
            <div className="qc-panel-body">
                <div className="qc-smart-quiz-generator">
                    <div className="qc-panel-title">🤖 Smart Quiz Generator</div>
                    <div className="qc-smart-quiz-grid">
                        <div className="qc-form-group">
                            <label className="qc-label">Total Marks</label>
                            <input type="number" className="qc-input" placeholder="e.g., 20" />
                        </div>
                        <div className="qc-form-group">
                            <label className="qc-label">Number of Easy Questions</label>
                            <input type="number" className="qc-input" placeholder="e.g., 10" />
                        </div>
                        <div className="qc-form-group">
                            <label className="qc-label">Number of Medium Questions</label>
                            <input type="number" className="qc-input" placeholder="e.g., 5" />
                        </div>
                        <div className="qc-form-group">
                            <label className="qc-label">Number of Hard Questions</label>
                            <input type="number" className="qc-input" placeholder="e.g., 5" />
                        </div>
                        <div className="qc-form-group">
                             <label className="qc-label" style={{opacity: 0}}>Generate</label>
                            <button className="qc-btn qc-btn-primary" style={{width: '100%'}}>Generate Smart Quiz</button>
                        </div>
                    </div>
                </div>

                {questions.length === 0 ? (
                     <div className="placeholder-content" style={{marginTop: '20px'}}>
                        Your quiz bank is empty. Create a question in the 'Builder' tab to see it here.
                    </div>
                ) : (
                    <div className="qc-question-list">
                        {questions.map(q => (
                            <div key={q.id} className="qc-question-card">
                                <div className="qc-question-card-main">
                                    <div className="qc-question-prompt">{q.prompt}</div>
                                    <div className="qc-question-meta">
                                        <span className={`qc-badge ${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                                        <span className="qc-badge topic">{q.topic || 'No Topic'}</span>
                                        <span className="qc-badge marks">{q.marks} Mark(s)</span>
                                        <span className="qc-badge type">{q.type}</span>
                                    </div>
                                </div>
                                <div className="qc-question-card-actions">
                                    <button className="qc-btn-icon" title="Edit" onClick={() => onEdit(q)}>✏️</button>
                                    <button className="qc-btn-icon delete" title="Delete" onClick={() => onDelete(q.id)}>🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default QuizBankView;
