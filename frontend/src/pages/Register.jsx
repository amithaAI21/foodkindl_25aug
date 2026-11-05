
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import "../styles/register.css";

function getError(error, fallback) {
  const data = error?.response?.data;

  for (const key of [
    "detail",
    "full_name",
    "first_name",
    "phone_number",
    "email",
    "password",
    "confirm_password",
    "non_field_errors",
  ]) {
    const value = data?.[key];

    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value) && value.length) {
      return String(value[0]);
    }
  }

  if (error?.message === "Network Error") {
    return "Unable to connect to the FoodKindl server.";
  }

  return error?.message && !error?.response
    ? error.message
    : fallback;
}

export default function Register() {
  const { register } = useAuth();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    password: "",
    confirm_password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [accountCreated, setAccountCreated] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendFeedback, setResendFeedback] = useState("");

  const busy = useRef(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        name === "phone_number"
          ? value.replace(/\D/g, "").slice(0, 10)
          : value,
    }));

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy.current || accountCreated) return;

    const fullName = form.full_name
      .trim()
      .replace(/\s+/g, " ");

    const email = form.email.trim().toLowerCase();
    const phone = form.phone_number.trim();

    if (
      !fullName ||
      !email ||
      !phone ||
      !form.password ||
      !form.confirm_password
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (fullName.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      setError("Enter a valid Indian 10-digit phone number.");
      return;
    }

    if (form.password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    busy.current = true;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await register({
        full_name: fullName,
        email,
        phone_number: phone,
        password: form.password,
        account_type: "member",
      });

      setAccountCreated(true);

      if (result?.email_sent === false) {
        setError(
          result.detail ||
            "Your account was created, but the verification email could not be sent."
        );
      } else if (result?.email_sent === true) {
        setMessage(
          "Verification email sent. Open the email and click the verification link before logging in."
        );
      } else {
        setMessage(
          "Your account was created successfully. Check your inbox and spam folder for the verification email."
        );
      }

      setForm((previous) => ({
        ...previous,
        full_name: fullName,
        email,
        password: "",
        confirm_password: "",
      }));
    } catch (err) {
      setError(
        getError(
          err,
          "Unable to register. Please try again."
        )
      );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  async function resendVerification() {
    const email = form.email.trim().toLowerCase();

    if (!accountCreated || !email || resending) return;

    setResending(true);
    setResendFeedback("");

    try {
      await api.post("/auth/email/verification/resend/", {
        email,
      });

      setResendFeedback(
        "If this account is awaiting verification, a new link will be sent. Check Inbox and Spam."
      );
    } catch (err) {
      setResendFeedback(
        getError(
          err,
          "Unable to request a new link. Please try again shortly."
        )
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="register-page">
      <section className="register-shell">
        {/* LEFT SIDE */}
        <aside className="register-story">
          <div className="register-story-content">
            <span className="register-story-pill">
              FOODKINDL CONNECT
            </span>

            <h1>Meet people through food.</h1>

            <p>
              Discover people nearby, cook together,
              dine out and build real friendships
              through shared food experiences.
            </p>

            <div className="register-story-points">
              <article>
                <span className="register-story-icon">
                  <Users size={18} aria-hidden="true" />
                </span>

                <div>
                  <strong>Meet through food</strong>
                  <p>
                    Discover people, Food Invites,
                    Cook Together, Dine Out and Food Walks.
                  </p>
                </div>
              </article>

              <article>
                <span className="register-story-icon">
                  <Mail size={18} aria-hidden="true" />
                </span>

                <div>
                  <strong>Connect with confidence</strong>
                  <p>
                    Create your account, verify your email,
                    and start connecting through FoodKindl.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </aside>

        {/* RIGHT SIDE */}
        <section className="register-form-panel">
          <div className="register-form-card">
            <div className="register-form-header">
              <span className="register-eyebrow">
                {accountCreated
                  ? "ACCOUNT CREATED"
                  : "CREATE YOUR ACCOUNT"}
              </span>

              <h2>
                {accountCreated
                  ? "Welcome to FoodKindl!"
                  : "Create your FoodKindl account"}
              </h2>

              <p>
                Meet people nearby and build real
                connections through food.
              </p>
            </div>

            {accountCreated ? (
              /* SUCCESS SCREEN */
              <div>
                <div className="register-success">
                  <p>
                    Welcome, {form.full_name}! Your account
                    was created using{" "}
                    <strong>{form.email}</strong>.
                  </p>

                  {message && (
                    <p role="status">{message}</p>
                  )}
                </div>

                {error && (
                  <div className="register-error" role="alert">
                    {error}
                  </div>
                )}

                <div
                  className="register-success"
                  style={{ marginTop: 14 }}
                >
                  <p>
                    Check Inbox, Spam or Promotions.
                    Verification links expire after 24 hours.
                  </p>

                  <button
                    type="button"
                    onClick={resendVerification}
                    disabled={resending}
                    style={{
                      marginTop: 12,
                      padding: "10px 16px",
                      cursor: resending
                        ? "wait"
                        : "pointer",
                    }}
                  >
                    {resending
                      ? "Requesting another link…"
                      : "Resend verification email"}
                  </button>

                  {resendFeedback && (
                    <p
                      role="status"
                      style={{ marginTop: 10 }}
                    >
                      {resendFeedback}
                    </p>
                  )}
                </div>

                <div className="register-login-link">
                  <Link to="/login">
                    Go to login
                    <ArrowRight
                      size={17}
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </div>
            ) : (
              /* REGISTRATION FORM */
              <form onSubmit={handleSubmit}>
                <label htmlFor="register-full-name">
                  Full name
                  <input
                    id="register-full-name"
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    autoComplete="name"
                    placeholder="Enter your full name"
                    minLength={2}
                    maxLength={150}
                    required
                    disabled={loading}
                  />
                </label>

                <label htmlFor="register-email">
                  Email address
                  <input
                    id="register-email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                    placeholder="Enter your email address"
                    required
                    disabled={loading}
                  />
                </label>

                <label htmlFor="register-phone-number">
                  Phone number (+91)
                  <input
                    id="register-phone-number"
                    type="tel"
                    name="phone_number"
                    value={form.phone_number}
                    onChange={handleChange}
                    autoComplete="tel-national"
                    inputMode="numeric"
                    pattern="[6-9][0-9]{9}"
                    maxLength={10}
                    placeholder="Enter your 10-digit phone number"
                    aria-describedby="register-phone-help"
                    required
                    disabled={loading}
                  />

                  <small id="register-phone-help">
                    Use your active mobile number.
                    Keep this number up to date
                    for your member account.
                  </small>
                </label>

                <label htmlFor="register-password">
                  Password

                  <div className="register-password-field">
                    <input
                      id="register-password"
                      type={
                        showPassword ? "text" : "password"
                      }
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      placeholder="Create a password"
                      minLength={8}
                      required
                      disabled={loading}
                    />

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        setShowPassword((previous) => !previous)
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>

                  <small>Use at least 8 characters.</small>
                </label>

                <label htmlFor="register-confirm-password">
                  Confirm password

                  <div className="register-password-field">
                    <input
                      id="register-confirm-password"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      name="confirm_password"
                      value={form.confirm_password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      minLength={8}
                      required
                      disabled={loading}
                    />

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        setShowConfirmPassword(
                          (previous) => !previous
                        )
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirmation password"
                          : "Show confirmation password"
                      }
                      aria-pressed={showConfirmPassword}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </label>

                {error && (
                  <div
                    className="register-error"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}>
                  {loading
                    ? "Creating account..."
                    : "Create FoodKindl Account"}

                  {!loading && (
                    <ArrowRight
                      size={17}
                      aria-hidden="true"
                    />
                  )}
                </button>
              </form>
            )}

            {/* RESTAURANT PARTNER */}
            <div className="register-partner-link">
              <span>Own or manage a restaurant?</span>

              <Link to="/register/restaurant">
                Register as a Restaurant Partner
                <ArrowRight
                  size={14}
                  aria-hidden="true"
                />
              </Link>
            </div>

            {/* LOGIN LINK */}
            <div className="register-login-link">
              Already have an account?{" "}
              <Link to="/login">Log in</Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
