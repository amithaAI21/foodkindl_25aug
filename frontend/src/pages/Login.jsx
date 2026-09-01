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

import { useState } from "react";

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

            <div className="login-live-card">


              <div className="login-live-top">

                <span className="login-live-title">

                  <span className="login-live-dot" />

                  HAPPENING NEAR YOU

                </span>


                <span className="login-live-distance">

                  <MapPin
                    size={12}
                  />

                  Bengaluru

                </span>

              </div>


              {/* MEMBER */}

              <div className="login-member-preview">


                <div className="login-member-avatar">
                  LN
                </div>


                <div className="login-member-details">

                  <strong>
                    Lakshmi Nair
                  </strong>

                  <span>

                    Indiranagar

                    <em>
                      •
                    </em>

                    2.3 km away

                  </span>

                </div>


                <span className="login-verified">

                  <Check
                    size={11}
                  />

                  Verified

                </span>

              </div>


              {/* INVITE */}

              <div className="login-invite-preview">


                <div className="login-invite-icon">

                  <ChefHat
                    size={19}
                  />

                </div>


                <div>

                  <span>
                    COOK TOGETHER
                  </span>

                  <strong>
                    Kerala Sunday Lunch
                  </strong>

                  <small>
                    Sunday · 12:30 PM
                  </small>

                </div>


                <div className="login-seat-badge">
                  2 seats left
                </div>

              </div>


              <div className="login-food-tags">

                <span>
                  Kerala
                </span>

                <span>
                  Home Cooking
                </span>

                <span>
                  Weekend
                </span>

              </div>

            </div>


            {/* ===============================================
                MINI FEATURES
            ================================================ */}

            <div className="login-feature-grid">


              <article>

                <div className="login-feature-icon">

                  <Send
                    size={17}
                  />

                </div>


                <div>

                  <strong>
                    Food Invites
                  </strong>

                  <p>
                    Invite people to cook,
                    dine or explore food together.
                  </p>

                </div>

              </article>


              <article>

                <div className="login-feature-icon">

                  <Footprints
                    size={17}
                  />

                </div>


                <div>

                  <strong>
                    Food Walk
                  </strong>

                  <p>
                    Build routes with multiple
                    restaurant stops.
                  </p>

                </div>

              </article>


              <article>

                <div className="login-feature-icon">

                  <Heart
                    size={17}
                  />

                </div>


                <div>

                  <strong>
                    Community
                  </strong>

                  <p>
                    Share photos, videos,
                    recipes and food moments.
                  </p>

                </div>

              </article>

            </div>


            {/* ===============================================
                TRUST
            ================================================ */}

            <div className="login-trust-row">

              <span>

                <ShieldCheck
                  size={14}
                />

                Safety-first community

              </span>


              <span>

                <Users
                  size={14}
                />

                Real connections

              </span>


              <span>

                <Utensils
                  size={14}
                />

                Food-first experiences

              </span>

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

                <span>
                  Secure login
                </span>

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