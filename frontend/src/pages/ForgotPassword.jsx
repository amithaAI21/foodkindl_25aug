import {
  ArrowLeft,
  ArrowRight,
  Check,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import api from "../api";

import "../styles/forgot_password.css";


export default function ForgotPassword() {

  const [
    email,
    setEmail,
  ] = useState("");


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


  // =========================================================
  // SUBMIT EMAIL
  // =========================================================

  async function submit(
    event
  ) {

    event.preventDefault();


    if (submitting) {
      return;
    }


    const normalizedEmail =
      email
        .trim()
        .toLowerCase();


    if (!normalizedEmail) {

      setError(
        "Enter your email address."
      );

      return;
    }


    try {

      setSubmitting(
        true
      );


      setError(
        ""
      );


      await api.post(
        "/auth/forgot-password/",
        {
          email:
            normalizedEmail,
        }
      );


      setSuccess(
        true
      );


    } catch (requestError) {

      console.error(
        "Forgot password error:",
        {
          status:
            requestError.response?.status,

          data:
            requestError.response?.data,

          url:
            requestError.config?.url,

          baseURL:
            requestError.config?.baseURL,
        }
      );


      setError(
        requestError.response?.data?.detail
        ||
        `Unable to send password reset email${
          requestError.response?.status
            ? ` (${requestError.response.status})`
            : ""
        }.`
      );


    } finally {

      setSubmitting(
        false
      );

    }

  }


  // =========================================================
  // PAGE
  // =========================================================

  return (

    <main className="forgot-password-page">


      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="forgot-password-glow" />


      {/* =====================================================
          TOP BAR
      ====================================================== */}

      <header className="forgot-password-topbar">

        <Link
          to="/login"
          className="forgot-password-back"
        >

          <ArrowLeft size={16} />

          Back to login

        </Link>

      </header>


      {/* =====================================================
          CONTENT
      ====================================================== */}

      <section className="forgot-password-shell">


        <div className="forgot-password-card">


          {/* =================================================
              ICON
          ================================================== */}

          <div className="forgot-password-icon">

            {
              success
                ? (
                  <Check size={25} />
                )
                : (
                  <Mail size={25} />
                )
            }

          </div>


          {/* =================================================
              EYEBROW
          ================================================== */}

          <span className="forgot-password-eyebrow">
            FOODKINDL ACCOUNT
          </span>


          {/* =================================================
              SUCCESS STATE
          ================================================== */}

          {
            success
              ? (
                <>

                  <h1>
                    Check your email.
                  </h1>


                  <p>
                    If a FoodKindl account exists
                    for{" "}

                    <strong>
                      {email}
                    </strong>

                    , we've sent a secure
                    password reset link.
                  </p>


                  <div className="forgot-password-security">

                    <ShieldCheck size={16} />

                    <span>
                      The reset link is temporary
                      and can only be used to
                      create a new password.
                    </span>

                  </div>


                  <Link
                    to="/login"
                    className="forgot-password-primary"
                  >

                    Return to login

                    <ArrowRight size={16} />

                  </Link>

                </>
              )

              : (

                /* =============================================
                   FORGOT PASSWORD FORM
                ============================================== */

                <>

                  <h1>
                    Forgot your password?
                  </h1>


                  <p>
                    Enter the email address
                    registered with your FoodKindl
                    account. We'll send you a secure
                    link to create a new password.
                  </p>


                  <form
                    onSubmit={
                      submit
                    }
                  >


                    {/* =========================================
                        EMAIL
                    ========================================== */}

                    <label>

                      Email address


                      <div className="forgot-password-input">

                        <Mail size={16} />


                        <input
                          type="email"
                          required
                          autoComplete="email"
                          value={
                            email
                          }
                          onChange={
                            event => {

                              setEmail(
                                event.target.value
                              );


                              if (error) {

                                setError(
                                  ""
                                );

                              }

                            }
                          }
                          placeholder="you@example.com"
                        />

                      </div>

                    </label>


                    {/* =========================================
                        ERROR
                    ========================================== */}

                    {
                      error &&
                      (

                        <div className="forgot-password-error">

                          {error}

                        </div>

                      )
                    }


                    {/* =========================================
                        SUBMIT
                    ========================================== */}

                    <button
                      type="submit"
                      className="forgot-password-primary"
                      disabled={
                        submitting
                      }
                    >

                      {
                        submitting
                          ? (
                            "Sending..."
                          )
                          : (
                            <>

                              Send reset link

                              <ArrowRight size={16} />

                            </>
                          )
                      }

                    </button>

                  </form>


                  {/* ===========================================
                      FUTURE PHONE RECOVERY
                  ============================================ */}

                  <div className="forgot-password-future">

                    <ShieldCheck size={14} />

                    <span>
                      Password recovery through
                      mobile number will be available
                      in a future update.
                    </span>

                  </div>

                </>

              )
          }

        </div>

      </section>

    </main>

  );
}