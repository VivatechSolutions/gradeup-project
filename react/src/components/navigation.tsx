import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import NotificationIcon from "./NotificationIcon";
import { useTheme } from "../hooks/use-theme";

interface NavigationProps {
  currentRole: "student" | "teacher";
  onRoleChange?: (role: "student" | "teacher") => void;
}

interface NavLinkItem {
  label: string;
  href: string;
  icon: keyof typeof ICONS;
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.nav-root {
  height: 64px !important;
  min-height: 64px !important;
  max-height: 64px !important;
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1.5px solid rgba(99,102,241,0.1);
  position: sticky; top: 0; z-index: 200;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  box-shadow: 0 2px 12px rgba(99,102,241,.07), 0 1px 3px rgba(0,0,0,.04);
  flex-shrink: 0;
  transition: background .3s, border-color .3s;
}
.dark .nav-root {
  background: rgba(15,23,42,0.97);
  border-bottom-color: rgba(99,102,241,0.18);
  box-shadow: 0 2px 12px rgba(0,0,0,.35);
}

/* ── LEFT ── */
.nav-left { display:flex; align-items:center; gap:10px; flex-shrink:0; min-width:0; }

.nav-back {
  width: 34px; height: 34px; border-radius: 9px;
  border: 1.5px solid #e0e7ff; background: #f5f3ff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #6366f1; flex-shrink: 0;
  transition: all .2s cubic-bezier(.4,0,.2,1);
  animation: backIn .25s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes backIn { from{opacity:0;transform:translateX(-8px) scale(.9)} to{opacity:1;transform:none} }
.nav-back:hover {
  background: #6366f1; color: #fff; border-color: #6366f1;
  transform: translateX(-2px); box-shadow: 0 4px 12px rgba(99,102,241,.35);
}
.nav-back:active { transform: translateX(-1px) scale(.96); }
.nav-back svg { width: 15px; height: 15px; }
.dark .nav-back { border-color: rgba(99,102,241,.35); background: rgba(99,102,241,.15); }
.dark .nav-back:hover { background: #6366f1; color: #fff; border-color: #6366f1; }

.nav-back-wrap { position: relative; }
.nav-back-wrap:hover .nav-back-tip {
  opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: none;
}
.nav-back-tip {
  position: absolute; top: calc(100% + 8px); left: 50%; transform: translateX(-50%) translateY(-4px);
  background: #0f172a; color: #fff; font-size: 11px; font-weight: 600;
  padding: 4px 10px; border-radius: 7px; white-space: nowrap;
  opacity: 0; transition: all .18s; pointer-events: none; z-index: 400;
}
.nav-back-tip::before {
  content: ''; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
  border: 4px solid transparent; border-bottom-color: #0f172a;
}
.dark .nav-back-tip { background: #e2e8f0; color: #0f172a; }
.dark .nav-back-tip::before { border-bottom-color: #e2e8f0; }

.nav-brand { display:flex; align-items:center; gap:9px; text-decoration:none; flex-shrink:0; }
.nav-logo-wrap {
  width: 36px; height: 36px; border-radius: 10px;
  background: linear-gradient(135deg,#6366f1,#8b5cf6);
  display:flex; align-items:center; justify-content:center;
  box-shadow: 0 4px 12px rgba(99,102,241,.38);
  position:relative; overflow:hidden; flex-shrink:0;
  animation: logoPulse 3s ease-in-out infinite;
}
@keyframes logoPulse {
  0%,100%{ box-shadow:0 4px 12px rgba(99,102,241,.38); }
  50%    { box-shadow:0 4px 22px rgba(99,102,241,.62); }
}
.nav-logo-wrap::after {
  content:''; position:absolute; inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,.28) 0%,transparent 60%);
}
.nav-logo-wrap svg { width:18px; height:18px; color:#fff; position:relative; z-index:1; }
.nav-brand-name {
  font-size:17px; font-weight:800; letter-spacing:-.4px;
  background:linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
}

.nav-crumb { display:flex; align-items:center; gap:4px; animation: crumbIn .2s ease both; flex-wrap:nowrap; overflow:hidden; }
@keyframes crumbIn { from{opacity:0;transform:translateX(-4px)} to{opacity:1;transform:none} }
.nav-crumb-sep  { font-size:15px; color:#d1d5db; font-weight:300; line-height:1; flex-shrink:0; }
.nav-crumb-page {
  font-size:13px; font-weight:600; color:#374151; white-space:nowrap;
  max-width:140px; overflow:hidden; text-overflow:ellipsis;
}
.nav-crumb-page.clickable {
  cursor: pointer; color: #6366f1; transition: color .15s;
  padding: 2px 6px; border-radius: 6px;
}
.nav-crumb-page.clickable:hover { background: rgba(99,102,241,.08); }
.nav-crumb-page.current { color: #374151; cursor: default; }
.dark .nav-crumb-sep  { color:#374151; }
.dark .nav-crumb-page { color:#94a3b8; }
.dark .nav-crumb-page.clickable { color: #a5b4fc; }
.dark .nav-crumb-page.clickable:hover { background: rgba(99,102,241,.15); }
.dark .nav-crumb-page.current { color: #94a3b8; }

/* ── CENTER ── */
.nav-links {
  display:flex; align-items:center; gap:2px;
  position:absolute; left:50%; transform:translateX(-50%); margin-left:30px;
}
.nav-link {
  display:flex; align-items:center; gap:6px; padding:7px 13px; border-radius:9px;
  font-size:13.5px; font-weight:500; color:#6b7280; text-decoration:none;
  border:none; background:none; cursor:pointer; font-family:inherit;
  transition:all .2s cubic-bezier(.4,0,.2,1); position:relative; white-space:nowrap;
}
.nav-link svg { width:14px; height:14px; flex-shrink:0; }
.nav-link:hover { color:#4f46e5; background:rgba(99,102,241,.08); }
.nav-link.active { color:#4f46e5; background:rgba(99,102,241,.1); font-weight:600; }
.nav-link.active::after {
  content:''; position:absolute; bottom:2px; left:50%; transform:translateX(-50%);
  width:18px; height:2.5px; background:linear-gradient(90deg,#6366f1,#8b5cf6); border-radius:2px;
}
.dark .nav-link { color:#94a3b8; }
.dark .nav-link:hover  { color:#a5b4fc; background:rgba(99,102,241,.15); }
.dark .nav-link.active { color:#a5b4fc; background:rgba(99,102,241,.2); }

/* ── RIGHT ── */
.nav-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }

.nav-icon-btn {
  width:36px; height:36px; border-radius:10px; border:none; background:none; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  color:#6b7280; transition:all .2s; position:relative;
}
.nav-icon-btn:hover { background:#f5f3ff; color:#4f46e5; transform:translateY(-1px); }
.nav-icon-btn svg { width:17px; height:17px; }
.dark .nav-icon-btn { color:#94a3b8; }
.dark .nav-icon-btn:hover { background:rgba(99,102,241,.18); color:#a5b4fc; }

.nav-theme-btn {
  width:36px; height:36px; border-radius:10px;
  border:1.5px solid #e0e7ff; background:#f5f3ff; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  color:#6366f1; transition:all .2s; position:relative;
}
.nav-theme-btn:hover { background:#6366f1; color:#fff; border-color:#6366f1; transform:translateY(-1px); box-shadow:0 4px 12px rgba(99,102,241,.35); }
.nav-theme-btn svg { width:16px; height:16px; }
.dark .nav-theme-btn { border-color:rgba(245,158,11,.4); background:rgba(245,158,11,.12); color:#fbbf24; }
.dark .nav-theme-btn:hover { background:#f59e0b; color:#fff; border-color:#f59e0b; }

.notif-dot {
  position:absolute; top:6px; right:6px; width:7px; height:7px; border-radius:50%;
  background:linear-gradient(135deg,#ef4444,#f97316); border:2px solid #fff;
  animation:ping 1.5s ease-in-out infinite;
}
.dark .notif-dot { border-color:#0f172a; }
@keyframes ping { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:.7} }

.nav-ava-wrap { position:relative; cursor:pointer; }
.nav-ava {
  width:34px; height:34px; border-radius:50%;
  background:linear-gradient(135deg,#6366f1,#ec4899);
  display:flex; align-items:center; justify-content:center;
  font-size:12px; font-weight:700; color:#fff;
  border:2.5px solid rgba(99,102,241,.25); transition:all .2s; user-select:none;
}
.nav-ava:hover { transform:scale(1.08); box-shadow:0 4px 14px rgba(99,102,241,.4); }
.nav-ava-online {
  position:absolute; bottom:0px; right:0px; width:9px; height:9px;
  border-radius:50%; background:#22c55e; border:2px solid #fff;
}
.dark .nav-ava-online { border-color:#0f172a; }

.nav-drop {
  position:absolute; top:calc(100%+8px); right:0; width:214px; background:#fff;
  border-radius:14px; border:1px solid rgba(0,0,0,.08);
  box-shadow:0 20px 60px rgba(0,0,0,.13),0 4px 16px rgba(0,0,0,.06);
  padding:8px; z-index:300;
  animation:dropIn .2s cubic-bezier(.34,1.56,.64,1);
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
}
@keyframes dropIn { from{opacity:0;transform:translateY(-8px) scale(.96)} to{opacity:1;transform:none} }
.dark .nav-drop {
  background:#1e293b; border-color:rgba(255,255,255,.1);
  box-shadow:0 20px 60px rgba(0,0,0,.5),0 4px 16px rgba(0,0,0,.3);
}
.drop-head  { padding:10px 12px 12px; border-bottom:1px solid #f3f4f6; margin-bottom:6px; }
.drop-name  { font-size:13.5px; font-weight:700; color:#111; }
.drop-email { font-size:12px; color:#9ca3af; margin-top:1px; }
.dark .drop-head { border-bottom-color:rgba(255,255,255,.08); }
.dark .drop-name  { color:#f1f5f9; }
.dark .drop-email { color:#64748b; }
.drop-item  {
  display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:9px;
  font-size:13px; color:#374151; cursor:pointer; transition:all .15s;
  border:none; background:none; font-family:inherit; width:100%; text-align:left;
}
.drop-item svg { width:14px; height:14px; }
.drop-item:hover { background:#f5f3ff; color:#6366f1; }
.drop-item.danger { color:#ef4444; }
.drop-item.danger:hover { background:#fef2f2; color:#dc2626; }
.dark .drop-item { color:#94a3b8; }
.dark .drop-item:hover { background:rgba(99,102,241,.18); color:#a5b4fc; }
.dark .drop-item.danger { color:#f87171; }
.dark .drop-item.danger:hover { background:rgba(239,68,68,.15); color:#ef4444; }

/* ── Logout loading state ── */
.drop-item:disabled { opacity:.5; cursor:not-allowed; }

/* ── HAMBURGER ── */
.ham-btn {
  display:none; width:36px; height:36px; border-radius:10px;
  border:none; background:none; cursor:pointer;
  flex-direction:column; align-items:center; justify-content:center; gap:5px;
}
.ham-line { width:18px; height:2px; background:#6b7280; border-radius:2px; transition:all .25s; }
.ham-btn.open .ham-line:nth-child(1) { transform:rotate(45deg) translate(5px,5px); }
.ham-btn.open .ham-line:nth-child(2) { opacity:0; transform:scaleX(0); }
.ham-btn.open .ham-line:nth-child(3) { transform:rotate(-45deg) translate(5px,-5px); }
.dark .ham-line { background:#94a3b8; }

/* ── MOBILE DRAWER ── */
.mob-sheet { position:fixed; inset:0; z-index:300; pointer-events:none; }
.mob-overlay { position:absolute; inset:0; background:rgba(0,0,0,.4); backdrop-filter:blur(2px); opacity:0; transition:opacity .28s; }
.mob-drawer  {
  position:absolute; top:0; left:0; bottom:0; width:280px;
  background:#fff; box-shadow:8px 0 40px rgba(0,0,0,.14);
  transform:translateX(-100%); transition:transform .3s cubic-bezier(.4,0,.2,1);
  display:flex; flex-direction:column;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
}
.dark .mob-drawer { background:#0f172a; }
.mob-sheet.open { pointer-events:all; }
.mob-sheet.open .mob-overlay { opacity:1; }
.mob-sheet.open .mob-drawer  { transform:translateX(0); }
.mob-head   { display:flex; align-items:center; justify-content:space-between; padding:18px 20px; border-bottom:1px solid #f3f4f6; }
.dark .mob-head { border-bottom-color:rgba(255,255,255,.08); }
.mob-links  { padding:12px; flex:1; overflow-y:auto; }
.mob-link   {
  display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:12px;
  font-size:14px; font-weight:500; color:#6b7280; text-decoration:none; margin-bottom:4px;
  transition:all .2s; cursor:pointer; border:none; background:none; font-family:inherit; width:100%; text-align:left;
}
.mob-link svg { width:18px; height:18px; }
.mob-link:hover  { background:#f5f3ff; color:#6366f1; }
.mob-link.active { background:rgba(99,102,241,.1); color:#6366f1; font-weight:600; }
.dark .mob-link { color:#94a3b8; }
.dark .mob-link:hover  { background:rgba(99,102,241,.18); color:#a5b4fc; }
.dark .mob-link.active { background:rgba(99,102,241,.2); color:#a5b4fc; }
.mob-foot { padding:12px 20px 16px; border-top:1px solid #f3f4f6; margin:0 12px; }
.dark .mob-foot { border-top-color:rgba(255,255,255,.08); }
.mob-user { display:flex; align-items:center; gap:12px; padding:12px 0; }
.mob-ava  {
  width:42px; height:42px; border-radius:50%;
  background:linear-gradient(135deg,#6366f1,#ec4899);
  display:flex; align-items:center; justify-content:center;
  font-size:15px; font-weight:700; color:#fff; flex-shrink:0;
}
.mob-user-name { font-weight:700; font-size:14px; color:#111; }
.mob-user-role { font-size:12px; color:#9ca3af; text-transform:capitalize; }
.dark .mob-user-name { color:#f1f5f9; }

@media (max-width:900px) { .nav-links { display:none; } .ham-btn { display:flex; } }
@media (max-width:768px) { .nav-crumb { display:none; } }
@media (max-width:480px) { .nav-root { padding:0 14px; } }
`;

const I = ({ p, s = 18 }: { p: string; s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={p} />
  </svg>
);

const ICONS = {
  home:     "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  chart:    "M18 20V10M12 20V4M6 20v-6",
  bot:      "M12 2a2 2 0 012 2v2h3a1 1 0 011 1v5a7 7 0 01-14 0V7a1 1 0 011-1h3V4a2 2 0 012-2zM8 11h.01M16 11h.01",
  users:    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 110 8 4 4 0 010-8z",
  trophy:   "M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0012 0V2z",
  bell:     "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  moon:     "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  sun:      "M12 12m-4 0a4 4 0 108 0 4 4 0 10-8 0M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41",
  user:     "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  cog:      "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  logout:   "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  grad:     "M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5",
  x:        "M18 6L6 18M6 6l12 12",
  create:   "M12 5v14M5 12h14",
  arrowL:   "M19 12H5M12 5l-7 7 7 7",
  calendar: "M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18",
} as const;

const PAGE_LABELS: Record<string, string> = {
  "/progress":                 "Progress",
  "/ai-tutor":                 "AI Tutor",
  "/community":                "Community",
  "/communityNew":             "Group Chat",
  "/achievements":             "Achievements",
  "/homework":                 "Homework",
  "/bookExpanded":             "Book Content",
  "/seminar-tool":             "Seminar Tool",
  "/debate-tool":              "Debate Room",
  "/debatePage":               "Debate",
  "/seminarPage":              "Seminar",
  "/meetingPage":              "Meeting",
  "/exam-preparation":         "Exam Prep",
  "/main-exam":                "Main Exam",
  "/studio/quiz-bank":         "Quiz Bank",
  "/studio/quiz":              "Quiz",
  "/students":                 "My Students",
  "/enhanced-content-manager": "Create Content",
  "/teacher/homework":         "Assignments",
  "/analytics":                "Analytics",
  "/profile":                  "Profile",
  "/settings":                 "Settings",
  "/notifications":            "Notifications",
  "/courses":                  "Courses",
  "/calendar":                 "Calendar",
};

const STUDENT_LINKS: NavLinkItem[] = [
  { label: "Dashboard",    href: "/dashboard",    icon: "home"   },
  { label: "Progress",     href: "/progress",     icon: "chart"  },
  { label: "AI Tutor",     href: "/ai-tutor",     icon: "bot"    },
  { label: "Community",    href: "/community",    icon: "users"  },
  { label: "Achievements", href: "/achievements", icon: "trophy" },
];

const TEACHER_LINKS: NavLinkItem[] = [
  { label: "Dashboard", href: "/dashboard",                icon: "home"   },
  { label: "Students",  href: "/students",                 icon: "users"  },
  { label: "Create",    href: "/enhanced-content-manager", icon: "create" },
  { label: "Analytics", href: "/analytics",                icon: "chart"  },
];

const DASHBOARD_ROOTS = new Set(["/", "/dashboard"]);
const MAX_HISTORY = 50;
const NAV_HISTORY_KEY = "gradeup_nav_history_v1";

export default function Navigation({ currentRole }: NavigationProps) {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropOpen,   setDropOpen]   = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const historyStack = useRef<string[]>((() => {
    try {
      const raw = sessionStorage.getItem(NAV_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")) {
        return parsed.length > 0 ? parsed : [location];
      }
    } catch {}
    return [location];
  })());
  const isNavigatingBack = useRef(false);

  useEffect(() => {
    if (isNavigatingBack.current) {
      isNavigatingBack.current = false;
      return;
    }
    const stack = historyStack.current;
    const top   = stack[stack.length - 1];
    if (location !== top) {
      stack.push(location);
      if (stack.length > MAX_HISTORY) stack.splice(0, stack.length - MAX_HISTORY);
    }
    try {
      sessionStorage.setItem(NAV_HISTORY_KEY, JSON.stringify(stack));
    } catch {}
  }, [location]);

  const goBack = useCallback(() => {
    const stack = historyStack.current;
    while (stack.length > 0 && stack[stack.length - 1] === location) stack.pop();
    const target = stack[stack.length - 1] ?? "/dashboard";
    if (stack.length === 0) stack.push(target);
    try { sessionStorage.setItem(NAV_HISTORY_KEY, JSON.stringify(stack)); } catch {}
    isNavigatingBack.current = true;
    setLocation(target);
  }, [location, setLocation]);

  const isDash   = DASHBOARD_ROOTS.has(location);
  const showBack = !isDash;

  const crumbTrail = (() => {
    if (isDash) return [];
    const result = [{ href: "/dashboard", label: "Dashboard" }];
    const currentLabel = Object.entries(PAGE_LABELS)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([k]) => location.startsWith(k))?.[1];
    if (currentLabel && currentLabel !== "Dashboard") {
      result.push({ href: location, label: currentLabel });
    }
    return result;
  })();

  const prevLabel = (() => {
    const stack = historyStack.current;
    if (stack.length < 2) return "Dashboard";
    const prevPath = stack[stack.length - 2];
    if (prevPath === "/dashboard" || prevPath === "/") return "Dashboard";
    return Object.entries(PAGE_LABELS).sort((a, b) => b[0].length - a[0].length).find(([k]) => prevPath.startsWith(k))?.[1] ?? "Back";
  })();

  const links    = currentRole === "teacher" ? TEACHER_LINKS : STUDENT_LINKS;
  const initials = `${user?.firstName?.[0] ?? "A"}${user?.lastName?.[0] ?? "J"}`;
  const isActive = (href: string) => location === href || (href === "/dashboard" && isDash);

  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  // ── Handle logout — fires use-auth.tsx onSuccess which does window.location.href="/auth"
  const handleLogout = () => {
    setDropOpen(false);
    setMobileOpen(false);
    logoutMutation.mutate();
  };

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setDropOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location]);

  return (
    <>
      <style>{css}</style>
      <nav className="nav-root">

        {/* ── LEFT ── */}
        <div className="nav-left">
          {showBack && (
            <div className="nav-back-wrap">
              <button className="nav-back" onClick={goBack} aria-label={`Back to ${prevLabel}`}>
                <I p={ICONS.arrowL} s={15} />
              </button>
              <div className="nav-back-tip">← {prevLabel}</div>
            </div>
          )}

          <Link href="/dashboard" className="nav-brand">
            <div className="nav-logo-wrap"><I p={ICONS.grad} s={17} /></div>
            <span className="nav-brand-name">GradeUp!</span>
          </Link>

          {showBack && crumbTrail.length > 0 && (
            <div className="nav-crumb">
              {crumbTrail.map((crumb, i) => {
                const isLast = i === crumbTrail.length - 1;
                return (
                  <span key={crumb.href} style={{ display:"flex", alignItems:"center", gap:4 }}>
                    {i > 0 && <span className="nav-crumb-sep">/</span>}
                    {isLast ? (
                      <span className="nav-crumb-page current">{crumb.label}</span>
                    ) : (
                      <Link href={crumb.href} className="nav-crumb-page clickable">
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* ── CENTER ── */}
        <div className="nav-links">
          {links.map(l => (
            <Link key={l.href} href={l.href} className={`nav-link${isActive(l.href)?" active":""}`}>
              <I p={ICONS[l.icon]} s={14} />{l.label}
            </Link>
          ))}
        </div>

        {/* ── RIGHT ── */}
        <div className="nav-right">
          <Link href="/calendar">
            <button className="nav-icon-btn" title="Calendar">
              <I p={ICONS.calendar} s={16} />
            </button>
          </Link>

          <button className="nav-theme-btn" onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            <I p={isDark ? ICONS.sun : ICONS.moon} s={16} />
          </button>

          <NotificationIcon />

          {/* Avatar + dropdown */}
          <div className="nav-ava-wrap" ref={dropRef} onClick={() => setDropOpen(v=>!v)}>
            <div className="nav-ava">{initials}</div>
            <span className="nav-ava-online" />

            {dropOpen && (
              <div className="nav-drop" onClick={e => e.stopPropagation()}>
                <div className="drop-head">
                  <div className="drop-name">{user?.firstName} {user?.lastName}</div>
                  <div className="drop-email">{user?.email}</div>
                </div>
                <Link href="/profile">
                  <button className="drop-item" onClick={() => setDropOpen(false)}>
                    <I p={ICONS.user} s={14} />Profile
                  </button>
                </Link>
                <Link href="/settings">
                  <button className="drop-item" onClick={() => setDropOpen(false)}>
                    <I p={ICONS.cog} s={14} />Settings
                  </button>
                </Link>
                <button className="drop-item" onClick={() => { toggleTheme(); setDropOpen(false); }}>
                  <I p={isDark ? ICONS.sun : ICONS.moon} s={14} />
                  {isDark ? "Light Mode" : "Dark Mode"}
                </button>
                {/* Logout — onSuccess in use-auth.tsx redirects to /auth via window.location */}
                <button
                  className="drop-item danger"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  <I p={ICONS.logout} s={14} />
                  {logoutMutation.isPending ? "Logging out…" : "Logout"}
                </button>
              </div>
            )}
          </div>

          {/* Hamburger */}
          <button
            className={`ham-btn${mobileOpen?" open":""}`}
            onClick={() => setMobileOpen(v=>!v)}
            aria-label="Menu"
          >
            <span className="ham-line"/><span className="ham-line"/><span className="ham-line"/>
          </button>
        </div>
      </nav>

      {/* ── MOBILE DRAWER ── */}
      <div className={`mob-sheet${mobileOpen?" open":""}`}>
        <div className="mob-overlay" onClick={() => setMobileOpen(false)} />
        <div className="mob-drawer">
          <div className="mob-head">
            <span className="nav-brand-name" style={{fontSize:16}}>GradeUp!</span>
            <button className="nav-icon-btn" onClick={() => setMobileOpen(false)}>
              <I p={ICONS.x} s={17} />
            </button>
          </div>
          <div className="mob-links">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className={`mob-link${isActive(l.href)?" active":""}`}
                onClick={() => setMobileOpen(false)}>
                <I p={ICONS[l.icon]} s={17} />{l.label}
              </Link>
            ))}
            <button className="mob-link" onClick={() => { toggleTheme(); setMobileOpen(false); }}>
              <I p={isDark ? ICONS.sun : ICONS.moon} s={17} />
              {isDark ? "Light Mode" : "Dark Mode"}
            </button>
            {showBack && (
              <button className="mob-link" onClick={() => { goBack(); setMobileOpen(false); }}>
                <I p={ICONS.arrowL} s={17} />← Back to {prevLabel}
              </button>
            )}
          </div>
          <div className="mob-foot">
            <div className="mob-user">
              <div className="mob-ava">{initials}</div>
              <div>
                <div className="mob-user-name">{user?.firstName} {user?.lastName}</div>
                <div className="mob-user-role">{currentRole}</div>
              </div>
            </div>
            <button
              className="mob-link"
              style={{color:"#ef4444"}}
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <I p={ICONS.logout} s={17} />
              {logoutMutation.isPending ? "Logging out…" : "Logout"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
