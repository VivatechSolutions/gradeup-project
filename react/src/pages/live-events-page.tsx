import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, Lock, Radio, Users } from "lucide-react";
import Navigation from "../components/navigation";
import FunnyLoader from "../components/ui/FunnyLoader";
import { listLiveEvents } from "../lib/gradeupApi";
import robotWaving from "../assets/dashboard/15_robot_waving.png";
import robotSearch from "../assets/dashboard/11_robot_magnifying_glass.png";

type EventType = "debate" | "seminar";
type StatusTab = "live" | "ongoing" | "ended";

type LiveEvent = {
  id: string;
  sessionId: string;
  sessionType: EventType;
  title?: string;
  topic?: string;
  createdBy?: string;
  subject?: string;
  unit?: string;
  status?: string;
  statusLabel?: string;
  visibility?: "public" | "school" | "class" | "private";
  visibilityLabel?: string;
  participantCount?: number;
  canAccess?: boolean;
  accessLabel?: string;
  canJoin?: boolean;
  joinUrl?: string;
};

/* ------------------------------------------------------------------ */
/* Card palettes — rich glassmorphic themes for diverse cards         */
/* ------------------------------------------------------------------ */
export type EventCardTheme = {
  id: string;
  name: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  glow: string;
  accent: string;
};

const CARD_THEMES: EventCardTheme[] = [
  {
    id: "coral",
    name: "Sunset Ember",
    bgLight: "linear-gradient(135deg, rgba(255, 107, 107, 0.86) 0%, rgba(255, 159, 67, 0.80) 100%)",
    bgDark: "linear-gradient(135deg, rgba(234, 88, 12, 0.32) 0%, rgba(190, 24, 93, 0.24) 100%)",
    borderLight: "rgba(255, 255, 255, 0.55)",
    borderDark: "rgba(249, 115, 22, 0.42)",
    glow: "rgba(249, 115, 22, 0.42)",
    accent: "#ff6b4a",
  },
  {
    id: "emerald",
    name: "Emerald Aurora",
    bgLight: "linear-gradient(135deg, rgba(16, 185, 129, 0.86) 0%, rgba(13, 148, 136, 0.80) 100%)",
    bgDark: "linear-gradient(135deg, rgba(16, 185, 129, 0.30) 0%, rgba(15, 118, 110, 0.24) 100%)",
    borderLight: "rgba(255, 255, 255, 0.55)",
    borderDark: "rgba(52, 211, 153, 0.42)",
    glow: "rgba(16, 185, 129, 0.42)",
    accent: "#10b981",
  },
  {
    id: "azure",
    name: "Electric Azure",
    bgLight: "linear-gradient(135deg, rgba(14, 165, 233, 0.86) 0%, rgba(2, 132, 199, 0.80) 100%)",
    bgDark: "linear-gradient(135deg, rgba(14, 165, 233, 0.30) 0%, rgba(30, 64, 175, 0.24) 100%)",
    borderLight: "rgba(255, 255, 255, 0.55)",
    borderDark: "rgba(56, 189, 248, 0.42)",
    glow: "rgba(14, 165, 233, 0.42)",
    accent: "#0ea5e9",
  },
  {
    id: "rose",
    name: "Orchid Rose",
    bgLight: "linear-gradient(135deg, rgba(236, 72, 153, 0.86) 0%, rgba(192, 38, 211, 0.80) 100%)",
    bgDark: "linear-gradient(135deg, rgba(236, 72, 153, 0.30) 0%, rgba(168, 85, 247, 0.24) 100%)",
    borderLight: "rgba(255, 255, 255, 0.55)",
    borderDark: "rgba(244, 114, 182, 0.42)",
    glow: "rgba(236, 72, 153, 0.42)",
    accent: "#ec4899",
  },
  {
    id: "amber",
    name: "Solar Citrus",
    bgLight: "linear-gradient(135deg, rgba(245, 158, 11, 0.88) 0%, rgba(234, 88, 12, 0.80) 100%)",
    bgDark: "linear-gradient(135deg, rgba(245, 158, 11, 0.30) 0%, rgba(194, 65, 12, 0.24) 100%)",
    borderLight: "rgba(255, 255, 255, 0.55)",
    borderDark: "rgba(251, 191, 36, 0.42)",
    glow: "rgba(245, 158, 11, 0.42)",
    accent: "#f59e0b",
  },
  {
    id: "teal",
    name: "Laguna Teal",
    bgLight: "linear-gradient(135deg, rgba(6, 182, 212, 0.86) 0%, rgba(20, 184, 166, 0.80) 100%)",
    bgDark: "linear-gradient(135deg, rgba(6, 182, 212, 0.30) 0%, rgba(13, 148, 136, 0.24) 100%)",
    borderLight: "rgba(255, 255, 255, 0.55)",
    borderDark: "rgba(103, 232, 249, 0.42)",
    glow: "rgba(6, 182, 212, 0.42)",
    accent: "#06b6d4",
  },
  {
    id: "ruby",
    name: "Ruby Velvet",
    bgLight: "linear-gradient(135deg, rgba(244, 63, 94, 0.86) 0%, rgba(225, 29, 72, 0.80) 100%)",
    bgDark: "linear-gradient(135deg, rgba(244, 63, 94, 0.30) 0%, rgba(159, 18, 57, 0.24) 100%)",
    borderLight: "rgba(255, 255, 255, 0.55)",
    borderDark: "rgba(251, 113, 133, 0.42)",
    glow: "rgba(244, 63, 94, 0.42)",
    accent: "#f43f5e",
  },
  {
    id: "lavender",
    name: "Cosmic Iris",
    bgLight: "linear-gradient(135deg, rgba(147, 51, 234, 0.86) 0%, rgba(99, 102, 241, 0.80) 100%)",
    bgDark: "linear-gradient(135deg, rgba(147, 51, 234, 0.28) 0%, rgba(67, 56, 202, 0.24) 100%)",
    borderLight: "rgba(255, 255, 255, 0.55)",
    borderDark: "rgba(192, 132, 252, 0.42)",
    glow: "rgba(147, 51, 234, 0.42)",
    accent: "#a855f7",
  },
];
const SEMINAR_GRADIENTS = [
  "linear-gradient(135deg,#00c896,#2fb86a)",
  "linear-gradient(135deg,#11a48c,#40c95f)",
  "linear-gradient(135deg,#00b4a0,#61d68a)",
];

