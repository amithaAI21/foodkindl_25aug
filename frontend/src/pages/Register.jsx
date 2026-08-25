import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  Footprints,
  MapPin,
  ShieldCheck,
  Sparkles,
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
    icon: ChefHat,
    title: "Cook Together",
    text:
      "Meet people nearby and cook something memorable together.",
  },

  {
    icon: Utensils,
    title: "Dine Out",
    text:
      "Discover people and FoodKindl partner restaurants around you.",
  },

  {
    icon: Footprints,
    title: "Food Walk",
    text:
      "Build multi-stop food journeys and explore places together.",
  },
];


export default function Register() {

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
  }


  /* =========================================================
     SUBMIT
  ========================================================= */

  async function submit(
    event
  ) {

    event.preventDefault();

    setError("");

    setSubmitting(
      true
    );


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
    };


    try {

      await register(
        payload
      );


      navigate(
        "/dashboard",
        {
          replace:
            true,
        }
      );


    } catch (err) {

      console.error(
        "Registration error:",
        err.response?.data ||
        err
      );


      const data =
        err.response?.data;


      setError(

        data?.email?.[0]

        ||

        data?.password?.[0]

        ||

        data?.first_name?.[0]

        ||

        data?.last_name?.[0]

        ||

        data?.detail

        ||

        (
          "Registration could not be completed. "
          +
          "Please try again."
        )
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

      <div className="register-glow register-glow-one" />

      <div className="register-glow register-glow-two" />


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
          to="/"
          className="register-back-link"
        >

          <ArrowLeft
            size={16}
          />

          Back to home

        </Link>

      </header>


      {/* =====================================================
          MAIN
      ====================================================== */}

      <section className="register-shell">


        {/* ===================================================
            LEFT — STORY
        ==================================================== */}

        <aside className="register-story-panel">


          <div className="register-story-content">

            <div className="register-story-pill">

              <Sparkles
                size={14}
              />

              FOOD-FIRST SOCIAL CONNECTIONS

            </div>


            <h1>
              Your next connection
              could begin{" "}
              <span>
                around food.
              </span>
            </h1>


            <p className="register-story-description">
              Join a community built around cooking,
              dining, food discovery and meaningful
              real-world connections.
            </p>


            {/* ===============================================
                MINI LIVE CARD
            ================================================ */}

            <div className="register-live-card">

              <div className="register-live-card-top">

                <span>
                  <span className="live-dot" />

                  FOODKINDL NEARBY
                </span>


                <span>

                  <MapPin
                    size={12}
                  />

                  2.3 km away

                </span>

              </div>


              <div className="register-live-profile">

                <div className="register-live-avatar">
                  LN
                </div>


                <div>

                  <strong>
                    Lakshmi Nair
                  </strong>

                  <small>
                    Indiranagar · Verified member
                  </small>

                </div>


                <span className="register-verified">

                  <Check
                    size={11}
                  />

                  Verified

                </span>

              </div>


              <div className="register-live-invite">

                <ChefHat
                  size={20}
                />


                <div>

                  <span>
                    COOK TOGETHER
                  </span>

                  <strong>
                    Kerala Sunday Lunch
                  </strong>

                </div>

              </div>


              <div className="register-food-tags">

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
                TRUST LINE
            ================================================ */}

            <div className="register-trust-row">

              <span>

                <ShieldCheck
                  size={15}
                />

                Verified community

              </span>


              <span>

                <MapPin
                  size={15}
                />

                Nearby discovery

              </span>


              <span>

                <Users
                  size={15}
                />

                Real connections

              </span>

            </div>

          </div>

        </aside>


        {/* ===================================================
            RIGHT — FORM
        ==================================================== */}

        <section className="register-form-panel">


          <div className="register-form-card">


            <div className="register-form-heading">

              <div className="register-form-icon">

                <ChefHat
                  size={24}
                />

              </div>


              <div className="register-eyebrow">
                JOIN FOODKINDL
              </div>


              <h2>
                Create your account
              </h2>


              <p>
                Start discovering people,
                food experiences and shared meals
                in your community.
              </p>

            </div>


            <form
              onSubmit={
                submit
              }
            >


              {/* =============================================
                  NAME
              ============================================== */}

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


              {/* =============================================
                  EMAIL
              ============================================== */}

              <label>

                Email address

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
                  placeholder="you@example.com"
                />

              </label>


              {/* =============================================
                  PASSWORD
              ============================================== */}

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


              {/* =============================================
                  ERROR
              ============================================== */}

              {
                error &&
                (

                  <div className="register-error">
                    {error}
                  </div>

                )
              }


              {/* =============================================
                  SUBMIT
              ============================================== */}

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
                      "Creating your FoodKindl account..."
                    )
                    : (
                      <>
                        Create FoodKindl Account

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
                Already part of FoodKindl?
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
              you agree to FoodKindl's{" "}

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