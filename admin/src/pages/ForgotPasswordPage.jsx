import { useState } from "react";
import { Link } from "react-router-dom";
import { requestAdminPasswordReset } from "../api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await requestAdminPasswordReset({ email });
      setSuccess(response.message);
    } catch (submitError) {
      setError(submitError.message || "Unable to request password reset");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="auth-layout single-column">
        <section className="auth-panel login-card">
          <p className="eyebrow">Password Help</p>
          <h2>Forgot your password?</h2>
          <p className="muted">
            Enter your admin email and we’ll send a reset link if the account exists.
          </p>

          <form className="stack" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@gradeup.com"
                required
              />
            </label>

            {error ? <div className="error-banner">{error}</div> : null}
            {success ? <div className="success-banner">{success}</div> : null}

            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send reset link"}
            </button>
            <Link className="text-link" to="/login">
              Back to login
            </Link>
          </form>
        </section>
      </div>
    </div>
  );
}
