import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { useMediaQuery } from "../hooks/use-media-query";

interface SidebarProps {
  currentRole: "student" | "teacher";
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface SectionDivider { section: string; }
interface NavItem {
  label: string;
  href: string;
  icon: keyof typeof ICON_PATHS;
  color: string;
  children?: { label: string; href: string; }[];
}
type MenuItem = SectionDivider | NavItem;
const isSection = (item: MenuItem): item is SectionDivider => "section" in item;
const isParent  = (item: MenuItem): item is NavItem => "children" in item && Array.isArray((item as NavItem).children);

/* ─────────────────────────────────────────────────────────────
   CSS — fixes:
   1. Tooltip: pointer-events on .sb-iw so hover works even
      when .sb-tip has pointer-events:none
   2. Tooltip z-index raised; positioned relative to viewport
   3. Mobile: never collapses to icon — always full-width or hidden
   4. Collapse button: fixed position in collapsed state so it
      stays centred regardless of topbar content
───────────────────────────────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

:root {
  --sb-w:  256px;
  --sb-cw:  68px;
}

.sb-root {
  width: var(--sb-w);
  background: #0f172a;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: visible;
  transition: width .3s cubic-bezier(.4,0,.2,1);
  position: relative;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  flex-shrink: 0;
}
/* Desktop-only collapse */
.sb-root.collapsed { width: var(--sb-cw); }

/* ── TOP BAR ── */
.sb-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 12px 12px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  flex-shrink: 0;
  min-height: 64px;
  gap: 8px;
}
/* When collapsed: centre the single toggle button */
.sb-root.collapsed .sb-topbar {
  justify-content: center;
  padding: 14px 0 12px;
}

