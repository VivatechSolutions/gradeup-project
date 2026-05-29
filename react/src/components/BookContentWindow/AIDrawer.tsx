interface Props {
  onClose: () => void;
}

const AIDrawer: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="ai-drawer">
      <header>
        <h3>AI Learning Assistant</h3>
        <button onClick={onClose}>✖</button>
      </header>

      <textarea placeholder="Ask about selected content..." />
      <button className="ask-btn">Ask AI</button>
    </div>
  );
};

export default AIDrawer;
