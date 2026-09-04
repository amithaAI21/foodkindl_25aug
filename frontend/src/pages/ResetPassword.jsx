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


function getErrorMessage(data) {
  if (!data) {
    return "Unable to reset your password.";
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data.detail)) {
    return data.detail[0];
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  if (Array.isArray(data.password)) {
    return data.password[0];
  }

  if (typeof data.password === "string") {
    return data.password;
  }

  if (Array.isArray(data.confirm_password)) {
    return data.confirm_password[0];
  }

  if (typeof data.confirm_password === "string") {
    return data.confirm_password;
  }

  if (Array.isArray(data.token)) {
    return data.token[0];
  }

  if (typeof data.token === "string") {
    return data.token;
  }

  if (Array.isArray(data.uid)) {
    return data.uid[0];
  }

  if (typeof data.uid === "string") {
    return data.uid;
  }

  return "Password reset link is invalid or has expired.";
}


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
    showConfirmPassword,
    setShowConfirmPassword,
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


  const passwordValid = useMemo(
    () => password.length >= 8,
    [password]
  );


  async function submit(event) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");

    if (!uid || !token) {
      setError(
        "Password reset link is invalid. Please request a new reset link."
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

    if (!confirmPassword) {
      setError(
        "Confirm your new password."
      );

      return;
    }

    if (
      password !==
      confirmPassword
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
          password,
          confirm_password:
            confirmPassword,
        }
      );

      setSuccess(true);

      setPassword("");
      setConfirmPassword("");

    } catch (requestError) {
      console.error(
        "Password reset error:",
        requestError.response?.data ||
        requestError
      );

      setError(
        getErrorMessage(
          requestError.response?.data
        )
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

          <span className="reset-password-eyebrow">
            FOODKINDL ACCOUNT
          </span>

          <h1>
            Password updated
          </h1>

          <p>
            Your FoodKindl password
            has been changed successfully.
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

          <LockKeyhole
            size={28}
          />

        </div>

        <span className="reset-password-eyebrow">
          FOODKINDL ACCOUNT
        </span>

        <h1>
          Create a new password
        </h1>

        <p>
          Choose a new password
          for your FoodKindl account.
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
                minLength={8}
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    current =>
                      !current
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {
                  showPassword
                    ? (
                        <EyeOff
                          size={17}
                        />
                      )
                    : (
                        <Eye
                          size={17}
                        />
                      )
                }
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
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
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
                minLength={8}
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    current =>
                      !current
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {
                  showConfirmPassword
                    ? (
                        <EyeOff
                          size={17}
                        />
                      )
                    : (
                        <Eye
                          size={17}
                        />
                      )
                }
              </button>

            </div>
          </label>


          <div className="reset-password-password-note">
            Password must be at least
            8 characters.
          </div>


          {
            error &&
            (
              <div
                className="reset-password-error"
                role="alert"
              >
                {error}
              </div>
            )
          }


          <button
            type="submit"
            className="reset-password-primary"
            disabled={submitting}
          >
            {
              submitting
                ? "Updating password..."
                : "Save new password"
            }
          </button>

        </form>

      </section>

    </main>
  );
}