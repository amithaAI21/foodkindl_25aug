import {
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import api from "../api";

export default function ResetPassword() {
  const {
    uid,
    token,
  } = useParams();

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState(false);

  const passwordValid =
    useMemo(() => {
      return (
        password.length >= 8
      );
    }, [password]);

  async function submit(event) {
    event.preventDefault();

    setError("");

    if (!uid || !token) {
      setError(
        "Password reset link is invalid."
      );
      return;
    }

    if (!password) {
      setError(
        "Enter your new password."
      );
      return;
    }

    if (!passwordValid) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (
      password !== confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    try {
      setSubmitting(true);

      await api.post(
        "/auth/reset-password/",
        {
          uid,
          token,
          new_password: password,
        }
      );

      setSuccess(true);
    } catch (requestError) {
      console.error(
        "Password reset error:",
        requestError.response?.data
      );

      const data =
        requestError.response?.data;

      setError(
        data?.detail ||
        data?.message ||
        data?.token?.[0] ||
        data?.new_password?.[0] ||
        "Password reset link is invalid or has expired."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="reset-password-page">
        <section className="reset-password-card">
          <div className="reset-password-success">
            ✓
          </div>

          <h1>
            Password updated
          </h1>

          <p>
            Your FoodKindl password
            has been changed
            successfully.
          </p>

          <Link
            to="/login"
            className="reset-password-primary"
          >
            Continue to login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="reset-password-page">
      <section className="reset-password-card">

        <div className="reset-password-icon">
          <LockKeyhole size={28} />
        </div>

        <span className="reset-password-eyebrow">
          FOODKINDL ACCOUNT
        </span>

        <h1>
          Create a new password
        </h1>

        <p>
          Choose a new password for
          your FoodKindl account.
        </p>

        <form onSubmit={submit}>

          <label>
            New password

            <div className="reset-password-input">
              <LockKeyhole
                size={17}
              />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) => {
                  setPassword(
                    event.target.value
                  );

                  if (error) {
                    setError("");
                  }
                }}
                autoComplete="new-password"
                placeholder="Enter new password"
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>
            </div>
          </label>

          <label>
            Confirm new password

            <div className="reset-password-input">
              <LockKeyhole
                size={17}
              />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  confirmPassword
                }
                onChange={(event) => {
                  setConfirmPassword(
                    event.target.value
                  );

                  if (error) {
                    setError("");
                  }
                }}
                autoComplete="new-password"
                placeholder="Confirm new password"
                required
              />
            </div>
          </label>

          {error && (
            <div className="reset-password-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="reset-password-primary"
            disabled={submitting}
          >
            {submitting
              ? "Updating password..."
              : "Save new password"}
          </button>
        </form>
      </section>
    </main>
  );
}