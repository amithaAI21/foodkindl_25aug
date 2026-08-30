import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  Footprints,
  MapPin,
  ShieldCheck,
  Sparkles,
  Store,
  Utensils,
  Users,
} from "lucide-react";

import {
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


const initialForm = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
};


const experiences = [
  {
    icon: Store,
    title: "Restaurant Presence",
    text:
      "Create and manage your restaurant or cafe presence on FoodKindl.",
  },

  {
    icon: Utensils,
    title: "Food Discovery",
    text:
      "Help FoodKindl members discover your restaurant and food experiences.",
  },

  {
    icon: Users,
    title: "Community",
    text:
      "Connect your restaurant with people discovering food and shared meals.",
  },
];


export default function RestaurantRegister() {

  const {
    register,
  } = useAuth();


  const navigate =
    useNavigate();


  const [
    form,
    setForm,
  ] = useState(
    initialForm
  );


  const [
    error,
    setError,
  ] = useState("");


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  /* =========================================================
     CHANGE
  ========================================================= */

  function handleChange(
    event
  ) {

    const {
      name,
      value,
    } = event.target;


    setForm(
      previousForm => ({
        ...previousForm,

        [name]:
          value,
      })
    );


    if (error) {
      setError("");
    }
  }


  /* =========================================================
     SUBMIT
  ========================================================= */

  async function submit(
    event
  ) {

    event.preventDefault();


    if (submitting) {
      return;
    }


    setError("");

    setSubmitting(
      true
    );


    /* =======================================================
       IMPORTANT

       Restaurant registration must ALWAYS send:
       account_type: "partner"
    ======================================================== */

    const payload = {

      first_name:
        form.first_name
          .trim(),

      last_name:
        form.last_name
          .trim(),

      email:
        form.email
          .trim()
          .toLowerCase(),

      password:
        form.password,

      account_type:
        "partner",
    };


    console.log(
      "Restaurant partner registration payload:",
      payload
    );


    try {

      await register(
        payload
      );


      /*
       * Registration completed.
       *
       * Partner should NOT go
       * to normal member dashboard.
       */

      navigate(
        "/partner/onboarding",
        {
          replace:
            true,
        }
      );


    } catch (err) {

      console.error(
        "Partner registration error:",
        err.response?.data ||
        err
      );


      const data =
        err.response?.data;


      let message =
        "Restaurant partner registration could not be completed. Please try again.";


      if (
        Array.isArray(
          data?.account_type
        )
        &&
        data.account_type.length > 0
      ) {

        message =
          data.account_type[0];

      } else if (
        typeof data?.account_type ===
        "string"
      ) {

        message =
          data.account_type;

      } else if (
        Array.isArray(
          data?.email
        )
        &&
        data.email.length > 0
      ) {

        message =
          data.email[0];

      } else if (
        typeof data?.email ===
        "string"
      ) {

        message =
          data.email;

      } else if (
        Array.isArray(
          data?.password
        )
        &&
        data.password.length > 0
      ) {

        message =
          data.password[0];

      } else if (
        typeof data?.password ===
        "string"
      ) {

        message =
          data.password;

      } else if (
        Array.isArray(
          data?.first_name
        )
        &&
        data.first_name.length > 0
      ) {

        message =
          data.first_name[0];

      } else if (
        Array.isArray(
          data?.last_name
        )
        &&
        data.last_name.length > 0
      ) {

        message =
          data.last_name[0];

      } else if (
        typeof data?.detail ===
        "string"
      ) {

        message =
          data.detail;
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


  /* =========================================================
     JSX
  ========================================================= */

  return (

    <main className="foodkindl-register-page">


      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div
        className="
          register-glow
          register-glow-one
        "
      />

      <div
        className="
          register-glow
          register-glow-two
        "
      />


      {/* =====================================================
          TOP BAR
      ====================================================== */}

      <header className="register-topbar">


        <Link
          to="/"
          className="register-brand"
        >

          <img
            src="/images/icon.png"
            alt="FoodKindl"
          />


          <div>

            <strong>
              FoodKindl
            </strong>

            <span>
              Meet through food
            </span>

          </div>

        </Link>


        <Link
          to="/register"
          className="register-back-link"
        >

          <ArrowLeft
            size={16}
          />

          Back to registration

        </Link>

      </header>


      {/* =====================================================
          MAIN
      ====================================================== */}

      <section className="register-shell">


        {/* ===================================================
            LEFT — PARTNER STORY
        ==================================================== */}

        <aside className="register-story-panel">


          <div className="register-story-content">


            <div className="register-story-pill">

              <Sparkles
                size={14}
              />

              FOODKINDL FOR RESTAURANTS

            </div>


            <h1>

              Bring your restaurant
              into the{" "}

              <span>
                FoodKindl community.
              </span>

            </h1>


            <p className="register-story-description">

              Create your FoodKindl partner
              account, add your restaurant
              details and connect with people
              discovering food experiences.

            </p>


            {/* ===============================================
                PARTNER CARD
            ================================================ */}

            <div className="register-live-card">


              <div className="register-live-card-top">

                <span>

                  <span className="live-dot" />

                  RESTAURANT PARTNER

                </span>


                <span>

                  <MapPin
                    size={12}
                  />

                  FoodKindl

                </span>

              </div>


              <div className="register-live-profile">


                <div className="register-live-avatar">

                  <Store
                    size={22}
                  />

                </div>


                <div>

                  <strong>
                    Your Restaurant
                  </strong>

                  <small>
                    FoodKindl Partner Account
                  </small>

                </div>


                <span className="register-verified">

                  <Check
                    size={11}
                  />

                  Partner

                </span>

              </div>


              <div className="register-live-invite">

                <ChefHat
                  size={20}
                />


                <div>

                  <span>
                    FOOD DISCOVERY
                  </span>

                  <strong>
                    Reach FoodKindl members
                  </strong>

                </div>

              </div>


              <div className="register-food-tags">

                <span>
                  Restaurant
                </span>

                <span>
                  Cafe
                </span>

                <span>
                  Food Experiences
                </span>

              </div>

            </div>


            {/* ===============================================
                EXPERIENCES
            ================================================ */}

            <div className="register-experience-grid">

              {
                experiences.map(
                  experience => {

                    const Icon =
                      experience.icon;


                    return (

                      <article
                        key={
                          experience.title
                        }
                      >

                        <span className="register-experience-icon">

                          <Icon
                            size={18}
                          />

                        </span>


                        <div>

                          <strong>
                            {
                              experience.title
                            }
                          </strong>

                          <p>
                            {
                              experience.text
                            }
                          </p>

                        </div>

                      </article>

                    );
                  }
                )
              }

            </div>


            {/* ===============================================
                TRUST
            ================================================ */}

            <div className="register-trust-row">


              <span>

                <ShieldCheck
                  size={15}
                />

                Partner verification

              </span>


              <span>

                <Utensils
                  size={15}
                />

                Food discovery

              </span>


              <span>

                <Users
                  size={15}
                />

                Community reach

              </span>

            </div>

          </div>

        </aside>


        {/* ===================================================
            RIGHT — FORM
        ==================================================== */}

        <section className="register-form-panel">


          <div className="register-form-card">


            {/* ===============================================
                HEADING
            ================================================ */}

            <div className="register-form-heading">


              <div className="register-form-icon">

                <Store
                  size={24}
                />

              </div>


              <div className="register-eyebrow">
                RESTAURANT PARTNER
              </div>


              <h2>
                Create partner account
              </h2>


              <p>
                Start by creating your
                FoodKindl restaurant partner
                login. You can add your
                restaurant details next.
              </p>

            </div>


            {/* ===============================================
                ACCOUNT TYPE
            ================================================ */}

            <div
              style={{
                marginBottom: "20px",
              }}
            >

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  border:
                    "1px solid rgba(255, 112, 67, 0.35)",
                  borderRadius: "14px",
                }}
              >

                <Store
                  size={18}
                />

                <div>

                  <strong>
                    Restaurant Partner
                  </strong>

                  <div
                    style={{
                      fontSize: "12px",
                      opacity: 0.7,
                      marginTop: "2px",
                    }}
                  >
                    Account type: Partner
                  </div>

                </div>


                <Check
                  size={17}
                  style={{
                    marginLeft: "auto",
                  }}
                />

              </div>

            </div>


            {/* ===============================================
                FORM
            ================================================ */}

            <form
              onSubmit={
                submit
              }
            >


              {/* NAME */}

              <div className="register-form-row">


                <label>

                  First name

                  <input
                    name="first_name"
                    type="text"
                    required
                    autoComplete="given-name"
                    value={
                      form.first_name
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="First name"
                  />

                </label>


                <label>

                  Last name

                  <input
                    name="last_name"
                    type="text"
                    required
                    autoComplete="family-name"
                    value={
                      form.last_name
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Last name"
                  />

                </label>

              </div>


              {/* EMAIL */}

              <label>

                Business email address

                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={
                    form.email
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="restaurant@example.com"
                />

              </label>


              {/* PASSWORD */}

              <label>

                Password

                <input
                  name="password"
                  type="password"
                  minLength={6}
                  required
                  autoComplete="new-password"
                  value={
                    form.password
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Minimum 6 characters"
                />

              </label>


              <div className="register-password-note">

                <Check
                  size={13}
                />

                Use at least 6 characters.

              </div>


              {/* ERROR */}

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


              {/* SUBMIT */}

              <button
                type="submit"
                className="register-submit-button"
                disabled={
                  submitting
                }
              >

                {
                  submitting
                    ? (
                      "Creating partner account..."
                    )
                    : (
                      <>

                        Create Partner Account

                        <ArrowRight
                          size={17}
                        />

                      </>
                    )
                }

              </button>

            </form>


            {/* ===============================================
                LOGIN
            ================================================ */}

            <div className="register-login">

              <span>
                Already have a FoodKindl account?
              </span>

              <Link to="/login">
                Login
              </Link>

            </div>


            {/* ===============================================
                LEGAL
            ================================================ */}

            <p className="register-legal">

              By creating an account,
              you agree to FoodKindl&apos;s{" "}

              <Link to="/terms">
                Terms of Use
              </Link>

              {" "}and{" "}

              <Link to="/privacy">
                Privacy Policy
              </Link>.

            </p>

          </div>

        </section>

      </section>

    </main>
  );
}