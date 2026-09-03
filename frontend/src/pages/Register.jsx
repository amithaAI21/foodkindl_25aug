import {
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import "../styles/register.css";


export default function Register() {

  const navigate =
    useNavigate();

  const {
    register,
  } = useAuth();


  const [
    form,
    setForm,
  ] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });


  const [
    showPassword,
    setShowPassword,
  ] = useState(false);


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState("");


  const canSubmit =
    useMemo(
      () => {

        return Boolean(
          form.first_name.trim()
          &&
          form.last_name.trim()
          &&
          form.email.trim()
          &&
          form.password.length >= 6
        );

      },
      [
        form,
      ]
    );


  function handleChange(
    event
  ) {

    const {
      name,
      value,
    } = event.target;


    setForm(
      previous => ({
        ...previous,
        [name]: value,
      })
    );


    if (error) {
      setError("");
    }
  }


  async function handleSubmit(
    event
  ) {

    event.preventDefault();


    if (loading) {
      return;
    }


    if (!canSubmit) {

      setError(
        "Please complete all required fields. Password must be at least 6 characters."
      );

      return;
    }


    setLoading(true);
    setError("");
    setSuccess("");


    const payload = {

      first_name:
        form.first_name.trim(),

      last_name:
        form.last_name.trim(),

      email:
        form.email
          .trim()
          .toLowerCase(),

      password:
        form.password,

      account_type:
        "member",
    };


    try {

      await register(
        payload
      );


      setSuccess(
        "Your FoodKindl account has been created."
      );


      navigate(
        "/login",
        {
          replace: true,

          state: {
            registered: true,
            accountType:
              "member",
          },
        }
      );


    } catch (
      requestError
    ) {

      console.error(
        "Registration failed:",
        requestError
      );


      const responseData =
        requestError
          ?.response
          ?.data;


      let message =
        "Unable to create your account. Please try again.";


      if (
        typeof responseData?.detail ===
        "string"
      ) {

        message =
          responseData.detail;

      } else if (
        Array.isArray(
          responseData?.email
        )
      ) {

        message =
          responseData.email[0];

      } else if (
        typeof responseData?.email ===
        "string"
      ) {

        message =
          responseData.email;

      } else if (
        Array.isArray(
          responseData?.password
        )
      ) {

        message =
          responseData.password[0];

      } else if (
        typeof responseData?.password ===
        "string"
      ) {

        message =
          responseData.password;
      }


      setError(
        message
      );


    } finally {

      setLoading(
        false
      );
    }
  }


  return (

    <main className="register-page">

      <section className="register-shell">


        {/* LEFT-SIDE STORY */}

        <aside className="register-story">

          <div className="register-story-content">

            <span className="register-story-pill">
              FOODKINDL CONNECT
            </span>


            <h1>
              Where food connects
              people.
            </h1>


            <p>
              Discover people nearby,
              connect over food, cook
              together, dine out and
              build real friendships.
            </p>


            <div className="register-story-points">

              <article>

                <span className="register-story-icon">
                  <Users size={18} />
                </span>

                <div>

                  <strong>
                    Meet through food
                  </strong>

                  <p>
                    Discover people,
                    Food Invites and
                    shared food experiences.
                  </p>

                </div>

              </article>


              <article>

                <span className="register-story-icon">
                  <ShieldCheck size={18} />
                </span>

                <div>

                  <strong>
                    Built with safety
                    in mind
                  </strong>

                  <p>
                    Profile controls,
                    verification and safer
                    connection features.
                  </p>

                </div>

              </article>

            </div>

          </div>

        </aside>


        {/* REGISTRATION FORM */}

        <section className="register-form-panel">

          <div className="register-form-card">


            <div className="register-form-header">

              <span className="register-eyebrow">
                CREATE YOUR ACCOUNT
              </span>

              <h2>
                Create your FoodKindl account
              </h2>

              <p>
                Meet people nearby and build real
                connections through food.
              </p>

            </div>


            <form
              onSubmit={
                handleSubmit
              }
            >

              <label>

                First name

                <input
                  type="text"
                  name="first_name"
                  value={
                    form.first_name
                  }
                  onChange={
                    handleChange
                  }
                  autoComplete="given-name"
                  required
                />

              </label>


              <label>

                Last name

                <input
                  type="text"
                  name="last_name"
                  value={
                    form.last_name
                  }
                  onChange={
                    handleChange
                  }
                  autoComplete="family-name"
                  required
                />

              </label>


              <label>

                Email

                <input
                  type="email"
                  name="email"
                  value={
                    form.email
                  }
                  onChange={
                    handleChange
                  }
                  autoComplete="email"
                  required
                />

              </label>


              <label>

                Password

                <div className="register-password-field">

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    value={
                      form.password
                    }
                    onChange={
                      handleChange
                    }
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />


                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        previous =>
                          !previous
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


              {
                error &&
                (
                  <div
                    className="register-error"
                    role="alert"
                  >
                    {error}
                  </div>
                )
              }


              {
                success &&
                (
                  <div
                    className="register-success"
                    role="status"
                  >
                    {success}
                  </div>
                )
              }


              <button
                type="submit"
                disabled={
                  loading ||
                  !canSubmit
                }
              >

                {
                  loading
                    ? "Creating account..."
                    : "Create FoodKindl Account"
                }

                {
                  !loading &&
                  (
                    <ArrowRight
                      size={17}
                    />
                  )
                }

              </button>

            </form>


            {/* SECONDARY RESTAURANT JOURNEY */}

            <div className="register-partner-link">

              <span>
                Own or manage a restaurant?
              </span>

              <Link to="/register/restaurant">

                Register as a Restaurant Partner

                <ArrowRight size={14} />

              </Link>

            </div>


            <div className="register-login-link">

              Already have an account?

              <Link to="/login">
                Log in
              </Link>

            </div>

          </div>

        </section>

      </section>

    </main>
  );
}