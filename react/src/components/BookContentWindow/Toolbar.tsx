interface Props {
  onToggleAI: () => void;
  onToggleDark: () => void;
  onFontChange: (size: number) => void;
}

const Toolbar: React.FC<Props> = ({
  onToggleAI,
  onToggleDark,
  onFontChange
}) => {
  const highlightText = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.className = "highlight";
    range.surroundContents(span);
    selection.removeAllRanges();
  };

  return (
    <div className="toolbar">
      <button onClick={highlightText}>🖍 Highlight</button>
      <button onClick={() => onFontChange(18)}>A+</button>
      <button onClick={() => onFontChange(16)}>A</button>
      <button onClick={() => onFontChange(14)}>A-</button>
      <button onClick={onToggleDark}>🌙</button>
      <button className="ai-btn" onClick={onToggleAI}>🤖 AI</button>
    </div>
  );
};

export default Toolbar;
