import {
  ArrowRight,
  Check,
  ChefHat,
  Eye,
  EyeOff,
  Footprints,
  Heart,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
  Utensils,
  Users,
} from "lucide-react";

import { useEffect, useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import api from "../api";

import "../styles/login.css";


export default function Login() {

  const {
    login,
  } = useAuth();

  const navigate =
    useNavigate();


  const [
    form,
    setForm,
  ] = useState({
    email: "",
    password: "",
  });


  const [
    error,
    setError,
  ] = useState("");


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    showPassword,
    setShowPassword,
  ] = useState(false);


  const [
    rememberMe,
    setRememberMe,
  ] = useState(false);


  // =========================================================
  // REMEMBER USER
  // =========================================================

  useEffect(() => {

    const rememberedEmail =
      localStorage.getItem(
        "foodkindl_remembered_email"
      );

    if (rememberedEmail) {

      setForm(
        previous => ({
          ...previous,
          email: rememberedEmail,
        })
      );

      setRememberMe(true);
    }

  }, []);


  // =========================================================
  // UPDATE FIELD
  // =========================================================

  function updateField(
    field,
    value
  ) {

    setForm(
      previous => ({
        ...previous,
        [field]: value,
      })
    );

    if (error) {
      setError("");
    }
  }


  // =========================================================
  // LOGIN
  // =========================================================

  async function submit(
    event
  ) {

    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");
    setSubmitting(true);

    try {

      // =====================================================
      // 1. LOGIN
      // =====================================================

      console.log(
        "1. Attempting login..."
      );

      await login(
        form.email
          .trim()
          .toLowerCase(),

        form.password
      );

      console.log(
        "2. Login successful."
      );


      if (rememberMe) {

        localStorage.setItem(
          "foodkindl_remembered_email",
          form.email
            .trim()
            .toLowerCase()
        );

      } else {

        localStorage.removeItem(
          "foodkindl_remembered_email"
        );
      }


      // =====================================================
      // 2. LOAD SESSION CONTEXT
      // =====================================================

      let session;

      try {

        const contextResponse =
          await api.get(
            "/auth/session-context/"
          );

        session =
          contextResponse?.data;

        console.log(
          "3. Session context:",
          session
        );

      } catch (sessionError) {

        console.error(
          "SESSION CONTEXT ERROR:",
          sessionError?.response?.status,
          sessionError?.response?.data,
          sessionError
        );

        const backendMessage =
          sessionError?.response?.data?.detail ||
          sessionError?.response?.data?.error ||
          sessionError?.response?.data?.message;

        setError(
          backendMessage ||
          (
            sessionError?.response?.status
              ? `Unable to load account information. Error ${sessionError.response.status}.`
              : "Unable to load account information."
          )
        );

        return;
      }


      // =====================================================
      // 3. SESSION CHECK
      // =====================================================

      if (!session) {

        setError(
          "FoodKindl could not load your account information."
        );

        return;
      }


      // =====================================================
      // 4. RESTAURANT PARTNER
      // =====================================================

      if (
        session?.account_type ===
        "partner"
      ) {

        console.log(
          "Restaurant Partner detected."
        );

        navigate(
          "/partner/dashboard",
          {
            replace: true,
          }
        );

        return;
      }


      // =====================================================
      // 5. NORMAL MEMBER
      // =====================================================

      console.log(
        "FoodKindl Member detected."
      );

      navigate(
        "/dashboard",
        {
          replace: true,
        }
      );


    } catch (loginError) {

      console.error(
        "LOGIN ERROR:",
        loginError?.response?.status,
        loginError?.response?.data,
        loginError
      );


      const data =
        loginError?.response?.data;


      let message =
        "Unable to log in to FoodKindl.";


      if (
        typeof data?.detail ===
        "string"
      ) {

        message =
          data.detail;

      } else if (
        typeof data?.error ===
        "string"
      ) {

        message =
          data.error;

      } else if (
        typeof data?.message ===
        "string"
      ) {

        message =
          data.message;

      } else if (
        Array.isArray(
          data?.non_field_errors
        ) &&
        data.non_field_errors.length > 0
      ) {

        message =
          data.non_field_errors[0];

      } else if (
        Array.isArray(
          data?.email
        ) &&
        data.email.length > 0
      ) {

        message =
          data.email[0];

      } else if (
        Array.isArray(
          data?.password
        ) &&
        data.password.length > 0
      ) {

        message =
          data.password[0];

      } else if (
        typeof data?.email ===
        "string"
      ) {

        message =
          data.email;

      } else if (
        typeof data?.password ===
        "string"
      ) {

        message =
          data.password;

      } else if (
        typeof data ===
        "string"
      ) {

        message =
          data;

      } else if (
        loginError?.message ===
        "Network Error"
      ) {

        message =
          "Unable to connect to the FoodKindl server.";

      } else if (
        typeof loginError?.message ===
        "string" &&
        loginError.message
      ) {

        message =
          loginError.message;
      }


      setError(
        message
      );


    } finally {

      setSubmitting(
        false
      );
    }
  }


  // =========================================================
  // UI
  // =========================================================

  return (

    <main className="foodkindl-login-page">


      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div
        className="
          login-background-glow
          login-background-glow-one
        "
      />

      <div
        className="
          login-background-glow
          login-background-glow-two
        "
      />


      {/* =====================================================
          MAIN LOGIN AREA
      ====================================================== */}

      <section className="login-shell">


        {/* ===================================================
            LEFT SIDE
        ==================================================== */}

        <aside className="login-community-panel">


          <div className="login-community-content">


            <div className="login-story-pill">

              <Sparkles
                size={14}
              />

              YOUR FOOD COMMUNITY IS WAITING

            </div>


            <h1>

              Welcome back to
              your{" "}

              <span>
                food community.
              </span>

            </h1>


            <p className="login-community-description">

              Continue conversations,
              discover nearby members,
              respond to Food Invites
              and create your next shared
              food experience.

            </p>


            {/* ===============================================
                LIVE COMMUNITY PREVIEW
            ================================================ */}

            {/* ===============================================
    FOODKINDL EXPERIENCE IMAGE
================================================ */}

<div className="login-community-image-card">

  <img
    src="/images/dynamic.webp"
    alt="People connecting over food with FoodKindl"
    loading="eager"
    decoding="async"
  />


</div>
          </div>

        </aside>


        {/* ===================================================
            RIGHT SIDE
        ==================================================== */}

        <section className="login-form-panel">


          <div className="login-form-card">


            {/* ===============================================
                HEADER
            ================================================ */}

            <div className="login-form-header">


              <div className="login-form-icon">

                <ChefHat
                  size={24}
                />

              </div>


              <div className="login-eyebrow">
                FOODKINDL CONNECT
              </div>


              <h2>
                Welcome back
              </h2>


              <p>
                Log in to continue discovering
                people, Food Invites and shared
                food experiences.
              </p>

            </div>


            {/* ===============================================
                FORM
            ================================================ */}

            <form
              onSubmit={
                submit
              }
            >


              {/* EMAIL */}

              <label>

                Email address

                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={
                    form.email
                  }
                  onChange={
                    event =>
                      updateField(
                        "email",
                        event.target.value
                      )
                  }
                  placeholder="you@example.com"
                />

              </label>


              {/* PASSWORD */}

              <label>

                Password

                <div className="login-password-field">

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    required
                    autoComplete="current-password"
                    value={
                      form.password
                    }
                    onChange={
                      event =>
                        updateField(
                          "password",
                          event.target.value
                        )
                    }
                    placeholder="Enter your password"
                  />


                  <button
                    type="button"
                    className="login-password-toggle"
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


              {/* FORGOT PASSWORD */}

              <div className="login-form-options">

                <label className="login-remember-option">
  <input
    type="checkbox"
    className="login-remember-checkbox"
    checked={rememberMe}
    onChange={(event) =>
      setRememberMe(event.target.checked)
    }
  />

  <span className="login-remember-text">
    Remember me
  </span>
</label>

                <Link
                  to="/forgot-password"
                >
                  Forgot password?
                </Link>

              </div>


              {/* ERROR */}

              {
                error &&
                (

                  <div
                    className="login-error"
                    role="alert"
                  >

                    {error}

                  </div>

                )
              }


              {/* SUBMIT */}

              <button
                type="submit"
                className="login-submit-button"
                disabled={
                  submitting
                }
              >

                {
                  submitting
                    ? (
                        "Logging in..."
                      )
                    : (
                        <>

                          Login to FoodKindl

                          <ArrowRight
                            size={17}
                          />

                        </>
                      )
                }

              </button>

            </form>


            {/* ===============================================
                REGISTER
            ================================================ */}

            <div className="login-register">


              <span>
                New to FoodKindl?
              </span>


              <Link
                to="/register"
              >
                Create an account
              </Link>

            </div>


            {/* ===============================================
                SECURITY FOOTER
            ================================================ */}

            <div className="login-security-note">

              <ShieldCheck
                size={13}
              />

              <span>
                Your account and personal information
                are protected using FoodKindl&apos;s
                security controls.
              </span>

            </div>

          </div>

        </section>

      </section>

    </main>
  );
}