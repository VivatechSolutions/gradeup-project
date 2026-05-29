import React from "react";
import ParallaxLayer from "./ParallaxLayer";

export default function CinematicShapes() {
  return (
    <>
      <ParallaxLayer depth={0.02} scrollDepth={0.02} className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g1" x1="0" x2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <g fill="url(#g1)">
            <ellipse cx="150" cy="120" rx="260" ry="120" />
            <ellipse cx="1050" cy="600" rx="360" ry="160" />
            <ellipse cx="700" cy="220" rx="240" ry="100" />
          </g>
        </svg>
      </ParallaxLayer>

      <ParallaxLayer depth={0.08} scrollDepth={0.04} className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <g fill="rgba(255,255,255,0.02)">
            <rect x="50" y="420" width="240" height="120" rx="24" />
            <rect x="920" y="80" width="220" height="100" rx="20" />
          </g>
        </svg>
      </ParallaxLayer>
    </>
  );
}
