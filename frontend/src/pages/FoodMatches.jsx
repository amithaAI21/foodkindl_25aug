import {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  Utensils,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import api from "../api";

import "../styles/food_matches.css";


// ============================================================
// HELPERS
// ============================================================

function formatPreference(value) {

  if (!value) {
    return "";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function getMatchLevel(score) {

  const numericScore =
    Number(score) || 0;

  if (numericScore >= 80) {

    return {
      label: "Excellent Match",
      className: "excellent",
    };

  }

  if (numericScore >= 60) {

    return {
      label: "Great Match",
      className: "great",
    };

  }

  if (numericScore >= 40) {

    return {
      label: "Good Match",
      className: "good",
    };

  }

  return {
    label: "Potential Match",
    className: "potential",
  };
}


// ============================================================
// FOOD MATCHES PAGE
// ============================================================

export default function FoodMatches() {

  const [
    matches,
    setMatches,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  // ==========================================================
  // LOAD FOOD MATCHES
  // ==========================================================

  async function loadFoodMatches(
    isRefresh = false
  ) {

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {

      const response =
        await api.get(
          "/auth/food-matches/"
        );


      const results =
        response.data?.results;


      if (Array.isArray(results)) {

        setMatches(results);

      } else {

        setMatches([]);

      }

    } catch (requestError) {

      console.error(
        "FOOD MATCH ERROR:",
        requestError
      );


      const message =
        requestError
          ?.response
          ?.data
          ?.detail;


      setError(
        message ||
        "We could not load your Food Matches. Please try again."
      );

    } finally {

      setLoading(false);
      setRefreshing(false);

    }
  }


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(
    () => {

      loadFoodMatches();

    },
    []
  );


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (

      <main className="food-matches-page">

        <div className="food-matches-loading">

          <div className="food-matches-loading-icon">

            <Utensils
              size={30}
            />

          </div>


          <RefreshCw
            size={22}
            className="food-match-spin"
          />


          <h2>
            Finding your Food Matches
          </h2>


          <p>
            Looking for people who share
            your tastes, interests and
            preferred food experiences.
          </p>

        </div>

      </main>
    );
  }


  // ==========================================================
  // PAGE
  // ==========================================================

  return (

    <main className="food-matches-page">


      {/* ======================================================
          TOP NAVIGATION
      ====================================================== */}

      <div className="food-matches-topbar">

        <Link
          to="/dashboard"
          className="food-matches-back-button"
        >

          <ArrowLeft
            size={18}
          />

          Back to Dashboard

        </Link>


        <button
          type="button"
          className="food-matches-refresh-button"
          onClick={
            () =>
              loadFoodMatches(true)
          }
          disabled={refreshing}
        >

          <RefreshCw
            size={17}
            className={
              refreshing
                ? "food-match-spin"
                : ""
            }
          />

          {
            refreshing
              ? "Refreshing..."
              : "Refresh Matches"
          }

        </button>

      </div>


      {/* ======================================================
          HERO
      ====================================================== */}

      <section className="food-matches-hero">

        <div className="food-matches-hero-content">

          <div className="food-matches-kicker">

            <Sparkles
              size={16}
            />

            FOODKINDL CONNECT

          </div>


          <h1>
            Find people who share 
            <span> your taste in food.</span>
          </h1>


          <p>
            Food Match compares your favourite
            cuisines, food interests, connection
            preferences and location to help you
            discover relevant people in the
            FoodKindl community.
          </p>

        </div>


        <div className="food-matches-hero-stat">

          <div className="food-matches-stat-icon">

            <Utensils
              size={24}
            />

          </div>


          <div>

            <strong>
              {matches.length}
            </strong>

            <span>
              {
                matches.length === 1
                  ? "Food Match"
                  : "Food Matches"
              }
            </span>

          </div>

        </div>

      </section>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {
        error &&
        (
          <section className="food-matches-error">

            <strong>
              Food Matches could not be loaded.
            </strong>

            <p>
              {error}
            </p>


            <button
              type="button"
              onClick={
                () =>
                  loadFoodMatches()
              }
            >

              Try Again

            </button>

          </section>
        )
      }


      {/* ======================================================
          EMPTY STATE
      ====================================================== */}

      {
        !error &&
        matches.length === 0 &&
        (
          <section className="food-matches-empty">

            <div className="food-matches-empty-icon">

              <Utensils
                size={34}
              />

            </div>


            <h2>
              Your table is waiting.
            </h2>


            <p>
              We don't have a Food Match to
              show yet. As more members
              complete their food profiles,
              relevant people will appear here.
            </p>


            <Link
              to="/profile"
              className="food-matches-profile-button"
            >

              Complete Food Profile

            </Link>

          </section>
        )
      }


      {/* ======================================================
          MATCH RESULTS
      ====================================================== */}

      {
        !error &&
        matches.length > 0 &&
        (
          <section className="food-matches-results">

            <div className="food-matches-section-heading">

              <div>

                <span>
                  YOUR MATCHES
                </span>

                <h2>
                  People to discover
                </h2>

              </div>


              <p>
                Highest Food Match shown first.
              </p>

            </div>


            <div className="food-matches-grid">

              {
                matches.map(
                  (person) => {

                    const matchScore =
                      Number(
                        person.food_match
                      ) || 0;


                    const matchLevel =
                      getMatchLevel(
                        matchScore
                      );


                    const reasons =
                      Array.isArray(
                        person.match_reasons
                      )
                        ? person.match_reasons
                        : [];


                    const commonCuisines =
                      Array.isArray(
                        person.common_cuisines
                      )
                        ? person.common_cuisines
                        : [];


                    const commonInterests =
                      Array.isArray(
                        person.common_interests
                      )
                        ? person.common_interests
                        : [];


                    return (

                      <article
                        key={person.id}
                        className="food-match-card"
                      >


                        {/* =====================================
                            PHOTO
                        ===================================== */}

                        <div className="food-match-card-image">

                          {
                            person.profile_image
                              ? (

                                <img
                                  src={
                                    person.profile_image
                                  }
                                  alt={
                                    person.full_name ||
                                    "FoodKindl member"
                                  }
                                />

                              )
                              : (

                                <div className="food-match-image-placeholder">

                                  <UserRound
                                    size={56}
                                    strokeWidth={1.4}
                                  />

                                </div>

                              )
                          }


                          <div
                            className={
                              `food-match-score-badge ${matchLevel.className}`
                            }
                          >

                            <strong>
                              {matchScore}%
                            </strong>

                            <span>
                              Food Match
                            </span>

                          </div>


                          {
                            person.is_verified &&
                            (
                              <div className="food-match-verified-badge">

                                <ShieldCheck
                                  size={14}
                                />

                                Verified

                              </div>
                            )
                          }

                        </div>


                        {/* =====================================
                            CONTENT
                        ===================================== */}

                        <div className="food-match-card-content">


                          {/* NAME */}

                          <div className="food-match-card-title">

                            <div>

                              <h3>
                                {
                                  person.full_name ||
                                  "FoodKindl Member"
                                }
                              </h3>


                              {
                                (
                                  person.locality ||
                                  person.city
                                ) &&
                                (
                                  <div className="food-match-card-location">

                                    <MapPin
                                      size={14}
                                    />

                                    <span>

                                      {
                                        [
                                          person.locality,
                                          person.city,
                                        ]
                                          .filter(Boolean)
                                          .join(", ")
                                      }

                                    </span>

                                  </div>
                                )
                              }

                            </div>


                            {
                              person.is_verified &&
                              (
                                <CheckCircle2
                                  size={20}
                                  className="food-match-check"
                                />
                              )
                            }

                          </div>


                          {/* MATCH LEVEL */}

                          <div
                            className={
                              `food-match-level ${matchLevel.className}`
                            }
                          >

                            <Sparkles
                              size={14}
                            />

                            {
                              matchLevel.label
                            }

                          </div>


                          {/* DIET */}

                          {
                            person.dietary_preference &&
                            (
                              <div className="food-match-diet">

                                <ChefHat
                                  size={16}
                                />

                                <span>
                                  {
                                    formatPreference(
                                      person.dietary_preference
                                    )
                                  }
                                </span>

                              </div>
                            )
                          }


                          {/* WHY YOU MATCH */}

                          {
                            reasons.length > 0 &&
                            (
                              <div className="food-match-reasons">

                                <span className="food-match-small-title">
                                  WHY YOU MATCH
                                </span>


                                <div className="food-match-reason-list">

                                  {
                                    reasons.map(
                                      (
                                        reason,
                                        index
                                      ) => (

                                        <div
                                          key={
                                            `${person.id}-reason-${index}`
                                          }
                                          className="food-match-reason"
                                        >

                                          <CheckCircle2
                                            size={15}
                                          />

                                          <span>
                                            {reason}
                                          </span>

                                        </div>

                                      )
                                    )
                                  }

                                </div>

                              </div>
                            )
                          }


                          {/* COMMON CUISINES */}

                          {
                            commonCuisines.length > 0 &&
                            (
                              <div className="food-match-common-section">

                                <span className="food-match-small-title">
                                  CUISINES IN COMMON
                                </span>


                                <div className="food-match-tags">

                                  {
                                    commonCuisines
                                      .slice(
                                        0,
                                        4
                                      )
                                      .map(
                                        (
                                          cuisine
                                        ) => (

                                          <span
                                            key={
                                              `${person.id}-${cuisine}`
                                            }
                                            className="food-match-tag"
                                          >

                                            {
                                              formatPreference(
                                                cuisine
                                              )
                                            }

                                          </span>

                                        )
                                      )
                                  }

                                </div>

                              </div>
                            )
                          }


                          {/* COMMON INTERESTS */}

                          {
                            commonInterests.length > 0 &&
                            (
                              <div className="food-match-common-section">

                                <span className="food-match-small-title">
                                  SHARED FOOD INTERESTS
                                </span>


                                <div className="food-match-tags">

                                  {
                                    commonInterests
                                      .slice(
                                        0,
                                        3
                                      )
                                      .map(
                                        (
                                          interest
                                        ) => (

                                          <span
                                            key={
                                              `${person.id}-${interest}`
                                            }
                                            className="food-match-tag secondary"
                                          >

                                            {
                                              formatPreference(
                                                interest
                                              )
                                            }

                                          </span>

                                        )
                                      )
                                  }

                                </div>

                              </div>
                            )
                          }


                          {/* =================================
                              ACTION
                          ================================= */}

                          <div className="food-match-card-actions">

                            <Link
                                to={`/connect/member/${person.id}`}
                                className="food-match-view-button"
                                >
                                View Profile
                                </Link>

                          </div>

                        </div>

                      </article>

                    );

                  }
                )
              }

            </div>

          </section>
        )
      }

    </main>
  );
}