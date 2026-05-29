import React from "react";

type ParallaxState = { x: number; y: number; scroll: number; scrollPx: number };

const ParallaxContext = React.createContext<ParallaxState>({ x: 0, y: 0, scroll: 0, scrollPx: 0 });

export function ParallaxProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ParallaxState>({ x: 0, y: 0, scroll: 0, scrollPx: 0 });

  React.useEffect(() => {
    let raf = 0;

    function handleMove(e: MouseEvent) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const x = (e.clientX - w / 2) / (w / 2); // -1 .. 1
      const y = (e.clientY - h / 2) / (h / 2); // -1 .. 1
      setState((s) => ({ ...s, x, y }));
    }

    function handleTouch(e: TouchEvent) {
      if (!e.touches || e.touches.length === 0) return;
      const t = e.touches[0];
      const w = window.innerWidth;
      const h = window.innerHeight;
      const x = (t.clientX - w / 2) / (w / 2);
      const y = (t.clientY - h / 2) / (h / 2);
      setState((s) => ({ ...s, x, y }));
    }

    function handleScroll() {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const scrollPx = window.scrollY || window.pageYOffset;
        const total = Math.max(document.body.scrollHeight - window.innerHeight, 1);
        const scroll = Math.min(1, Math.max(0, scrollPx / total));
        setState((s) => ({ ...s, scroll, scrollPx }));
      });
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleTouch, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleTouch);
      window.removeEventListener("scroll", handleScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <ParallaxContext.Provider value={state}>{children}</ParallaxContext.Provider>;
}

export default ParallaxContext;
