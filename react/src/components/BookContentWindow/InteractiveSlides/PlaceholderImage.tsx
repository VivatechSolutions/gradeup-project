import React, { useEffect, useState } from "react";

interface PlaceholderImageProps {
  src?: string;
  alt?: string;
  category?:
    | "bus-braking"
    | "bus-moving"
    | "bus-stopped"
    | "coin-experiment"
    | "astronaut-space"
    | "toy-car"
    | "cricket-ball"
    | "robot-teacher"
    | "rocket-launch"
    | "general-science";
  aspectRatio?: "16/9" | "4/3" | "1/1" | "21/9" | "auto";
  className?: string;
  imageClassName?: string;
  badge?: string;
}

export const PlaceholderImage: React.FC<PlaceholderImageProps> = ({
  src,
  alt = "Illustration",
  category = "general-science",
  aspectRatio = "16/9",
  className = "",
  imageClassName = "object-cover",
  badge,
}) => {
  const [imgError, setImgError] = useState(false);
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<number>();

  useEffect(() => {
    setImgError(false);
    setNaturalAspectRatio(undefined);
  }, [src]);

  // If real image source is provided and hasn't failed, render the image
  if (src && !imgError) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-md group ${className}`}
        style={{
          aspectRatio:
            aspectRatio === "auto"
              ? naturalAspectRatio
              : aspectRatio,
        }}
      >
        <img
          src={src}
          alt={alt}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth && image.naturalHeight) {
              setNaturalAspectRatio(image.naturalWidth / image.naturalHeight);
            }
          }}
          onError={() => setImgError(true)}
          className={`w-full h-full object-center transition-transform duration-300 group-hover:scale-[1.02] ${imageClassName}`}
        />
        {badge && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-slate-900/70 text-white backdrop-blur-md shadow-sm">
            {badge}
          </span>
        )}
      </div>
    );
  }

  // Otherwise, render dedicated thematic SVG illustrations matching the reference design!
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-md flex items-center justify-center select-none bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-[#111936] dark:to-[#172554] ${className}`}
      style={{ aspectRatio: aspectRatio === "auto" ? "16/9" : aspectRatio }}
    >
      {category === "bus-braking" && (
        <svg viewBox="0 0 400 240" className="w-full h-full object-cover" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
            <linearGradient id="busGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          {/* Background Bus Window & Street */}
          <rect width="400" height="240" fill="url(#skyGrad)" />
          {/* Street road & speed lines */}
          <rect y="170" width="400" height="70" fill="#334155" />
          <line x1="20" y1="205" x2="100" y2="205" stroke="#f8fafc" strokeWidth="4" strokeDasharray="16 12" />
          <line x1="140" y1="205" x2="220" y2="205" stroke="#f8fafc" strokeWidth="4" strokeDasharray="16 12" />
          <line x1="260" y1="205" x2="360" y2="205" stroke="#f8fafc" strokeWidth="4" strokeDasharray="16 12" />
          {/* Bus Interior Pole */}
          <rect x="250" y="0" width="12" height="240" fill="#cbd5e1" />
          <rect x="253" y="0" width="6" height="240" fill="#94a3b8" />
          {/* Passenger Kid Leaning Forward (Inertia!) */}
          <g transform="translate(140, 50) rotate(-14 70 80)">
            {/* Body / Hoodie */}
            <path d="M40,90 Q70,70 100,90 L110,160 L30,160 Z" fill="#2563eb" />
            {/* Backpack */}
            <rect x="20" y="90" width="25" height="50" rx="8" fill="#1e3a8a" />
            {/* Head */}
            <circle cx="70" cy="55" r="28" fill="#fcd34d" />
            {/* Hair */}
            <path d="M45,45 Q70,20 95,45 Q80,25 50,30 Z" fill="#451a03" />
            {/* Surprised Eyes */}
            <circle cx="78" cy="54" r="4.5" fill="#0f172a" />
            <circle cx="79" cy="52" r="1.5" fill="#ffffff" />
            {/* Open Mouth (Surprised!) */}
            <ellipse cx="80" cy="68" rx="4" ry="5" fill="#be123c" />
            {/* Arm holding rail */}
            <path d="M85,100 Q120,80 140,90" stroke="#fcd34d" strokeWidth="12" strokeLinecap="round" />
          </g>
          {/* Inertia motion lines */}
          <path d="M70,80 Q100,80 120,70" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 4" />
          <path d="M60,110 Q95,110 115,105" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 4" />
        </svg>
      )}

      {category === "bus-moving" && (
        <svg viewBox="0 0 200 130" className="w-full h-full p-2" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="130" rx="12" fill="#eff6ff" className="dark:fill-[#172554]" />
          {/* Yellow bus body */}
          <rect x="25" y="30" width="150" height="65" rx="8" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
          {/* Bus Windows */}
          <rect x="35" y="40" width="30" height="25" rx="4" fill="#60a5fa" />
          <rect x="75" y="40" width="30" height="25" rx="4" fill="#60a5fa" />
          <rect x="115" y="40" width="30" height="25" rx="4" fill="#60a5fa" />
          {/* Passenger Upright */}
          <circle cx="90" cy="50" r="6" fill="#1e293b" />
          <path d="M84,65 L96,65 L94,56 L86,56 Z" fill="#2563eb" />
          {/* Wheels */}
          <circle cx="55" cy="95" r="14" fill="#1e293b" />
          <circle cx="55" cy="95" r="6" fill="#94a3b8" />
          <circle cx="145" cy="95" r="14" fill="#1e293b" />
          <circle cx="145" cy="95" r="6" fill="#94a3b8" />
          {/* Forward arrow */}
          <path d="M165,60 L185,60 M180,55 L185,60 L180,65" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}

      {category === "bus-stopped" && (
        <svg viewBox="0 0 200 130" className="w-full h-full p-2" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="130" rx="12" fill="#fef2f2" className="dark:fill-[#3b1219]" />
          {/* Yellow bus body with brake marks */}
          <rect x="25" y="30" width="150" height="65" rx="8" fill="#fbbf24" stroke="#dc2626" strokeWidth="2" />
          {/* Bus Windows */}
          <rect x="35" y="40" width="30" height="25" rx="4" fill="#93c5fd" />
          <rect x="75" y="40" width="30" height="25" rx="4" fill="#93c5fd" />
          <rect x="115" y="40" width="30" height="25" rx="4" fill="#93c5fd" />
          {/* Passenger Leaning Forward */}
          <g transform="translate(10, 0) rotate(16 90 55)">
            <circle cx="90" cy="48" r="6" fill="#1e293b" />
            <path d="M84,65 L96,65 L94,54 L86,54 Z" fill="#2563eb" />
          </g>
          {/* Wheels */}
          <circle cx="55" cy="95" r="14" fill="#1e293b" />
          <circle cx="55" cy="95" r="6" fill="#dc2626" />
          <circle cx="145" cy="95" r="14" fill="#1e293b" />
          <circle cx="145" cy="95" r="6" fill="#dc2626" />
          {/* Brake indicators */}
          <path d="M15,96 L40,96" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )}

      {category === "coin-experiment" && (
        <svg viewBox="0 0 320 200" className="w-full h-full p-3" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="tableGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>
            <radialGradient id="coinGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="70%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </radialGradient>
          </defs>
          {/* Wood Table Surface */}
          <rect y="120" width="320" height="80" fill="url(#tableGrad)" rx="6" />
          {/* Playing Card on table */}
          <rect x="100" y="115" width="100" height="15" rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Coin resting on card */}
          <ellipse cx="150" cy="110" rx="22" ry="7" fill="url(#coinGrad)" stroke="#a16207" strokeWidth="1.5" />
          {/* Hand Flicking Card */}
          <g transform="translate(30, 95)">
            <path d="M10,25 Q30,10 60,18 L62,28 Q35,22 15,35 Z" fill="#fbcfe8" stroke="#f472b6" strokeWidth="1.5" />
            <circle cx="62" cy="22" r="5" fill="#f472b6" />
          </g>
          {/* Motion arrow flicking */}
          <path d="M80,118 Q120,105 160,116" stroke="#2563eb" strokeWidth="3" strokeDasharray="4 3" strokeLinecap="round" />
          {/* Inertia label */}
          <text x="150" y="85" textAnchor="middle" fill="#2563eb" fontWeight="bold" fontSize="12" className="dark:fill-blue-400">
            Coin stays, card flies!
          </text>
        </svg>
      )}

      {category === "astronaut-space" && (
        <svg viewBox="0 0 380 220" className="w-full h-full object-cover" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="380" height="220" fill="#030712" />
          {/* Stars */}
          <circle cx="40" cy="30" r="1.5" fill="#ffffff" />
          <circle cx="90" cy="70" r="1" fill="#93c5fd" />
          <circle cx="280" cy="40" r="2" fill="#ffffff" />
          <circle cx="340" cy="90" r="1.5" fill="#fde047" />
          <circle cx="200" cy="20" r="1" fill="#ffffff" />
          {/* Earth in background */}
          <circle cx="60" cy="170" r="70" fill="#1d4ed8" />
          <path d="M40,130 Q70,140 60,170 Q50,190 20,200 Z" fill="#16a34a" />
          <path d="M80,160 Q110,170 95,200 Z" fill="#16a34a" />
          {/* Spacecraft window rim */}
          <circle cx="220" cy="110" r="85" stroke="#334155" strokeWidth="18" fill="none" opacity="0.6" />
          {/* Floating Astronaut */}
          <g transform="translate(180, 60) rotate(-18 45 55)">
            {/* Body */}
            <rect x="25" y="45" width="40" height="50" rx="12" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
            {/* Chest pack */}
            <rect x="32" y="55" width="26" height="20" rx="4" fill="#0284c7" />
            {/* Helmet */}
            <circle cx="45" cy="30" r="22" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
            <ellipse cx="48" cy="30" rx="14" ry="10" fill="#0ea5e9" opacity="0.8" />
            {/* Floating arms */}
            <path d="M25,55 Q0,40 10,25" stroke="#f8fafc" strokeWidth="10" strokeLinecap="round" />
            <path d="M65,55 Q90,40 80,25" stroke="#f8fafc" strokeWidth="10" strokeLinecap="round" />
            {/* Floating legs */}
            <path d="M35,95 Q30,125 15,130" stroke="#f8fafc" strokeWidth="11" strokeLinecap="round" />
            <path d="M55,95 Q65,125 75,130" stroke="#f8fafc" strokeWidth="11" strokeLinecap="round" />
          </g>
        </svg>
      )}

      {category === "toy-car" && (
        <svg viewBox="0 0 320 200" className="w-full h-full p-3" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="carGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="60%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
          </defs>
          {/* Ground shadow */}
          <ellipse cx="160" cy="165" rx="110" ry="14" fill="#0f172a" opacity="0.15" />
          {/* Sports Car Body */}
          <path
            d="M50,140 Q60,110 100,105 L140,85 Q180,82 220,95 L265,120 Q280,128 275,145 L50,145 Z"
            fill="url(#carGrad)"
          />
          {/* Cockpit / Windshield */}
          <path d="M125,102 L145,89 Q175,88 205,98 L195,105 Z" fill="#38bdf8" opacity="0.85" />
          {/* Spoiler */}
          <path d="M50,115 L40,95 L65,95 L58,115 Z" fill="#991b1b" />
          {/* Chrome Wheels */}
          <circle cx="95" cy="148" r="22" fill="#1e293b" />
          <circle cx="95" cy="148" r="12" fill="#e2e8f0" stroke="#64748b" strokeWidth="3" />
          <circle cx="230" cy="148" r="22" fill="#1e293b" />
          <circle cx="230" cy="148" r="12" fill="#e2e8f0" stroke="#64748b" strokeWidth="3" />
          {/* Push Force Indicator Arrow */}
          <path d="M260,100 L300,100 M290,92 L300,100 L290,108" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
          <text x="260" y="80" fill="#2563eb" fontWeight="bold" fontSize="12" className="dark:fill-blue-400">
            Force (F = m · a)
          </text>
        </svg>
      )}

      {category === "cricket-ball" && (
        <svg viewBox="0 0 320 200" className="w-full h-full p-3" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="ballGrad" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>
          </defs>
          {/* Green Grass Field */}
          <rect y="130" width="320" height="70" fill="#16a34a" rx="4" />
          <path d="M0,130 Q80,122 160,130 T320,126 L320,200 L0,200 Z" fill="#15803d" />
          {/* Wooden Cricket Bat striking */}
          <g transform="translate(60, 40) rotate(42 70 50)">
            {/* Handle */}
            <rect x="65" y="0" width="12" height="40" rx="3" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />
            {/* Blade */}
            <path d="M58,40 L84,40 L80,130 Q71,136 62,130 Z" fill="#d97706" stroke="#92400e" strokeWidth="2" />
          </g>
          {/* Motion trajectory curves */}
          <path d="M120,95 Q180,60 250,110" stroke="#3b82f6" strokeWidth="3" strokeDasharray="5 4" strokeLinecap="round" fill="none" />
          {/* Red Cricket Ball */}
          <circle cx="210" cy="120" r="18" fill="url(#ballGrad)" stroke="#7f1d1d" strokeWidth="1.5" />
          {/* Seam */}
          <path d="M198,110 Q210,120 222,130" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 2" />
          {/* Question mark prompt */}
          <text x="210" y="75" textAnchor="middle" fill="#2563eb" fontWeight="900" fontSize="32" className="dark:fill-blue-400">
            ?
          </text>
        </svg>
      )}

      {category === "rocket-launch" && (
        <svg viewBox="0 0 340 220" className="w-full h-full object-cover" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="skyLaunch" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="rocketBody" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
          </defs>
          <rect width="340" height="220" fill="url(#skyLaunch)" />
          {/* Stars */}
          <circle cx="40" cy="30" r="1.5" fill="#fef08a" />
          <circle cx="100" cy="70" r="2" fill="#ffffff" />
          <circle cx="280" cy="35" r="1.5" fill="#ffffff" />
          {/* Billowing exhaust clouds */}
          <circle cx="240" cy="180" r="38" fill="#f8fafc" opacity="0.9" />
          <circle cx="190" cy="190" r="46" fill="#f1f5f9" opacity="0.95" />
          <circle cx="290" cy="195" r="32" fill="#e2e8f0" opacity="0.8" />
          {/* Rocket at 45 degree angle */}
          <g transform="translate(190, 80) rotate(-45 30 40)">
            {/* Flames */}
            <path d="M20,70 Q30,105 40,70 Z" fill="#ef4444" />
            <path d="M24,70 Q30,92 36,70 Z" fill="#facc15" />
            {/* Fins */}
            <path d="M12,50 L5,70 L20,65 Z" fill="#2563eb" />
            <path d="M48,50 L55,70 L40,65 Z" fill="#2563eb" />
            {/* Rocket fuselage */}
            <rect x="20" y="20" width="20" height="48" rx="4" fill="url(#rocketBody)" stroke="#94a3b8" strokeWidth="1" />
            {/* Nosecone */}
            <path d="M20,20 Q30,-5 40,20 Z" fill="#dc2626" />
            {/* Window */}
            <circle cx="30" cy="35" r="5" fill="#0284c7" stroke="#e0f2fe" strokeWidth="1.5" />
          </g>
        </svg>
      )}

      {category === "general-science" && (
        <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500">
          <span className="text-4xl mb-2 font-black select-none">SCI</span>
          <span className="text-xs font-semibold uppercase tracking-wider">{alt}</span>
        </div>
      )}

      {badge && (
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-slate-900/80 text-white backdrop-blur-md shadow-sm">
          {badge}
        </span>
      )}
    </div>
  );
};
