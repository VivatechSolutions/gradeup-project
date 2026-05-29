import { useRef } from "react";

/* ─── THEME COLORS ───────────────────────────────────────── */
const T = {
  indigo: "#6366f1", indigoL: "#818cf8", indigoD: "#4338ca", indigoXL: "#c7d2fe",
  purple: "#a855f7", purpleL: "#c084fc", purpleD: "#7c3aed", purpleXL: "#e9d5ff",
  rose: "#f43f5e", roseL: "#fb7185", roseD: "#e11d48", roseXL: "#fecdd3",
  blue: "#3b82f6", blueL: "#60a5fa", blueD: "#1d4ed8", blueXL: "#bfdbfe",
  pink: "#ec4899", cyan: "#06b6d4", cyanL: "#67e8f9",
  emerald: "#10b981", emeraldL: "#34d399",
  amber: "#f59e0b", amberL: "#fcd34d",
};

/* ─── TILT CARD COMPONENT ───────────────────────────────────── */
function Tilt({
  children,
  style = {},
  glow = T.indigo,
  intensity = 14,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  glow?: string;
  intensity?: number;
}) {
  const el = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={el}
      onMouseMove={(e) => {
        if (!el.current) return;
        const r = el.current.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.current.style.transform = `perspective(1000px) rotateX(${(y - 0.5) * -intensity}deg) rotateY(${(x - 0.5) * intensity}deg) scale(1.02)`;
        const g = el.current.querySelector(".tg") as HTMLElement;
        if (g) {
          g.style.opacity = "0.8";
          g.style.left = `${x * 100}%`;
          g.style.top = `${y * 100}%`;
        }
      }}
      onMouseLeave={() => {
        if (!el.current) return;
        el.current.style.transform = "perspective(1000px) rotateX(0) rotateY(0) scale(1)";
        const g = el.current.querySelector(".tg") as HTMLElement;
        if (g) g.style.opacity = "0";
      }}
      style={{
        position: "relative",
        overflow: "hidden",
        transformStyle: "preserve-3d",
        transition: "transform .5s cubic-bezier(.23,1,.32,1)",
        ...style,
      }}
    >
      <div
        className="tg"
        style={{
          position: "absolute",
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: `radial-gradient(circle,${glow}60,transparent 70%)`,
          transform: "translate(-50%,-50%)",
          pointerEvents: "none",
          opacity: 0,
          transition: "opacity .35s",
          zIndex: 1,
        }}
      />
      {children}
    </div>
  );
}

/* ─── DASHBOARD VISUALIZATION ─────────────────────────────── */
export interface DashboardVizProps {
  depth?: number;
  isDark?: boolean;
  scrollY?: number;
  performanceScore?: number;
  streak?: number;
  rank?: string;
  xp?: number;
}

