import {
  ArrowRight,
  Check,
  ChefHat,
  Heart,
  MapPin,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
  Sparkles,
  UserRound,
  UsersRound,
  Utensils,
  Footprints,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import "../styles/connect_dashboard.css";


export default function ConnectDashboard() {

  const {
    user,
    reloadUser,
  } = useAuth();


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  const [
    refreshError,
    setRefreshError,
  ] = useState("");


  const [
    activeJourneyStep,
    setActiveJourneyStep,
  ] = useState(1);


  const profile =
    user?.profile || {};


  const API_BASE = (
    import.meta.env.VITE_BACKEND_URL ||
    "http://127.0.0.1:8000"
  ).replace(
    /\/+$/,
    ""
  );


  // =========================================================
  // PROFILE IMAGE
  // =========================================================

  function getProfileImageUrl(
    imagePath
  ) {

    if (!imagePath) {
      return "";
    }


    if (
      imagePath.startsWith(
        "http://"
      ) ||
      imagePath.startsWith(
        "https://"
      ) ||
      imagePath.startsWith(
        "blob:"
      )
    ) {
      return imagePath;
    }


    if (
      imagePath.startsWith(
        "/.netlify/"
      )
    ) {
      return (
        `${window.location.origin}${imagePath}`
      );
    }


    return (
      `${API_BASE}${imagePath}`
    );
  }


  const profileImage =
    getProfileImageUrl(
      profile.profile_image_1_url ||
      profile.profile_image_1
    );


  // =========================================================
  // MEMBER NAME
  // =========================================================

  const displayName =
    user?.first_name ||
    user?.full_name ||
    user?.email ||
    "FoodKindl Member";


  // =========================================================
  // VERIFICATION
  // =========================================================

  const verificationStatus =
    profile.verification_status ||
    "not_submitted";


  const isVerified =
    profile.is_verified === true &&
    verificationStatus ===
      "approved";


  // =========================================================
  // REFRESH
  // =========================================================

  async function handleRefresh() {

    if (
      typeof reloadUser !==
      "function"
    ) {
      return;
    }


    try {

      setRefreshing(
        true
      );

      setRefreshError(
        ""
      );


      await reloadUser();

    } catch (error) {

      console.error(
        "Unable to refresh account:",
        error.response?.data ||
        error
      );


      setRefreshError(
        "Unable to refresh your account."
      );

    } finally {

      setRefreshing(
        false
      );

    }
  }


  // =========================================================
  // AUTO SYNC
  // =========================================================

  useEffect(
    () => {

      let cancelled =
        false;


      async function syncUser() {

        if (
          typeof reloadUser !==
          "function"
        ) {
          return;
        }


        try {

          await reloadUser();

        } catch (error) {

          if (!cancelled) {

            console.error(
              "Unable to sync account:",
              error.response?.data ||
              error
            );

          }
        }
      }


      syncUser();


      return () => {

        cancelled = true;

      };

    },
    [
      reloadUser,
    ]
  );


  function goToStep(
    stepNumber
  ) {

    setActiveJourneyStep(
      stepNumber
    );

  }


  // =========================================================
  // JOURNEY PATH PROGRESS
  // =========================================================

  const journeyProgress =
    Math.max(
      0,
      Math.min(
        100,
        (
          (activeJourneyStep - 1) /
          5
        ) * 100
      )
    );


  // =========================================================
  // PAGE
  // =========================================================

  return (

    <main className="connect-journey-page">


      {/* BACKGROUND */}

      <div className="connect-journey-background">
        <span className="connect-orb connect-orb-one" />
        <span className="connect-orb connect-orb-two" />
        <span className="connect-orb connect-orb-three" />
      </div>


      {/* =====================================================
          HEADER
      ====================================================== */}

      <section className="connect-journey-header">

        <div className="connect-journey-header-copy">

          <span className="connect-journey-eyebrow">
            FOODKINDL CONNECT
          </span>


          <h1>
            Welcome,{" "}
            <span>
              {displayName}
            </span>
          </h1>


          <p>
            Discover someone nearby,
            connect, talk, plan a food
            moment and turn a shared meal
            into a meaningful connection.
          </p>


          {
            isVerified
              ? (

                <div className="connect-verified-chip">

                  <Check size={13} />

                  Verified member

                </div>

              )
              : (

                <Link
                  to="/profile"
                  className="connect-verification-chip"
                >

                  {
                    verificationStatus === "pending"
                      ? "ID verification under review"
                      : verificationStatus === "rejected"
                        ? "Review Government ID"
                        : "Complete profile & verification"
                  }

                  <ArrowRight size={13} />

                </Link>

              )
          }

        </div>


        <div className="connect-journey-profile">

          <Link
            to="/profile"
            className="connect-journey-profile-link"
          >

            <div className="connect-journey-avatar">

              {
                profileImage
                  ? (

                    <img
                      src={
                        profileImage
                      }
                      alt={
                        displayName
                      }
                    />

                  )
                  : (

                    <UserRound
                      size={23}
                    />

                  )
              }


              {
                isVerified &&
                (

                  <span className="connect-avatar-check">

                    <Check size={9} />

                  </span>

                )
              }

            </div>


            <div>

              <strong>
                {displayName}
              </strong>

              <span>
                {
                  isVerified
                    ? "Verified member"
                    : verificationStatus === "pending"
                      ? "Government ID under review"
                      : verificationStatus === "rejected"
                        ? "Government ID needs attention"
                        : "Complete profile verification"
                }
              </span>

            </div>

          </Link>


          <button
            type="button"
            className="connect-refresh-button"
            onClick={
              handleRefresh
            }
            disabled={
              refreshing
            }
            title="Refresh profile"
          >

            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "connect-refresh-spin"
                  : ""
              }
            />

          </button>

        </div>

      </section>


      {
        refreshError &&
        (

          <div className="connect-refresh-error">
            {refreshError}
          </div>

        )
      }


      {/* =====================================================
          INTRO
      ====================================================== */}

      <section className="connect-journey-intro">

        <span>
          YOUR FOODKINDL JOURNEY
        </span>


        <h2>
          One connection.
          <br />

          <strong>
            One shared meal.
          </strong>
        </h2>


        <p>
          Tap each location pin to understand
          how FoodKindl Connect works — from
          discovering someone nearby to
          building a real friendship.
        </p>

      </section>


      {/* =====================================================
          ROADMAP
      ====================================================== */}

      <section className="connect-roadmap">
        {/* =====================================================
            FOODKINDL JOURNEY PATH
            Thin progression line — intentionally NOT a road.
        ====================================================== */}

        <div
          className="connect-journey-path-layer"
          aria-hidden="true"
        >

          <svg
            className="connect-journey-line"
            viewBox="0 0 1200 1100"
            preserveAspectRatio="none"
          >

            <path
              className="connect-journey-line-base"
              d="
                M 70 80
                C 210 75, 315 135, 440 210
                C 630 320, 870 220, 930 320
                C 1040 430, 820 470, 610 525
                C 410 580, 255 635, 125 705
                C 245 790, 570 785, 875 850
                C 1010 880, 820 965, 600 1030
              "
            />

            <path
              className="connect-journey-line-progress"
              pathLength="100"
              style={{
                strokeDasharray: 100,
                strokeDashoffset:
                  100 - journeyProgress,
              }}
              d="
                M 70 80
                C 210 75, 315 135, 440 210
                C 630 320, 870 220, 930 320
                C 1040 430, 820 470, 610 525
                C 410 580, 255 635, 125 705
                C 245 790, 570 785, 875 850
                C 1010 880, 820 965, 600 1030
              "
            />

          </svg>


          <div className="connect-journey-start-label">
            <span />
            START
          </div>


          <div
            className={
              `connect-journey-traveler step-${activeJourneyStep}`
            }
          >

            <span className="connect-journey-traveler-shadow" />

            <span className="connect-journey-person">
              <UserRound size={18} />
            </span>

            <span className="connect-journey-traveler-label">
              YOU
            </span>

          </div>


          <div className="connect-journey-finish-marker">
            <Heart
              size={21}
              fill="currentColor"
            />

            <span>
              FRIENDSHIP
            </span>
          </div>

        </div>



        {/* ===================================================
            STEP 01 — MY PROFILE & GOVERNMENT ID

            FoodKindl Connect starts with the member profile.
            The user completes their profile and uploads a
            Government ID for verification before progressing
            through the social journey.
        ==================================================== */}

        <article className="connect-step connect-step-01">

          <button
            type="button"
            className={
              activeJourneyStep === 1
                ? "connect-step-marker active"
                : "connect-step-marker"
            }
            onClick={() =>
              goToStep(1)
            }
            aria-label="Complete profile and upload Government ID"
          >
            <span>
              01
            </span>
          </button>


          <div
            className={
              activeJourneyStep === 1
                ? "connect-step-card journey-card-visible"
                : "connect-step-card journey-card-hidden"
            }
          >

            <div className="connect-step-icon">
              <ShieldCheck size={22} />
            </div>


            <span className="connect-step-label">
              MY PROFILE
            </span>


            <h3>
              Complete your profile
            </h3>


            <p>
              Start by completing your FoodKindl profile.
              Add your photo, location, food preferences
              and interests, then upload a Government ID
              for verification.
            </p>


            {/* -----------------------------------------------
                PROFILE SETUP CHECKLIST
            ------------------------------------------------ */}

            <div className="connect-profile-setup">

              <div className="connect-profile-setup-row">

                <span className="connect-profile-setup-icon">
                  <UserRound size={16} />
                </span>

                <div>
                  <strong>
                    Build your profile
                  </strong>

                  <small>
                    Add your photo, location,
                    cuisines and interests.
                  </small>
                </div>

              </div>


              <div className="connect-profile-setup-row">

                <span className="connect-profile-setup-icon">
                  <Upload size={16} />
                </span>

                <div>
                  <strong>
                    Upload Government ID
                  </strong>

                  <small>
                    Submit your identity proof for
                    FoodKindl admin verification.
                  </small>
                </div>

              </div>

            </div>


            {/* -----------------------------------------------
                VERIFICATION STATUS
            ------------------------------------------------ */}

            <div
              className={
                isVerified
                  ? "connect-profile-verification verified"
                  : verificationStatus === "pending"
                    ? "connect-profile-verification pending"
                    : verificationStatus === "rejected"
                      ? "connect-profile-verification rejected"
                      : "connect-profile-verification"
              }
            >

              {
                isVerified
                  ? (
                    <>
                      <Check size={14} />

                      <span>
                        Government ID verified
                      </span>
                    </>
                  )
                  : verificationStatus === "pending"
                    ? (
                      <>
                        <RefreshCw size={14} />

                        <span>
                          Government ID is under review
                        </span>
                      </>
                    )
                    : verificationStatus === "rejected"
                      ? (
                        <>
                          <ShieldCheck size={14} />

                          <span>
                            Update and resubmit your Government ID
                          </span>
                        </>
                      )
                      : (
                        <>
                          <ShieldCheck size={14} />

                          <span>
                            Government ID not submitted
                          </span>
                        </>
                      )
              }

            </div>


            {/* -----------------------------------------------
                GO TO MY PROFILE

                The actual Government ID upload remains on
                the /profile page. This dashboard only guides
                the user to that first required step.
            ------------------------------------------------ */}

            <Link
              to="/profile"
              className="connect-profile-action"
            >

              {
                isVerified
                  ? (
                    <>
                      <UserRound size={15} />

                      View my profile

                      <ArrowRight size={14} />
                    </>
                  )
                  : (
                    <>
                      <Upload size={15} />

                      Complete profile & upload ID

                      <ArrowRight size={14} />
                    </>
                  )
              }

            </Link>


            <button
              type="button"
              className="journey-next-stop"
              onClick={() =>
                goToStep(2)
              }
            >
              Next stop

              <ArrowRight size={14} />
            </button>

          </div>

        </article>


        {/* ===================================================
            STEP 02 — DISCOVER & CONNECT

            Discover compatible FoodKindl members nearby,
            review the match, and send a connection request.
        ==================================================== */}

        <article className="connect-step connect-step-02">

          <button
            type="button"
            className={
              activeJourneyStep === 2
                ? "connect-step-marker active"
                : "connect-step-marker"
            }
            onClick={() =>
              goToStep(2)
            }
            aria-label="Discover and connect with people nearby"
          >
            <span>
              02
            </span>
          </button>


          <div
            className={
              activeJourneyStep === 2
                ? "connect-step-card journey-card-visible"
                : "connect-step-card journey-card-hidden"
            }
          >

            <div className="connect-step-icon">
              <UsersRound size={22} />
            </div>


            <span className="connect-step-label">
              DISCOVER & CONNECT
            </span>


            <h3>
              Find people you
              may enjoy meeting
            </h3>


            <p>
              Discover nearby FoodKindl members based
              on location, cuisine preferences, dietary
              choices and shared interests. When someone
              feels like a good match, send a connection
              request.
            </p>


            {/* -----------------------------------------------
                EXAMPLE FOOD MATCH
            ------------------------------------------------ */}

            <div className="connect-demo-people">

              <div className="connect-demo-person">

                <span>
                  AM
                </span>

                <div>
                  <strong>
                    Amitha
                  </strong>

                  <small>
                    Bengaluru
                  </small>
                </div>

              </div>


              <div className="connect-match-chip">

                <Sparkles size={11} />

                86% match

              </div>

            </div>


            {/* -----------------------------------------------
                CONNECTION VISUAL
            ------------------------------------------------ */}

            <div className="connect-connection-demo">

              <div className="connect-mini-person">
                A
              </div>

              <div className="connect-mini-connection">

                <span />

                <strong>
                  CONNECT
                </strong>

                <span />

              </div>

              <div className="connect-mini-person">
                M
              </div>

            </div>


            <button
              type="button"
              className="journey-next-stop"
              onClick={() =>
                goToStep(3)
              }
            >
              Next stop

              <ArrowRight size={14} />
            </button>

          </div>

        </article>


        {/* ===================================================
            STEP 03
        ==================================================== */}

        <article className="connect-step connect-step-03">

          <button
            type="button"
            className={
              activeJourneyStep === 3
                ? "connect-step-marker active"
                : "connect-step-marker"
            }
            onClick={() =>
              goToStep(3)
            }
            aria-label="Start a conversation"
          >
            <span>
              03
            </span>
          </button>


          <div
            className={
              activeJourneyStep === 3
                ? "connect-step-card journey-card-visible"
                : "connect-step-card journey-card-hidden"
            }
          >

            <div className="connect-step-icon">
              <MessageCircle size={22} />
            </div>


            <span className="connect-step-label">
              CONVERSATION
            </span>


            <h3>
              Start a conversation
            </h3>


            <p>
              Chat first. Discover common food
              interests, cuisines, places and
              ideas before planning a meet.
            </p>


            <div className="connect-chat-demo">

              <div>
                Love South Indian food?
              </div>

              <div>
                Absolutely! 😊
              </div>

              <div>
                Let's plan something.
              </div>

            </div>


            <button
              type="button"
              className="journey-next-stop"
              onClick={() =>
                goToStep(4)
              }
            >
              Next stop

              <ArrowRight size={14} />
            </button>

          </div>

        </article>


        {/* ===================================================
            STEP 04
        ==================================================== */}

        <article className="connect-step connect-step-04">

          <button
            type="button"
            className={
              activeJourneyStep === 4
                ? "connect-step-marker active"
                : "connect-step-marker"
            }
            onClick={() =>
              goToStep(4)
            }
            aria-label="Create a Food Invite"
          >
            <span>
              04
            </span>
          </button>


          <div
            className={
              activeJourneyStep === 4
                ? "connect-step-card connect-invite-card journey-card-visible"
                : "connect-step-card connect-invite-card journey-card-hidden"
            }
          >

            <div className="connect-step-icon">
              <Send size={22} />
            </div>


            <span className="connect-step-label">
              FOOD INVITE
            </span>


            <h3>
              Create a Food Invite
            </h3>


            <p>
              Turn the conversation into
              a real-world food moment.
            </p>


            <div className="connect-food-branch">

              <div className="connect-food-branch-line" />


              <div className="connect-food-option">

                <span>
                  <ChefHat size={18} />
                </span>

                <strong>
                  Cook Together
                </strong>

                <small>
                  Prepare a meal
                  together.
                </small>

              </div>


              <div className="connect-food-option">

                <span>
                  <Utensils size={18} />
                </span>

                <strong>
                  Dine Out
                </strong>

                <small>
                  Meet at a restaurant
                  or café.
                </small>

              </div>


              <div className="connect-food-option">

                <span>
                  <Footprints size={18} />
                </span>

                <strong>
                  Food Walk
                </strong>

                <small>
                  Explore multiple
                  food stops.
                </small>

              </div>

            </div>


            <button
              type="button"
              className="journey-next-stop"
              onClick={() =>
                goToStep(5)
              }
            >
              Next stop

              <ArrowRight size={14} />
            </button>

          </div>

        </article>


        {/* ===================================================
            STEP 05
        ==================================================== */}

        <article className="connect-step connect-step-05">

          <button
            type="button"
            className={
              activeJourneyStep === 5
                ? "connect-step-marker active"
                : "connect-step-marker"
            }
            onClick={() =>
              goToStep(5)
            }
            aria-label="Meet over food"
          >
            <span>
              05
            </span>
          </button>


          <div
            className={
              activeJourneyStep === 5
                ? "connect-step-card journey-card-visible"
                : "connect-step-card journey-card-hidden"
            }
          >

            <div className="connect-step-icon">
              <Utensils size={22} />
            </div>


            <span className="connect-step-label">
              MEET
            </span>


            <h3>
              Meet over food
            </h3>


            <p>
              Meet at the chosen place,
              cook together, dine out or
              experience the food trail
              you planned.
            </p>


            <div className="connect-meet-visual">

              <span>
                🍜
              </span>

              <span>
                🍛
              </span>

              <span>
                ☕
              </span>

              <span>
                🥘
              </span>

            </div>


            <button
              type="button"
              className="journey-next-stop"
              onClick={() =>
                goToStep(6)
              }
            >
              Next stop

              <ArrowRight size={14} />
            </button>

          </div>

        </article>


        {/* ===================================================
            STEP 06
        ==================================================== */}

        <article className="connect-step connect-step-06">

          <button
            type="button"
            className={
              activeJourneyStep === 6
                ? "connect-step-marker active"
                : "connect-step-marker"
            }
            onClick={() =>
              goToStep(6)
            }
            aria-label="Share the moment"
          >
            <span>
              06
            </span>
          </button>


          <div
            className={
              activeJourneyStep === 6
                ? "connect-step-card journey-card-visible"
                : "connect-step-card journey-card-hidden"
            }
          >

            <div className="connect-step-icon">
              <Heart size={22} />
            </div>


            <span className="connect-step-label">
              SHARE
            </span>


            <h3>
              Share the moment
            </h3>


            <p>
              Share photos, videos,
              recipes and stories from
              the experience with your
              FoodKindl community.
            </p>


            <div className="connect-share-demo">

              <div />
              <div />
              <div />

              <span>

                <Heart
                  size={14}
                  fill="currentColor"
                />

                24

              </span>

            </div>


            <button
              type="button"
              className="journey-next-stop final"
              onClick={() =>
                document
                  .getElementById(
                    "connect-final-destination"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                    block:
                      "center",
                  })
              }
            >
              See destination

              <ArrowRight size={14} />
            </button>

          </div>

        </article>


        {/* ===================================================
            FINAL DESTINATION
        ==================================================== */}

        <div
          id="connect-final-destination"
          className="connect-journey-final"
        >

          <div className="connect-final-heart">

            <Heart
              size={34}
              fill="currentColor"
            />

          </div>


          <span>
            THE JOURNEY CONTINUES
          </span>


          <h2>
            A connection becomes
            <strong>
              {" "}a friendship.
            </strong>
          </h2>


          <p>
            FoodKindl helps make the
            introduction. What happens
            around the table is yours.
          </p>


          <Link
            to={
              isVerified
                ? "/connect"
                : "/profile"
            }
            className="connect-start-button"
          >

            Start your FoodKindl journey

            <ArrowRight size={18} />

          </Link>

        </div>


      </section>

    </main>
  );
}