.sb-ava {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg,#6366f1,#ec4899);
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 13px; color: #fff;
  box-shadow: 0 4px 12px rgba(99,102,241,.45);
  position: relative;
}
.sb-ava::after {
  content:''; position:absolute; bottom:-2px; right:-2px;
  width:9px; height:9px; border-radius:50%;
  background:#22c55e; border:2px solid #0f172a;
}
.sb-profile-text { flex:1; overflow:hidden; min-width:0; }
.sb-root.collapsed .sb-profile-text { display:none; }
.sb-pname { font-size:13px; font-weight:700; color:#f1f5f9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sb-prole { font-size:11px; color:#64748b; text-transform:capitalize; margin-top:1px; }

/* ── TOGGLE BUTTON ── */
.sb-toggle {
  width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
  background: #1e293b;
  border: 1.5px solid rgba(99,102,241,.5);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #818cf8;
  transition: all .2s;
  box-shadow: 0 2px 8px rgba(0,0,0,.25);
}
.sb-toggle:hover { background: #6366f1; color: #fff; border-color: #6366f1; transform: scale(1.08); }
.sb-toggle svg { width: 13px; height: 13px; transition: transform .3s; }
/* Arrow flips when collapsed */
.sb-root.collapsed .sb-toggle svg { transform: rotate(180deg); }

/* ── NAV AREA ── */
.sb-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 8px 6px;
  overflow-y: auto;
  overflow-x: visible;       /* ← allow tooltip to overflow horizontally */
  gap: 1px;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(99,102,241,.3) transparent;
}
.sb-nav::-webkit-scrollbar { width: 4px; }
.sb-nav::-webkit-scrollbar-thumb { background: rgba(99,102,241,.3); border-radius: 4px; }

/* Section label */
.sb-sec {
  font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: #475569; padding: 5px 8px 3px;
  white-space: nowrap; overflow: hidden; flex-shrink: 0;
  transition: opacity .2s, height .25s, padding .25s;
  height: 22px;
}
.sb-root.collapsed .sb-sec { opacity:0; height:0; padding:0; }

.sb-div { height:1px; background:rgba(255,255,255,.06); margin:3px 8px; flex-shrink:0; }

/* ── Item wrapper — MUST allow pointer-events so hover reaches tooltip ── */
.sb-iw {
  position: relative;
  flex-shrink: 0;
  /* pointer-events intentionally NOT set to none */
}

/* Nav item */
.sb-item {
  display: flex; align-items: center; gap: 9px;
  padding: 7px 8px; border-radius: 9px;
  cursor: pointer; border: 1px solid transparent; background: none;
  font-family: inherit; width: 100%; text-align: left;
  transition: all .18s cubic-bezier(.4,0,.2,1);
  text-decoration: none; min-height: 36px;
  position: relative; overflow: visible;   /* overflow:visible keeps tooltip accessible */
}
.sb-item:hover  { background: rgba(255,255,255,.06); }
.sb-item.active { background: rgba(99,102,241,.15); border-color: rgba(99,102,241,.38); }

/* Icon pill */
.sb-ico {
  width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: all .18s;
}
.sb-ico svg { width: 15px; height: 15px; }
.sb-item:hover  .sb-ico { transform: scale(1.1); }
.sb-item.active .sb-ico { transform: scale(1.04); box-shadow: 0 3px 10px rgba(0,0,0,.3); }

/* Colour variants */
.cv{background:rgba(139,92,246,.2);color:#a78bfa}
.cb{background:rgba(59,130,246,.2);color:#60a5fa}
.ce{background:rgba(16,185,129,.2);color:#34d399}
.cp{background:rgba(236,72,153,.2);color:#f472b6}
.ca{background:rgba(245,158,11,.2);color:#fbbf24}
.cr{background:rgba(239,68,68,.2);color:#f87171}
.cc{background:rgba(6,182,212,.2);color:#22d3ee}
.co{background:rgba(249,115,22,.2);color:#fb923c}
.cs{background:rgba(244,63,94,.2);color:#fb7185}
.ct{background:rgba(20,184,166,.2);color:#2dd4bf}
.ci{background:rgba(99,102,241,.2);color:#818cf8}
.cl{background:rgba(132,204,22,.2);color:#a3e635}
.sb-item.active .cv,.sb-item:hover .cv{background:rgba(139,92,246,.35);color:#c4b5fd}
.sb-item.active .cb,.sb-item:hover .cb{background:rgba(59,130,246,.35);color:#93c5fd}
.sb-item.active .ce,.sb-item:hover .ce{background:rgba(16,185,129,.35);color:#6ee7b7}
.sb-item.active .cp,.sb-item:hover .cp{background:rgba(236,72,153,.35);color:#f9a8d4}
.sb-item.active .ca,.sb-item:hover .ca{background:rgba(245,158,11,.35);color:#fde68a}
.sb-item.active .cr,.sb-item:hover .cr{background:rgba(239,68,68,.35);color:#fca5a5}
.sb-item.active .cc,.sb-item:hover .cc{background:rgba(6,182,212,.35);color:#67e8f9}
.sb-item.active .co,.sb-item:hover .co{background:rgba(249,115,22,.35);color:#fdba74}
.sb-item.active .cs,.sb-item:hover .cs{background:rgba(244,63,94,.35);color:#fda4af}
.sb-item.active .ct,.sb-item:hover .ct{background:rgba(20,184,166,.35);color:#5eead4}
.sb-item.active .ci,.sb-item:hover .ci{background:rgba(99,102,241,.35);color:#a5b4fc}
.sb-item.active .cl,.sb-item:hover .cl{background:rgba(132,204,22,.35);color:#bef264}

/* Label */
.sb-label {
  font-size: 12.5px; font-weight: 500; color: #fffff9;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: color .18s, opacity .2s, max-width .3s;
  // #94a3b8 is a bit too light, #64748b is a bit too dark — right in the middle is perfect
  max-width: 160px;
}
.sb-item.active .sb-label, .sb-item:hover .sb-label { color: #f1f5f9; }
.sb-root.collapsed .sb-label { opacity:0; max-width:0; }

/* Active dot */
.sb-dot {
  margin-left: auto; width:5px; height:5px; border-radius:50%;
  background: linear-gradient(135deg,#6366f1,#8b5cf6);
  box-shadow: 0 0 7px rgba(99,102,241,.8); flex-shrink:0;
  animation: dotBlink 2s ease-in-out infinite;
}
@keyframes dotBlink { 0%,100%{opacity:1} 50%{opacity:.35} }
.sb-root.collapsed .sb-dot { display:none; }

/* ────────────────────────────────────────────────────────
   TOOLTIP  — fixed issues:
   • Uses fixed positioning so it escapes overflow:hidden parents
   • Shown via JS (data-tip-visible) instead of CSS-only hover
     because CSS-only :hover on parent doesn't work when
     overflow is clipped on an ancestor
   • Fallback CSS :hover also included for when JS is ready
──────────────────────────────────────────────────────── */
.sb-tip {
  position: fixed;           /* escape any overflow:hidden on parent */
  background: #1e293b;
  border: 1px solid rgba(99,102,241,.45);
  color: #f1f5f9;
  font-size: 11.5px; font-weight: 600;
  padding: 5px 12px;
  border-radius: 8px;
  white-space: nowrap;
  box-shadow: 0 8px 24px rgba(0,0,0,.5);
  pointer-events: none;
  opacity: 0;
  transition: opacity .15s, transform .15s;
  z-index: 9999;
  transform: translateX(-4px);
  /* position set by JS via style.left / style.top */
}
.sb-tip.visible {
  opacity: 1;
  transform: translateX(0);
}
.sb-tip::before {
  content: '';
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 5px solid transparent;
  border-right-color: rgba(99,102,241,.45);
}

/* ── Sub-menu ── */
.sb-sub {
  overflow: hidden;
  max-height: 0;
  transition: max-height .25s cubic-bezier(.4,0,.2,1);
  padding-left: 20px;
}
.sb-sub.open { max-height: 200px; }

.sb-sub-item {
  display: block;
  font-size: 11.5px; font-weight: 500; color: #94a3b8;
  padding: 5px 8px 5px 23px;
  border-radius: 6px;
  position: relative;
  white-space: nowrap;
  text-decoration: none;
}
.sb-sub-item:hover { color: #f1f5f9; background: rgba(255,255,255,.04); }
.sb-sub-item.active { color: #f1f5f9; }
.sb-sub-item::before { content:'•'; position:absolute; left:8px; top:5px; color:#64748b; font-size:10px; }
.sb-sub-item.active::before { color:#818cf8; }

.sb-item .sb-chev {
  margin-left: auto;
  width: 14px; height: 14px;
  transition: transform .25s;
  flex-shrink: 0;
  color: #94a3b8;
}
.sb-item.sub-open .sb-chev { transform: rotate(90deg); }

/* ── BOTTOM ── */
.sb-bottom {
  padding: 6px 8px 10px;
  border-top: 1px solid rgba(255,255,255,.06);
  flex-shrink: 0;
  display: flex; flex-direction: column; gap: 1px;
}

/* ── MOBILE — sidebar slides in/out, NEVER collapses to icon ── */
@media (max-width: 1024px) {
  .sb-root {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 200;
    width: var(--sb-w) !important;   /* always full width on mobile */
    transform: translateX(-110%);
    transition: transform .3s cubic-bezier(.4,0,.2,1);
    box-shadow: 8px 0 40px rgba(0,0,0,.6);
  }
  .sb-root.mob-open {
    transform: translateX(0);
  }
  /* On mobile, the toggle becomes a ✕ close button — no collapse arrow */
  .sb-root .sb-toggle svg { transform: none !important; }
  /* Keep profile visible on mobile (never collapse state on mobile) */
  .sb-root.collapsed { width: var(--sb-w) !important; }
  .sb-root.collapsed .sb-profile-text { display: block !important; }
  .sb-root.collapsed .sb-label { opacity: 1 !important; max-width: 160px !important; }
  .sb-root.collapsed .sb-sec { opacity: 1 !important; height: 22px !important; padding: 5px 8px 3px !important; }
  .sb-root.collapsed .sb-dot { display: block !important; }
  .sb-root.collapsed .sb-topbar { justify-content: space-between !important; padding: 14px 12px 12px !important; }
  /* Never show tooltips on mobile */
  .sb-tip { display: none !important; }
}

/* Overlay backdrop on mobile */
.sb-backdrop {
  display: none;
  position: fixed; inset: 0; z-index: 199;
  background: rgba(0,0,0,.5);
  backdrop-filter: blur(2px);
  animation: fadeBd .2s ease;
}
@keyframes fadeBd { from{opacity:0} to{opacity:1} }
.sb-backdrop.visible { display: block; }
`;

const SvgI = ({ p }: { p: string }) => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={p} />
  </svg>
);

const ICON_PATHS = {
  home:     "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  chart:    "M18 20V10M12 20V4M6 20v-6",
  bot:      "M12 2a2 2 0 012 2v2h3a1 1 0 011 1v5a7 7 0 01-14 0V7a1 1 0 011-1h3V4a2 2 0 012-2zM8 11h.01M16 11h.01",
  book:     "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z",
  file:     "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
  msg:      "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  trophy:   "M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0012 0V2z",
  users:    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 110 8 4 4 0 010-8z",
  debate:   "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2zM3 9a2 2 0 012-2h14",
  grad:     "M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5",
  plus:     "M12 5v14M5 12h14",
  clip:     "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 14l2 2 4-4M8 2h8a1 1 0 011 1v3a1 1 0 01-1 1H8a1 1 0 01-1-1V3a1 1 0 011-1z",
  exam:     "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  barChart: "M12 20V10M18 20V4M6 20v-4",
  calendar: "M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18",
  upload:   "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  logout:   "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  chevL:    "M15 18l-6-6 6-6",
  chevR:    "M9 18l6-6-6-6",
  chevDown: "M6 9l6 6 6-6",
  close:    "M18 6L6 18M6 6l12 12",
   video: "M23 7l-7 5 7 5V7zM1 5h15v14H1z",
  presentation: "M3 3h18v12H3zM8 21h8M12 15v6",
  lightbulb: "M9 18h6M10 22h4M12 2a7 7 0 00-4 12c.5.5 1 1.5 1 2h6c0-.5.5-1.5 1-2a7 7 0 00-4-12z",
  examNew: "M6 2h8a2 2 0 012 2v16l-4-2-4 2-4-2-4 2V4a2 2 0 012-2zm2 6h6M8 10h6M8 12h4",
  debateNew: "M4 5h10a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V7a2 2 0 012-2zm12 6h4a2 2 0 012 2v4a2 2 0 01-2 2h-2v3l-3-3h-1a2 2 0 01-2-2v-1"
} as const;

const STUDENT_MENU: MenuItem[] = [
  { section: "Main" },
  { label:"Dashboard",     href:"/dashboard",       icon:"home",     color:"cv" },
  { label:"Progress",      href:"/progress",        icon:"chart",    color:"cb" },
  { section: "Tools" },
  { label:"AI Tutor",      href:"/ai-tutor",        icon:"bot",      color:"ce" },
  { label:"Book Library",  href:"/bookExpanded",    icon:"book",     color:"cc" },
  { label:"Homework",      href:"/homework",         icon:"file",     color:"ca" },
  { label:"Homework Helper",      href:"/homework-helper",         icon:"lightbulb",     color:"cv" },
  { label:"Community",     href:"/community",        icon:"msg",      color:"cp" },
 { label:"Group Chat", href:"/communityNew", icon:"users", color:"cp" },
  { label:"Achievements",  href:"/achievements",     icon:"trophy",   color:"co" },
  // { label:"Seminar",       href:"/seminar-tool",     icon:"users",    color:"ct" },
  // { label:"Debate",        href:"/debate-tool",      icon:"debate",   color:"cs" },
  { label:"Debate",        href:"/debatePage",      icon:"debateNew",   color:"ca" },
  { label: "Meeting", href: "/meetingPage", icon: "video", color: "cs" },
{ label: "Seminar", href: "/seminarPage", icon: "presentation", color: "ct" },
  { label:"Exams", href:"/exam-preparation", icon:"examNew", color:"ci", children:[
    { label:"Prep",      href:"/exam-preparation" },
    { label:"Main Exam", href:"/main-exam" },
  ]},
  { label:"Extras",     href:"/bookGuide",        icon:"grad",     color:"cl" },
  { label: "Calendar",    href: "/calendar",    icon: "calendar", color:"cc"  }
];

const TEACHER_MENU: MenuItem[] = [
  { section: "Main" },
  { label:"Dashboard",   href:"/dashboard",                icon:"home",     color:"cv" },
  { label:"Create",      href:"/enhanced-content-manager", icon:"plus",     color:"ce" },
  { label:"Students",    href:"/students",                 icon:"users",    color:"cb" },
  { label:"Assignments", href:"/teacher/homework",          icon:"clip",     color:"ca" },
  { section: "Analytics" },
  { label:"Community",   href:"/community",                icon:"msg",      color:"cp" },
  { label:"Progress",    href:"/analytics",                icon:"barChart", color:"co" },
  { label:"Calendar",    href:"/analytics",                icon:"calendar", color:"ct" },
  { label:"Upload PDF",  href:"/enhanced-content-manager", icon:"upload",   color:"cc" },
];

/* ── Tooltip with JS-driven positioning ──────────────────────────── */
function TooltipItem({
  item,
  collapsed,
  active,
  children,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef  = useRef<HTMLDivElement>(null);

  const showTip = () => {
    if (!collapsed || !wrapRef.current || !tipRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    tipRef.current.style.top  = `${rect.top + rect.height / 2}px`;
    tipRef.current.style.left = `${rect.right + 10}px`;
    tipRef.current.style.transform = "translateY(-50%)";
    tipRef.current.classList.add("visible");
  };
  const hideTip = () => tipRef.current?.classList.remove("visible");

  return (
    <div ref={wrapRef} className="sb-iw" onMouseEnter={showTip} onMouseLeave={hideTip}>
      {children}
      <div ref={tipRef} className="sb-tip">{item.label}</div>
    </div>
  );
}

export default function Sidebar({
  currentRole,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const isMobile = useMediaQuery("(max-width: 1024px)");

  // Desktop collapse state — never applies on mobile
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !isMobile && localStorage.getItem("sb_c") === "1";
  });
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({});

  // Persist collapse state
  useEffect(() => {
    if (!isMobile) {
      try { localStorage.setItem("sb_c", collapsed ? "1" : "0"); } catch {}
    }
  }, [collapsed, isMobile]);

  // Close submenus when collapsing
  useEffect(() => {
    if (collapsed) setOpenSubs({});
  }, [collapsed]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile && mobileOpen) onMobileClose?.();
  }, [location]); // eslint-disable-line

  const menu  = currentRole === "student" ? STUDENT_MENU : TEACHER_MENU;
  const first = user?.firstName ?? "Alex";
  const last  = user?.lastName  ?? "Johnson";

  const isActive = (href: string) =>
    location === href || (href === "/dashboard" && (location === "/" || location === "/dashboard"));

  const toggleSub = (key: string) => setOpenSubs(s => ({ ...s, [key]: !s[key] }));

  // On mobile: the toggle closes the sidebar.
  // On desktop: the toggle collapses/expands the icon-only mode.
  const handleToggle = () => {
    if (isMobile) {
      onMobileClose?.();
    } else {
      setCollapsed(v => !v);
    }
  };

  // Desktop-collapsed state for CSS class (never applies on mobile)
  const isCollapsed = !isMobile && collapsed;

  // Bottom items share the same tooltip logic
  const bottomItems = [
    { label:"Settings", href:"/settings",  icon:"settings" as const, color:"ci" },
  ];

  return (
    <>
      <style>{css}</style>

      {/* Backdrop — mobile only */}
      {isMobile && mobileOpen && (
        <div className="sb-backdrop visible" onClick={onMobileClose} />
      )}

      <aside className={[
        "sb-root",
        isCollapsed  ? "collapsed" : "",
        mobileOpen   ? "mob-open"  : "",
      ].filter(Boolean).join(" ")}>

        {/* ── TOP BAR ── */}
        <div className="sb-topbar">
          {/* Avatar + name (hidden when desktop-collapsed) */}
          {!isCollapsed && (
            <>
              <div className="sb-ava">{first[0]}{last[0]}</div>
              <div className="sb-profile-text">
                <div className="sb-pname">{first} {last}</div>
                <div className="sb-prole">{currentRole}</div>
              </div>
            </>
          )}

          {/* Toggle button — always visible */}
          <button
            className="sb-toggle"
            onClick={handleToggle}
            title={isMobile ? "Close menu" : (isCollapsed ? "Expand sidebar" : "Collapse sidebar")}
          >
            {/* Mobile: show ✕. Desktop: show arrow that flips */}
            {isMobile
              ? <SvgI p={ICON_PATHS.close} />
              : <SvgI p={isCollapsed ? ICON_PATHS.chevR : ICON_PATHS.chevL} />
            }
          </button>
        </div>

        {/* ── NAV ── */}
        <nav className="sb-nav">
          {menu.map((item, i) => {
            // Section divider
            if (isSection(item)) {
              return <div key={`s${i}`} className="sb-sec">{item.section}</div>;
            }

            // Parent with children (submenu)
            if (isParent(item)) {
              const key    = item.label;
              const isOpen = openSubs[key] && !isCollapsed;
              return (
                <TooltipItem key={key} item={item} collapsed={isCollapsed} active={isActive(item.href)}>
                  <button
                    className={`sb-item${isOpen ? " sub-open" : ""}${isActive(item.href) ? " active" : ""}`}
                    onClick={() => !isCollapsed && toggleSub(key)}
                  >
                    <div className={`sb-ico ${item.color}`}><SvgI p={ICON_PATHS[item.icon]} /></div>
                    <span className="sb-label">{item.label}</span>
                    {!isCollapsed && (
                      <div className="sb-chev"><SvgI p={ICON_PATHS.chevDown} /></div>
                    )}
                    {isActive(item.href) && <span className="sb-dot" />}
                  </button>
                  <div className={`sb-sub${isOpen ? " open" : ""}`}>
                    {item.children?.map(child => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`sb-sub-item${isActive(child.href) ? " active" : ""}`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </TooltipItem>
              );
            }

            // Regular item
            return (
              <TooltipItem key={`${item.href}${i}`} item={item} collapsed={isCollapsed} active={isActive(item.href)}>
                <Link
                  href={item.href}
                  className={`sb-item${isActive(item.href) ? " active" : ""}`}
                >
                  <div className={`sb-ico ${item.color}`}><SvgI p={ICON_PATHS[item.icon]} /></div>
                  <span className="sb-label">{item.label}</span>
                  {isActive(item.href) && <span className="sb-dot" />}
                </Link>
              </TooltipItem>
            );
          })}
        </nav>

        {/* ── BOTTOM: Settings + Logout ── */}
        <div className="sb-bottom">
          {/* Settings */}
          <TooltipItem
            item={{ label:"Settings", href:"/settings", icon:"settings", color:"ci" }}
            collapsed={isCollapsed}
            active={isActive("/settings")}
          >
            <Link
              href="/settings"
              className={`sb-item${isActive("/settings") ? " active" : ""}`}
            >
              <div className="sb-ico ci"><SvgI p={ICON_PATHS.settings} /></div>
              <span className="sb-label">Settings</span>
              {isActive("/settings") && <span className="sb-dot" />}
            </Link>
          </TooltipItem>

          {/* Logout */}
          <TooltipItem
            item={{ label:"Logout", href:"#", icon:"logout", color:"cr" }}
            collapsed={isCollapsed}
            active={false}
          >
            <button
              className="sb-item"
              onClick={() => logoutMutation.mutate()}
            >
              <div className="sb-ico cr"><SvgI p={ICON_PATHS.logout} /></div>
              <span className="sb-label" style={{ color:"#f87171" }}>Logout</span>
            </button>
          </TooltipItem>
        </div>

      </aside>
    </>
  );
}