export function DashboardViz({
  depth = 0,
  isDark = false,
  scrollY = 0,
  performanceScore = 94.2,
  streak = 48,
  rank = "Top 3%",
  xp = 2400,
}: DashboardVizProps) {
  const bars = [62, 84, 46, 92, 74, 88, 52, 96, 68, 80];
  const line = [42, 66, 50, 82, 60, 90, 70, 88, 76, 94];
  const yPara = -depth * 30;

  return (
    <div
      style={{
        transform: `translateY(${yPara}px)`,
        transition: "transform .1s",
      }}
    >
      <Tilt
        glow={T.indigo}
        style={{
          borderRadius: 26,
          overflow: "hidden",
          background: isDark ? "rgba(10,5,30,.8)" : "rgba(255,255,255,.9)",
          border: `1.5px solid ${T.indigo}${isDark ? "25" : "30"}`,
          backdropFilter: "blur(24px)",
          boxShadow: isDark
            ? `0 20px 80px ${T.indigo}15`
            : `0 20px 80px ${T.indigo}20, 0 4px 20px rgba(0,0,0,.08)`,
        }}
      >
        <svg width="480" height="330" viewBox="0 0 480 330">
          <defs>
            <linearGradient id="b1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.indigo} />
              <stop offset="100%" stopColor={T.purple} stopOpacity=".6" />
            </linearGradient>
            <linearGradient id="b2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.rose} />
              <stop offset="100%" stopColor={T.pink} stopOpacity=".6" />
            </linearGradient>
            <linearGradient id="ln" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={T.blue} />
              <stop offset="100%" stopColor={T.cyan} />
            </linearGradient>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.cyan} stopOpacity=".3" />
              <stop offset="100%" stopColor={T.cyan} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line
              key={i}
              x1="40"
              y1={255 - i * 40}
              x2="450"
              y2={255 - i * 40}
              stroke={isDark ? "rgba(255,255,255,.05)" : "rgba(99,102,241,.09)"}
              strokeWidth="1"
            />
          ))}

          {/* Bars */}
          {bars.map((h, i) => {
            const bH = Math.min(h, h * depth * 1.8) * 1.85;
            const x = 48 + i * 40;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={255 - bH}
                  width="26"
                  height={bH}
                  fill={i % 2 === 0 ? "url(#b1)" : "url(#b2)"}
                  rx="5"
                  opacity=".85"
                />
                <rect
                  x={x}
                  y={255 - bH}
                  width="26"
                  height="4"
                  fill={i % 2 === 0 ? T.indigoL : T.roseL}
                  rx="2"
                  opacity=".6"
                />
              </g>
            );
          })}

          {/* Area fill under line */}
          <polygon
            points={
              line.map((v, i) => `${61 + i * 40},${255 - v * 1.68}`).join(" ") +
              " " +
              `${61 + 9 * 40},255 61,255`
            }
            fill="url(#areaGrad)"
          />

          {/* Line chart */}
          {line.slice(1).map((v, i) => {
            const prev = line[i];
            return (
              <line
                key={i}
                x1={61 + i * 40}
                y1={255 - prev * 1.68}
                x2={61 + (i + 1) * 40}
                y2={255 - v * 1.68}
                stroke="url(#ln)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            );
          })}

          {/* Data dots */}
          {line.map((v, i) => (
            <circle
              key={i}
              cx={61 + i * 40}
              cy={255 - v * 1.68}
              r={4.5}
              fill={T.cyan}
              stroke={isDark ? "rgba(10,5,30,.8)" : "rgba(255,255,255,.8)"}
              strokeWidth="2"
              style={{
                animation: `pulse2 ${1.4 + i * 0.15}s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}

          {/* X axis labels */}
          {["M", "T", "W", "T", "F", "S", "S", "M", "T", "W"].map((l, i) => (
            <text
              key={i}
              x={61 + i * 40}
              y={278}
              textAnchor="middle"
              fill={isDark ? "#475569" : "#8b92b5"}
              fontSize="11"
              fontFamily="'Plus Jakarta Sans',sans-serif"
            >
              {l}
            </text>
          ))}

          {/* Stats pills */}
          {[
            {
              x: 20,
              y: 12,
              w: 118,
              h: 48,
              color: T.indigo,
              label: "PERFORMANCE",
              val: `${performanceScore}%`,
            },
            {
              x: 155,
              y: 12,
              w: 108,
              h: 48,
              color: T.rose,
              label: "STREAK",
              val: `${streak} days`,
            },
            {
              x: 278,
              y: 12,
              w: 100,
              h: 48,
              color: T.blue,
              label: "RANK",
              val: rank,
            },
            {
              x: 392,
              y: 12,
              w: 78,
              h: 48,
              color: T.emerald,
              label: "XP",
              val: `+${(xp / 1000).toFixed(1)}K`,
            },
          ].map((b, i) => (
            <g key={i}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx="12"
                fill={isDark ? `${b.color}1a` : `${b.color}14`}
              />
              <text
                x={b.x + b.w / 2}
                y={b.y + 17}
                textAnchor="middle"
                fill={b.color}
                fontSize="9"
                fontWeight="700"
                letterSpacing="1"
                fontFamily="'Plus Jakarta Sans',sans-serif"
              >
                {b.label}
              </text>
              <text
                x={b.x + b.w / 2}
                y={b.y + 36}
                textAnchor="middle"
                fill={isDark ? "#f1f5f9" : "#1e1b4b"}
                fontSize="16"
                fontWeight="800"
                fontFamily="'Plus Jakarta Sans',sans-serif"
              >
                {b.val}
              </text>
            </g>
          ))}
        </svg>
      </Tilt>
    </div>
  );
}

/* ─── GLOBAL STYLES SHEET ─────────────────────────────────── */
export const DASHBOARD_VIZ_STYLES = `
@keyframes pulse2 {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
`;

export default DashboardViz;
