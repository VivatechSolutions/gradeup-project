interface Props {
  onAI: () => void;
}

export default function FloatingToolbar({ onAI }: Props) {
  return (
    <div className="floating-toolbar glass fade-up">
      <button>🖍</button>
      <button>A+</button>
      <button>A−</button>
      <button onClick={onAI} className="ai-glow">🤖</button>
    </div>
  );
}
