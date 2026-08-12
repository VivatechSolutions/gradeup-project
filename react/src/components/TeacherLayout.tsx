import { useState, ReactNode } from "react";
import Navigation from "./navigation";
import Sidebar from "./sidebar";

const css = `
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
  background: var(--bg-app);
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
`;

const MenuSvg = () => (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );

interface TeacherLayoutProps {
    children: ReactNode;
    showSidebar?: boolean;
  }

export default function TeacherLayout({ children, showSidebar = true }: TeacherLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <>
      <style>{css}</style>
      <div className="dash-layout">
        <Navigation currentRole="teacher" />
        <div className="dash-body">
          {showSidebar && <Sidebar
            currentRole="teacher"
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />}
          {showSidebar && mobileSidebarOpen && (
            <div className="dash-overlay" onClick={() => setMobileSidebarOpen(false)} />
          )}
          <main className="dash-main">
            <div className="dash-page">
              {children}
            </div>
          </main>
        </div>
        {showSidebar && <button
          className="dash-fab"
          onClick={() => setMobileSidebarOpen(v => !v)}
          aria-label="Toggle sidebar"
        >
          <MenuSvg />
        </button>}
      </div>
    </>
  );
}