const DEBATE_EMOJI = ["\u{1F3A4}", "\u{1F4E3}", "\u{2696}\u{FE0F}"]; // mic, megaphone, scales
const SEMINAR_EMOJI = ["\u{1F393}", "\u{1F4DA}", "\u{1F4A1}"]; // grad cap, books, bulb

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

.le-page{
  position:relative;
  min-height:100vh;
  overflow-x:hidden;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  color:var(--le-ink);
  --le-page-a:#eef4ff;
  --le-page-b:#fdf3ff;
  --le-page-a:#f0f5ff;
  --le-page-b:#fbf4ff;
  --le-page-c:#fff8ea;
  --le-ink:#0f1230;
  --le-muted:#5b6182;
  --le-card:#ffffff;
  --le-card-soft:#f6f7fe;
  --le-line:rgba(15,18,48,.09);
  --le-shadow:0 18px 42px rgba(31,25,90,.14);
  --le-shadow-soft:0 8px 20px rgba(31,25,90,.08);
  background:
    radial-gradient(circle at 12% 8%, rgba(124,107,255,.24), transparent 32%),
    radial-gradient(circle at 90% 4%, rgba(255,163,64,.22), transparent 30%),
    radial-gradient(circle at 82% 78%, rgba(0,179,138,.18), transparent 34%),
    radial-gradient(circle at 12% 8%, rgba(255,107,107,.18), transparent 32%),
    radial-gradient(circle at 90% 4%, rgba(255,163,64,.18), transparent 30%),
    radial-gradient(circle at 82% 78%, rgba(0,179,138,.16), transparent 34%),
    linear-gradient(160deg, var(--le-page-a), var(--le-page-b) 55%, var(--le-page-c));
  background-attachment:fixed;
}
[data-theme="dark"] .le-page,.dark .le-page{
  --le-page-a:#0a0d24;
  --le-page-b:#120b28;
  --le-page-c:#0c1a22;
  --le-page-a:#080b1e;
  --le-page-b:#0f142b;
  --le-page-c:#0a1622;
  --le-ink:#f4f5ff;
  --le-muted:#a8adcf;
  --le-card:#161a3a;
  --le-card-soft:#1c2144;
  --le-card:rgba(22,26,58,.85);
  --le-card-soft:rgba(28,33,68,.75);
  --le-line:rgba(255,255,255,.10);
  --le-shadow:0 22px 52px rgba(0,0,0,.5);
  --le-shadow-soft:0 10px 24px rgba(0,0,0,.32);
  background:
    radial-gradient(circle at 12% 8%, rgba(124,107,255,.3), transparent 34%),
    radial-gradient(circle at 90% 4%, rgba(255,163,64,.18), transparent 30%),
    radial-gradient(circle at 82% 78%, rgba(0,179,138,.2), transparent 36%),
    radial-gradient(circle at 12% 8%, rgba(255,107,107,.20), transparent 34%),
    radial-gradient(circle at 90% 4%, rgba(255,163,64,.15), transparent 30%),
    radial-gradient(circle at 82% 78%, rgba(0,200,150,.18), transparent 36%),
    linear-gradient(160deg, var(--le-page-a), var(--le-page-b) 55%, var(--le-page-c));
}

