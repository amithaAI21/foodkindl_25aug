import {
  ConciergeBell,
  LockKeyhole,
  MessageSquare,
  RefreshCw,
  UserRound,
  UsersRound,
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


export default function Dashboard() {

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
  // PROFILE IMAGE URL
  // =========================================================

  function getProfileImageUrl(
    imagePath
  ) {

    if (!imagePath) {
      return null;
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


  // =========================================================
  // PROFILE IMAGE
  // =========================================================

  const profileImage =
    getProfileImageUrl(
      profile.profile_image_1_url ||
      profile.profile_image_1
    );


  // =========================================================
  // DISPLAY NAME
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
  // REFRESH USER
  // =========================================================

  async function handleRefresh() {

    if (
      typeof reloadUser !==
      "function"
    ) {

      setRefreshError(
        "Account refresh is not available."
      );

      return;
    }


    try {

      setRefreshing(true);

      setRefreshError("");


      await reloadUser();

    } catch (
      error
    ) {

      console.error(
        "Unable to refresh account:",
        error.response?.data ||
        error
      );


      setRefreshError(
        "Unable to refresh your account status. Please try again."
      );

    } finally {

      setRefreshing(false);

    }
  }


  // =========================================================
  // SYNC VERIFICATION WHEN DASHBOARD OPENS
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

        } catch (
          error
        ) {

          if (
            !cancelled
          ) {

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

        cancelled =
          true;

      };

    },
    [
      reloadUser,
    ]
  );


  // =========================================================
  // VERIFICATION MESSAGE
  // =========================================================

  function getVerificationMessage() {

    if (
      verificationStatus ===
      "pending"
    ) {

      return (
        "Government ID approval is pending. " +
        "Circles, Food Invites and private messaging will unlock after approval."
      );

    }


    if (
      verificationStatus ===
      "rejected"
    ) {

      return (
        "Government ID was rejected. " +
        "Please upload a new document to use Circles, Food Invites and private messaging."
      );

    }


    if (
      verificationStatus ===
      "approved" &&
      profile.is_verified !==
        true
    ) {

      return (
        "Your verification has been approved, " +
        "but your verified status has not yet been activated."
      );

    }


    return (
      "Government ID verification is required " +
      "for Circles, Food Invites and private messaging."
    );
  }


  // =========================================================
  // DASHBOARD CARDS
  // =========================================================

  const cards = [

    // --------------------------------------------------------
    // COMMUNIQ
    // --------------------------------------------------------

    {
      icon:
        <MessageSquare />,

      title:
        "CommuniQ",

      text:
        (
          "Share food stories, photos, videos, " +
          "articles, comments, reactions, saves and reposts."
        ),

      path:
        "/community",

      locked:
        false,

      special:
        false,
    },


    // --------------------------------------------------------
    // CIRCLES
    // --------------------------------------------------------

    {
      icon:
        <UsersRound />,

      title:
        "Circles",

      text:
        isVerified
          ? (
              "Discover members, explore Food Matches, " +
              "send connection requests, manage connections, " +
              "and view profiles."
            )
          : getVerificationMessage(),

      path:
        isVerified
          ? "/connect"
          : "/verification-required",

      locked:
        !isVerified,

      special:
        false,
    },


    // --------------------------------------------------------
    // FOOD INVITES
    // --------------------------------------------------------

    {
      icon:
        <ConciergeBell />,

      title:
        "Food Invites",

      text:
        isVerified
          ? (
              "Turn a connection into a food moment. " +
              "Cook Together, Dine Out or explore a Food Walk."
            )
          : getVerificationMessage(),

      path:
        isVerified
          ? "/food-invites"
          : "/verification-required",

      locked:
        !isVerified,

      special:
        true,
    },
  ];


  // =========================================================
  // PAGE
  // =========================================================

  return (

    <main className="app-page">


      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="dashboard-hero">

        <div className="dashboard-welcome">

          <div className="eyebrow left">
            FoodKindl Connect
          </div>


          <div className="dashboard-title-row">

            <h1>
              Welcome, {displayName}
            </h1>


            <button
              type="button"
              className="dashboard-refresh-button"
              onClick={
                handleRefresh
              }
              disabled={
                refreshing
              }
              title="Check latest account status"
            >

              <RefreshCw
                size={18}
                className={
                  refreshing
                    ? "refresh-spin"
                    : ""
                }
              />


              <span>

                {
                  refreshing
                    ? "Checking..."
                    : "Refresh"
                }

              </span>

            </button>

          </div>


          <p>
            What would you like to do today?
          </p>


          {
            refreshError &&
            (

              <p className="error-message">
                {refreshError}
              </p>

            )
          }


          {/* ===============================================
              VERIFIED
          =============================================== */}

          {
            isVerified &&
            (

              <div className="dashboard-verification-approved">

                <span>
                  ✓
                </span>


                <div>

                  <strong>
                    Identity verified
                  </strong>


                  <small>
                    Circles, Food Matches,
                    Food Invites and
                    verified-member features
                    are available.
                  </small>

                </div>

              </div>

            )
          }


          {/* ===============================================
              NOT VERIFIED
          =============================================== */}

          {
            !isVerified &&
            (

              <Link
                to="/verification-required"
                className={
                  `dashboard-verification-banner ${
                    verificationStatus
                  }`
                }
              >

                <LockKeyhole
                  size={20}
                />


                <div>

                  <strong>

                    {
                      verificationStatus ===
                      "pending"
                        ? "Verification pending"

                        : verificationStatus ===
                            "rejected"
                          ? "Verification rejected"

                          : verificationStatus ===
                              "approved"
                            ? "Verification activation pending"

                            : "Identity verification required"
                    }

                  </strong>


                  <span>
                    {
                      getVerificationMessage()
                    }
                  </span>

                </div>

              </Link>

            )
          }

        </div>


        {/* ===================================================
            PROFILE
        =================================================== */}

        <Link
          to="/profile"
          className="dashboard-profile-identity"
          aria-label="Open my FoodKindl profile"
        >

          <div className="dashboard-profile-photo-wrap">

            {
              profileImage
                ? (

                    <img
                      src={
                        profileImage
                      }
                      alt={
                        `${displayName}'s profile`
                      }
                      className="dashboard-profile-image"
                      onError={
                        (
                          event
                        ) => {

                          console.error(
                            "Dashboard profile image failed:",
                            profileImage
                          );


                          event
                            .currentTarget
                            .style
                            .display =
                            "none";


                          event
                            .currentTarget
                            .nextElementSibling
                            ?.classList
                            .remove(
                              "hidden"
                            );
                        }
                      }
                    />

                  )
                : null
            }


            <div
              className={
                `dashboard-profile-fallback ${
                  profileImage
                    ? "hidden"
                    : ""
                }`
              }
            >

              <UserRound
                size={44}
                strokeWidth={1.4}
              />

            </div>


            {
              isVerified &&
              (

                <span
                  className="dashboard-verified-dot"
                  title="Verified profile"
                >
                  ✓
                </span>

              )
            }

          </div>


          <div className="dashboard-profile-meta">

            <strong>
              {displayName}
            </strong>


            <span
              className={
                isVerified
                  ? "profile-status verified"
                  : "profile-status"
              }
            >

              {
                isVerified
                  ? "✓ Verified member"
                  : verificationStatus ===
                      "pending"
                    ? "Verification pending"
                    : verificationStatus ===
                        "rejected"
                      ? "Verification rejected"
                      : verificationStatus ===
                          "approved"
                        ? "Verification activation pending"
                        : "Complete verification"
              }

            </span>


            {
              profile.city &&
              (

                <small>
                  {profile.city}
                </small>

              )
            }


            <span className="dashboard-view-profile">
              View Profile →
            </span>

          </div>

        </Link>

      </section>


      {/* =====================================================
          DASHBOARD CARDS
      ===================================================== */}

      <section className="dashboard-grid">

        {
          cards.map(
            (
              card
            ) => (

              <Link
                key={
                  card.title
                }
                to={
                  card.path
                }
                className={
                  [
                    "dashboard-card",

                    card.locked
                      ? "locked"
                      : "",

                    card.special
                      ? "food-invite-dashboard-card"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
              >

                {/* ===========================================
                    SPECIAL FOOD INVITE BADGE
                =========================================== */}

                {
                  card.special &&
                  !card.locked &&
                  (

                    <span className="food-invite-dashboard-badge">
                      NEW
                    </span>

                  )
                }


                {/* ===========================================
                    ICON
                =========================================== */}

                <span
                  className={
                    card.special
                      ? "icon-box food-invite-dashboard-icon"
                      : "icon-box"
                  }
                >

                  {
                    card.locked
                      ? (
                          <LockKeyhole />
                        )
                      : card.icon
                  }


                  {
                    card.special &&
                    !card.locked &&
                    (

                      <span className="food-invite-dashboard-heart">
                        ♥
                      </span>

                    )
                  }

                </span>


                {/* ===========================================
                    TITLE
                =========================================== */}

                <h2>
                  {card.title}
                </h2>


                {/* ===========================================
                    DESCRIPTION
                =========================================== */}

                <p>
                  {card.text}
                </p>


                {/* ===========================================
                    FOOD INVITE TYPES
                =========================================== */}

                {
                  card.special &&
                  !card.locked &&
                  (

                    <div className="food-invite-dashboard-types">

                      <span>
                        Cook Together
                      </span>

                      <span>
                        Dine Out
                      </span>

                      <span>
                        Food Walk
                      </span>

                    </div>

                  )
                }


                {/* ===========================================
                    ACTION
                =========================================== */}

                <span className="dashboard-card-action">

                  {
                    card.locked
                      ? (
                          verificationStatus ===
                          "pending"
                            ? "Awaiting approval"

                            : verificationStatus ===
                                "rejected"
                              ? "Update verification"

                              : verificationStatus ===
                                  "approved"
                                ? "Activation pending"

                                : "Complete verification"
                        )

                      : card.special
                        ? "Create a Food Invite"

                        : `Explore ${card.title}`
                  }

                  {" "}→

                </span>


                {/* ===========================================
                    LOCK LABEL
                =========================================== */}

                {
                  card.locked &&
                  (

                    <span className="dashboard-lock-label">

                      <LockKeyhole
                        size={15}
                      />


                      {
                        verificationStatus ===
                        "pending"
                          ? "Awaiting admin approval"

                          : verificationStatus ===
                              "rejected"
                            ? "Upload another ID"

                            : verificationStatus ===
                                "approved"
                              ? "Verified status not active"

                              : "Verification required"
                      }

                    </span>

                  )
                }

              </Link>

            )
          )
        }

      </section>

    </main>
  );
}