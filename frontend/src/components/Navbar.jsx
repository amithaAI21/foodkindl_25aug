import {
  ChevronDown,
  ConciergeBell,
  Heart,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";


export default function Navbar() {

  const {
    user,
    logout,
  } = useAuth();


  const [
    open,
    setOpen,
  ] = useState(false);


  const [
    profileMenuOpen,
    setProfileMenuOpen,
  ] = useState(false);


  const profileMenuRef =
    useRef(null);


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


  const profileImage =
    getProfileImageUrl(
      profile.profile_image_1_url ||
      profile.profile_image_1
    );


  const displayName =
    user?.first_name ||
    user?.full_name ||
    user?.email ||
    "FoodKindl Member";


  const isVerified =
    profile.is_verified === true &&
    profile.verification_status ===
      "approved";


  // =========================================================
  // CLOSE MENUS
  // =========================================================

  function close() {

    setOpen(false);

    setProfileMenuOpen(false);
  }


  // =========================================================
  // LOGOUT
  // =========================================================

  function handleLogout() {

    logout();

    close();
  }


  // =========================================================
  // CLOSE PROFILE MENU WHEN CLICKING OUTSIDE
  // =========================================================

  useEffect(
    () => {

      function handleOutsideClick(
        event
      ) {

        if (
          profileMenuRef.current &&
          !profileMenuRef.current.contains(
            event.target
          )
        ) {

          setProfileMenuOpen(
            false
          );
        }
      }


      document.addEventListener(
        "mousedown",
        handleOutsideClick
      );


      return () => {

        document.removeEventListener(
          "mousedown",
          handleOutsideClick
        );
      };

    },
    []
  );


  return (

    <header className="navbar">


      {/* =====================================================
          LOGO
      ===================================================== */}

      <Link
        to="/"
        className="brand brand-logo"
        onClick={
          close
        }
        aria-label="FoodKindl Home"
      >

        <img
          src="/images/icon.png"
          alt="FoodKindl"
          className="navbar-logo"
        />

      </Link>


      {/* =====================================================
          MOBILE MENU
      ===================================================== */}

      <button
        type="button"
        className="mobile-menu-button"
        onClick={
          () =>
            setOpen(
              (
                current
              ) =>
                !current
            )
        }
        aria-label="Toggle navigation"
        aria-expanded={
          open
        }
      >

        {
          open
            ? (
                <X
                  size={24}
                />
              )
            : (
                <Menu
                  size={24}
                />
              )
        }

      </button>


      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <nav
        className={
          open
            ? "nav open"
            : "nav"
        }
      >

        {
          user
            ? (

                <>

                  {/* =========================================
                      LOGGED-IN NAVIGATION
                  ========================================= */}


                  {/* COMMUNIQ */}

                  <Link
                    to="/community"
                    onClick={
                      close
                    }
                  >
                    CommuniQ
                  </Link>


                  {/* CIRCLES */}

                  <Link
                    to="/connect"
                    onClick={
                      close
                    }
                  >
                    Circles
                  </Link>


                  {/* AI KITCHEN */}

                  <Link
                    to="/ai-kitchen"
                    onClick={
                      close
                    }
                    className="ai-kitchen-nav-link"
                  >

                    <Sparkles
                      size={17}
                    />

                    AI Kitchen

                  </Link>


                  {/* =========================================
                      FOOD INVITES
                  ========================================= */}

                  <Link
                    to={
                      isVerified
                        ? "/food-invites"
                        : "/verification-required"
                    }
                    onClick={
                      close
                    }
                    className="food-invite-nav-link"
                    title={
                      isVerified
                        ? "Create and manage Food Invites"
                        : "Verification required"
                    }
                  >

                    <span className="food-invite-nav-icon">

                      <ConciergeBell
                        size={18}
                      />


                      {
                        isVerified &&
                        (

                          <Heart
                            size={7}
                            className="food-invite-nav-heart"
                          />

                        )
                      }

                    </span>


                    <span>
                      Food Invites
                    </span>


                    {
                      isVerified &&
                      (

                        <span className="food-invite-nav-new">
                          NEW
                        </span>

                      )
                    }

                  </Link>


                  {/* DASHBOARD */}

                  <Link
                    to="/dashboard"
                    onClick={
                      close
                    }
                  >
                    Dashboard
                  </Link>


                  {/* =========================================
                      PROFILE AVATAR DROPDOWN
                  ========================================= */}

                  <div
                    className="navbar-profile-menu"
                    ref={
                      profileMenuRef
                    }
                  >

                    <button
                      type="button"
                      className="navbar-avatar-button"
                      onClick={
                        () =>
                          setProfileMenuOpen(
                            (
                              current
                            ) =>
                              !current
                          )
                      }
                      aria-label="Open profile menu"
                      aria-expanded={
                        profileMenuOpen
                      }
                    >

                      <div className="navbar-avatar">

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
                                  size={20}
                                />

                              )
                        }


                        {
                          isVerified &&
                          (

                            <span
                              className="navbar-avatar-verified"
                              title="Verified"
                            >
                              ✓
                            </span>

                          )
                        }

                      </div>


                      <ChevronDown
                        size={16}
                        className={
                          profileMenuOpen
                            ? "navbar-chevron open"
                            : "navbar-chevron"
                        }
                      />

                    </button>


                    {
                      profileMenuOpen &&
                      (

                        <div className="navbar-profile-dropdown">


                          {/* PROFILE SUMMARY */}

                          <div className="navbar-profile-summary">

                            <div className="navbar-dropdown-avatar">

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
                                        size={24}
                                      />

                                    )
                              }

                            </div>


                            <div>

                              <strong>
                                {
                                  displayName
                                }
                              </strong>


                              <span
                                className={
                                  isVerified
                                    ? "navbar-profile-status verified"
                                    : "navbar-profile-status"
                                }
                              >

                                {
                                  isVerified
                                    ? "✓ Verified member"
                                    : "Verification incomplete"
                                }

                              </span>

                            </div>

                          </div>


                          <div className="navbar-dropdown-divider" />


                          {/* MY PROFILE */}

                          <Link
                            to="/profile"
                            className="navbar-dropdown-item"
                            onClick={
                              close
                            }
                          >

                            <UserRound
                              size={18}
                            />

                            <span>
                              My Profile
                            </span>

                          </Link>


                          {/* SETTINGS */}

                          <Link
                            to="/settings"
                            className="navbar-dropdown-item"
                            onClick={
                              close
                            }
                          >

                            <Settings
                              size={18}
                            />

                            <span>
                              Settings
                            </span>

                          </Link>


                          {/* SAFETY & VERIFICATION */}

                          <Link
                            to="/safety-verification"
                            className="navbar-dropdown-item"
                            onClick={
                              close
                            }
                          >

                            <ShieldCheck
                              size={18}
                            />


                            <div>

                              <span>
                                Safety &amp; Verification
                              </span>


                              <small>

                                {
                                  isVerified
                                    ? "Identity verified"
                                    : "Complete verification"
                                }

                              </small>

                            </div>

                          </Link>


                          <div className="navbar-dropdown-divider" />


                          {/* LOGOUT */}

                          <button
                            type="button"
                            className="navbar-dropdown-item logout"
                            onClick={
                              handleLogout
                            }
                          >

                            <LogOut
                              size={18}
                            />

                            <span>
                              Logout
                            </span>

                          </button>

                        </div>

                      )
                    }

                  </div>

                </>

              )
            : (

                <>

                  {/* =========================================
                      PUBLIC NAVIGATION
                  ========================================= */}

                  <Link
                    to="/login"
                    onClick={
                      close
                    }
                    className="public-nav-link"
                  >
                    FoodKindl Connect
                  </Link>


                  {/* <Link
                    className="launch-button"
                    to="/login"
                    onClick={
                      close
                    }
                  >
                    Launch FoodKindl App
                  </Link> */}

                </>

              )
        }

      </nav>

    </header>

  );
}