/* ---- moving background layer: drifting orbs + sparkle clusters + wave ---- */
.le-bg{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.le-orb{position:absolute;border-radius:50%;filter:blur(6px);opacity:.55;animation:leDrift 15s ease-in-out infinite}
.le-orb.o1{left:-90px;top:100px;width:280px;height:280px;background:radial-gradient(circle,rgba(75,91,255,.32),transparent 70%)}
.le-orb.o2{right:-110px;top:320px;width:320px;height:320px;background:radial-gradient(circle,rgba(0,200,150,.26),transparent 70%);animation-delay:-5s}
.le-orb.o3{left:36%;bottom:-150px;width:340px;height:340px;background:radial-gradient(circle,rgba(255,163,64,.22),transparent 70%);animation-delay:-10s}
.le-orb.o4{right:18%;top:-100px;width:220px;height:220px;background:radial-gradient(circle,rgba(192,75,216,.24),transparent 70%);animation-delay:-3s}
.le-orb.o1{left:-90px;top:100px;width:280px;height:280px;background:radial-gradient(circle,rgba(255,107,107,.25),transparent 70%)}
.le-orb.o2{right:-110px;top:320px;width:320px;height:320px;background:radial-gradient(circle,rgba(0,200,150,.24),transparent 70%);animation-delay:-5s}
.le-orb.o3{left:36%;bottom:-150px;width:340px;height:340px;background:radial-gradient(circle,rgba(255,163,64,.20),transparent 70%);animation-delay:-10s}
.le-orb.o4{right:18%;top:-100px;width:220px;height:220px;background:radial-gradient(circle,rgba(6,182,212,.22),transparent 70%);animation-delay:-3s}
@keyframes leDrift{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(30px,-26px,0) scale(1.08)}}
.le-ribbon{position:absolute;left:2%;right:2%;top:160px;height:180px;border-radius:50%;filter:blur(20px);opacity:.6;
  background:linear-gradient(90deg,rgba(75,91,255,.10),rgba(0,200,150,.12),rgba(255,163,64,.10));
  background:linear-gradient(90deg,rgba(255,107,107,.10),rgba(0,200,150,.12),rgba(14,165,233,.10));
  animation:leWave 12s ease-in-out infinite}
@keyframes leWave{0%,100%{transform:translate3d(-2%,0,0) rotate(0)}50%{transform:translate3d(2%,-3%,0) rotate(2deg)}}
.le-spark{position:absolute;border-radius:50%;opacity:.6;animation:leTwinkle 3.2s ease-in-out infinite}
@keyframes leTwinkle{0%,100%{opacity:.25;transform:scale(.85)}50%{opacity:.9;transform:scale(1.15)}}
@media (prefers-reduced-motion: reduce){ .le-orb,.le-ribbon,.le-spark{animation:none} }

.le-shell{position:relative;z-index:1;max-width:1180px;margin:0 auto;padding:96px 22px 48px}

/* header / stage strip */
/* header / stage strip with glassmorphism */
.le-head{
  display:flex;align-items:center;justify-content:space-between;gap:18px;
  border-radius:22px;padding:22px 24px;margin-bottom:22px;position:relative;overflow:hidden;
  background:linear-gradient(120deg, rgba(75,91,255,.16), rgba(0,200,150,.14));
  border:1px solid var(--le-line);
  box-shadow:var(--le-shadow-soft);
  border-radius:24px;padding:24px 26px;margin-bottom:24px;position:relative;overflow:hidden;
  background:linear-gradient(135deg, rgba(255,255,255,.82), rgba(245,248,255,.65));
  backdrop-filter:blur(20px) saturate(180%);
  -webkit-backdrop-filter:blur(20px) saturate(180%);
  border:1px solid rgba(255,255,255,.8);
  box-shadow:0 14px 36px rgba(31,25,90,.09), inset 0 1px 2px rgba(255,255,255,.9);
}
[data-theme="dark"] .le-head, .dark .le-head{
  background:linear-gradient(135deg, rgba(22,26,58,.82), rgba(16,20,48,.65));
  border:1px solid rgba(255,255,255,.12);
  box-shadow:0 18px 48px rgba(0,0,0,.5), inset 0 1px 1px rgba(255,255,255,.12);
}
.le-head::after{
  content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(100deg,transparent 0%,rgba(255,255,255,.22) 45%,transparent 60%);
  transform:translateX(-120%);animation:leSheen 6s ease-in-out infinite;
}
@keyframes leSheen{0%{transform:translateX(-120%)}45%,100%{transform:translateX(220%)}}
.le-head-copy{display:flex;align-items:center;gap:14px;position:relative;z-index:1}
.le-onair{
  display:inline-flex;align-items:center;gap:7px;height:26px;padding:0 11px;border-radius:999px;
  background:#dc2626;color:#fff;font-size:11px;font-weight:900;letter-spacing:.03em;flex:0 0 auto;
  box-shadow:0 4px 12px rgba(220,38,38,.35);
}
.le-onair-dot{width:7px;height:7px;border-radius:50%;background:#fff;animation:lePulseDot 1.5s ease-in-out infinite}
@keyframes lePulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}
.le-title{font-size:clamp(22px,3vw,30px);font-weight:900;line-height:1.08;color:var(--le-ink)}
.le-sub{font-size:13px;color:var(--le-muted);margin-top:5px;line-height:1.55;max-width:440px}
.le-robot{width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 10px 14px rgba(31,25,90,.25));animation:leBob 3.6s ease-in-out infinite;flex:0 0 auto}
@keyframes leBob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-7px) rotate(2deg)}}

