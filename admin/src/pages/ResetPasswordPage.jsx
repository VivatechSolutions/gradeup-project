import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetAdminPassword, verifyAdminResetToken } from "../api/client";
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

export default function ResetPasswordPage() {
  const { admin, updatePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const isFirstLoginReset = Boolean(admin?.mustResetPassword && !token);

  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(Boolean(token));
  const [isTokenValid, setIsTokenValid] = useState(!token);
  const [verifiedEmail, setVerifiedEmail] = useState("");

  useEffect(() => {
    let active = true;

    async function verifyToken() {
      if (!token) {
        return;
      }

      try {
        const response = await verifyAdminResetToken(token);
        if (active) {
          setIsTokenValid(true);
          setVerifiedEmail(response.data?.email || "");
        }
      } catch (verifyError) {
        if (active) {
          setIsTokenValid(false);
          setError(verifyError.message || "Reset link is invalid or expired");
        }
      } finally {
        if (active) {
          setIsVerifying(false);
        }
      }
    }

    verifyToken();

    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (form.newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters");
      }
      if (form.newPassword !== form.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (isFirstLoginReset) {
        await updatePassword({
          newPassword: form.newPassword,
        });
        setSuccess("Password updated successfully");
        navigate("/", { replace: true });
        return;
      }

      await resetAdminPassword({
        token,
        newPassword: form.newPassword,
      });
      setSuccess("Password reset successfully");
      window.setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (submitError) {
      setError(submitError.message || "Unable to reset password");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isVerifying) {
    return <div className="screen-center">Verifying reset link...</div>;
  }

  if (!isFirstLoginReset && !isTokenValid) {
    return (
      <div className="login-page">
        <div className="auth-layout single-column">
          <section className="auth-panel login-card">
            <p className="eyebrow">Reset Password</p>
            <h2>Link expired</h2>
            <p className="muted">
              This password reset link is invalid or has expired.
            </p>
            {error ? <div className="error-banner">{error}</div> : null}
            <Link className="primary-btn text-btn" to="/forgot-password">
              Request a new link
            </Link>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="auth-layout single-column">
        <section className="auth-panel login-card">
          <p className="eyebrow">Reset Password</p>
          <h2>{isFirstLoginReset ? "Create your new password" : "Choose a new password"}</h2>
          <p className="muted">
            {isFirstLoginReset
              ? "For security, you need to reset your temporary password before accessing the admin panel."
              : `Reset password for ${verifiedEmail || "your account"}.`}
          </p>

          <form className="stack" onSubmit={handleSubmit}>
            <label>
              New password
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.newPassword}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                  placeholder="New password"
                  required
                />
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  <EyeIcon closed={showPassword} />
                </button>
              </div>
            </label>

            <label>
              Confirm new password
              <div className="password-field">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  placeholder="Confirm new password"
                  required
                />
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => setShowConfirm((current) => !current)}
                >
                  <EyeIcon closed={showConfirm} />
                </button>
              </div>
            </label>

            {error ? <div className="error-banner">{error}</div> : null}
            {success ? <div className="success-banner">{success}</div> : null}

            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Reset password"}
            </button>

            {isFirstLoginReset ? (
              <button className="ghost-btn" type="button" onClick={logout}>
                Sign out
              </button>
            ) : (
              <Link className="text-link" to="/login">
                Back to login
              </Link>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}
