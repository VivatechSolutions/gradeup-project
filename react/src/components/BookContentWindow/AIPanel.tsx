interface Props {
  onClose: () => void;
}

export default function AIPanel({ onClose }: Props) {
  return (
    <div className="ai-overlay">
      <div className="ai-panel slide-in-right">
        <header>
          <h2>AI Learning Assistant</h2>
          <button onClick={onClose}>✕</button>
        </header>

        <textarea placeholder="Ask about the selected content…" />
        <button className="ask-ai">Ask AI</button>
      </div>
    </div>
  );
}