/* tabs with sliding pill */
/* tabs with sliding glass pill */
.le-tabs{
  position:relative;display:inline-flex;gap:4px;padding:5px;border-radius:14px;
  background:var(--le-card);border:1px solid var(--le-line);box-shadow:var(--le-shadow-soft);z-index:1;
  position:relative;display:inline-flex;gap:4px;padding:5px;border-radius:16px;
  background:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.8);
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  box-shadow:var(--le-shadow-soft);z-index:1;
}
[data-theme="dark"] .le-tabs, .dark .le-tabs{
  background:rgba(22,26,58,.8);border:1px solid rgba(255,255,255,.12);
}
.le-tab{
  position:relative;z-index:1;height:38px;padding:0 18px;border:0;border-radius:10px;background:transparent;
  position:relative;z-index:1;height:38px;padding:0 20px;border:0;border-radius:12px;background:transparent;
  color:var(--le-muted);font-size:13px;font-weight:800;cursor:pointer;transition:color .2s;
}
.le-tab.active{color:#fff}
.le-tab-indicator{
  position:absolute;top:5px;bottom:5px;border-radius:10px;z-index:0;
  box-shadow:0 8px 18px rgba(75,91,255,.35);
  transition:left .28s cubic-bezier(.4,0,.2,1), width .28s cubic-bezier(.4,0,.2,1), background .28s;
  position:absolute;top:5px;bottom:5px;border-radius:12px;z-index:0;
  transition:left .28s cubic-bezier(.4,0,.2,1), width .28s cubic-bezier(.4,0,.2,1), background .28s, box-shadow .28s;
}

/* ---- gradient-tile event cards, same visual family as the dashboard's Explore & Play grid ---- */
.le-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(288px,1fr));gap:16px;margin-top:4px}
/* ---- modern glassmorphic event cards ---- */
.le-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(288px,1fr));gap:18px;margin-top:8px}
.le-card{
  position:relative;overflow:hidden;border-radius:22px;color:#fff;
  padding:18px;box-shadow:var(--le-shadow-soft);
  transition:transform .22s ease,box-shadow .22s ease;
  background-size:180% 180%;
  position:relative;overflow:hidden;border-radius:24px;color:#fff;
  padding:20px;
  background:var(--card-bg-light);
  border:1px solid var(--card-border-light);
  backdrop-filter:blur(18px) saturate(180%);
  -webkit-backdrop-filter:blur(18px) saturate(180%);
  box-shadow:0 14px 34px -10px var(--card-glow), inset 0 1px 1.5px rgba(255,255,255,0.45);
  transition:transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s cubic-bezier(.2,.8,.2,1), border-color .25s ease;
}
.le-card:hover{transform:translateY(-6px) scale(1.012);box-shadow:var(--le-shadow);animation:leGlowMove 3s ease infinite}
@keyframes leGlowMove{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.le-card::before{content:"";position:absolute;left:-30px;top:-40px;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.16);transition:transform .3s}
.le-card:hover::before{transform:scale(1.25)}
.le-card::after{content:"";position:absolute;right:-36px;bottom:-40px;width:160px;height:160px;border-radius:50%;background:rgba(0,0,0,.10)}
[data-theme="dark"] .le-card, .dark .le-card{
  background:var(--card-bg-dark);
  border:1px solid var(--card-border-dark);
  box-shadow:0 18px 44px -10px rgba(0,0,0,.65), 0 0 28px -6px var(--card-glow), inset 0 1px 1px rgba(255,255,255,0.18);
}
.le-card:hover{
  transform:translateY(-6px) scale(1.015);
  box-shadow:0 22px 50px -10px rgba(0,0,0,.35), 0 0 34px -4px var(--card-glow), inset 0 1px 1.5px rgba(255,255,255,0.6);
}
[data-theme="dark"] .le-card:hover, .dark .le-card:hover{
  box-shadow:0 24px 54px -10px rgba(0,0,0,.75), 0 0 42px -2px var(--card-glow), inset 0 1px 1px rgba(255,255,255,0.28);
}
.le-card::before{
  content:"";position:absolute;left:-35px;top:-45px;width:160px;height:160px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,255,.32),transparent 70%);
  transition:transform .3s ease;pointer-events:none;
}
[data-theme="dark"] .le-card::before, .dark .le-card::before{
  background:radial-gradient(circle,rgba(255,255,255,.16),transparent 70%);
}
.le-card:hover::before{transform:scale(1.3)}
.le-card::after{
  content:"";position:absolute;right:-30px;bottom:-40px;width:160px;height:160px;border-radius:50%;
  background:radial-gradient(circle,var(--card-glow),transparent 70%);
  opacity:0.35;pointer-events:none;
}

