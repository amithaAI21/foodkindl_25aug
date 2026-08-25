import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import api from "../api";

import "../styles/forgot_password.css";


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


  async function submit(
    event
  ) {

    event.preventDefault();


    setError(
      ""
    );


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

      setSubmitting(
        true
      );


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


      setSuccess(
        true
      );


    } catch (requestError) {

      console.error(
        "Reset password error:",
        requestError.response?.data ||
        requestError
      );


      const data =
        requestError
          ?.response
          ?.data;


      setError(
        data?.detail
        ||
        data?.password?.[0]
        ||
        data?.confirm_password?.[0]
        ||
        "Unable to reset password."
      );


    } finally {

      setSubmitting(
        false
      );

    }
  }


  return (

    <main className="forgot-password-page">

      <div className="forgot-password-glow" />


      <section className="forgot-password-shell">


        <div className="forgot-password-card">


          <div className="forgot-password-icon">

            {
              success
                ? (
                  <Check size={25} />
                )
                : (
                  <LockKeyhole size={25} />
                )
            }

          </div>


          {
            success
              ? (
                <>

                  <span className="forgot-password-eyebrow">
                    PASSWORD UPDATED
                  </span>


                  <h1>
                    You're ready to return.
                  </h1>


                  <p>
                    Your FoodKindl password has
                    been changed successfully.
                  </p>


                  <Link
                    to="/login"
                    className="forgot-password-primary"
                  >

                    Login to FoodKindl

                    <ArrowRight size={16} />

                  </Link>

                </>
              )
              : (
                <>

                  <span className="forgot-password-eyebrow">
                    CREATE NEW PASSWORD
                  </span>


                  <h1>
                    Reset your password.
                  </h1>


                  <p>
                    Choose a strong new password
                    for your FoodKindl account.
                  </p>


                  <form
                    onSubmit={
                      submit
                    }
                  >


                    <label>

                      New password

                      <div className="forgot-password-input">

                        <LockKeyhole size={16} />

                        <input
                          type={
                            showPassword
                              ? "text"
                              : "password"
                          }
                          required
                          minLength={8}
                          autoComplete="new-password"
                          value={
                            password
                          }
                          onChange={
                            event =>
                              setPassword(
                                event.target.value
                              )
                          }
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
                                <EyeOff size={16} />
                              )
                              : (
                                <Eye size={16} />
                              )
                          }

                        </button>

                      </div>

                    </label>


                    <label>

                      Confirm new password

                      <div className="forgot-password-input">

                        <LockKeyhole size={16} />

                        <input
                          type={
                            showPassword
                              ? "text"
                              : "password"
                          }
                          required
                          minLength={8}
                          autoComplete="new-password"
                          value={
                            confirmPassword
                          }
                          onChange={
                            event =>
                              setConfirmPassword(
                                event.target.value
                              )
                          }
                        />

                      </div>

                    </label>


                    {
                      error &&
                      (

                        <div className="forgot-password-error">

                          {error}

                        </div>

                      )
                    }


                    <button
                      type="submit"
                      className="forgot-password-primary"
                      disabled={
                        submitting
                      }
                    >

                      {
                        submitting
                          ? "Updating..."
                          : (
                            <>

                              Reset password

                              <ArrowRight size={16} />

                            </>
                          )
                      }

                    </button>

                  </form>

                </>
              )
          }

        </div>

      </section>

    </main>

  );
}