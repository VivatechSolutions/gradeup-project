import { useMemo } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function ShellIcon({ name }) {
  const icons = {
    dashboard: "M3 13.2 12 4l9 9.2V20a1 1 0 0 1-1 1h-5.8v-5.5H9.8V21H4a1 1 0 0 1-1-1z",
    subjects: "M6 5.5A2.5 2.5 0 0 1 8.5 3H20v14H8.5A2.5 2.5 0 0 0 6 19.5zm0 0V21",
    upload: "M12 16V7m0 0 3.5 3.5M12 7 8.5 10.5M5 19h14",
    tracker: "M5 12.5 9.2 16.7 19 7m1 5.5a8 8 0 1 1-2.3-5.7",
    users: "M16.5 20v-1.2A3.8 3.8 0 0 0 12.7 15H8.8A3.8 3.8 0 0 0 5 18.8V20m15-8.3A2.9 2.9 0 1 1 17.1 8.8 2.9 2.9 0 0 1 20 11.7Zm-8-1A3.7 3.7 0 1 1 8.3 7 3.7 3.7 0 0 1 12 10.7Z",
    menu: "M4 7h16M4 12h16M4 17h16",
    close: "m6 6 12 12M18 6 6 18",
    logout: "M10 17 15 12 10 7M15 12H4m7-8h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7",
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={icons[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AppShell() {
  const { admin, logout } = useAuth();
  const location = useLocation();

  const navigationItems = useMemo(
    () =>
      [
        { to: "/", label: "Dashboard", icon: "dashboard" },
        { to: "/subjects", label: "Uploaded Units", icon: "subjects" },
        { to: "/subjects/upload", label: "Upload Subject", icon: "upload" },
        { to: "/processing-tracker", label: "Processing Tracker", icon: "tracker" },
        admin?.role === "super_admin"
          ? { to: "/admin-users", label: "Admin Users", icon: "users" }
          : null,
      ].filter(Boolean),
    [admin?.role],
  );

  const currentSection = useMemo(() => {
    const activeItem = navigationItems.find((item) =>
      item.to === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(item.to),
    );

    return activeItem?.label || "Admin Panel";
  }, [location.pathname, navigationItems]);

  return (
    <div className="admin-shell">
      <aside className="shell-sidebar">
        <div className="sidebar-inner">
          <div>
            <div className="shell-brand">
              <div className="brand-mark">HG</div>
              <div>
                <h1>GradeUp</h1>
              </div>
            </div>

            <nav className="shell-nav">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `shell-nav-link${isActive ? " active" : ""}`
                  }
                  end={item.to === "/"}
                >
                  <span className="shell-nav-icon">
                    <ShellIcon name={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="shell-user-card">
            <div className="shell-avatar">
              {(admin?.name || "A").slice(0, 1).toUpperCase()}
            </div>
            <div className="shell-user-copy">
              <strong>{admin?.name}</strong>
              <span>{admin?.email}</span>
              <span className="role-badge">
                {admin?.role === "super_admin" ? "Super Admin" : "Admin"}
              </span>
            </div>
            <button className="sidebar-logout" onClick={logout} type="button">
              <ShellIcon name="logout" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-main">
            <div>
              <p className="eyebrow">Workspace</p>
              <h2>{currentSection}</h2>
            </div>
          </div>

          <div className="topbar-meta">
            <div className="topbar-user">
              <span className="topbar-user-name">{admin?.name}</span>
              <span className="topbar-user-role">
                {admin?.role === "super_admin" ? "Super Admin" : "Admin"}
              </span>
            </div>
          </div>
        </header>

        <main className="main-panel">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
