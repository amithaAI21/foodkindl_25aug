import { ArrowRight, ChefHat, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import "../styles/login.css";

function errorMessage(err, fallback) {
  const data = err?.response?.data;
  for (const key of ["detail", "error", "message", "non_field_errors", "email", "password"]) {
    if (typeof data?.[key] === "string") return data[key];
    if (Array.isArray(data?.[key]) && data[key].length) return String(data[key][0]);
  }
  return err?.message === "Network Error"
    ? "Unable to connect to the FoodKindl server."
    : err?.message && !err?.response ? err.message : fallback;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const email = form.email.trim().toLowerCase();
  const verification = searchParams.get("verified");

  useEffect(() => {
    const saved = localStorage.getItem("foodkindl_remembered_email");
    if (saved) {
      setForm(previous => ({ ...previous, email: saved }));
      setRememberMe(true);
    }
  }, []);

  function updateField(field, value) {
    setForm(previous => ({ ...previous, [field]: value }));
    setError("");
  }

  async function finishLogin() {
    const response = await api.get("/auth/session-context/");
    if (!response.data) throw new Error("Account information unavailable.");

    if (rememberMe) localStorage.setItem("foodkindl_remembered_email", email);
    else localStorage.removeItem("foodkindl_remembered_email");

    navigate(response.data.account_type === "partner" ? "/partner/dashboard" : "/dashboard", { replace: true });
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    let loggedIn = authenticated;

    try {
      if (!loggedIn) {
        if (!email || !form.password) throw new Error("Enter your email and password.");
        await login(email, form.password);
        if (!localStorage.getItem("foodkindl_access")) {
          throw new Error("Login could not establish an authenticated session.");
        }
        loggedIn = true;
        setAuthenticated(true);
      }
      await finishLogin();
    } catch (err) {
      if (loggedIn && (err?.response?.status === 401 || err?.response?.status === 403)) {
        setAuthenticated(false);
        setError("Your session was rejected. Please log in again.");
      } else {
        setError(errorMessage(err, loggedIn
          ? "You are logged in, but account information could not be loaded. Click Continue to retry."
          : "Unable to log in. Check your details and try again."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="foodkindl-login-page">
      <div className="login-background-glow login-background-glow-one" />
      <div className="login-background-glow login-background-glow-two" />
      <section className="login-shell">
        <aside className="login-community-panel">
          <div className="login-community-content">
            <div className="login-story-pill"><Sparkles size={14} /> YOUR FOOD COMMUNITY IS WAITING</div>
            <h1>Welcome back to your <span>food community.</span></h1>
            <p className="login-community-description">
              Continue conversations, discover nearby members, respond to Food Invites
              and create your next shared food experience.
            </p>
            <div className="login-community-image-card">
              <img src="/images/dynamic.webp" alt="People connecting over food with FoodKindl" loading="eager" decoding="async" />
            </div>
          </div>
        </aside>

        <section className="login-form-panel">
          <div className="login-form-card">
            <div className="login-form-header">
              <div className="login-form-icon"><ChefHat size={24} /></div>
              <div className="login-eyebrow">FOODKINDL CONNECT</div>
              <h2>Welcome back</h2>
              <p>Log in to continue discovering people, Food Invites and shared food experiences.</p>
            </div>

            {verification === "1" && (
              <p role="status" style={{ marginBottom: 16 }}>
                Email verified successfully! Please log in to continue.
              </p>
            )}
            {verification === "0" && (
              <div className="login-error" role="alert" style={{ marginBottom: 16 }}>
                The verification link is invalid or expired. Please request a new link.
              </div>
            )}

            <form onSubmit={submit}>
              <label>Email address
                <input type="email" required autoComplete="email" value={form.email}
                  disabled={submitting || authenticated}
                  onChange={event => updateField("email", event.target.value)} placeholder="you@example.com" />
              </label>

              <label>Password
                <div className="login-password-field">
                  <input type={showPassword ? "text" : "password"} required={!authenticated}
                    disabled={submitting || authenticated} autoComplete="current-password" value={form.password}
                    onChange={event => updateField("password", event.target.value)} placeholder="Enter your password" />
                  <button type="button" className="login-password-toggle"
                    onClick={() => setShowPassword(current => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <div className="login-form-options">
                <label className="login-remember-option">
                  <input type="checkbox" className="login-remember-checkbox" checked={rememberMe}
                    disabled={submitting} onChange={event => setRememberMe(event.target.checked)} />
                  <span className="login-remember-text">Remember my email</span>
                </label>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>

              {error && <div className="login-error" role="alert">{error}</div>}

              <button type="submit" className="login-submit-button" disabled={submitting}>
                {submitting ? "Please wait..." : authenticated ? "Continue" : <>
                  Login to FoodKindl <ArrowRight size={17} />
                </>}
              </button>
            </form>

            <div className="login-register"><span>New to FoodKindl?</span><Link to="/register">Create an account</Link></div>
            <div className="login-security-note"><ShieldCheck size={13} /><span>Keep your password private.</span></div>
          </div>
        </section>
      </section>
    </main>
  );
}
