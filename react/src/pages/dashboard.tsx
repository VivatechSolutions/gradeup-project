import { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import Navigation from "../components/navigation";
import Sidebar from "../components/sidebar";
import StudentDashboard from "../components/student-dashboard";
import TeacherDashboard from "../components/teacher-dashboard";

type Role = "student" | "teacher";

// ─── Global theme CSS variables ──────────────────────────────────────────────
// These sit on <html data-theme="dark|light"> — the navigation.tsx already
// sets that attribute via applyTheme(). Everything here just reads from it.
const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* ── Theme variables ── */
:root,
[data-theme="light"] {
  --bg-app:      #f8fafc;
  --bg-surface:  #ffffff;
  --bg-muted:    #f1f5f9;
  --text-main:   #0f172a;
  --text-muted:  #64748b;
  --text-subtle: #94a3b8;
  --border:      rgba(0,0,0,.07);
  --accent:      #6366f1;
  --scrollbar:   #c7d2fe;
  --scrollbar-h: #a5b4fc;
}

.dark {
  --bg-app:      #0f172a;
  --bg-surface:  #1e293b;
  --bg-muted:    #1e293b;
  --text-main:   #f1f5f9;
  --text-muted:  #94a3b8;
  --text-subtle: #64748b;
  --border:      rgba(255,255,255,.08);
  --accent:      #818cf8;
  --scrollbar:   #334155;
  --scrollbar-h: #475569;
}

/* ── Base reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  /* background on html so the very first paint is themed */
  background: var(--bg-app);
  color: var(--text-main);
  transition: background .3s, color .3s;
}

body, #root {
  height: 100%;
  background: var(--bg-app);
  color: var(--text-main);
  transition: background .3s, color .3s;
}

/* ── Scrollbars (themed) ── */
::-webkit-scrollbar       { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-h); }

/* ── Layout shell ── */
.dash-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-app);
  color: var(--text-main);
  transition: background .3s, color .3s;
}

.dash-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.dash-main {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-app);   /* ← uses variable, not hardcoded */
  scroll-behavior: smooth;
  transition: background .3s;
}

/* ── Page entrance animation ── */
.dash-page {
  animation: pageIn .32s cubic-bezier(.4,0,.2,1) both;
  min-height: 100%;
}
@keyframes pageIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Mobile sidebar backdrop ── */
.dash-overlay {
  display: none;
  position: fixed; inset: 0; z-index: 140;
  background: rgba(15,23,42,.45);
  backdrop-filter: blur(3px);
  animation: fadeIn .2s;
}
@keyframes fadeIn { from{opacity:0} to{opacity:1} }

/* ── Mobile FAB ── */
.dash-fab {
  display: none;
  position: fixed; bottom: 24px; right: 24px; z-index: 160;
  width: 52px; height: 52px; border-radius: 50%;
  background: linear-gradient(135deg,#6366f1,#8b5cf6);
  border: none; cursor: pointer;
  box-shadow: 0 8px 28px rgba(99,102,241,.55);
  align-items: center; justify-content: center;
  transition: all .2s;
  animation: fabPop .4s cubic-bezier(.34,1.56,.64,1) .5s both;
}
@keyframes fabPop { from{opacity:0;transform:scale(0)} to{opacity:1;transform:scale(1)} }
.dash-fab:hover { transform: scale(1.1) rotate(8deg); }
.dash-fab svg { width: 22px; height: 22px; color: #fff; }

@media (max-width: 768px) {
  .dash-overlay { display: block; }
  .dash-fab     { display: flex; }
}

/* ── Patch Tailwind dark utilities that child components may use ── */
.dark .dark\\:bg-gray-900  { background-color: var(--bg-surface) !important; }
.dark .dark\\:bg-gray-800  { background-color: var(--bg-muted)   !important; }
.dark .dark\\:text-white   { color: var(--text-main)             !important; }
.dark .dark\\:text-gray-300{ color: var(--text-muted)            !important; }
.dark .dark\\:border-gray-700 { border-color: var(--border)      !important; }
.dark .dark\\:border-gray-800 { border-color: var(--border)      !important; }

/* Common light-mode patches for child dashboards that hardcode bg-white */
.dark .bg-white          { background-color: var(--bg-surface) !important; }
.dark .bg-gray-50        { background-color: var(--bg-app)     !important; }
.dark .bg-gray-100       { background-color: var(--bg-muted)   !important; }
.dark .text-gray-900     { color: var(--text-main)             !important; }
.dark .text-gray-700     { color: var(--text-muted)            !important; }
.dark .text-gray-600     { color: var(--text-muted)            !important; }
.dark .text-gray-500     { color: var(--text-subtle)           !important; }
.dark .border-gray-200   { border-color: var(--border)         !important; }
.dark .border-gray-100   { border-color: var(--border)         !important; }
.dark .shadow-sm         { box-shadow: 0 1px 3px rgba(0,0,0,.4) !important; }
.dark .shadow            { box-shadow: 0 2px 8px rgba(0,0,0,.45) !important; }
.dark .shadow-md         { box-shadow: 0 4px 16px rgba(0,0,0,.5) !important; }
`;

const MenuSvg = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h18M3 6h18M3 18h18" />
  </svg>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [currentRole, setCurrentRole]             = useState<Role>("student");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pageKey, setPageKey]                     = useState(0);

  useEffect(() => {
    if (user?.role === "student" || user?.role === "teacher") {
      setCurrentRole(user.role as Role);
    }
  }, [user]);

  const handleRoleChange = (newRole: Role) => {
    setCurrentRole(newRole);
    setPageKey(k => k + 1);
    setMobileSidebarOpen(false);
  };

  if (!user) return null;

  return (
    <>
      <style>{css}</style>
      <div className="dash-layout">

        <Navigation currentRole={currentRole} onRoleChange={handleRoleChange} />

        <div className="dash-body">
          <Sidebar
            currentRole={currentRole}
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />

          {mobileSidebarOpen && (
            <div className="dash-overlay" onClick={() => setMobileSidebarOpen(false)} />
          )}

          <main className="dash-main">
            <div className="dash-page" key={pageKey}>
              {currentRole === "student"
                ? <StudentDashboard onStartQuiz={() => {}} />
                : <TeacherDashboard />
              }
            </div>
          </main>
        </div>

        <button
          className="dash-fab"
          onClick={() => setMobileSidebarOpen(v => !v)}
          aria-label="Toggle sidebar"
        >
          <MenuSvg />
        </button>
      </div>
    </>
  );
}