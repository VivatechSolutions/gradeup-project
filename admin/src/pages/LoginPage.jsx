import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function EyeIcon({ closed = false }) {
  return closed ? (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 10.7a2 2 0 102.8 2.8M9.9 5.1A10.9 10.9 0 0112 5c5.2 0 9.3 4.4 10 7-.3 1.2-1.4 3-3.1 4.5M6.3 6.4C4.2 7.8 2.7 10 2 12c.7 2.6 4.8 7 10 7 1.5 0 2.9-.3 4.2-.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await login(form);
      navigate(
        response?.data?.admin?.mustResetPassword ? "/reset-password" : "/",
        { replace: true },
      );
    } catch (submitError) {
      setError(submitError.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="auth-layout">
        <section className="auth-panel auth-hero-panel">
          <p className="eyebrow light">GradeUp Admin</p>
          <h1>Manage content, teams, and operations from one place.</h1>
          <p className="auth-hero-copy">
            The first super admin is seeded manually once. After that, admin access,
            subject uploads, and password recovery all flow through this panel.
          </p>
          <div className="feature-strip">
            <div className="feature-pill">Secure admin login</div>
            <div className="feature-pill">First-login password reset</div>
            <div className="feature-pill">Role-based access control</div>
          </div>
        </section>

        <section className="auth-panel login-card">
          <p className="eyebrow">Welcome Back</p>
          <h2>Sign in to GradeUp Admin</h2>
          <p className="muted">
            Use your admin account to continue. If this is your first login, you
            will be asked to reset your password before accessing the dashboard.
          </p>
          <form className="stack" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="name@gradeup.com"
                required
              />
            </label>
            <label>
              Password
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Password"
                  required
                />
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon closed={showPassword} />
                </button>
              </div>
            </label>
            {error ? <div className="error-banner">{error}</div> : null}
            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Login"}
            </button>
            <Link className="text-link" to="/forgot-password">
              Forgot password?
            </Link>
          </form>
        </section>
      </div>
    </div>
  );
}
