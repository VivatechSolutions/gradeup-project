import React, { useState, useEffect } from 'react';

type QuestionType = 'mcq' | 'fill-in-the-blank' | 'match' | 'short-answer' | 'long-answer';

interface MCQOption {
    id: number;
    text: string;
}

export interface Question {
    id: string | null;
    type: QuestionType;
    prompt: string;
    options: MCQOption[];
    correctAnswer: number | null; // ID of the correct MCQOption
    difficulty: 'Easy' | 'Medium' | 'Hard';
    topic: string;
    marks: number;
}

const initialQuestionState: Question = {
    id: null,
    type: 'mcq',
    prompt: '',
    options: [
        { id: 1, text: '' },
        { id: 2, text: '' },
    ],
    correctAnswer: null,
    difficulty: 'Easy',
    topic: '',
    marks: 1,
};

interface QuestionEditorProps {
    onSave: (question: Question) => void;
    initialQuestion: Question | null;
}

const QuestionEditor = ({ onSave, initialQuestion }: QuestionEditorProps) => {
    const [question, setQuestion] = useState<Question>(initialQuestion || initialQuestionState);

    useEffect(() => {
        setQuestion(initialQuestion || initialQuestionState);
    }, [initialQuestion]);

    const handleAddOption = () => {
        setQuestion(q => ({
            ...q,
            options: [...q.options, { id: Date.now(), text: '' }]
        }));
    };

    const handleRemoveOption = (id: number) => {
        if (question.options.length <= 2) return;
        setQuestion(q => ({
            ...q,
            options: q.options.filter(opt => opt.id !== id),
            correctAnswer: q.correctAnswer === id ? null : q.correctAnswer
        }));
    };
    
    const handleOptionTextChange = (id: number, text: string) => {
        setQuestion(q => ({
            ...q,
            options: q.options.map(opt => opt.id === id ? { ...opt, text } : opt)
        }));
    };

    const handleSave = () => {
        // Basic validation
        if (!question.prompt.trim() || question.options.some(opt => !opt.text.trim()) || question.correctAnswer === null) {
            alert("Please fill out all fields and select a correct answer.");
            return;
        }
        onSave(question);
        setQuestion(initialQuestionState); // Reset form after saving
    };

    return (
        <div className="qc-editor">
            <div className="qc-editor-grid">
                {/* Left side - The Form */}
                <div className="qc-editor-form">
                    {/* Question Type */}
                    <div className="qc-form-group">
                        <label className="qc-label">Question Type</label>
                        <select
                            className="qc-select"
                            value={question.type}
                            onChange={(e) => setQuestion(q => ({ ...initialQuestionState, type: e.target.value as QuestionType }))}
                        >
                            <option value="mcq">Multiple Choice (MCQ)</option>
                            <option value="fill-in-the-blank" disabled>Fill-in-the-Blanks (Coming Soon)</option>
                            <option value="match" disabled>Match the Following (Coming Soon)</option>
                            <option value="short-answer" disabled>Short Answer (Coming Soon)</option>
                        </select>
                    </div>

                    {/* Question Prompt */}
                    <div className="qc-form-group">
                        <label className="qc-label">Question Prompt</label>
                        <textarea
                            className="qc-textarea"
                            placeholder="e.g., What is the powerhouse of the cell?"
                            rows={4}
                            value={question.prompt}
                            onChange={e => setQuestion(q => ({...q, prompt: e.target.value}))}
                        />
                         {/* TODO: Add rich media buttons here */}
                    </div>

                    {/* Options */}
                    {question.type === 'mcq' && (
                        <div className="qc-form-group">
                             <label className="qc-label">Answer Options</label>
                             <div className="qc-options-list">
                                {question.options.map((opt, index) => (
                                   <div key={opt.id} className="qc-option-item">
                                        <input 
                                            type="radio" 
                                            name="correct-answer" 
                                            className="qc-option-radio"
                                            checked={question.correctAnswer === opt.id}
                                            onChange={() => setQuestion(q => ({...q, correctAnswer: opt.id}))}
                                        />
                                        <input 
                                            type="text"
                                            className="qc-input"
                                            placeholder={`Option ${index + 1}`}
                                            value={opt.text}
                                            onChange={e => handleOptionTextChange(opt.id, e.target.value)}
                                        />
                                        <button 
                                            className="qc-remove-option-btn"
                                            onClick={() => handleRemoveOption(opt.id)}
                                            disabled={question.options.length <= 2}
                                        >
                                            ✕
                                        </button>
                                   </div>
                                ))}
                             </div>
                             <button className="qc-btn-text" onClick={handleAddOption}>+ Add another option</button>
                        </div>
                    )}
                </div>

                {/* Right side - Metadata */}
                <div className="qc-editor-meta">
                    <div className="qc-meta-panel">
                        <div className="qc-panel-title">Metadata & Actions</div>
                         <div className="qc-form-group">
                            <label className="qc-label">Difficulty</label>
                            <select className="qc-select" value={question.difficulty} onChange={e => setQuestion(q => ({...q, difficulty: e.target.value as any}))}>
                                <option>Easy</option>
                                <option>Medium</option>
                                <option>Hard</option>
                            </select>
                        </div>
                         <div className="qc-form-group">
                            <label className="qc-label">Topic / Concept</label>
                            <input type="text" className="qc-input" placeholder="e.g., Photosynthesis" value={question.topic} onChange={e => setQuestion(q => ({...q, topic: e.target.value}))}/>
                        </div>
                        <div className="qc-form-group">
                            <label className="qc-label">Marks / Weightage</label>
                            <input type="number" className="qc-input" min="0" step="0.5" value={question.marks} onChange={e => setQuestion(q => ({...q, marks: parseFloat(e.target.value) || 0}))}/>
                        </div>
                         <div className="qc-form-group">
                            {/* AI Generator Placeholder */}
                             <div className="qc-ai-generator">
                                <div className="qc-ai-icon">✨</div>
                                <div>
                                    <div className="qc-ai-title">AI Question Generator</div>
                                    <div className="qc-ai-sub">Scan curriculum and auto-generate questions.</div>
                                </div>
                                 <button className="qc-btn-primary-small">Generate</button>
                             </div>
                        </div>

                         <div className="qc-editor-actions">
                            <button className="qc-btn qc-btn-secondary" onClick={() => setQuestion(initialQuestion || initialQuestionState)}>Clear</button>
                            <button className="qc-btn qc-btn-primary" onClick={handleSave}>
                                {question.id ? 'Save Changes' : 'Save Question'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default QuestionEditor;

