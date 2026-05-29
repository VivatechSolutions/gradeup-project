import React from "react";
import ParallaxContext from "./ParallaxContext";

interface ParallaxLayerProps {
  depth?: number; // pointer depth multiplier
  scrollDepth?: number; // scroll-driven depth multiplier
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export default function ParallaxLayer({ depth = 0.08, scrollDepth, className = "", style = {}, children }: ParallaxLayerProps) {
  const state = React.useContext(ParallaxContext);
  const [vh, setVh] = React.useState<number>(() => (typeof window !== "undefined" ? window.innerHeight : 800));

  React.useEffect(() => {
    function handleResize() {
      setVh(window.innerHeight || 800);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const tx = state.x * depth * 30; // pointer-based horizontal
  const tyPointer = state.y * depth * 30; // pointer-based vertical

  const sd = typeof scrollDepth === "number" ? scrollDepth : depth; // fallback
  const tyScroll = -state.scroll * sd * vh * 0.25; // vertical parallax on scroll

  const translateY = tyPointer + tyScroll;

  const layerStyle: React.CSSProperties = {
    transform: `translate3d(${tx}px, ${translateY}px, 0)`,
    transition: "transform 420ms cubic-bezier(.2,.8,.2,1)",
    willChange: "transform",
    ...style,
  };

  return (
    <div aria-hidden className={className} style={layerStyle}>
      {children}
    </div>
  );
}