.le-card-emoji{
  position:absolute;right:14px;top:14px;font-size:38px;line-height:1;z-index:1;
  filter:drop-shadow(0 8px 10px rgba(0,0,0,.18));
  animation:lePop 4.2s ease-in-out infinite;animation-delay:var(--le-delay,0s);
}
@keyframes lePop{0%,100%{transform:translateY(0) rotate(-3deg) scale(1)}50%{transform:translateY(-7px) rotate(4deg) scale(1.08)}}
.le-card:hover .le-card-emoji{animation:leWiggle .6s ease both}
@keyframes leWiggle{0%,100%{transform:rotate(0) scale(1)}35%{transform:rotate(-10deg) scale(1.12)}70%{transform:rotate(10deg) scale(1.12)}}

.le-row{display:flex;align-items:center;justify-content:space-between;gap:10px;position:relative;z-index:1}
.le-chip{
  display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:8px;
  font-size:10.5px;font-weight:900;text-transform:uppercase;letter-spacing:.02em;
  background:rgba(255,255,255,.22);color:#fff;
  display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 11px;border-radius:10px;
  font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.03em;
  background:rgba(255,255,255,.24);color:#fff;
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border:1px solid rgba(255,255,255,.32);
}
.le-status{font-size:11px;font-weight:900;color:rgba(255,255,255,.85);display:inline-flex;align-items:center;gap:5px}
[data-theme="dark"] .le-chip, .dark .le-chip{
  background:rgba(255,255,255,.14);
  border-color:rgba(255,255,255,.18);
  color:#f1f5f9;
}
.le-status{font-size:11px;font-weight:900;color:rgba(255,255,255,.9);display:inline-flex;align-items:center;gap:5px}
.le-status.live{color:#ffe3e3}
.le-status.live::before{content:"";width:6px;height:6px;border-radius:50%;background:#ff5d5d;animation:lePulseDot 1.4s ease-in-out infinite}
.le-status.live::before{content:"";width:7px;height:7px;border-radius:50%;background:#ff4d4d;box-shadow:0 0 8px #ff4d4d;animation:lePulseDot 1.4s ease-in-out infinite}

.le-topic{font-size:17px;font-weight:900;line-height:1.32;margin-top:13px;max-width:78%;position:relative;z-index:1}
.le-meta{font-size:11.5px;color:rgba(255,255,255,.78);margin-top:7px;line-height:1.6;position:relative;z-index:1;max-width:82%}
.le-topic{font-size:17px;font-weight:900;line-height:1.32;margin-top:13px;max-width:78%;position:relative;z-index:1;text-shadow:0 1px 2px rgba(0,0,0,.15)}
.le-meta{font-size:11.5px;color:rgba(255,255,255,.85);margin-top:7px;line-height:1.6;position:relative;z-index:1;max-width:82%}

.le-facts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px;position:relative;z-index:1}
.le-fact{display:flex;align-items:center;gap:7px;min-height:34px;padding:8px 9px;border-radius:10px;background:rgba(255,255,255,.16);color:#fff;font-size:11.5px;font-weight:700}
.le-fact{
  display:flex;align-items:center;gap:7px;min-height:36px;padding:8px 10px;border-radius:12px;
  background:rgba(255,255,255,.18);color:#fff;font-size:11.5px;font-weight:700;
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border:1px solid rgba(255,255,255,.22);
}
[data-theme="dark"] .le-fact, .dark .le-fact{
  background:rgba(255,255,255,.09);
  border-color:rgba(255,255,255,.12);
  color:#f1f5f9;
}

.le-action{
  width:100%;margin-top:10px;height:40px;border:0;border-radius:11px;cursor:pointer;
  background:#fff;color:var(--le-ink);font-weight:900;font-size:13px;position:relative;z-index:1;
  transition:transform .16s ease;
  width:100%;margin-top:12px;height:42px;border:0;border-radius:12px;cursor:pointer;
  background:rgba(255,255,255,.94);color:var(--le-ink);font-weight:900;font-size:13px;
  position:relative;z-index:1;
  box-shadow:0 6px 18px rgba(0,0,0,.12);
  transition:transform .18s ease,box-shadow .18s ease,background .18s ease;
  backdrop-filter:blur(8px);
}
.le-action:not(:disabled):hover{transform:translateY(-2px)}
.le-action.disabled{background:rgba(255,255,255,.22);color:rgba(255,255,255,.85);cursor:not-allowed}
.le-action:not(:disabled):hover{
  transform:translateY(-2px);
  box-shadow:0 10px 24px rgba(0,0,0,.22);
  background:#fff;
}
[data-theme="dark"] .le-action, .dark .le-action{
  background:rgba(255,255,255,.92);
  color:#0b0f24;
  box-shadow:0 8px 24px rgba(0,0,0,.45);
}
.le-action.disabled{
  background:rgba(255,255,255,.20);color:rgba(255,255,255,.75);cursor:not-allowed;
  box-shadow:none;
}
[data-theme="dark"] .le-action.disabled, .dark .le-action.disabled{
  background:rgba(255,255,255,.10);color:rgba(255,255,255,.5);
}

/* empty state with mascot */
.le-empty{
  padding:52px 24px;text-align:center;border-radius:20px;border:1px dashed var(--le-line);
  padding:52px 24px;text-align:center;border-radius:22px;border:1px dashed var(--le-line);
  background:var(--le-card);color:var(--le-muted);margin-top:22px;
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
}
.le-empty-robot{width:96px;height:96px;object-fit:contain;margin:0 auto 12px;filter:drop-shadow(0 12px 14px rgba(31,25,90,.22));animation:leBob 4s ease-in-out infinite}
.le-empty-title{font-size:15px;font-weight:800;color:var(--le-ink);margin-bottom:4px}

@media(max-width:720px){
  .le-shell{padding:88px 14px 32px}
  .le-head{flex-direction:column;align-items:stretch;gap:16px;padding:18px}
  .le-head-copy{gap:10px}
  .le-robot{width:52px;height:52px}
  .le-tabs{width:100%}
  .le-tab{flex:1}
  .le-grid{grid-template-columns:1fr}
  .le-topic,.le-meta{max-width:100%}
}
.live-events-page{min-height:100vh;background:#f6f8fb;color:#0f172a;font-family:"Plus Jakarta Sans",system-ui,sans-serif}
.live-events-shell{max-width:1180px;margin:0 auto;padding:92px 24px 36px}
.live-events-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:18px}
.live-events-title{font-size:30px;font-weight:900;letter-spacing:0;line-height:1.1}
.live-events-sub{font-size:13px;color:#64748b;margin-top:6px;line-height:1.6}
.live-events-tabs{display:flex;gap:8px;padding:5px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.05)}
.live-events-tab{height:36px;padding:0 14px;border:0;border-radius:6px;background:transparent;color:#475569;font-size:13px;font-weight:800;cursor:pointer}
.live-events-tab.active{background:#0f172a;color:#fff}
.live-events-filters{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.live-events-filter{height:34px;padding:0 13px;border:1px solid #dbe4ef;border-radius:7px;background:#fff;color:#475569;font-size:12px;font-weight:900;cursor:pointer}
.live-events-filter.active{background:#2563eb;border-color:#2563eb;color:#fff}
.live-events-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.event-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 10px 28px rgba(15,23,42,.06);overflow:hidden}
.event-card-top{padding:15px 16px 12px;border-bottom:1px solid #edf2f7}
.event-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.event-type{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 8px;border-radius:6px;background:#eef6ff;color:#1d4ed8;font-size:11px;font-weight:900;text-transform:uppercase}
.event-type.seminar{background:#ecfdf5;color:#047857}
.event-status{font-size:11px;font-weight:900;color:#334155}
.event-status.live{color:#dc2626}
.event-topic{font-size:16px;font-weight:900;line-height:1.35;margin-top:12px;color:#0f172a}
.event-meta{font-size:12px;color:#64748b;line-height:1.6;margin-top:8px}
.event-card-body{padding:13px 16px 15px;display:grid;gap:10px}
.event-facts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.event-fact{display:flex;align-items:center;gap:7px;min-height:34px;padding:8px;border-radius:7px;background:#f8fafc;color:#475569;font-size:12px;font-weight:700}
.event-action{height:38px;border:0;border-radius:7px;background:#2563eb;color:#fff;font-weight:900;font-size:13px;cursor:pointer}
.event-action.seminar{background:#059669}
.event-action.disabled{background:#e2e8f0;color:#64748b;cursor:not-allowed}
.event-empty{padding:42px 18px;text-align:center;border:1px dashed #cbd5e1;border-radius:8px;background:#fff;color:#64748b}
[data-theme="dark"] .live-events-page,.dark .live-events-page{background:#0b1120;color:#f8fafc}
[data-theme="dark"] .live-events-sub,.dark .live-events-sub{color:#cbd5e1}
[data-theme="dark"] .live-events-tabs,.dark .live-events-tabs{background:#111827;border-color:rgba(148,163,184,.22);box-shadow:0 12px 30px rgba(0,0,0,.28)}
[data-theme="dark"] .live-events-tab,.dark .live-events-tab{color:#cbd5e1}
[data-theme="dark"] .live-events-tab.active,.dark .live-events-tab.active{background:#e2e8f0;color:#0f172a}
[data-theme="dark"] .event-card,.dark .event-card{background:#111827;border-color:rgba(148,163,184,.22);box-shadow:0 14px 34px rgba(0,0,0,.34)}
[data-theme="dark"] .event-card-top,.dark .event-card-top{border-bottom-color:rgba(148,163,184,.16)}
[data-theme="dark"] .event-topic,.dark .event-topic{color:#f8fafc}
[data-theme="dark"] .event-meta,.dark .event-meta{color:#cbd5e1}
[data-theme="dark"] .event-status,.dark .event-status{color:#e2e8f0}
[data-theme="dark"] .event-status.live,.dark .event-status.live{color:#fca5a5}
[data-theme="dark"] .event-type,.dark .event-type{background:rgba(96,165,250,.16);color:#93c5fd}
[data-theme="dark"] .event-type.seminar,.dark .event-type.seminar{background:rgba(16,185,129,.16);color:#6ee7b7}
[data-theme="dark"] .event-fact,.dark .event-fact{background:rgba(15,23,42,.78);color:#e2e8f0;border:1px solid rgba(148,163,184,.16)}
[data-theme="dark"] .event-action.disabled,.dark .event-action.disabled{background:#334155;color:#cbd5e1}
[data-theme="dark"] .event-empty,.dark .event-empty{background:#111827;border-color:#475569;color:#cbd5e1}
@media(max-width:720px){.live-events-shell{padding:84px 14px 24px}.live-events-head{align-items:stretch;flex-direction:column}.live-events-tabs{width:100%}.live-events-tab{flex:1}.live-events-title{font-size:24px}}
`;

function statusIsLive(event: LiveEvent) {
  const status = String(event.status || "").toLowerCase();
  return status === "active" || status === "waiting_for_ai";
}

function actionLabel(event: LiveEvent) {
  if (!event.canAccess) return event.accessLabel || "Restricted";
  const status = String(event.status || "waiting").toLowerCase();
  const ended = status === "completed" || status === "ended" || status === "ending" || status === "end_error";
  if (status === "cancelled" || status === "canceled") return "Cancelled";
  const started = status === "active" || status === "waiting_for_ai";
  if (ended) return "Ended";
  if (event.sessionType === "debate" && started) return "In Progress";
  return event.sessionType === "seminar" ? "Join Seminar" : "Join Debate";
}

export default function LiveEventsPage() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<EventType>("debate");
  const [statusTab, setStatusTab] = useState<StatusTab>("live");
  const { data = [], isLoading } = useQuery<LiveEvent[]>({
    queryKey: ["/api/v1/live-events", tab, statusTab],
    queryFn: () => listLiveEvents(tab, statusTab),
    refetchInterval: 5000,
  });

  const events = useMemo(
    () => data.filter((event) => event.sessionType === tab),
    [data, tab],
  );

  const tabAccent = tab === "debate" 
    ? "linear-gradient(120deg,#ff6b4a,#ffa07a)" 
    : "linear-gradient(120deg,#10b981,#06b6d4)";
  const tabShadow = tab === "debate"
    ? "0 8px 18px rgba(255,107,74,.4)"
    : "0 8px 18px rgba(16,185,129,.4)";

  return (
    <div className="le-page">
      <style>{styles}</style>
      <div className="le-bg" aria-hidden>
        <span className="le-orb o1" />
        <span className="le-orb o2" />
        <span className="le-orb o3" />
        <span className="le-orb o4" />
        <span className="le-ribbon" />
        <span className="le-spark" style={{ left: "18%", top: "22%", width: 6, height: 6, background: "#ff6b4a", animationDelay: "-0.4s" }} />
        <span className="le-spark" style={{ left: "62%", top: "14%", width: 5, height: 5, background: "#10b981", animationDelay: "-1.2s" }} />
        <span className="le-spark" style={{ left: "78%", top: "46%", width: 7, height: 7, background: "#f59e0b", animationDelay: "-2s" }} />
        <span className="le-spark" style={{ left: "30%", top: "62%", width: 5, height: 5, background: "#ec4899", animationDelay: "-0.8s" }} />
        <span className="le-spark" style={{ left: "10%", top: "78%", width: 6, height: 6, background: "#06b6d4", animationDelay: "-1.6s" }} />
      </div>
      <Navigation />
      <main className="le-shell">
        <motion.div
          className="le-head"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="le-head-copy">
            <img src={robotWaving} alt="" className="le-robot" />
            <div>
              <span className="le-onair"><span className="le-onair-dot" />ON AIR</span>
              <div className="le-title" style={{ marginTop: 8 }}>Live Events</div>
              <div className="le-sub">
                Join visible debate and seminar rooms from your class, school, or public sessions.
              </div>
            </div>
          </div>

          <div className="le-tabs">
            <span
              className="le-tab-indicator"
              style={{
                left: tab === "debate" ? 5 : "calc(50% + 2px)",
                width: "calc(50% - 7px)",
                background: tabAccent,
                boxShadow: tabShadow,
              }}
            />
            <button
              className={`le-tab${tab === "debate" ? " active" : ""}`}
              onClick={() => setTab("debate")}
            >
              Debate
            </button>
            <button
              className={`le-tab${tab === "seminar" ? " active" : ""}`}
              onClick={() => setTab("seminar")}
            >
              Seminar
            </button>
          </div>
        </motion.div>

        <div className="live-events-filters">
          {[
            ["live", "Live"],
            ["ongoing", "Ongoing"],
            ["ended", "Ended / Cancelled"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={`live-events-filter${statusTab === value ? " active" : ""}`}
              onClick={() => setStatusTab(value as StatusTab)}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <FunnyLoader text="Loading live events..." />
        ) : events.length ? (
          <AnimatePresence mode="wait">
            <motion.div
              className="le-grid"
              key={tab}
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.05 } } }}
            >
              {events.map((event, index) => {
                const joinable = Boolean(event.canJoin);
                const typeLabel = event.sessionType === "seminar" ? "Seminar" : "Debate";
                const theme = CARD_THEMES[index % CARD_THEMES.length];
                const emojis = event.sessionType === "seminar" ? SEMINAR_EMOJI : DEBATE_EMOJI;
                const emoji = emojis[index % emojis.length];
                return (
                  <motion.article
                    className="le-card"
                    key={event.id || event.sessionId}
                    style={{
                      "--card-bg-light": theme.bgLight,
                      "--card-bg-dark": theme.bgDark,
                      "--card-border-light": theme.borderLight,
                      "--card-border-dark": theme.borderDark,
                      "--card-glow": theme.glow,
                      "--card-accent": theme.accent,
                      "--le-delay": `${index * -0.3}s`,
                    } as React.CSSProperties}
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      show: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="le-card-emoji" aria-hidden>{emoji}</span>
                    <div className="le-row">
                      <span className="le-chip">
                        <Radio size={12} /> {typeLabel}
                      </span>
                      <span className={`le-status${statusIsLive(event) ? " live" : ""}`}>
                        {event.statusLabel || "Waiting"}
                      </span>
                    </div>
                    <div className="le-topic">{event.topic || event.title || `${typeLabel} session`}</div>
                    <div className="le-meta">
                      Created by {event.createdBy || "GradeUp learner"}
                      {event.subject ? ` | ${event.subject}` : ""}
                      {event.unit ? ` | ${event.unit}` : ""}
                    </div>
                    <div className="le-facts">
                      <div className="le-fact">
                        <Users size={14} /> {event.participantCount || 0} participants
                      </div>
                      <div className="le-fact">
                        <Lock size={14} /> {event.visibilityLabel || "Access to all"}
                      </div>
                    </div>
                    <button
                      className={`le-action${joinable ? "" : " disabled"}`}
                      disabled={!joinable}
                      onClick={() => {
                        if (!event.joinUrl) return;
                        if (/^https?:\/\//i.test(event.joinUrl)) {
                          window.location.href = event.joinUrl;
                        } else {
                          setLocation(event.joinUrl);
                        }
                      }}
                    >
                      {actionLabel(event)}
                    </button>
                  </motion.article>
                );
              })}
            </motion.div>
          </AnimatePresence>
        ) : (
          <>          <motion.div
            className="le-empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <img src={robotSearch} alt="" className="le-empty-robot" />
            <div className="le-empty-title">No {tab} rooms are live right now</div>
            <div>
              <CalendarClock size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
              Check back soon, or switch tabs to see what's on air.
            </div>
          </motion.div>
          <div className="event-empty">
            <CalendarClock size={28} style={{ margin: "0 auto 10px" }} />
            No visible {tab} events found in this status.
          </div>
          </>

        )}
      </main>
    </div>
  );
}